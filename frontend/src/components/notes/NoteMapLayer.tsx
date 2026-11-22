import { GeoJSONSource, Layer, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { MapBounds, MapClusterMarker } from '@/api/types';
import { NEARBY_CLUSTER_MIN_ZOOM, NOTE_READ_RADIUS_METERS } from '@/constants/home-map';
import { UI_MOTION } from '@/constants/ui-motion';
import {
  advanceNoteMapFade, CLUSTER_PROPERTIES, createNoteMapData, getNoteMapPoint, getServerClusters, updateNoteMapFade,
  type NoteMapPoint,
} from '@/utils/note-map-clusters';

export type { NoteMapPoint } from '@/utils/note-map-clusters';

type Props = {
  clusters: readonly MapClusterMarker[] | null;
  viewportBounds: MapBounds | null;
  reduceMotion: boolean;
  userPoint?: GeoJSON.Point | null;
  onPointPress?: (point: NoteMapPoint, loadClusters?: () => Promise<readonly MapClusterMarker[]>) => void;
  id?: string;
  afterId?: string;
};

const COUNT: ExpressionSpecification = ['get', 'noteCount'];
const EMPTY_CLUSTERS: readonly MapClusterMarker[] = [];
const SOURCE_RETRY_MS = 50;
const SOURCE_WAIT_MS = 500;

export const NoteMapLayer = memo(function NoteMapLayer({ clusters, viewportBounds, reduceMotion, userPoint, onPointPress, id = 'notes', afterId }: Props) {
  const [transition, setTransition] = useState(() => updateNoteMapFade(
    { latest: null, shown: null, opacity: 1, fade: null }, clusters, reduceMotion, viewportBounds,
  ));
  const { latest, shown, opacity, fade } = transition;
  if (latest !== clusters || (reduceMotion && fade)) {
    setTransition(updateNoteMapFade(transition, clusters, reduceMotion, viewportBounds));
  }

  const [source, setSource] = useState({ markers: shown, version: 0 });
  if (source.markers !== shown) {
    // Swap the native source at zero opacity so cached tiles from the old source cannot reappear.
    setSource({ markers: shown, version: opacity === 0 ? source.version + 1 : source.version });
  }
  const layerId = `${id}-${source.version}`;
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  useLayoutEffect(() => {
    if (!fade) return;
    const { enter, exit } = UI_MOTION.mapClusters;
    const duration = fade.to === 0 ? exit : enter;
    let start: number | undefined;
    let frame: number | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let waiting = true;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / duration, 1);
      setTransition((current) => advanceNoteMapFade(current, fade, progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    if (fade.to === 1 && fade.from === 0) {
      const checkSource = async () => {
        const data = await sourceRef.current?.getData().catch(() => null);
        if (!waiting) return;
        if (data?.features.length) {
          clearTimeout(timeout);
          frame = requestAnimationFrame(step);
        } else {
          retry = setTimeout(() => { void checkSource(); }, SOURCE_RETRY_MS);
        }
      };
      // A source with no visible tiles may stay empty. Its new ID makes an immediate reveal safe.
      timeout = setTimeout(() => {
        waiting = false;
        clearTimeout(retry);
        setTransition((current) => advanceNoteMapFade(current, fade, 1));
      }, SOURCE_WAIT_MS);
      void checkSource();
    } else {
      frame = requestAnimationFrame(step);
    }
    return () => {
      waiting = false;
      clearTimeout(retry);
      clearTimeout(timeout);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [fade, layerId]);

  const markers = shown ?? EMPTY_CLUSTERS;
  const byId = useMemo(() => new Map(markers.map((cluster) => [cluster.id, cluster])), [markers]);
  const pressPoint = shown === clusters && opacity > 0 ? onPointPress : undefined;
  const interactive = Boolean(pressPoint);
  const currentData = useRef<typeof byId | null>(null);
  useLayoutEffect(() => {
    currentData.current = interactive ? byId : null;
    return () => { currentData.current = null; };
  }, [byId, interactive]);
  const data = useMemo(() => JSON.stringify(createNoteMapData(markers)), [markers]);
  // Evaluate the rendered point so native clusters use their final center, not their members.
  const isNearby: ExpressionSpecification = userPoint
    ? ['<=', ['distance', userPoint], NOTE_READ_RADIUS_METERS] : ['literal', false];
  const fillColor: ExpressionSpecification = ['step', ['zoom'], '#2350FF', NEARBY_CLUSTER_MIN_ZOOM,
    ['case', isNearby, '#D6F65A', '#2350FF']];
  const foregroundColor: ExpressionSpecification = ['step', ['zoom'], '#FFFFFF', NEARBY_CLUSTER_MIN_ZOOM,
    ['case', isNearby, '#0E0E0E', '#FFFFFF']];

  if (!shown) return null;

  return (
    <GeoJSONSource
      key={layerId}
      ref={sourceRef}
      id={`${layerId}-source`}
      data={data}
      cluster
      clusterRadius={60}
      clusterMinPoints={2}
      clusterProperties={CLUSTER_PROPERTIES}
      maxzoom={24}
      clusterMaxZoom={24}
      onPress={pressPoint ? (event) => {
        if (currentData.current !== byId) return;
        const feature = event.nativeEvent.features.find((item) => item.geometry.type === 'Point');
        if (!feature) return;
        event.stopPropagation();
        try {
          const point = getNoteMapPoint(feature, byId);
          if (!point) return;
          pressPoint(point, point.clusters.length ? undefined : async () => {
            const source = sourceRef.current;
            if (!source || currentData.current !== byId) throw new Error('쪽지 묶음이 갱신되었어요. 다시 눌러 주세요.');
            const result = await getServerClusters(source, feature, byId);
            if (sourceRef.current !== source || currentData.current !== byId) throw new Error('쪽지 묶음이 갱신되었어요. 다시 눌러 주세요.');
            return result;
          });
        } catch (error) {
          Alert.alert('쪽지 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
        }
      } : undefined}
    >
      <Layer id={`${layerId}-circles`} type="circle" afterId={afterId} paint={{
        'circle-radius': ['step', COUNT, 19, 100, 23, 10000, 29],
        'circle-color': fillColor, 'circle-stroke-color': foregroundColor, 'circle-stroke-width': 3,
        'circle-pitch-alignment': 'viewport', 'circle-pitch-scale': 'viewport',
        'circle-opacity-transition': { duration: 0 }, 'circle-stroke-opacity-transition': { duration: 0 },
        'circle-opacity': opacity, 'circle-stroke-opacity': opacity,
      }} />
      <Layer id={`${layerId}-symbols`} type="symbol" afterId={`${layerId}-circles`} layout={{
        'text-field': ['to-string', COUNT], 'text-font': ['Noto Sans Bold'], 'text-size': 16,
        'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true,
        'text-pitch-alignment': 'viewport', 'text-rotation-alignment': 'viewport',
      }} paint={{ 'text-color': foregroundColor, 'text-opacity-transition': { duration: 0 }, 'text-opacity': opacity }} />
    </GeoJSONSource>
  );
});

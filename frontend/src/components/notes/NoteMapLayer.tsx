import { GeoJSONSource, Layer, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import { memo, useMemo, useRef } from 'react';
import { Alert } from 'react-native';

import type { MapClusterMarker } from '@/api/types';
import { NEARBY_CLUSTER_MIN_ZOOM, NOTE_READ_RADIUS_METERS } from '@/constants/home-map';
import { CLUSTER_PROPERTIES, createNoteMapData, getNoteMapPoint, getServerClusters, type NoteMapPoint } from '@/utils/note-map-clusters';

export type { NoteMapPoint } from '@/utils/note-map-clusters';

type Props = {
  clusters: readonly MapClusterMarker[];
  userPoint?: GeoJSON.Point | null;
  onPointPress?: (point: NoteMapPoint, loadClusters?: () => Promise<readonly MapClusterMarker[]>) => void;
  id?: string;
  afterId?: string;
};

const COUNT: ExpressionSpecification = ['get', 'noteCount'];

export const NoteMapLayer = memo(function NoteMapLayer({ clusters, userPoint, onPointPress, id = 'notes', afterId }: Props) {
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const byId = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster])), [clusters]);
  const currentData = useRef(byId);
  currentData.current = byId;
  const data = useMemo(() => createNoteMapData(clusters), [clusters]);
  // Evaluate the rendered point so native clusters use their final center, not their members.
  const isNearby: ExpressionSpecification = userPoint
    ? ['<=', ['distance', userPoint], NOTE_READ_RADIUS_METERS] : ['literal', false];
  const fillColor: ExpressionSpecification = ['step', ['zoom'], '#2350FF', NEARBY_CLUSTER_MIN_ZOOM,
    ['case', isNearby, '#D6F65A', '#2350FF']];
  const foregroundColor: ExpressionSpecification = ['step', ['zoom'], '#FFFFFF', NEARBY_CLUSTER_MIN_ZOOM,
    ['case', isNearby, '#0E0E0E', '#FFFFFF']];

  return (
    <GeoJSONSource
      ref={sourceRef}
      id={`${id}-source`}
      data={data}
      cluster
      clusterRadius={60}
      clusterMinPoints={2}
      clusterProperties={CLUSTER_PROPERTIES}
      maxzoom={24}
      clusterMaxZoom={24}
      onPress={onPointPress ? (event) => {
        const feature = event.nativeEvent.features.find((item) => item.geometry.type === 'Point');
        if (!feature) return;
        event.stopPropagation();
        try {
          const point = getNoteMapPoint(feature, byId);
          if (!point) return;
          onPointPress(point, point.clusters.length ? undefined : async () => {
            const source = sourceRef.current;
            if (!source || currentData.current !== byId) throw new Error('쪽지 묶음이 갱신되었어요. 다시 눌러 주세요.');
            const result = await getServerClusters(source, feature, byId);
            if (currentData.current !== byId) throw new Error('쪽지 묶음이 갱신되었어요. 다시 눌러 주세요.');
            return result;
          });
        } catch (error) {
          Alert.alert('쪽지 확인 실패', error instanceof Error ? error.message : '다시 시도해 주세요.');
        }
      } : undefined}
    >
      <Layer id={`${id}-circles`} type="circle" afterId={afterId} paint={{
        'circle-radius': ['step', COUNT, 19, 100, 23, 10000, 29],
        'circle-color': fillColor, 'circle-stroke-color': foregroundColor, 'circle-stroke-width': 3,
        'circle-pitch-alignment': 'viewport', 'circle-pitch-scale': 'viewport',
      }} />
      <Layer id={`${id}-symbols`} type="symbol" afterId={`${id}-circles`} layout={{
        'text-field': ['to-string', COUNT], 'text-font': ['Noto Sans Bold'], 'text-size': 16,
        'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true,
        'text-pitch-alignment': 'viewport', 'text-rotation-alignment': 'viewport',
      }} paint={{ 'text-color': foregroundColor }} />
    </GeoJSONSource>
  );
});

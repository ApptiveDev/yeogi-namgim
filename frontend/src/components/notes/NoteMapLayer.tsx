import { GeoJSONSource, Layer, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { ExpressionSpecification, GeoJSONSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { FeatureCollection, Point } from 'geojson';
import { memo, useMemo, type Ref } from 'react';

export interface NoteMapItem {
  id: string;
  latitude: number;
  longitude: number;
  isWithinRadius?: boolean;
}

export interface NoteMapPoint {
  center: [longitude: number, latitude: number];
  count: number;
  clusterId?: number;
  noteId?: string;
}

export interface NoteMapLayerProps {
  notes: readonly NoteMapItem[];
  onPointPress?: (point: NoteMapPoint) => void;
  sourceRef?: Ref<GeoJSONSourceRef>;
  /** Unique per mounted layer when displaying multiple collections. */
  id?: string;
  afterId?: string;
}

const COUNT: ExpressionSpecification = ['coalesce', ['get', 'point_count'], 1];
// The stroke is drawn outside circle-radius; include it in the 44/52/64px diameter.
const RADIUS: ExpressionSpecification = ['step', COUNT, 19, 100, 23, 10000, 29];
const INSIDE: ExpressionSpecification = ['>', ['coalesce', ['get', 'insideCount'], 0], 0];
const CLUSTER_PROPERTIES: GeoJSONSourceSpecification['clusterProperties'] = {
  insideCount: ['+', ['get', 'insideCount']],
};

/** One clustered source; isolated notes use the same numbered circle as clusters. */
export const NoteMapLayer = memo(function NoteMapLayer({
  notes,
  onPointPress,
  sourceRef,
  id = 'notes',
  afterId,
}: NoteMapLayerProps) {
  const data = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: notes.map((note) => ({
      type: 'Feature',
      id: note.id,
      geometry: { type: 'Point', coordinates: [note.longitude, note.latitude] },
      properties: { noteId: note.id, insideCount: note.isWithinRadius ? 1 : 0 },
    })),
  }), [notes]);

  const noteIds = useMemo(() => new Set(notes.map((note) => note.id)), [notes]);

  return (
    <GeoJSONSource
      ref={sourceRef}
      id={`${id}-source`}
      data={data}
      cluster
      clusterRadius={50}
      clusterMinPoints={2}
      clusterProperties={CLUSTER_PROPERTIES}
      maxzoom={24}
      clusterMaxZoom={24}
      onPress={onPointPress ? (event) => {
        const feature = event.nativeEvent.features.find((item) => item.geometry.type === 'Point');
        if (!feature || feature.geometry.type !== 'Point') return;
        const [longitude, latitude] = feature.geometry.coordinates;
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
        const properties = feature.properties;
        const isCluster = properties?.cluster === true;
        if (isCluster) {
          if (!Number.isInteger(properties.cluster_id) || properties.cluster_id < 0
            || !Number.isSafeInteger(properties.point_count) || properties.point_count < 2) return;
        } else if (typeof properties?.noteId !== 'string' || !noteIds.has(properties.noteId)) return;

        event.stopPropagation();
        onPointPress({
          center: [longitude, latitude],
          count: isCluster ? properties.point_count : 1,
          ...(isCluster ? { clusterId: properties.cluster_id } : { noteId: properties.noteId }),
        });
      } : undefined}
    >
      <Layer
        id={`${id}-circles`}
        type="circle"
        afterId={afterId}
        paint={{
          'circle-radius': ['+', RADIUS, ['case', INSIDE, 0.5, 0]],
          'circle-color': ['case', INSIDE, '#D6F65A', '#2350FF'],
          'circle-stroke-color': ['case', INSIDE, '#0E0E0E', '#FFFFFF'],
          'circle-stroke-width': ['case', INSIDE, 2.5, 3],
          'circle-pitch-alignment': 'viewport',
          'circle-pitch-scale': 'viewport',
        }}
      />
      <Layer
        id={`${id}-symbols`}
        type="symbol"
        afterId={`${id}-circles`}
        layout={{
          'text-field': ['to-string', COUNT],
          'text-font': ['Noto Sans Bold'],
          'text-size': 16,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-pitch-alignment': 'viewport',
          'text-rotation-alignment': 'viewport',
        }}
        paint={{ 'text-color': ['case', INSIDE, '#0E0E0E', '#FFFFFF'] }}
      />
    </GeoJSONSource>
  );
});

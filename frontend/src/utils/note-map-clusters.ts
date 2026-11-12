import type { GeoJSONSourceProps, GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection, Point } from 'geojson';

import type { MapClusterMarker } from '@/api/types';

export type NoteMapPoint = {
  id: string;
  count: number;
  center: [longitude: number, latitude: number];
  clusters: readonly MapClusterMarker[];
};

export const CLUSTER_PROPERTIES: GeoJSONSourceProps['clusterProperties'] = {
  noteCount: [['+', ['accumulated'], ['get', 'noteCount']], ['get', 'noteCount']],
};

export const toMapPoint = (cluster: MapClusterMarker): NoteMapPoint => ({
  id: cluster.id, count: cluster.count, center: [cluster.longitude, cluster.latitude], clusters: [cluster],
});

export function createNoteMapData(clusters: readonly MapClusterMarker[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: clusters.map((cluster) => ({
    type: 'Feature', id: cluster.id,
    geometry: { type: 'Point', coordinates: [cluster.longitude, cluster.latitude] },
    properties: { id: cluster.id, noteCount: cluster.count },
  })) };
}

export function getNoteMapPoint(feature: Feature, byId: ReadonlyMap<string, MapClusterMarker>): NoteMapPoint | null {
  if (feature.geometry.type !== 'Point') return null;
  const properties = feature.properties;
  if (properties?.cluster !== true) {
    const cluster = byId.get(properties?.id);
    return cluster ? toMapPoint(cluster) : null;
  }
  const clusterId = properties.cluster_id, count = properties.noteCount;
  const [longitude, latitude] = feature.geometry.coordinates;
  if (!Number.isSafeInteger(clusterId) || clusterId < 0 || !Number.isSafeInteger(count) || count < 1
    || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    throw new Error('선택한 쪽지 묶음을 확인하지 못했어요. 다시 눌러 주세요.');
  }
  return { id: `local:${clusterId}`, count, clusters: [], center: [longitude, latitude] };
}

export async function getServerClusters(
  source: Pick<GeoJSONSourceRef, 'getClusterLeaves'>, feature: Feature, byId: ReadonlyMap<string, MapClusterMarker>,
): Promise<readonly MapClusterMarker[]> {
  const point = getNoteMapPoint(feature, byId);
  if (!point) throw new Error('선택한 쪽지 묶음을 확인하지 못했어요.');
  if (point.clusters.length) return point.clusters;
  const properties = feature.properties!;
  const leafCount = properties.point_count;
  if (!Number.isSafeInteger(leafCount) || leafCount < 2 || leafCount > byId.size) {
    throw new Error('쪽지 묶음의 개수가 올바르지 않아요. 다시 눌러 주세요.');
  }
  const leaves = await source.getClusterLeaves(properties.cluster_id, leafCount, 0);
  if (!Array.isArray(leaves) || leaves.length !== leafCount) throw new Error('쪽지 묶음을 모두 확인하지 못했어요. 다시 눌러 주세요.');
  const ids = new Set<string>();
  const clusters = leaves.map((leaf) => {
    const id = leaf.properties?.id;
    const cluster = byId.get(id);
    if (leaf.geometry.type !== 'Point' || !cluster || ids.has(id) || leaf.properties?.noteCount !== cluster.count) {
      throw new Error('쪽지 묶음이 갱신되었어요. 다시 눌러 주세요.');
    }
    ids.add(id);
    return cluster;
  });
  if (clusters.reduce((sum, cluster) => sum + cluster.count, 0) !== point.count) {
    throw new Error('쪽지 묶음의 개수가 바뀌었어요. 다시 눌러 주세요.');
  }
  return clusters;
}

import type { GeoJSONSourceProps, GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection, Point } from 'geojson';

import type { MapBounds, MapClusterMarker } from '@/api/types';
import { splitMapBounds } from './map-bounds';

type Clusters = readonly MapClusterMarker[] | null;
type Fade = { from: number; to: 0 | 1 };

export type NoteMapFade = {
  latest: Clusters;
  shown: Clusters;
  opacity: number;
  fade: Fade | null;
};

function positionKeys(clusters: Clusters, ranges: readonly MapBounds[] | null) {
  return (clusters ?? [])
    .filter(({ latitude, longitude }) => !ranges || ranges.some((range) =>
      latitude >= range.minLatitude && latitude <= range.maxLatitude
      && longitude >= range.minLongitude && longitude <= range.maxLongitude))
    .map(({ latitude, longitude }) => `${latitude},${longitude}`);
}

export function updateNoteMapFade(
  state: NoteMapFade, latest: Clusters, reduceMotion: boolean, viewportBounds: MapBounds | null = null,
): NoteMapFade {
  if (reduceMotion || latest === null) return { latest, shown: latest, opacity: 1, fade: null };

  const { shown, opacity, fade } = state;
  const ranges = viewportBounds ? splitMapBounds(viewportBounds) : null;
  const before = positionKeys(shown, ranges);
  const after = positionKeys(latest, ranges);
  if (before.length === after.length) {
    before.sort();
    if (after.sort().every((key, index) => key === before[index])) {
      return { ...state, latest, shown: latest, fade: fade?.to === 0 ? { from: opacity, to: 1 } : fade };
    }
  }

  if (!shown?.length || opacity === 0) {
    return latest.length
      ? { latest, shown: latest, opacity: 0, fade: { from: 0, to: 1 } }
      : { latest, shown: latest, opacity: 1, fade: null };
  }

  return { ...state, latest, fade: fade?.to === 0 ? fade : { from: opacity, to: 0 } };
}

export function advanceNoteMapFade(state: NoteMapFade, fade: Fade, progress: number): NoteMapFade {
  if (state.fade !== fade) return state;
  if (progress < 1) return { ...state, opacity: fade.from + (fade.to - fade.from) * progress };
  const { latest } = state;
  if (fade.to === 0 && latest?.length) {
    return { latest, shown: latest, opacity: 0, fade: { from: 0, to: 1 } };
  }
  return { latest, shown: latest, opacity: 1, fade: null };
}

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

import { apiRequest } from './client';
import type { MapBounds, MapClustersResponse } from './types';

export async function getMapClusters(bounds: MapBounds, token: string, gridSize: number): Promise<MapClustersResponse> {
  const query = new URLSearchParams({
    minLatitude: String(bounds.minLatitude), minLongitude: String(bounds.minLongitude),
    maxLatitude: String(bounds.maxLatitude), maxLongitude: String(bounds.maxLongitude),
    filter: 'ALL', gridSize: String(gridSize),
  });
  const data = await apiRequest<MapClustersResponse>(`/api/v1/notes/clusters?${query}`, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` },
  });
  if (!Array.isArray(data?.clusters) || data.clusters.some((cluster) =>
    !cluster || typeof cluster.clusterId !== 'string' || !cluster.clusterId
    || !Number.isSafeInteger(cluster.count) || cluster.count < 1
    || ![cluster.latitude, cluster.minLatitude, cluster.maxLatitude]
      .every((value) => Number.isFinite(value) && value >= -90 && value <= 90)
    || ![cluster.longitude, cluster.minLongitude, cluster.maxLongitude]
      .every((value) => Number.isFinite(value) && value >= -180 && value <= 180)
    || cluster.minLatitude > cluster.maxLatitude || cluster.minLongitude > cluster.maxLongitude)
    || new Set(data.clusters.map((cluster) => cluster.clusterId)).size !== data.clusters.length) {
    throw new Error('지도 묶음 응답이 올바르지 않습니다.');
  }
  return data;
}

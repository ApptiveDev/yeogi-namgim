import { getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { MAP_CLUSTER_GRID_SIZE } from '../constants/home-map';
import { splitMapBounds } from '../utils/map-bounds';
import { getMapClusters } from './map-clusters';
import type { MapBounds, MapClusterMarker, MapFilter } from './types';

export async function loadMapClusters(bounds: MapBounds, isCurrent: () => boolean, filter: MapFilter = 'ALL'): Promise<MapClusterMarker[] | null> {
  const owner = getMemberSessionKey();
  const active = () => isCurrent() && owner === getMemberSessionKey();
  // Each stored longitude belongs to exactly one numeric interval, including +/-180.
  const results = await Promise.all(splitMapBounds(bounds).map(async (range) => {
    if (!active()) return null;
    const result = await runMemberRequest((token) => getMapClusters(range, token, MAP_CLUSTER_GRID_SIZE, filter));
    if (!active()) return null;
    const scope = [filter, range.minLatitude, range.minLongitude, range.maxLatitude, range.maxLongitude, MAP_CLUSTER_GRID_SIZE].join(',');
    return result.clusters.map((cluster) => ({ ...cluster, id: `${scope}/${cluster.clusterId}` }));
  }));
  if (!active() || results.some((result) => result === null)) return null;
  return results.flatMap((result) => result ?? []);
}

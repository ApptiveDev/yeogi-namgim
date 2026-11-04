import type { MapBounds } from '../api/types';

const normalizeLongitude = (value: number) => value >= -180 && value <= 180
  ? value : ((value + 180) % 360 + 360) % 360 - 180;

function isValid(bounds: MapBounds) {
  return [bounds.minLatitude, bounds.maxLatitude, bounds.minLongitude, bounds.maxLongitude].every(Number.isFinite)
    && bounds.minLatitude >= -90 && bounds.maxLatitude <= 90
    && bounds.minLatitude <= bounds.maxLatitude;
}

/** Preserve ordinary boundary precision and split wrapped MapLibre viewports. */
export function splitMapBounds(bounds: MapBounds): MapBounds[] {
  if (!isValid(bounds)) {
    throw new Error('지도 범위를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  if (Math.abs(bounds.maxLongitude - bounds.minLongitude) >= 360) {
    return [{ ...bounds, minLongitude: -180, maxLongitude: 180 }];
  }
  const west = normalizeLongitude(bounds.minLongitude);
  const east = normalizeLongitude(bounds.maxLongitude);
  return west <= east
    ? [{ ...bounds, minLongitude: west, maxLongitude: east }]
    : [
        { ...bounds, minLongitude: west, maxLongitude: 180 },
        { ...bounds, minLongitude: -180, maxLongitude: east },
      ];
}

/** Add a margin on each side, including around date-line and polar viewports. */
export function expandMapBounds(bounds: MapBounds, paddingRatio: number): MapBounds {
  const rawWidth = bounds.maxLongitude - bounds.minLongitude;
  const width = Math.abs(rawWidth) >= 360 ? 360 : rawWidth < 0 ? rawWidth + 360 : rawWidth;
  const height = bounds.maxLatitude - bounds.minLatitude;
  const latitudePadding = height * paddingRatio;
  const longitudePadding = width * paddingRatio;
  return {
    minLatitude: Math.max(-90, bounds.minLatitude - latitudePadding),
    maxLatitude: Math.min(90, bounds.maxLatitude + latitudePadding),
    minLongitude: width + 2 * longitudePadding >= 360 ? -180 : bounds.minLongitude - longitudePadding,
    maxLongitude: width + 2 * longitudePadding >= 360 ? 180 : bounds.minLongitude + width + longitudePadding,
  };
}

export function containsMapBounds(coverage: MapBounds, viewport: MapBounds): boolean {
  if (!isValid(coverage) || !isValid(viewport)) return false;
  if (coverage.minLatitude > viewport.minLatitude || coverage.maxLatitude < viewport.maxLatitude) return false;
  const ranges = splitMapBounds(coverage);
  return splitMapBounds(viewport).every((part) => ranges.some((range) =>
    range.minLongitude <= part.minLongitude && range.maxLongitude >= part.maxLongitude));
}

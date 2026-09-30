import type { Polygon } from 'geojson';

const EARTH_RADIUS_METERS = 6_371_008.8;
const CIRCLE_SEGMENTS = 64;

/** Create a filled circle at a fixed distance in meters from the center. */
export function createLocationCircle(
  longitude: number,
  latitude: number,
  radiusMeters: number,
): Polygon {
  const centerLatitude = (latitude * Math.PI) / 180;
  const centerLongitude = (longitude * Math.PI) / 180;
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const coordinates: number[][] = [];

  for (let index = 0; index < CIRCLE_SEGMENTS; index += 1) {
    const bearing = (index * 2 * Math.PI) / CIRCLE_SEGMENTS;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
        Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLongitude = centerLongitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
      Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(pointLatitude),
    );

    coordinates.push([
      (((pointLongitude * 180) / Math.PI + 540) % 360) - 180,
      (pointLatitude * 180) / Math.PI,
    ]);
  }

  coordinates.push([...coordinates[0]]);
  return { type: 'Polygon', coordinates: [coordinates] };
}

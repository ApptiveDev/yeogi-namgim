type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_008.8;

export function getDistanceMeters(
  from: Coordinate,
  to: Coordinate,
): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const clampedA = Math.min(1, Math.max(0, a));

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))
  );
}
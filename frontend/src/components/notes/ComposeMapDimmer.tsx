import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { MultiPolygon } from 'geojson';
import { COMPOSE_DIM_DURATION, COMPOSE_DIM_OPACITY } from './compose-transitions';

// Split the Mercator world at longitude 0 to avoid a ring crossing the dateline.
const WORLD: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [-180, 0].map((west) => [[
    [west, -85.051129], [west + 180, -85.051129],
    [west + 180, 85.051129], [west, 85.051129], [west, -85.051129],
  ]]),
};

/** Insert above map content, below the placement preview. Keep mounted for fading. */
export function ComposeMapDimmer({ visible }: {
  visible: boolean;
}) {
  return (
    <GeoJSONSource id="compose-map-dimmer" data={WORLD}>
      <Layer
        id="compose-map-dim"
        type="fill"
        afterId="user-radius-outline"
        paint={{
          'fill-color': '#000000',
          'fill-opacity': visible ? COMPOSE_DIM_OPACITY : 0,
          'fill-opacity-transition': { duration: COMPOSE_DIM_DURATION, delay: 0 },
          'fill-antialias': false,
        }}
      />
    </GeoJSONSource>
  );
}

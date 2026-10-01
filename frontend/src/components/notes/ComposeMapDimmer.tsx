import { Layer } from '@maplibre/maplibre-react-native';
import { COMPOSE_DIM_DURATION, COMPOSE_DIM_OPACITY } from './compose-transitions';

/** Insert above map content, below the placement preview. Keep mounted for fading. */
export function ComposeMapDimmer({ visible }: {
  visible: boolean;
}) {
  return (
    <Layer
      id="compose-map-dim"
      type="background"
      afterId="notes-symbols"
      paint={{
        'background-color': '#000000',
        'background-opacity': visible ? COMPOSE_DIM_OPACITY : 0,
        'background-opacity-transition': { duration: COMPOSE_DIM_DURATION, delay: 0 },
      }}
    />
  );
}

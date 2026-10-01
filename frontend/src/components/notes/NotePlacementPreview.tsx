import { Images, Layer } from '@maplibre/maplibre-react-native';
import { NOTE_MARKER_ASSETS, NOTE_MARKER_BOTTOM_PADDING } from './note-marker-assets';

const PLACEMENT_IMAGES = {
  'note-placement-preview': NOTE_MARKER_ASSETS.owned,
};

/** Register once as a child of Map. */
export function NotePlacementPreviewImages() {
  return <Images images={PLACEMENT_IMAGES} />;
}

/** Use inside the compose coordinate source; GeoJSONSource injects its source ID. */
export function NotePlacementPreview({ source }: { source?: string }) {
  return (
    <Layer
      id="note-placement-preview"
      source={source}
      type="symbol"
      afterId="compose-map-dim"
      layout={{
        'icon-image': 'note-placement-preview',
        'icon-anchor': 'bottom',
        'icon-offset': [0, NOTE_MARKER_BOTTOM_PADDING],
        'icon-size': 1,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-pitch-alignment': 'viewport',
        'icon-rotation-alignment': 'viewport',
      }}
    />
  );
}


import { Image } from 'expo-image';
import { memo } from 'react';

import {
  NOTE_MARKER_ASSETS,
  NOTE_MARKER_HEIGHT,
  NOTE_MARKER_LABELS,
  NOTE_MARKER_WIDTH,
  type NoteMarkerState,
} from './note-marker-assets';

export interface NoteMarkerProps {
  state: NoteMarkerState;
  /** Width of the full image including badge and shadow padding. */
  size?: number;
}

/** Standalone icon for cards and legends. Use NoteMapLayer for map markers. */
export const NoteMarker = memo(function NoteMarker({
  state,
  size = NOTE_MARKER_WIDTH,
}: NoteMarkerProps) {
  return (
    <Image
      source={NOTE_MARKER_ASSETS[state]}
      style={{ width: size, height: size * NOTE_MARKER_HEIGHT / NOTE_MARKER_WIDTH }}
      contentFit="contain"
      accessible
      accessibilityLabel={NOTE_MARKER_LABELS[state]}
    />
  );
});

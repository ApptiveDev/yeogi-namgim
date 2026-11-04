import { Image } from 'expo-image';
import { memo } from 'react';

import {
  NOTE_MARKER_IMAGE,
  NOTE_MARKER_HEIGHT,
  NOTE_MARKER_WIDTH,
} from './note-marker-assets';

export interface NoteMarkerProps {
  /** Width of the full image including shadow padding. */
  size?: number;
}

/** Owned-note icon for the creation confirmation. */
export const NoteMarker = memo(function NoteMarker({
  size = NOTE_MARKER_WIDTH,
}: NoteMarkerProps) {
  return (
    <Image
      source={NOTE_MARKER_IMAGE}
      style={{ width: size, height: size * NOTE_MARKER_HEIGHT / NOTE_MARKER_WIDTH }}
      contentFit="contain"
      accessible
      accessibilityLabel="내가 작성한 쪽지"
    />
  );
});

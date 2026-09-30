import type { ImageSourcePropType } from 'react-native';

export type NoteMarkerState = 'locked' | 'available' | 'owned' | 'read';

export const NOTE_MARKER_ASSETS = {
  locked: require('../../../assets/images/note-markers/locked.png'),
  available: require('../../../assets/images/note-markers/available.png'),
  owned: require('../../../assets/images/note-markers/owned.png'),
  read: require('../../../assets/images/note-markers/read.png'),
} as const satisfies Record<NoteMarkerState, ImageSourcePropType>;

export const NOTE_MARKER_LABELS: Record<NoteMarkerState, string> = {
  locked: '아직 먼 쪽지',
  available: '열 수 있는 쪽지',
  owned: '내가 작성한 쪽지',
  read: '읽은 쪽지',
};

export const NOTE_MARKER_WIDTH = 56;
export const NOTE_MARKER_HEIGHT = 64;
// The tip is at y=116 in the 112x128 source canvas; retain shadow padding.
export const NOTE_MARKER_BOTTOM_PADDING = 6;

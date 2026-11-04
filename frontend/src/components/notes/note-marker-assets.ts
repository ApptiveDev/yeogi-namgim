import type { ImageRequireSource } from 'react-native';

export const NOTE_MARKER_IMAGE: ImageRequireSource = require('../../../assets/images/note-markers/owned.png');

export const NOTE_MARKER_WIDTH = 56;
export const NOTE_MARKER_HEIGHT = 64;
// The tip is at y=116 in the 112x128 source canvas; retain shadow padding.
export const NOTE_MARKER_BOTTOM_PADDING = 6;

import { GeoJSONSource, Images, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import { memo, useMemo } from 'react';

import {
  NOTE_MARKER_ASSETS,
  NOTE_MARKER_BOTTOM_PADDING,
  type NoteMarkerState,
} from './note-marker-assets';

export interface NoteMapItem {
  id: string;
  latitude: number;
  longitude: number;
  state: NoteMarkerState;
}

export interface NoteMapLayerProps {
  notes: readonly NoteMapItem[];
  onNotePress?: (note: NoteMapItem) => void;
  /** Unique per mounted layer when displaying multiple collections. */
  id?: string;
  /** When false, colliding pins are hidden to keep a crowded map readable. */
  allowOverlap?: boolean;
  afterId?: string;
}

const PRIORITY: Record<NoteMarkerState, number> = {
  owned: 0,
  available: 1,
  read: 2,
  locked: 3,
};

/** Add inside Map. Uses one source and one symbol layer for the whole collection. */
export const NoteMapLayer = memo(function NoteMapLayer({
  notes,
  onNotePress,
  id = 'notes',
  allowOverlap = false,
  afterId,
}: NoteMapLayerProps) {
  const imagePrefix = `${id}-marker`;
  const images = useMemo(() => ({
    [`${imagePrefix}-locked`]: NOTE_MARKER_ASSETS.locked,
    [`${imagePrefix}-available`]: NOTE_MARKER_ASSETS.available,
    [`${imagePrefix}-owned`]: NOTE_MARKER_ASSETS.owned,
    [`${imagePrefix}-read`]: NOTE_MARKER_ASSETS.read,
  }), [imagePrefix]);

  const data = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: notes.map((note) => ({
      type: 'Feature',
      id: note.id,
      geometry: { type: 'Point', coordinates: [note.longitude, note.latitude] },
      properties: {
        noteId: note.id,
        icon: `${imagePrefix}-${note.state}`,
        priority: PRIORITY[note.state],
      },
    })),
  }), [notes, imagePrefix]);

  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  return (
    <>
      <Images images={images} />
      <GeoJSONSource
        id={`${id}-source`}
        data={data}
        onPress={onNotePress ? (event) => {
          const noteId = event.nativeEvent.features[0]?.properties?.noteId;
          const note = typeof noteId === 'string' ? notesById.get(noteId) : undefined;
          if (note) {
            event.stopPropagation();
            onNotePress(note);
          }
        } : undefined}
      >
        <Layer
          id={`${id}-symbols`}
          type="symbol"
          afterId={afterId}
          layout={{
            'icon-image': ['get', 'icon'],
            'icon-anchor': 'bottom',
            'icon-offset': [0, NOTE_MARKER_BOTTOM_PADDING],
            'icon-size': 1,
            'icon-allow-overlap': allowOverlap,      
            'icon-pitch-alignment': 'viewport',
            'icon-rotation-alignment': 'viewport',
            'symbol-sort-key': ['get', 'priority'],
          }}
        />
      </GeoJSONSource>
    </>
  );
});

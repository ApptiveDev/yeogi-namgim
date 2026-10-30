import type { RefObject } from 'react';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import type { FeatureCollection } from 'geojson';

import { ComposeMapDimmer } from '@/components/notes/ComposeMapDimmer';
import { NoteMapLayer, type NoteMapItem } from '@/components/notes/NoteMapLayer';
import { NotePlacementPreview, NotePlacementPreviewImages } from '@/components/notes/NotePlacementPreview';
import { DEFAULT_MAP_VIEW } from '@/constants/home-map';
import type { useHomeMap } from '@/hooks/use-home-map';
import { styles } from '@/styles/home.styles';
import { localizedMapStyle } from '@/styles/map-style';

const EMPTY_RADIUS: FeatureCollection = { type: 'FeatureCollection', features: []};
const BASE_MAP_TOP_LAYER = localizedMapStyle.layers.at(-1)?.id;

type Props = {
  map: ReturnType<typeof useHomeMap>;
  cameraRef: RefObject<CameraRef | null>;
  isComposeOpen: boolean;
  handleOpenNote: (note: NoteMapItem) => Promise<void>;
};

export function HomeMap({ map, cameraRef, isComposeOpen, handleOpenNote }: Props) {
  const {
    mapRef, setIsMapReady, userPoint, composePoint, userCircle, mapNotes,
    handleRegionWillChange, handleRegionDidChange, updateMapBounds,
  } = map;

  return (
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={localizedMapStyle}
        logo={false}
        attribution={false}
        onRegionWillChange={handleRegionWillChange}
        onDidFinishLoadingMap={() => {
          setIsMapReady(true);
          void updateMapBounds();
        }}
        onRegionDidChange={(event) => {
          handleRegionDidChange(event);
          void updateMapBounds();
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={DEFAULT_MAP_VIEW}
        />

        {/* 유저 주변 원 */}
        {userCircle && (
          <GeoJSONSource id="user-radius" data={userCircle ?? EMPTY_RADIUS}>
            <Layer
              id="user-radius-fill"
              type="fill"
              afterId={BASE_MAP_TOP_LAYER}
              paint={{
                'fill-color': '#EDB84A',
                'fill-opacity': 0.18,
                'fill-antialias': false,
              }}
            />
            <Layer
              id="user-radius-outline"
              type="line"
              afterId="user-radius-fill"
              paint={{
                'line-color': '#D2643E',
                'line-opacity': 0.7,
                'line-width': 1.5,
                'line-dasharray': [5, 4],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </GeoJSONSource>
        )}

        <NoteMapLayer
          notes={mapNotes}
          afterId={BASE_MAP_TOP_LAYER}
          onNotePress={(note) => {
            void handleOpenNote(note);
          }}
        />
        <ComposeMapDimmer visible={isComposeOpen} />
        <NotePlacementPreviewImages />

        {/* 유저 위치 표기 마커 */}
        {userPoint && <GeoJSONSource id="user-location" data={userPoint}>
          <Layer
            id="user-location-marker"
            type="circle"
            beforeId="compose-map-dim"
            paint={{
              'circle-radius': 6,
              'circle-color': '#3B2A20',
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 3,
              'circle-pitch-alignment': 'map',
            }}
          />
        </GeoJSONSource>}
        {isComposeOpen && composePoint && (
          <GeoJSONSource id="note-placement" data={composePoint}>
            <NotePlacementPreview />
          </GeoJSONSource>
        )}
      </Map>
  );
}

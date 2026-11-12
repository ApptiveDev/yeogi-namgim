import { useState, type RefObject } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import { Camera, GeoJSONSource, Images, Layer, Map, Marker, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';

import { NoteMapLayer } from '@/components/notes/NoteMapLayer';
import { NoteSelectionHighlight } from '@/components/notes/NoteSelectionHighlight';
import { DEFAULT_MAP_VIEW } from '@/constants/home-map';
import type { useHomeMap } from '@/hooks/use-home-map';
import { styles } from '@/styles/home.styles';
import { localizedMapStyle } from '@/styles/map-style';

const BASE_MAP_TOP_LAYER = localizedMapStyle.layers.at(-1)?.id;
const USER_LOCATION_IMAGES = {
  'user-location-halo': require('../../../assets/images/user-location-halo.png'),
  'user-location-dot': require('../../../assets/images/user-location-dot.png'),
};

type Props = {
  map: ReturnType<typeof useHomeMap>;
  initialCenter: [number, number];
  cameraRef: RefObject<CameraRef | null>;
  onComposeCameraIdle: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void;
};

export function HomeMap({ map, initialCenter, cameraRef, onComposeCameraIdle }: Props) {
  const {
    mapRef, setIsMapReady, userPoint, userCircle, mapClusters,
    handleRegionWillChange, handleRegionDidChange, updateMapBounds,
  } = map;
  // Start at the resolved location, so an earlier default viewport cannot dismiss the cover.
  const [initialViewState] = useState(() => ({
    ...DEFAULT_MAP_VIEW,
    center: initialCenter,
  }));

  return (
      <Map
        ref={mapRef}
        style={styles.map}
        mapStyle={localizedMapStyle}
        logo={false}
        attribution={false}
        onRegionWillChange={handleRegionWillChange}
        onPress={map.clearMapSelection}
        onDidFinishLoadingMap={() => {
          setIsMapReady(true);
          void updateMapBounds();
        }}
        onDidFinishRenderingFrameFully={() => {
          if (map.isMapReady) map.setIsMapRendered(true);
        }}
        onDidFailLoadingMap={() => map.setMapError('지도를 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요.')}
        onRegionDidChange={(event) => {
          handleRegionDidChange(event);
          onComposeCameraIdle(event);
          void updateMapBounds();
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={initialViewState}
        />
        <Images images={USER_LOCATION_IMAGES} />

        {/* 유저 주변 원 */}
        {userCircle && (
          <GeoJSONSource id="user-radius" data={userCircle}>
            <Layer
              id="user-radius-fill"
              type="fill"
              afterId={BASE_MAP_TOP_LAYER}
              paint={{
                'fill-color': '#D6F65A',
                'fill-opacity': 0.3,
                'fill-antialias': false,
              }}
            />
            <Layer
              id="user-radius-outline"
              type="line"
              afterId="user-radius-fill"
              paint={{
                'line-color': '#9CC414',
                'line-width': 2,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </GeoJSONSource>
        )}

        {userPoint && <GeoJSONSource id="user-location" data={userPoint}>
          <Layer
            id="user-location-halo"
            type="symbol"
            afterId={userCircle ? 'user-radius-outline' : BASE_MAP_TOP_LAYER}
            layout={{
              'icon-image': 'user-location-halo',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-pitch-alignment': 'viewport',
              'icon-rotation-alignment': 'viewport',
            }}
          />
          <Layer
            id="user-location-marker"
            type="symbol"
            afterId="user-location-halo"
            layout={{
              'icon-image': 'user-location-dot',
              // The exported shadow adds 4px above and 8px below the 20px dot.
              'icon-offset': [0, 2],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-pitch-alignment': 'viewport',
              'icon-rotation-alignment': 'viewport',
            }}
          />
        </GeoJSONSource>}

        <NoteMapLayer
          clusters={mapClusters}
          userPoint={userPoint}
          afterId={userPoint ? 'user-location-marker' : userCircle ? 'user-radius-outline' : BASE_MAP_TOP_LAYER}
          onPointPress={(point, loadClusters) => { void map.handleNotePointPress(point, loadClusters); }}
        />
        {map.selectedMapPoint?.isInside && (
          <Marker id="selected-note-highlight" lngLat={map.selectedMapPoint.point.center} pointerEvents="none">
            <NoteSelectionHighlight key={map.selectedMapPoint.key} point={map.selectedMapPoint.point} isInside />
          </Marker>
        )}
      </Map>
  );
}

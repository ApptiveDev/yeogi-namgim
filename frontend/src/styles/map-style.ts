import { getLocales } from 'expo-localization';
import type {
  LayerSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';

import mapStyle from '@/assets/maps/custom-style.json';

const language = getLocales()[0].languageCode ?? 'en';
const baseStyle = mapStyle as StyleSpecification;

export const localizedMapStyle: StyleSpecification = {
  ...baseStyle,
  layers: baseStyle.layers.map((layer): LayerSpecification => {
    // 글자 x, 도로 번호는 적용 안 함
    if (
      layer.type !== 'symbol' || 
      !layer.layout?.['text-field'] ||
      layer.id.includes('shield')
    ) {
      return layer;
    }

    return {
      ...layer,
      layout: {
        ...layer.layout,
        'text-field': [
          'coalesce',
          ['get', `name:${language}`],
          ['get', 'name:en'],
          ['get', 'name'],
          '',
        ],
      },
    };
  }),
};
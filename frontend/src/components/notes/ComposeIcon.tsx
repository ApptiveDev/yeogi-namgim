import { Image } from 'expo-image';

const ICONS = {
  close: require('../../../assets/images/compose-icons/close.png'),
  plus: require('../../../assets/images/compose-icons/plus.png'),
  globe: require('../../../assets/images/compose-icons/globe.png'),
  friends: require('../../../assets/images/compose-icons/friends.png'),
  lock: require('../../../assets/images/compose-icons/lock.png'),
  location: require('../../../assets/images/compose-icons/location.png'),
  check: require('../../../assets/images/compose-icons/check.png'),
} as const;

export function ComposeIcon({ name, color = '#191919', size = 20 }: {
  name: keyof typeof ICONS;
  color?: string;
  size?: number;
}) {
  return <Image source={ICONS[name]} tintColor={color} style={{ width: size, height: size }} contentFit="contain" />;
}

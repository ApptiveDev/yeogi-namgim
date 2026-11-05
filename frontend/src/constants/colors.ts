const white = '#FFFFFF';
const pureBlack = '#000000';

export const Palette = {
  brand: {
    blue: '#2350FF',
    lime: '#D6F65A',
    limeDeep: '#B8E03A',
  },
  neutral: {
    black: '#0E0E0E',
    ink: '#1C1C1E',
    gray800: '#2C2C2E',
    gray600: '#5A5A5E',
    gray500: '#8E8E93',
    gray300: '#D1D1D6',
    gray100: '#F0F0F0',
    bg: '#F7F7F5',
    white,
  },
  accent: {
    red: '#E5352B',
    olive: '#3E4A2B',
    paper: '#EEE6D3',
    paperLine: '#D8CDB4',
    tapeBlue: '#3A6FD8',
  },
  map: {
    land: '#ECEDE9',
    park: '#D2E6C6',
    water: '#C3DAF2',
    road: white,
    label: '#8C8F94',
    dark: '#1E1F21',
  },
} as const;

export const ScreenColors = {
  background: Palette.neutral.bg,
  surface: Palette.neutral.white,
  ink: Palette.neutral.black,
  blue: Palette.brand.blue,
  lime: Palette.brand.lime,
  muted: Palette.neutral.gray500,
} as const;

export const SettingsColors = {
  ...ScreenColors,
  section: Palette.neutral.gray500,
  line: '#EEEEEB',
  border: '#E9E9E6',
  neutral: '#ECECE9',
  switchOff: '#D8D8D5',
  destructive: '#E84B3C',
  kakao: '#FEE500',
} as const;

export const StorageColors = {
  ...ScreenColors,
  ink: '#101010',
  muted: '#939399',
  outsideMonth: '#CBCBD0',
  filterTrack: '#ECECEC',
  sunday: '#DC493C',
} as const;

export const Colors = {
  light: {
    text: pureBlack,
    background: Palette.neutral.white,
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: Palette.neutral.white,
    background: pureBlack,
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

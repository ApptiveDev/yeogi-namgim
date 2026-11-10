export type GuestSession = {
  guestId: string;
  guestToken: string;
  tokenType: 'Bearer';
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type MapBounds = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
};

export type MapViewport = { bounds: MapBounds; zoom: number };

export type MapCluster = MapBounds & {
  clusterId: string;
  latitude: number;
  longitude: number;
  count: number;
  noteId: string | null;
};

export type MapClustersResponse = {
  clusters: MapCluster[];
  totalCount: number;
  gridSize: number;
};

export type MapClusterMarker = MapCluster & { id: string };

export type NoteMarker = {
  noteId: string;
  latitude: number;
  longitude: number;
  isMine: boolean;
  accessStatus: 'OPENABLE' | 'LOCKED' | 'LOCATION_REQUIRED';
  distanceMeters: number | null;
};

export type NoteMarkersResponse = {
  notes: NoteMarker[];
  openableNotes?: MapNotePreview[];
  page: number;
  size: number;
  hasNext: boolean;
};

export type MapNoteLocation = { latitude: number; longitude: number };

export type MapNotePreview = {
  isSaved: boolean | null;
  noteId: string;
  preview: string;
  distanceMeters: number | null;
  isMine: boolean;
  color: string | null;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  placeName: string | null;
  neighborhood: string | null;
  createdAt: string;
  authorNickname: string | null;
};

export type NoteCreateRequest = {
  content: string;
  latitude: number;
  longitude: number;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  placeName?: string;
  neighborhood?: string;
};

export type NoteCreateResponse = {
  noteId: string;
  createdAt: string;
};

export type NoteLocationInput = MapNoteLocation & { accuracyMeters?: number; measuredAt?: string };
export type NoteOpenResponse = {
  noteId: string;
  content: string;
  isMine: boolean;
  createdAt: string;
  visibility: MapNotePreview['visibility'];
  color: string | null;
  placeName: string | null;
  neighborhood: string | null;
  isSaved: boolean;
  isRead: boolean;
};
export type BookmarkStateResponse = { noteId: string; isSaved: boolean; savedAt: string | null };

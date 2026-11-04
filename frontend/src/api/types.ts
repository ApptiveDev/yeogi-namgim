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

export type NoteMarker = {
  noteId: string;
  latitude: number;
  longitude: number;
  isMine: boolean;
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
  isSaved: boolean;
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

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

export type NoteOpenRequest = {
  latitude: number;
  longitude: number;
};

export type NoteOpenResponse = {
  noteId: string;
  content: string;
  isMine: boolean;
  createdAt: string;
};
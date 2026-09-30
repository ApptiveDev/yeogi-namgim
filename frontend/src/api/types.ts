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
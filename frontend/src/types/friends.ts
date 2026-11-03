export type FriendProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  sticker?: { source: number; backgroundColor: string };
  hasNewActivity?: boolean;
};

export type FriendActivity = {
  id: string;
  friend: FriendProfile;
  locationLabel: string;
  createdAt: string;
};

export type FriendsData = {
  friends: readonly FriendProfile[];
  activities: readonly FriendActivity[];
};

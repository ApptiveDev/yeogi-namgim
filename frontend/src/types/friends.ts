export type FriendProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
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

import { apiRequest } from './client';
import { normalizeInvitationCode, validateInvitationCode } from '../utils/friends';

export type FriendInvitation = { code: string; expiresAt: string };
export type FriendInvitationPreview = { inviterNickname: string; expiresAt: string };
export type Friend = { friendId: string; nickname: string; friendedAt: string };
export type FriendsPage = { friends: Friend[]; page: number; size: number; hasNext: boolean };
type FriendActivityItem = {
  noteId: string;
  friendId: string;
  nickname: string;
  placeName: string | null;
  neighborhood: string | null;
  createdAt: string;
};
export type FriendActivitiesPage = { activities: FriendActivityItem[]; page: number; size: number; hasNext: boolean };

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validFriend(value: Friend) {
  return value && typeof value.friendId === 'string' && !!value.friendId
    && typeof value.nickname === 'string' && !!value.nickname.trim() && validDate(value.friendedAt);
}

function validInvitation(value: FriendInvitation | null) {
  return typeof value?.code === 'string' && !validateInvitationCode(value.code) && validDate(value.expiresAt);
}

export async function createFriendInvitation(accessToken: string): Promise<FriendInvitation> {
  const result = await apiRequest<FriendInvitation>('/api/v1/friends/invitations', {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!validInvitation(result)) {
    throw new Error('초대 코드 발급 결과를 확인하지 못했어요. 다시 발급해 주세요.');
  }
  return result;
}

export async function getCurrentFriendInvitation(accessToken: string): Promise<FriendInvitation | null> {
  const result = await apiRequest<FriendInvitation | null>('/api/v1/friends/invitations/current', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, null);
  if (result !== null && !validInvitation(result)) {
    throw new Error('내 초대 코드를 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

function invitationPath(code: string) {
  const validation = validateInvitationCode(code);
  if (validation) throw new Error(validation);
  return `/api/v1/friends/invitations/${encodeURIComponent(normalizeInvitationCode(code))}`;
}

export async function previewFriendInvitation(code: string, accessToken: string): Promise<FriendInvitationPreview> {
  const result = await apiRequest<FriendInvitationPreview>(invitationPath(code), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (typeof result?.inviterNickname !== 'string' || !result.inviterNickname.trim() || !validDate(result.expiresAt)) {
    throw new Error('초대 정보를 확인하지 못했어요. 코드를 다시 확인해 주세요.');
  }
  return result;
}

export async function acceptFriendInvitation(code: string, accessToken: string): Promise<Friend> {
  const result = await apiRequest<Friend>(`${invitationPath(code)}/accept`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!validFriend(result)) throw new Error('친구 추가 결과를 확인하지 못했어요. 창을 닫고 친구 목록을 확인해 주세요.');
  return result;
}

export async function getFriends(accessToken: string, page = 0): Promise<FriendsPage> {
  const result = await apiRequest<FriendsPage>(`/api/v1/friends?page=${page}&size=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!Array.isArray(result?.friends) || result.friends.some((friend) => !validFriend(friend))
    || result.page !== page || result.size !== 20 || typeof result.hasNext !== 'boolean') {
    throw new Error('친구 목록을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

function validActivity(value: FriendActivityItem) {
  return value && typeof value.noteId === 'string' && !!value.noteId
    && typeof value.friendId === 'string' && !!value.friendId
    && typeof value.nickname === 'string' && !!value.nickname.trim()
    && (value.placeName === null || typeof value.placeName === 'string')
    && (value.neighborhood === null || typeof value.neighborhood === 'string')
    && validDate(value.createdAt);
}

export async function getFriendActivities(accessToken: string, page = 0): Promise<FriendActivitiesPage> {
  const result = await apiRequest<FriendActivitiesPage>(`/api/v1/friends/activities?page=${page}&size=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!Array.isArray(result?.activities) || result.activities.some((activity) => !validActivity(activity))
    || result.page !== page || result.size !== 20 || typeof result.hasNext !== 'boolean') {
    throw new Error('친구 쪽지 소식을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

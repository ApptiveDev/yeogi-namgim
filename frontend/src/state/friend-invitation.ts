import { acceptFriendInvitation, createFriendInvitation, previewFriendInvitation, type Friend, type FriendInvitation, type FriendInvitationPreview } from '../api/friends';
import { ApiError } from '../api/client';
import { getMemberSessionKey, runMemberRequest } from '../auth/member-session';
import { friendErrorMessage, normalizeInvitationCode, validateInvitationCode } from '../utils/friends';

type Action = 'create' | 'preview' | 'accept';
type ConfirmedInvitation = FriendInvitationPreview & { code: string };
type InvitationState = {
  input: string;
  created: FriendInvitation | null;
  preview: ConfirmedInvitation | null;
  accepted: Friend | null;
  busy: Action | null;
  error: string | null;
};

// A dialog owns one flow. Codes live only in memory and never go into device storage.
export function createFriendInvitationFlow() {
  const owner = getMemberSessionKey();
  let state: InvitationState = { input: '', created: null, preview: null, accepted: null, busy: null, error: null };
  const listeners = new Set<() => void>();
  const update = (change: Partial<InvitationState>) => {
    state = { ...state, ...change };
    listeners.forEach((listener) => listener());
  };
  const available = () => owner === getMemberSessionKey() && !state.busy && !state.accepted;

  async function run<T>(action: Action, request: (token: string) => Promise<T>, result: (value: T) => Partial<InvitationState>) {
    if (!available()) return;
    update({ busy: action, error: null });
    try {
      const value = await runMemberRequest(request);
      if (owner === getMemberSessionKey()) update(result(value));
    } catch (error) {
      if (owner === getMemberSessionKey()) {
        update({
          error: action === 'accept' && !(error instanceof ApiError)
            ? '응답을 확인하지 못했어요. 이미 추가됐을 수 있으니 창을 닫고 친구 목록을 확인해 주세요.'
            : friendErrorMessage(error),
          ...(action === 'accept' ? { preview: null } : {}),
        });
      }
    } finally {
      if (owner === getMemberSessionKey()) update({ busy: null });
    }
  }

  return {
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setInput: (input: string) => { if (available()) update({ input, preview: null, error: null }); },
    clearPreview: () => { if (available()) update({ preview: null, error: null }); },
    generate: () => run('create', createFriendInvitation, (created) => ({ created })),
    preview: async () => {
      if (!available()) return;
      const error = validateInvitationCode(state.input);
      if (error) { update({ error, preview: null }); return; }
      const code = normalizeInvitationCode(state.input);
      await run('preview', (token) => previewFriendInvitation(code, token), (preview) => ({ preview: { ...preview, code } }));
    },
    accept: async () => {
      if (!available() || !state.preview) return;
      const invitation = state.preview;
      if (Date.parse(invitation.expiresAt) <= Date.now()) {
        update({ error: '초대 코드가 만료됐어요. 새로운 코드를 받아 주세요.', preview: null });
        return;
      }
      await run('accept', (token) => acceptFriendInvitation(invitation.code, token), (accepted) => ({ accepted, preview: null }));
    },
  };
}

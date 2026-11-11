import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { changeBookmark } from '@/api/note-detail';
import type { MapNoteLocation, NoteOpenResponse } from '@/api/types';
import { getMemberSessionKey, runMemberRequest } from '@/auth/member-session';
import { showToast } from '@/components/ui/toast';
import { loadNoteDetail } from '@/data/note-detail';
import { publishBookmarkChange } from '@/state/note-bookmarks';

function requireLocation(latitude?: number, longitude?: number): MapNoteLocation {
  if (typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('목록에서 쪽지를 다시 열어 주세요.');
  }
  return { latitude, longitude };
}

function message(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NOTE_LOCKED') return '현재 위치에서는 이 쪽지를 열 수 없어요.';
    if (error.code === 'LOCATION_REQUIRED') return '현재 위치를 확인한 뒤 다시 시도해 주세요.';
    if (error.status === 404) return '쪽지가 삭제되었거나 볼 수 없는 쪽지예요.';
  }
  return error instanceof Error ? error.message : '쪽지를 불러오지 못했어요. 다시 시도해 주세요.';
}

type State = { id: string; owner: number; note: NoteOpenResponse | null; loading: boolean; saving: boolean };

export function useNoteDetail(noteId: string, skipLocation = false, latitude?: number, longitude?: number) {
  const generation = useRef(0);
  const focused = useRef(false);
  const busy = useRef(false);
  const owner = getMemberSessionKey();
  const [state, setState] = useState<State>({ id: noteId, owner, note: null, loading: true, saving: false });
  const load = useCallback(async () => {
    const current = ++generation.current;
    busy.current = false;
    const active = () => focused.current && generation.current === current && owner === getMemberSessionKey();
    setState({ id: noteId, owner, note: null, loading: true, saving: false });
    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(noteId)) throw new Error('올바른 쪽지 주소가 아니에요.');
      const note = await loadNoteDetail(noteId, skipLocation ? null : requireLocation(latitude, longitude), active);
      if (active() && note) setState({ id: noteId, owner, note, loading: false, saving: false });
    } catch (error) {
      if (active()) {
        setState((previous) => ({ ...previous, loading: false }));
        showToast(`${message(error)} 닫고 다시 열어 주세요.`);
      }
    }
  }, [noteId, owner, skipLocation, latitude, longitude]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    return () => { focused.current = false; generation.current++; };
  }, [load]));

  async function toggleSaved() {
    const note = state.note;
    if (!focused.current || busy.current || !note || note.isMine || state.owner !== getMemberSessionKey()) return;
    busy.current = true;
    setState((previous) => ({ ...previous, saving: true }));
    const current = generation.current;
    const active = () => focused.current && current === generation.current && owner === getMemberSessionKey();
    try {
      let location: MapNoteLocation | null = null;
      if (!note.isSaved && skipLocation) {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!active()) return;
        if (!granted) {
          showToast('쪽지를 저장하려면 위치 권한을 허용해 주세요.');
          return;
        }
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        location = requireLocation(coords.latitude, coords.longitude);
      } else if (!note.isSaved) {
        location = requireLocation(latitude, longitude);
      }
      if (!active()) return;
      const saved = await runMemberRequest((token) => changeBookmark(noteId, !note.isSaved, location, token));
      if (owner === getMemberSessionKey()) {
        if (active()) setState((previous) => ({ ...previous, note: { ...note, isSaved: saved.isSaved } }));
        publishBookmarkChange({ owner, noteId, isSaved: saved.isSaved });
      }
    } catch {
      if (active()) {
        showToast(`${note.isSaved ? '저장 취소' : '저장'}하지 못했어요. 다시 시도해 주세요.`);
      }
    } finally {
      if (current === generation.current) busy.current = false;
      if (active()) setState((previous) => ({ ...previous, saving: false }));
    }
  }

  return { ...(state.id === noteId && state.owner === owner ? state : { note: null, loading: true, saving: false }),
    toggleSaved: () => { void toggleSaved(); } };
}

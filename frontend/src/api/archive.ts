import { apiRequest } from './client';
import type { MapNotePreview } from './types';
import { seoulDateKey } from '../utils/storage-calendar';

export type ArchiveType = 'ALL' | 'WRITTEN' | 'SAVED';
export type ArchiveDay = { date: string; writtenCount: number; savedCount: number };
export type ArchiveCalendar = { month: string; days: ArchiveDay[] };
export type ArchiveNote = {
  noteId: string;
  source: 'WRITTEN' | 'SAVED';
  preview: string | null;
  createdAt: string;
  savedAt: string | null;
  visibility: MapNotePreview['visibility'];
  color: string | null;
  placeName: string | null;
  neighborhood: string | null;
  authorCategory: 'MINE' | 'FRIEND' | 'ANONYMOUS';
  authorDisplayName: string;
  accessStatus: 'OPENABLE' | 'LOCKED' | 'LOCATION_REQUIRED';
  isSaved: boolean;
  isRead: boolean | null;
};
export type ArchivePage = { date: string; notes: ArchiveNote[]; size: number; hasNext: boolean; nextCursor: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const isCount = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isTimestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export async function getArchiveCalendar(token: string, month: string): Promise<ArchiveCalendar> {
  const result = await apiRequest<ArchiveCalendar>(`/api/v1/users/me/archive/calendar?month=${encodeURIComponent(month)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result?.month !== month || !Array.isArray(result.days)
    || result.days.some((day) => !day || typeof day.date !== 'string' || !day.date.startsWith(`${month}-`)
      || !isDate(day.date)
      || !isCount(day.writtenCount) || !isCount(day.savedCount))
    || new Set(result.days.map((day) => day.date)).size !== result.days.length) {
    throw new Error('보관함 달력을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

export async function getArchiveNotes(token: string, date: string, type: ArchiveType, cursor: string | null, size: number): Promise<ArchivePage> {
  const query = new URLSearchParams({ date, type, size: String(size) });
  if (cursor !== null) query.set('cursor', cursor);
  const result = await apiRequest<ArchivePage>(`/api/v1/users/me/archive/notes?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result?.date !== date || result.size !== size || !Array.isArray(result.notes) || result.notes.length > size
    || typeof result.hasNext !== 'boolean'
    || (result.hasNext ? typeof result.nextCursor !== 'string' || !result.nextCursor || result.nextCursor === cursor : result.nextCursor !== null)
    || result.notes.some((note) => !note || typeof note.noteId !== 'string' || !UUID.test(note.noteId)
      || !['WRITTEN', 'SAVED'].includes(note.source) || (type !== 'ALL' && note.source !== type)
      || !nullableString(note.preview) || !isTimestamp(note.createdAt)
      || seoulDateKey(new Date(note.createdAt)) !== date
      || !(note.savedAt === null || isTimestamp(note.savedAt))
      || !['PUBLIC', 'FRIENDS', 'PRIVATE'].includes(note.visibility)
      || !nullableString(note.color) || !nullableString(note.placeName) || !nullableString(note.neighborhood)
      || !['MINE', 'FRIEND', 'ANONYMOUS'].includes(note.authorCategory)
      || typeof note.authorDisplayName !== 'string' || !note.authorDisplayName.trim()
      || !['OPENABLE', 'LOCKED', 'LOCATION_REQUIRED'].includes(note.accessStatus)
      || typeof note.isSaved !== 'boolean' || !(note.isRead === null || typeof note.isRead === 'boolean'))) {
    throw new Error('보관함 쪽지 목록을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  return result;
}

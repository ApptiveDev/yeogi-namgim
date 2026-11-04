# 회원 쪽지 저장 API

관련 이슈: [#92](https://github.com/ApptiveDev/yeogi-namgim/issues/92). 회원 인증과 응답 형식은 [공통 API 계약](BACKEND_API_CONTRACT.md), 공개 범위와 150m 판정은 [회원 지도 API](MEMBER_MAP_API.md)를 따른다. 모든 요청은 회원 Access Token이 필요하며 응답은 `Cache-Control: no-store`다.

## 저장과 취소

`POST /api/v1/notes/{noteId}/bookmarks`는 타인의 쪽지를 저장한다. 본문에는 상세 열람과 같은 선택적 `latitude`, `longitude`를 보낸다. 처음 저장하는 쪽지는 현재 위치에서 공통 `NoteAccessService`가 열람 가능하다고 판정해야 한다. 최초 저장은 `201`, 중복 저장은 원래 `savedAt`을 유지하며 `200`을 반환한다. 응답 데이터는 `noteId`, `isSaved: true`, `savedAt`이다.

내 쪽지는 저장할 수 없다(`400 INVALID_REQUEST`). 현재 공개 범위에서 볼 수 없으면 `404 RESOURCE_NOT_FOUND`, 위치가 없으면 `403 LOCATION_REQUIRED`, 150m 밖이면 `403 NOTE_LOCKED`다. 이미 저장한 쪽지는 현재 공개 범위 안에서 거리 예외를 적용하지만, 친구 해제 등으로 공개 권한을 잃으면 보이지 않는다.

`DELETE /api/v1/notes/{noteId}/bookmarks`는 내 저장 관계를 삭제한다. 저장 기록이 없어도 `200`과 `isSaved: false`, `savedAt: null`을 반환한다. 취소 후 다시 열람하려면 현재 위치로 150m를 재판정한다.

## 조회와 지도 연동

`GET /api/v1/users/me/bookmarks?page=0&size=20`은 현재 공개 범위에서 볼 수 있는 저장 쪽지를 `savedAt DESC, noteId DESC`로 반환한다. `page`는 0~10000, `size`는 1~100이며 기본값은 각각 0, 20이다. 응답은 `notes`, `page`, `size`, `hasNext`다. 위치가 없어 잠긴 카드는 미리보기와 장소 정보를 반환하지 않는다.

지도 `GET /api/v1/notes`의 `isSaved`와 `SAVED` 필터는 실제 저장 데이터를 사용한다. 저장 건수는 `BookmarkQueryService.countSavedNotes()`로 조회하며, 현재 공개 범위에서 노출 가능한 기록만 센다. 지도 `isRead`는 [읽음·발견 API](DISCOVERY_API.md)의 실제 데이터로 표시한다.

Flyway `V11__create_note_bookmarks.sql`은 `(user_id, note_id)` 기본 키와 저장 시각을 둔다. 회원이나 쪽지를 삭제하면 저장 행도 삭제된다. 위치 정확도와 측정 시각의 수치 기준은 미확정이므로 임의의 제한값을 적용하지 않는다.

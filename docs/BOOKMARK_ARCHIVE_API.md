# 회원 쪽지 저장·발견·보관함 API

관련 이슈: [#90](https://github.com/ApptiveDev/yeogi-namgim/issues/90). 이 문서는 #74의 회원 지도·공통 접근 판정을 기반으로 한 작업 브랜치의 계약이다. `main` 병합 전에는 배포 완료로 간주하지 않는다. 인증·응답 형식은 [공통 API 계약](BACKEND_API_CONTRACT.md), 지도 노출·150m 판정은 [회원 지도 API](MEMBER_MAP_API.md)를 따른다.

모든 경로에 활성 회원 Access Token `Authorization: Bearer <accessToken>`이 필요하다. `AUTH_ENABLED=false`이면 새 회원 API는 등록되지 않는다. 성공은 `success/data/meta`, 오류는 `success/error/meta`이며, 모든 응답에 `Cache-Control: no-store`를 적용한다. 아래 JSON은 `data`만 보여 준다.

## 저장·저장 취소

`POST /api/v1/notes/{noteId}/bookmarks`는 쪽지를 저장한다. 아직 저장하지 않은 타인 쪽지는 현재 좌표로 `NoteAccessService`가 `OPENABLE`이라 판정해야 한다. 본문은 상세 열람 요청과 같은 선택적 위치 입력이다.

```json
{ "latitude": 35.2314, "longitude": 129.0846 }
```

- 최초 저장은 `201 Created`, 이미 저장한 쪽지의 반복 요청은 기존 `savedAt`을 유지하며 `200 OK`다.
- 응답은 `{ "noteId": "<UUID>", "isSaved": true, "savedAt": "2026-11-02T00:00:00Z" }`다.
- 내가 쓴 쪽지는 보관함에 자동 포함되므로 중복 저장하지 않으며 `400 INVALID_REQUEST`다.
- 현재 공개 범위상 볼 수 없는 쪽지와 없는 쪽지는 `404 RESOURCE_NOT_FOUND`, 위치가 필요한 미저장 쪽지는 `403 LOCATION_REQUIRED`, 150m 밖은 `403 NOTE_LOCKED`다.
- 저장했더라도 공개 범위 권한을 잃으면 거리 예외가 그 권한을 복원하지 않는다.

`DELETE /api/v1/notes/{noteId}/bookmarks`는 내 저장 관계를 삭제한다. 저장하지 않았던 ID에도 같은 `200 OK`와 `{ "noteId": "<UUID>", "isSaved": false, "savedAt": null }`을 반환한다. 저장 취소 후 타인 쪽지를 다시 열면 그 시점의 위치와 150m를 다시 검사한다. 저장 취소는 읽음 기록을 지우지 않는다.

## 저장·발견 목록

`GET /api/v1/users/me/bookmarks?page=0&size=20`은 현재 공개 범위상 노출 가능한 저장 쪽지를 `savedAt DESC, noteId DESC`로 반환한다. `GET /api/v1/users/me/discovered-notes?page=0&size=20&latitude=35&longitude=129`는 상세 열람에 성공했던 타인의 쪽지를 `lastOpenedAt DESC, noteId DESC`로 반환한다. 두 API 모두 기본 `page=0`, `size=20`, 허용 `page=0~10000`, `size=1~100`이며 `notes/page/size/hasNext`를 반환한다.

발견 목록의 위치는 생략할 수 있다. 위치가 없거나 150m 밖이고 저장하지 않은 쪽지는 목록에 `LOCATION_REQUIRED` 또는 `LOCKED`로 남지만 `preview/placeName/neighborhood`는 `null`이다. 상세 열람에는 여전히 현재 위치로 재검사가 필요하다. 현재 공개 범위에서 `HIDDEN`인 쪽지는 저장·발견 목록에서 제외한다. 목록 조회만으로 발견 기록을 만들지 않는다.

목록 카드의 필드는 `noteId/source/preview/createdAt/savedAt/firstOpenedAt/lastOpenedAt/visibility/color/placeName/neighborhood/authorCategory/accessStatus/isSaved/isRead`다. `source`는 `SAVED`, `DISCOVERED`, 보관함에서는 `WRITTEN` 중 하나다. `authorCategory`는 `MINE/FRIEND/ANONYMOUS`이고 작성자 회원 ID·닉네임은 반환하지 않는다. 잠긴 카드에는 본문·미리보기를 넣지 않는다. 오프셋 조회이므로 페이지 사이 새 기록이 생기면 경계가 이동할 수 있다.

## 상세 열람과 지도 상태

기존 `POST /api/v1/notes/{noteId}/open`이 같은 `NoteAccessService`로 현재 접근을 허용한 **뒤** `(userId, noteId)` 읽음·발견 기록을 쓰고 `isSaved/isRead`를 응답한다. `isRead`는 성공한 상세 응답에서 `true`다. 반복 열람은 한 행의 `lastOpenedAt`만 갱신하고 최초 열람 시각은 유지한다. 실패한 상세 요청, 지도·목록·미리보기 조회는 읽음 기록을 만들지 않는다.

지도 `GET /api/v1/notes`의 `isSaved/isRead`는 실제 데이터로 `true/false`를 반환한다. `SAVED` 필터는 현재 공개 범위와 화면 경계를 페이지 제한 전에 적용하고 `savedAt DESC, noteId DESC`로 정렬한다. 저장된 타인 쪽지는 현재 공개 범위 안에서 위치 없이도 열 수 있다. 읽음만 있고 저장하지 않은 쪽지는 150m 밖에서 다시 잠긴다.

## 달력·날짜별 보관함

`GET /api/v1/users/me/archive/calendar?month=2026-11`은 `{ "month": "2026-11", "days": [{ "date": "2026-11-02", "writtenCount": 1, "savedCount": 2 }] }`를 반환한다. 날짜는 **쪽지 원본의 `createdAt`을 `Asia/Seoul`로 변환**해 정한다. 저장 시각은 달력 날짜를 바꾸지 않는다. 작성 기록과 현재 노출 가능한 저장 기록을 별도로 세며, 기록 없는 날짜는 `days`에 넣지 않는다.

`GET /api/v1/users/me/archive/notes?date=2026-11-02&type=ALL&page=0&size=20`은 해당 날짜의 카드를 `createdAt DESC, noteId DESC`로 반환한다. 기본 `type=ALL`, `page=0`, `size=20`; 허용 범위는 위 목록과 같다. `type`은 `ALL/WRITTEN/SAVED`다. `WRITTEN`에는 `writtenVisibility=ALL/PUBLIC/FRIENDS/PRIVATE`, `SAVED`에는 `savedCategory=ALL/FRIEND/ANONYMOUS`를 추가할 수 있다. `ALL`과 하위 필터를 함께 보내거나 다른 유형의 하위 필터를 보내면 `400 INVALID_REQUEST`다.

저장 분류의 `FRIEND/ANONYMOUS`는 **조회 시점의 현재 친구 관계**로 계산한다. 친구가 해제되면 공개 쪽지는 `ANONYMOUS`로 옮겨지고, 더 이상 볼 수 없는 `FRIENDS` 쪽지는 목록과 달력에서 빠진다. 내 쪽지는 저장 테이블 없이 작성자 조건으로 `WRITTEN`에 포함한다.

## 데이터·검증·남은 범위

Flyway `V11__create_note_bookmarks_and_discoveries.sql`이 저장·읽음 테이블을 추가한다. `(user_id, note_id)`를 각 테이블의 기본 키로 두고 회원·쪽지 삭제 시 연관 행을 정리한다. 저장·열람은 트랜잭션으로 처리한다. 저장 수는 `BookmarkQueryService.countSavedNotes()`가 **현재 노출 가능한 저장 건수**를 반환하므로 [마이 통계 PR #80](https://github.com/ApptiveDev/yeogi-namgim/pull/80)의 `GET /api/v1/users/me/stats`가 이 서비스를 주입하면 `savedCount`가 연결된다.

PostgreSQL/PostGIS 통합 테스트는 최초·반복 저장, 150m 거절과 저장 거리 예외, 저장 취소 후 재잠금, 읽음 기록과 이동 후 재잠금, 지도 상태, 달력 날짜, 현재 친구 기준 분류, 인증·필터 오류를 확인한다. 위치 정확도 상한·측정 유효 시간·미래 시각 허용 오차는 아직 확정되지 않아 형식 검증만 적용한다. 회원 알림·푸시와 탈퇴 API는 이 작업에 포함하지 않는다.

# 회원 쪽지 읽음·발견 API

관련 이슈: [#93](https://github.com/ApptiveDev/yeogi-namgim/issues/93). 모든 경로는 회원 Access Token이 필요하다. 인증과 응답 형식은 [공통 API 계약](BACKEND_API_CONTRACT.md), 공개 범위·150m 판정은 [회원 지도 API](MEMBER_MAP_API.md)를 따른다.

기존 `POST /api/v1/notes/{noteId}/open`이 상세 열람에 성공한 뒤 `(userId, noteId)` 읽음 기록을 저장한다. 처음 열람한 `firstOpenedAt`은 유지하고 반복 열람 시 `lastOpenedAt`만 갱신한다. 상세 응답의 `isRead`는 `true`, `isSaved`는 실제 저장 여부다. 실패한 상세 요청과 지도·목록 조회는 읽음 기록을 만들지 않는다.

`GET /api/v1/users/me/discovered-notes?page=0&size=20&latitude=35&longitude=129`는 발견 쪽지를 `lastOpenedAt DESC, noteId DESC`로 반환한다. 기본 `page=0`, `size=20`; 허용 `page=0~10000`, `size=1~100`이다. 위치는 생략할 수 있다. 현재 공개 범위에서 볼 수 없는 쪽지는 제외하고, 위치가 없거나 150m 밖인 미저장 쪽지는 카드에 남되 미리보기와 장소 정보는 감춘다. 상세 재진입은 언제나 현재 위치로 다시 검사한다. 저장한 쪽지의 거리 예외는 [저장 API](BOOKMARK_API.md)를 따른다.

지도 `GET /api/v1/notes`의 `isRead`는 실제 발견 기록을 조회한다. 읽음만으로 거리 예외가 생기지 않는다. Flyway `V12__create_note_discoveries.sql`은 회원·쪽지별 최초/최근 열람 시각을 저장하며, 회원이나 쪽지를 삭제하면 연관 행도 삭제한다. 위치 정확도와 측정 시각의 수치 기준은 아직 확정되지 않았다.

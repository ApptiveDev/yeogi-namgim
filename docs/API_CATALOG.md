# 백엔드 A/B 회원 API 개발 체크리스트

- [실시간 진행 체크리스트: 이슈 #87](https://github.com/ApptiveDev/yeogi-namgim/issues/87)
- 문서 작업: [이슈 #85](https://github.com/ApptiveDev/yeogi-namgim/issues/85)
- 마지막 확인: 2026-11-02, `main`의 `40b088e`와 아래 열린 PR 기준
- 참고: 2차 세미나 와이어프레임·10/09 회의 기반 백엔드 작업 계획

이 문서는 **담당 A와 B의 API 작업 범위**를 체크리스트로 관리한다. `[x]`는 `main`에 병합된 백엔드 작업, `[ ]`는 열린 PR 또는 후속 작업이다. 프론트 연동 완료 여부는 별도로 확인한다.

**자동 진행률은 이슈 #87에서 확인한다.** 저장소의 Markdown 파일은 PR 상태에 따라 스스로 바뀌지 않는다. 작업 PR이 `Closes #이슈번호`로 연결되고 `main`에 **병합**되면 작업 이슈가 닫히고, 이슈 #87의 해당 체크박스가 자동으로 완료된다. 병합 없이 PR만 닫힌 경우는 완료로 세지 않는다. 이 파일은 API 경로·담당·계약을 설명하며, PR 병합 후 상태를 수동으로 갱신한다.

## 공통 API 원칙

- 앱 API 경로의 접두사는 `/api/v1`이다. 회원 API는 `Authorization: Bearer <accessToken>`으로 인증한다. 세션·재발급 규칙은 [이메일 인증 API](EMAIL_AUTH_API.md)와 [토큰 세션 API](TOKEN_SESSION_API.md)를 따른다.
- 성공 응답은 `success/data/meta`, 오류 응답은 `success/error/meta` 형식이다.
- 타인의 **접근 가능한 미저장 쪽지**는 **150m 이하**에서 열람한다. 본인 쪽지의 거리 예외와 지도 마커 노출·본문 열람의 구분을 유지한다. 150m 적용은 [PR #74](https://github.com/ApptiveDev/yeogi-namgim/pull/74)에 있으며 아직 `main`에 병합되지 않았다.
- 기존 상세 열람 경로는 `POST /api/v1/notes/{noteId}/open`이다. 제공된 계획안의 다른 메서드·경로는 확정된 구현으로 취급하지 않는다.
- 아래의 **계획** 항목은 요청·응답 및 권한 계약이 확정되기 전까지 앱에서 호출하지 않는다.

## 백엔드 A — 인증·회원·친구·쪽지 작성·지도

### 공통 기반과 인증

- [x] 공통 응답·회원 ID·API 계약 정리 — [#49](https://github.com/ApptiveDev/yeogi-namgim/issues/49), [공통 API 계약](BACKEND_API_CONTRACT.md)
- [x] 이메일 인증·회원가입·로그인: `POST /api/v1/auth/email-verifications`, `POST /api/v1/auth/email-verifications/confirm`, `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` — [#51](https://github.com/ApptiveDev/yeogi-namgim/issues/51), [상세 문서](EMAIL_AUTH_API.md)
- [x] 토큰 재발급·로그아웃: `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` — [#53](https://github.com/ApptiveDev/yeogi-namgim/issues/53), [상세 문서](TOKEN_SESSION_API.md)
- [x] 내 프로필 조회: `GET /api/v1/users/me` — [#51](https://github.com/ApptiveDev/yeogi-namgim/issues/51)

### 쪽지 작성·지도·친구

- [x] 회원 쪽지 작성·내 쪽지 목록: `POST /api/v1/notes`, `GET /api/v1/users/me/notes` — [#55](https://github.com/ApptiveDev/yeogi-namgim/issues/55), [상세 문서](MEMBER_NOTE_API.md)
- [x] 회원 지도 범위 조회·필터: `GET /api/v1/notes` — [#59](https://github.com/ApptiveDev/yeogi-namgim/issues/59), [공통 API 계약](BACKEND_API_CONTRACT.md)
- [x] 일회용 친구 초대·확인·수락·목록: `POST /api/v1/friends/invitations`, `GET /api/v1/friends/invitations/{code}`, `POST /api/v1/friends/invitations/{code}/accept`, `GET /api/v1/friends` — [#57](https://github.com/ApptiveDev/yeogi-namgim/issues/57), [상세 문서](FRIEND_API.md)
- [x] 친구 쪽지 소식: `GET /api/v1/friends/activities` — [#82](https://github.com/ApptiveDev/yeogi-namgim/issues/82), [상세 문서](FRIEND_API.md#친구-쪽지-소식)
- [ ] 친구 관계 해제: `DELETE /api/v1/friends/{friendId}` — **계획**, 관계 해제 후 저장본 접근 정책 확정 필요

### 마이 탭과 계정

- [ ] 내 프로필 닉네임 수정: `PATCH /api/v1/users/me` — [#81](https://github.com/ApptiveDev/yeogi-namgim/issues/81), [PR #83](https://github.com/ApptiveDev/yeogi-namgim/pull/83)
- [ ] 작성 쪽지·친구·저장 수: `GET /api/v1/users/me/stats` — [#79](https://github.com/ApptiveDev/yeogi-namgim/issues/79), [PR #80](https://github.com/ApptiveDev/yeogi-namgim/pull/80). 저장 수 조회 서비스가 없으면 응답값은 `null`이다.
- [ ] 카카오 로그인: `POST /api/v1/auth/kakao` — **PR 작업 중**, #102
- [ ] 기존 계정의 카카오 연결: `POST /api/v1/users/me/auth-accounts/kakao` — **PR 작업 중**, #102
- [ ] 회원 탈퇴: `DELETE /api/v1/users/me` — **PR 작업 중**, #103. 작성 쪽지는 익명으로 보존한다.

## 백엔드 B — 열람·위치·저장·보관함·알림

### 열람과 위치 판정

- [x] 내 쪽지의 거리 예외와 상세 열람: `POST /api/v1/notes/{noteId}/open` — [#55](https://github.com/ApptiveDev/yeogi-namgim/issues/55), [상세 문서](MEMBER_NOTE_API.md)
- [x] 회원 지도·상세의 공개 범위와 접근 상태 연결 — [#59](https://github.com/ApptiveDev/yeogi-namgim/issues/59)
- [ ] 회원 전용 요청과 타인 미저장 쪽지의 **150m 이하** 판정 — [#73](https://github.com/ApptiveDev/yeogi-namgim/issues/73), [PR #74](https://github.com/ApptiveDev/yeogi-namgim/pull/74)
- [ ] 위치 정확도·측정 시각 허용 기준 — **계획**, 기준 확정 후 입력·열람 검증에 적용

### 저장·발견·지도 상태

- [ ] 쪽지 저장·취소: `POST /api/v1/notes/{noteId}/bookmarks`, `DELETE /api/v1/notes/{noteId}/bookmarks` — **계획**
- [ ] 저장한 쪽지 목록: `GET /api/v1/users/me/bookmarks` — **계획**
- [ ] 발견·읽음 기록 목록: `GET /api/v1/users/me/discovered-notes` — **계획**
- [ ] 지도 조회의 저장·읽음 상태 일괄 제공 및 저장 쪽지 거리 예외 — **계획**

### 보관함·통계·알림

- [x] 달력형 보관함 날짜: `GET /api/v1/users/me/archive/calendar` — #94, PR #97 병합 완료. [보관함 계약](ARCHIVE_API.md), 프론트 연동 작업 #131.
- [x] 날짜·유형별 보관함 목록: `GET /api/v1/users/me/archive/notes` — #94, PR #97 병합 완료. 프론트는 `ALL` 목록을 전체·저장·내 노트에 공유하며 친구 노트 연동은 후속이다.
- [ ] 저장 쪽지 수 조회 서비스를 마이 탭 통계에 연결 — **계획**, A의 `GET /api/v1/users/me/stats`와 연동
- [ ] 회원 알림·푸시 정책 및 API — **계획**, 기획과 인증·공개 범위 계약 확정 후 경로 결정
- [ ] 탈퇴 시 저장·발견·알림 데이터 정리 — **계획**, A의 회원 탈퇴 API와 함께 검증

## 서버 지도 클러스터 추가 작업

- `GET /api/v1/notes/clusters`: 2026-11-03 요청에 따른 백엔드 구현. 화면 범위의 노출 가능한 쪽지를 전부 집계해 대표 좌표·개수·전체 수를 반환한다. 1만 개 제한은 없다. `ALL/FRIENDS/MINE` 지원, `SAVED` 집계 소스는 후속 연결 대상이다. 프론트 연동·배포·main 병합 완료를 뜻하지 않는다. [요청·응답과 연결 방법](MEMBER_MAP_API.md#서버-클러스터-조회--2026-11-03).

## 아직 확정하지 않은 API

물방울별 쪽지 목록, `GET /health`, `GET /app-config`는 제공된 작업 계획의 **제안**이다. 구현 여부·경로·담당을 확정하기 전에는 체크리스트의 완료 항목으로 올리지 않는다. 친구 필터의 공개 쪽지 포함, 친구 관계 변경 후 저장본 접근, 보관함 분류, 카카오 계정 연결 방식도 해당 기능 이슈에서 결정한다.

## 갱신 방법

1. 기능별 이슈를 만들고 이슈 #87의 A 또는 B 체크리스트에 연결한다.
2. PR 본문에 `Closes #이슈번호`를 적어 `main` 병합 시 작업 이슈가 닫히도록 한다.
3. 병합 후 실제 컨트롤러·테스트·도메인별 상세 문서를 확인하고 이 파일의 체크박스와 API 계약을 갱신한다.

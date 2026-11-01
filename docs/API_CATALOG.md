# 회원 API 목록 및 개발 현황

- 관련 이슈: [#85](https://github.com/ApptiveDev/yeogi-namgim/issues/85)
- 마지막 확인: 2026-11-02, `main`의 `40b088e` 및 아래 PR 기준
- 참고: 2차 세미나 와이어프레임·10/09 회의 기반 백엔드 작업 계획, [공통 API 계약](BACKEND_API_CONTRACT.md)

이 문서는 회원 앱에서 사용할 백엔드 API의 **경로, 담당, 구현 상태**를 관리한다. 요청·응답 필드와 오류 코드는 연결된 도메인 문서와 구현 코드를 확인한다. `main` 구현은 백엔드 코드에 경로가 있다는 뜻이며 프론트 연동 완료를 뜻하지 않는다.

| 상태 | 의미 |
| --- | --- |
| `main` | `main`에 병합된 백엔드 경로 |
| `PR` | 구현 PR이 열려 있으며 아직 `main`에 병합되지 않음 |
| `계획` | 작업 계획에 있으나 구현 경로가 확인되지 않음 |
| `제안` | 필요성과 HTTP 계약을 확정해야 함 |

담당 A는 인증·회원·친구·쪽지 작성·지도, 담당 B는 열람·위치·저장·보관함·알림을 맡는 작업 계획상의 구분이다. 실제 담당자와 일정은 각 이슈에서 정한다.

## 공통 계약

- 앱 API는 `/api/v1` 접두사를 사용한다. 회원 기능은 `Authorization: Bearer <accessToken>`으로 인증하며, 인증·재발급·로그아웃의 구체적인 요청 조건은 [이메일 인증 API](EMAIL_AUTH_API.md)와 [토큰 세션 API](TOKEN_SESSION_API.md)를 따른다.
- 성공 응답은 `success/data/meta`, 오류 응답은 `success/error/meta` 형식을 사용한다.
- 타인의 **접근 가능한 미저장 쪽지** 열람 거리는 **150m 이하**로 한다. 본인 쪽지는 거리 제한 없이 열람한다. 이 변경은 [PR #74](https://github.com/ApptiveDev/yeogi-namgim/pull/74)에 있으며, 병합 전 `main`의 동작과 구분한다. 지도에 마커가 보이는 것과 본문을 열 수 있는 것은 별개다.
- 저장 쪽지의 거리 예외, 공개 범위, 친구 관계는 접근 권한을 확인한 뒤 적용한다. 저장 기능 자체의 구현 상태는 아래 `계획` 표를 따른다.
- 기존 쪽지 상세 경로는 `POST /api/v1/notes/{noteId}/open`이다. 계획안의 다른 HTTP 메서드나 경로를 구현 완료로 표시하지 않는다.

## `main`에 구현된 API

| 담당 | 메서드·경로 | 용도 | 상세 문서 |
| --- | --- | --- | --- |
| A | `POST /api/v1/auth/email-verifications` | 이메일 인증 코드 요청 | [이메일 인증](EMAIL_AUTH_API.md) |
| A | `POST /api/v1/auth/email-verifications/confirm` | 인증 코드 확인 | [이메일 인증](EMAIL_AUTH_API.md) |
| A | `POST /api/v1/auth/signup` | 회원가입 | [이메일 인증](EMAIL_AUTH_API.md) |
| A | `POST /api/v1/auth/login` | 로그인 | [이메일 인증](EMAIL_AUTH_API.md) |
| A | `POST /api/v1/auth/refresh` | 토큰 재발급 | [토큰 세션](TOKEN_SESSION_API.md) |
| A | `POST /api/v1/auth/logout` | 로그아웃 | [토큰 세션](TOKEN_SESSION_API.md) |
| A | `GET /api/v1/users/me` | 내 프로필 조회 | [이메일 인증](EMAIL_AUTH_API.md) |
| A | `POST /api/v1/notes` | 회원 쪽지 작성 | [회원 쪽지](MEMBER_NOTE_API.md) |
| A | `GET /api/v1/users/me/notes` | 내가 작성한 쪽지 조회 | [회원 쪽지](MEMBER_NOTE_API.md) |
| A·B | `GET /api/v1/notes` | 지도 영역의 쪽지 조회 | [공통 API 계약](BACKEND_API_CONTRACT.md) |
| B | `POST /api/v1/notes/{noteId}/open` | 쪽지 상세 열람과 권한 판정 | [회원 쪽지](MEMBER_NOTE_API.md) |
| A | `POST /api/v1/friends/invitations` | 친구 초대 코드 생성 | [친구 API](FRIEND_API.md) |
| A | `GET /api/v1/friends/invitations/{code}` | 초대 코드 확인 | [친구 API](FRIEND_API.md) |
| A | `POST /api/v1/friends/invitations/{code}/accept` | 초대 수락 | [친구 API](FRIEND_API.md) |
| A | `GET /api/v1/friends` | 친구 목록 | [친구 API](FRIEND_API.md) |

회원 인증을 사용하는 경로는 배포 설정에서 `AUTH_ENABLED=true`가 필요하다. 이 표의 쪽지·지도·열람 경로는 회원 요청을 처리하는 기능을 기준으로 적었으며, **회원 전용 전환과 150m 적용은 아직 PR #74 단계**다.

## 열린 PR에서 구현 중인 API·정책

| 담당 | 메서드·경로 또는 정책 | 상태 | 확인할 점 |
| --- | --- | --- | --- |
| A·B | 회원 전용 쪽지·지도·열람 및 150m 판정 | [PR #74](https://github.com/ApptiveDev/yeogi-namgim/pull/74) | 프론트 회원 세션·지도 반경 표시 연동 필요 |
| A·B | `GET /api/v1/users/me/stats` | [PR #80](https://github.com/ApptiveDev/yeogi-namgim/pull/80) | 작성·친구 수 조회. 저장 수는 조회 서비스 연결 전 `null` |
| A | `PATCH /api/v1/users/me` | [PR #83](https://github.com/ApptiveDev/yeogi-namgim/pull/83) | 현재 범위는 닉네임 수정 |
| A | `GET /api/v1/friends/activities` | [PR #84](https://github.com/ApptiveDev/yeogi-namgim/pull/84) | 친구 공개 쪽지의 작성 소식. 본문은 반환하지 않음 |

PR이 병합되면 해당 행을 `main` 표로 옮기고 경로·응답·상세 문서를 다시 확인한다. PR 제목이나 계획만으로 완료 처리하지 않는다.

## 후속 구현 계획

아래 경로는 제공된 작업 계획을 정리한 **예정안**이다. 구현 이슈에서 요청·응답과 권한을 확정하기 전에는 앱에서 호출하지 않는다.

| 담당 | 메서드·경로 | 목적·남은 계약 |
| --- | --- | --- |
| B | `POST /api/v1/notes/{noteId}/bookmarks` | 접근 권한 확인 후 쪽지 저장 |
| B | `DELETE /api/v1/notes/{noteId}/bookmarks` | 저장 취소, 원본 쪽지 유지 |
| B | `GET /api/v1/users/me/bookmarks` | 저장한 쪽지 목록 |
| B | `GET /api/v1/users/me/discovered-notes` | 발견·읽음 기록 조회 |
| B | `GET /api/v1/users/me/archive/calendar` | 월별 작성·저장 기록 날짜 |
| B | `GET /api/v1/users/me/archive/notes` | 날짜·유형·공개 범위별 보관함 카드 |
| A | `DELETE /api/v1/friends/{friendId}` | 친구 관계 해제 및 저장본 접근 정책 결정 |
| A | `POST /api/v1/auth/kakao` | 카카오 로그인 |
| A | `POST /api/v1/users/me/auth-accounts/kakao` | 기존 계정에 카카오 연결. 경로는 제안 단계 |
| A·B | `DELETE /api/v1/users/me` | 회원 탈퇴와 연관 데이터 처리 정책 확정 |

회원 알림·푸시, 지도 클러스터, 물방울별 목록은 필요성과 HTTP 계약이 확정되기 전까지 `제안`으로 관리한다. `GET /health`, `GET /app-config`도 공통 기반 작업 계획의 제안이며 현재 구현된 필수 API로 간주하지 않는다.

## API 계약을 확정할 때 남은 결정

- 지도 클러스터 계산 위치, 물방울 하나를 선택했을 때의 이동·열람 동작
- 위치 정확도·측정 시각의 허용 기준과 위치 권한이 없는 지도 탐색 범위
- 친구 필터의 전체 공개 쪽지 포함 여부, 친구 해제 후 저장본 접근 권한
- 보관함의 친구·익명 분류 기준, 저장 취소·원본 삭제 시 기록 처리
- 카카오 로그인과 기존 이메일 계정 연결 방식, 회원 탈퇴 시 작성 쪽지 처리
- 페이지네이션 방식과 응답 필드. 특히 [PR #84](https://github.com/ApptiveDev/yeogi-namgim/pull/84)의 실제 경로·페이지 방식은 초기 작업 계획의 제안과 다르므로 구현 계약을 기준으로 연동한다.

## 갱신 규칙

1. API 이슈와 PR에서 담당·메서드·경로·인증·요청·응답·오류·페이지네이션을 확인한다.
2. `main`에 병합한 후 실제 컨트롤러와 테스트를 확인하고 이 문서의 상태를 변경한다.
3. API의 필드나 동작이 바뀌면 도메인별 상세 문서와 프론트 호출부를 함께 갱신한다. 작성 시점의 계획 문서와 현재 구현이 다르면 현재 구현을 우선 확인한다.

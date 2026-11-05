# 마이페이지 프로필·통계 API

## 내 프로필 — 기존 API 유지

`GET /api/v1/users/me`는 `userId`, `email`, `nickname`, `createdAt`을 반환한다.
기존 응답을 변경하지 않는다. 상세 인증 규칙은 [이메일 인증 API](EMAIL_AUTH_API.md)와 [토큰 세션 API](TOKEN_SESSION_API.md)를 따른다.

## 내 통계

`GET /api/v1/users/me/stats`

- `Authorization: Bearer <accessToken>` 필수. 활성 회원 세션에서 사용자 ID를 결정한다.
- 비회원 토큰·Refresh Token·폐기된 세션·인증 누락은 `401 UNAUTHORIZED`다.
- 요청에 사용자 ID나 현재 위치를 전달할 필요가 없다. 임의의 `userId` 쿼리로 다른 사람의 통계를 조회할 수 없다.
- `Cache-Control: no-store`. `auth.enabled=true`일 때 제공한다.

```json
{
  "data": {
    "writtenNoteCount": 12,
    "friendCount": 3,
    "savedNoteCount": null
  }
}
```

위 예시는 응답의 `data` 부분만 보여준다. 실제 응답에는 공통 `success: true`와 `meta`도 포함된다.

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| writtenNoteCount | long | 본인이 작성한 회원 쪽지 수. PUBLIC/FRIENDS/PRIVATE 모두 포함하며 지도 영역·거리와 무관하다. 다른 회원·비회원의 쪽지는 제외한다. |
| friendCount | long | 기존 FriendshipQueryService.countFriends로 조회한 현재 친구 수 |
| savedNoteCount | Long 또는 null | BookmarkQueryService.countSavedNotes의 결과. 구현 Bean이 없을 때만 null이다. 연결된 소스가 반환한 0은 실제 0건이다. |

저장 소스의 조회 실패는 정상 응답의 0이나 null로 숨기지 않고 오류로 전파한다. 저장 쪽지의 집계 정책은 저장 담당 서비스가 관리하며, 여기서 저장 테이블을 직접 조회하거나 내 작성 수를 저장 수에 합산하지 않는다.

## 프론트 연결

- 기존 프로필의 `nickname` → 마이페이지 `displayName`
- `writtenNoteCount` → 작성한 노트 수
- `savedNoteCount` → 저장한 노트 수. `null`은 `—`, 실제 0건은 `0`으로 표시한다.
- 발견 수는 읽음/발견 담당의 집계 계약이 아직 없어서 이번 응답에 포함하지 않는다. 작성 수+저장 수로 계산하지 않는다.
- 프로필 이미지·태그·한 줄 소개·로그인 유형, 프로필 편집과 친구 소식은 이번에 추가하지 않는다.
- 이번 PR은 백엔드만 변경하며 프론트 API 호출 연결은 별도다.

### 프론트 연동 현황 — 이슈 #105

- 마이페이지와 설정은 회원 Access Token으로 `GET /api/v1/users/me`를 조회한다. 목업 설정과 관계없이 실제 회원 프로필을 표시하며, 화면으로 돌아오면 다시 조회한다.
- 같은 로그인에서 진행 중인 프로필·통계 조회가 겹치면 각각 하나의 요청을 공유한다. 닉네임 저장 이후에는 새 프로필 조회를 시작한다.
- 설정의 편집 버튼에서 닉네임을 수정한다. 성공 후 설정과 마이페이지를 다시 열면 저장된 이름을 조회한다. 이미지·태그·한 줄 소개·로그인 유형은 서버가 제공하지 않으므로 목업 값으로 채우지 않는다.
- 마이페이지는 `GET /api/v1/users/me/stats`의 작성 수를 표시한다. 저장 수의 null과 발견 수 미지원을 `—`로 표시하고, 실제 0은 `0`으로 유지한다. 친구 수는 응답에 있으나 현재 마이페이지 통계 영역에는 추가하지 않는다.
- 작성 수를 누르면 `GET /api/v1/users/me/notes`의 페이지 목록을 조회한다. 전체 기간 최신순이며, 달력형 보관함 API와 구분한다. 후속 페이지 실패 시 이미 받은 쪽지는 유지하고 같은 페이지를 재시도한다.
- 프로필·통계·쪽지 목록의 로딩, 오류, 재시도를 제공한다. 401 요청은 세션의 단일 재발급 결과를 공유하고 한 번 재시도한다. 폐기된 세션은 로그인으로 돌아가며, 이전 로그인에서 진행 중이던 응답을 새 계정에 반영하지 않는다.
- 저장·발견·회원 알림·탈퇴 API와 기존 보관함·친구 화면의 API 연동은 이번 작업에 포함하지 않는다.

프론트 검사는 `npm run lint`, `npx tsc --noEmit`, `npm run test:member`, `npm run test:auth`를 사용한다. 자동 연동 테스트는 실제 API 클라이언트와 세션 코드를 실행하고 HTTP 응답·기기 보관소만 대체한다. 실기기·운영 API 검증은 별도로 수행한다.

## 구현·검증 범위

DB 마이그레이션이나 저장/읽음 테이블 변경 없이 기존 작성자 조건의 count 쿼리와 친구·저장 공통 조회 인터페이스를 재사용한다.
테스트는 회원별 집계 격리, 모든 공개 범위, 빈 집계, 비회원 쪽지 제외, 인증 거부, 기존 프로필 응답, 저장 소스 미연결/0건/큰 수/실패를 확인한다.

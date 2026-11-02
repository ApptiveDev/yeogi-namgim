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
- `writtenNoteCount` → `noteCounts.written`
- `savedNoteCount` → `noteCounts.saved`. null일 때는 ‘집계 준비 중’ 등의 미연결 상태로 표시한다. 기존 목업/빈 값 변환에서 0으로 치환하면 실제 0건과 구분할 수 없으므로 연동 시 수정이 필요하다.
- 발견 수는 읽음/발견 담당의 집계 계약이 아직 없어서 이번 응답에 포함하지 않는다. 작성 수+저장 수로 계산하지 않는다.
- 프로필 이미지·태그·한 줄 소개·로그인 유형, 프로필 편집과 친구 소식은 이번에 추가하지 않는다.
- 이번 PR은 백엔드만 변경하며 프론트 API 호출 연결은 별도다.

## 구현·검증 범위

DB 마이그레이션이나 저장/읽음 테이블 변경 없이 기존 작성자 조건의 count 쿼리와 친구·저장 공통 조회 인터페이스를 재사용한다.
테스트는 회원별 집계 격리, 모든 공개 범위, 빈 집계, 비회원 쪽지 제외, 인증 거부, 기존 프로필 응답, 저장 소스 미연결/0건/큰 수/실패를 확인한다.

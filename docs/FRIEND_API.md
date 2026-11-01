# 친구 초대·친구 관계 API

관련 이슈: [#57](https://github.com/ApptiveDev/yeogi-namgim/issues/57). 기준은 기획자의 2차 세미나 개발 안내 §5-1·§5-4와 [공통 API 계약](BACKEND_API_CONTRACT.md)이다.

## 구현 범위와 인증

일회용 초대 생성 → 수락 전 초대 확인 → `친구 되기` → 양쪽 친구 목록 반영을 제공한다. 별도 요청 승인 과정이나 고정 개인 코드는 없다. 코드 확인만으로는 친구가 되거나 초대가 소비되지 않는다.

모든 경로에 `Authorization: Bearer <회원 accessToken>`이 필요하다. 비회원·refresh token·만료·로그아웃한 세션은 `401 UNAUTHORIZED`다. `AUTH_ENABLED=false`이면 친구 HTTP API를 등록하지 않는다. 회원 설정과 로그인은 [이메일 인증](EMAIL_AUTH_API.md) 및 [토큰 세션](TOKEN_SESSION_API.md)을 따른다.

성공은 `success/data/meta`, 오류는 `success/error/meta` 형식을 유지한다. 모든 친구 응답에는 `Cache-Control: no-store`를 적용한다. 아래 JSON은 `data` 부분이다.

## 1. 일회용 초대 생성

`POST /api/v1/friends/invitations`를 본문 없이 호출한다.

```json
{
  "code": "ABCDEFGHJKLM2345",
  "expiresAt": "2026-10-28T10:00:00Z"
}
```

`201 Created`를 반환한다. 코드는 임의 영문 대문자·숫자 16자리이며 혼동하기 쉬운 `I/O/0/1`을 제외한다. 앞뒤 공백을 제거하고 영문 소문자 입력도 허용한다. 내부 공백·하이픈은 허용하지 않는다. DB에는 SHA-256 해시만 저장한다. 원문은 생성 응답에서만 제공하고 DTO의 `toString()`에서도 가린다.

기본 만료 시간은 생성 후 **24시간**이다. 아직 기획 확정값이 아니며 `FRIEND_INVITATION_TTL`로 변경한다. 허용 설정 범위는 `1m`~`7d`다. 새 코드를 발급해도 이전의 미사용 코드는 기존 만료 시각까지 유지되며, 한 코드는 한 사람만 수락할 수 있다. 다른 사람을 초대하려면 새 코드를 발급한다.

카카오톡 공유와 앱 진입 주소·딥링크는 프론트 담당이다. 서버가 아직 정하지 않은 도메인이나 링크를 임의로 만들지 않으며, 프론트가 `code`를 공유할 주소에 연결한다. 공유 링크에 진입한 사용자는 로그인 후 아래 확인·수락 API를 사용한다. 실제 카카오톡 공유·앱 재진입은 프론트 통합 검증 대상이다.

## 2. 수락 전 초대 확인

`GET /api/v1/friends/invitations/{code}`

```json
{
  "inviterNickname": "초대한친구",
  "expiresAt": "2026-10-28T10:00:00Z"
}
```

`200 OK`이며 초대한 사람의 닉네임과 만료 시각만 제공한다. 이메일·회원 UUID는 제공하지 않는다. 같은 코드를 여러 번 확인해도 초대를 소비하거나 관계를 만들지 않는다. 본인 초대는 400, 이미 친구인 상대의 미사용 초대는 409다. 확인 후에도 만료·사용 상태가 달라질 수 있으므로 수락 요청에서 다시 검증한다.

## 3. 친구 되기

`POST /api/v1/friends/invitations/{code}/accept`를 본문 없이 호출한다.

```json
{
  "friendId": "11111111-1111-4111-8111-111111111111",
  "nickname": "초대한친구",
  "friendedAt": "2026-10-27T10:00:00Z"
}
```

`200 OK`이며 수락한 회원 기준 상대방을 반환한다. 초대 행을 잠근 뒤 현재 시각·사용 여부·본인 여부를 검증하고, 한 트랜잭션에서 상호 관계 생성과 초대 소비를 처리한다. 코드 재사용은 같은 사람이 시도해도 거절한다.

- 같은 코드를 여러 사람이 동시에 수락하면 한 사람만 성공한다.
- 다른 코드 또는 서로의 코드로 같은 두 사람이 동시에 수락해도 관계는 한 건만 생성된다. 나머지는 `409 FRIEND_ALREADY_EXISTS`다.
- 자기 초대·중복 관계로 실패한 경우에는 초대를 소비하지 않는다. 유효한 다른 사용자가 나중에 수락할 수 있다.
- 친구 관계는 `(user_low, user_high)` 한 건으로 저장하고 양쪽에서 동일하게 조회한다. UUID 순서는 PostgreSQL에서 정해 Java의 부호 있는 UUID 비교 차이를 피한다.

## 4. 친구 목록

`GET /api/v1/friends?page=0&size=20`

```json
{
  "friends": [
    {
      "friendId": "11111111-1111-4111-8111-111111111111",
      "nickname": "초대한친구",
      "friendedAt": "2026-10-27T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "hasNext": false
}
```

기본 `page=0`, `size=20`, 허용 범위 `page=0~10000`, `size=1~100`이다. 친구가 된 시각 내림차순, 동률이면 상대 UUID 내림차순이다. 친구가 없으면 빈 `friends`와 `hasNext=false`를 반환한다. 요청 회원의 친구만 조회하며 이메일은 노출하지 않는다. 페이지 사이 새 관계가 생기면 오프셋 경계가 바뀔 수 있다.

## 5. 공통 조회·인계

지도·열람 담당은 `com.yeoginamgim.friend.service.FriendshipQueryService`를 주입한다.

```java
Set<UUID> findFriendIds(UUID userId, Set<UUID> candidateUserIds);
long countFriends(UUID userId);
```

`findFriendIds`는 후보 중 현재 친구인 UUID만 한 번에 반환한다. 빈 입력은 빈 결과이며 DB 오류를 정상적인 빈 결과로 바꾸지 않는다. `countFriends`는 프로필 활동 통계를 조립할 때 사용한다. 이 내부 계약은 신뢰하는 서버 코드에서 사용하며, HTTP 요청의 사용자 ID를 그대로 넣지 않는다.

V9가 `app.friend_invitations`와 `app.friendships`를 추가한다. 기존 V1~V8과 쪽지 데이터는 변경하지 않는다. 친구·초대의 회원 외래 키는 회원 삭제 시 함께 정리한다. 실제 회원 탈퇴 API와 작성 쪽지 보존 정책은 후속 작업이다. 지도 인덱스에 V10을 사용했으므로 다음 마이그레이션은 최신 병합 번호를 확인하고 V11부터 배정한다.

회원 지도 필터와 공통 친구·공개 범위·거리 판정은 [회원 지도 API](MEMBER_MAP_API.md)에 연결했다. 친구 소식·실제 저장·읽음·친구 삭제 정책은 후속 범위다. 친구 관계만으로 거리 조건을 무시하지 않는다.

## 6. 오류·제한·검증

| 상태·코드 | 의미 |
| --- | --- |
| `400 INVALID_REQUEST` | 잘못된 페이지·크기 |
| `400 FRIEND_INVITATION_INVALID` | 형식 오류·없는 코드·만료·이미 사용한 코드 |
| `400 FRIEND_SELF_INVITATION` | 본인 초대 확인·수락 |
| `401 UNAUTHORIZED` | 유효한 회원 인증 없음 |
| `409 FRIEND_ALREADY_EXISTS` | 이미 친구인 상대의 미사용 초대 확인·수락 |
| `429 TOO_MANY_REQUESTS` | 초대 생성·확인·수락 요청 제한 초과 |

회원당 분당 생성 10회, 확인 30회, 수락 30회로 각각 제한한다. 기존 단일 서버 메모리 제한기를 사용한다.

PostgreSQL·PostGIS DB를 실행한 `backend/`에서 `./gradlew test --tests 'com.yeoginamgim.friend.*'`와 `./gradlew build`로 확인한다. 실제 DB에서 양방향 관계·목록·후보 조회·페이지 정렬·DB 해시 저장·만료·재사용·중복·본인 초대·인증·요청 제한·회원 삭제와 세 가지 동시 수락 상황을 검증한다.

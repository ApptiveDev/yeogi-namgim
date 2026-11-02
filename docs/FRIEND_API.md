# 친구 초대·친구 관계 API

관련 이슈: [#57](https://github.com/ApptiveDev/yeogi-namgim/issues/57). 기준은 기획자의 2차 세미나 개발 안내 §5-1·§5-4와 [공통 API 계약](BACKEND_API_CONTRACT.md)이다.

## 구현 범위와 인증

유효 시간 동안 여러 번 사용할 수 있는 초대 생성 → 수락 전 초대 확인 → `친구 되기` → 양쪽 친구 목록 반영을 제공한다. 별도 요청 승인 과정이나 고정 개인 코드는 없다. 코드 확인만으로는 친구가 되거나 초대가 소비되지 않는다.

모든 경로에 `Authorization: Bearer <회원 accessToken>`이 필요하다. 비회원·refresh token·만료·로그아웃한 세션은 `401 UNAUTHORIZED`다. `AUTH_ENABLED=false`이면 친구 HTTP API를 등록하지 않는다. 회원 설정과 로그인은 [이메일 인증](EMAIL_AUTH_API.md) 및 [토큰 세션](TOKEN_SESSION_API.md)을 따른다.

성공은 `success/data/meta`, 오류는 `success/error/meta` 형식을 유지한다. 모든 친구 응답에는 `Cache-Control: no-store`를 적용한다. 아래 JSON은 `data` 부분이다.

## 1. 초대 생성 및 내 코드 조회

`POST /api/v1/friends/invitations`를 본문 없이 호출한다.

```json
{
  "code": "ABC234",
  "expiresAt": "2026-10-28T10:00:00Z"
}
```

`201 Created`를 반환한다. 코드는 임의 영문 대문자·숫자 6자리이며 혼동하기 쉬운 `I/O/0/1`을 제외한다. 앞뒤 공백을 제거하고 영문 소문자 입력도 허용한다. 내부 공백·하이픈은 허용하지 않는다. 코드 재조회가 가능하도록 서버에 원문과 조회용 해시를 저장한다. DTO의 `toString()`에서는 코드를 가린다.

기본 만료 시간은 생성 후 **10분**이며 `FRIEND_INVITATION_TTL`로 변경할 수 있다. 허용 설정 범위는 `1m`~`7d`다. 유효한 코드가 있으면 생성 요청도 같은 코드와 만료 시각을 반환한다. 만료 전에는 여러 사람이 같은 코드를 사용해 각각 초대한 사람과 친구가 될 수 있다.

`GET /api/v1/friends/invitations/current`는 로그인한 회원의 유효한 코드를 반환한다. 코드가 없거나 만료된 경우 `204 No Content`를 반환하며 새 코드를 만들지 않는다. 변경 전 발급된 16자리 코드는 기존 만료·일회용 규칙을 유지한다.

카카오톡 공유와 앱 진입 주소·딥링크는 프론트 담당이다. 서버가 아직 정하지 않은 도메인이나 링크를 임의로 만들지 않으며, 프론트가 `code`를 공유할 주소에 연결한다. 공유 링크에 진입한 사용자는 로그인 후 아래 확인·수락 API를 사용한다. 실제 카카오톡 공유·앱 재진입은 프론트 통합 검증 대상이다.

## 2. 수락 전 초대 확인

`GET /api/v1/friends/invitations/{code}`

```json
{
  "inviterNickname": "초대한친구",
  "expiresAt": "2026-10-28T10:00:00Z"
}
```

`200 OK`이며 초대한 사람의 닉네임과 만료 시각만 제공한다. 이메일·회원 UUID는 제공하지 않는다. 같은 코드를 여러 번 확인해도 초대를 소비하거나 관계를 만들지 않는다. 본인 초대는 400, 이미 친구인 상대의 유효한 초대는 409다. 확인 후에도 만료·사용 상태가 달라질 수 있으므로 수락 요청에서 다시 검증한다.

## 3. 친구 되기

`POST /api/v1/friends/invitations/{code}/accept`를 본문 없이 호출한다.

```json
{
  "friendId": "11111111-1111-4111-8111-111111111111",
  "nickname": "초대한친구",
  "friendedAt": "2026-10-27T10:00:00Z"
}
```

`200 OK`이며 수락한 회원 기준 상대방을 반환한다. 초대 행을 잠근 뒤 현재 시각·사용 여부·본인 여부를 검증하고, 한 트랜잭션에서 상호 관계 생성과 친구 관계를 생성한다. 이미 친구인 사람이 다시 시도하면 거절한다.

- 같은 코드를 여러 사람이 동시에 수락해도 각각 친구가 될 수 있다.
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

V9가 `app.friend_invitations`와 `app.friendships`를 추가하고 V14가 공유 코드 재조회를 지원한다. 기존 V1~V8과 쪽지 데이터는 변경하지 않는다. 친구·초대의 회원 외래 키는 회원 삭제 시 함께 정리한다. 실제 회원 탈퇴 API와 작성 쪽지 보존 정책은 후속 작업이다.

회원 지도 필터와 공통 친구·공개 범위·거리 판정은 [회원 지도 API](MEMBER_MAP_API.md)에 연결했다. 친구 소식은 아래 조회 API로 제공한다. 실제 저장·읽음·친구 삭제 정책은 후속 범위다. 친구 관계만으로 거리 조건을 무시하지 않는다.

## 6. 오류·제한·검증

| 상태·코드 | 의미 |
| --- | --- |
| `400 INVALID_REQUEST` | 잘못된 페이지·크기 |
| `400 FRIEND_INVITATION_INVALID` | 형식 오류·없는 코드·만료·사용된 기존 16자리 코드 |
| `400 FRIEND_SELF_INVITATION` | 본인 초대 확인·수락 |
| `401 UNAUTHORIZED` | 유효한 회원 인증 없음 |
| `409 FRIEND_ALREADY_EXISTS` | 이미 친구인 상대의 유효한 초대 확인·수락 |
| `429 TOO_MANY_REQUESTS` | 초대 생성·확인·수락 요청 제한 초과 |

회원당 분당 생성 10회, 확인 30회, 수락 30회로 각각 제한한다. 기존 단일 서버 메모리 제한기를 사용한다.

PostgreSQL·PostGIS DB를 실행한 `backend/`에서 `./gradlew test --tests 'com.yeoginamgim.friend.*'`와 `./gradlew build`로 확인한다. 실제 DB에서 양방향 관계·목록·후보 조회·페이지 정렬·DB 해시 저장·만료·재사용·중복·본인 초대·인증·요청 제한·회원 삭제와 세 가지 동시 수락 상황을 검증한다.


## 친구 쪽지 소식

`GET /api/v1/friends/activities?page=0&size=20`

회원 Access Token이 필요하며 응답에는 `Cache-Control: no-store`를 적용한다.

공통 `ApiResponse.data`:

```json
{
  "activities": [
    {
      "noteId": "쪽지 UUID",
      "friendId": "작성자 회원 UUID",
      "nickname": "친구이름",
      "placeName": "서울숲",
      "neighborhood": "성수동",
      "createdAt": "2026-11-01T00:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "hasNext": false
}
```

- 현재 친구 관계와 `FRIENDS` 공개 범위를 기준으로 조회한다. 본인·비회원·비친구 쪽지, 친구의 `PUBLIC`/`PRIVATE` 쪽지는 제외한다. 친구 지도와 동일한 공개 범위 정책을 적용했다.
- 현재 친구의 과거 쪽지도 포함하며 별도 최근 N일 제한은 두지 않는다. 친구가 된 시각 이후만 조회하는 이벤트 기록 방식은 아니다.
- `createdAt DESC, noteId DESC`로 정렬한다. 기본 page=0/size=20, page=0~10000, size=1~100이며 범위/형식 오류는 `400 INVALID_REQUEST`다. 데이터가 변하지 않으면 동시각 항목도 안정적으로 페이지를 나눈다. 요청 사이 새 쪽지가 추가되면 offset 페이지 위치는 달라질 수 있다.
- 장소 값은 작성 시 저장한 값이며 null일 수 있다. 본문·미리보기·정밀 좌표·이메일·열람 토큰은 반환하지 않는다.
- 현재 위치가 없어도 작성 소식은 조회할 수 있다. 이 API는 열람 가능 목록이 아니며 소식 조회로 본문 열람 권한이나 읽음/발견 기록을 생성하지 않는다. 상세가 필요하면 기존 쪽지 열람 API에서 현재 거리·공개 범위·친구 관계를 다시 검사한다.
- 관계가 해제되거나 공개 범위가 바뀌면 이후 조회에서 즉시 제외한다. 소식 결과를 영구 열람 권한으로 사용하지 않는다.
- 별도 저장소/마이그레이션 없이 기존 친구 관계와 쪽지 데이터를 한 번의 쿼리로 읽는다. 데이터 소스 실패를 정상 빈 목록으로 숨기지 않는다.

### 프론트 연결

현재 친구 소식 카드 모델에 `noteId → id`, `friendId/nickname → friend.id/displayName`, `createdAt → createdAt`을 연결한다. `locationLabel`은 `placeName → neighborhood → 장소 정보 없음` 순서로 표시할 수 있다. 프로필 이미지는 제공하지 않으므로 기존 기본 아바타를 사용한다. 실제 프론트 연결·푸시 알림은 이번 변경 범위에 포함하지 않는다.

구현 기준은 main의 친구 소식 카드와 기존 확정 친구 지도 공개 정책이다. 소식 전용 정책이 별도로 정해지면 이 계약과 테스트를 함께 조정한다.

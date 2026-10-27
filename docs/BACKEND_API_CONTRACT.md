# 2차 세미나 백엔드 공통 API 계약

- 작성일: 2026-10-25 / 목표: 2026-11-03 2차 세미나
- 관련 이슈: [#49](https://github.com/ApptiveDev/yeogi-namgim/issues/49)
- 기준: 기획자의 「2차 세미나 개발 안내」 제공본(10/09 회의 및 최신 와이어프레임 기준), 백엔드 역할분담안
- 우선순위: 최신 기획의 기능·동작 규칙 → 이 문서의 개발 계약 → 역할분담안의 구현 제안. 기획 미정 사항은 마지막 절에 별도 기록한다.

이 문서는 10월 28일 백엔드 공동 개발에 앞서 정하는 후속 구현 기준이다. 이메일 회원 인증과 `CurrentUserProvider`는 [이메일 인증 API](EMAIL_AUTH_API.md)에서 구현 상태와 사용법을 확인한다. 회원 쪽지 작성·내 쪽지 조회·본인 열람과 구조 분리는 [회원 쪽지 API](MEMBER_NOTE_API.md)에서 구현 상태를 확인한다. 친구 초대·관계·목록 및 친구 조회 계약은 [친구 API](FRIEND_API.md)를 따른다. 그 밖의 인터페이스·API는 후속 구현 대상이다. 계약을 변경하면 호출하는 쪽과 테스트 대역도 함께 갱신한다.

## 1. 계약 작성 시점의 구현과 재사용 범위

| 구분 | 현재 구현 | 후속 작업 |
| --- | --- | --- |
| 인증 | 비회원 Bearer 토큰으로 `GuestSessionService.identify()` 호출 | 회원 인증과 사용자 식별 추가 |
| 작성 | `POST /api/v1/notes`, 본문 최대 500자, 좌표·서버 작성 시각 저장 | 회원 작성자·색상·공개 범위·장소 정보 추가 |
| 지도 | `GET /api/v1/notes`, 지도 영역의 ID·좌표·내 쪽지 여부 반환 | 공개 범위·필터·정렬·상태 정보 추가 |
| 열람 | `POST /api/v1/notes/{noteId}/open`, PostGIS로 200m 판정 | 회원 권한·작성자 및 저장 거리 예외·읽음 기록 추가 |
| 응답 | `ApiResponse`, `ApiErrorResponse`, `GlobalExceptionHandler` | 기존 형식과 오류 코드 재사용·확장 |
| DB | `app` 스키마, Flyway V1~V5, JPA `ddl-auto=validate` | 적용된 SQL을 수정하지 않고 새 마이그레이션 추가 |
| 알림 | 비회원 위치·푸시 토큰, 500m 주변 쪽지 존재 확인 및 시간별 푸시 | 회원 전환·공개 범위 적용 검토 |

현재 구조는 [NoteController](../backend/src/main/java/com/yeoginamgim/note/controller/NoteController.java), [NoteService](../backend/src/main/java/com/yeoginamgim/note/service/NoteService.java), [Note](../backend/src/main/java/com/yeoginamgim/note/domain/Note.java), [프론트 API 호출부](../frontend/src/api/notes.ts)를 기준으로 확인했다.

## 2. 담당 경계와 변경 순서

| 인증·작성·지도·친구·계정 담당 | 열람·저장·보관함·알림 담당 |
| --- | --- |
| 회원 인증·프로필·계정 | 열람 권한·200m 거리 판정 |
| 쪽지 작성·공개 범위·장소 | 저장·저장 취소·읽음·발견 기록 |
| 지도 조회·필터·응답 조립 | 지도에서 사용하는 접근·저장·읽음 상태 조회 |
| 친구 초대·관계·친구 소식 | 달력형 보관함·저장 통계 |
| 작성·친구 통계·배포 | 알림 유지 및 탈퇴 시 저장·읽음·알림 데이터 정리 |

- 인증·친구 담당은 인증·친구 조회 계약을 제공하고, 열람·저장 담당은 아래 인터페이스에 맞춰 기능을 구현한다.
- 현재 `NoteService`에는 작성·지도·열람이 함께 있다. 쪽지 작성 담당이 구조 분리 작업을 먼저 병합하고, 열람 담당은 열람 전용 `NoteOpenService`에서 작업한다. 기존 컨트롤러의 열람 경로는 유지한다.
- 열람·저장 담당은 `Note` 엔티티와 작성·지도 서비스를 직접 수정하기보다 필요한 필드를 계약으로 요청한다. 작성·지도 담당도 저장·발견 테이블을 직접 수정하지 않는다.
- Flyway 번호는 PR 병합 순서에 맞춰 할당한다. 공동 개발 시작 전에 사용한 번호를 인계하고, 병렬 작업 시 같은 버전 번호를 사용하지 않는다.
- 지도 물방울 표시·확대 동작·바텀시트·뒤로 가기 상태 보존은 프론트가 담당한다. 클러스터 계산 위치는 추가 결정이 필요하다.

## 3. 회원 식별과 기존 비회원 데이터

### 회원 식별 계약

- 회원 `userId`와 쪽지 `noteId`는 UUID이며, JSON에서는 UUID 문자열로 주고받는다.
- 회원 API는 `Authorization: Bearer <accessToken>`을 사용한다. JWT의 `sub`는 회원 UUID로 한다.
- JWT의 `sid`는 로그인 세션 UUID로 한다. 토큰 서명·클레임과 DB의 회원·세션 연결 및 만료·폐기 상태를 함께 확인한다. 재발급·로그아웃 규칙은 [토큰 세션 API](TOKEN_SESSION_API.md)를 따른다.
- 인증 담당은 인증 컨텍스트에서 회원 ID를 가져오는 `CurrentUserProvider.requireUserId(): UUID`를 제공한다. 각 기능은 토큰을 직접 해석하거나 요청 본문의 사용자 ID를 신뢰하지 않는다.
- 회원 access token, refresh token, 기존 비회원 토큰은 검증 경로를 구분한다. 검증에 실패한 회원 토큰을 비회원 토큰으로 재시도하지 않고, refresh token은 일반 API 인증에 사용할 수 없게 한다.
- 잘못된 인증·만료된 인증은 기존 응답 형식의 `401 UNAUTHORIZED`로 통일한다. 만료 시간·로그아웃 무효화 방식은 인증 구현에서 문서화한다.
- 이메일 인증·비밀번호 가입과 로그인을 먼저 구현하고 카카오 로그인·계정 연결은 후속으로 진행한다. 어느 방식이든 각 기능에는 동일한 회원 UUID를 제공한다.

### 데이터 전환 원칙

- 기존 `guestId`를 회원 ID로 재해석하지 않는다. 기존 비회원 세션과 외래 키를 보존한다.
- 회원 전환 시 `app.users`와 `notes.author_user_id`를 추가하는 방향으로 설계한다. 신규 회원 쪽지는 회원 작성자를, 기존 쪽지는 비회원 작성자를 참조한다. DB 제약으로 둘 중 정확히 하나의 작성자만 허용한다.
- 기존 쪽지·위치·푸시 토큰을 회원에게 자동 귀속하지 않는다. 기존 기록 이전 여부와 절차는 미정이며, 필요하면 비회원 토큰과 회원 인증을 모두 확인하는 별도 작업으로 진행한다.
- 비회원 API는 회원 기능 전환 중에도 유지한다. 회원 데이터가 추가된 뒤 비회원 조회는 기존 비회원 데이터로 범위를 제한하고, 회원 쪽지를 기존의 무조건 조회 쿼리에 섞지 않는다.
- 새 비공개 쪽지 저장을 활성화하기 전에 지도·열람·주변 알림·푸시 후보 쿼리 모두에 노출 범위 제한을 적용한다. 알림도 비공개 쪽지의 존재를 유출하지 않게 한다.

## 4. 공통 데이터

다음 표는 회원 쪽지 기준이다. 기존 비회원 요청의 필수 필드를 변경하지 않는다. 회원 작성 입력·페이지네이션·장소 연동 기준은 [회원 쪽지 API](MEMBER_NOTE_API.md)를 따른다.

| 필드 | 타입·의미 | 제공·관리 |
| --- | --- | --- |
| `noteId` / `authorUserId` | UUID / 회원 작성자 UUID | 쪽지 작성 |
| `content` | 공백만 입력 불가, 최대 500자 | 쪽지 작성, 열람·미리보기 노출은 열람 권한 판정 적용 |
| `visibility` | `PUBLIC`, `FRIENDS`, `PRIVATE` | 쪽지 작성 |
| `color` | 선택, HEX 색상 또는 1~32자 식별자, 최종 팔레트는 디자인 확인 후 확정 | 쪽지 작성 |
| `latitude` / `longitude` | 위도 -90~90 / 경도 -180~180 | 쪽지 작성 시 저장, 열람 시 거리 판정 |
| `placeName` / `neighborhood` | 상세 장소명 / 카드 하단 동네 정보 | 쪽지 작성, 기존 프론트 역지오코딩 결과 전달·누락 허용 |
| `createdAt` | 서버 생성 UTC `Instant`, ISO 8601 문자열 | 쪽지 작성 |
| `savedAt` | 서버 생성 UTC `Instant`, 저장하지 않았으면 없음 | 저장 |
| `isMine` / `isSaved` / `isRead` | 현재 요청 사용자 기준 상태 | 작성자 판정 / 저장 / 열람 |

- 공개는 전체 공개, 친구는 친구 관계인 사용자와 작성자, 나만은 작성자에게 노출한다. 지도 노출 가능 여부와 거리상 열람 가능 여부는 구분한다.
- `authorUserId`는 내부 권한 판정용이다. 익명 표시 대상의 응답에 작성자 회원 ID·닉네임을 그대로 넣지 않고 화면에 필요한 작성자 구분만 제공한다.
- 보관함의 내 쪽지 자동 포함은 작성자 조건으로 조회한다. 내 쪽지를 저장 테이블에 중복 삽입할 필요는 없다.
- 저장 관계는 `(userId, noteId)` 중복을 허용하지 않는다. 발견 기록도 같은 사용자와 쪽지의 중복을 방지한다.
- 보관함 달력은 쪽지의 `createdAt`을 `Asia/Seoul` 날짜로 변환한다. 저장 날짜가 기준이 아니다. 월·일 범위는 시작 포함, 다음 시작 미포함으로 조회한다.
- `FRIEND`/`ANONYMOUS` 저장 필터의 분류 기준은 미정이다. 현재 친구 관계와 저장 당시 관계 중 무엇을 사용할지 확정 전 하드코딩하지 않는다.

### 위치 입력

내부 공통 입력은 `LocationInput(latitude, longitude, accuracyMeters, measuredAt)`으로 정한다. 기존 API의 `latitude`·`longitude` 이름을 유지하고, 컨트롤러에서 내부 입력으로 변환한다.

- 좌표는 유한한 숫자이며 허용 범위를 검증한다. `accuracyMeters`는 유한한 0 이상의 미터 값, `measuredAt`은 UTC 시각이다.
- 위치 입력 자체가 없는 경우와 일부 필드만 들어온 잘못된 입력을 구분한다. 잘못된 형식은 `400 INVALID_REQUEST`다.
- 작성에는 현재 위치가 필요하다. 열람은 작성자·저장 거리 예외를 먼저 고려하고, 거리가 필요한 경우에만 위치를 요구한다.
- 정확도 허용치·측정 유효 시간·미래 시각 허용 오차는 아직 확정되지 않았다. 위치·열람 담당이 설정값으로 분리하고 적용 전에 기준을 문서화한다.

## 5. 백엔드 공통 조회 인터페이스

아래는 공통 Java 인터페이스의 시그니처 계약이다. `CurrentUserProvider`는 회원 인증에서, `FriendshipQueryService`는 친구 기능에서 구현했다. 나머지는 후속 구현 대상이다. 상대 기능의 구현 전에는 단위 테스트에서 인터페이스의 Mock을 사용한다.

```java
// 인증: 인증된 회원 식별
interface CurrentUserProvider {
    UUID requireUserId();
}

// 친구: 후보 사용자 중 현재 친구인 사용자만 반환
interface FriendshipQueryService {
    Set<UUID> findFriendIds(UUID userId, Set<UUID> candidateUserIds);
    long countFriends(UUID userId);
}

// 저장: 후보 쪽지 중 저장한 쪽지와 저장 시각만 반환
interface BookmarkQueryService {
    Map<UUID, Instant> findSavedAt(UUID userId, Set<UUID> noteIds);
    long countSavedNotes(UUID userId);
}

// 열람: 후보 쪽지 중 실제 열람한 쪽지만 반환
interface NoteDiscoveryQueryService {
    Set<UUID> findReadNoteIds(UUID userId, Set<UUID> noteIds);
}

// 지도에서 조회한 쪽지 메타데이터를 열람 권한 판정에 전달한다.
record LocationInput(double latitude, double longitude,
                     double accuracyMeters, Instant measuredAt) {}
record NoteAccessTarget(UUID noteId, UUID authorUserId,
                        NoteVisibility visibility,
                        double latitude, double longitude) {}
enum NoteVisibility { PUBLIC, FRIENDS, PRIVATE }
enum NoteAccessStatus { OPENABLE, LOCKED, LOCATION_REQUIRED, HIDDEN }
record NoteAccessResult(NoteAccessStatus status, Double distanceMeters) {}

interface NoteAccessService {
    // location은 위치가 없으면 null. targets는 회원 쪽지만 전달한다.
    Map<UUID, NoteAccessResult> evaluate(
        UUID userId, LocationInput location, List<NoteAccessTarget> targets);
}
```

- 위 타입은 `java.util`의 UUID·컬렉션, `java.time.Instant`를 사용한다. 비회원 쪽지 판정은 기존 비회원 경로에서 처리하며, 회원 작성자 UUID를 임의로 만들어 전달하지 않는다.
- 조회 인터페이스는 모두 읽기 전용이다. 지도 조회나 미리보기로 읽음·발견 기록이 생기지 않는다. 상세 열람 성공 시 열람 서비스가 기록한다.
- `evaluate`는 요청한 모든 쪽지 ID에 대한 결과를 반환한다. 결과가 누락되면 호출자는 열람 허용으로 간주하지 않는다. `distanceMeters`는 위치가 없으면 null이다.
- 친구·저장·읽음 조회는 해당하는 ID만 반환한다. 빈 입력은 빈 결과다. 조회 실패를 정상적인 빈 결과로 바꾸지 않는다.
- `HIDDEN`은 내부 상태다. 지도·목록에서는 해당 쪽지와 개수를 제외한다. 다른 사람의 `PRIVATE` 쪽지 등의 메타데이터를 응답하지 않는다.
- 지도 서비스가 응답을 조립하고, 저장·열람 서비스가 저장 상태·시각과 접근 판정을 일괄 제공한다. 쪽지마다 개별 쿼리를 반복하지 않는다.

## 6. 열람 판정과 응답 계약

최신 기획 §1-2·§1-5·§2-2·§3에 따른 판정이다. 내 쪽지와 저장 쪽지는 거리 예외이며, 저장이 모든 공개 범위 제한까지 무조건 해제한다는 뜻은 아니다.

| 조건 | 결과 | 본문·미리보기 |
| --- | --- | --- |
| 내가 작성한 쪽지 | `OPENABLE`, 위치 불필요 | 제공 |
| 노출 가능한 저장 쪽지 | `OPENABLE`, 거리 제한 없음 | 제공 |
| 노출 가능한 미저장 쪽지, 위치 없음 | `LOCATION_REQUIRED` | 제공하지 않음 |
| 노출 가능한 미저장 쪽지, 거리 ≤ 200m | `OPENABLE` | 제공 |
| 노출 가능한 미저장 쪽지, 거리 > 200m | `LOCKED` | 제공하지 않음 |
| 다른 사람의 나만 보기·친구 권한 없는 쪽지 | `HIDDEN` | 메타데이터도 제공하지 않음 |

- 저장 후 친구 해제·공개 범위 변경·원본 삭제가 발생한 경우의 최종 정책은 미정이다. 위 저장 예외는 현재 노출 권한이 있는 경우에 적용하며, 미정 상황을 무조건 허용하는 우회 분기를 만들지 않는다.
- 상세 열람 서비스는 같은 접근 판정을 사용한다. `LOCKED`는 기존 `403 NOTE_LOCKED`, `LOCATION_REQUIRED`는 신규 `403 LOCATION_REQUIRED`, `HIDDEN`과 존재하지 않는 쪽지는 `404 RESOURCE_NOT_FOUND`로 응답한다.
- 권한 없는 응답에는 `content`와 `preview`를 넣지 않는다. 지도에서 잠긴 쪽지의 위치가 보인다는 이유로 본문을 먼저 내려주지 않는다.
- 열려 있는 목록을 위치 변경 후 유지하는 UI 규칙과 상세 요청 시 재검증의 관계는 프론트·기획과 확인한다. 장기 열람 허가 토큰을 임의로 도입하지 않는다.

### HTTP 경로와 데이터 조립

- 모든 API 접두사는 `/api/v1`이다. 역할분담안의 생략된 접두사를 그대로 새 경로로 만들지 않는다.
- 기존 작성·지도·열람 경로를 유지한다. 특히 열람을 바로 `GET /notes/{noteId}`로 교체하지 않는다. 신규 경로가 필요하면 프론트 변경과 호환 기간을 함께 정한다.
- 성공은 기존 `success/data/meta`, 오류는 `success/error/meta` 형식을 유지한다. `meta`의 `requestId`와 `timestamp`도 유지한다.

| 후속 API·응답 | 담당 | 계약 |
| --- | --- | --- |
| 회원 쪽지 작성 | 쪽지 작성 | 기존 본문·좌표에 색상·공개 범위·장소 필드를 확장. 작성자는 인증에서 결정 |
| 지도 쪽지 | 지도·열람·저장 | 기존 `noteId/latitude/longitude/isMine` 유지, 상태·거리·저장·읽음 추가. 본문 미리보기는 열람 가능할 때만 제공 |
| 상세 열람 | 열람 | 기존 `noteId/content/isMine/createdAt` 유지, 색상·장소·공개 범위·작성자 표시·저장·읽음 상태 확장 |
| `GET /users/me/notes` | 쪽지 작성 | 내가 작성한 쪽지 조회, 보관함이 같은 작성자 조건을 재사용 |
| 친구 초대·관계 | 친구 | 일회용 코드·수락으로 상호 관계 생성, 만료·재사용·자기 초대·중복 관계 검증 |
| `GET /friends/notes/feed` | 친구 | 친구 공개 쪽지만, ID·위치·작성 시각·친구 이름 제공, 본문·미리보기 제외 |
| `GET /users/me/archive/calendar` | 보관함 | 월별 작성 기록 날짜·저장 기록 날짜를 구분 |
| `GET /users/me/archive/notes` | 보관함 | 날짜·1차/2차 필터에 맞는 카드, 작성 시각·미리보기·동네·작성자 구분·공개 범위 제공 |
| `GET /users/me/stats` | 계정·저장 | 작성 수·친구 수·저장 수 조립 |

표에서 생략한 경로 접두사도 `/api/v1`이다. 신규 HTTP 요청·응답 DTO와 페이지네이션 상세는 해당 구현 이슈에서 예시와 함께 추가한다. `GET /health`, `/app-config`, 별도 클러스터·물방울 그룹 API는 현재 구현도 기획상 필수 API도 아니며 필요성을 확인한 뒤 추가한다.

지도 필터는 `ALL/FRIENDS/MINE/SAVED`로 한다. 전체·친구는 가까운 순, 내 쪽지는 최신 작성순, 저장은 최신 저장순이다. 날짜·거리 동률에는 `noteId`로 순서를 고정한다. 위치가 없을 때 거리순 처리와 친구 필터의 전체 공개 포함 여부는 미정이다.

보관함의 1차 필터는 `ALL/WRITTEN/SAVED`다. `WRITTEN`의 하위 필터는 `ALL/PUBLIC/FRIENDS/PRIVATE`, `SAVED`의 하위 필터는 `ALL/FRIEND/ANONYMOUS`로 한다. 1차 `ALL`에는 하위 필터를 적용하지 않으며, 다른 1차 필터의 하위 값을 섞어 보낸 요청은 `400 INVALID_REQUEST`로 처리한다.

## 7. 10월 28일 인계와 후속 구현

아래 구현 완료 여부는 실제 코드·검증 결과로 갱신하며, 문서 작성만으로 체크하지 않는다.

- [x] 인증: 이메일 가입·로그인, 회원 식별 및 비회원 호환 구현, access token 발급·검증 동작 설명
- [x] 인증: refresh token 및 로그아웃 구현
- [x] 쪽지 작성: V8 엔티티·마이그레이션 및 작성·내 쪽지 조회 구현
- [x] 쪽지 공통: `NoteOpenService` 분리, 본인 열람 및 열람 담당 경계 문서화
- [x] 친구: `FriendshipQueryService`·친구 수 조회, 초대·관계·목록 구현 및 후속 경계 문서화
- [x] 인증: 회원 API 실행 방법과 이메일 인증·가입·로그인 요청 예시 제공
- [x] 쪽지 작성: 회원 쪽지 작성 요청 예시와 인계용 테스트 사용자 준비 절차 제공
- [x] 백엔드 공통: V8 사용·후속 V9 및 API 변경 내역을 회원 쪽지 API 문서에 기록
- [ ] 열람·저장·보관함: 열람·저장·읽음 조회 구현, 지도 일괄 상태 조회 및 보관함 연결
- [x] 백엔드 공통: 회원 쪽지가 기존 비회원 지도·열람·알림·푸시에 노출되지 않는지 DB 통합 검증

인증·작성·지도 담당의 구현 순서는 회원 인증 → 쪽지 작성 확장 → 친구 → 지도 → 친구 소식·마이다. 열람·저장·보관함 담당은 열람 정책 → 저장·읽음 → 지도 상태 → 보관함 → 통합 검증 순서로 진행한다. 상대 기능 구현 전에는 단위 테스트에서 상태별 Mock을 사용하고, 배포 실행 환경에 무조건 허용하는 임시 구현을 넣지 않는다.

## 8. 추가 결정이 필요한 항목

아래 항목은 미정이다. 이 계약의 UUID·조회 시그니처·기존 경로 유지 원칙과 구분하며, 해당 기능 구현 전에 결정 결과를 기록한다.

| 결정 항목 | 확인 대상 |
| --- | --- |
| 후속 카카오 로그인과 기존 이메일 계정 연결 방식 | 기획·인증 담당·프론트 |
| 비회원 기록 이전 여부, 회원 탈퇴 시 작성 쪽지 보존·삭제 | 기획·백엔드 공통 |
| 탐색/열람 확대 기준, 클러스터 계산 위치, 한 개 쪽지 클릭 동작 | 기획·프론트·지도 담당 |
| 목록 열린 뒤 이동 시 상세 열람 재판정 방식 | 기획·프론트·열람 담당 |
| 내 쪽지 저장 취소 의미, 쪽지 수정·삭제 포함 여부 | 기획·백엔드 공통 |
| 친구 필터의 전체 공개 포함, 저장한 친구/익명 분류 기준 | 기획·백엔드 공통 |
| 친구 해제·공개 범위 변경·원본 삭제 후 저장본 접근 | 기획·백엔드 공통 |
| 초대 코드 최종 만료 시간·구체적 공유 링크 방식 | 기본 24시간을 설정으로 변경 가능, 앱 주소·공유는 기획·프론트 확인 |
| 위치 권한 없는 지도 탐색·정렬, 정확도·최신성 허용 기준 | 기획·백엔드 공통·프론트 |
| 최종 쪽지 색상 팔레트 | 기획·디자인·프론트 (현재 입력 규칙·장소 연동은 회원 쪽지 API 참조) |

사진·꾸미기·보상·「1년 전 오늘, 여기서」 기능은 이번 공통 기반 작업에 추가하지 않는다. 자세한 구현 이슈·PR·커밋 형식은 [협업 가이드](CONTRIBUTING.md)를 따른다.

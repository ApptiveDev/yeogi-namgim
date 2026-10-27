# 회원 쪽지 작성·내 쪽지 조회 API

관련 이슈: [#55](https://github.com/ApptiveDev/yeogi-namgim/issues/55). 공통 규칙은 [백엔드 계약](BACKEND_API_CONTRACT.md), 인증 설정은 [이메일 인증](EMAIL_AUTH_API.md), 재발급은 [토큰 세션](TOKEN_SESSION_API.md)을 따른다.

## 구현 범위

회원 쪽지 작성, 내 쪽지 최신순 조회, 내 쪽지 거리 예외 열람을 제공한다. 성공은 `success/data/meta`, 오류는 `success/error/meta`이며, 작성·내 쪽지·상세 응답에는 `Cache-Control: no-store`를 적용한다.

회원 지도 필터, 타인 쪽지 열람 권한, 친구 관계, 저장·읽음 기록과 보관함 달력은 후속 작업이다. 현재 `GET /api/v1/notes`는 기존 비회원 전용이며 회원 JWT를 지원하지 않는다. 회원이 작성한 쪽지는 이 비회원 지도와 비회원 주변 알림·푸시 후보에 포함하지 않는다. 회원 본인의 목록과 상세에서만 확인할 수 있다. 이 단계에서 타인의 회원 쪽지 열람 요청은 공개 범위와 관계없이 404다.

## 1. 쪽지 작성

`POST /api/v1/notes`에 `Authorization: Bearer <회원 accessToken>`을 전달한다.

```json
{
  "content": "오늘 이곳에서 좋은 일이 있었다.",
  "latitude": 35.2314,
  "longitude": 129.0846,
  "visibility": "PRIVATE",
  "color": "#FFCC3D",
  "placeName": "부산대학교 정문",
  "neighborhood": "장전동"
}
```

| 필드 | 규칙 |
| --- | --- |
| `content` | 필수, 공백만 입력 불가, 최대 500자, 앞뒤 공백 제거 |
| `latitude` / `longitude` | 필수, 위도 -90~90 / 경도 -180~180 |
| `visibility` | 회원 필수, `PUBLIC` / `FRIENDS` / `PRIVATE`, 기본 공개로 대체하지 않음 |
| `color` | 선택, `#RRGGBB` 또는 영문자로 시작하는 1~32자 색상 식별자(영문·숫자·밑줄·하이픈). 누락 시 null |
| `placeName` | 선택, 최대 200자, 상세 장소·주소 표시 문자열 |
| `neighborhood` | 선택, 최대 100자, 동네 표시 문자열 |

장소 문자열은 앞뒤 공백을 제거하고 빈 문자열은 null로 저장한다. 색상 팔레트는 아직 정해지지 않았으며 서버가 임의의 기본색을 선택하지 않는다. 프론트 디자인 확정 후 선택값을 맞춘다. 예시의 색상은 허용 형식을 보여 주기 위한 값이다.

작성자는 회원 인증의 `CurrentUserProvider.requireUserId()`에서 결정한다. 요청에 `authorUserId`, `guestAuthorId`, `createdAt`을 추가해도 작성자나 서버 시각을 바꿀 수 없다. 이 필드들은 입력 DTO에 없으므로 무시한다.

`201 Created` 응답의 `data`는 기존과 같다.

```json
{
  "noteId": "11111111-1111-4111-8111-111111111111",
  "createdAt": "2026-10-26T01:00:00Z"
}
```

기존 비회원은 같은 경로에 비회원 토큰과 기존 `content/latitude/longitude`만 보낸다. 이 경우 기존 비회원 작성자로 저장하고 공개 범위는 `PUBLIC`이다. 비회원이 공개 범위·색상·장소 필드를 지정하면 400으로 거절한다. 비공개 요청을 조용히 공개 쪽지로 저장하지 않는다.

## 2. 기존 지도·주소 조회와 연결

현재 지도 렌더러는 MapLibre이며, 작성 화면은 `frontend/src/app/index.tsx`의 `Location.reverseGeocodeAsync(coords)`로 주소를 조회해 화면에 표시한다. 서버에서 별도의 지도 업체 API를 중복 호출하지 않고 이 조회 결과를 작성 요청에 담는 구조다.

프론트 연동 시에는 작성에 사용할 **같은 좌표의 주소 조회 결과**를 아래처럼 전달한다. 현재 프론트는 주소를 화면에만 표시하고 작성 요청에는 좌표와 본문만 전송하므로, 실제 필드 전달과 회원 인증 연결은 프론트 후속 작업이다.

| 기존 조회 결과 | 작성 API |
| --- | --- |
| 작성 시 확정한 `coords.latitude/longitude` | `latitude/longitude` |
| 표시용 주소·선택 장소 이름 | `placeName` |
| 결과의 `district`, 없으면 `subregion` 또는 `city` | `neighborhood` |

이 매핑은 프론트 연동 기준이다. 주소 조회 실패·빈 결과 때는 장소 필드를 생략하고 확정한 좌표로 작성한다. 기존 화면도 주소 조회 실패 시 좌표를 사용할 수 있게 처리한다. `현재 위치`, `위치 확인 중` 등의 UI 안내 문구를 실제 장소명으로 저장하지 않는다. 좌표가 없으면 작성할 수 없다. 저장한 장소 정보는 표시용 문자열이며 인증이나 200m 거리 판정에는 사용하지 않는다.

## 3. 내 쪽지 목록

`GET /api/v1/users/me/notes?page=0&size=20`에 회원 access token을 전달한다.

- 기본 `page=0`, `size=20`, 허용 범위 `page=0~10000`, `size=1~100`.
- `createdAt DESC, noteId DESC`로 정렬하고 `size+1` 조회로 다음 페이지 유무를 구한다.
- 공개 범위와 관계없이 요청 회원이 작성한 쪽지만 반환한다. 기존 비회원 기록은 자동 이전하지 않는다.
- 보관함 담당은 `NoteRepository.findByAuthorUserId(UUID, Pageable)`의 작성자 조건을 재사용한다. 내 쪽지를 저장 테이블에 중복 삽입하지 않는다.

```json
{
  "notes": [
    {
      "noteId": "11111111-1111-4111-8111-111111111111",
      "content": "오늘 이곳에서 좋은 일이 있었다.",
      "latitude": 35.2314,
      "longitude": 129.0846,
      "visibility": "PRIVATE",
      "color": "#FFCC3D",
      "placeName": "부산대학교 정문",
      "neighborhood": "장전동",
      "createdAt": "2026-10-26T01:00:00Z",
      "isMine": true
    }
  ],
  "page": 0,
  "size": 20,
  "hasNext": false
}
```

위 예시는 `data` 부분이다. 오프셋 방식이므로 페이지 사이에 새 쪽지가 작성되면 경계가 이동할 수 있다. 날짜·공개 범위 필터와 달력은 보관함 구현에서 추가한다.

## 4. 내 쪽지 열람·담당 경계

`POST /api/v1/notes/{noteId}/open`에 회원 토큰과 `{}`를 전달한다. 내 쪽지는 위치 없이, 또는 멀리 떨어진 위치에서도 열람할 수 있다. 본문 생략도 허용한다. 좌표를 보낼 때는 두 필드를 함께 보내며 범위를 검증한다.

기존 `noteId/content/isMine/createdAt`에 `visibility/color/placeName/neighborhood`를 추가한 `data`를 반환한다. 익명 작성자 UUID는 포함하지 않는다.

- 작성·조회 담당: `NoteService`, `Note`, `NoteRepository`, 작성·목록 DTO.
- 열람 담당: 분리한 `NoteOpenService`에서 타인 권한, 친구·저장 거리 예외, 읽음 기록을 확장한다. 회원 본인 열람은 이미 제공한다.
- 현재 친구·저장 조회 서비스나 무조건 허용하는 임시 구현은 넣지 않았다. 타인의 회원 쪽지는 존재하지 않는 쪽지와 동일하게 `404 RESOURCE_NOT_FOUND`다.
- 기존 비회원 열람은 좌표 필수, 200m 초과 시 `403 NOTE_LOCKED`다. 회원 쪽지는 비회원 열람의 존재 여부 조회에서도 제외한다.
- 열람 제한은 회원·비회원 각각 사용자당 분당 60회이며 기존 단일 서버 메모리 제한기를 사용한다.

## 5. 마이그레이션·인계 검증

이번 번호는 **V8**이다. V1~V7은 수정하지 않는다. 다음 DB 변경은 병합된 최신 버전을 확인하고 V9부터 할당한다.

`guest_author_id`와 `author_user_id` 중 정확히 하나만 존재하도록 CHECK를 추가한다. 회원 UUID는 `app.users` 외래 키이며, 기존 비회원 작성자와 데이터는 보존한다. 회원 탈퇴 시 쪽지 삭제·보존 정책이 미정이므로 회원 작성자 FK에 자동 삭제를 설정하지 않았다.

테스트 회원은 [이메일 인증 API](EMAIL_AUTH_API.md)의 이메일 인증 요청 → 확인 → 가입 → 로그인 순서로 만든다. 본인 이메일을 사용하고, 계정을 두 개 준비하면 목록 격리와 타인 열람 404를 확인할 수 있다. 실제 SMTP 준비 전 자동화 테스트는 메일 발송 대역과 임시 회원·세션을 사용하며 테스트 계정이나 인증 우회 경로를 운영 코드에 추가하지 않는다.

PostgreSQL·PostGIS DB와 환경변수를 준비한 `backend/`에서 실행한다.

```bash
./gradlew test --tests 'com.yeoginamgim.note.*'
./gradlew build
```

회원 작성자·서버 시각, 전체 공개 범위, 선택 장소 정보, 잘못된 입력·토큰·로그아웃, 내 쪽지 격리·페이지 정렬, 위치 없는 내 쪽지 열람, 비회원 지도·열람·알림·푸시 노출 차단과 DB 작성자 제약을 검증한다. 실제 모바일 지도에서의 주소 조회·회원 토큰 연결은 프론트 통합 검증 때 확인한다.

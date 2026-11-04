# 회원 지도 조회·필터 API

관련 이슈: [#59](https://github.com/ApptiveDev/yeogi-namgim/issues/59). 기준은 [최종 정책·기존 구현 점검](FINAL_POLICY_AND_AUDIT.md)이다.

## 요청과 범위

기존 `GET /api/v1/notes`를 유지한다. 회원은 `Authorization: Bearer <accessToken>`을 사용한다. 비회원 토큰 요청은 `401 UNAUTHORIZED`로 거절한다. 기존 비회원 데이터는 회원 지도에 노출하지 않는다. 모든 지도 응답은 `Cache-Control: no-store`다.

```text
GET /api/v1/notes?minLatitude=34.99&minLongitude=128.99&maxLatitude=35.01&maxLongitude=129.01&filter=ALL&latitude=35&longitude=129&page=0&size=100
```

| 입력 | 규칙 |
| --- | --- |
| `minLatitude/minLongitude/maxLatitude/maxLongitude` | 필수, 위도 -90~90·경도 -180~180, 최소 ≤ 최대. 화면의 사각형 범위이며 150m 조회 반경이 아님 |
| `filter` | 기본 `ALL`, `ALL/FRIENDS/MINE/SAVED` |
| `latitude/longitude` | 현재 사용자 위치, 둘 다 생략하거나 둘 다 제공. 화면 중심과 별개 |
| `accuracyMeters/measuredAt` | 선택적인 측정 정확도(유한한 0 이상)·ISO UTC 시각. 좌표 없이 메타데이터만 제공하면 400 |
| `page/size` | 기본 0/100, `page=0~10000`, `size=1~500` |

좌표·페이지·필터·측정 메타데이터 형식 오류는 `400 INVALID_REQUEST`다. 위치를 생략해도 지도를 탐색할 수 있으며, 모르는 위치나 정확도를 서버가 0 또는 현재 시각으로 만들어 넣지 않는다. 위치 측정 품질·유효 시간 제한은 열람 담당이 실제 기준을 정해 추가한다.

필터·정렬은 다음과 같다. 동률은 `noteId DESC`로 고정한다.

| 필터 | 대상 | 정렬 |
| --- | --- | --- |
| `ALL` | 내 쪽지, 타인의 PUBLIC, 현재 친구의 FRIENDS | 위치가 있으면 현재 사용자와 가까운 순 |
| `FRIENDS` | 현재 친구가 작성한 FRIENDS만. 친구의 PUBLIC·PRIVATE와 내 쪽지는 제외 | 위치가 있으면 가까운 순 |
| `MINE` | 공개 범위와 관계없이 내 회원 쪽지 | 최신 작성순 |
| `SAVED` | 저장 소스가 제공한 현재 노출 가능한 회원 쪽지 | 최신 저장순 |

위치 없는 ALL/FRIENDS 조회는 탐색을 유지하기 위해 최신 작성순으로 안정적으로 반환한다. 위치 없는 타인 미저장 쪽지는 목록에 포함하지 않으므로 이 순서를 ‘가까운 순’으로 표시하지 않는다.

경계 점은 포함한다. 경도 범위가 날짜 변경선을 가로지르면 프론트는 두 범위로 나눠 요청하고 ID로 중복을 제거한다. -180~180처럼 넓은 범위도 지원한다. 회원 지도는 `location::geometry`의 화면 사각형 비교를 사용하며, V10의 부분 GiST 인덱스를 사용한다. 실제 미터 거리와 열람 판정은 저장된 geography 좌표의 타원체 지오데식 거리로 계산한다.

## 응답: 마커와 열람 목록 분리

성공은 기존 `success/data/meta`이며 아래는 `data`의 구조다.

```json
{
  "notes": [
    {
      "noteId": "11111111-1111-4111-8111-111111111111",
      "latitude": 35.0009,
      "longitude": 129.0,
      "isMine": false,
      "color": "#FFCC3D",
      "visibility": "PUBLIC",
      "accessStatus": "OPENABLE",
      "distanceMeters": 100.0,
      "isSaved": null,
      "isRead": null
    }
  ],
  "openableNotes": [
    {
      "noteId": "11111111-1111-4111-8111-111111111111",
      "preview": "이 장소의 기록",
      "distanceMeters": 100.0,
      "isMine": false,
      "color": "#FFCC3D",
      "visibility": "PUBLIC",
      "placeName": "장소명",
      "neighborhood": "동네명",
      "createdAt": "2026-10-28T00:00:00Z",
      "savedAt": null,
      "isSaved": null,
      "isRead": null,
      "authorNickname": null
    }
  ],
  "page": 0,
  "size": 100,
  "hasNext": false
}
```

- `notes`는 지도용이다. 현재 위치에서 열지 못하는 LOCKED/LOCATION_REQUIRED도 위치 표시용으로 포함할 수 있지만, 본문·미리보기·작성자 회원 ID·닉네임은 넣지 않는다.
- `openableNotes`는 동일 페이지의 OPENABLE 쪽지만 포함한다. 잠긴 쪽지나 위치가 필요한 쪽지는 목록에 넣지 않는다. 미리보기는 최대 100 유니코드 코드 포인트다.
- ALL 목록은 친구의 쪽지도 익명(`authorNickname=null`)이다. FRIENDS 목록에서만 친구 이름을 반환한다.
- `isSaved/isRead=null`은 해당 조회 소스가 아직 연결되지 않아 상태를 알 수 없다는 뜻이다. 소스 연결 후 실제 상태에 따라 true/false와 `savedAt`을 제공한다.
- `hasNext=true`이면 같은 bounds/filter/location에서 다음 페이지를 조회한다. 페이지가 덜 온 상태에서 전체 개수나 ‘열람 가능 한 개’를 확정하지 않는다. 필터·범위·위치가 바뀌면 페이지를 초기화한다. 오프셋 조회이므로 페이지 사이 새 기록·저장이 생기면 경계가 달라질 수 있다.
- 접근 불가 PRIVATE/비친구 FRIENDS는 위치·개수에도 포함하지 않는다. 지도 조회·미리보기로 읽음이나 저장 기록을 만들지 않는다.

## 공통 열람 판정

`com.yeoginamgim.note.access.NoteAccessService`를 지도와 `NoteOpenService`가 함께 사용한다.

- 내가 쓴 쪽지: 위치·거리 무관 OPENABLE.
- 현재 노출 권한이 있고 실제 저장 관계가 있는 쪽지: 위치·거리 무관 OPENABLE.
- 그 외 노출 가능한 타인 쪽지: 위치 없음 LOCATION_REQUIRED, 거리 ≤150m OPENABLE, 초과 LOCKED.
- 다른 사람의 PRIVATE 또는 현재 친구가 아닌 작성자의 FRIENDS: HIDDEN.

`POST /api/v1/notes/{noteId}/open`은 요청한 현재 좌표로 매번 다시 판정한다. 잠긴 쪽지는 403 NOTE_LOCKED, 위치 필요는 403 LOCATION_REQUIRED, 존재하지 않거나 권한 없는 쪽지는 404다. 프론트는 이 오류를 예전 잠금 상세·길찾기·‘가까이 가야’ 팝업으로 확장하지 않는다. 전체 지도 상세에는 작성자 회원 ID나 닉네임을 추가하지 않는다.

`GeographicNoteAccessService`는 친구·거리·저장 상태를 일괄 조회하는 실제 읽기 전용 구현이다. 저장 담당은 이 판정에 실제 조회 서비스를 연결하고, 상세 성공 시 읽음·발견 기록 쓰기를 별도로 추가한다. 읽음 조회는 열람 허가를 대신하지 않는다.

## 저장·읽음 담당 연결

실제 서비스 Bean이 등록되면 자동으로 주입한다. 운영 코드에는 빈/허용 임시 구현을 넣지 않는다.

| 인터페이스 | 구현할 계약 |
| --- | --- |
| `bookmark.service.BookmarkQueryService` | `findSavedAt(UUID, Set<UUID>)`, `countSavedNotes(UUID)` |
| `bookmark.service.BookmarkMapQueryService` | `SavedNotePage findSavedInBounds(UUID, NoteMapBoundsRequest)` |
| `note.discovery.NoteDiscoveryQueryService` | `Set<UUID> findReadNoteIds(UUID, Set<UUID>)` |

패키지 접두사는 `com.yeoginamgim`이다. 후보가 빈 경우 빈 결과, 조회 실패는 오류다. 조회 소스 오류를 정상적인 빈 목록으로 변환하지 않는다.

저장 필터에는 BookmarkQueryService와 BookmarkMapQueryService 둘 다 필요하다. 없으면 `503 MAP_DATA_UNAVAILABLE`다. 저장 페이지 소스는 화면 범위·공개 범위를 적용하고 `savedAt DESC, noteId DESC` 정렬 후 요청 size 이내의 `(noteId, savedAt)`와 `hasNext`를 반환한다. 서버는 받은 ID에도 범위·공개 권한을 다시 적용한다. 너무 큰 페이지·범위/공개 권한 위반 ID·저장 상태 불일치도 503으로 처리하며, 기존 비회원 쪽지는 회원 지도에 섞지 않는다. `hasNext`의 의미가 유지되도록 권한 필터는 저장 소스에서도 페이지 제한 전에 적용해야 한다.

현재 main에는 실제 저장·읽음 구현이 없다. 이 연결은 테스트에서만 Mock으로 검증했으며 SAVED·저장 거리 예외·읽음 상태까지 운영 연결 완료라고 표시하지 않는다.

## 인계와 검증

새 마이그레이션은 기존 notes 테이블에 회원 지도용 공간 인덱스를 추가하는 **V10**이다. V1~V9는 수정하지 않았다. 후속 번호는 최신 병합 상태를 확인하고 V11부터 할당한다.

프론트 인계: 회원 토큰·이 API 연결, 완전한 페이지 집합으로 물방울과 개수 조립, 화면상 150m 원의 너비가 화면 너비의 1/3인지 판정, 열람 가능 한 개/여러 개 분기, 최신 좌표로 상세 재검증, 익명·친구 이름 구분을 적용한다. 이 PR에서 최종 회원 지도 UI를 새로 구현하지 않았다.

검증은 실제 PostgreSQL/PostGIS에서 공개 범위·친구 전용·익명·현재 위치 없음·150m 경계·이동 후 재잠금·친구 해제 후 재검사·화면 경계·넓은 세계 범위·페이지·저장/읽음 소스 연결을 포함한다. 비회원 API는 종료했으므로 프론트 담당은 회원 인증 흐름으로 연결해야 한다. 이번 PR에는 frontend 경로의 변경을 포함하지 않는다.

거리·인덱스 참고: [PostGIS ST_Distance](https://postgis.net/docs/ST_Distance.html), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).

## 서버 클러스터 조회 — 2026-11-03

관련 이슈: [#112](https://github.com/ApptiveDev/yeogi-namgim/issues/112).

지도 축소 시에도 화면 범위의 전체 쪽지 수를 표시하기 위해 `GET /api/v1/notes/clusters`를 추가한다. 개별 쪽지 API를 최대 20회 반복해 1만 개에서 중단하는 방식 대신 이 API를 한 번 호출한다. 기존 `GET /api/v1/notes`의 응답과 페이지 조회는 유지한다.

```text
GET /api/v1/notes/clusters?minLatitude=34.99&minLongitude=128.99&maxLatitude=35.01&maxLongitude=129.01&filter=ALL&gridSize=8
Authorization: Bearer <accessToken>
```

- 필수 입력은 화면 사각형의 최소·최대 위도와 경도다. 범위·최소≤최대 규칙은 기존 지도 API와 같으며 경계 점도 포함한다. 현재 사용자 위치는 필요하지 않다.
- `filter`는 기본 `ALL`이며 `ALL/FRIENDS/MINE`을 지원한다. 공개 범위·현재 친구 관계는 기존 지도와 동일하게 적용한 **후에** 집계한다. 비회원 기록·타인 PRIVATE·비친구 FRIENDS는 개수와 대표 좌표에도 포함하지 않는다.
- `SAVED`는 저장 소스의 전체 집계 계약이 아직 없어 `503 MAP_DATA_UNAVAILABLE`다. 기존 저장 페이지 API를 반복 호출해 일부만 세거나 임의 저장 테이블을 만들지 않는다. 저장 담당과 별도 집계 조회를 연결해야 한다.
- `gridSize`는 화면의 위도·경도 범위를 각각 몇 칸으로 나눌지 나타내며 기본 8, 허용 1~32다. 기본 응답은 최대 64개, 최대 설정에서도 1,024개 묶음이다. 이 제한은 **응답 묶음 수**에만 적용하며 쪽지 수는 자르지 않는다. 1만 개를 넘는 쪽지도 모두 포함한다.
- `page/size`는 이 API의 입력이 아니며 페이지가 없다. 고정 줌 기준이나 150m 열람 조건도 이 API에서 새로 정하지 않는다.
- 인증·형식 오류는 기존과 같은 401/400이며 성공 응답에 `Cache-Control: no-store`를 적용한다.

공통 성공 응답의 `data` 예시:

```json
{
  "clusters": [
    {
      "clusterId": "4:4",
      "latitude": 35.001,
      "longitude": 129.001,
      "count": 12503,
      "noteId": null,
      "minLatitude": 35.0001,
      "minLongitude": 129.0001,
      "maxLatitude": 35.002,
      "maxLongitude": 129.002
    }
  ],
  "totalCount": 12503,
  "gridSize": 8
}
```

`count`와 `totalCount`는 64비트 정수다. `totalCount`는 화면 범위의 노출 가능한 쪽지 전체 수이며, 항상 모든 `clusters[].count`의 합이다. 빈 지도는 `clusters=[]`, `totalCount=0`이다. 본문·미리보기·작성자 ID·닉네임·읽음·저장 상태는 반환하지 않는다. 조회로 열람·발견·저장 기록을 만들지 않는다.

### 묶음과 프론트 연결

위도·경도를 기준으로 화면 사각형을 균등 격자로 나눠 같은 칸의 쪽지를 묶는다. 최대 경계의 점은 마지막 칸에 포함하고, 너비가 0인 축은 첫 칸으로 처리한다. 가까운 거리 반경이나 지도 투영의 픽셀 간격을 보장하는 알고리즘은 아니다. 인접 칸의 점은 가까워도 별도 묶음이며, 표시 밀도는 프론트가 `gridSize`로 조정할 수 있다.

- `latitude/longitude`는 해당 묶음에 포함된 쪽지 좌표의 평균이다. 개수 1이면 실제 쪽지 좌표이고 `noteId`를 함께 제공한다. 2개 이상이면 `noteId=null`이다.
- 네 개의 최소·최대 좌표는 해당 묶음의 실제 쪽지를 둘러싼 범위다. 탭하면 이 범위로 확대하되 현재 화면보다 축소되는 방향으로 이동하지 않는다. 같은 위치의 여러 쪽지는 확대해도 분리되지 않으므로 충분히 확대된 화면에서는 기존 목록 조회를 사용한다.
- 화면 이동·확대·축소·필터 변경 시 새 화면 범위로 한 번 다시 조회하고, 이전 응답을 교체한다. 이전 범위의 늦은 응답은 새 화면에 반영하지 않는다. `clusterId`는 `가로칸:세로칸`이며 **동일 요청 범위·gridSize 내에서만** 식별자로 쓴다. 영구 ID나 열람 권한으로 사용하지 않는다.
- 탐색 화면의 숫자는 이 API의 `count`를 그대로 표시한다. 화면상 150m 원 너비/화면 너비 1/3의 기존 모드 전환 기준은 유지하고 프론트에서 판단한다. 개수 1이어도 열람 가능을 뜻하지 않으며, 상세는 기존 열람 API에서 현재 위치와 공개 범위를 다시 검사한다. 열람 목록은 기존 `GET /api/v1/notes`를 사용한다.
- 날짜 변경선을 가로지르는 화면은 기존처럼 나눠 요청한다. 집계 응답은 개별 ID가 없으므로 두 요청 범위가 겹치지 않게 나누고, 공통 경계도 중복 포함시키지 않아야 한다. 일반 지도 요청처럼 겹치는 범위의 결과를 단순 합산하면 안 된다.

서버는 기존 공간 인덱스와 공개 범위 조건을 사용해 DB에서 `GROUP BY/COUNT/AVG`로 집계한다. 쪽지 전체를 앱이나 Java 메모리로 가져오지 않는다. 정확한 전체 개수 계산 자체에는 범위 내 데이터 양에 비례하는 DB 작업이 필요하며 대규모 운영 데이터의 지연 시간은 별도 부하 측정 대상이다. [PostgreSQL 집계 함수 문서](https://www.postgresql.org/docs/current/functions-aggregate.html)를 참고한다. 새 마이그레이션은 필요하지 않다.

프론트 화면 수정과 배포는 포함하지 않는다. 프론트는 위 경로 연결 후 반복 조회·1만 개 제한 안내를 교체해야 한다. 백엔드 통합 테스트는 10,001개 집계, 공개 범위·친구 해제·필터, 단일/복수 묶음, 화면 경계·세계 범위·같은 좌표, 빈 결과, 잘못된 입력, 회원 인증과 기존 비회원 데이터 격리를 검증한다.

# 토큰 재발급·로그아웃 API

관련 이슈: [#53](https://github.com/ApptiveDev/yeogi-namgim/issues/53). 이메일 가입·인증과 공통 설정은 [이메일 인증 API](EMAIL_AUTH_API.md)를 따른다. 회원 인증 활성화 조건과 기존 비회원 API는 유지한다.

## 1. 로그인 세션과 토큰

로그인에 성공할 때마다 별도의 세션을 만들고 다음 값을 반환한다. 기존 응답 필드는 유지하고 `refreshToken`, `refreshExpiresIn`을 추가한다.

`POST /api/v1/auth/login` 성공 응답의 `data`:

```json
{
  "accessToken": "<회원 JWT>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "<로그인 세션 UUID>.<임의 문자열>",
  "refreshExpiresIn": 1209600
}
```

| 구분 | 사용처 | 기본 유효 시간 |
| --- | --- | --- |
| Access Token | `Authorization: Bearer <accessToken>`으로 회원 API 호출 | 15분 |
| Refresh Token | 재발급·로그아웃 요청 본문 | 로그인 시점부터 14일 |

- `AUTH_REFRESH_TOKEN_TTL`로 세션 유효 시간을 설정한다. 기본 `14d`, 허용 범위는 1분~90일이다.
- Access Token의 실제 만료는 설정한 유효 시간과 세션 만료 시각 중 이른 쪽이다.
- 재발급해도 세션 만료 시각은 연장하지 않는다. `refreshExpiresIn`은 남은 초 수다. 만료되면 다시 로그인한다.
- Refresh Token은 세션 UUID와 암호학적 임의 값 32바이트를 포함한 80자 문자열이다. JWT가 아니며 서버가 반환한 원문 그대로 사용한다.
- DB에는 Refresh Token의 SHA-256 해시만 저장한다. 교체한 토큰의 해시도 세션에 연결해 재사용을 탐지한다.
- Access Token의 `sub`는 회원 UUID, `sid`는 로그인 세션 UUID다. 서명·클레임 검증 후 DB에서 두 UUID의 일치, 세션 만료·폐기 상태를 확인한다.
- 회원 삭제 시 외래 키의 `ON DELETE CASCADE`로 세션·사용한 토큰 이력도 제거한다.

## 2. 토큰 재발급

`POST /api/v1/auth/refresh`

```json
{ "refreshToken": "<현재 Refresh Token>" }
```

Access Token이 만료되어도 이 요청을 보낼 수 있다. Authorization 헤더는 요구하지 않는다. Refresh Token 자체가 자격 증명이다.

`200 OK` 성공 응답은 로그인과 같은 토큰 쌍이다. 응답의 `accessToken`과 `refreshToken`을 모두 교체해 보관한다. 성공 응답에는 `Cache-Control: no-store`를 설정한다.

```text
현재 Refresh Token 제출
  → 세션 행 잠금
  → 현재 토큰 해시·세션 유효성 확인
  → 이전 해시를 사용 이력으로 이동
  → 새 Refresh Token 해시 저장
  → 새 Access·Refresh Token 반환
```

- 이미 사용한 Refresh Token을 다시 제출하면 `401 UNAUTHORIZED`로 응답하고 해당 로그인 세션을 폐기한다. 세션의 현재 Refresh Token과 발급된 Access Token들도 사용할 수 없게 된다.
- 재사용 탐지로 기록한 폐기는 오류 응답 후에도 DB에 반영한다.
- 알 수 없는 임의 토큰은 재발급을 거부한다. 세션 UUID만 맞고 비밀 값이 틀린 요청으로 정상 세션을 폐기하지 않는다.
- 다른 로그인 세션에는 영향을 주지 않는다.
- 단순 재발급에 성공한 경우 기존 Access Token은 자체 만료까지 사용할 수 있다. 로그아웃·재사용 탐지·세션 만료 시에는 즉시 차단한다.

### 프론트 호출 규칙

동일 로그인 세션의 재발급 요청은 한 번에 하나만 실행한다. 여러 API가 동시에 401을 받으면 재발급 결과를 공유한다. 같은 Refresh Token으로 동시에 두 번 재발급하거나 완료된 요청을 이전 토큰으로 재시도하면 재사용으로 판정되어 세션이 폐기된다.

재발급 응답이 401이면 저장한 토큰을 제거하고 로그인 화면으로 이동한다. 재발급 응답을 받지 못해 최신 Refresh Token을 알 수 없는 경우에도 재로그인이 필요할 수 있다. 이 구현에는 이전 토큰의 재사용을 허용하는 유예 기간이 없다.

## 3. 로그아웃

`POST /api/v1/auth/logout`

```json
{ "refreshToken": "<현재 Refresh Token>" }
```

현재 또는 해당 세션에서 이미 교체된 Refresh Token으로 로그아웃할 수 있다. 만료된 Access Token과 무관하게 호출하며 Authorization 헤더는 요구하지 않는다.

`200 OK` 응답의 `data`:

```json
{ "loggedOut": true }
```

- 해당 로그인 세션만 폐기한다. 로그아웃 처리 완료 후 그 세션의 기존 Access Token·Refresh Token을 차단한다.
- 다른 기기나 다른 로그인으로 생성한 세션은 유지한다. 전체 기기 로그아웃은 이번 범위에 포함하지 않는다.
- 이미 폐기·만료된 세션에 반복 호출하거나 존재하지 않는 토큰을 제출해도 같은 성공 응답을 반환한다. 단, 요청 형식 오류는 400이다.
- 프론트는 성공 후 로컬 Access·Refresh Token을 모두 제거한다.
- 응답에는 `Cache-Control: no-store`를 설정한다.

## 4. 오류·호환·요청 제한

| 상태·코드 | 상황 |
| --- | --- |
| `400 INVALID_REQUEST` | Refresh Token 누락·형식 오류, Access Token·가입용 토큰을 대신 제출 |
| `401 UNAUTHORIZED` | 재발급 시 토큰 불일치·재사용·세션 만료·폐기·회원 삭제 |
| `429 TOO_MANY_REQUESTS` | 재발급 또는 로그아웃 IP당 분당 30회 초과 |

기존 응답의 `success/data/meta`, `success/error/meta` 형식을 사용한다. 일반 회원 API에서도 폐기·만료된 세션, 회원과 세션이 일치하지 않는 JWT, `sid`가 없는 JWT는 401로 처리한다.

**배포 전환:** 이전 구현에서 발급한 `sid` 없는 Access Token은 계속 사용할 수 없다. 해당 사용자는 새 로그인으로 세션과 토큰 쌍을 발급받는다. 비회원 토큰은 기존 비회원 API에서 그대로 사용한다. 프론트 회원 로그인 연동 시 추가된 Refresh Token 저장·교체·로그아웃 처리를 함께 적용한다.

기존 코드와 마찬가지로 IP 요청 횟수는 단일 서버 메모리 기준이다. 세션과 토큰 교체·폐기 상태는 DB에서 공유한다. 상태 확인은 [CurrentUserProvider](../backend/src/main/java/com/yeoginamgim/common/auth/CurrentUserProvider.java)로 통일하고, JWT 서명 확인만으로 로그아웃한 사용자를 허용하지 않는다.

## 5. 검증 범위

- 로그인 응답의 토큰 쌍과 DB 해시 저장
- 재발급·토큰 교체·절대 만료 시각 유지·세션 종료에 맞춘 Access Token 만료
- 이전 토큰 재사용과 401 응답 후에도 유지되는 세션 폐기
- 임의 토큰으로 정상 세션을 폐기할 수 없는지
- 로그아웃·반복 로그아웃·다른 로그인 세션 유지
- Access Token 만료 후 유효한 Refresh Token으로 재발급
- 동시 재발급 및 재발급·로그아웃 동시 요청
- 회원 삭제 시 세션·이력 제거, 잘못된 세션 소유자·누락 클레임·토큰 형식 차단
- 기존 이메일 인증·가입·비밀번호·비회원 API 회귀 테스트

설계 참고: [RFC 9700 §4.14.2의 Refresh Token rotation·재사용 탐지](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2), [RFC 7009 §2.2의 반복·유효하지 않은 토큰 폐기 응답](https://www.rfc-editor.org/rfc/rfc7009.html#section-2.2). 이 API는 프로젝트의 JSON 요청·응답 규격을 사용한다.

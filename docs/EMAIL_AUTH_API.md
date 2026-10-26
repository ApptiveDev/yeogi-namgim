# 이메일 회원가입·로그인 API

관련 이슈: [#51](https://github.com/ApptiveDev/yeogi-namgim/issues/51). 모든 경로의 접두사는 `/api/v1`이다. 성공·오류 응답은 기존 `success/data/meta`, `success/error/meta` 형식을 사용한다.

## 1. 실행 설정

`backend/.env.example`을 참고하여 로컬 `.env` 또는 서버 환경변수를 설정한다. 회원 인증은 기본적으로 비활성화되어 있으며, `AUTH_ENABLED=true`일 때만 회원 API가 등록된다. 비활성화 상태의 회원 API는 404를 반환한다. 기존 비회원 API는 계속 사용할 수 있다.

| 변수 | 설정 |
| --- | --- |
| `AUTH_ENABLED` | 회원 API 활성화, 기본 `false` |
| `AUTH_JWT_SECRET` | 32바이트 이상 임의 키의 Base64, access token 서명용 |
| `AUTH_VERIFICATION_SECRET` | 별도로 생성한 32바이트 이상 임의 키의 Base64, 이메일 코드·가입 토큰 HMAC용 |
| `AUTH_ACCESS_TOKEN_TTL` | 기본 `15m`, 1초 이상 24시간 이하 |
| `AUTH_REFRESH_TOKEN_TTL` | 기본 `14d`, 1분 이상 90일 이하 |
| `AUTH_MAIL_FROM` | SMTP 서비스가 허용한 발신 이메일 주소 |
| `MAIL_HOST` / `MAIL_PORT` | SMTP 호스트 / 포트, 기본 포트 `587` |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP 인증 계정 / 비밀번호 |
| `MAIL_SMTP_AUTH` | 기본 `true`, SMTP 인증 사용 |
| `MAIL_STARTTLS` | 기본 `true`, STARTTLS 사용 및 필수 적용 |

각 비밀키는 다음 명령으로 독립적으로 생성해 환경변수에 설정한다. 출력된 키와 SMTP 비밀번호는 Git·로그·공유 문서에 기록하지 않는다.

```bash
openssl rand -base64 32
```

회원 인증 활성화 시 JWT 키·이메일 인증 키·SMTP 호스트·발신 주소가 필요하다. 메일 연결·읽기·쓰기 제한 시간은 각각 5초이며, TLS 사용 시 서버 호스트명도 검증한다. 실제 외부 SMTP 자격 증명과 수신함 도착은 운영 설정 후 별도로 확인한다.

## 2. 비밀번호·회원 입력 규칙

- 비밀번호는 **8~64자**, 영문·숫자·특수문자를 각각 1개 이상 포함해야 한다.
- 영문 대소문자, 숫자, ASCII 특수문자를 지원한다. 공백·줄바꿈·탭·한글·이모지는 비밀번호에 사용할 수 없다.
- 앞뒤 공백을 자동으로 제거하지 않는다. 입력한 비밀번호 그대로 검증한다.
- `passwordConfirm`은 필수이며 `password`와 정확히 일치해야 한다.
- 비밀번호는 BCrypt 비용 12로 해시 저장한다. 허용 입력은 ASCII 최대 64바이트로, BCrypt의 72바이트 제한 안에 들어간다.
- 이메일은 앞뒤 공백을 제거하고 소문자로 저장·조회한다. 최대 254자이며 중복 가입을 허용하지 않는다.
- 닉네임은 앞뒤 공백 제거 후 유니코드 코드 포인트 기준 2~20자이며, 공백만으로 구성하거나 제어 문자를 포함할 수 없다.

## 3. 가입 순서

### 3-1. 이메일 인증 요청

`POST /api/v1/auth/email-verifications`

```json
{ "email": "user@example.com" }
```

`202 Accepted` 응답의 `data`:

```json
{ "verificationId": "11111111-1111-4111-8111-111111111111", "expiresIn": 300 }
```

숫자 6자리 코드를 해당 주소로 발송한다. API 응답에는 코드가 없다. 동일 이메일에는 60초 후 재요청할 수 있고, 재요청하면 이전 인증 ID·코드·가입용 토큰이 무효화된다. 발송 실패 시 `503 EMAIL_SEND_FAILED`로 응답하고 DB 변경을 되돌린다.

### 3-2. 이메일 인증 확인

`POST /api/v1/auth/email-verifications/confirm`

```json
{
  "email": "user@example.com",
  "verificationId": "11111111-1111-4111-8111-111111111111",
  "code": "123456"
}
```

위 ID와 코드는 예시이며, 실제 요청에서 받은 ID와 메일의 코드를 사용한다. `200 OK` 응답의 `data`:

```json
{ "verificationToken": "<가입용 토큰>", "expiresIn": 600 }
```

인증 코드는 발송 후 5분 동안 유효하다. 잘못된 코드 입력은 DB에 누적하고, 5회 실패하면 해당 인증을 더 이상 확인할 수 없다. 성공한 코드는 재사용할 수 없다. 가입용 토큰은 확인한 이메일에 묶인 일회용 임의 토큰이며 10분 동안 유효하다. 로그인용 access token과는 다르다.

### 3-3. 회원가입

`POST /api/v1/auth/signup`

```json
{
  "email": "user@example.com",
  "password": "Example123!",
  "passwordConfirm": "Example123!",
  "nickname": "여기남김",
  "verificationToken": "<이메일 인증 확인 응답의 가입용 토큰>"
}
```

`201 Created` 응답의 `data`:

```json
{
  "userId": "22222222-2222-4222-8222-222222222222",
  "email": "user@example.com",
  "nickname": "여기남김",
  "createdAt": "2026-10-25T05:00:00Z"
}
```

가입에 성공하면 가입용 토큰을 소비한다. 같은 토큰으로 동시에 가입해도 회원은 한 명만 생성된다. 입력 오류로 가입하지 못한 경우에는 유효 시간이 남은 가입용 토큰으로 수정 후 재시도할 수 있다.

## 4. 로그인과 내 프로필

`POST /api/v1/auth/login`

```json
{ "email": "user@example.com", "password": "Example123!" }
```

`200 OK` 응답의 `data`:

```json
{
  "accessToken": "<회원 JWT>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "<Refresh Token>",
  "refreshExpiresIn": 1209600
}
```

Access Token의 기본 유효 시간은 15분이다. JWT는 HS256 서명과 issuer·audience·발급 시각·만료·`token_use=access`·회원 UUID·세션 UUID를 검증하고 DB에서 세션 유효성도 확인한다. 없는 이메일과 틀린 비밀번호는 동일하게 `401 UNAUTHORIZED`로 처리한다. Refresh Token의 기본 유효 시간은 로그인 시점부터 14일이며, 재발급·로그아웃·기존 토큰 전환 규칙은 [토큰 세션 API](TOKEN_SESSION_API.md)를 따른다.

`GET /api/v1/users/me` 요청에 `Authorization: Bearer <회원 JWT>`를 전달하면 가입 응답과 같은 프로필을 조회한다. 서버는 회원이 현재 존재하는지도 확인한다. 요청 본문의 사용자 ID로 다른 회원을 선택할 수 없다.

인증 성공 응답과 프로필에는 `Cache-Control: no-store`를 설정한다. 비밀번호·해시는 프로필 응답에 포함하지 않는다. 가입용 토큰과 인증 코드는 각각 확인·가입 단계에만 사용하며 비회원 토큰·회원 JWT와 혼용할 수 없다.

## 5. 오류와 요청 제한

| 상태·코드 | 의미 |
| --- | --- |
| `400 INVALID_REQUEST` | 이메일·비밀번호·확인값·닉네임·UUID·코드 형식 오류 |
| `400 EMAIL_VERIFICATION_INVALID` | 인증 ID·코드·가입용 토큰 오류, 만료 또는 이미 사용됨 |
| `401 UNAUTHORIZED` | 로그인 실패 또는 회원 토큰 누락·위변조·만료·회원 없음 |
| `409 EMAIL_ALREADY_EXISTS` | 정규화한 이메일이 이미 가입됨 |
| `429 TOO_MANY_REQUESTS` | 이메일 재전송 간격 또는 요청 횟수 초과 |
| `503 EMAIL_SEND_FAILED` | SMTP 발송 실패 |

| 요청 | 제한 |
| --- | --- |
| 인증 메일 요청 | IP당 분당 10회, 동일 이메일 재전송 간격 60초 |
| 인증 코드 확인 | IP당 분당 30회, 인증 ID별 실패 5회 |
| 회원가입 | IP당 분당 5회 |
| 로그인 | IP당 분당 20회 및 이메일당 분당 10회 |

이메일 재전송 간격·코드 실패 횟수·가입 토큰 소비는 DB에서 동시성을 제어한다. IP·로그인 이메일 요청 횟수는 기존 단일 서버 메모리 제한기를 재사용한다. IP는 서블릿의 원격 주소를 사용하며 임의의 전달 헤더를 신뢰하지 않는다. 프록시·여러 서버로 배포할 때는 신뢰할 프록시 설정과 공유 제한 저장소를 별도로 적용해야 한다.

## 6. 검증 범위와 후속 작업

- 비밀번호 경계값·문자 종류·확인값 불일치, 이메일 정규화 및 민감 정보 출력 방지를 테스트한다.
- 실제 PostgreSQL·PostGIS에서 가입·로그인·프로필·중복·동시 가입·코드 실패·만료·재전송·가입 토큰 소비를 검증한다.
- JWT 위변조·만료·잘못된 issuer·audience·용도와 비회원/회원 토큰 혼용을 검증한다.
- 로컬 SMTP 서버로 UTF-8 메일 전송과 발송 실패 처리를 검증한다. 실제 외부 메일 서비스의 인증·수신함 도착은 검증하지 않았다.
- 기존 비회원 쪽지·지도·열람·위치·푸시·알림 회귀 테스트도 함께 실행한다.

카카오 인증과 비회원 기록 이전은 후속 작업이다. 회원 쪽지 작성·조회·본인 열람은 [회원 쪽지 API](MEMBER_NOTE_API.md)를 따른다. 토큰 재발급·로그아웃은 [토큰 세션 API](TOKEN_SESSION_API.md)에서 구현 상태와 사용법을 확인한다. 쪽지 작성·본인 열람은 회원 access token도 지원하며, 기존 지도·비회원 열람에는 비회원 토큰을 사용한다. 다른 회원 API에서 사용자를 식별할 때는 [CurrentUserProvider](../backend/src/main/java/com/yeoginamgim/common/auth/CurrentUserProvider.java)를 사용한다.

구현에 참고한 공식 문서: [Spring Security 비밀번호 저장](https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html), [JWT 검증](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html), [Spring Boot 메일 발송](https://docs.spring.io/spring-boot/reference/io/email.html).

# 여기남김 백엔드

Spring Initializr로 생성한 백엔드 기본 프로젝트입니다.

## 개발 환경

| 항목 | 버전·설정 |
| --- | --- |
| Java | 21 LTS |
| Spring Boot | 4.1.1 |
| Gradle | 9.8.0, Wrapper 사용 |
| 빌드 스크립트 | Groovy DSL (`build.gradle`) |
| 패키지 | `com.yeoginamgim` |
| 패키징 | Jar |
| PostgreSQL | 18.6, 아래 고정 이미지 사용 |
| PostGIS | 3.6.4 |
| 데이터 접근 | Spring Data JPA, Boot 관리 버전 |
| DB 변경 관리 | Flyway, Boot 관리 버전 |

Spring Web MVC, Validation, Lombok, JPA, PostgreSQL 드라이버 및 Flyway를 포함합니다. 내장 Tomcat을 사용하며, 별도 Tomcat 설치는 필요하지 않습니다. 의존성 버전은 Spring Boot의 의존성 관리에 따릅니다.

## 로컬 DB 준비

Docker Engine과 Docker Compose를 준비합니다. 저장소 루트에서 다음 명령을 실행합니다.

```bash
cd backend
cp .env.example .env
```

`.env`의 `DB_PASSWORD`를 로컬 개발용 비밀번호로 변경한 뒤 DB를 실행합니다.

```bash
docker compose up -d --wait
```

`.env`는 Git에 포함되지 않습니다. Compose와 Spring이 같은 파일을 읽으며, 운영 환경에서는 환경변수로 접속 정보를 전달합니다. Spring이 `.env`를 읽으려면 작업 디렉터리를 `backend/`로 설정해야 합니다. 파일에는 따옴표나 `export` 없이 `KEY=value` 형식을 사용합니다.

| 변수 | 기본값·설명 |
| --- | --- |
| `DB_HOST` | `127.0.0.1`, Spring에서 접속할 DB 호스트 |
| `DB_PORT` | `15432`, 로컬 DB 포트 (컨테이너 내부는 `5432`) |
| `DB_NAME` | `yeoginamgim` |
| `DB_USERNAME` | `yeoginamgim` |
| `DB_PASSWORD` | 필수, `.env` 또는 환경변수로 설정 |

로컬 DB 포트는 `127.0.0.1`에만 공개됩니다. 포트가 이미 사용 중이면 `.env`의 `DB_PORT`를 변경합니다. DB 데이터는 Docker volume에 보존됩니다. 초기 생성 후 비밀번호 값을 바꾸는 것만으로 기존 DB 비밀번호가 변경되지는 않습니다.

이미지는 `postgis/postgis:18-3.6`을 digest로 고정합니다. 최초 서버 실행으로 Flyway가 PostGIS 활성화를 완료한 뒤, 아래 명령으로 DB와 확장 버전을 확인할 수 있습니다. PostgreSQL 18 기준으로 volume은 `/var/lib/postgresql`에 연결합니다.

이 이미지는 `amd64` 전용이므로 Compose에 `platform: linux/amd64`를 지정했습니다. Apple Silicon에서는 Docker의 x86 실행 지원이 필요합니다.

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version(), public.postgis_lib_version();"'
```

앱을 종료한 뒤 DB를 중지할 때는 다음 명령을 사용합니다. 데이터 volume은 유지됩니다.

```bash
docker compose down
```

## 실행 방법

JDK 21을 설치하고 IntelliJ의 Project SDK와 Gradle JVM을 JDK 21로 설정합니다. 저장소의 `backend/` 폴더를 Gradle 프로젝트로 열고 실행 설정의 작업 디렉터리를 `backend/`로 지정합니다. 위 절차로 DB를 먼저 실행합니다.

저장소 루트에서 다음 명령을 실행합니다.

```bash
cd backend
./gradlew bootRun
```

Windows에서는 `gradlew.bat bootRun`을 사용합니다. 첫 실행에는 Gradle과 의존성 다운로드를 위한 인터넷 연결이 필요합니다.

기본 포트는 `8080`입니다. `/api/v1/guest-sessions`에서 비회원 세션을 발급하고, 발급받은 Bearer 토큰으로 `POST /api/v1/notes`에서 현재 위치에 쪽지를 작성할 수 있습니다. `GET /api/v1/notes`에 최소·최대 위도와 경도를 전달하면 해당 지도 범위의 마커 데이터를 조회할 수 있습니다. 별도 루트 API가 없으므로 `/` 요청은 `404`를 반환합니다. 서버 종료는 `Ctrl+C`를 사용합니다.

## 쪽지·푸시 API

아래 요청은 모두 비회원 세션 API에서 발급받은 `Authorization: Bearer <token>` 헤더가 필요합니다.

| 메서드·경로 | 설명 |
| --- | --- |
| `POST /api/v1/notes/{noteId}/open` | `{ "latitude": 35.1797, "longitude": 129.0755 }`로 요청한 위치가 쪽지에서 200m 이내일 때만 본문 반환 |
| `POST /api/v1/push-tokens` | `{ "platform": "ANDROID", "pushToken": "..." }`로 기기 토큰 등록. iOS APNs 토큰 또는 Firebase 등록 토큰 사용 가능 |
| `PATCH /api/v1/push-tokens/{tokenId}` | `{ "enabled": false }`로 알림 비활성화. OS 권한이 꺼지면 앱에서 호출 |
| `PATCH /api/v1/locations/current` | `{ "latitude": 35.1797, "longitude": 129.0755 }`로 최신 위치 갱신 |

앱은 홈 지도 진입 또는 위치가 바뀔 때 최신 위치를 전송해야 합니다. 서버는 최근 24시간 안에 갱신된 위치와 500m 안의 쪽지를 매 정각(UTC) 확인합니다. 같은 기기·지역(6자리 geohash)·시간에는 한 번만 발송합니다. 푸시에는 “주변에 확인할 수 있는 쪽지가 있어요.”와 `screen=home`만 포함하며, 앱은 알림 클릭 시 홈 지도 화면을 열어야 합니다.

푸시 작업은 기본적으로 꺼져 있습니다. 운영 환경에서 `.env.example`의 `PUSH_ENABLED=true`와 발송 자격 증명을 설정합니다. Android와 iOS Firebase 등록 토큰은 [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api)을 사용하며 `FCM_PROJECT_ID`, 서비스 계정의 `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`가 필요합니다. iOS APNs 기기 토큰은 [APNs 토큰 인증](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns)을 사용하며 `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`(`.p8`)가 필요합니다. 개발 APNs 토큰에는 `APNS_SANDBOX=true`를 설정합니다. 키는 줄바꿈을 `\n`으로 변환해 환경변수에 넣을 수 있습니다. 실제 발송은 공급자 자격 증명과 앱의 알림 권한이 있어야 확인할 수 있습니다.

## 빌드 및 테스트

로컬 DB를 실행하고 `.env`를 준비한 상태에서 실행합니다.

```bash
./gradlew build
```

빌드 결과는 `build/libs/`에 생성됩니다. 생성된 실행 가능한 Jar는 다음과 같이 실행할 수 있습니다.

```bash
java -jar build/libs/yeogi-namgim-0.0.1-SNAPSHOT.jar
```

기본 테스트에서 애플리케이션 연결, Flyway 이력 및 PostGIS의 미터 단위 반경 쿼리를 확인합니다. 테스트 실행 시에도 Flyway가 적용되므로 로컬 개발 DB를 사용합니다.

## DB 변경 관리

- 서버 시작 시 Flyway가 `src/main/resources/db/migration/`의 SQL을 순서대로 실행합니다.
- `V1__enable_postgis.sql`은 `public` 스키마의 PostGIS 확장을 활성화합니다. 이미지에서 이미 활성화했다면 그대로 유지합니다.
- `V2__create_guest_sessions.sql`은 비회원 ID와 토큰 해시를 저장할 `guest_sessions` 테이블을 생성합니다.
- `V3__create_notes.sql`은 비회원 쪽지와 PostGIS 위치 및 공간 인덱스를 저장할 `notes` 테이블을 생성합니다.
- 애플리케이션 테이블과 Flyway 이력은 `app` 스키마에 관리합니다. 접속 시 `app,public` 순서로 스키마를 검색합니다.
- JPA는 `ddl-auto=validate`를 사용하며 테이블을 자동 생성하거나 수정하지 않습니다.
- 후속 변경은 `V4__...sql`부터 적용 순서에 맞는 새 마이그레이션 파일로 추가하고, 이미 적용한 파일은 수정하지 않습니다.

## 초기 설정 범위

현재 프로젝트는 기본 실행 환경, 비회원 세션 발급 API, 비회원 쪽지 작성 API 및 지도 범위 쪽지 조회 API를 포함합니다. 쪽지 열람, FCM 및 나머지 서비스 API는 후속 작업에서 추가합니다.

협업 규칙은 [협업 가이드](../docs/CONTRIBUTING.md)를 따릅니다.

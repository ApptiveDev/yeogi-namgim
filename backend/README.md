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

Spring Web MVC, Validation, Lombok을 포함합니다. 내장 Tomcat을 사용하며, 별도 Tomcat 설치는 필요하지 않습니다. 의존성 버전은 Spring Boot의 의존성 관리에 따릅니다.

## 실행 방법

JDK 21을 설치하고 IntelliJ의 Project SDK와 Gradle JVM을 JDK 21로 설정합니다. 저장소의 `backend/` 폴더를 Gradle 프로젝트로 열 수 있습니다.

저장소 루트에서 다음 명령을 실행합니다.

```bash
cd backend
./gradlew bootRun
```

Windows에서는 `gradlew.bat bootRun`을 사용합니다. 첫 실행에는 Gradle과 의존성 다운로드를 위한 인터넷 연결이 필요합니다.

기본 포트는 `8080`입니다. 아직 API를 추가하지 않았으므로 `/` 요청은 `404`를 반환합니다. 서버 종료는 `Ctrl+C`를 사용합니다.

## 빌드 및 테스트

```bash
./gradlew build
```

빌드 결과는 `build/libs/`에 생성됩니다. 생성된 실행 가능한 Jar는 다음과 같이 실행할 수 있습니다.

```bash
java -jar build/libs/yeogi-namgim-0.0.1-SNAPSHOT.jar
```

## 초기 설정 범위

이번 설정은 프로젝트 골격과 Web MVC, Validation, Lombok 의존성까지 포함합니다. DB 연결, JPA, PostGIS, Flyway, FCM 및 서비스 API는 후속 작업에서 추가합니다.

협업 규칙은 [협업 가이드](../docs/CONTRIBUTING.md)를 따릅니다.

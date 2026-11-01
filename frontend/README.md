# 여기남김 Frontend

React Native, Expo를 기반으로 개발합니다.

## 기술 스택


| 기술 | 버전 | 사용 목적 |
| --- | --- | --- |
| React Native | 0.86.3 | Android·iOS 모바일 화면 구현 |
| Expo | ~57.0.25 | 개발 환경 구성 및 앱 빌드 |
| Expo Router | ~57.0.23 | 파일 기반 화면 라우팅 |
| TypeScript | ~6.0.3 | 타입 정의 및 정적 타입 검사 |
| MapLibre React Native | ^11.4.0 | 지도 렌더링 및 쪽지 마커 표시 |


## 실행 방법

### 1. 준비

- Node.js 및 npm
- Android: Android Studio, Android SDK, JDK, 에뮬레이터 또는 실제 기기
- iOS 로컬 빌드: macOS 및 Xcode
- 실행 중인 백엔드 서버


### 2. 의존성 설치

루트 디렉토리에서 아래 명령을 통해 의존성을 설치합니다.

```bash
cd frontend
npm ci
```

### 3. 백엔드 및 환경변수 설정

[백엔드 README](../backend/README.md)에 따라 DB와 API 서버를 실행합니다.

`frontend` 디렉토리에서 아래 명령을 통해 `.env.local` 파일을 생성합니다.

```bash
cp .env.local.example .env.local
```

예시 파일의 API 서버 주소는 Android Studio 에뮬레이터 환경 기준으로 작성되었습니다.

실제 기기에서는 개발 PC와 같은 네트워크에 연결하고, `.env.local`의 서버 주소를 개발 PC의 LAN IP로 변경합니다.



### 4. 앱 빌드 및 실행

`frontend` 디렉토리에서 사용할 플랫폼의 명령을 실행합니다.

Android:

```bash
npm run android
```

iOS — macOS에서 실행:

```bash
npm run ios
```


## 디렉토리 구조

```text
frontend/
├── assets/
│   ├── fonts/          # Pretendard, Archivo Black, Noto Sans KR 및 라이선스
│   ├── images/         # 아이콘, 쪽지 마커, 스플래시 이미지
│   └── maps/           # 지도 스타일 JSON
├── scripts/            # 마커 및 아이콘 이미지 생성 스크립트
├── src/
│   ├── app/
│   │   ├── _layout.tsx # 루트 레이아웃 및 비회원 인증 초기화
│   │   ├── index.tsx   # 홈 화면 구성 및 훅·컴포넌트 연결
│   │   └── storage.tsx # 보관함 화면 구성
│   ├── api/            # 공통 API 클라이언트, 요청 함수, 타입
│   ├── auth/           # 비회원 인증 토큰 저장 및 조회
│   ├── components/
│   │   ├── home/
│   │   │   ├── HomeMap.tsx     # 지도 및 위치·쪽지 레이어 표시
│   │   │   └── MapSelector.tsx # 지도 선택 메뉴 및 음영 애니메이션
│   │   ├── navigation/ # 내비게이션 컴포넌트
│   │   ├── storage/    # 보관함 헤더, 필터, 달력, 카드 및 빈 상태
│   │   ├── notes/      # 쪽지 작성·열람·마커 컴포넌트
│   │   └── ui/         # 공통 UI 컴포넌트
│   ├── constants/
│   │   ├── home-map.ts # 지도 반경, 기본 줌, 카메라 복귀 시간
│   │   ├── storage.ts  # 보관함 필터 정의, 문구, 색상 및 폰트
│   │   └── theme.ts    # 테마 상수
│   ├── data/           # API 연결 전 보관함의 빈 데이터
│   ├── hooks/
│   │   ├── use-home-map.ts         # 지도 제어, 범위 조회 및 마커 상태 계산
│   │   ├── use-note-compose.ts     # 쪽지 작성·저장 및 작성창 열기·닫기
│   │   ├── use-note-markers.ts     # 지도 범위에 따른 쪽지 목록 조회
│   │   ├── use-note-reader.ts      # 쪽지 열람 요청 및 선택 상태 관리
│   │   ├── use-storage-notes.ts    # 보관함 필터, 날짜 선택 및 목록 계산
│   │   ├── use-user-location.ts    # 위치 권한 요청 및 실시간 위치 추적
│   │   ├── use-color-scheme.ts     # 기기 색상 모드 조회
│   │   ├── use-color-scheme.web.ts # 웹 색상 모드 조회
│   │   └── use-theme.ts            # 테마 조회
│   ├── styles/         # 화면 스타일 및 지도 스타일 처리
│   ├── types/          # API 응답과 분리된 보관함 화면 모델
│   └── utils/          # 거리 계산 및 위치 반경 도형 생성
├── .env.local.example  # API 서버 환경변수 예시
├── app.json            # Expo 앱 설정 및 네이티브 플러그인
├── eas.json            # EAS 빌드 프로필
├── package.json        # 의존성 및 실행 명령
├── package-lock.json   # 의존성 버전 고정
└── tsconfig.json       # TypeScript 설정
```

협업 규칙은 [협업 가이드](../docs/CONTRIBUTING.md)를 참고합니다.

## 화면 구성

| 화면 | 경로 | 주요 기능 |
| --- | --- | --- |
| 보관함 | `/storage` | 필터·날짜별 노트 조회 |
| MY | `/my` | 프로필, 태그, 한 줄 소개, 노트 통계 |
| 설정 | `/settings` | 위치 권한 관리, 개발용 목업 설정 |
| 친구 | `/friends` | 친구 목록과 활동 소식 |

MY의 찾은·작성한·저장한 노트를 누르면 보관함의 전체·내 노트·저장 필터로 이동합니다.
보관함 필터는 `?filter=all|mine|saved|friends`로 지정합니다.
위치 권한은 실제 기기와 연동하며, 기기 설정에서 앱으로 돌아오면 상태를 갱신합니다.

## 개발용 목업 데이터

**MY → 설정 → 개발자 도구 → 목업 데이터 사용**에서 켜고 끕니다. 기본값은 켜짐이며,
선택은 기기에 저장되어 재실행 후에도 유지됩니다. MY·보관함·친구 화면에 함께 적용됩니다.

API 응답이 없을 때 목업을 사용하며, 목업을 끄면 빈 상태를 표시합니다.
실제 응답의 `0`과 빈 목록은 그대로 유지합니다. 예시 데이터는 `src/data/*.mock.ts`에서 수정합니다.
앱 시작 시 비회원 토큰은 발급하지 않으며, 저장된 회원 세션이 없으면 로그인 화면으로 이동합니다.

## API 연결 지점

이메일 인증 요청·확인, 회원가입, 로그인, 토큰 재발급, 로그아웃은 기존 회원 API에 연결되어 있습니다.
`EXPO_PUBLIC_API_BASE_URL`을 설정하고 BE의 `AUTH_ENABLED=true` 및 SMTP 설정을 준비해야 합니다.
앱 시작 시 저장된 회원 세션을 확인하며, 모바일 토큰은 SecureStore에 저장합니다.
인증 관련 자동 검증은 `npm run test:auth`로 실행합니다. 실제 SMTP 발송·수신 확인은 별도로 필요합니다.

보관함·MY·친구 API는 아직 연결하지 않았습니다. 연결 시 응답을 아래 화면 모델로 변환해 전달합니다.

| 화면 | 응답 입력 | 화면 모델 |
| --- | --- | --- |
| 보관함 | [storage-notes.ts](src/data/storage-notes.ts)의 `STORAGE_NOTES_RESPONSE` | [StorageNote](src/types/storage.ts) 배열 |
| MY | [my-page.ts](src/data/my-page.ts)의 `MY_PAGE_RESPONSE` | [MyPageResponse](src/types/my.ts) |
| 친구 | [friends.ts](src/data/friends.ts)의 `FRIENDS_RESPONSE` | [FriendsData](src/types/friends.ts) |

## 미구현 기능

MY QUEST·MY STICKERS는 준비 중입니다. 알림 설정, 프로필 편집, 회원 탈퇴, 약관 상세,
친구 초대·등록은 UI만 제공하며 실제 기능은 연결하지 않았습니다.

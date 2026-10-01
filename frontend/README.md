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
│   ├── fonts/          # Pretendard 폰트
│   ├── images/         # 아이콘, 쪽지 마커, 스플래시 이미지
│   └── maps/           # 지도 스타일 JSON
├── scripts/            # 마커 및 아이콘 이미지 생성 스크립트
├── src/
│   ├── app/
│   │   ├── _layout.tsx # 루트 레이아웃 및 비회원 인증 초기화
│   │   └── index.tsx   # 지도 홈 화면
│   ├── api/            # 공통 API 클라이언트, 요청 함수, 타입
│   ├── auth/           # 비회원 인증 토큰 저장 및 조회
│   ├── components/
│   │   ├── navigation/ # 내비게이션 컴포넌트
│   │   ├── notes/      # 쪽지 작성·열람·마커 컴포넌트
│   │   └── ui/         # 공통 UI 컴포넌트
│   ├── constants/      # 테마 등 공통 상수
│   ├── hooks/          # 쪽지 조회 및 테마 관련 훅
│   ├── styles/         # 화면 스타일 및 지도 스타일 처리
│   └── utils/          # 거리 계산 및 위치 반경 도형 생성
├── .env.local.example  # API 서버 환경변수 예시
├── app.json            # Expo 앱 설정 및 네이티브 플러그인
├── eas.json            # EAS 빌드 프로필
├── package.json        # 의존성 및 실행 명령
├── package-lock.json   # 의존성 버전 고정
└── tsconfig.json       # TypeScript 설정
```

협업 규칙은 [협업 가이드](../docs/CONTRIBUTING.md)를 참고합니다.
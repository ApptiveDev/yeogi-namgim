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

마이페이지·설정은 회원 프로필 조회, 닉네임 수정, 작성 쪽지 통계와 작성 목록 API에 연결되어 있습니다. `AUTH_ENABLED=true`인 백엔드에 회원 로그인한 뒤 사용합니다. 마이페이지와 보관함의 전체·저장·내 노트는 개발자 목업 설정과 관계없이 실제 회원 데이터를 조회합니다. 저장·발견 수가 제공되지 않으면 `—`로 표시하며 발견 목록과 보관함 친구 노트 연동은 후속 작업입니다. 상세 계약은 [마이페이지 통계 API](../docs/MEMBER_STATS_API.md), [회원 쪽지 API](../docs/MEMBER_NOTE_API.md), [보관함 API](../docs/ARCHIVE_API.md)를 참고합니다.

프론트 자동 검사는 `npm run lint`, `npx tsc --noEmit`, `npm run test:auth`, `npm run test:member`, `npm run test:archive`로 실행합니다.

일회용 초대 코드 생성과 기기 텍스트 공유를 제공합니다. 친구 코드 입력 창은 영문 대문자·숫자 6자리를 지원하며, 코드 확인·수락 API는 6자리 서버 규격에 맞춰 연동할 예정입니다. `친구 추가`를 누르면 `초대 링크 보내기`와 `코드로 추가하기`가 표시됩니다. 링크 공유는 준비 중이며, 코드 화면에서 일회용 코드를 발급하거나 복사할 수 있습니다. 예시 모드에서는 예시 목록을 유지합니다. 친구 소식의 쪽지 미리보기와 지도 위치 보기는 예시 UI입니다. 친구 소식과 초대 링크 앱 진입 연동은 후속 작업입니다. 계약은 [친구 API](../docs/FRIEND_API.md), 자동 검사는 `npm run test:friends`를 참고합니다.

발급된 코드 영역을 누르면 `expo-clipboard`로 코드 문자열을 복사하고 완료 안내를 표시합니다. 이 모듈이 없는 기존 개발 빌드를 사용 중이라면 `npm run android` 또는 `npm run ios`로 앱을 한 번 다시 빌드합니다.

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
│   │   ├── fonts.ts    # 화면에서 공유하는 폰트 패밀리 이름
│   │   ├── storage.ts  # 보관함 필터 정의, 문구 및 색상
│   │   └── theme.ts    # 테마 상수
│   ├── data/           # API 응답 변환·페이지 조회와 친구 화면 예시 데이터
│   ├── hooks/
│   │   ├── use-home-map.ts         # 지도 제어, 범위 조회 및 마커 상태 계산
│   │   ├── use-note-compose.ts     # 쪽지 작성·저장 및 작성창 열기·닫기
│   │   ├── use-note-markers.ts     # 지도 범위에 따른 쪽지 목록 조회
│   │   ├── use-note-reader.ts      # 쪽지 열람 요청 및 선택 상태 관리
│   │   ├── use-storage-calendar.ts # 보관함 달력의 월·날짜 선택
│   │   ├── use-archive-notes.ts    # 실제 보관함 목록·건수·필터·캐시 연결
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
| MY | `/my` | 회원 프로필과 작성 쪽지 통계 |
| 설정 | `/settings` | 프로필·닉네임 편집·로그아웃, 위치 권한 관리, 개발용 목업 설정 |
| 친구 | `/friends` | 실제 친구 목록·초대 코드 추가, 예시 활동 소식 |

MY의 작성한 노트를 누르면 `/my-notes`의 전체 기간 페이지 목록으로 이동합니다.
찾은·저장한 노트 집계와 이동은 후속 구현 대상입니다.
보관함 필터는 `?filter=all|mine|saved|friends`로 지정합니다.
보관함 달력의 년·월을 누르면 두 개의 스크롤 휠이 있는 선택 창이 열립니다.
중앙의 연두색 행으로 년도와 월을 선택하고 **완료**를 눌러 적용합니다. 적용 시 날짜별 선택은 해제됩니다.
**오늘**은 선택 창의 값을 이번 달로 옮기며, 바깥 영역이나 기기의 뒤로 가기를 누르면 변경을 취소합니다.
연도는 2025년부터 현재 연도까지만 선택할 수 있습니다. 2025년 1월의 이전 버튼과 올해 12월의 다음 버튼은 비활성화되며, 범위 밖의 인접 날짜도 선택할 수 없습니다.
선택 창은 120ms로 나타나고, 휠은 36px 단위로 정렬합니다. Android·iOS에서는 손을 뗐을 때의 속도로 목표 칸을 계산하되 추가 이동을 최대 두 칸으로 제한하고, 그 칸까지 스프링으로 감속합니다. 글자는 중앙 행이 바뀔 때 즉시 바뀌고, 드래그한 값은 스프링이 멈추면 확정합니다. `오늘`을 누르면 현재 년·월까지 애니메이션으로 스크롤합니다.
위치 권한은 실제 기기와 연동하며, 기기 설정에서 앱으로 돌아오면 상태를 갱신합니다.

## 개발용 목업 데이터

**MY → 설정 → 개발자 도구 → 목업 데이터 사용**에서 켜고 끕니다. 기본값은 켜짐이며,
선택은 기기에 저장되어 재실행 후에도 유지되며 친구 예시 화면에만 적용됩니다.
MY·설정의 회원 정보는 실제 API를 사용합니다.

보관함 목업은 제거했습니다. 전체·저장·내 노트는 실제 API를 사용하며, 친구 노트는 후속 연동 전까지 예시 없이 빈 상태를 표시합니다. 친구 노트의 미확인 건수는 `—`로 표시합니다.
친구 화면은 목업을 끄거나 친구 추가를 시작하면 실제 친구 목록을 조회합니다.
친구 화면의 `예시 친구 보기`는 해당 화면만 예시 모드로 바꿉니다.
실제 API 요청이 실패하면 오류·재시도를 제공하며 목업으로 대체하지 않습니다.
실제 응답의 `0`과 빈 목록은 그대로 유지합니다. 예시 데이터는 `src/data/*.mock.ts`에서 수정합니다.
앱 시작 시 비회원 토큰은 발급하지 않으며, 저장된 회원 세션이 없으면 로그인 화면으로 이동합니다.

## API 연결 지점

이메일 인증 요청·확인, 회원가입, 로그인, 토큰 재발급, 로그아웃은 기존 회원 API에 연결되어 있습니다.
`EXPO_PUBLIC_API_BASE_URL`을 설정하고 BE의 `AUTH_ENABLED=true` 및 SMTP 설정을 준비해야 합니다.
앱 시작 시 저장된 회원 세션을 확인하며, 모바일 토큰은 SecureStore에 저장합니다.
인증 관련 자동 검증은 `npm run test:auth`로 실행합니다. 실제 SMTP 발송·수신 확인은 별도로 필요합니다.

설정의 로그아웃은 확인 팝업에서 `로그아웃하기`를 눌렀을 때만 실행합니다. 취소·바깥 영역·뒤로 가기는 팝업만 닫습니다. 처리 중에는 중복 요청과 닫기를 막고, 실패하면 팝업 안에 오류를 표시해 다시 시도할 수 있습니다.

보관함의 전체·저장·내 노트는 달력·목록 API에 연결되어 있습니다. `type=ALL` 목록을 공유하고 저장·내 노트는 받은 목록에서 필터링하므로 필터 전환 시 추가 요청이 없습니다. 날짜 미선택 시 월 전체 기록을 최신순으로 이어 조회하며, `더 보기`로 다음 페이지를 가져옵니다. 필터 건수는 월별 달력 응답을 사용합니다. 보관함에 재진입할 때마다 현재 목록·건수를 유지한 채 서버와 비교하고, 달라진 값만 갱신합니다. 작성 후 돌아오면 새 쪽지가 반영되며 이미 펼친 목록도 첫 페이지로 줄어들지 않습니다. 값이 같으면 배열·카드 참조와 화면을 유지합니다. 백그라운드 복귀 자체는 추가 요청을 만들지 않으며, 당겨서 새로고침도 지원합니다. 친구 노트는 후속 연결 대상입니다. MY·설정과 친구 목록·추가는 실제 회원 API를 사용합니다.

| 화면 | 응답 입력 | 화면 모델 |
| --- | --- | --- |
| 보관함 전체·저장·내 노트 | `GET /users/me/archive/calendar`, `GET /users/me/archive/notes` | [StorageNote](src/types/storage.ts) 배열 |
| 보관함 친구 노트 | 후속 연동 전까지 빈 목록 | [StorageNote](src/types/storage.ts) 배열 |
| MY·설정 | `GET /users/me`, `GET /users/me/stats`, `PATCH /users/me` | [MemberProfile](src/api/auth.ts), [MemberStats](src/api/member.ts) |
| 친구 | `GET /friends`, `POST /friends/invitations`, 초대 확인·수락 API | [FriendProfile](src/types/friends.ts), [친구 API DTO](src/api/friends.ts) |

## 미구현 기능

MY QUEST·MY STICKERS, 알림 설정, 회원 탈퇴, 약관 상세, 친구 소식, 초대 링크 앱 진입은 준비 중입니다.
프로필 편집은 닉네임만 지원하며 프로필 이미지·태그·한 줄 소개 수정은 후속 구현 대상입니다.

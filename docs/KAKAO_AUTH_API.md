# 카카오 로그인·계정 연결 API

관련 이슈 #102. `AUTH_ENABLED=true`, `KAKAO_ENABLED=true`, `KAKAO_APP_ID`(카카오 개발자 콘솔의 숫자 앱 ID)를 설정할 때만 API가 활성화된다. 카카오 앱의 로그인·이메일 제공 동의 설정이 필요하다. 실제 카카오 토큰·모바일 기기 연동은 별도 검증이 필요하다.

클라이언트는 카카오 SDK로 받은 Access Token을 요청 본문의 `accessToken`으로 전송한다. 서버는 카카오 토큰 정보 조회 결과의 앱 ID·만료·회원번호를 검증한다. 토큰은 저장하지 않는다. 카카오 장애 시 503을 반환한다. 응답에는 `Cache-Control: no-store`를 적용한다.

## 로그인

`POST /api/v1/auth/kakao` 본문: `{"accessToken":"<카카오 Access Token>"}`. 연결된 사용자에게 기존 이메일 로그인과 같은 자체 Access·Refresh Token을 반환한다. 연결된 계정이 없으면 `404 KAKAO_ACCOUNT_NOT_LINKED`, 잘못된 토큰은 `401 UNAUTHORIZED`다.

## 신규 가입

`POST /api/v1/auth/kakao/signup` 본문: `{"accessToken":"<카카오 Access Token>","nickname":"닉네임"}`. 카카오가 확인한 이메일 제공 동의가 필요하며 없으면 `400 KAKAO_EMAIL_REQUIRED`다. 닉네임은 공백 제거 후 2~20 코드 포인트·제어 문자 금지다. 성공은 `201`과 자체 토큰 쌍을 반환한다. 이미 가입된 이메일은 자동 연결하지 않고 `409 EMAIL_ALREADY_EXISTS`를 반환한다. 이미 연결된 카카오는 `409 KAKAO_ALREADY_LINKED`다. 비밀번호 없는 카카오 계정은 이메일·비밀번호 로그인에 사용할 수 없다.

## 기존 계정 연결

`POST /api/v1/users/me/auth-accounts/kakao`는 기존 회원 Access Token을 `Authorization` 헤더에, 카카오 Access Token을 본문에 전달한다. 두 계정의 인증을 각각 검증하며 이메일 일치만으로 합치지 않는다. 성공은 `200`과 `data.linked=true`다. 같은 연결 반복도 성공한다. 다른 사용자와 이미 연결됐거나 내 계정에 다른 카카오 계정이 연결됐다면 `409 KAKAO_ALREADY_LINKED`다. 회원 인증 누락·만료는 401이다.

## 제한 및 연동

- 백엔드 API만 포함한다. 모바일 SDK, 화면, 동의 안내와 실제 서비스 계정 통합은 별도다.
- `V13`은 병렬 작업의 `V11`·`V12` 이후에 적용해야 한다. #95·#96 병합 후 Flyway 적용 상태를 재확인한다.
- 카카오 사용자의 탈퇴 시 카카오 연결 해제·외부 해제 웹훅·재시도 정책은 회원 탈퇴 #103에서 확정하고 구현해야 한다. 이 PR은 탈퇴 기능을 제공하지 않는다.
- 인증 API는 IP당 분당 20회 제한이며 기존 단일 서버 메모리 제한기를 사용한다.

참고: [카카오 토큰·사용자 정보 조회](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [카카오 연결 해제](https://developers.kakao.com/docs/ko/kakaologin/common).

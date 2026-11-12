# 공통 UI 모션 가이드

스낵바, 팝업 같은 UI를 추가하거나 수정할 때 아래 기준을 적용한다. 같은 종류의 UI는 화면마다 같은 방향, 순서, 가속 곡선을 사용한다.

## 모션 기준

| UI | 동작 |
| --- | --- |
| 스낵바 | 화면 아래에서 올라올 때 Slide in과 Ease out을 사용한다. 닫힐 때는 화면 아래로 내려가며 Ease in을 사용한다. |
| 토스트 | 표시 위치에서 이동 없이 Fade in과 Fade out을 사용한다. |
| 팝업 | 열릴 때 작은 크기에서 원래 크기로 Scale in하며 Ease out을 사용한다. |
| 바텀시트 | 화면 아래에서 Slide in한다. 배경 오버레이는 동시에 Fade in하며 화면을 어둡게 한다. |
| 좋아요 | 선택 시 아이콘 크기를 Scale과 Spring으로 변화시켜 원래 크기로 돌아오게 한다. |
| 체크박스 | 선택 시 체크 표시의 선을 그리며 Ease in out을 사용한다. |
| 로딩 스피너 | 로딩 중 Linear로 일정한 속도로 회전한다. |
| 제목·설명 | 제목부터 시작해 설명까지 위에서 아래로 한 줄씩 순서대로 표시한다. |

## 적용 원칙

- 같은 동작을 구현할 때 공통 컴포넌트와 모션 설정을 먼저 확인하고 재사용한다.
- 지속 시간, 이동 거리, 스프링 강도, 줄 간 지연은 Android·iOS에서 확인한 뒤 공통 기본값을 정하고 이 문서에 기록한다.
- 시스템의 모션 줄이기 설정을 켜면 이동·확대·반복 회전과 줄 간 지연을 생략한다. 모션 없이도 텍스트, 체크 표시, 로딩 상태를 확인할 수 있게 한다. [Reanimated 접근성 가이드](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)

## 관련 작업

- [공통 UI 모션 적용 #142](https://github.com/ApptiveDev/yeogi-namgim/issues/142)
- [클러스터 및 쪽지 화면 진입 애니메이션 #138](https://github.com/ApptiveDev/yeogi-namgim/issues/138)에서 쪽지 목록·작성 창에 바텀시트 기준을 참고한다.
- [보관함·친구·마이페이지 초기 로딩 스켈레톤 #141](https://github.com/ApptiveDev/yeogi-namgim/issues/141)은 콘텐츠가 들어갈 자리를 보여준다. 로딩 스피너 기준은 새로고침·추가 조회처럼 처리 중임을 표시하는 UI에 적용한다.

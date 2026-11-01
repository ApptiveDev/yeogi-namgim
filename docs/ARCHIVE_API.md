# 회원 보관함 API

관련 이슈: [#94](https://github.com/ApptiveDev/yeogi-namgim/issues/94). 모든 경로는 회원 Access Token이 필요하다. 인증·응답 형식은 [공통 API 계약](BACKEND_API_CONTRACT.md), 저장 동작과 공개 범위는 [저장 API](BOOKMARK_API.md)를 따른다.

`GET /api/v1/users/me/archive/calendar?month=2026-11`은 월별 날짜와 작성·저장 수를 반환한다. 응답 데이터는 `month`, `days: [{date, writtenCount, savedCount}]`다. 날짜는 저장 시각이 아닌 **쪽지 원본 `createdAt`을 `Asia/Seoul`로 변환**해 정한다. 기록이 없는 날짜는 제외한다. 작성 기록과 현재 볼 수 있는 저장 기록을 별도로 센다.

`GET /api/v1/users/me/archive/notes?date=2026-11-02&type=ALL&page=0&size=20`은 해당 날짜의 쪽지를 `createdAt DESC, noteId DESC`로 반환한다. `type`은 `ALL/WRITTEN/SAVED`, 기본값은 `ALL`이다. `WRITTEN`에는 `writtenVisibility=ALL/PUBLIC/FRIENDS/PRIVATE`, `SAVED`에는 `savedCategory=ALL/FRIEND/ANONYMOUS`를 사용할 수 있다. `ALL`이나 다른 유형에 맞지 않는 하위 필터를 보내면 `400 INVALID_REQUEST`다. 기본 페이지는 0, 크기는 20이며 허용 범위는 각각 0~10000, 1~100이다.

저장 분류의 `FRIEND/ANONYMOUS`는 **조회 시점의 현재 친구 관계**로 계산한다. 친구 해제 후 공개 쪽지는 `ANONYMOUS`로 분류되고 더 이상 볼 수 없는 `FRIENDS` 쪽지는 목록과 달력에서 빠진다. 내가 쓴 쪽지는 저장 기록 없이 `WRITTEN`에 포함된다. 보관함 목록 조회는 읽음 기록을 만들지 않는다.

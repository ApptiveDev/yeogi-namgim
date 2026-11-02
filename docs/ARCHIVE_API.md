# 회원 보관함 API

관련 이슈: [#94](https://github.com/ApptiveDev/yeogi-namgim/issues/94). 모든 경로는 회원 Access Token이 필요하다. 인증·응답 형식은 [공통 API 계약](BACKEND_API_CONTRACT.md), 저장 동작과 공개 범위는 [저장 API](BOOKMARK_API.md)를 따른다.

`GET /api/v1/users/me/archive/calendar?month=2026-11`은 월별 날짜와 작성·저장 수를 반환한다. 응답 데이터는 `month`, `days: [{date, writtenCount, savedCount}]`다. 날짜는 저장 시각이 아닌 **쪽지 원본 `createdAt`을 `Asia/Seoul`로 변환**해 정한다. 기록이 없는 날짜는 제외한다. 작성 기록과 현재 볼 수 있는 저장 기록을 별도로 센다.

`GET /api/v1/users/me/archive/notes?date=2026-11-02&type=ALL&size=20`은 해당 날짜의 쪽지를 `createdAt DESC, noteId DESC`로 반환한다. `type`은 `ALL/WRITTEN/SAVED`, 기본값은 `ALL`이다. `WRITTEN`에는 `writtenVisibility=ALL/PUBLIC/FRIENDS/PRIVATE`, `SAVED`에는 `savedCategory=ALL/FRIEND/ANONYMOUS`를 사용할 수 있다. `ALL`이나 다른 유형에 맞지 않는 하위 필터를 보내면 `400 INVALID_REQUEST`다. 기본 크기는 20, 허용 범위는 1~100이다.

목록 응답에는 `notes`, `size`, `hasNext`, `nextCursor`가 있다. 첫 요청에서는 `cursor`를 생략한다. `hasNext=true`이면 `nextCursor`를 그대로 다음 요청의 `cursor`에 넣고 **같은 날짜·유형·하위 필터**를 유지한다. 예: `GET /api/v1/users/me/archive/notes?date=2026-11-02&type=ALL&size=20&cursor=<nextCursor>`. 마지막 페이지는 `hasNext=false`, `nextCursor=null`이다. 커서는 회원·날짜·필터에 묶인 불투명 값이며 다른 조건에서 재사용하거나 잘못된 값을 보내면 `400 INVALID_REQUEST`다. 기존 `page` 파라미터도 `400`으로 거절한다. 정렬 기준이 같은 쪽지는 쪽지 ID 내림차순으로 이어서 조회한다. 새 쪽지가 앞에 추가되어도 이미 받은 커서 뒤의 결과가 밀리지 않는다. 저장 취소·공개 범위·친구 관계 변경은 조회 시점에 다시 적용하므로, 그 사이 볼 수 없게 된 쪽지는 다음 페이지에서 제외된다.

저장 분류의 `FRIEND/ANONYMOUS`는 **조회 시점의 현재 친구 관계**로 계산한다. 친구 해제 후 공개 쪽지는 `ANONYMOUS`로 분류되고 더 이상 볼 수 없는 `FRIENDS` 쪽지는 목록과 달력에서 빠진다. 내가 쓴 쪽지는 저장 기록 없이 `WRITTEN`에 포함된다. 보관함 목록 조회는 읽음 기록을 만들지 않는다.

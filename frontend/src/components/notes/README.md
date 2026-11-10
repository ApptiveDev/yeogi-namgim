# 지도 쪽지 표시

`NoteMapLayer`는 실제 쪽지 배열을 하나의 GeoJSON 소스에 넣고, 원형 레이어와 숫자 레이어로 표시한다. 단일 쪽지도 숫자 `1`이 있는 원으로 표시하며 핀 PNG는 사용하지 않는다.

```tsx
import { NoteMapLayer, type NoteMapItem } from '@/components/notes/NoteMapLayer';

const notes: NoteMapItem[] = [
  { id: 'note-1', latitude: 35.18, longitude: 129.07, isWithinRadius: true },
];

// Map 내부에서 사용한다.
<NoteMapLayer notes={notes} onPointPress={(point) => selectPoint(point)} />
```

- MapLibre가 가까운 쪽지를 클러스터로 묶는다. 일반 원은 파란색이며, 현재 반경 안의 쪽지가 하나 이상 포함된 원은 연두색이다.
- 외곽선을 포함한 지름은 쪽지 수에 따라 44/52/64px이며 숫자는 실제 클러스터 개수를 표시한다.
- `onPointPress`는 중심 좌표와 개수, 클러스터라면 `clusterId`, 단일 쪽지라면 `noteId`를 전달한다. 열람 권한과 확대·목록·상세 이동은 상위 지도 훅에서 처리한다.
- `useNoteMarkers`가 회원 지도 API의 화면 범위 조회를 담당한다. 이 레이어는 인증·거리·공개 범위 판정을 대신하지 않는다.
- 같은 지도에 여러 레이어를 올리면 고유한 `id`를 지정한다. `afterId`는 실제 존재하는 지도 레이어를 참조한다.

공통 스티커·아이콘의 배치와 정리 기준은 [에셋 관리](../../../assets/README.md)를 참고한다.

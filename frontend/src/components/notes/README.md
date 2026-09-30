# 쪽지 마커

`NoteMapLayer`는 지도 안에서 쪽지 배열을 하나의 GeoJSON 소스와 심볼 레이어로 표시합니다.
`NoteMarker`는 카드, 범례 등 일반 화면에서 같은 디자인을 사용하는 이미지 컴포넌트입니다.

```tsx
import { NoteMapLayer, type NoteMapItem } from '@/components/notes/NoteMapLayer';
import { NoteMarker } from '@/components/notes/NoteMarker';

const notes: NoteMapItem[] = [
  { id: 'note-1', latitude: 35.18, longitude: 129.07, state: 'available' },
];

// Existing Map children:
<NoteMapLayer notes={notes} onNotePress={(note) => setSelectedNoteId(note.id)} />

// Cards or legends:
<NoteMarker state="locked" size={56} />
```

| state | 디자인 |
| --- | --- |
| `locked` | 크림색 핀, 갈색 봉투, 우측 상단 잠금 배지 |
| `available` | 노란색 핀, 갈색 봉투 |
| `owned` | 더 큰 주황색 핀, 흰색 봉투 |
| `read` | 회색 핀, 갈색 봉투, 우측 하단 체크 배지 |

상태는 호출하는 화면에서 결정합니다. 컴포넌트는 위치 권한, 거리 계산, 네트워크 요청을 수행하지 않습니다.
API 연결 시 `GET /api/v1/notes`의 `minLatitude`, `minLongitude`, `maxLatitude`,
`maxLongitude`는 현재 지도 사각형 범위를 전달하는 데 사용하고, 응답을 `NoteMapItem[]`로 변환합니다.
현재 홈 화면에 예시 쪽지를 삽입하지 않았습니다.

일반 핀과 내 쪽지 핀은 공통 56×64 이미지 캔버스를 사용하며 내 쪽지의 핀 자체가 더 큽니다.
1x/2x/3x PNG를 함께 제공하므로 화면 밀도에 맞게 표시됩니다. 흰 외곽선, 그림자와 배지는 이미지에 포함됩니다.
핀 끝 좌표에 맞춰 하단 그림자 여백 6을 보정하며 지도 회전에도 아이콘은 정방향을 유지합니다.
기본적으로 겹치는 마커는 숨기고 내 쪽지, 열 수 있는 쪽지 순으로 우선 배치합니다.
모든 핀의 겹침을 허용하려면 `allowOverlap`을 설정합니다. 여러 레이어를 사용하면 고유한 `id`를 지정합니다.
클러스터링과 API 조회는 아직 연결하지 않았습니다.

디자인 수정은 `frontend/scripts/generate-note-markers.cjs`에서 SVG를 수정한 후 실행합니다.
실행 환경에 `sharp`가 필요하지만 앱 런타임에 추가 의존성은 없습니다.
SVG 원본과 PNG는 `frontend/assets/images/note-markers/`에 저장됩니다.

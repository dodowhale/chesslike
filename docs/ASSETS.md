# Asset Specification: Pixel Chess Roguelike

## 1. Visual Style

- **Style**: 16-bit Pixel Art (Cute & Vibrant)
- **Palette**: 명확한 색 대비를 가진 파스텔톤 또는 레트로 팔레트.
- **Tile Size**: 32x32 pixels (Base grid).

## 2. Asset Grouping

에셋은 적용 범위에 따라 그루핑한다.

| 그룹 | 범위 |
|---|---|
| **Global** | 모든 화면 공통 (메뉴, 설정, 사운드) |
| **Classic Common** | 클래식 두 서브모드 공통 (보드, 정규 기물, 평가바) |
| **Classic Single** | 싱글 전용 (사이드 패널, 분석 모드 요소) |
| **Classic Local** | 로컬멀티 전용 (상하 시계, 차례 인디케이터) |
| **Adventure** | 모험 전용 (노드 아이콘, 보스, 캐릭터, 아이템 카드) |

## 3. Global

### Fonts
- **DungGeunMo** 또는 **Galmuri** 등 한글 가독성 좋은 비트맵 폰트.
- 영문 보조 폰트는 동일 톤의 픽셀 폰트.

### UI Primitives
- 9-slice 스케일링 가능한 픽셀 아트 버튼 테두리
- 다이얼로그/모달 프레임
- 토글·슬라이더·드롭다운 (픽셀 스타일)

### SFX (글로벌)
- 메뉴 진입/이탈
- 버튼 클릭/호버
- 알림음

## 4. Classic Common

### Pieces (White & Black, 정규 16종)
- **King**: 왕관 강조, 위엄
- **Queen**: 화려한 장식
- **Rook**: 단단한 성벽
- **Bishop**: 고전적인 사제 모자
- **Knight**: 귀여운 말 머리
- **Pawn**: 작고 아기자기한 병사
- *애니메이션*: Idle, Move, Capture (각 4~8프레임). 클래식에서는 Hit/Death 불필요.

### Boards
- 기본 체커보드 (Wood, Marble, Grass 등 테마별 변형 3종 이상)
- 좌표 표기 (a~h, 1~8) 오버레이
- 합법 수 하이라이트 점/원 마커

### Common UI
- 평가바 (수직, 흑백 그라데이션)
- 기보 패널 배경
- 일시정지/설정 아이콘

### SFX (Classic Common)
- 기물 이동 (딱딱 소리)
- 캡처 (단단한 타격음)
- 체크 (경고음)
- 체크메이트 (강조음)
- 캐슬링 / 승급 (특수음)

## 5. Classic Single

- 사이드 패널 레이아웃(평가바·기보·옵션)
- 힌트 강조 마커 (제안 수 표시용)
- 분석 모드 UI 요소 (MultiPV 화살표, 평가치 라벨)

## 6. Classic Local

- 상하 시계 위젯 (큰 숫자, 잔여 시간 색상 변화)
- 차례 인디케이터 (현재 차례 강조 바)
- 보드 회전 애니메이션 (200ms 트랜지션)
- 무르기/무승부 제안 모달

## 7. Adventure

### Map Icons (노드 종류별)
- ⚔ Battle
- 🛡 Elite (강조된 보더)
- 🛒 Shop
- ❔ Event
- 🛏 Rest
- 👑 Boss (애니메이션 idle)

총 6종. 잠긴 노드, 완료된 노드, 현재 위치 등 상태별 변형 포함.

### Bosses (3종)
- 1막 보스: 적당한 위협감의 디자인
- 2막 보스: 다단계 페이즈 표현 가능한 디자인
- 최종 보스: 비주얼적 임팩트 강조
- *애니메이션*: Idle, Attack, Phase Transition, Defeat

### Characters
- **암살자단**: 다크 톤, 나이트 강조
- **신성단**: 화이트/골드 톤, 비숍·킹 강조
- 캐릭터 초상화 (선택 화면용, 64x64 또는 96x96)
- 추가 캐릭터 해금 슬롯 (placeholder + ?)

### Item Cards
- 등급별 카드 프레임 4종 (Common 회색 / Uncommon 초록 / Rare 파랑 / Legendary 보라)
- 카테고리별 아이콘 (스탯/효과/패시브)
- 아이템 일러스트 (각 아이템 16x16 또는 32x32)

### Backgrounds
- 막별 배경 3종 (1막: 숲 / 2막: 던전 / 3막: 하늘성)
- 노드 진입 시 줌인 효과용 레이어 분리

### SFX (Adventure 전용)
- 아이템 획득 (반짝이는 소리)
- 노드 진입
- 보스 등장 (드라마틱)
- HP 감소 (둔탁한 충격)
- 캐릭터 사망 (런 종료 신호)
- 별의 조각 적립 (반짝)

## 8. Audio

### BGM
- **Global**: 메인메뉴 (잔잔한 chiptune)
- **Classic**: 평온한 대국 BGM (1~2곡)
- **Adventure**:
  - 막별 BGM 3곡 (분위기 차등: 숲 → 던전 → 하늘성)
  - 보스 전용 BGM 3곡
  - 결과 화면 BGM (승리/패배)

### Voice (옵션)
- 한국어 시스템 사운드 (체크/메이트 알림)
- 캐릭터 보이스 (선택 시 짧은 멘트, 옵션)

## 9. Production Pipeline

- **저작 도구**: Aseprite (스프라이트), GarageBand/BFXR (SFX)
- **포맷**:
  - 이미지: PNG (트루컬러, 알파)
  - 스프라이트시트: Aseprite JSON + PNG
  - 오디오: OGG (BGM), WAV (짧은 SFX)
- **저장소 구조**:
  ```
  assets/
  ├── pieces/           # Classic Common
  ├── boards/           # Classic Common
  ├── ui/
  │   ├── global/
  │   ├── classic-single/
  │   └── classic-local/
  ├── adventure/
  │   ├── map-icons/
  │   ├── bosses/
  │   ├── characters/
  │   ├── items/
  │   └── backgrounds/
  ├── sfx/
  │   ├── global/
  │   ├── classic/
  │   └── adventure/
  └── bgm/
  ```

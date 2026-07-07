# Assets

[docs/ASSETS.md](../../../docs/ASSETS.md)의 디렉토리 구조에 맞춘 정식 에셋 자리.
현재는 `pieces/` 만 placeholder PNG(`scripts/generate-piece-placeholders.ts`)가 채워져 있으며, 나머지는 M5 정식 도트 에셋 작업 시 채운다.

```
assets/
├── pieces/              # 32x32 기물 (현 placeholder)
├── boards/              # 보드 테마 (Default/Forest/Ocean)
├── ui/global/           # 공통 UI 아이콘·버튼
├── ui/classic-single/   # 분석 모드 요소
├── ui/classic-local/    # 시계 위젯 장식 등
├── adventure/nodes/     # 노드 아이콘 (battle/elite/shop/event/rest/boss)
├── adventure/characters/# 캐릭터 초상화 (standard/assassins/saints)
├── adventure/items/     # 아이템 프레임 (Common~Legendary)
└── adventure/boss/      # 보스 스프라이트
```

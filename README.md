# Study VS Game (MVP)

초등학생(방학용) 학습 대결 게임 — 웹 브라우저 1차 버전.

## 구성
- `apps/web`: React(Vite) 프론트
- `apps/server`: Node + Socket.IO 실시간 매칭/방/진행상태

## 로컬 실행
```bash
npm install
npm run dev
```
- web: http://localhost:5173
- server: http://localhost:5174

## 데모 방법
- 브라우저 창 2개(또는 시크릿 창)에서 접속
- 한쪽에서 방 생성 → 코드 복사
- 다른쪽에서 코드로 참가
- 둘 다 READY → 3초 카운트다운 후 시작
- `정답 처리(+1)` 버튼으로 진행률이 올라가며 먼저 완료하면 승리

## 다음 마일스톤
- 정답/오답 패널티 규칙 확정(정답 우선 vs 속도 우선)
- 영어 문제 bank 확장(학년별)
- 랭킹(일/주) + 전적 저장
- 모바일 확장(PWA/Capacitor)

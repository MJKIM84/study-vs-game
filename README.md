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
- 학년/과목별 문제 생성(수학/영어)
- 타이머(제한시간) + 실제 입력 UI
- 동일 문제 시드 공유(서버에서 문제 set 생성/배포)
- 랭킹(일/주) + 전적

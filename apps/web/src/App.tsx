import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";

type RoomPlayer = { id: string; name: string; ready: boolean; correct: number };
type RoomState = {
  code: string;
  players: RoomPlayer[];
  started: boolean;
  totalQuestions: number;
  startAt: number | null;
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:5174";

function App() {
  const socket: Socket = useMemo(() => io(SERVER_URL, { transports: ["websocket"] }), []);

  const [phase, setPhase] = useState<"home" | "lobby" | "playing" | "result">("home");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  useEffect(() => {
    socket.on("room:state", (state: RoomState) => {
      setRoom(state);
      setPhase(state.started ? "playing" : "lobby");
    });

    socket.on("game:countdown", ({ startAt }: { startAt: number }) => {
      const tick = () => {
        const ms = startAt - Date.now();
        setCountdownMs(ms);
        if (ms <= 0) {
          setCountdownMs(null);
        } else {
          requestAnimationFrame(tick);
        }
      };
      tick();
    });

    socket.on("game:finish", ({ winnerId }: { winnerId: string }) => {
      setWinnerId(winnerId);
      setPhase("result");
      setReady(false);
    });

    socket.on("error:toast", ({ message }: { message: string }) => {
      setToast(message);
      setTimeout(() => setToast(null), 2500);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const meId = socket.id;
  const me = room?.players.find((p) => p.id === meId);

  const canAnswer = phase === "playing" && countdownMs === null;

  return (
    <div className="container">
      <header className="header">
        <div>
          <div className="title">Study VS Game (MVP)</div>
          <div className="sub">수학/영어 학습 경쟁 게임 — 웹 1차 버전</div>
        </div>
        <div className="pill">server: {SERVER_URL}</div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {phase === "home" && (
        <section className="card">
          <h2>시작</h2>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                socket.emit("room:create", { totalQuestions: 10 });
                setPhase("lobby");
              }}
            >
              방 만들기 (10문제)
            </button>
            <button
              className="btn"
              onClick={() => {
                socket.emit("room:create", { totalQuestions: 20 });
                setPhase("lobby");
              }}
            >
              방 만들기 (20문제)
            </button>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <input
              className="input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="방 코드 (예: AXKM)"
              maxLength={4}
            />
            <button
              className="btn primary"
              onClick={() => {
                if (!joinCode.trim()) return;
                socket.emit("room:join", { code: joinCode.trim().toUpperCase() });
                setPhase("lobby");
              }}
            >
              참가하기
            </button>
          </div>

          <p className="hint">
            MVP용 데모입니다. 2개 창(또는 시크릿 창)에서 접속하면 VS 느낌을 바로 볼 수 있습니다.
          </p>
        </section>
      )}

      {(phase === "lobby" || phase === "playing" || phase === "result") && room && (
        <section className="card">
          <div className="row between">
            <h2>방 코드: <span className="mono">{room.code}</span></h2>
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard?.writeText(room.code);
                setToast("방 코드 복사됨");
                setTimeout(() => setToast(null), 1500);
              }}
            >
              코드 복사
            </button>
          </div>

          <div className="row between">
            <div>총 문제 수: <b>{room.totalQuestions}</b></div>
            <div className="pill">내 닉네임: <b>{me?.name ?? "..."}</b></div>
          </div>

          <div className="players">
            {room.players.map((p) => (
              <div key={p.id} className={`player ${p.id === meId ? "me" : ""}`}>
                <div className="row between">
                  <div>
                    <div className="pname">{p.name}</div>
                    <div className="psub">정답: {p.correct}/{room.totalQuestions}</div>
                  </div>
                  <div className={`badge ${p.ready ? "ok" : ""}`}>{p.ready ? "READY" : "WAIT"}</div>
                </div>
                <div className="bar">
                  <div className="barFill" style={{ width: `${(p.correct / room.totalQuestions) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {phase === "lobby" && (
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className={`btn primary ${ready ? "ghost" : ""}`}
                onClick={() => {
                  const next = !ready;
                  setReady(next);
                  socket.emit("player:ready", { code: room.code, ready: next });
                }}
                disabled={room.players.length < 2}
              >
                {room.players.length < 2 ? "상대 기다리는 중..." : ready ? "준비 취소" : "준비"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  window.location.reload();
                }}
              >
                나가기(리로드)
              </button>
            </div>
          )}

          {phase === "playing" && (
            <div style={{ marginTop: 12 }}>
              {countdownMs !== null && (
                <div className="countdown">
                  시작까지: <b>{Math.ceil(countdownMs / 1000)}</b>
                </div>
              )}

              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  disabled={!canAnswer}
                  onClick={() => socket.emit("game:answer", { code: room.code, correct: true })}
                >
                  정답 처리(+1) (데모)
                </button>
                <button
                  className="btn"
                  disabled={!canAnswer}
                  onClick={() => socket.emit("game:answer", { code: room.code, correct: false })}
                >
                  오답 (데모)
                </button>
              </div>

              <p className="hint">
                다음 단계: 실제 문제(학년/과목별) 생성 + 타이머 + 입력 UI + 동시 문제 시드 공유.
              </p>
            </div>
          )}

          {phase === "result" && (
            <div style={{ marginTop: 12 }}>
              <div className="result">
                승자: <b>{room.players.find((p) => p.id === winnerId)?.name ?? "(알 수 없음)"}</b>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setWinnerId(null);
                  setPhase("lobby");
                }}
              >
                다시 하기(로비)
              </button>
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <div className="mono">Tip: 두 개의 브라우저 창에서 접속해 READY를 누르면 3초 카운트다운 후 시작합니다.</div>
      </footer>
    </div>
  );
}

export default App;

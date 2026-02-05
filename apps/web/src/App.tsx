import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";

type Grade = 1 | 2 | 3;
type Subject = "math" | "english";
type Semester = 1 | 2 | "all";

type RoomPlayer = {
  id: string;
  name: string;
  ready: boolean;
  correct: number;
  index: number;
};

type RoomState = {
  code: string;
  players: RoomPlayer[];
  started: boolean;
  totalQuestions: number;
  grade: Grade;
  subject: Subject;
  semester: Semester;
  excludeUnitCodes: string[];
  startAt: number | null;
};

type BankMeta = {
  grade: Grade;
  subject: Subject;
  semester: Semester;
  totalQuestions: number;
  units: Array<{ unitCode: string; count: number; tags: string[]; semesters: number[] }>;
};

type Question = { id: string; prompt: string };

type User = { id: string; username: string; nickname: string };

type RatingRow = {
  modeKey: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
};

type LeaderboardRow = {
  user: User;
  wins: number;
  losses: number;
  gamesPlayed: number;
};

type MeStats = {
  ok: true;
  user: User;
  modeKey: string | null;
  totals: { gamesPlayed: number; wins: number; losses: number };
  ratings: RatingRow[];
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:5174";

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("svg_token") ?? "");
  const socket: Socket = useMemo(
    () =>
      io(SERVER_URL, {
        transports: ["websocket"],
        auth: token ? { token } : undefined,
      }),
    [token],
  );

  const [phase, setPhase] = useState<"home" | "lobby" | "playing" | "result">("home");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // auth UI state
  const [meUser, setMeUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [meStats, setMeStats] = useState<MeStats | null>(null);
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[] | null>(null);
  const [myMatches, setMyMatches] = useState<any[] | null>(null);

  // setup choices
  const [grade, setGrade] = useState<Grade>(1);
  const [subject, setSubject] = useState<Subject>("math");
  const [totalQuestions, setTotalQuestions] = useState<10 | 20>(10);
  const [semester, setSemester] = useState<Semester>("all");
  const [excludeUnitCodesText, setExcludeUnitCodesText] = useState("");
  const [bankMeta, setBankMeta] = useState<BankMeta | null>(null);

  // lobby/game state
  const [ready, setReady] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [timeLimitSec, setTimeLimitSec] = useState<number>(60);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  const [answer, setAnswer] = useState("");
  const [localIndex, setLocalIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutSentRef = useRef(false);

  useEffect(() => {
    // refresh /me when socket (token) changes
    fetch(`${SERVER_URL}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => r.json())
      .then((j) => setMeUser(j.user ?? null))
      .catch(() => setMeUser(null));

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

    socket.on(
      "game:questions",
      ({ questions, timeLimitSec }: { questions: Question[]; timeLimitSec: number }) => {
        setQuestions(questions);
        setTimeLimitSec(timeLimitSec);
        setLocalIndex(0);
        setAnswer("");
        timeoutSentRef.current = false;
      },
    );

    socket.on("queue:matched", ({ code }: { code: string }) => {
      setJoinCode(code);
      setToast(`매칭 완료: ${code}`);
      setTimeout(() => setToast(null), 2000);
    });

    socket.on("game:finish", ({ winnerId }: { winnerId: string | null }) => {
      setWinnerId(winnerId);
      setPhase("result");
      setReady(false);
      setTimeLeftMs(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    });

    socket.on("error:toast", ({ message }: { message: string }) => {
      setToast(message);
      setTimeout(() => setToast(null), 2500);
    });

    return () => {
      socket.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [socket, token]);

  // Fetch bank meta for exclude-by-checkbox UI
  useEffect(() => {
    const ac = new AbortController();
    const url = new URL(`${SERVER_URL}/bank/meta`);
    url.searchParams.set("grade", String(grade));
    url.searchParams.set("subject", subject);
    url.searchParams.set("semester", String(semester));

    fetch(url.toString(), { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: BankMeta) => setBankMeta(j))
      .catch(() => {
        // ignore abort/errors for MVP
      });

    return () => ac.abort();
  }, [grade, subject, semester]);

  // Fetch leaderboard for current mode (read-only)
  useEffect(() => {
    const ac = new AbortController();
    const url = new URL(`${SERVER_URL}/leaderboard`);
    url.searchParams.set("grade", String(grade));
    url.searchParams.set("subject", subject);
    url.searchParams.set("semester", String(semester));
    url.searchParams.set("totalQuestions", String(totalQuestions));

    fetch(url.toString(), { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => setLeaderboardRows(j.rows ?? []))
      .catch(() => setLeaderboardRows(null));

    return () => ac.abort();
  }, [grade, subject, semester, totalQuestions]);

  // Fetch my stats for current mode (only after result)
  useEffect(() => {
    if (!token) {
      setMeStats(null);
      return;
    }
    if (phase !== "result") return;

    const mk = `${subject}:g${grade}:sem${semester}:q${totalQuestions}`;
    const ac = new AbortController();

    fetch(`${SERVER_URL}/me/stats?modeKey=${encodeURIComponent(mk)}`, {
      signal: ac.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: MeStats) => setMeStats(j))
      .catch(() => setMeStats(null));

    return () => ac.abort();
  }, [token, phase, grade, subject, semester, totalQuestions]);

  // Fetch my recent matches (after login)
  useEffect(() => {
    if (!token) {
      setMyMatches(null);
      return;
    }
    const ac = new AbortController();

    fetch(`${SERVER_URL}/me/matches?limit=10`, {
      signal: ac.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => setMyMatches(j.rows ?? []))
      .catch(() => setMyMatches(null));

    return () => ac.abort();
  }, [token]);

  // overall timer: starts when countdown ends
  useEffect(() => {
    if (!room || phase !== "playing") return;
    if (countdownMs !== null) return;
    if (!room.startAt) return;

    const endAt = room.startAt + timeLimitSec * 1000;

    const tick = () => {
      const ms = endAt - Date.now();
      setTimeLeftMs(ms);
      if (ms <= 0) {
        setTimeLeftMs(0);
        if (!timeoutSentRef.current) {
          timeoutSentRef.current = true;
          socket.emit("game:timeout", { code: room.code });
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [room?.code, room?.startAt, phase, countdownMs, timeLimitSec, socket]);

  const meId = socket.id;
  const me = room?.players.find((p) => p.id === meId);
  const canAnswer =
    phase === "playing" &&
    countdownMs === null &&
    timeLeftMs !== null &&
    timeLeftMs > 0 &&
    !!questions &&
    localIndex < (room?.totalQuestions ?? 0);

  const current = questions?.[localIndex] ?? null;

  function parseExcludeUnitCodes(): string[] {
    return excludeUnitCodesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function toggleExclude(unitCode: string) {
    const set = new Set(parseExcludeUnitCodes());
    if (set.has(unitCode)) set.delete(unitCode);
    else set.add(unitCode);
    setExcludeUnitCodesText([...set].join(","));
  }

  function createRoom() {
    socket.emit("room:create", {
      totalQuestions,
      grade,
      subject,
      semester,
      excludeUnitCodes: parseExcludeUnitCodes(),
    });
    setPhase("lobby");
  }

  function quickMatch() {
    socket.emit("queue:join", { totalQuestions, grade, subject });
    setToast("매칭 대기중...");
    setTimeout(() => setToast(null), 2000);
  }

  function submitAnswer() {
    if (!room || !current) return;

    socket.emit("game:submit", {
      code: room.code,
      qi: localIndex,
      answer,
    });

    setLocalIndex((i) => i + 1);
    setAnswer("");
  }

  async function submitAuth() {
    try {
      const endpoint = authMode === "signup" ? "/auth/signup" : "/auth/login";
      const body: any = { username, password };
      if (authMode === "signup") body.nickname = nickname || username;

      const r = await fetch(`${SERVER_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setToast(`인증 실패: ${j.error ?? r.status}`);
        setTimeout(() => setToast(null), 2500);
        return;
      }

      localStorage.setItem("svg_token", j.token);
      setToken(j.token);
      setMeUser(j.user);
      setPassword("");
      setToast("로그인 완료");
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("인증 실패");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function logout() {
    localStorage.removeItem("svg_token");
    setToken("");
    setMeUser(null);
    setToast("로그아웃");
    setTimeout(() => setToast(null), 1500);
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <div className="title">Study VS Game (MVP)</div>
          <div className="sub">1~3학년 · 수학/영어 · 익명 VS</div>
        </div>
        <div className="pill">server: {SERVER_URL}</div>
      </header>

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>계정</strong>: {meUser ? `${meUser.nickname} (@${meUser.username})` : "익명"}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {meUser ? (
              <button className="btn" onClick={logout}>
                로그아웃
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => setAuthMode("login")}>
                  로그인
                </button>
                <button className="btn" onClick={() => setAuthMode("signup")}>
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>

        {meUser && myMatches && (
          <div style={{ marginTop: 10 }}>
            <div className="hint">최근 경기(내가 만든 방 기준, MVP)</div>
            <ol className="mono" style={{ marginTop: 6 }}>
              {myMatches.slice(0, 10).map((m: any) => (
                <li key={m.id}>
                  {new Date(m.createdAt).toLocaleString()} — {m.modeKey} — winner: {m.winnerUserId ?? "draw/anon"}
                </li>
              ))}
            </ol>
          </div>
        )}

        {!meUser && (
          <div style={{ marginTop: 10 }}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="input"
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {authMode === "signup" && (
                <input
                  className="input"
                  placeholder="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              )}
              <button className="btn primary" onClick={submitAuth}>
                {authMode === "signup" ? "가입" : "로그인"}
              </button>
            </div>
          </div>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}

      {phase === "home" && (
        <section className="card">
          <h2>게임 설정</h2>

          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <div className="pill">
              학년:
              <select
                className="select"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value) as Grade)}
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>

            <div className="pill">
              과목:
              <select
                className="select"
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                <option value="math">수학</option>
                <option value="english">영어</option>
              </select>
            </div>

            <div className="pill">
              문제 수:
              <select
                className="select"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value) as 10 | 20)}
              >
                <option value={10}>10문제</option>
                <option value={20}>20문제</option>
              </select>
            </div>

            <div className="pill">
              학기:
              <select
                className="select"
                value={semester}
                onChange={(e) => setSemester((e.target.value as unknown) as Semester)}
              >
                <option value="all">전체</option>
                <option value={1}>1학기</option>
                <option value={2}>2학기</option>
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <input
              className="input"
              value={excludeUnitCodesText}
              onChange={(e) => setExcludeUnitCodesText(e.target.value)}
              placeholder="제외 unitCode(쉼표로 구분) 예: M1-1-01,E2-2-01"
            />
          </div>

          {leaderboardRows && (
            <div style={{ marginTop: 12 }}>
              <div className="hint">리더보드(현재 설정 모드)</div>
              <ol className="mono" style={{ marginTop: 6 }}>
                {leaderboardRows.slice(0, 10).map((r, idx) => (
                  <li key={r.user.id}>
                    #{idx + 1} {r.user.nickname} — {r.wins}W/{r.losses}L ({r.gamesPlayed})
                  </li>
                ))}
              </ol>
            </div>
          )}

          {bankMeta && bankMeta.units.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="hint">체크해서 제외(unitCode):</div>
              <div className="row" style={{ marginTop: 6, gap: 8, flexWrap: "wrap" }}>
                {bankMeta.units.map((u) => {
                  const checked = parseExcludeUnitCodes().includes(u.unitCode);
                  return (
                    <label key={u.unitCode} className="pill" style={{ cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExclude(u.unitCode)}
                        style={{ marginRight: 6 }}
                      />
                      {u.unitCode} ({u.count})
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={createRoom}>
              방 만들기
            </button>
            <button className="btn" onClick={quickMatch}>
              빠른 매칭
            </button>
          </div>

          <p className="hint" style={{ marginTop: 10 }}>
            빠른 매칭: 같은 설정(학년/과목/문제수)으로 대기 중인 상대와 자동으로 방이 생성됩니다.
          </p>

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
            데모: 브라우저 2개 창에서 접속 → 방코드 공유 → 둘 다 READY → 문제 풀기
          </p>
        </section>
      )}

      {(phase === "lobby" || phase === "playing" || phase === "result") && room && (
        <section className="card">
          <div className="row between">
            <h2>
              방 코드: <span className="mono">{room.code}</span>
            </h2>
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

          <div className="row between" style={{ marginTop: 8, flexWrap: "wrap" }}>
            <div>
              설정: <b>{room.grade}학년</b> · <b>{room.subject === "math" ? "수학" : "영어"}</b> ·{" "}
              <b>{room.totalQuestions}</b>문제 · <b>{room.semester === "all" ? "전체" : `${room.semester}학기`}</b>
            </div>
            <div className="pill">내 닉네임: <b>{me?.name ?? "..."}</b></div>
          </div>

          <div className="players">
            {room.players.map((p) => (
              <div key={p.id} className={`player ${p.id === meId ? "me" : ""}`}>
                <div className="row between">
                  <div>
                    <div className="pname">{p.name}</div>
                    <div className="psub">
                      진행: {p.index}/{room.totalQuestions} · 정답: {p.correct}
                    </div>
                  </div>
                  <div className={`badge ${p.ready ? "ok" : ""}`}>{p.ready ? "READY" : "WAIT"}</div>
                </div>
                <div className="bar">
                  <div className="barFill" style={{ width: `${(p.index / room.totalQuestions) * 100}%` }} />
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
              <button className="btn" onClick={() => window.location.reload()}>
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

              {timeLeftMs !== null && (
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="pill">
                    남은 시간: <b>{Math.max(0, Math.ceil(timeLeftMs / 1000))}</b>s
                  </div>
                  <div className="pill">
                    내 진행: <b>{localIndex}</b>/{room.totalQuestions}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }} className="qbox">
                <div className="qprompt">
                  Q{localIndex + 1}. {current?.prompt ?? "문제 불러오는 중..."}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={room.subject === "math" ? "정답(숫자)" : "정답(영어)"}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAnswer) submitAnswer();
                    }}
                    disabled={!canAnswer}
                  />
                  <button className="btn primary" disabled={!canAnswer} onClick={submitAnswer}>
                    제출
                  </button>
                </div>
                <div className="hint">
                  MVP 규칙: 서버가 정답 검증 → 정답 수 우선, 동점이면 마지막 제출이 더 빠른 쪽 승(완전 동률 무승부)
                </div>
              </div>
            </div>
          )}

          {phase === "result" && (
            <div style={{ marginTop: 12 }}>
              <div className="result">
                결과: {winnerId ? (
                  <b>{room.players.find((p) => p.id === winnerId)?.name ?? "(알 수 없음)"} 승</b>
                ) : (
                  <b>무승부</b>
                )}
              </div>

              {meUser && meStats?.ok && (
                <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <div className="pill">
                    내 전적(이 모드): <b>{meStats.totals.wins}</b>승 <b>{meStats.totals.losses}</b>패 ·
                    <b> {meStats.totals.gamesPlayed}</b>게임
                  </div>
                </div>
              )}

              {leaderboardRows && leaderboardRows.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="hint">리더보드(현재 설정 모드)</div>
                  <ol className="mono" style={{ marginTop: 6 }}>
                    {leaderboardRows.slice(0, 10).map((r, idx) => (
                      <li key={r.user.id}>
                        #{idx + 1} {r.user.nickname} — {r.wins}W/{r.losses}L ({r.gamesPlayed})
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <button
                className="btn primary"
                onClick={() => {
                  setWinnerId(null);
                  setQuestions(null);
                  setLocalIndex(0);
                  setAnswer("");
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
        <div className="mono">
          Tip: 2개 창에서 같은 방에 들어간 뒤 READY → 문제 세트 공유 → 제한시간 내 경쟁
        </div>
      </footer>
    </div>
  );
}

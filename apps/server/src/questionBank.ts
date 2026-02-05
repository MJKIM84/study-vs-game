export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Subject = "math" | "english";

export type Semester = 1 | 2;

export type BankQuestion = {
  id: string;
  prompt: string;
  answer: string;
  // unitCode: e.g. M1-1-01 (Math grade1 semester1 unit01)
  unitCode: string;
  semester: Semester;
  tags: string[];
};

export type QuestionBank = {
  math: Record<Grade, BankQuestion[]>;
  english: Record<Grade, BankQuestion[]>;
};

// Generated (deterministic) bank for MVP. Safe, non-copyrighted, short prompts.
// This is intentionally simple and expandable.
export const QUESTION_BANK: QuestionBank = {
  math: {
    1: genMath1(),
    2: genMath2(),
    3: genMath3(),
    4: genMath4(),
    5: genMath5(),
    6: genMath6(),
  },
  english: {
    1: genEnglish1(),
    2: genEnglish2(),
    3: genEnglish3(),
    4: genEnglish4(),
    5: genEnglish5(),
    6: genEnglish6(),
  },
};

function pad(n: number) {
  return String(n).padStart(3, "0");
}

function genMath1(): BankQuestion[] {
  // grade1: addition within 20 (mostly)
  const out: BankQuestion[] = [];
  let i = 1;
  for (let a = 1; a <= 10 && out.length < 40; a++) {
    for (let b = 1; b <= 10 && out.length < 40; b++) {
      const sem: Semester = a <= 5 ? 1 : 2;
      const unit = sem === 1 ? "01" : "02";
      out.push({
        id: `m1-${pad(i++)}`,
        prompt: `${a} + ${b} = ?`,
        answer: String(a + b),
        semester: sem,
        unitCode: `M1-${sem}-${unit}`,
        tags: ["add"],
      });
    }
  }
  return out;
}

function genMath2(): BankQuestion[] {
  // grade2: add/sub within 100
  const out: BankQuestion[] = [];
  let i = 1;
  // 20 add
  for (let a = 12; a <= 50 && out.length < 20; a += 2) {
    const b = 11 + (a % 9);
    out.push({
      id: `m2-${pad(i++)}`,
      prompt: `${a} + ${b} = ?`,
      answer: String(a + b),
      semester: 1,
      unitCode: "M2-1-01",
      tags: ["add"],
    });
  }
  // 20 sub
  for (let a = 30; out.length < 40; a += 3) {
    const b = 7 + (a % 13);
    const A = Math.min(100, a);
    const B = Math.min(A - 1, b);
    out.push({
      id: `m2-${pad(i++)}`,
      prompt: `${A} - ${B} = ?`,
      answer: String(A - B),
      semester: 2,
      unitCode: "M2-2-01",
      tags: ["sub"],
    });
  }
  return out;
}

function genMath3(): BankQuestion[] {
  // grade3: multiplication table (2~9) + integer division
  const out: BankQuestion[] = [];
  let i = 1;
  // 28 mul (2..9 x 2..9) but stop at 28 to leave room for division
  for (let a = 2; a <= 9 && out.length < 28; a++) {
    for (let b = 2; b <= 9 && out.length < 28; b++) {
      out.push({
        id: `m3-${pad(i++)}`,
        prompt: `${a} × ${b} = ?`,
        answer: String(a * b),
        semester: 1,
        unitCode: "M3-1-01",
        tags: ["mul"],
      });
    }
  }
  // 12 div (clean integer results)
  const divPairs: Array<[number, number]> = [
    [12, 2],
    [18, 3],
    [20, 4],
    [35, 5],
    [42, 6],
    [56, 7],
    [48, 8],
    [63, 9],
    [36, 4],
    [54, 6],
    [72, 8],
    [81, 9],
  ];
  for (const [A, B] of divPairs) {
    out.push({
      id: `m3-${pad(i++)}`,
      prompt: `${A} ÷ ${B} = ?`,
      answer: String(A / B),
      semester: 2,
      unitCode: "M3-2-01",
      tags: ["div"],
    });
  }
  return out.slice(0, 40);
}

function genEnglish1(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["사과", "apple", ["vocab", "fruit"]],
    ["고양이", "cat", ["vocab", "animal"]],
    ["개", "dog", ["vocab", "animal"]],
    ["물", "water", ["vocab", "nature"]],
    ["책", "book", ["vocab", "school"]],
    ["연필", "pencil", ["vocab", "school"]],
    ["하나", "one", ["vocab", "number"]],
    ["둘", "two", ["vocab", "number"]],
    ["셋", "three", ["vocab", "number"]],
    ["빨간색", "red", ["vocab", "color"]],
    ["파란색", "blue", ["vocab", "color"]],
    ["노란색", "yellow", ["vocab", "color"]],
    ["초록색", "green", ["vocab", "color"]],
    ["엄마", "mom", ["vocab", "family"]],
    ["아빠", "dad", ["vocab", "family"]],
    ["집", "house", ["vocab", "place"]],
    ["문", "door", ["vocab", "object"]],
    ["컵", "cup", ["vocab", "object"]],
    ["모자", "hat", ["vocab", "clothing"]],
    ["가방", "bag", ["vocab", "object"]],
  ];

  // repeat with slight variations to reach 40 (MVP only)
  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e1-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E1-1-01" : "E1-2-01",
        tags,
      });
    }
  }
  return out;
}

function genEnglish2(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["토끼", "rabbit", ["vocab", "animal"]],
    ["거북이", "turtle", ["vocab", "animal"]],
    ["호랑이", "tiger", ["vocab", "animal"]],
    ["사자", "lion", ["vocab", "animal"]],
    ["원숭이", "monkey", ["vocab", "animal"]],
    ["바나나", "banana", ["vocab", "fruit"]],
    ["포도", "grape", ["vocab", "fruit"]],
    ["딸기", "strawberry", ["vocab", "fruit"]],
    ["학교", "school", ["vocab", "place"]],
    ["선생님", "teacher", ["vocab", "people"]],
    ["친구", "friend", ["vocab", "people"]],
    ["봄", "spring", ["vocab", "season"]],
    ["여름", "summer", ["vocab", "season"]],
    ["가을", "fall", ["vocab", "season"]],
    ["겨울", "winter", ["vocab", "season"]],
    ["월요일", "monday", ["vocab", "day"]],
    ["일요일", "sunday", ["vocab", "day"]],
    ["책상", "desk", ["vocab", "object"]],
    ["의자", "chair", ["vocab", "object"]],
    ["창문", "window", ["vocab", "object"]],
  ];

  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e2-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E2-1-01" : "E2-2-01",
        tags,
      });
    }
  }
  return out;
}

function genEnglish3(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["도서관", "library", ["vocab", "place"]],
    ["병원", "hospital", ["vocab", "place"]],
    ["공항", "airport", ["vocab", "place"]],
    ["식당", "restaurant", ["vocab", "place"]],
    ["우산", "umbrella", ["vocab", "object"]],
    ["지우개", "eraser", ["vocab", "school"]],
    ["가위", "scissors", ["vocab", "object"]],
    ["거울", "mirror", ["vocab", "object"]],
    ["수요일", "wednesday", ["vocab", "day"]],
    ["목요일", "thursday", ["vocab", "day"]],
    ["금요일", "friday", ["vocab", "day"]],
    ["토요일", "saturday", ["vocab", "day"]],
    ["1월", "january", ["vocab", "month"]],
    ["3월", "march", ["vocab", "month"]],
    ["8월", "august", ["vocab", "month"]],
    ["12월", "december", ["vocab", "month"]],
    ["기린", "giraffe", ["vocab", "animal"]],
    ["펭귄", "penguin", ["vocab", "animal"]],
    ["돌고래", "dolphin", ["vocab", "animal"]],
    ["다람쥐", "squirrel", ["vocab", "animal"]],
  ];

  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e3-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E3-1-01" : "E3-2-01",
        tags,
      });
    }
  }
  return out;
}

function genMath4(): BankQuestion[] {
  const out: BankQuestion[] = [];
  let i = 1;

  for (let a = 120; a <= 180 && out.length < 20; a += 3) {
    const b = 100 + ((a * 7) % 80);
    out.push({
      id: `m4-${pad(i++)}`,
      prompt: `${a} + ${b} = ?`,
      answer: String(a + b),
      semester: 1,
      unitCode: `M4-1-01`,
      tags: ["add", "multi-digit"],
    });
  }
  for (let a = 300; a <= 360 && out.length < 20; a += 4) {
    const b = 120 + ((a * 5) % 100);
    out.push({
      id: `m4-${pad(i++)}`,
      prompt: `${a} - ${b} = ?`,
      answer: String(a - b),
      semester: 1,
      unitCode: `M4-1-02`,
      tags: ["sub", "multi-digit"],
    });
  }

  while (out.length < 40) {
    const a = 12 + (out.length % 18);
    const b = 3 + (out.length % 7);
    out.push({
      id: `m4-${pad(i++)}`,
      prompt: `${a} × ${b} = ?`,
      answer: String(a * b),
      semester: 2,
      unitCode: `M4-2-01`,
      tags: ["mul"],
    });
    if (out.length >= 40) break;
    out.push({
      id: `m4-${pad(i++)}`,
      prompt: `${a * b} ÷ ${b} = ?`,
      answer: String(a),
      semester: 2,
      unitCode: `M4-2-02`,
      tags: ["div"],
    });
  }
  return out.slice(0, 40);
}

function genMath5(): BankQuestion[] {
  const out: BankQuestion[] = [];
  let i = 1;

  for (let a = 1200; a <= 2000 && out.length < 20; a += 37) {
    const b = 900 + ((a * 11) % 700);
    out.push({
      id: `m5-${pad(i++)}`,
      prompt: `${a} + ${b} = ?`,
      answer: String(a + b),
      semester: 1,
      unitCode: `M5-1-01`,
      tags: ["add", "multi-digit"],
    });
  }

  while (out.length < 40) {
    const x = 10 + (out.length % 30);
    const y = (out.length % 10) / 10;
    const a = Number((x + y).toFixed(1));
    const b = Number(((x % 7) + ((out.length + 3) % 10) / 10).toFixed(1));

    out.push({
      id: `m5-${pad(i++)}`,
      prompt: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`,
      answer: (a + b).toFixed(1),
      semester: 2,
      unitCode: `M5-2-01`,
      tags: ["decimal", "add"],
    });
    if (out.length >= 40) break;

    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    out.push({
      id: `m5-${pad(i++)}`,
      prompt: `${hi.toFixed(1)} - ${lo.toFixed(1)} = ?`,
      answer: (hi - lo).toFixed(1),
      semester: 2,
      unitCode: `M5-2-02`,
      tags: ["decimal", "sub"],
    });
  }

  return out.slice(0, 40);
}

function genMath6(): BankQuestion[] {
  const out: BankQuestion[] = [];
  let i = 1;

  const percents = [10, 20, 25, 50];
  for (let base = 80; base <= 200 && out.length < 20; base += 10) {
    const p = percents[out.length % percents.length];
    out.push({
      id: `m6-${pad(i++)}`,
      prompt: `${base}의 ${p}% = ?`,
      answer: String((base * p) / 100),
      semester: 1,
      unitCode: `M6-1-01`,
      tags: ["percent"],
    });
  }

  while (out.length < 40) {
    const a = 50 + (out.length % 50);
    const b = 12 + (out.length % 20);
    const c = 3 + (out.length % 7);
    out.push({
      id: `m6-${pad(i++)}`,
      prompt: `(${a} + ${b}) × ${c} = ?`,
      answer: String((a + b) * c),
      semester: 2,
      unitCode: `M6-2-01`,
      tags: ["mixed"],
    });
  }

  return out.slice(0, 40);
}

function genEnglish4(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["아침", "breakfast", ["vocab", "food"]],
    ["점심", "lunch", ["vocab", "food"]],
    ["저녁", "dinner", ["vocab", "food"]],
    ["시간", "time", ["vocab"]],
    ["날씨", "weather", ["vocab"]],
    ["사과", "apple", ["vocab", "fruit"]],
    ["오렌지", "orange", ["vocab", "fruit"]],
    ["포크", "fork", ["vocab", "object"]],
    ["숟가락", "spoon", ["vocab", "object"]],
    ["접시", "plate", ["vocab", "object"]],
    ["우유", "milk", ["vocab", "drink"]],
    ["물", "water", ["vocab", "drink"]],
    ["빨강", "red", ["vocab", "color"]],
    ["파랑", "blue", ["vocab", "color"]],
    ["초록", "green", ["vocab", "color"]],
    ["노랑", "yellow", ["vocab", "color"]],
    ["아름다운", "beautiful", ["vocab", "adj"]],
    ["빠른", "fast", ["vocab", "adj"]],
    ["느린", "slow", ["vocab", "adj"]],
    ["조용한", "quiet", ["vocab", "adj"]],
  ];

  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e4-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E4-1-01" : "E4-2-01",
        tags,
      });
    }
  }
  return out;
}

function genEnglish5(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["환경", "environment", ["vocab"]],
    ["미래", "future", ["vocab"]],
    ["과학", "science", ["vocab"]],
    ["역사", "history", ["vocab"]],
    ["중요한", "important", ["vocab", "adj"]],
    ["필요한", "necessary", ["vocab", "adj"]],
    ["다른", "different", ["vocab", "adj"]],
    ["비슷한", "similar", ["vocab", "adj"]],
    ["문제", "problem", ["vocab"]],
    ["해결", "solution", ["vocab"]],
    ["연습", "practice", ["vocab"]],
    ["경험", "experience", ["vocab"]],
    ["선택", "choice", ["vocab"]],
    ["계획", "plan", ["vocab"]],
    ["여행", "travel", ["vocab"]],
    ["건강", "health", ["vocab"]],
    ["에너지", "energy", ["vocab"]],
    ["인터넷", "internet", ["vocab"]],
    ["기술", "technology", ["vocab"]],
    ["안전", "safety", ["vocab"]],
  ];

  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e5-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E5-1-01" : "E5-2-01",
        tags,
      });
    }
  }
  return out;
}

function genEnglish6(): BankQuestion[] {
  const items: Array<[string, string, string[]]> = [
    ["정확한", "accurate", ["vocab", "adj"]],
    ["가능한", "possible", ["vocab", "adj"]],
    ["불가능한", "impossible", ["vocab", "adj"]],
    ["정직한", "honest", ["vocab", "adj"]],
    ["용기", "courage", ["vocab"]],
    ["성공", "success", ["vocab"]],
    ["실패", "failure", ["vocab"]],
    ["목표", "goal", ["vocab"]],
    ["도전", "challenge", ["vocab"]],
    ["결과", "result", ["vocab"]],
    ["관계", "relationship", ["vocab"]],
    ["의견", "opinion", ["vocab"]],
    ["토론", "discussion", ["vocab"]],
    ["공정한", "fair", ["vocab", "adj"]],
    ["불공정한", "unfair", ["vocab", "adj"]],
    ["책임", "responsibility", ["vocab"]],
    ["기회", "opportunity", ["vocab"]],
    ["발명", "invention", ["vocab"]],
    ["발견", "discovery", ["vocab"]],
    ["지식", "knowledge", ["vocab"]],
  ];

  const out: BankQuestion[] = [];
  let i = 1;
  while (out.length < 40) {
    for (const [ko, en, tags] of items) {
      if (out.length >= 40) break;
      out.push({
        id: `e6-${pad(i++)}`,
        prompt: `'${ko}'를 영어로 쓰세요`,
        answer: en,
        semester: out.length < 20 ? 1 : 2,
        unitCode: out.length < 20 ? "E6-1-01" : "E6-2-01",
        tags,
      });
    }
  }
  return out;
}

export type Grade = 1 | 2 | 3;
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
  },
  english: {
    1: genEnglish1(),
    2: genEnglish2(),
    3: genEnglish3(),
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

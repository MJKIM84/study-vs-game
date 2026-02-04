import bank from "../data/questionBank.v1.json";

type Bank = typeof bank;

function main() {
  const b: Bank = bank as any;

  const ids = new Set<string>();
  const dups: string[] = [];
  const unitCounts = new Map<string, number>();
  const semCounts = new Map<string, number>();

  let total = 0;

  for (const subject of ["math", "english"] as const) {
    for (const grade of ["1", "2", "3"] as const) {
      const arr = (b.bank as any)[subject][grade] as any[];
      for (const q of arr) {
        total += 1;
        if (ids.has(q.id)) dups.push(q.id);
        ids.add(q.id);

        unitCounts.set(q.unitCode, (unitCounts.get(q.unitCode) ?? 0) + 1);
        const sk = `${subject}:${grade}:S${q.semester}`;
        semCounts.set(sk, (semCounts.get(sk) ?? 0) + 1);

        // basic shape checks
        if (typeof q.answer !== "string") throw new Error(`answer not string: ${q.id}`);
        if (!String(q.prompt ?? "").trim()) throw new Error(`empty prompt: ${q.id}`);
        if (!String(q.unitCode ?? "").trim()) throw new Error(`empty unitCode: ${q.id}`);
      }
    }
  }

  const topUnits = [...unitCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  console.log(JSON.stringify({
    version: b.version,
    generatedAt: b.generatedAt,
    total,
    uniqueIds: ids.size,
    duplicateIds: dups.length,
    semCounts: Object.fromEntries([...semCounts.entries()].sort()),
    topUnitCodes: topUnits,
  }, null, 2));
}

main();

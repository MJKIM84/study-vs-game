import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reuse current TS-generated bank as source-of-truth for v1 JSON
import { QUESTION_BANK } from "../questionBank.js";
import { QuestionBankSchema } from "../bankSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const out = {
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    bank: {
      math: {
        1: QUESTION_BANK.math[1],
        2: QUESTION_BANK.math[2],
        3: QUESTION_BANK.math[3],
        4: QUESTION_BANK.math[4],
        5: QUESTION_BANK.math[5],
        6: QUESTION_BANK.math[6],
      },
      english: {
        1: QUESTION_BANK.english[1],
        2: QUESTION_BANK.english[2],
        3: QUESTION_BANK.english[3],
        4: QUESTION_BANK.english[4],
        5: QUESTION_BANK.english[5],
        6: QUESTION_BANK.english[6],
      },
    },
  };

  // Validate before writing
  QuestionBankSchema.parse(out);

  const filePath = path.join(__dirname, "..", "data", "questionBank.v1.json");
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`[bank] wrote ${filePath}`);
}

main();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuestionBankSchema, type QuestionBankFile } from "./bankSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadQuestionBank(): QuestionBankFile {
  const filePath = path.join(__dirname, "data", "questionBank.v1.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  return QuestionBankSchema.parse(json);
}

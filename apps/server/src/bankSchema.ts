import { z } from "zod";

export const GradeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
export type Grade = z.infer<typeof GradeSchema>;

export const SubjectSchema = z.union([z.literal("math"), z.literal("english")]);
export type Subject = z.infer<typeof SubjectSchema>;

export const SemesterSchema = z.union([z.literal(1), z.literal(2)]);
export type Semester = z.infer<typeof SemesterSchema>;

export const BankQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  answer: z.string(),
  unitCode: z.string(),
  semester: SemesterSchema,
  tags: z.array(z.string()),
});
export type BankQuestion = z.infer<typeof BankQuestionSchema>;

export const QuestionBankSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  bank: z.object({
    math: z.object({
      1: z.array(BankQuestionSchema),
      2: z.array(BankQuestionSchema),
      3: z.array(BankQuestionSchema),
      4: z.array(BankQuestionSchema),
      5: z.array(BankQuestionSchema),
      6: z.array(BankQuestionSchema),
    }),
    english: z.object({
      1: z.array(BankQuestionSchema),
      2: z.array(BankQuestionSchema),
      3: z.array(BankQuestionSchema),
      4: z.array(BankQuestionSchema),
      5: z.array(BankQuestionSchema),
      6: z.array(BankQuestionSchema),
    }),
  }),
});

export type QuestionBankFile = z.infer<typeof QuestionBankSchema>;

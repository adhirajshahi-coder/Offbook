"use server";

import type { AnswerResult, QuestionPayload } from "@/app/play/learn/actions";
import { requireStaff } from "@/lib/auth";
import { checkAnswer, toClient, type QuestionRow, type Response } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";

/**
 * Preview-as-student (PRD §10.2): the real lesson player, but nothing is
 * recorded and draft questions are included so staff can check them.
 */

const COLUMNS = "id, type, prompt, options, answer, explanation, hint1, hint2, difficulty, variant_group, skill_id";

export async function previewQuestion(stepId: string, group: string, exclude: string[]): Promise<QuestionPayload> {
  await requireStaff(["content"]);
  const supabase = await createClient();
  const { data: step } = await supabase.from("lesson_steps").select("content").eq("id", stepId).single();
  if (!((step?.content as { groups?: string[] })?.groups ?? []).includes(group)) throw new Error("Not part of this step");
  const { data } = await supabase.from("questions").select(COLUMNS).eq("variant_group", group).neq("status", "archived");
  const rows = (data ?? []) as QuestionRow[];
  if (!rows.length) throw new Error("This group has no questions yet");
  const fresh = rows.filter((r) => !exclude.includes(r.id));
  const q = (fresh.length ? fresh : rows)[Math.floor(Math.random() * (fresh.length || rows.length))];
  return { question: toClient(q), hint1: q.hint1, hint2: q.hint2, group };
}

export async function previewAnswer(input: { stepId: string; questionId: string; response: Response }): Promise<AnswerResult> {
  await requireStaff(["content"]);
  const supabase = await createClient();
  const { data: q } = await supabase.from("questions").select(COLUMNS).eq("id", input.questionId).single();
  if (!q) throw new Error("Question not found");
  return { correct: checkAnswer(q as QuestionRow, input.response), explanation: q.explanation };
}

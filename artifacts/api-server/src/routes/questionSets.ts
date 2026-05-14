import { Router, type IRouter } from "express";
import { db, questionSetsTable, questionsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/folders/:id/sets", async (req, res) => {
  const folderId = parseInt(req.params.id, 10);
  if (!Number.isFinite(folderId)) return res.status(400).json({ error: "Invalid folder id" });
  const sets = await db.select().from(questionSetsTable).where(eq(questionSetsTable.folderId, folderId)).orderBy(asc(questionSetsTable.sortOrder), asc(questionSetsTable.createdAt));
  return res.json(sets);
});

router.get("/sets/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [set] = await db.select().from(questionSetsTable).where(eq(questionSetsTable.id, id)).limit(1);
  if (!set) return res.status(404).json({ error: "Question set not found" });
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.setId, id)).orderBy(asc(questionsTable.questionIndex));
  return res.json({ set, questions });
});

router.delete("/sets/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [set] = await db.select({ id: questionSetsTable.id }).from(questionSetsTable).where(eq(questionSetsTable.id, id)).limit(1);
  if (!set) return res.status(404).json({ error: "Question set not found" });
  await db.delete(questionSetsTable).where(eq(questionSetsTable.id, id));
  return res.status(204).send();
});

router.patch("/sets/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [set] = await db.select({ id: questionSetsTable.id }).from(questionSetsTable).where(eq(questionSetsTable.id, id)).limit(1);
  if (!set) return res.status(404).json({ error: "Question set not found" });
  const patch: Record<string, unknown> = {};
  if (typeof req.body?.name === "string" && req.body.name.trim()) patch.name = req.body.name.trim();
  if (typeof req.body?.examType === "string") patch.examType = req.body.examType || null;
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "No fields to update" });
  const [updated] = await db.update(questionSetsTable).set(patch).where(eq(questionSetsTable.id, id)).returning();
  return res.json(updated);
});

router.post("/folders/:id/sets/reorder", async (req, res) => {
  const folderId = parseInt(req.params.id, 10);
  if (!Number.isFinite(folderId)) return res.status(400).json({ error: "Invalid folder id" });
  const items: { id: number; position: number }[] = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items required" });
  await Promise.all(items.map(item =>
    db.update(questionSetsTable).set({ sortOrder: item.position }).where(eq(questionSetsTable.id, item.id))
  ));
  return res.json({ ok: true });
});

// Reorder questions: renumbers all questions serially so serial = position
router.post("/sets/:id/questions/reorder", async (req, res) => {
  const setId = parseInt(req.params.id, 10);
  if (!Number.isFinite(setId)) return res.status(400).json({ error: "Invalid set id" });
  const items: { id: number; position: number }[] = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items required" });
  // Use sequential positions 1,2,3... to keep serial numbers clean
  await Promise.all(items.map(item =>
    db.update(questionsTable).set({ questionIndex: item.position }).where(eq(questionsTable.id, item.id))
  ));
  return res.json({ ok: true });
});

router.post("/sets/:id/questions", async (req, res) => {
  const setId = parseInt(req.params.id, 10);
  if (!Number.isFinite(setId)) return res.status(400).json({ error: "Invalid set id" });
  const [set] = await db.select({ id: questionSetsTable.id }).from(questionSetsTable).where(eq(questionSetsTable.id, setId)).limit(1);
  if (!set) return res.status(404).json({ error: "Question set not found" });

  const type = typeof req.body?.type === "string" ? req.body.type : "mcq";
  const existing = await db.select({ idx: questionsTable.questionIndex }).from(questionsTable).where(eq(questionsTable.setId, setId)).orderBy(asc(questionsTable.questionIndex));
  const nextIndex = existing.length > 0 ? (existing[existing.length - 1].idx ?? 0) + 1 : 1;

  const defaultOptions = type === "mcq" ? [{ letter: "A", text: "" }, { letter: "B", text: "" }, { letter: "C", text: "" }, { letter: "D", text: "" }] : [];
  const defaultParts = type === "cq" ? [
    { key: "A", label: "ক", text: "", solution: null, aiSolution: null },
    { key: "B", label: "খ", text: "", solution: null, aiSolution: null },
    { key: "C", label: "গ", text: "", solution: null, aiSolution: null },
    { key: "D", label: "ঘ", text: "", solution: null, aiSolution: null },
  ] : [];

  const [q] = await db.insert(questionsTable).values({
    setId, chorchaId: `manual-${Date.now()}`, questionIndex: nextIndex,
    type, questionText: "", options: defaultOptions, parts: defaultParts,
    answer: null, solution: null, stemImages: [], aiExplanation: null, hidden: false,
  }).returning();

  await db.update(questionSetsTable).set({ totalQuestions: sql`${questionSetsTable.totalQuestions} + 1` }).where(eq(questionSetsTable.id, setId));

  return res.status(201).json(q);
});

router.patch("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [q] = await db.select({ id: questionsTable.id }).from(questionsTable).where(eq(questionsTable.id, id)).limit(1);
  if (!q) return res.status(404).json({ error: "Question not found" });

  const patch: Record<string, unknown> = {};
  if (typeof req.body?.questionText === "string") patch.questionText = req.body.questionText;
  if (typeof req.body?.type === "string") patch.type = req.body.type;
  if (req.body?.options !== undefined) patch.options = req.body.options;
  if (req.body?.parts !== undefined) patch.parts = req.body.parts;
  if (req.body?.answer !== undefined) patch.answer = req.body.answer || null;
  if (req.body?.solution !== undefined) patch.solution = req.body.solution || null;
  if (req.body?.aiExplanation !== undefined) patch.aiExplanation = req.body.aiExplanation || null;
  if (req.body?.stemImages !== undefined) patch.stemImages = req.body.stemImages;
  if (typeof req.body?.hidden === "boolean") patch.hidden = req.body.hidden;

  if (Object.keys(patch).length === 0) return res.status(400).json({ error: "No fields to update" });

  const [updated] = await db.update(questionsTable).set(patch).where(eq(questionsTable.id, id)).returning();
  return res.json(updated);
});

router.delete("/questions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [q] = await db.select({ id: questionsTable.id, setId: questionsTable.setId }).from(questionsTable).where(eq(questionsTable.id, id)).limit(1);
  if (!q) return res.status(404).json({ error: "Question not found" });
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  await db.update(questionSetsTable).set({ totalQuestions: sql`GREATEST(${questionSetsTable.totalQuestions} - 1, 0)` }).where(eq(questionSetsTable.id, q.setId));
  return res.status(204).send();
});

export default router;

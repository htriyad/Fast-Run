import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useGetQuestionSet, useGetFolderBreadcrumb, Question } from "@workspace/api-client-react";
import { MathText } from "@/components/folder/MathText";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getGetQuestionSetQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, Home as HomeIcon, CheckCircle, HelpCircle, Layers,
  Eye, EyeOff, BookOpen, Pencil, Trash2, X, Save, Plus, ImageIcon,
  Loader2, ChevronDown, ChevronUp, GripVertical, ArrowUp, ArrowDown, Check,
  BookMarked, Zap, Timer, List, RotateCcw, Trophy, ChevronLeft, Hash,
  Link2, Copy, Square, CheckSquare, Search,
} from "lucide-react";
import { useLinkQuestions } from "@workspace/api-client-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ANSWER_COLORS: Record<string, string> = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#ef4444", E: "#8b5cf6" };
const CQ_COLORS: Record<string, string> = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#8b5cf6" };
const CQ_LABELS: Record<string, string> = { A: "ক", B: "খ", C: "গ", D: "ঘ" };
type AppMode = null | "solution" | "practice" | "exam" | "reorder" | "copy";
type EditablePart = { key: string; label: string; text: string; solution: string | null; aiSolution: string | null };
type EditableOption = { letter: string; text: string };

// ─── Option stats (localStorage) ──────────────────────────────────────────────
const STATS_KEY = "chorcha_qstats";
function readAllStats(): Record<number, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}"); } catch { return {}; }
}
function recordStat(qId: number, letter: string) {
  const stats = readAllStats();
  if (!stats[qId]) stats[qId] = {};
  stats[qId][letter] = (stats[qId][letter] ?? 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
function getQStats(qId: number): Record<string, number> {
  return readAllStats()[qId] ?? {};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STEM_HOSTS = ["https://chorcha.net", "https://assets.chorcha.net", "https://cdn.chorcha.net", "https://media.chorcha.net"];
function handleStemImageError(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget;
  const tried = (img.dataset.triedHosts ?? "").split("|").filter(Boolean);
  try {
    const path = new URL(img.src).pathname + new URL(img.src).search;
    for (const host of STEM_HOSTS) {
      if (tried.includes(host)) continue;
      tried.push(host); img.dataset.triedHosts = tried.join("|"); img.src = `${host}${path}`; return;
    }
  } catch { /* ignore */ }
  img.style.display = "none";
}
function ta(value: string, onChange: (v: string) => void, placeholder: string, rows = 2) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className="w-full px-3 py-2 rounded-xl bg-white/6 border border-white/12 text-white/90 placeholder:text-white/20 text-sm resize-none focus:outline-none focus:border-white/25 transition-colors" />;
}
function inp(value: string, onChange: (v: string) => void, placeholder: string) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-3 py-2 rounded-xl bg-white/6 border border-white/12 text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-white/25 transition-colors" />;
}

function ExamTypeBadge({ type }: { type: string | null }) {
  if (!type || type === "unknown") return null;
  const cfg: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
    mcq: { label: "MCQ", color: "#22c55e", Icon: CheckCircle },
    cq: { label: "CQ", color: "#f59e0b", Icon: HelpCircle },
    sq: { label: "SQ", color: "#0ea5e9", Icon: BookOpen },
    mixed: { label: "Mixed", color: "#8b5cf6", Icon: Layers },
  };
  const c = cfg[type]; if (!c) return null;
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
    style={{ background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}30` }}>
    <c.Icon className="w-3 h-3" strokeWidth={2} />{c.label}
  </span>;
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────
interface QCardProps {
  q: Question;
  serialNum: number;
  totalCount: number;
  onUpdated: (u: Question) => void;
  onDeleted: (id: number) => void;
  onReorderToPosition?: (id: number, pos: number) => void;
  mode: "solution" | "practice" | "exam";
  // practice
  practiceSelected?: string | null;
  practiceRevealed?: boolean;
  onPracticeSelect?: (letter: string) => void;
  // exam
  examSelected?: string | null;
  examSubmitted?: boolean;
  onExamSelect?: (letter: string) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  // multi-select
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  isHighlighted?: boolean;
}

function QuestionCard({ q, serialNum, totalCount, onUpdated, onDeleted, onReorderToPosition,
  mode, practiceSelected, practiceRevealed, onPracticeSelect,
  examSelected, examSubmitted, onExamSelect, cardRef,
  selectMode, selected, onToggleSelect, isHighlighted }: QCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingPos, setEditingPos] = useState(false);
  const [posInput, setPosInput] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [practiceSolOpen, setPracticeSolOpen] = useState(false);
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});
  const [hiddenPartsLocal, setHiddenPartsLocal] = useState<string[]>(Array.isArray(q.hiddenParts) ? q.hiddenParts : []);
  const [savingHiddenParts, setSavingHiddenParts] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(q.id)).then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1500);
    });
  };

  const [questionText, setQuestionText] = useState(q.questionText ?? "");
  const [answer, setAnswer] = useState(q.answer ?? "");
  const [solution, setSolution] = useState(q.solution ?? "");
  const [aiExplanation, setAiExplanation] = useState(q.aiExplanation ?? "");
  const [stemImages, setStemImages] = useState<string[]>(Array.isArray(q.stemImages) ? [...q.stemImages] : []);
  const [options, setOptions] = useState<EditableOption[]>(Array.isArray(q.options) ? q.options.map(o => ({ ...o })) : []);
  const [parts, setParts] = useState<EditablePart[]>(Array.isArray(q.parts) ? q.parts.map(p => ({ ...p, solution: p.solution ?? null, aiSolution: p.aiSolution ?? null })) : []);
  const [qType, setQType] = useState(q.type ?? "mcq");

  const [qStats, setQStats] = useState<Record<string, number>>(() => getQStats(q.id));

  const handlePracticeOptionSelect = (letter: string) => {
    recordStat(q.id, letter);
    setQStats(getQStats(q.id));
    onPracticeSelect?.(letter);
  };
  const handleExamOptionSelect = (letter: string) => {
    recordStat(q.id, letter);
    setQStats(getQStats(q.id));
    onExamSelect?.(letter);
  };

  const resetEdit = () => {
    setQuestionText(q.questionText ?? ""); setAnswer(q.answer ?? ""); setSolution(q.solution ?? "");
    setAiExplanation(q.aiExplanation ?? ""); setStemImages(Array.isArray(q.stemImages) ? [...q.stemImages] : []);
    setOptions(Array.isArray(q.options) ? q.options.map(o => ({ ...o })) : []);
    setParts(Array.isArray(q.parts) ? q.parts.map(p => ({ ...p, solution: p.solution ?? null, aiSolution: p.aiSolution ?? null })) : []);
    setQType(q.type ?? "mcq"); setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const effectiveType = qType === "mcq" && options.length === 0 ? "sq" : qType;
      const res = await fetch(`${import.meta.env.BASE_URL}api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText, type: effectiveType, answer: answer || null, solution: solution || null, aiExplanation: aiExplanation || null, stemImages, options, parts }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const updated = await res.json();
      onUpdated(updated);
      toast({ title: "Saved", description: "Question updated." });
      setEditing(false);
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const isLinked = q.linkId != null;
    if (!confirm(isLinked ? "Remove this question from the set? (Original stays intact.)" : "Delete this question permanently?")) return;
    setDeleting(true);
    try {
      const url = isLinked
        ? `${import.meta.env.BASE_URL}api/links/${q.linkId}`
        : `${import.meta.env.BASE_URL}api/questions/${q.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed");
      onDeleted(q.id);
    } catch (e) {
      toast({ title: isLinked ? "Remove failed" : "Delete failed", variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleToggleHiddenPart = async (partKey: string) => {
    if (!q.linkId) return;
    const next = hiddenPartsLocal.includes(partKey)
      ? hiddenPartsLocal.filter(k => k !== partKey)
      : [...hiddenPartsLocal, partKey];
    setHiddenPartsLocal(next);
    setSavingHiddenParts(true);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/links/${q.linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenParts: next }),
      });
    } catch {
      // revert on error
      setHiddenPartsLocal(hiddenPartsLocal);
    } finally { setSavingHiddenParts(false); }
  };

  const isCq = q.type === "cq";
  const isSq = q.type === "sq";
  // Treat MCQ with 0 options as SQ-like
  const renderAsNoOptions = q.type === "mcq" && (!q.options || q.options.length === 0);

  if (editing) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/4 overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Q{serialNum} · Editing</span>
            <button onClick={resetEdit} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button>
          </div>
          {/* Type picker */}
          <div className="flex gap-2">
            {(["mcq", "cq", "sq"] as const).map(t => (
              <button key={t} onClick={() => setQType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${qType === t ? "bg-white/15 border-white/30 text-white" : "border-white/8 text-white/30 hover:border-white/15"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/35 font-medium">Question Text</label>
            {ta(questionText, setQuestionText, "Question text (supports LaTeX: $...$)", 3)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/35 font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Stem Images</label>
              <button onClick={() => setStemImages(p => [...p, ""])} className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1"><Plus className="w-3 h-3" /> Add URL</button>
            </div>
            {stemImages.map((url, i) => (
              <div key={i} className="flex gap-2">
                {inp(url, (v) => setStemImages(p => p.map((x, j) => j === i ? v : x)), "https://...")}
                <button onClick={() => setStemImages(p => p.filter((_, j) => j !== i))} className="px-2 rounded-xl hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          {qType === "mcq" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/35 font-medium">Options {options.length === 0 && <span className="text-amber-400/60 ml-1">(empty → renders as SQ)</span>}</label>
                {options.length < 5 && (
                  <button onClick={() => { const letters = ["A","B","C","D","E"]; const next = letters.find(l => !options.some(o => o.letter === l)); if (next) setOptions(p => [...p, { letter: next, text: "" }]); }}
                    className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Option</button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={opt.letter} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${ANSWER_COLORS[opt.letter] ?? "#6b7280"}20`, color: ANSWER_COLORS[opt.letter] ?? "#6b7280" }}>{opt.letter}</span>
                    <div className="flex-1">{inp(opt.text, (v) => setOptions(p => p.map((x, j) => j === i ? { ...x, text: v } : x)), `Option ${opt.letter}`)}</div>
                    <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))} className="px-2 rounded-xl hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              {options.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs text-white/35 font-medium">Answer</label>
                  <select value={answer} onChange={(e) => setAnswer(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white/6 border border-white/12 text-white/80 text-xs focus:outline-none">
                    <option value="">— None —</option>
                    {options.map(o => <option key={o.letter} value={o.letter}>{o.letter}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          {qType === "cq" && (
            <div className="space-y-2">
              <label className="text-xs text-white/35 font-medium">Parts</label>
              {parts.map((part, i) => {
                const color = CQ_COLORS[part.key] ?? "#6b7280";
                return (
                  <div key={part.key} className="rounded-xl border border-white/8 bg-white/2 p-3 space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: `${color}25`, color }}>{part.label}</span>
                        <span className="text-xs text-white/35 font-medium">Part {part.key}</span>
                      </div>
                      <button onClick={() => setParts(p => p.filter((_, j) => j !== i))} className="text-xs text-red-400/50 hover:text-red-400 flex items-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-white/25">Question text</label>{ta(part.text, (v) => setParts(p => p.map((x, j) => j === i ? { ...x, text: v } : x)), "Part text...", 2)}</div>
                    <div className="space-y-1"><label className="text-xs text-white/25">Solution</label>{ta(part.solution ?? "", (v) => setParts(p => p.map((x, j) => j === i ? { ...x, solution: v || null } : x)), "Solution...", 2)}</div>
                    <div className="space-y-1"><label className="text-xs text-white/25">AI Solution</label>{ta(part.aiSolution ?? "", (v) => setParts(p => p.map((x, j) => j === i ? { ...x, aiSolution: v || null } : x)), "AI solution...", 2)}</div>
                  </div>
                );
              })}
              {parts.length < 4 && (
                <button onClick={() => { const keys = ["A","B","C","D"]; const next = keys.find(k => !parts.some(p => p.key === k)); if (next) setParts(p => [...p, { key: next, label: CQ_LABELS[next] ?? next, text: "", solution: null, aiSolution: null }]); }}
                  className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Part</button>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-white/35 font-medium">Answer / Short answer</label>
            {inp(answer, setAnswer, "Correct answer...")}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/35 font-medium">Solution</label>
            {ta(solution, setSolution, "Solution text...", 2)}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/35 font-medium">AI Explanation</label>
            {ta(aiExplanation, setAiExplanation, "AI explanation...", 2)}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/8">
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-xs text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-50">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}Delete question
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetEdit} className="h-8 border-white/10 text-white/40 hover:text-white text-xs px-3">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW MODE ──
  const showSol = mode === "solution";
  const isPractice = mode === "practice";
  const isExam = mode === "exam";

  // MCQ option rendering
  function renderMCQOption(opt: { letter: string; text: string }) {
    const isCorrect = !!q.answer && opt.letter.toUpperCase() === q.answer.toUpperCase();

    if (isPractice) {
      const isSelected = practiceSelected === opt.letter;
      const revealed = practiceRevealed && practiceSelected != null;
      let bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.06)";
      let lBg = "rgba(255,255,255,0.08)", lColor = "rgba(255,255,255,0.5)", tColor = "rgba(255,255,255,0.6)";
      if (revealed) {
        if (isCorrect) { bg = "rgba(34,197,94,0.13)"; border = "rgba(34,197,94,0.40)"; lBg = "#22c55e"; lColor = "#000"; tColor = "rgba(255,255,255,0.95)"; }
        else if (isSelected) { bg = "rgba(239,68,68,0.13)"; border = "rgba(239,68,68,0.40)"; lBg = "#ef4444"; lColor = "#fff"; tColor = "rgba(255,255,255,0.70)"; }
      } else if (isSelected) {
        bg = "rgba(255,255,255,0.09)"; border = "rgba(255,255,255,0.22)"; lBg = "rgba(255,255,255,0.22)"; lColor = "rgba(255,255,255,0.9)"; tColor = "rgba(255,255,255,0.80)";
      }
      return (
        <button key={opt.letter} onClick={() => { if (!practiceSelected) handlePracticeOptionSelect(opt.letter); }}
          disabled={!!practiceSelected}
          className="flex items-start gap-2 p-2.5 rounded-xl transition-all text-left w-full active:scale-[0.98]"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors" style={{ background: lBg, color: lColor }}>{opt.letter}</span>
          <span className="text-xs leading-relaxed" style={{ color: tColor }}><MathText text={opt.text} imageBlock={false} /></span>
        </button>
      );
    }

    if (isExam) {
      const isSelected = examSelected === opt.letter;
      const revealed = examSubmitted;
      let bg = "rgba(255,255,255,0.04)", border = "rgba(255,255,255,0.06)";
      let lBg = "rgba(255,255,255,0.08)", lColor = "rgba(255,255,255,0.5)", tColor = "rgba(255,255,255,0.6)";
      if (revealed) {
        const isSkipped = !examSelected;
        if (isCorrect && isSelected) {
          // Correctly answered — green
          bg = "rgba(34,197,94,0.13)"; border = "rgba(34,197,94,0.40)"; lBg = "#22c55e"; lColor = "#000"; tColor = "rgba(255,255,255,0.95)";
        } else if (isCorrect && !isSkipped) {
          // Wrong answer picked, show correct in green so user knows
          bg = "rgba(34,197,94,0.13)"; border = "rgba(34,197,94,0.40)"; lBg = "#22c55e"; lColor = "#000"; tColor = "rgba(255,255,255,0.95)";
        } else if (isCorrect && isSkipped) {
          // Skipped — ash/slate to distinguish from correct
          bg = "rgba(148,163,184,0.10)"; border = "rgba(148,163,184,0.30)"; lBg = "rgba(148,163,184,0.30)"; lColor = "rgba(255,255,255,0.65)"; tColor = "rgba(255,255,255,0.60)";
        } else if (isSelected) {
          bg = "rgba(239,68,68,0.13)"; border = "rgba(239,68,68,0.40)"; lBg = "#ef4444"; lColor = "#fff";
        }
      } else if (isSelected) {
        bg = "rgba(99,102,241,0.15)"; border = "rgba(99,102,241,0.40)"; lBg = "#6366f1"; lColor = "#fff"; tColor = "rgba(255,255,255,0.90)";
      }
      const locked = examSubmitted || !!examSelected;
      return (
        <button key={opt.letter} onClick={() => { if (!locked) handleExamOptionSelect(opt.letter); }}
          disabled={locked}
          className="flex items-start gap-2 p-2.5 rounded-xl transition-all text-left w-full active:scale-[0.98]"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: lBg, color: lColor }}>{opt.letter}</span>
          <span className="text-xs leading-relaxed" style={{ color: tColor }}><MathText text={opt.text} imageBlock={false} /></span>
        </button>
      );
    }

    // Solution mode — only green for the correct answer
    const show = showSol && isCorrect;
    return (
      <div key={opt.letter} className="flex items-start gap-2 p-2.5 rounded-xl transition-colors"
        style={show ? { background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.40)" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold"
          style={show ? { background: "#22c55e", color: "#000" } : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{opt.letter}</span>
        <span className={`text-xs leading-relaxed ${show ? "text-white/95 font-medium" : "text-white/60"}`}><MathText text={opt.text} imageBlock={false} /></span>
      </div>
    );
  }

  const effectiveRevealed = showSol ||
    (isPractice && practiceRevealed && practiceSelected != null) ||
    (isExam && examSubmitted);

  const qBorderColor = isCq ? "#f59e0b" : isSq ? "#0ea5e9" : "rgba(255,255,255,0.08)";

  const isLinked = q.linkId != null;
  const effectiveHiddenParts = isLinked ? hiddenPartsLocal : [];

  return (
    <div ref={cardRef}
      className={`rounded-2xl border bg-white/3 overflow-hidden scroll-mt-20 relative transition-all ${selectMode ? "cursor-pointer" : ""} ${selected ? "ring-2 ring-indigo-500/70" : ""} ${isHighlighted ? "ring-2 ring-amber-400/80 shadow-[0_0_24px_4px_rgba(251,191,36,0.18)]" : ""}`}
      style={{ borderColor: selected ? "#6366f1" : isHighlighted ? "rgba(251,191,36,0.5)" : qBorderColor }}
      onClick={selectMode ? (e) => { e.stopPropagation(); onToggleSelect?.(); } : undefined}>
      {/* Select overlay checkbox */}
      {selectMode && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          {selected
            ? <CheckSquare className="w-5 h-5 text-indigo-400" />
            : <Square className="w-5 h-5 text-white/30" />}
        </div>
      )}
      <div className="p-4 space-y-3">
        {/* Question header row */}
        <div className="flex items-start gap-3">
          {/* Serial number badge */}
          {editingPos ? (
            <input autoFocus value={posInput} onChange={e => setPosInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") { const n = parseInt(posInput, 10); if (n >= 1 && n <= totalCount) onReorderToPosition?.(q.id, n); setEditingPos(false); } if (e.key === "Escape") setEditingPos(false); }}
              onBlur={() => setEditingPos(false)}
              className="flex-shrink-0 w-9 h-7 rounded-lg bg-white/12 border border-white/25 text-center text-xs font-bold text-white focus:outline-none" placeholder={String(serialNum)} />
          ) : (
            <button title="Click to move to position" onClick={() => { if (mode === "solution" && onReorderToPosition) { setPosInput(String(serialNum)); setEditingPos(true); } }}
              className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${mode === "solution" && onReorderToPosition ? "cursor-pointer hover:scale-110 hover:ring-1 hover:ring-white/20" : "cursor-default"} ${isCq ? "bg-amber-500/15 border border-amber-500/20 text-amber-400/80" : isSq ? "bg-sky-500/15 border border-sky-500/20 text-sky-400/80" : "bg-white/8 text-white/50"}`}>
              {serialNum}
            </button>
          )}
          {/* Question content */}
          <div className="min-w-0 flex-1">
            {q.stemImages && q.stemImages.length > 0 && (
              <div className="mb-3 space-y-2">
                {q.stemImages.map((url, i) => url && (
                  <img key={i} src={url} alt="" loading="lazy" className="max-w-full rounded-lg border border-white/15 bg-white p-1" onError={handleStemImageError} />
                ))}
              </div>
            )}
            {q.questionText && (
              <div className={`text-white/90 text-sm leading-relaxed ${isCq ? "p-3 rounded-xl bg-amber-500/5 border border-amber-500/10" : isSq ? "p-3 rounded-xl bg-sky-500/5 border border-sky-500/10" : ""}`}>
                <MathText text={q.questionText} />
              </div>
            )}
          </div>
          {/* Linked badge + remove button */}
          {isLinked && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span title="Linked from another set" className="w-6 h-6 rounded-lg flex items-center justify-center text-indigo-400/70 bg-indigo-500/10">
                <Link2 className="w-3 h-3" />
              </span>
              {mode === "solution" && (
                <button onClick={handleDelete} disabled={deleting} title="Remove from this set"
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity hover:bg-red-500/15 text-white/30 hover:text-red-400">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              )}
            </div>
          )}
          {/* Copy ID button — visible in all modes */}
          <button onClick={handleCopyId} title={`Copy question ID: ${q.id}`}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/8"
            style={idCopied ? { opacity: 1, color: "#22c55e" } : { opacity: 0.35, color: "rgba(255,255,255,0.5)" }}>
            {idCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {/* Edit button — solution mode only, not for linked questions */}
          {mode === "solution" && !isLinked && (
            <button onClick={() => setEditing(true)} className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity hover:bg-white/8 text-white/30 hover:text-white/70">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* MCQ options */}
        {q.type === "mcq" && !renderAsNoOptions && q.options && q.options.length > 0 && (
          <div className="grid grid-cols-1 gap-1.5 ml-10">
            {q.options.map(opt => renderMCQOption(opt))}
          </div>
        )}
        {/* Option percentage pills — always shown when data exists */}
        {q.type === "mcq" && !renderAsNoOptions && q.options && q.options.length > 0 && (() => {
          const total = Object.values(qStats).reduce((a, b) => a + b, 0);
          return total > 0 ? (
            <div className="ml-10 flex flex-wrap gap-1.5 pt-0.5">
              {q.options.map(opt => {
                const count = qStats[opt.letter] ?? 0;
                const pct = Math.round((count / total) * 100);
                const isCorrect = !!q.answer && opt.letter.toUpperCase() === q.answer.toUpperCase();
                return (
                  <div key={opt.letter} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: isCorrect ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isCorrect ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span className="w-4 h-4 rounded-[5px] flex items-center justify-center text-[10px] font-bold"
                      style={{ background: isCorrect ? "#22c55e" : "rgba(255,255,255,0.12)", color: isCorrect ? "#000" : "rgba(255,255,255,0.6)" }}>
                      {opt.letter}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: isCorrect ? "#4ade80" : "rgba(255,255,255,0.45)" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : null;
        })()}

        {/* Practice hint */}
        {isPractice && q.type === "mcq" && !renderAsNoOptions && !practiceSelected && (
          <p className="ml-10 text-xs text-white/20 italic">tap an option to check your answer</p>
        )}


        {/* SQ / no-options: show answer */}
        {(isSq || renderAsNoOptions) && (
          <div className="ml-10">
            {mode === "solution" && (
              <button onClick={() => setShowSolution(v => !v)} className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/65 transition-colors mb-2">
                {showSolution ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showSolution ? "Hide answer" : "Show answer"}
              </button>
            )}
            {(effectiveRevealed || showSolution) && (
              <div className="space-y-2">
                {q.answer && <div className="p-3 rounded-xl bg-sky-500/6 border border-sky-500/20"><p className="text-xs font-semibold text-sky-400/50 mb-1">Answer</p><div className="text-sm text-white/75"><MathText text={q.answer} /></div></div>}
                {q.solution && <div className="p-3 rounded-xl bg-white/4 border border-white/8"><p className="text-xs font-semibold text-white/35 mb-1">Solution</p><div className="text-sm text-white/70"><MathText text={q.solution} /></div></div>}
                {q.aiExplanation && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15"><p className="text-xs font-semibold text-purple-400/50 mb-1">AI Explanation</p><div className="text-sm text-white/65"><MathText text={q.aiExplanation} /></div></div>}
              </div>
            )}
          </div>
        )}

        {/* MCQ solution (solution mode) */}
        {q.type === "mcq" && !renderAsNoOptions && showSol && (
          <div className="ml-10 space-y-2">
            {q.solution && <div className="p-3 rounded-xl bg-white/4 border border-white/8"><p className="text-xs font-semibold text-white/35 mb-1">Solution</p><div className="text-sm text-white/70"><MathText text={q.solution} /></div></div>}
            {q.aiExplanation && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15"><p className="text-xs font-semibold text-purple-400/50 mb-1">AI Explanation</p><div className="text-sm text-white/65"><MathText text={q.aiExplanation} /></div></div>}
          </div>
        )}

        {/* MCQ practice solution button (after option selected) */}
        {isPractice && q.type === "mcq" && practiceRevealed && practiceSelected && (q.solution || q.aiExplanation) && (
          <div className="ml-10 space-y-2">
            <button
              onClick={() => setPracticeSolOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-white/12 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Solution
              {practiceSolOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            <AnimatePresence>
              {practiceSolOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden space-y-2"
                >
                  {q.solution && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/12">
                      <p className="text-xs font-semibold text-white/40 mb-2">Solution</p>
                      <div className="text-sm text-white/80 leading-relaxed"><MathText text={q.solution} /></div>
                    </div>
                  )}
                  {q.aiExplanation && (
                    <div className="p-4 rounded-xl bg-purple-500/8 border border-purple-500/20">
                      <p className="text-xs font-semibold text-purple-400/60 mb-2">AI Explanation</p>
                      <div className="text-sm text-white/75 leading-relaxed"><MathText text={q.aiExplanation} /></div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CQ parts */}
        {isCq && q.parts && q.parts.length > 0 && (
          <div className="ml-10 space-y-2">
            {/* Linked CQ — part visibility toggles in solution mode */}
            {isLinked && mode === "solution" && (
              <div className="flex items-center gap-1.5 flex-wrap pb-1">
                <span className="text-[10px] text-white/25 mr-0.5">Show parts:</span>
                {q.parts.map(part => {
                  const color = CQ_COLORS[part.key] ?? "#6b7280";
                  const hidden = effectiveHiddenParts.includes(part.key);
                  return (
                    <button key={part.key} onClick={() => handleToggleHiddenPart(part.key)}
                      disabled={savingHiddenParts}
                      title={hidden ? `Show ${part.label}` : `Hide ${part.label}`}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all ${hidden ? "opacity-35 grayscale" : "opacity-100"}`}
                      style={{ background: `${color}25`, color }}>
                      {part.label}
                    </button>
                  );
                })}
              </div>
            )}
            {q.parts.filter(p => !effectiveHiddenParts.includes(p.key)).map((part) => {
              const color = CQ_COLORS[part.key] ?? "#6b7280";
              const hasSol = !!(part.solution || part.aiSolution);
              const isOpen = showSol ? true : !!openParts[part.key];
              return (
                <div key={part.key} className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                  <div className="p-3 space-y-2">
                    <div className="flex items-start gap-2" onClick={hasSol && (mode === "solution" || mode === "practice") ? () => setOpenParts(p => ({ ...p, [part.key]: !p[part.key] })) : undefined}
                      style={{ cursor: hasSol && (mode === "solution" || mode === "practice") ? "pointer" : "default" }}>
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: `${color}25`, color }}>{part.label}</span>
                      <div className="text-sm text-white/80 leading-relaxed flex-1"><MathText text={part.text} /></div>
                      {hasSol && (mode === "solution" || mode === "practice") && <span className="text-white/20 self-center flex-shrink-0">{isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>}
                    </div>
                    {isOpen && hasSol && (
                      <div className="ml-8 space-y-2">
                        {part.solution && <div className="p-3 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}><p className="text-xs font-semibold mb-1" style={{ color: `${color}70` }}>Solution</p><div className="text-sm text-white/70"><MathText text={part.solution} /></div></div>}
                        {part.aiSolution && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15"><p className="text-xs font-semibold text-purple-400/50 mb-1">AI Solution</p><div className="text-sm text-white/65"><MathText text={part.aiSolution} /></div></div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Memoised wrapper + lazy viewport mount ────────────────────────────────────
const QuestionCardMemo = memo(QuestionCard, (prev, next) =>
  prev.q === next.q &&
  prev.serialNum === next.serialNum &&
  prev.totalCount === next.totalCount &&
  prev.mode === next.mode &&
  prev.practiceSelected === next.practiceSelected &&
  prev.practiceRevealed === next.practiceRevealed &&
  prev.examSelected === next.examSelected &&
  prev.examSubmitted === next.examSubmitted &&
  prev.selectMode === next.selectMode &&
  prev.selected === next.selected &&
  prev.isHighlighted === next.isHighlighted
);

// Cards not yet near the viewport render a thin placeholder — prevents mounting
// hundreds of KaTeX trees at once. rootMargin="800px" pre-loads ~2 screens ahead.
function LazyCard(props: QCardProps) {
  const [mounted, setMounted] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);

  const refCallback = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
    props.cardRef?.(el);
    if (!el) { obsRef.current?.disconnect(); return; }
    if (mounted) return;
    obsRef.current?.disconnect();
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMounted(true); obsRef.current?.disconnect(); } },
      { rootMargin: "800px 0px" }
    );
    obsRef.current.observe(el);
  // cardRef identity changes every render — intentionally excluded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => () => { obsRef.current?.disconnect(); }, []);

  if (!mounted) {
    const minH = props.q.type === "cq" ? 260 : props.q.type === "sq" ? 96 : 148;
    return (
      <div ref={refCallback} className="rounded-2xl border border-white/6 bg-white/2 scroll-mt-20"
        style={{ minHeight: minH }} />
    );
  }
  return <QuestionCardMemo {...props} />;
}

// ─── AddQuestionDialog ─────────────────────────────────────────────────────────
function AddQuestionDialog({ setId, onAdded, onClose }: { setId: number; onAdded: (q: Question) => void; onClose: () => void }) {
  const [type, setType] = useState<"mcq" | "cq" | "sq">("mcq");
  const [loading, setLoading] = useState(false);
  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/sets/${setId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onAdded(await res.json()); onClose();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#111] border border-white/12 rounded-2xl p-5 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-bold text-white/90">Add Question</h3><button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button></div>
        <div className="grid grid-cols-3 gap-2">
          {(["mcq", "cq", "sq"] as const).map(t => (
            <button key={t} onClick={() => setType(t)} className={`py-3 rounded-xl border text-sm font-semibold transition-all ${type === t ? "border-white/25 bg-white/10 text-white" : "border-white/8 text-white/35 hover:text-white/60 hover:border-white/15"}`}>{t.toUpperCase()}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 border-white/10 text-white/40">Cancel</Button>
          <Button size="sm" onClick={handleAdd} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── CopyToSetDialog ──────────────────────────────────────────────────────────
type SetSearchResult = { id: number; name: string; folderId: number; folderName: string; totalQuestions: number };

function CopyToSetDialog({ currentSetId, selectedQuestionIds, onClose, onLinked }: {
  currentSetId: number;
  selectedQuestionIds: number[];
  onClose: () => void;
  onLinked: (count: number) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sets, setSets] = useState<SetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const linkMutation = useLinkQuestions();

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    fetch(`${import.meta.env.BASE_URL}api/sets/search?q=${encodeURIComponent(search)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then((data: SetSearchResult[]) => { setSets(data); setLoading(false); })
      .catch(e => { if (e.name !== "AbortError") setLoading(false); });
    return () => ctrl.abort();
  }, [search]);

  // Group by folder
  const grouped = sets.reduce<Record<string, SetSearchResult[]>>((acc, s) => {
    const key = s.folderName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const handlePick = (targetSetId: number) => {
    linkMutation.mutate(
      { setId: targetSetId, data: { questionIds: selectedQuestionIds } },
      {
        onSuccess: (data) => {
          toast({ title: `Linked ${(data as { linked: number }).linked} question(s) to set` });
          onLinked((data as { linked: number }).linked);
          onClose();
        },
        onError: () => toast({ title: "Copy failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#111] border border-white/12 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/8 flex-shrink-0">
          <Copy className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-white/90 flex-1">Copy {selectedQuestionIds.length} question{selectedQuestionIds.length !== 1 ? "s" : ""} to…</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
        {/* Search */}
        <div className="p-3 border-b border-white/6 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 border border-white/10">
            <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search question sets…"
              className="bg-transparent text-sm text-white/80 placeholder-white/25 flex-1 outline-none" />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/25" /></div>}
          {!loading && Object.keys(grouped).length === 0 && (
            <p className="text-center text-sm text-white/25 py-6">No question sets found</p>
          )}
          {!loading && Object.entries(grouped).map(([folderName, folderSets]) => (
            <div key={folderName}>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-1 mb-1.5">{folderName}</p>
              <div className="space-y-1">
                {folderSets.filter(s => s.id !== currentSetId).map(s => (
                  <button key={s.id} onClick={() => handlePick(s.id)}
                    disabled={linkMutation.isPending}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/12 transition-all text-left active:scale-[0.98]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-white/30">{s.totalQuestions} questions</p>
                    </div>
                    {linkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-white/30 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ModeSelector ─────────────────────────────────────────────────────────────
interface ModeSelectorProps {
  set: { id: number; name: string; examType?: string | null; totalQuestions: number };
  questionCount: number;
  breadcrumbs: Array<{ id: number; name: string }>;
  onSelectMode: (m: "solution" | "practice" | "exam") => void;
  onReorder: () => void;
  onAddQuestion: () => void;
  onCopy: () => void;
}
function ModeSelector({ set, questionCount, breadcrumbs, onSelectMode, onReorder, onAddQuestion, onCopy }: ModeSelectorProps) {
  const modes = [
    { id: "practice" as const, label: "Practice", desc: "Answer questions, reveal one at a time", Icon: Zap, color: "#f59e0b" },
    { id: "solution" as const, label: "Solution", desc: "Browse all questions with answers shown", Icon: BookMarked, color: "#22c55e" },
    { id: "exam" as const, label: "Exam", desc: "Timed exam with score and accuracy", Icon: Timer, color: "#6366f1" },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm overflow-x-auto scrollbar-none">
        <Link href="/"><button className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-lg hover:bg-white/5"><HomeIcon className="w-3.5 h-3.5" /></button></Link>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />
            <Link href={`/folders/${crumb.id}`}><button className="text-white/25 hover:text-white/50 transition-colors p-1 rounded-lg hover:bg-white/5 truncate max-w-[100px]">{crumb.name}</button></Link>
          </span>
        ))}
        <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />
        <span className="font-semibold text-white/80 truncate max-w-[160px] text-sm">{set.name}</span>
      </nav>

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 flex-shrink-0">
              <BookOpen className="w-7 h-7 text-white/45" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white/95 leading-tight">{set.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/30 text-xs">{questionCount} questions</span>
                <ExamTypeBadge type={set.examType ?? null} />
              </div>
            </div>
          </div>
          {/* Management */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onAddQuestion} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 transition-all">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={onReorder} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8 border border-white/8 transition-all">
              <GripVertical className="w-3.5 h-3.5" /> Reorder
            </button>
          </div>
        </div>
      </motion.header>

      {/* Copy to Set — prominent action */}
      <motion.button
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        onClick={onCopy}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-indigo-500/35 transition-all active:scale-[0.98] hover:border-indigo-500/60 group"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-500/20">
          <Link2 className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-white/90 text-sm">Copy to Another Set</div>
          <div className="text-xs text-white/40 mt-0.5">Select questions and link them to any set</div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-400/50 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
      </motion.button>

      {/* Mode cards */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-white/25 uppercase tracking-widest">Study Mode</p>
        <div className="grid gap-3">
          {modes.map((m, idx) => (
            <motion.button key={m.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => onSelectMode(m.id)}
              className="relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 hover:shadow-xl hover:shadow-black/20 active:scale-[0.98] group"
              style={{ background: `linear-gradient(135deg, ${m.color}18, ${m.color}08)`, borderColor: `${m.color}35` }}>
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{ background: m.color }} />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}22` }}>
                  <m.Icon className="w-6 h-6" style={{ color: m.color }} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white/95 text-base">{m.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{m.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: `${m.color}70` }} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ResultsGrid overlay ───────────────────────────────────────────────────────
function ResultsGrid({
  questions, practiceAnswers, practiceRevealedId, examAnswers, examSubmitted, mode, onClose, onScrollTo,
}: {
  questions: Question[]; practiceAnswers: Record<number, string>; practiceRevealedId: number | null;
  examAnswers: Record<number, string>; examSubmitted: boolean; mode: "practice" | "exam";
  onClose: () => void; onScrollTo: (idx: number) => void;
}) {
  const [gridFilter, setGridFilter] = useState<"all" | "correct" | "wrong" | "skip">("all");

  const items = questions.map((q, idx) => {
    const selected = mode === "practice" ? practiceAnswers[q.id] : examAnswers[q.id];
    const correct = !!(q.answer && selected && selected.toUpperCase() === q.answer.toUpperCase());
    const wrong = !!(selected && q.answer && selected.toUpperCase() !== q.answer.toUpperCase());
    const unanswered = !selected;
    return { idx, serialNum: idx + 1, correct, wrong, unanswered };
  });
  const totalAnswered = items.filter(i => !i.unanswered).length;
  const totalCorrect = items.filter(i => i.correct).length;
  const totalWrong = items.filter(i => i.wrong).length;
  const totalSkip = items.filter(i => i.unanswered).length;

  // Before submitted in exam: only show answered vs unanswered (no correct/wrong reveal)
  const revealColors = mode === "practice" || examSubmitted;

  const filteredItems = examSubmitted
    ? items.filter(item =>
        gridFilter === "all" ? true
        : gridFilter === "correct" ? item.correct
        : gridFilter === "wrong" ? item.wrong
        : item.unanswered)
    : items;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.95 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative bg-[#0d0d12] border border-white/12 rounded-3xl p-5 w-full max-w-sm space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white/90">Progress</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center"><div className="text-xl font-bold text-white/80">{totalAnswered}</div><div className="text-xs text-white/30 mt-0.5">Answered</div></div>
          {revealColors ? <>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center"><div className="text-xl font-bold text-emerald-400">{totalCorrect}</div><div className="text-xs text-emerald-400/50 mt-0.5">Correct</div></div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center"><div className="text-xl font-bold text-red-400">{totalWrong}</div><div className="text-xs text-red-400/50 mt-0.5">Wrong</div></div>
          </> : <>
            <div className="rounded-xl bg-white/4 border border-white/8 p-3 text-center"><div className="text-xl font-bold text-white/40">{questions.length - totalAnswered}</div><div className="text-xs text-white/20 mt-0.5">Remaining</div></div>
            <div className="rounded-xl bg-white/4 border border-white/8 p-3 text-center"><div className="text-xl font-bold text-white/40">{questions.length}</div><div className="text-xs text-white/20 mt-0.5">Total</div></div>
          </>}
        </div>

        {/* Filter tabs — always visible after exam submitted */}
        {examSubmitted && mode === "exam" && (
          <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8">
            {([
              { id: "all" as const, label: "All", sub: `${questions.length}`, activeClass: "bg-white/12 text-white/90", inactiveClass: "text-white/40" },
              { id: "correct" as const, label: "Correct", sub: `${totalCorrect}`, activeClass: "bg-emerald-500/20 text-emerald-300", inactiveClass: "text-emerald-500/50" },
              { id: "wrong" as const, label: "Wrong", sub: `${totalWrong}`, activeClass: "bg-red-500/20 text-red-300", inactiveClass: "text-red-500/50" },
              { id: "skip" as const, label: "Skip", sub: `${totalSkip}`, activeClass: "bg-white/10 text-white/70", inactiveClass: "text-white/30" },
            ]).map(f => (
              <button key={f.id} onClick={() => setGridFilter(f.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${gridFilter === f.id ? f.activeClass : f.inactiveClass}`}>
                <span>{f.label}</span>
                <span className="text-[10px] opacity-70">{f.sub}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-6 gap-1.5">
          {filteredItems.map(item => {
            const showCorrect = revealColors && item.correct;
            const showWrong = revealColors && item.wrong;
            const showSkip = revealColors && item.unanswered && examSubmitted;
            const showAnswered = !revealColors && !item.unanswered;
            return (
              <button key={item.idx} onClick={() => { onScrollTo(item.idx); onClose(); }}
                className="h-9 rounded-xl text-xs font-bold transition-all hover:scale-110 active:scale-95"
                style={{
                  background: showCorrect ? "rgba(34,197,94,0.20)" : showWrong ? "rgba(239,68,68,0.20)" : showAnswered ? "rgba(99,102,241,0.20)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${showCorrect ? "rgba(34,197,94,0.40)" : showWrong ? "rgba(239,68,68,0.40)" : showAnswered ? "rgba(99,102,241,0.40)" : "rgba(255,255,255,0.10)"}`,
                  color: showCorrect ? "#22c55e" : showWrong ? "#ef4444" : showAnswered ? "#818cf8" : "rgba(255,255,255,0.35)",
                }}>
                {item.serialNum}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ExamResultsPage ───────────────────────────────────────────────────────────
function ExamResults({ questions, examAnswers, onRetry, onBack }: {
  questions: Question[]; examAnswers: Record<number, string>; onRetry: () => void; onBack: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "unanswered">("all");
  const results = questions.map((q, idx) => {
    const selected = examAnswers[q.id];
    const correct = q.answer && selected && selected.toUpperCase() === q.answer.toUpperCase();
    const wrong = selected && q.answer && selected.toUpperCase() !== q.answer.toUpperCase();
    return { q, idx, serialNum: idx + 1, selected, correct: !!correct, wrong: !!wrong, unanswered: !selected };
  });
  const totalCorrect = results.filter(r => r.correct).length;
  const totalWrong = results.filter(r => r.wrong).length;
  const totalUnanswered = results.filter(r => r.unanswered).length;
  const accuracy = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;
  const filtered = results.filter(r =>
    filter === "all" ? true : filter === "correct" ? r.correct : filter === "wrong" ? r.wrong : r.unanswered
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-6 pb-24">
      {/* Summary card */}
      <div className="rounded-3xl border border-white/10 bg-white/4 p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90">Exam Complete</h2>
          <p className="text-white/40 text-sm mt-1">Here's your result</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/8 p-3"><div className="text-2xl font-bold text-white/80">{questions.length}</div><div className="text-xs text-white/30 mt-1">Total</div></div>
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3"><div className="text-2xl font-bold text-emerald-400">{totalCorrect}</div><div className="text-xs text-emerald-400/50 mt-1">Correct</div></div>
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3"><div className="text-2xl font-bold text-red-400">{totalWrong}</div><div className="text-xs text-red-400/50 mt-1">Wrong</div></div>
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-3"><div className="text-2xl font-bold text-indigo-400">{accuracy}%</div><div className="text-xs text-indigo-400/50 mt-1">Accuracy</div></div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onBack} className="flex-1 border-white/10 text-white/50 hover:text-white gap-1.5"><ChevronLeft className="w-4 h-4" /> Back</Button>
          <Button size="sm" onClick={onRetry} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Retry</Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/4 border border-white/8 w-fit">
        {([
          { id: "all", label: `All (${questions.length})` },
          { id: "correct", label: `✓ ${totalCorrect}` },
          { id: "wrong", label: `✗ ${totalWrong}` },
          { id: "unanswered", label: `— ${totalUnanswered}` },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === f.id ? "bg-white/12 text-white/90 shadow-sm" : "text-white/30 hover:text-white/60"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Question results list */}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.q.id} className={`rounded-2xl border p-4 space-y-2 ${r.correct ? "border-emerald-500/25 bg-emerald-500/5" : r.wrong ? "border-red-500/25 bg-red-500/5" : "border-slate-500/25 bg-slate-500/5"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${r.correct ? "bg-emerald-500/20 text-emerald-400" : r.wrong ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"}`}>{r.serialNum}</span>
              <div className="flex-1 text-sm text-white/80 leading-relaxed"><MathText text={r.q.questionText ?? ""} /></div>
            </div>
            {r.q.type === "mcq" && r.q.options && r.q.options.length > 0 && (
              <div className="ml-10 grid gap-1">
                {r.q.options.map(opt => {
                  const isCorrect = !!(r.q.answer && opt.letter.toUpperCase() === r.q.answer.toUpperCase());
                  const isSelected = !!(r.selected && r.selected.toUpperCase() === opt.letter.toUpperCase());
                  const isSkipped = r.unanswered;
                  // skipped: correct answer shown in ash, not green
                  const showGreen = isCorrect && !isSkipped;
                  const showAsh = isCorrect && isSkipped;
                  const showRed = isSelected && !isCorrect;
                  return (
                    <div key={opt.letter} className="flex items-center gap-2 p-2 rounded-lg text-xs"
                      style={{
                        background: showGreen ? "rgba(34,197,94,0.10)" : showAsh ? "rgba(148,163,184,0.07)" : showRed ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${showGreen ? "rgba(34,197,94,0.25)" : showAsh ? "rgba(148,163,184,0.22)" : showRed ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      <span className="font-bold w-4" style={{ color: showGreen ? "#22c55e" : showAsh ? "rgba(148,163,184,0.75)" : showRed ? "#ef4444" : "rgba(255,255,255,0.35)" }}>{opt.letter}</span>
                      <span className="flex-1" style={{ color: showGreen ? "rgba(255,255,255,0.80)" : showAsh ? "rgba(255,255,255,0.45)" : showRed ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.45)" }}><MathText text={opt.text} imageBlock={false} /></span>
                      {showGreen && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                      {showAsh && <span className="text-[10px] text-slate-400/60 flex-shrink-0">ans</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {/* CQ parts in exam result */}
            {r.q.type === "cq" && r.q.parts && r.q.parts.length > 0 && (
              <div className="ml-10 space-y-2">
                {r.q.parts.map(part => {
                  const color = CQ_COLORS[part.key] ?? "#6b7280";
                  const hasSol = !!(part.solution || part.aiSolution);
                  return (
                    <div key={part.key} className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                      <div className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: `${color}25`, color }}>{CQ_LABELS[part.key] ?? part.key}</span>
                          <div className="text-sm text-white/80 leading-relaxed flex-1"><MathText text={part.text} /></div>
                        </div>
                        {hasSol && (
                          <div className="ml-8 space-y-2">
                            {part.solution && <div className="p-3 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}><p className="text-xs font-semibold mb-1" style={{ color: `${color}70` }}>Solution</p><div className="text-sm text-white/70"><MathText text={part.solution} /></div></div>}
                            {part.aiSolution && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15"><p className="text-xs font-semibold text-purple-400/50 mb-1">AI Solution</p><div className="text-sm text-white/65"><MathText text={part.aiSolution} /></div></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {r.q.solution && <div className="ml-10 p-3 rounded-xl bg-white/4 border border-white/8"><p className="text-xs font-semibold text-white/30 mb-1">Solution</p><div className="text-sm text-white/65"><MathText text={r.q.solution} /></div></div>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useExamTimer(durationSecs: number | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState<number | null>(durationSecs);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (durationSecs == null) return;
    setRemaining(durationSecs);
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev == null || prev <= 1) { clearInterval(ref.current!); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [durationSecs]);
  const formatted = remaining != null ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}` : null;
  return { remaining, formatted };
}

// ─── Main QuestionSetView ──────────────────────────────────────────────────────
export function QuestionSetView() {
  const params = useParams();
  const setId = parseInt(params.id ?? "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const highlightId = parseInt(new URLSearchParams(searchStr).get("highlight") ?? "", 10) || null;

  const { data, isLoading } = useGetQuestionSet(setId);
  const { data: breadcrumbs = [] } = useGetFolderBreadcrumb(data?.set?.folderId ?? 0);

  const [mode, setMode] = useState<AppMode>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [localQuestions, setLocalQuestions] = useState<Question[] | null>(null);

  // When a ?highlight=id param is present, auto-enter solution mode and scroll to that question
  useEffect(() => {
    if (!highlightId || isLoading || !data) return;
    setMode("solution");
    setHighlightedId(highlightId);
    // Scroll after the cards have rendered
    const timer = setTimeout(() => {
      const idx = (data.questions ?? []).findIndex(q => q.id === highlightId);
      if (idx !== -1) {
        cardRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear the highlight ring after 4 seconds
      setTimeout(() => setHighlightedId(null), 4000);
    }, 400);
    return () => clearTimeout(timer);
  }, [highlightId, isLoading, data]);
  const [addOpen, setAddOpen] = useState(false);

  // Multi-select / copy
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  // Stable toggle — never recreated, safe to use with React.memo cards
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Reorder
  const [reorderOrder, setReorderOrder] = useState<Question[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Practice
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceRevealedId, setPracticeRevealedId] = useState<number | null>(null);
  const [practiceCurrentIdx, setPracticeCurrentIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);

  // Exam
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [showExamGrid, setShowExamGrid] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const questions = localQuestions ?? data?.questions ?? [];
  const visible = questions.filter(q => !q.hidden);

  const handleUpdated = useCallback((updated: Question) => {
    setLocalQuestions(prev => (prev ?? data?.questions ?? []).map(q => q.id === updated.id ? updated : q));
    queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
  }, [data, setId, queryClient]);

  const handleDeleted = useCallback((id: number) => {
    setLocalQuestions(prev => (prev ?? data?.questions ?? []).filter(q => q.id !== id));
    queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
  }, [data, setId, queryClient]);

  const handleAdded = useCallback((q: Question) => {
    setLocalQuestions(prev => [...(prev ?? data?.questions ?? []), q]);
    queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
  }, [data, setId, queryClient]);

  const handleReorderToPosition = useCallback(async (questionId: number, newPos: number) => {
    const current = localQuestions ?? data?.questions ?? [];
    const fromIdx = current.findIndex(q => q.id === questionId);
    if (fromIdx === -1) return;
    const toIdx = newPos - 1;
    const arr = [...current];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    const items = arr.map((q, i) => ({ id: q.id, position: i + 1 }));
    setLocalQuestions(arr);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/sets/${setId}/questions/reorder`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
      });
      queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
    } catch { setLocalQuestions(current); }
  }, [data, setId, localQuestions, queryClient]);

  const enterReorder = () => { setReorderOrder([...visible]); setMode("reorder"); };
  const moveQuestion = (idx: number, dir: "up" | "down") => {
    const arr = [...reorderOrder]; const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setReorderOrder(arr);
  };
  const saveReorder = async () => {
    setSavingOrder(true);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/sets/${setId}/questions/reorder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderOrder.map((q, i) => ({ id: q.id, position: i + 1 })) }),
      });
      setLocalQuestions(reorderOrder);
      queryClient.invalidateQueries({ queryKey: getGetQuestionSetQueryKey(setId) });
      toast({ title: "Reordered", description: "Question order saved with new serial numbers." });
      setMode(null);
    } finally { setSavingOrder(false); }
  };

  const scrollToQuestion = (idx: number) => {
    cardRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navigatePractice = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, visible.length - 1));
    setPracticeCurrentIdx(clamped);
    setTimeout(() => cardRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [visible.length]);

  const handlePracticeSelect = useCallback((questionId: number, letter: string) => {
    setPracticeAnswers(prev => ({ ...prev, [questionId]: letter }));
    setPracticeRevealedId(questionId);
    // Auto-advance only when auto-scroll is on
    if (autoScroll) {
      setTimeout(() => {
        setPracticeCurrentIdx(prev => {
          const nextIdx = visible.findIndex((q, i) => i > prev && !practiceAnswers[q.id] && q.id !== questionId);
          const advance = nextIdx !== -1 ? nextIdx : prev + 1 < visible.length ? prev + 1 : prev;
          cardRefs.current[advance]?.scrollIntoView({ behavior: "smooth", block: "center" });
          return advance;
        });
      }, 900);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, practiceAnswers, autoScroll]);

  const { formatted: timerFormatted } = useExamTimer(
    mode === "exam" && examStarted && !examSubmitted ? selectedDuration : null,
    () => { setExamSubmitted(true); toast({ title: "Time's up!", description: "Exam auto-submitted." }); }
  );

  const practiceCorrect = useMemo(() =>
    visible.filter(q => q.answer && practiceAnswers[q.id] && practiceAnswers[q.id].toUpperCase() === q.answer.toUpperCase()).length,
    [visible, practiceAnswers]
  );
  const practiceWrong = useMemo(() =>
    visible.filter(q => practiceAnswers[q.id] && q.answer && practiceAnswers[q.id].toUpperCase() !== q.answer.toUpperCase()).length,
    [visible, practiceAnswers]
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-4">
        <Skeleton className="h-5 w-48 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      </div>
    );
  }
  if (!data?.set) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-white/70">Question set not found</h2>
        <Link href="/"><Button variant="outline">Return Home</Button></Link>
      </div>
    );
  }

  const { set } = data;

  // ── Mode selector ──
  if (mode === null) {
    return (
      <>
        <ModeSelector set={set} questionCount={visible.length} breadcrumbs={breadcrumbs}
          onSelectMode={m => {
            setMode(m);
            setPracticeAnswers({});
            setPracticeRevealedId(null);
            setPracticeCurrentIdx(0);
            setExamAnswers({});
            setExamSubmitted(false);
            setExamStarted(false);
            setSelectedDuration(null);
          }}
          onReorder={enterReorder}
          onAddQuestion={() => setAddOpen(true)}
          onCopy={() => { setSelectedIds(new Set()); setMode("copy"); }} />
        {addOpen && <AddQuestionDialog setId={setId} onAdded={handleAdded} onClose={() => setAddOpen(false)} />}
      </>
    );
  }

  // ── Copy mode ──
  if (mode === "copy") {
    const allIds = visible.map(q => q.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    return (
      <div className="min-h-[100dvh] flex flex-col">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-b border-white/8">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <button onClick={() => { setMode(null); setSelectedIds(new Set()); }}
              className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <span className="font-semibold text-white/80 flex-1 truncate text-sm">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select questions to copy"}
            </span>
            <button
              onClick={() => {
                if (allSelected) setSelectedIds(new Set());
                else setSelectedIds(new Set(allIds));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={allSelected
                ? { background: "rgba(99,102,241,0.2)", borderColor: "rgba(99,102,241,0.5)", color: "#a5b4fc" }
                : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        {/* Question list */}
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 space-y-2 pt-16 pb-28">
          {visible.map((q, idx) => {
            const isSelected = selectedIds.has(q.id);
            const isCq = q.type === "cq";
            const isSq = q.type === "sq";
            return (
              <button key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${isSelected ? "border-indigo-500/60 bg-indigo-500/10" : "border-white/8 bg-white/3 hover:bg-white/5"}`}>
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${isCq ? "bg-amber-500/15 text-amber-400/80" : isSq ? "bg-sky-500/15 text-sky-400/80" : "bg-white/8 text-white/50"}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/75 leading-relaxed line-clamp-2">
                    {q.questionText || <span className="italic text-white/25">No text</span>}
                  </p>
                  <p className="text-[11px] text-white/25 mt-1 uppercase font-semibold">{q.type}{q.linkId ? " · linked" : ""}</p>
                </div>
                <div className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-all ${isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/20 bg-transparent"}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Floating copy button */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4">
            <button onClick={() => setCopyDialogOpen(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-full shadow-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.45)" }}>
              <Link2 className="w-4 h-4 text-white" />
              <span className="text-white">Copy {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""} to set</span>
            </button>
          </div>
        )}

        {copyDialogOpen && (
          <CopyToSetDialog
            currentSetId={setId}
            selectedQuestionIds={[...selectedIds]}
            onClose={() => setCopyDialogOpen(false)}
            onLinked={() => { setMode(null); setSelectedIds(new Set()); setCopyDialogOpen(false); }}
          />
        )}
      </div>
    );
  }

  // ── Reorder ──
  if (mode === "reorder") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 space-y-4 pb-24">
        <div className="flex items-center gap-3 sticky top-0 z-20 bg-background/90 backdrop-blur-md py-3 -mx-4 px-4 border-b border-white/8">
          <button onClick={() => setMode(null)} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"><ChevronLeft className="w-4 h-4 text-white/60" /></button>
          <span className="font-bold text-white/80 flex-1 truncate">Reorder Questions</span>
          <Button variant="outline" size="sm" onClick={() => setMode(null)} className="border-white/10 text-white/40 h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={saveReorder} disabled={savingOrder} className="bg-emerald-500 hover:bg-emerald-400 text-white h-8 text-xs gap-1.5">
            {savingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
          </Button>
        </div>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300/80 flex items-center gap-2">
          <Hash className="w-4 h-4 flex-shrink-0" />Serial numbers will update to match the new order when saved.
        </div>
        <div className="space-y-2">
          {reorderOrder.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-white/4 p-3 flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">{idx + 1}</div>
                <button onClick={() => moveQuestion(idx, "up")} disabled={idx === 0} className="w-6 h-6 rounded-md bg-white/6 hover:bg-white/12 flex items-center justify-center disabled:opacity-20"><ArrowUp className="w-3 h-3 text-white/50" /></button>
                <button onClick={() => moveQuestion(idx, "down")} disabled={idx === reorderOrder.length - 1} className="w-6 h-6 rounded-md bg-white/6 hover:bg-white/12 flex items-center justify-center disabled:opacity-20"><ArrowDown className="w-3 h-3 text-white/50" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">{q.questionText || <span className="text-white/25 italic">No text</span>}</p>
                <p className="text-xs text-white/25 mt-1 uppercase">{q.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Exam results ──
  if (mode === "exam" && examSubmitted) {
    return (
      <>
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-white/8 px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setMode(null); setExamSubmitted(false); setExamAnswers({}); }} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center"><ChevronLeft className="w-4 h-4 text-white/60" /></button>
          <span className="font-bold text-white/80 flex-1 truncate">Exam Results — {set.name}</span>
        </div>
        <ExamResults questions={visible} examAnswers={examAnswers}
          onRetry={() => { setExamAnswers({}); setExamSubmitted(false); setExamStarted(false); setSelectedDuration(null); }}
          onBack={() => { setMode(null); setExamSubmitted(false); setExamAnswers({}); }} />
      </>
    );
  }

  // ── Exam setup ──
  if (mode === "exam" && !examStarted) {
    const durations = [{ label: "30 min", secs: 1800 }, { label: "45 min", secs: 2700 }, { label: "60 min", secs: 3600 }, { label: "90 min", secs: 5400 }, { label: "No timer", secs: 0 }];
    return (
      <div className="max-w-sm mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3"><button onClick={() => setMode(null)} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center"><ChevronLeft className="w-4 h-4 text-white/60" /></button><h2 className="font-bold text-white/90 text-lg">Exam Setup</h2></div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center"><Timer className="w-6 h-6 text-indigo-400" /></div>
            <div><div className="font-bold text-white/90">{set.name}</div><div className="text-xs text-white/40">{visible.length} questions</div></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/35 mb-2 block">Select Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {durations.map(d => (
                <button key={d.secs} onClick={() => setSelectedDuration(d.secs === 0 ? null : d.secs)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${(d.secs === 0 ? selectedDuration === null : selectedDuration === d.secs) ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "border-white/8 text-white/35 hover:border-white/20"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => setExamStarted(true)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            <Timer className="w-4 h-4" /> Start Exam
          </Button>
        </div>
      </div>
    );
  }

  // ── Practice & Solution & Exam question views ──
  const isPractice = mode === "practice";
  const isSolution = mode === "solution";
  const isExam = mode === "exam";

  const answeredCount = isExam ? Object.keys(examAnswers).length : Object.keys(practiceAnswers).length;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* ── Sticky header ── */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-b border-white/8">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => navigate(`/folders/${data?.set?.folderId ?? ""}`)} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <span className="font-semibold text-white/80 flex-1 truncate text-sm">{set.name}</span>
          {/* Mode badge */}
          <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isPractice ? "bg-amber-500/15 text-amber-400" : isSolution ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-500/15 text-indigo-400"}`}>
            {isPractice ? "Practice" : isSolution ? "Solution" : "Exam"}
          </span>
          {/* Practice stats */}
          {isPractice && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-emerald-400">✓{practiceCorrect}</span>
              <span className="text-xs font-bold text-red-400">✗{practiceWrong}</span>
              <span className="text-xs text-white/30">{answeredCount}/{visible.length}</span>
            </div>
          )}
          {/* Exam timer + count */}
          {isExam && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {timerFormatted && <span className={`text-xs font-mono font-bold ${timerFormatted < "05:00" ? "text-red-400" : "text-white/60"}`}>{timerFormatted}</span>}
              <span className="text-xs text-white/30">{answeredCount}/{visible.length}</span>
            </div>
          )}
          {/* Solution count + select toggle */}
          {isSolution && !selectMode && (
            <>
              <span className="text-xs text-white/30 flex-shrink-0">{visible.length} qs</span>
              <button onClick={() => setSelectMode(true)}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400/70 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors">
                <Copy className="w-3 h-3" /> Copy
              </button>
            </>
          )}
          {isSolution && selectMode && (
            <>
              <span className="text-xs font-bold text-indigo-400 flex-shrink-0">{selectedIds.size} selected</span>
              <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="flex-shrink-0 text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-full hover:bg-white/8 transition-colors">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Question list ── */}
      <div className={`flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 space-y-3 pt-16 ${isPractice ? "pb-40" : "pb-28"}`}>
        {visible.map((q, idx) => (
          <LazyCard
            key={q.id}
            q={q}
            serialNum={idx + 1}
            totalCount={visible.length}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onReorderToPosition={isSolution ? handleReorderToPosition : undefined}
            mode={isSolution ? "solution" : isPractice ? "practice" : "exam"}
            practiceSelected={isPractice ? (practiceAnswers[q.id] ?? null) : undefined}
            practiceRevealed={isPractice ? (practiceAnswers[q.id] != null) : undefined}
            onPracticeSelect={isPractice ? (letter) => handlePracticeSelect(q.id, letter) : undefined}
            examSelected={isExam ? (examAnswers[q.id] ?? null) : undefined}
            examSubmitted={isExam ? examSubmitted : undefined}
            onExamSelect={isExam ? (letter) => setExamAnswers(prev => ({ ...prev, [q.id]: letter })) : undefined}
            cardRef={(el) => { cardRefs.current[idx] = el; }}
            selectMode={isSolution ? selectMode : undefined}
            selected={isSolution ? selectedIds.has(q.id) : undefined}
            onToggleSelect={isSolution ? () => toggleSelect(q.id) : undefined}
            isHighlighted={highlightedId === q.id}
          />
        ))}
        {/* Exam submit */}
        {isExam && !examSubmitted && (
          <div className="pt-4">
            <Button onClick={() => { if (confirm(`Submit exam? You've answered ${answeredCount}/${visible.length} questions.`)) setExamSubmitted(true); }}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base gap-2 rounded-2xl">
              <Trophy className="w-5 h-5" /> Submit Exam
            </Button>
          </div>
        )}
      </div>

      {/* ── Practice footer navigation ── */}
      {isPractice && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-white/8">
          {/* Stats row */}
          <div className="max-w-3xl mx-auto px-4 pt-2 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">✓ {practiceCorrect}</span>
              <span className="text-[10px] text-white/20">correct</span>
            </div>
            <span className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-red-400">✗ {practiceWrong}</span>
              <span className="text-[10px] text-white/20">wrong</span>
            </div>
            <span className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-indigo-400">
                {answeredCount > 0 ? Math.round((practiceCorrect / answeredCount) * 100) : 0}%
              </span>
              <span className="text-[10px] text-white/20">accuracy</span>
            </div>
          </div>
          {/* Nav row */}
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <button
              onClick={() => navigatePractice(practiceCurrentIdx - 1)}
              disabled={practiceCurrentIdx === 0}
              className="w-10 h-10 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center transition-all hover:bg-white/12 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-white/70" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/80 tabular-nums">Q {practiceCurrentIdx + 1}</span>
              <span className="text-xs text-white/20">/</span>
              <span className="text-xs text-white/40 tabular-nums">{visible.length}</span>
              {practiceAnswers[visible[practiceCurrentIdx]?.id] != null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  practiceAnswers[visible[practiceCurrentIdx]?.id]?.toUpperCase() === (visible[practiceCurrentIdx]?.answer ?? "").toUpperCase()
                    ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {practiceAnswers[visible[practiceCurrentIdx]?.id]?.toUpperCase() === (visible[practiceCurrentIdx]?.answer ?? "").toUpperCase() ? "✓" : "✗"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-scroll toggle */}
              <button
                onClick={() => setAutoScroll(v => !v)}
                title={autoScroll ? "Auto-scroll: ON" : "Auto-scroll: OFF"}
                className={`flex items-center gap-1 rounded-xl text-xs font-semibold border transition-all ${autoScroll ? "px-2.5 py-1.5 bg-amber-500/20 border-amber-500/40 text-amber-300" : "w-10 h-10 justify-center bg-white/5 border-white/10 text-white/30 hover:text-white/50"}`}
              >
                <Zap className="w-3.5 h-3.5" />
                {autoScroll && <span>Auto</span>}
              </button>
              <button
                onClick={() => navigatePractice(practiceCurrentIdx + 1)}
                disabled={practiceCurrentIdx >= visible.length - 1}
                className="w-10 h-10 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center transition-all hover:bg-white/12 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating button (Practice & Exam) ── */}
      {(isPractice || isExam) && !examSubmitted && (
        <button onClick={() => isPractice ? setShowResults(true) : setShowExamGrid(true)}
          className={`fixed z-30 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 right-4 ${isPractice ? "bottom-24" : "bottom-6"}`}
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
          <List className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Add question button (solution mode, not in select mode) */}
      {isSolution && !selectMode && (
        <div className="fixed bottom-6 right-4 z-30 flex flex-col gap-2">
          <button onClick={() => setAddOpen(true)}
            className="w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 32px rgba(34,197,94,0.35)" }}>
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
      {/* Copy button — shows when questions are selected */}
      {isSolution && selectMode && selectedIds.size > 0 && (
        <button onClick={() => setCopyDialogOpen(true)}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.45)" }}>
          <Link2 className="w-4 h-4 text-white" />
          <span className="text-white">Copy {selectedIds.size} to set</span>
        </button>
      )}

      {/* ── Results / Grid overlays ── */}
      <AnimatePresence>
        {(showResults || showExamGrid) && (
          <ResultsGrid
            questions={visible}
            practiceAnswers={practiceAnswers}
            practiceRevealedId={practiceRevealedId}
            examAnswers={examAnswers}
            examSubmitted={examSubmitted}
            mode={isPractice ? "practice" : "exam"}
            onClose={() => { setShowResults(false); setShowExamGrid(false); }}
            onScrollTo={scrollToQuestion}
          />
        )}
      </AnimatePresence>

      {addOpen && <AddQuestionDialog setId={setId} onAdded={handleAdded} onClose={() => setAddOpen(false)} />}
      {copyDialogOpen && (
        <CopyToSetDialog
          currentSetId={setId}
          selectedQuestionIds={[...selectedIds]}
          onClose={() => setCopyDialogOpen(false)}
          onLinked={() => { setSelectMode(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Trash2, CheckCircle, HelpCircle, Layers, Pencil, Check, ArrowUp, ArrowDown, X, Loader2, ChevronRight } from "lucide-react";
import { QuestionSet, useDeleteQuestionSet, getListQuestionSetsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface QuestionSetCardProps {
  set: QuestionSet;
  index: number;
  folderColor: string;
  folderId: number;
  reorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onRenamed?: (id: number, newName: string) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
  mcq: { label: "MCQ", color: "#22c55e", Icon: CheckCircle },
  cq: { label: "CQ", color: "#f59e0b", Icon: HelpCircle },
  sq: { label: "SQ", color: "#0ea5e9", Icon: BookOpen },
  mixed: { label: "Mixed", color: "#8b5cf6", Icon: Layers },
  unknown: { label: "Set", color: "#64748b", Icon: BookOpen },
};

export function QuestionSetCard({ set, index, folderId, reorderMode = false, onMoveUp, onMoveDown, isFirst, isLast, onRenamed }: QuestionSetCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteSet = useDeleteQuestionSet();

  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(set.name);
  const [saving, setSaving] = useState(false);

  const cfg = TYPE_CONFIG[set.examType ?? "unknown"] ?? TYPE_CONFIG.unknown;
  const TypeIcon = cfg.Icon;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Delete "${set.name}"? This removes all ${set.totalQuestions} questions.`)) return;
    try {
      await deleteSet.mutateAsync({ id: set.id });
      queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const commitRename = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === set.name) { setRenaming(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/sets/${set.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) });
      if (!res.ok) throw new Error("Rename failed");
      onRenamed?.(set.id, trimmed);
      queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) });
      setRenaming(false);
    } catch { toast({ title: "Rename failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  const cardContent = (
    <div className="relative group w-full flex items-center gap-4 px-6 py-5 bg-card border border-border rounded-[1.25rem] cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all min-h-[5.5rem]">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
        <TypeIcon className="w-6 h-6" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }} className="flex-1 bg-background border border-primary/50 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0" />
            <button onClick={commitRename} disabled={saving} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
            <button onClick={() => setRenaming(false)} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{set.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: cfg.color }}>{cfg.label}</span>
              <span className="text-sm font-medium text-muted-foreground">{set.totalQuestions} Questions</span>
            </div>
          </>
        )}
      </div>

      {!reorderMode && !renaming && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={e => { e.preventDefault(); setNameInput(set.name); setRenaming(true); }} className="w-9 h-9 rounded-full bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-muted hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-muted-foreground transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors ml-2" />
        </div>
      )}
    </div>
  );

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative block">
      {reorderMode ? (
        <div className="relative">
          {cardContent}
          <div className="absolute inset-0 flex items-center justify-between px-6 bg-background/90 backdrop-blur-md rounded-[1.25rem] border-2 border-primary">
            <span className="text-xl font-black text-primary w-8 text-center">{index + 1}</span>
            <div className="flex gap-2">
              <button onClick={onMoveUp} disabled={isFirst} className="w-10 h-10 rounded-full border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted"><ArrowUp className="w-5 h-5" /></button>
              <button onClick={onMoveDown} disabled={isLast} className="w-10 h-10 rounded-full border bg-card flex items-center justify-center disabled:opacity-30 hover:bg-muted"><ArrowDown className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/sets/${set.id}`}>{cardContent}</Link>
      )}
    </motion.div>
  );
}

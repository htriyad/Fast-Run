import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Trash2, CheckCircle, HelpCircle, Layers, Pencil, Check, ArrowUp, ArrowDown, X, Loader2 } from "lucide-react";
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
  unknown: { label: "?", color: "#64748b", Icon: BookOpen },
};

export function QuestionSetCard({
  set, index, folderColor, folderId,
  reorderMode = false, onMoveUp, onMoveDown, isFirst, isLast, onRenamed,
}: QuestionSetCardProps) {
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
      toast({ title: "Deleted", description: `"${set.name}" removed.` });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const startRename = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setNameInput(set.name); setRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === set.name) { setRenaming(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/sets/${set.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Rename failed");
      onRenamed?.(set.id, trimmed);
      queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) });
      setRenaming(false);
    } catch { toast({ title: "Rename failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  const cardContent = (
    <div
      className="relative group w-full overflow-hidden border transition-all duration-200 rounded-2xl flex items-center gap-3 px-3 py-3 cursor-pointer hover:shadow-lg hover:shadow-black/20 min-h-[4rem]"
      style={{ backgroundColor: `${cfg.color}0d`, borderColor: `${cfg.color}28` }}
    >
      {/* Subtle glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: cfg.color }} />

      {/* Icon */}
      <div className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}1e` }}>
        <TypeIcon className="w-4 h-4" style={{ color: cfg.color }} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white/90 focus:outline-none focus:border-white/40 min-w-0" />
            <button onClick={commitRename} disabled={saving} className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-500/20 hover:bg-emerald-500/35">
              {saving ? <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" /> : <Check className="w-3 h-3 text-emerald-400" />}
            </button>
            <button onClick={() => setRenaming(false)} className="w-6 h-6 rounded-md flex items-center justify-center bg-white/8 hover:bg-white/15">
              <X className="w-3 h-3 text-white/40" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-white/90 group-hover:text-white transition-colors text-xs leading-snug">{set.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-white/30">{set.totalQuestions}q</span>
              {set.examType && set.examType !== "unknown" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!reorderMode && !renaming && (
        <div className="relative z-10 flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={startRename} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}28` }}>
            <Pencil className="w-3 h-3" style={{ color: cfg.color }} />
          </button>
          <button onClick={handleDelete} disabled={deleteSet.isPending} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:bg-red-500/20" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Trash2 className="w-3 h-3 text-white/35" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.3, delay: reorderMode ? 0 : index * 0.03, ease: [0.23, 1, 0.32, 1] }}
      whileHover={reorderMode ? {} : { y: -1, transition: { duration: 0.15 } }}
      className="relative"
    >
      {reorderMode ? (
        <div className="relative">
          {cardContent}
          <div className="absolute inset-0 flex items-center justify-between px-3 bg-black/35 backdrop-blur-[1px] rounded-2xl">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg" style={{ backgroundColor: cfg.color, color: "#000" }}>{index + 1}</div>
            <div className="flex flex-col gap-1">
              <button onClick={onMoveUp} disabled={isFirst} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-20"><ArrowUp className="w-3 h-3 text-white" /></button>
              <button onClick={onMoveDown} disabled={isLast} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-20"><ArrowDown className="w-3 h-3 text-white" /></button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/sets/${set.id}`}>{cardContent}</Link>
      )}
    </motion.div>
  );
}

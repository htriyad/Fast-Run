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
  mcq:     { label: "MCQ",   color: "#22c55e", Icon: CheckCircle },
  cq:      { label: "CQ",    color: "#f59e0b", Icon: HelpCircle  },
  sq:      { label: "SQ",    color: "#0ea5e9", Icon: BookOpen    },
  mixed:   { label: "Mix",   color: "#8b5cf6", Icon: Layers      },
  unknown: { label: "Set",   color: "#64748b", Icon: BookOpen    },
};

export function QuestionSetCard({
  set, index, folderId, reorderMode = false,
  onMoveUp, onMoveDown, isFirst, isLast, onRenamed,
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
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const commitRename = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === set.name) { setRenaming(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/sets/${set.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      onRenamed?.(set.id, trimmed);
      queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) });
      setRenaming(false);
    } catch { toast({ title: "Rename failed", variant: "destructive" }); } finally { setSaving(false); }
  };

  const row = (
    <div className="group relative flex items-center gap-3 px-3.5 py-2.5 bg-card border border-border rounded-xl cursor-pointer hover:border-border/80 hover:bg-card transition-all duration-100">
      {/* Type dot */}
      <div
        className="w-1.5 h-5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.color }}
      />

      {/* Type badge */}
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
        style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
      >
        {cfg.label}
      </span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
              className="flex-1 min-w-0 bg-background border border-primary/40 rounded-lg px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button onClick={commitRename} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setRenaming(false)} className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground truncate">{set.name}</p>
        )}
      </div>

      {/* Count */}
      {!renaming && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{set.totalQuestions}q</span>
      )}

      {/* Hover actions */}
      {!reorderMode && !renaming && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.preventDefault(); setNameInput(set.name); setRenaming(true); }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
        </div>
      )}
      {!reorderMode && !renaming && (
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:hidden shrink-0" />
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="relative"
    >
      {reorderMode ? (
        <div className="relative">
          {row}
          <div className="absolute inset-0 flex items-center justify-between px-3 bg-background/90 backdrop-blur-sm rounded-xl border-2 border-primary/50">
            <span className="text-xs font-bold text-primary">{index + 1}</span>
            <div className="flex gap-1.5">
              <button onClick={onMoveUp} disabled={isFirst} className="w-7 h-7 rounded-lg border bg-card flex items-center justify-center disabled:opacity-30">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={onMoveDown} disabled={isLast} className="w-7 h-7 rounded-lg border bg-card flex items-center justify-center disabled:opacity-30">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/sets/${set.id}`}>{row}</Link>
      )}
    </motion.div>
  );
}

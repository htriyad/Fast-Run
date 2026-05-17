import { Folder } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, ChevronRight, ArrowUp, ArrowDown, Move, Layers } from "lucide-react";
import { getIcon } from "@/lib/folderIcons";
import { getStyle } from "@/lib/folderStyles";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";

const LONG_PRESS_MS = 600;

interface FolderCardProps {
  folder: Folder;
  index: number;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onMove?: (folder: Folder) => void;
  reorderMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function FolderCard({ folder, index, onEdit, onDelete, onMove, reorderMode = false, onMoveUp, onMoveDown, isFirst, isLast }: FolderCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClick = useRef(false);
  const [pressing, setPressing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const startPress = useCallback(() => {
    if (reorderMode || !onMove) return;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      suppressNextClick.current = true;
      setPressing(false);
      if (navigator.vibrate) navigator.vibrate(40);
      onMove(folder);
    }, LONG_PRESS_MS);
  }, [folder, onMove, reorderMode]);

  const cancelPress = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPressing(false);
  }, []);

  const IconComponent = getIcon(folder.icon);
  const style = getStyle(folder.style ?? "default");

  const cardContent = (
    <div
      className={cn(
        "relative group w-full cursor-pointer overflow-hidden transition-all duration-300 rounded-[1.5rem]",
        style.heightClass || "h-40",
        reorderMode && "cursor-default pointer-events-none select-none",
        pressing && "scale-[0.98]"
      )}
      style={{
        backgroundColor: "var(--color-card)",
        border: `2px solid ${hovered ? folder.color : "transparent"}`,
        boxShadow: hovered ? `0 12px 30px ${folder.color}25` : "0 4px 20px rgba(0,0,0,0.05)",
      }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={() => { cancelPress(); setHovered(false); }}
      onPointerCancel={cancelPress}
      onPointerEnter={() => setHovered(true)}
    >
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300" style={{ backgroundColor: folder.color }} />
      <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[100%] opacity-20 transition-transform duration-500 group-hover:scale-125" style={{ backgroundColor: folder.color }} />

      <div className="relative h-full flex flex-col p-6 z-10">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:-translate-y-1" style={{ backgroundColor: folder.color, color: "#fff" }}>
            <IconComponent className="w-7 h-7" strokeWidth={2} />
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={e => { e.preventDefault(); onEdit(folder); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-background/80 hover:bg-background shadow text-foreground border border-border">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={e => { e.preventDefault(); onDelete(folder); }} className="w-8 h-8 rounded-full flex items-center justify-center bg-background/80 hover:bg-red-50 hover:text-red-500 shadow text-foreground border border-border">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-end justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-xl font-bold tracking-tight truncate text-foreground">{folder.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm font-medium text-muted-foreground">
              <Layers className="w-4 h-4" /> {folder.childCount} items
            </div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center border border-border bg-background group-hover:bg-foreground group-hover:text-background transition-colors shadow-sm">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: reorderMode ? 0 : index * 0.05, ease: "easeOut" }}
      className={cn("relative block", style.gridClass)}
    >
      {reorderMode ? (
        <div className="relative">
          {cardContent}
          <div className="absolute inset-0 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm rounded-[1.5rem] border-2 border-primary">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black bg-primary text-primary-foreground">{index + 1}</div>
            <div className="flex flex-col gap-2">
              <button onClick={onMoveUp} disabled={isFirst} className="w-10 h-10 rounded-full bg-card shadow border flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-5 h-5 text-foreground" /></button>
              <button onClick={onMoveDown} disabled={isLast} className="w-10 h-10 rounded-full bg-card shadow border flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-5 h-5 text-foreground" /></button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/folders/${folder.id}`} onClick={e => { if (suppressNextClick.current) { suppressNextClick.current = false; e.preventDefault(); } }}>
          {cardContent}
          <AnimatePresence>
            {pressing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-[1.5rem] z-20">
                <Move className="w-8 h-8 text-primary mb-2 animate-bounce" />
                <span className="font-bold text-foreground">Hold to Move</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      )}
    </motion.div>
  );
}

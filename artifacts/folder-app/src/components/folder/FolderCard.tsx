import { Folder } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, ChevronRight, ArrowUp, ArrowDown, Move } from "lucide-react";
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

export function FolderCard({
  folder,
  index,
  onEdit,
  onDelete,
  onMove,
  reorderMode = false,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: FolderCardProps) {
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
  const isFlat = folder.style === "flat";
  const isWide = folder.style === "wide";

  const cardContent = (
    <div
      className={cn(
        "relative group w-full cursor-pointer overflow-hidden transition-all duration-300",
        style.heightClass,
        style.radiusClass,
        isFlat ? "flex items-center gap-4 px-5" : "flex flex-col justify-between p-5",
        reorderMode && "cursor-default pointer-events-none select-none",
        pressing && "scale-[0.97]"
      )}
      style={{
        backgroundColor: `${folder.color}0e`,
        border: hovered && !pressing
          ? `1px solid ${folder.color}55`
          : pressing
            ? `1px solid ${folder.color}80`
            : `1px solid ${folder.color}28`,
        boxShadow: hovered && !pressing
          ? `0 0 0 1px ${folder.color}20, 0 8px 32px ${folder.color}18, inset 0 1px 0 ${folder.color}15`
          : pressing
            ? `0 0 0 2px ${folder.color}60, 0 4px 20px ${folder.color}25`
            : `0 2px 12px rgba(0,0,0,0.15)`,
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s, background-color 0.2s",
      }}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={() => { cancelPress(); setHovered(false); }}
      onPointerCancel={cancelPress}
      onPointerEnter={() => setHovered(true)}
      onContextMenu={e => { e.preventDefault(); }}
    >
      {/* Frosted glass top highlight */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${folder.color}40, transparent)` }} />

      {/* Background glow orb */}
      <div
        className={cn(
          "absolute rounded-full blur-3xl pointer-events-none transition-opacity duration-500",
          isFlat
            ? "-top-6 -right-6 w-20 h-20"
            : "-top-14 -right-14 w-44 h-44",
          hovered ? "opacity-30" : "opacity-12"
        )}
        style={{ backgroundColor: folder.color }}
      />

      {/* Animated corner glow on hover */}
      <div
        className={cn(
          "absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity duration-500",
          hovered ? "opacity-15" : "opacity-0"
        )}
        style={{ backgroundColor: folder.color }}
      />

      {isFlat ? (
        <>
          <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{
                backgroundColor: `${folder.color}20`,
                boxShadow: hovered ? `0 0 12px ${folder.color}30` : "none",
              }}
            >
              <IconComponent className="w-5 h-5" style={{ color: folder.color }} strokeWidth={1.8} />
            </div>
            <span className="font-semibold text-base truncate text-white/85 group-hover:text-white transition-colors">
              {folder.name}
            </span>
            {folder.childCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 transition-all"
                style={{
                  backgroundColor: `${folder.color}18`,
                  color: folder.color,
                  border: `1px solid ${folder.color}35`,
                }}
              >
                {folder.childCount}
              </span>
            )}
          </div>
          <ChevronRight
            className="w-4 h-4 flex-shrink-0 relative z-10 transition-all duration-300"
            style={{ color: hovered ? folder.color : "rgba(255,255,255,0.25)", transform: hovered ? "translateX(2px)" : "none" }}
          />
        </>
      ) : (
        <>
          <div className="relative z-10 flex items-start justify-between">
            {/* Icon */}
            <div
              className={cn(
                "rounded-2xl flex items-center justify-center transition-all duration-300",
                isWide ? "w-14 h-14" : "w-12 h-12"
              )}
              style={{
                backgroundColor: `${folder.color}20`,
                boxShadow: hovered ? `0 0 20px ${folder.color}35, inset 0 1px 0 ${folder.color}25` : "none",
              }}
            >
              <IconComponent
                className={cn("transition-transform duration-300", isWide ? "w-7 h-7" : "w-6 h-6")}
                style={{ color: folder.color, transform: hovered ? "scale(1.08)" : "scale(1)" }}
                strokeWidth={1.8}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {folder.childCount > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm"
                  style={{
                    backgroundColor: `${folder.color}18`,
                    color: folder.color,
                    border: `1px solid ${folder.color}35`,
                  }}
                >
                  {folder.childCount}
                </span>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(folder); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: `${folder.color}18`,
                  border: `1px solid ${folder.color}28`,
                }}
                data-testid={`button-edit-${folder.id}`}
              >
                <Pencil className="w-3.5 h-3.5" style={{ color: folder.color }} />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(folder); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95 hover:bg-red-500/20 hover:border-red-500/30"
                style={{
                  backgroundColor: `rgba(255,255,255,0.04)`,
                  border: `1px solid rgba(255,255,255,0.07)`,
                }}
                data-testid={`button-delete-${folder.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-white/35 hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <h3
              className={cn(
                "font-bold tracking-tight transition-colors truncate",
                isWide ? "text-xl" : "text-lg",
                hovered ? "text-white" : "text-white/85"
              )}
            >
              {folder.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs capitalize" style={{ color: `${folder.color}70` }}>
                {folder.style ?? "default"}
              </span>
              {/* Animated underline on hover */}
              <div className="h-px flex-1 rounded-full transition-all duration-300"
                style={{
                  background: hovered ? `linear-gradient(90deg, ${folder.color}50, transparent)` : "transparent",
                  opacity: hovered ? 1 : 0,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{
        duration: 0.38,
        delay: reorderMode ? 0 : index * 0.055,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={reorderMode ? {} : { y: -4, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      whileTap={reorderMode ? {} : { scale: 0.97 }}
      className={cn("relative", style.gridClass)}
      data-testid={`card-folder-${folder.id}`}
    >
      {reorderMode ? (
        <div className="relative">
          {cardContent}
          <div className="absolute inset-0 flex items-center justify-between px-4 bg-black/30 backdrop-blur-[1px] rounded-2xl">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
              style={{ backgroundColor: folder.color, color: "#fff" }}
            >
              {index + 1}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={onMoveUp} disabled={isFirst}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                <ArrowUp className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={onMoveDown} disabled={isLast}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                <ArrowDown className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link href={`/folders/${folder.id}`}
          onClick={e => { if (suppressNextClick.current) { suppressNextClick.current = false; e.preventDefault(); } }}>
          {cardContent}
          <AnimatePresence>
            {pressing && (
              <motion.div
                key="hold-hint"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
              >
                <Move className="w-5 h-5 text-white/80" />
                <span className="text-xs font-semibold text-white/70">Hold to move</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      )}
    </motion.div>
  );
}

import { useState } from "react";
import {
  useListFolders,
  useGetFolderStats,
  useReorderFolders,
  getListFoldersQueryKey,
  Folder,
} from "@workspace/api-client-react";
import { FolderCard } from "@/components/folder/FolderCard";
import { FolderFormDialog } from "@/components/folder/FolderFormDialog";
import { DeleteFolderDialog } from "@/components/folder/DeleteFolderDialog";
import { MoveFolderDialog } from "@/components/folder/MoveFolderDialog";
import { QuestionIdSearch } from "@/components/QuestionIdSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, FolderIcon, GripVertical, Check, Layers, Hash, Zap, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.94, filter: "blur(4px)" },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.22 } },
};

export function Home() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<Folder | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [localOrder, setLocalOrder] = useState<Folder[]>([]);
  const [idSearchOpen, setIdSearchOpen] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const { data: folders = [], isLoading } = useListFolders({ search: search || undefined });
  const { data: stats } = useGetFolderStats();
  const reorderFolders = useReorderFolders();
  const queryClient = useQueryClient();

  const displayFolders = reorderMode ? localOrder : folders;

  const enterReorderMode = () => { setLocalOrder([...folders]); setReorderMode(true); };

  const moveFolder = (idx: number, dir: "up" | "down") => {
    const arr = [...localOrder];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setLocalOrder(arr);
  };

  const saveOrder = async () => {
    await reorderFolders.mutateAsync({ data: { items: localOrder.map((f, i) => ({ id: f.id, position: i + 1 })) } });
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
    setReorderMode(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 md:px-10 md:py-12 space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                className="text-4xl md:text-5xl font-extrabold tracking-tight"
                style={isLight ? {
                  background: "linear-gradient(135deg, #3b1a00 30%, #6d3a00 65%, #7c3aed 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                } : {
                  background: "linear-gradient(135deg, #fff 30%, rgba(139,92,246,0.7) 70%, rgba(99,102,241,0.5) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                My Folders
              </h1>
            </motion.div>
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/8">
                  <Layers className="w-3 h-3 text-indigo-400/70" />
                  <span className="text-xs font-medium text-white/50">{stats.totalFolders} folders</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/8">
                  <span className="text-xs font-medium text-white/50">depth {stats.maxDepth}</span>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <ThemeToggle />
            {reorderMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setReorderMode(false)} className="border-white/10 text-white/60 hover:text-white">Cancel</Button>
                <Button size="sm" onClick={saveOrder} disabled={reorderFolders.isPending} className="bg-emerald-500 hover:bg-emerald-400 text-white gap-1.5">
                  <Check className="w-3.5 h-3.5" />Save Order
                </Button>
              </>
            ) : (
              <>
                {folders.length > 1 && (
                  <Button variant="outline" size="sm" onClick={enterReorderMode} className="border-white/10 text-white/50 hover:text-white gap-1.5">
                    <GripVertical className="w-3.5 h-3.5" />Reorder
                  </Button>
                )}
                <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-full shadow-lg font-semibold"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <Plus className="w-4 h-4" />New Folder
                </Button>
              </>
            )}
          </motion.div>
        </div>

        {!reorderMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Search folders..."
                className="pl-11 h-11 bg-white/4 border-white/8 rounded-2xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 text-white placeholder:text-white/25 transition-all duration-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIdSearchOpen(true)}
              title="Jump to question by ID"
              className="flex items-center gap-2 h-11 px-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 hover:border-indigo-500/40 transition-all text-white/40 hover:text-indigo-400 flex-shrink-0 text-sm font-medium"
            >
              <Hash className="w-4 h-4" />
              <span className="hidden sm:inline">Find by ID</span>
            </button>
          </motion.div>
        )}

        {reorderMode && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <GripVertical className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300/80">Use arrows on each card to set your preferred order</span>
          </motion.div>
        )}
      </header>

      {/* Mock Exam Banner */}
      {!reorderMode && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <Link href="/mock-exam">
            <div className="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(239,68,68,0.08) 50%, rgba(139,92,246,0.12) 100%)",
                borderColor: "rgba(245,158,11,0.22)",
                boxShadow: "0 4px 24px rgba(245,158,11,0.08)",
              }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))" }} />
              <div className="absolute top-0 inset-x-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), rgba(139,92,246,0.4), transparent)" }} />

              <div className="relative z-10 flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.20))", boxShadow: "0 0 16px rgba(245,158,11,0.20)" }}>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white/90 text-sm">Mock Exam</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                      New
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">Generate a timed MCQ exam from your question bank</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Grid */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/4 animate-pulse border border-white/5" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </motion.div>
      ) : displayFolders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center justify-center py-24 text-center space-y-5"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <FolderIcon className="w-10 h-10 text-indigo-400/60" strokeWidth={1.5} />
          </motion.div>
          <div>
            <h3 className="text-xl font-bold text-white/80">No folders yet</h3>
            <p className="text-white/35 max-w-xs mt-2 text-sm leading-relaxed">
              {search ? "Try a different search term." : "Create your first folder to start organizing your space beautifully."}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Plus className="w-4 h-4" />Create First Folder
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <AnimatePresence mode="popLayout">
            {displayFolders.map((folder, idx) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                index={idx}
                onEdit={setEditFolder}
                onDelete={setDeleteFolder}
                onMove={setMoveFolderTarget}
                reorderMode={reorderMode}
                onMoveUp={() => moveFolder(idx, "up")}
                onMoveDown={() => moveFolder(idx, "down")}
                isFirst={idx === 0}
                isLast={idx === displayFolders.length - 1}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <FolderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editFolder && <FolderFormDialog open={true} onOpenChange={(open) => !open && setEditFolder(null)} initialData={editFolder} />}
      {deleteFolder && (
        <DeleteFolderDialog open={true} onOpenChange={(open) => !open && setDeleteFolder(null)}
          folderId={deleteFolder.id} folderName={deleteFolder.name} />
      )}
      <MoveFolderDialog folder={moveFolderTarget} onClose={() => setMoveFolderTarget(null)} onMoved={() => queryClient.invalidateQueries()} />
      <QuestionIdSearch open={idSearchOpen} onClose={() => setIdSearchOpen(false)} />
    </div>
  );
}

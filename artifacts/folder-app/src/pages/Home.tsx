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
import { Search, Plus, FolderIcon, GripVertical, Check, Layers, Hash, Zap, ChevronRight, BarChart3, Database } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
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
    <div className="min-h-[100dvh] flex flex-col items-center">
      <div className="w-full max-w-[1200px] px-6 py-12 md:py-16 space-y-10">
        
        {/* Header Area */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-4">
                <Database className="w-3.5 h-3.5" /> Command Center
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
                Question Bank
              </h1>
            </motion.div>
            
            {stats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                  <FolderIcon className="w-4 h-4" /> {stats.totalFolders} Folders
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                  <BarChart3 className="w-4 h-4" /> Max Depth {stats.maxDepth}
                </div>
              </motion.div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
            <ThemeToggle />
            {reorderMode ? (
              <>
                <Button variant="ghost" onClick={() => setReorderMode(false)}>Cancel</Button>
                <Button onClick={saveOrder} disabled={reorderFolders.isPending} className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                  <Check className="w-4 h-4 mr-2" /> Save Order
                </Button>
              </>
            ) : (
              <>
                {folders.length > 1 && (
                  <Button variant="outline" onClick={enterReorderMode} className="hidden md:flex font-semibold">
                    <GripVertical className="w-4 h-4 mr-2" /> Reorder
                  </Button>
                )}
                <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> New Module
                </Button>
              </>
            )}
          </motion.div>
        </header>

        {/* Action Bar */}
        {!reorderMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 bg-card border-border rounded-xl text-base shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setIdSearchOpen(true)} className="h-14 px-6 rounded-xl border-border bg-card hover:bg-muted font-bold tracking-wide">
                <Hash className="w-4 h-4 mr-2" /> Find by ID
              </Button>
              
              <Link href="/mock-exam">
                <Button className="h-14 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold tracking-wide shadow-lg shadow-orange-500/20 border-none">
                  <Zap className="w-4 h-4 mr-2" /> Start Exam
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Modules Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Active Modules</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : displayFolders.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card/50">
              <FolderIcon className="w-16 h-16 text-muted-foreground mb-4" strokeWidth={1} />
              <h3 className="text-2xl font-bold text-foreground">No modules found</h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-sm">Create your first organizational module to start building your question bank.</p>
              {!search && (
                <Button onClick={() => setCreateOpen(true)} size="lg" className="font-bold">
                  <Plus className="w-5 h-5 mr-2" /> Create Module
                </Button>
              )}
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </div>

      <FolderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editFolder && <FolderFormDialog open={true} onOpenChange={(open) => !open && setEditFolder(null)} initialData={editFolder} />}
      {deleteFolder && <DeleteFolderDialog open={true} onOpenChange={(open) => !open && setDeleteFolder(null)} folderId={deleteFolder.id} folderName={deleteFolder.name} />}
      <MoveFolderDialog folder={moveFolderTarget} onClose={() => setMoveFolderTarget(null)} onMoved={() => queryClient.invalidateQueries()} />
      <QuestionIdSearch open={idSearchOpen} onClose={() => setIdSearchOpen(false)} />
    </div>
  );
}

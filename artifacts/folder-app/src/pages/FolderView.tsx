import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useListFolders,
  useGetFolder,
  useGetFolderBreadcrumb,
  useReorderFolders,
  useListQuestionSets,
  getListFoldersQueryKey,
  getListQuestionSetsQueryKey,
  Folder,
  QuestionSet,
} from "@workspace/api-client-react";
import { FolderCard } from "@/components/folder/FolderCard";
import { FolderFormDialog } from "@/components/folder/FolderFormDialog";
import { DeleteFolderDialog } from "@/components/folder/DeleteFolderDialog";
import { MoveFolderDialog } from "@/components/folder/MoveFolderDialog";
import { DecodeDialog } from "@/components/folder/DecodeDialog";
import { QuestionSetCard } from "@/components/folder/QuestionSetCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home as HomeIcon, Plus, FolderIcon, GripVertical, Check, Pencil, Trash2, BookOpen, BookMarked, Loader2, X, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { getIcon } from "@/lib/folderIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function FolderView() {
  const params = useParams();
  const folderId = parseInt(params.id ?? "0", 10);

  const { data: folder, isLoading: folderLoading } = useGetFolder(folderId);
  const { data: breadcrumbs = [], isLoading: breadcrumbLoading } = useGetFolderBreadcrumb(folderId);
  const { data: subfolders = [], isLoading: listLoading } = useListFolders({ parentId: folderId });
  const { data: questionSets = [], isLoading: setsLoading } = useListQuestionSets(folderId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<Folder | null>(null);
  const [decodeOpen, setDecodeOpen] = useState(false);
  const [newSetOpen, setNewSetOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetType, setNewSetType] = useState("");
  const [newSetSaving, setNewSetSaving] = useState(false);
  const [, navigate] = useLocation();

  const [folderReorderMode, setFolderReorderMode] = useState(false);
  const [localFolderOrder, setLocalFolderOrder] = useState<Folder[]>([]);
  const [setReorderMode, setSetReorderMode] = useState(false);
  const [localSetOrder, setLocalSetOrder] = useState<QuestionSet[]>([]);
  const [savingSetsOrder, setSavingSetsOrder] = useState(false);

  const reorderFolders = useReorderFolders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createNewSet = async () => {
    const name = newSetName.trim();
    if (!name) return;
    setNewSetSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/folders/${folderId}/sets`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, examType: newSetType.trim() || null }),
      });
      if (res.ok) {
        const set = await res.json();
        queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) });
        setNewSetOpen(false); setNewSetName(""); setNewSetType(""); navigate(`/sets/${set.id}`);
      } else {
        toast({ title: "Failed to create set", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Failed to create set", variant: "destructive" });
    } finally {
      setNewSetSaving(false);
    }
  };

  if (folderLoading || breadcrumbLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-8">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">Module not found</h2>
        <Link href="/"><Button>Return Home</Button></Link>
      </div>
    );
  }

  const FolderIconComp = getIcon(folder.icon);
  const displayFolders = folderReorderMode ? localFolderOrder : subfolders;
  const displaySets = setReorderMode ? localSetOrder : questionSets;

  const enterFolderReorder = () => { setLocalFolderOrder([...subfolders]); setFolderReorderMode(true); };
  const moveFolder = (idx: number, dir: "up" | "down") => {
    const arr = [...localFolderOrder]; const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return; [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setLocalFolderOrder(arr);
  };
  const saveFolderOrder = async () => {
    await reorderFolders.mutateAsync({ data: { items: localFolderOrder.map((f, i) => ({ id: f.id, position: i + 1 })) } });
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() }); setFolderReorderMode(false);
  };

  const enterSetReorder = () => { setLocalSetOrder([...questionSets]); setSetReorderMode(true); };
  const moveSet = (idx: number, dir: "up" | "down") => {
    const arr = [...localSetOrder]; const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return; [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setLocalSetOrder(arr);
  };
  const saveSetOrder = async () => {
    setSavingSetsOrder(true);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/folders/${folderId}/sets/reorder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: localSetOrder.map((s, i) => ({ id: s.id, position: i + 1 })) }),
      });
      queryClient.invalidateQueries({ queryKey: getListQuestionSetsQueryKey(folderId) }); setSetReorderMode(false);
    } finally { setSavingSetsOrder(false); }
  };

  const hasContent = subfolders.length > 0 || questionSets.length > 0;
  const anyReorderMode = folderReorderMode || setReorderMode;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center">
      <div className="w-full max-w-[1200px] px-6 py-10 space-y-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card px-4 py-2.5 rounded-xl border border-border w-max shadow-sm">
          <Link href="/"><button className="hover:text-primary transition-colors"><HomeIcon className="w-4 h-4" /></button></Link>
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 opacity-50" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-bold">{crumb.name}</span>
              ) : (
                <Link href={`/folders/${crumb.id}`}><button className="hover:text-primary transition-colors">{crumb.name}</button></Link>
              )}
            </span>
          ))}
        </nav>

        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-[2rem] border p-8 md:p-12 shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-8"
          style={{ borderColor: `${folder.color}30`, backgroundColor: `${folder.color}08` }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${folder.color}, transparent 60%)` }} />
          
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg bg-background"
              style={{ border: `2px solid ${folder.color}50`, boxShadow: `0 12px 40px ${folder.color}40` }}>
              <FolderIconComp className="w-12 h-12" style={{ color: folder.color }} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">{folder.name}</h1>
              <div className="flex items-center gap-4 mt-4 font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><FolderIcon className="w-4 h-4" /> {folder.childCount} submodules</span>
                <span className="flex items-center gap-1.5"><BookMarked className="w-4 h-4" /> {questionSets.length} sets</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {anyReorderMode ? (
              <>
                <Button variant="secondary" onClick={() => { setFolderReorderMode(false); setSetReorderMode(false); }}>Cancel</Button>
                {folderReorderMode && <Button onClick={saveFolderOrder} disabled={reorderFolders.isPending}><Check className="w-4 h-4 mr-2" /> Save Module Order</Button>}
                {setReorderMode && <Button onClick={saveSetOrder} disabled={savingSetsOrder}><Check className="w-4 h-4 mr-2" /> Save Set Order</Button>}
              </>
            ) : (
              <>
                <Button variant="outline" className="w-12 h-12 p-0 rounded-xl" onClick={() => setEditFolder(folder)}><Settings className="w-5 h-5" /></Button>
                <Button variant="outline" className="h-12 rounded-xl text-primary border-primary/20 hover:bg-primary/10 font-bold" onClick={() => setDecodeOpen(true)}>
                  <BookOpen className="w-5 h-5 mr-2" /> Decode
                </Button>
                <Button className="h-12 rounded-xl text-white font-bold shadow-lg" style={{ background: folder.color }} onClick={() => setCreateOpen(true)}>
                  <Plus className="w-5 h-5 mr-2" /> Submodule
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="space-y-12">
          {/* Subfolders */}
          {(listLoading || displayFolders.length > 0) && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-foreground">Submodules</h2>
                {!anyReorderMode && subfolders.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={enterFolderReorder} className="text-muted-foreground font-bold uppercase tracking-wider text-xs">
                    <GripVertical className="w-4 h-4 mr-2" /> Reorder
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {displayFolders.map((sub, idx) => (
                    <FolderCard key={sub.id} folder={sub} index={idx} onEdit={setEditFolder} onDelete={setDeleteFolder} onMove={setMoveFolderTarget}
                      reorderMode={folderReorderMode} onMoveUp={() => moveFolder(idx, "up")} onMoveDown={() => moveFolder(idx, "down")}
                      isFirst={idx === 0} isLast={idx === displayFolders.length - 1} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Question Sets */}
          {(setsLoading || displaySets.length > 0) && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-foreground">Question Sets</h2>
                <div className="flex items-center gap-3">
                  {!anyReorderMode && questionSets.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={enterSetReorder} className="text-muted-foreground font-bold uppercase tracking-wider text-xs">
                      <GripVertical className="w-4 h-4 mr-2" /> Reorder
                    </Button>
                  )}
                  {!anyReorderMode && (
                    <Button variant="outline" size="sm" onClick={() => setNewSetOpen(true)} className="font-bold border-primary/30 text-primary">
                      <Plus className="w-4 h-4 mr-1" /> New Set
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {displaySets.map((set, idx) => (
                    <QuestionSetCard key={set.id} set={set} index={idx} folderColor={folder.color} folderId={folderId}
                      reorderMode={setReorderMode} onMoveUp={() => moveSet(idx, "up")} onMoveDown={() => moveSet(idx, "down")}
                      isFirst={idx === 0} isLast={idx === displaySets.length - 1}
                      onRenamed={(id, name) => setLocalSetOrder(prev => prev.map(s => s.id === id ? { ...s, name } : s))} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {!listLoading && !setsLoading && !hasContent && (
            <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card/50">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: `${folder.color}20` }}>
                <FolderIconComp className="w-10 h-10" style={{ color: folder.color }} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Empty Module</h3>
              <p className="text-muted-foreground mt-2 mb-8 max-w-sm">Populate this module by creating a submodule, a new question set, or decoding raw text into questions.</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button onClick={() => setCreateOpen(true)} className="font-bold h-12 px-6" style={{ background: folder.color, color: "#fff" }}><Plus className="w-5 h-5 mr-2" /> Submodule</Button>
                <Button variant="outline" onClick={() => setNewSetOpen(true)} className="font-bold h-12 px-6"><BookMarked className="w-5 h-5 mr-2" /> New Set</Button>
                <Button variant="outline" onClick={() => setDecodeOpen(true)} className="font-bold h-12 px-6 text-primary border-primary/30"><BookOpen className="w-5 h-5 mr-2" /> Decode Text</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FolderFormDialog open={createOpen} onOpenChange={setCreateOpen} parentId={folder.id} />
      {editFolder && <FolderFormDialog open={true} onOpenChange={(open) => !open && setEditFolder(null)} initialData={editFolder} />}
      {deleteFolder && <DeleteFolderDialog open={true} onOpenChange={(open) => !open && setDeleteFolder(null)} folderId={deleteFolder.id} folderName={deleteFolder.name} isViewingSelf={deleteFolder.id === folder.id} />}
      <DecodeDialog open={decodeOpen} onOpenChange={setDecodeOpen} folderId={folderId} folderColor={folder.color} />
      <MoveFolderDialog folder={moveFolderTarget} onClose={() => setMoveFolderTarget(null)} onMoved={() => queryClient.invalidateQueries()} />
    </div>
  );
}

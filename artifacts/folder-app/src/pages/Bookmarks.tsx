import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, Trash2, ExternalLink, BookOpen, ChevronRight, Home as HomeIcon } from "lucide-react";
import { readBookmarks, saveBookmarks, BookmarkItem } from "@/lib/localStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MathText } from "@/components/folder/MathText";
import { motion, AnimatePresence } from "framer-motion";

export function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Record<number, BookmarkItem>>({});

  useEffect(() => { setBookmarks(readBookmarks()); }, []);

  const remove = (id: number) => {
    setBookmarks(prev => {
      const next = { ...prev };
      delete next[id];
      saveBookmarks(next);
      return next;
    });
  };

  const items = Object.values(bookmarks).sort((a, b) => b.id - a.id);

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/"><HomeIcon className="w-4 h-4" /></Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/70 font-medium">Bookmarks</span>
        </div>
        <ThemeToggle size="sm" />
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
          <Bookmark className="w-5 h-5 text-amber-400" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white/90">Bookmarks</h1>
          <p className="text-xs text-white/40">{items.length} saved question{items.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">No bookmarks yet.</p>
          <p className="text-white/20 text-xs">Tap the bookmark icon on any question while in Practice or Solution mode.</p>
        </div>
      ) : (
        <motion.div className="space-y-3" layout>
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-2.5 group">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400/80">
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0 text-sm text-white/80 leading-relaxed line-clamp-3 select-none">
                    <MathText text={item.questionText || "(No text)"} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Link href={`/sets/${item.setId}`}
                    className="flex items-center gap-1.5 text-xs text-indigo-400/70 hover:text-indigo-300 transition-colors truncate">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.setName}</span>
                  </Link>
                  <button onClick={() => remove(item.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/15 text-white/30 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

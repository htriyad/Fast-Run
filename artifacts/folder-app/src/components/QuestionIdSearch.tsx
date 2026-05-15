import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ArrowRight, Loader2, BookMarked, AlertCircle } from "lucide-react";

interface LookupResult {
  id: number;
  type: string;
  questionText: string | null;
  questionIndex: number;
  setId: number;
  setName: string;
  folderId: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuestionIdSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setNotFound(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    const id = parseInt(query.trim(), 10);
    if (!Number.isFinite(id) || id <= 0) {
      setResult(null);
      setNotFound(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setResult(null);
      setNotFound(false);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/questions/lookup?id=${id}`);
        if (res.ok) {
          setResult(await res.json());
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const goToQuestion = (r: LookupResult) => {
    navigate(`/sets/${r.setId}?highlight=${r.id}`);
    onClose();
  };

  const typeColors: Record<string, string> = {
    cq: "bg-amber-500/15 text-amber-400/90 border-amber-500/25",
    mcq: "bg-sky-500/15 text-sky-400/90 border-sky-500/25",
    sq: "bg-violet-500/15 text-violet-400/90 border-violet-500/25",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, y: -16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -12, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: "linear-gradient(145deg, #1a1a2e, #16162a)", boxShadow: "0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)" }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6">
              <Search className="w-4 h-4 text-indigo-400/70 flex-shrink-0" />
              <input
                ref={inputRef}
                type="number"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && result) goToQuestion(result); }}
                placeholder="Enter question ID..."
                className="flex-1 bg-transparent text-white placeholder-white/25 text-base outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {loading && <Loader2 className="w-4 h-4 text-white/30 animate-spin flex-shrink-0" />}
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/6 transition-all flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Result */}
            <div className="min-h-[80px] flex items-center">
              {!query.trim() && (
                <p className="text-white/25 text-sm px-5 py-5">Type a question ID to jump to it</p>
              )}

              {query.trim() && !loading && notFound && (
                <div className="flex items-center gap-3 px-5 py-5">
                  <AlertCircle className="w-4 h-4 text-red-400/60 flex-shrink-0" />
                  <p className="text-white/40 text-sm">No question found with ID <span className="text-white/60 font-mono font-semibold">#{query.trim()}</span></p>
                </div>
              )}

              {result && !loading && (
                <button
                  onClick={() => goToQuestion(result)}
                  className="w-full flex items-start gap-4 px-5 py-4 hover:bg-white/4 transition-all group text-left"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${typeColors[result.type] ?? "bg-white/8 text-white/50 border-white/10"}`}>
                      {result.type}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-white/80 leading-relaxed line-clamp-2">
                      {result.questionText || <span className="italic text-white/30">No text preview</span>}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <BookMarked className="w-3 h-3 text-indigo-400/60" />
                      <span className="text-xs text-white/35 truncate">{result.setName}</span>
                      <span className="text-xs text-white/20">· Q{result.questionIndex}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                </button>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-3">
              <span className="text-[11px] text-white/20">Press</span>
              <kbd className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono">Enter</kbd>
              <span className="text-[11px] text-white/20">to go · </span>
              <kbd className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
              <span className="text-[11px] text-white/20">to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

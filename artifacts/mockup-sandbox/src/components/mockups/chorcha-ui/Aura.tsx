import { useState } from "react";
import {
  Search, Plus, Zap, Trophy, FlaskConical,
  Globe, BarChart3, Sparkles, Moon, ChevronRight,
  BookOpen, Hash
} from "lucide-react";

const FOLDERS = [
  { id: 1, name: "HSC Physics", sub: "সৃজনশীল ও MCQ", icon: Zap, color: "#818cf8", glow: "#6366f1", sets: 24, questions: 380 },
  { id: 2, name: "Engineering Entrance", sub: "Admission prep", icon: Trophy, color: "#fbbf24", glow: "#f59e0b", sets: 18, questions: 290 },
  { id: 3, name: "Chemistry Lab", sub: "পর্যায় সারণি ও বিক্রিয়া", icon: FlaskConical, color: "#34d399", glow: "#10b981", sets: 12, questions: 180 },
  { id: 4, name: "World History", sub: "Civilizations & Events", icon: Globe, color: "#f472b6", glow: "#ec4899", sets: 9, questions: 140 },
  { id: 5, name: "Advanced Math", sub: "ক্যালকুলাস ও বীজগণিত", icon: BarChart3, color: "#c084fc", glow: "#a855f7", sets: 31, questions: 520 },
  { id: 6, name: "Biology SSC", sub: "কোষ ও জীবন প্রক্রিয়া", icon: Sparkles, color: "#2dd4bf", glow: "#14b8a6", sets: 7, questions: 95 },
];

function FolderCapsule({ folder, idx }: { folder: typeof FOLDERS[0]; idx: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = folder.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "16px 18px",
        borderRadius: "20px",
        background: hovered
          ? `rgba(255,255,255,0.12)`
          : `rgba(255,255,255,0.06)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.23,1,0.32,1)",
        boxShadow: hovered
          ? `0 0 0 1px ${folder.glow}30, 0 20px 60px ${folder.glow}20`
          : "none",
        transform: hovered ? "scale(1.015)" : "scale(1)",
      }}
    >
      {/* Glow behind icon */}
      <div style={{
        position: "absolute",
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "52px",
        height: "52px",
        borderRadius: "14px",
        background: `radial-gradient(circle, ${folder.glow}40 0%, transparent 70%)`,
        filter: "blur(8px)",
        pointerEvents: "none",
        transition: "opacity 0.25s",
        opacity: hovered ? 1 : 0.5,
      }} />

      {/* Icon */}
      <div style={{
        width: "50px", height: "50px", borderRadius: "16px",
        background: `linear-gradient(135deg, ${folder.glow}30, ${folder.glow}15)`,
        border: `1px solid ${folder.color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        position: "relative",
      }}>
        <Icon size={22} color={folder.color} strokeWidth={1.6} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 800,
          fontSize: "15px",
          letterSpacing: "-0.02em",
          color: "#fff",
          marginBottom: "3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {folder.name}
        </div>
        <div style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.45)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {folder.sub}
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "5px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px",
            borderRadius: "6px",
            background: `${folder.glow}20`,
            color: folder.color,
            border: `1px solid ${folder.glow}30`,
          }}>
            {folder.sets} sets
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {folder.questions} Qs
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight
        size={18}
        color={hovered ? folder.color : "rgba(255,255,255,0.2)"}
        style={{ transition: "color 0.2s, transform 0.2s", transform: hovered ? "translateX(3px)" : "translateX(0)", flexShrink: 0 }}
      />
    </div>
  );
}

export function Aura() {
  const [search, setSearch] = useState("");
  const filtered = FOLDERS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0d0f1a 0%, #111827 40%, #0f0c1f 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Multi-color ambient orbs */}
      <div style={{
        position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)",
        width: "500px", height: "300px",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
        pointerEvents: "none",
        filter: "blur(20px)",
      }} />
      <div style={{
        position: "absolute", bottom: "100px", right: "-80px",
        width: "320px", height: "320px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "0", left: "-60px",
        width: "280px", height: "280px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 100px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "4px 10px", borderRadius: "100px",
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                marginBottom: "10px",
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 6px #6366f1" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(99,102,241,0.9)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Chorcha Bank
                </span>
              </div>
              <h1 style={{
                fontSize: "36px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#fff",
                lineHeight: 1.1,
                margin: 0,
              }}>
                My Folders
              </h1>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{
                width: "38px", height: "38px", borderRadius: "13px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <Moon size={15} color="rgba(255,255,255,0.55)" />
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "13px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                border: "1px solid rgba(139,92,246,0.5)",
                cursor: "pointer",
                fontSize: "13px", fontWeight: 700, color: "#fff",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}>
                <Plus size={14} /> New
              </button>
            </div>
          </div>

          {/* Stats glass pills */}
          <div style={{
            display: "flex", gap: "8px", marginBottom: "18px",
            padding: "12px 14px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
          }}>
            {[
              { icon: BookOpen, label: "Folders", value: "6" },
              { icon: Hash, label: "Questions", value: "1,605" },
              { icon: Sparkles, label: "Sets", value: "101" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                paddingRight: i < 2 ? "14px" : 0,
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <s.icon size={12} color="rgba(99,102,241,0.7)" />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={15} color="rgba(255,255,255,0.3)" style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            }} />
            <input
              placeholder="Search folders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "46px",
                paddingLeft: "40px",
                paddingRight: "16px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: "14px",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Folder list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((folder, idx) => (
            <FolderCapsule key={folder.id} folder={folder} idx={idx} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <div style={{
        position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: "8px",
        padding: "12px 24px", borderRadius: "100px",
        background: "linear-gradient(135deg, #6366f1, #a855f7)",
        boxShadow: "0 8px 40px rgba(99,102,241,0.50), 0 0 0 1px rgba(139,92,246,0.4)",
        cursor: "pointer",
        backdropFilter: "blur(10px)",
      }}>
        <Plus size={16} color="#fff" />
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>New Folder</span>
      </div>
    </div>
  );
}

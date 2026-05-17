import { useState } from "react";
import {
  Search, Plus, BookOpen, Zap, Trophy, FlaskConical,
  Globe, Layers, Hash, GripVertical, Pencil, Trash2,
  ChevronRight, BarChart3, Sparkles, Moon
} from "lucide-react";

const FOLDERS = [
  { id: 1, name: "HSC Physics", icon: Zap, color: "#6366f1", sets: 24, questions: 380 },
  { id: 2, name: "Engineering Entrance", icon: Trophy, color: "#f59e0b", sets: 18, questions: 290 },
  { id: 3, name: "Chemistry Lab", icon: FlaskConical, color: "#10b981", sets: 12, questions: 180 },
  { id: 4, name: "World History", icon: Globe, color: "#ec4899", sets: 9, questions: 140 },
  { id: 5, name: "Advanced Math", icon: BarChart3, color: "#8b5cf6", sets: 31, questions: 520 },
  { id: 6, name: "Biology SSC", icon: Sparkles, color: "#14b8a6", sets: 7, questions: 95 },
];

function FolderButton({ folder, idx }: { folder: typeof FOLDERS[0]; idx: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = folder.icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
        borderRadius: "16px",
        background: hovered
          ? `linear-gradient(120deg, ${folder.color}18, ${folder.color}08)`
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? folder.color + "40" : "rgba(255,255,255,0.07)"}`,
        cursor: "pointer",
        transition: "all 0.22s cubic-bezier(0.23,1,0.32,1)",
        transform: hovered ? "translateX(4px)" : "translateX(0)",
        boxShadow: hovered ? `0 0 0 1px ${folder.color}25, 0 8px 32px ${folder.color}15` : "none",
        animationDelay: `${idx * 60}ms`,
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: "3px",
        height: hovered ? "60%" : "0%",
        borderRadius: "0 3px 3px 0",
        background: folder.color,
        transition: "height 0.25s cubic-bezier(0.23,1,0.32,1)",
        boxShadow: `0 0 12px ${folder.color}80`,
      }} />

      {/* Icon bubble */}
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "14px",
        background: `${folder.color}18`,
        border: `1px solid ${folder.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: hovered ? `0 0 20px ${folder.color}30` : "none",
        transition: "box-shadow 0.22s",
      }}>
        <Icon size={20} color={folder.color} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: "15px",
          color: hovered ? "#fff" : "rgba(255,255,255,0.85)",
          letterSpacing: "-0.02em",
          marginBottom: "3px",
          transition: "color 0.15s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {folder.name}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            {folder.sets} sets
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
            {folder.questions} Qs
          </span>
        </div>
      </div>

      {/* Right section */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <div style={{
          padding: "3px 10px",
          borderRadius: "100px",
          background: `${folder.color}15`,
          border: `1px solid ${folder.color}30`,
          fontSize: "11px",
          fontWeight: 700,
          color: folder.color,
          letterSpacing: "0.01em",
        }}>
          {folder.sets}
        </div>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
      </div>
    </div>
  );
}

export function Nova() {
  const [search, setSearch] = useState("");
  const filtered = FOLDERS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #050810 0%, #080c1a 50%, #060a14 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background orbs */}
      <div style={{
        position: "absolute", top: "-80px", right: "-60px",
        width: "320px", height: "320px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "60px", left: "-80px",
        width: "280px", height: "280px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(99,102,241,0.7)",
                marginBottom: "6px",
              }}>
                CHORCHA
              </div>
              <h1 style={{
                fontSize: "34px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #fff 40%, rgba(139,92,246,0.65) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.1,
                margin: 0,
              }}>
                My Folders
              </h1>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button style={{
                width: "36px", height: "36px", borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <Moon size={15} color="rgba(255,255,255,0.5)" />
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 700, color: "#fff",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}>
                <Plus size={14} /> New
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {[
              { icon: Layers, label: "6 folders" },
              { icon: BookOpen, label: "101 sets" },
              { icon: Hash, label: "1,605 Qs" },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 10px", borderRadius: "100px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <s.icon size={11} color="rgba(99,102,241,0.7)" />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={15} color="rgba(255,255,255,0.25)" style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            }} />
            <input
              placeholder="Search folders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "44px",
                paddingLeft: "40px",
                paddingRight: "16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "14px",
                color: "#fff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Section label */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "12px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            All Folders
          </span>
          <button style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.3)",
            background: "none", border: "none", cursor: "pointer",
          }}>
            <GripVertical size={12} /> Reorder
          </button>
        </div>

        {/* Folder list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((folder, idx) => (
            <FolderButton key={folder.id} folder={folder} idx={idx} />
          ))}
        </div>

        {/* Bottom FAB */}
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          width: "52px", height: "52px", borderRadius: "18px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(99,102,241,0.45)",
          cursor: "pointer",
        }}>
          <Plus size={22} color="#fff" />
        </div>
      </div>
    </div>
  );
}

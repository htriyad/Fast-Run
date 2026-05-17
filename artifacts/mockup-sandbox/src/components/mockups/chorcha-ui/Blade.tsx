import { useState } from "react";
import {
  Search, Plus, BookOpen, Zap, Trophy, FlaskConical,
  Globe, BarChart3, Sparkles, Sun, ArrowRight,
  SlidersHorizontal, Layers
} from "lucide-react";

const FOLDERS = [
  { id: 1, name: "HSC Physics", icon: Zap, color: "#4f46e5", sets: 24, questions: 380, tag: "Science" },
  { id: 2, name: "Engineering Entrance", icon: Trophy, color: "#d97706", sets: 18, questions: 290, tag: "Entrance" },
  { id: 3, name: "Chemistry Lab", icon: FlaskConical, color: "#059669", sets: 12, questions: 180, tag: "Science" },
  { id: 4, name: "World History", icon: Globe, color: "#db2777", sets: 9, questions: 140, tag: "Humanities" },
  { id: 5, name: "Advanced Math", icon: BarChart3, color: "#7c3aed", sets: 31, questions: 520, tag: "Math" },
  { id: 6, name: "Biology SSC", icon: Sparkles, color: "#0d9488", sets: 7, questions: 95, tag: "Science" },
];

const FILTERS = ["All", "Science", "Math", "Entrance", "Humanities"];

function FolderRow({ folder, idx }: { folder: typeof FOLDERS[0]; idx: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = folder.icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        background: hovered ? "#fff" : "transparent",
        border: `1px solid ${hovered ? "#e2e8f0" : "#f1f5f9"}`,
        borderRadius: "12px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.18s ease",
        boxShadow: hovered ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {/* Bold colored accent bar */}
      <div style={{
        width: "4px",
        alignSelf: "stretch",
        background: folder.color,
        flexShrink: 0,
        transition: "opacity 0.15s",
      }} />

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
      }}>
        {/* Icon */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "10px",
          background: `${folder.color}12`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={18} color={folder.color} strokeWidth={2} />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: "14px",
            letterSpacing: "-0.02em",
            color: hovered ? "#0f172a" : "#1e293b",
            marginBottom: "2px",
          }}>
            {folder.name}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", color: folder.color,
              background: `${folder.color}12`,
              padding: "1px 7px", borderRadius: "4px",
            }}>
              {folder.tag}
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
              {folder.sets} sets · {folder.questions} Qs
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={16}
          color={hovered ? folder.color : "#cbd5e1"}
          style={{ transition: "transform 0.15s, color 0.15s", transform: hovered ? "translateX(2px)" : "translateX(0)" }}
        />
      </div>
    </div>
  );
}

export function Blade() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = FOLDERS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) &&
    (activeFilter === "All" || f.tag === activeFilter)
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: "4px",
              }}>
                QUESTION BANK
              </div>
              <h1 style={{
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.1,
              }}>
                My Folders
              </h1>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <Sun size={15} color="#64748b" />
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "10px",
                background: "#0f172a",
                border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 700, color: "#fff",
              }}>
                <Plus size={14} /> New
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: "flex",
            gap: "0",
            marginBottom: "20px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}>
            {[
              { label: "Folders", value: "6", color: "#4f46e5" },
              { label: "Sets", value: "101", color: "#059669" },
              { label: "Questions", value: "1,605", color: "#d97706" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1,
                padding: "12px",
                borderRight: i < 2 ? "1px solid #f1f5f9" : "none",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <Search size={15} color="#94a3b8" style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
            }} />
            <input
              placeholder="Search folders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "42px",
                paddingLeft: "40px",
                paddingRight: "40px",
                borderRadius: "10px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <SlidersHorizontal size={15} color="#94a3b8" style={{
              position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
            }} />
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  border: activeFilter === f ? "1px solid #0f172a" : "1px solid #e2e8f0",
                  background: activeFilter === f ? "#0f172a" : "#fff",
                  color: activeFilter === f ? "#fff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.12s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Section header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "10px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {filtered.length} folders
          </span>
          <button style={{
            display: "flex", alignItems: "center", gap: "4px",
            fontSize: "11px", fontWeight: 700, color: "#64748b",
            background: "none", border: "none", cursor: "pointer",
          }}>
            <Layers size={12} /> Sort
          </button>
        </div>

        {/* Folder list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((folder, idx) => (
            <FolderRow key={folder.id} folder={folder} idx={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

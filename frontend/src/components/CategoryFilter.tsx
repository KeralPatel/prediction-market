"use client";

import { CATEGORIES, CATEGORY_DISPLAY } from "@/types";
import { useStore } from "@/store/useStore";

export default function CategoryFilter() {
  const { category, setCategory } = useStore();

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {CATEGORIES.map((cat) => {
        const meta   = CATEGORY_DISPLAY[cat];
        const active = category === cat;
        return (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              background:   active ? "#1e3a5f" : "transparent",
              border:       `1px solid ${active ? "#3b82f6" : "#1e293b"}`,
              color:        active ? "#60a5fa" : "#64748b",
              padding:      "7px 16px",
              borderRadius: 20,
              fontSize:     13,
              cursor:       "pointer",
              fontWeight:   500,
              transition:   "all 0.15s",
            }}
          >
            {meta?.label ?? cat}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { CATEGORIES, Category } from "@/types";
import { useStore } from "@/store/useStore";
import clsx from "clsx";

const CATEGORY_ICONS: Record<Category, string> = {
  all:      "◈",
  crypto:   "₿",
  sports:   "⚽",
  politics: "🏛",
  AI:       "🤖",
  finance:  "📈",
};

export default function CategoryFilter() {
  const { category, setCategory } = useStore();

  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => setCategory(cat)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            category === cat
              ? "bg-brand-600 text-white"
              : "bg-[#1a2035] text-[#8892b0] hover:text-[#e8eaf6] border border-[#2a3450] hover:border-[#3a4870]"
          )}
        >
          <span>{CATEGORY_ICONS[cat]}</span>
          <span className="capitalize">{cat === "AI" ? "AI" : cat}</span>
        </button>
      ))}
    </div>
  );
}

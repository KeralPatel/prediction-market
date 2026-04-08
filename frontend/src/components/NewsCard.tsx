"use client";

import { useState } from "react";
import { NewsItem } from "@/types";

interface Props {
  item: NewsItem;
}

export default function NewsCard({ item }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={item.url || "#"}
      target={item.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        background: hovered ? "#162033" : "#111827",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        transition: "all 0.2s",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            background: item.tagColor + "22",
            color: item.tagColor,
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {item.tag}
        </span>
        <span style={{ color: "#64748b", fontSize: 11 }}>{item.src}</span>
        <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>{item.time}</span>
      </div>
      <h4 style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600, lineHeight: 1.5, margin: "0 0 8px" }}>
        {item.title}
      </h4>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{item.snippet}</p>
    </a>
  );
}

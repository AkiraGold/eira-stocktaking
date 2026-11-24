import React from "react";

export default function CardItemDate({ children }) {
  return (
    <span style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted)" }}>
      {children}
    </span>
  );
} 
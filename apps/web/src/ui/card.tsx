import type { ReactNode } from "react";

export function Card({ title, children, className = "", as: Tag = "section" }: { title?: string; children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return (
    <Tag className={`rounded-lg border border-line bg-surface p-4 shadow-sm ${className}`}>
      {title ? <h2 className="mb-3 text-lg font-semibold">{title}</h2> : null}
      {children}
    </Tag>
  );
}

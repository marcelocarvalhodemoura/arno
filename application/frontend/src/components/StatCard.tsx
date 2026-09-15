import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg" | "";
};

export default function StatCard({ title, value, hint, tone = "" }: Props) {
  return (
    <article className={`card stat ${tone === "pos" ? "is-pos" : tone === "neg" ? "is-neg" : ""}`}>
      <h3>{title}</h3>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

export function Badge({
  children,
  kind,
}: {
  children: ReactNode;
  kind: string;
}) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

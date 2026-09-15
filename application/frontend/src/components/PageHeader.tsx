import type { ReactNode } from "react";

type Props = {
  title: string;
  kicker: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, kicker, subtitle, actions }: Props) {
  return (
    <header className="page-head">
      <div>
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}

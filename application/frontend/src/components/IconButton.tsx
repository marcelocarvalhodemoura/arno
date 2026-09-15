import type { ReactNode } from "react";

type Tone = "default" | "danger" | "success";

type Props = {
  label: string;
  onClick: () => void;
  tone?: Tone;
  children: ReactNode;
};

export default function IconButton({ label, onClick, tone = "default", children }: Props) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${tone}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
      <span className="icon-btn__tip">{label}</span>
    </button>
  );
}

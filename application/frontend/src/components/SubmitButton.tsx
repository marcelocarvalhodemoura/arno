import type { ButtonHTMLAttributes } from "react";
import Spinner from "./Spinner";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: string;
};

export default function SubmitButton({
  busy,
  busyLabel,
  children,
  className = "btn btn-primary",
  disabled,
  type = "submit",
  ...props
}: Props) {
  return (
    <button className={className} type={type} disabled={disabled || busy} aria-busy={busy} {...props}>
      {busy ? <Spinner size="sm" /> : null}
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
}

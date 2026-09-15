import { useEffect, type ReactNode } from "react";
import { useLoadingBar } from "../context/LoadingContext";
import Spinner from "./Spinner";

type Props = {
  active: boolean;
  label?: string;
  children: ReactNode;
};

export default function FetchOverlay({ active, label = "Atualizando…", children }: Props) {
  const { start, stop } = useLoadingBar();

  useEffect(() => {
    if (!active) return;
    start();
    return () => stop();
  }, [active, start, stop]);

  return (
    <div className={`fetch-wrap ${active ? "is-loading" : ""}`}>
      {children}
      {active ? (
        <div className="fetch-overlay" role="status" aria-live="polite">
          <div className="fetch-overlay__msg">
            <Spinner />
            <span>{label}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

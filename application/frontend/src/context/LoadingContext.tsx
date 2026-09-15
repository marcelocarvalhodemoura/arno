import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type LoadingState = {
  pending: number;
  start: () => void;
  stop: () => void;
};

const LoadingContext = createContext<LoadingState>({
  pending: 0,
  start: () => {},
  stop: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const start = useCallback(() => setPending((n) => n + 1), []);
  const stop = useCallback(() => setPending((n) => Math.max(0, n - 1)), []);
  const value = useMemo(() => ({ pending, start, stop }), [pending, start, stop]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <div className={`loading-bar ${pending > 0 ? "is-on" : ""}`} aria-hidden={pending === 0}>
        <span />
      </div>
    </LoadingContext.Provider>
  );
}

export function useLoadingBar() {
  return useContext(LoadingContext);
}

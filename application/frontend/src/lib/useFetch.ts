import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useLoadingBar } from "../context/LoadingContext";

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const { start, stop } = useLoadingBar();
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!path) {
      requestId.current += 1;
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    start();
    try {
      const next = await api<T>(path);
      if (id !== requestId.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      stop();
      if (id === requestId.current) setLoading(false);
    }
  }, [path, start, stop]);

  useEffect(() => {
    void reload();
    return () => {
      requestId.current += 1;
    };
  }, [reload]);

  return { data, loading, error, reload, setData };
}

import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useLoadingBar } from "../context/LoadingContext";

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const { start, stop } = useLoadingBar();

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    start();
    try {
      const next = await api<T>(path);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
      stop();
    }
  }, [path, start, stop]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

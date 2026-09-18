import { useEffect, useMemo, useRef, useState } from "react";

export const PAGE_SIZES = [10, 15, 20, 50] as const;
export const LISTING_BUSY_MS = 360;
export type PageSize = (typeof PAGE_SIZES)[number];

export type PageSlice<T> = {
  total: number;
  pageCount: number;
  currentPage: number;
  pageRows: T[];
  fromRow: number;
  toRow: number;
};

export function paginate<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const size = pageSize > 0 ? pageSize : 10;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * size;
  return {
    total,
    pageCount,
    currentPage,
    pageRows: items.slice(start, start + size),
    fromRow: total === 0 ? 0 : start + 1,
    toRow: Math.min(start + size, total),
  };
}

export function matchesQuery(term: string, fields: Array<string | number | boolean | null | undefined>): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return fields
    .filter((field) => field !== null && field !== undefined && field !== "")
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function useBusyOnChange(key: string, delayMs = LISTING_BUSY_MS) {
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(() => setBusy(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [key, delayMs]);

  return busy;
}

export function usePagedList<T>(items: T[], resetKey = "") {
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize, items.length]);

  const slice = useMemo(() => paginate(items, page, pageSize), [items, page, pageSize]);
  const busy = useBusyOnChange(`${resetKey}|${slice.currentPage}|${pageSize}`);

  return {
    ...slice,
    pageSize,
    busy,
    setPage,
    setPageSize,
  };
}

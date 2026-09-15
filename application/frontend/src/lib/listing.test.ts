import { describe, expect, it } from "vitest";
import { LISTING_BUSY_MS, matchesQuery, PAGE_SIZES, paginate } from "./listing";

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("slices the first page of 10", () => {
    const page = paginate(items, 1, 10);
    expect(page.pageRows).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page.fromRow).toBe(1);
    expect(page.toRow).toBe(10);
    expect(page.pageCount).toBe(3);
    expect(page.total).toBe(23);
  });

  it("clamps a page beyond the last one", () => {
    const page = paginate(items, 99, 10);
    expect(page.currentPage).toBe(3);
    expect(page.pageRows).toEqual([21, 22, 23]);
    expect(page.fromRow).toBe(21);
    expect(page.toRow).toBe(23);
  });

  it("keeps an empty list on a single page", () => {
    const page = paginate([], 1, 15);
    expect(page.pageCount).toBe(1);
    expect(page.fromRow).toBe(0);
    expect(page.toRow).toBe(0);
    expect(page.pageRows).toEqual([]);
  });

  it("supports the listing page sizes", () => {
    expect(PAGE_SIZES).toEqual([10, 15, 20, 50]);
    expect(paginate(items, 1, 20).pageRows).toHaveLength(20);
  });
});

describe("listing busy", () => {
  it("keeps a visible filter delay", () => {
    expect(LISTING_BUSY_MS).toBeGreaterThanOrEqual(400);
  });
});

describe("matchesQuery", () => {
  it("matches when the term is empty", () => {
    expect(matchesQuery("  ", ["Ana"])).toBe(true);
  });

  it("searches across fields ignoring case", () => {
    expect(matchesQuery("souza", ["Ana Souza", "ana@grupo.org"])).toBe(true);
    expect(matchesQuery("pix", ["Conta", "transferência"])).toBe(false);
  });
});

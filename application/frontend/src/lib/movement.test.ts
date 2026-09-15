import { describe, expect, it } from "vitest";
import { isUnidentifiedName, natureForTypeName } from "./movement";

describe("isUnidentifiedName", () => {
  it("matches the catch-all movement type", () => {
    expect(isUnidentifiedName("A identificar")).toBe(true);
    expect(isUnidentifiedName("a identificar")).toBe(true);
    expect(isUnidentifiedName("Outros")).toBe(false);
    expect(isUnidentifiedName("Mensalidade")).toBe(false);
  });
});

describe("natureForTypeName", () => {
  it("keeps mensalidade as a fixed fee", () => {
    expect(natureForTypeName("Mensalidade")).toBe("fixed");
    expect(natureForTypeName("Doação")).toBe("variable");
  });
});

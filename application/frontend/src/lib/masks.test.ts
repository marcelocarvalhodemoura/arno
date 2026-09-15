import { describe, expect, it } from "vitest";
import { formatMoney, maskMoney, maskPhone, parseMoney } from "./masks";

describe("maskPhone", () => {
  it("formats a mobile number", () => {
    expect(maskPhone("51987654321")).toBe("(51) 98765-4321");
  });

  it("formats a landline while typing", () => {
    expect(maskPhone("5133334444")).toBe("(51) 3333-4444");
  });
});

describe("maskMoney", () => {
  it("treats typed digits as cents", () => {
    expect(maskMoney("7000")).toBe("70,00");
    expect(maskMoney("123456")).toBe("1.234,56");
  });

  it("clears empty input", () => {
    expect(maskMoney("")).toBe("");
  });
});

describe("parseMoney", () => {
  it("parses Brazilian currency text", () => {
    expect(parseMoney("1.234,56")).toBe(1234.56);
    expect(parseMoney("70,00")).toBe(70);
  });

  it("returns NaN for blank values", () => {
    expect(Number.isNaN(parseMoney(" "))).toBe(true);
  });
});

describe("formatMoney", () => {
  it("keeps two decimal places", () => {
    expect(formatMoney(60)).toBe("60,00");
  });
});

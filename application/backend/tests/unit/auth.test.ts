import { describe, expect, it } from "vitest";
import { issueToken, verifyToken } from "../../src/auth.js";
import { hashPassword, verifyPassword } from "../../src/password.js";

describe("auth tokens", () => {
  it("issues a token that can be verified", () => {
    const token = issueToken("admin", "01900000-0000-7000-8000-000000000001", "admin");
    const payload = verifyToken(token);
    expect(payload?.user).toBe("admin");
    expect(payload?.role).toBe("admin");
    expect(payload?.userId).toBe("01900000-0000-7000-8000-000000000001");
  });

  it("rejects a tampered token", () => {
    const token = issueToken("admin", "01900000-0000-7000-8000-000000000001", "admin");
    expect(verifyToken(`${token}x`)).toBeNull();
    expect(verifyToken("not-a-token")).toBeNull();
  });
});

describe("passwords", () => {
  it("hashes and verifies a password", async () => {
    const stored = await hashPassword("senha-de-teste");
    expect(stored).toContain(":");
    expect(await verifyPassword("senha-de-teste", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });
});

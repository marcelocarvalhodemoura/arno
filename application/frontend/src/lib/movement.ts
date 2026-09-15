const IDENTIFY_FLAG = "arno.identify";

export function foldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function isUnidentifiedName(name?: string | null) {
  return foldName(name ?? "") === "a identificar";
}

export function natureForTypeName(name: string): "fixed" | "variable" {
  const key = foldName(name);
  if (["mensalidade", "ueb / registro", "sede", "utilidades"].includes(key)) return "fixed";
  return "variable";
}

export function readIdentifyFlag() {
  try {
    return sessionStorage.getItem(IDENTIFY_FLAG) === "1";
  } catch {
    return false;
  }
}

export function writeIdentifyFlag() {
  try {
    sessionStorage.setItem(IDENTIFY_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearIdentifyFlag() {
  try {
    sessionStorage.removeItem(IDENTIFY_FLAG);
  } catch {
    /* ignore */
  }
}

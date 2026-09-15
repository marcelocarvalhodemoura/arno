import { useOutletContext } from "react-router-dom";

export type Period = {
  year: number;
  month: number;
  setYear: (n: number) => void;
  setMonth: (n: number) => void;
};

export function usePeriod(): Period {
  return useOutletContext<Period>();
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function periodRange(year: number, month: number) {
  if (!month) {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      monthStart: `${year}-01-01`,
      asOf: `${year}-12-31`,
    };
  }
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
    monthStart: `${year}-${pad2(month)}-01`,
    asOf: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

export function dateInPeriod(
  year: number,
  month: number,
  today = new Date().toISOString().slice(0, 10),
) {
  const { from, to } = periodRange(year, month);
  if (today >= from && today <= to) return today;
  return to;
}

export function yearToDate(year: number, month: number) {
  if (!month) {
    return periodRange(year, 0);
  }
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-01-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
    monthStart: `${year}-${pad2(month)}-01`,
    asOf: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}

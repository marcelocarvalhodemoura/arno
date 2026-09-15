import type { FormEvent } from "react";

export function submitAttempt(
  event: FormEvent<HTMLFormElement>,
  setAttempted: (value: boolean) => void,
) {
  event.preventDefault();
  setAttempted(true);
  return event.currentTarget.checkValidity();
}

export function formClass(base: string, attempted: boolean) {
  return attempted ? `${base} is-attempted`.trim() : base;
}

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { duration, ease } from "../lib/motion";

type Props = {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Accordion({ title, defaultOpen = false, className = "", children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={`accordion ${className}${open ? " is-open" : ""}`.trim()}>
      <button
        type="button"
        className="accordion__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            className="accordion__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.slow, ease }}
          >
            <div className="accordion__body">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

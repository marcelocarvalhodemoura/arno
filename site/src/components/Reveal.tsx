import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { easeOut, fadeUp } from "../lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

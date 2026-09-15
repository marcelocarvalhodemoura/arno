import { motion } from "framer-motion";
import logo from "../assets/arno_logo.png";
import Spinner from "./Spinner";

export default function SessionSplash() {
  return (
    <motion.div
      className="session-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        className="session-splash__card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={logo} alt="" />
        <Spinner size="lg" label="Carregando sessão" />
        <p>Carregando tesouraria…</p>
      </motion.div>
    </motion.div>
  );
}

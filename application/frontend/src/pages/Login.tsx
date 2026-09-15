import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import logo from "../assets/arno_logo.png";
import SubmitButton from "../components/SubmitButton";
import { useAuth } from "../context/AuthContext";
import { formClass, submitAttempt } from "../lib/form";
import "../layout.css";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("tesouraria");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  async function onSubmit(e: FormEvent) {
    if (!submitAttempt(e, setAttempted)) return;
    setBusy(true);
    setError(null);
    try {
      await login(user, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no acesso");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <motion.div
        className="login__card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={logo} alt="Emblema do Grupo Escoteiro Arno Friedrich" />
        <span className="kicker">Tesouraria</span>
        <h1>Sempre alerta nas contas.</h1>
        <p>
          Área administrativa do Grupo Escoteiro Arno Friedrich — Lindóia,
          Porto Alegre.
        </p>
        <form onSubmit={onSubmit} className={formClass("", attempted)} noValidate aria-busy={busy}>
          {error ? <div className="error">{error}</div> : null}
          <label className="field">
            <span>Usuário</span>
            <input required value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <SubmitButton busy={busy} busyLabel="Entrando…">
            Entrar
          </SubmitButton>
        </form>
        <p className="hint">
          Admin: <strong>admin</strong> · Tesoureiro: <strong>tesouraria</strong> · senha{" "}
          <strong>arno1991</strong>
        </p>
      </motion.div>
    </div>
  );
}

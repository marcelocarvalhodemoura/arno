import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import logo from "../assets/arno_logo.png";
import PasswordInput from "../components/PasswordInput";
import SubmitButton from "../components/SubmitButton";
import { useAuth } from "../context/AuthContext";
import { formClass, submitAttempt } from "../lib/form";
import "../layout.css";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setBusy(true);
    setError(null);
    try {
      await login(user.trim(), password);
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
        <p>Área administrativa do Grupo Escoteiro Arno Friedrich — Lindóia, Porto Alegre.</p>
        <form onSubmit={onSubmit} className={formClass("", attempted)} noValidate aria-busy={busy}>
          {error ? <div className="error">{error}</div> : null}
          <label className="field">
            <span>Usuário ou e-mail</span>
            <input
              required
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              placeholder="O usuário cadastrado ou o e-mail"
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <PasswordInput
              required
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
          Use o <strong>usuário</strong> cadastrado (não o nome da pessoa) ou o <strong>e-mail</strong>. Perfis
          iniciais: <strong>admin</strong> e <strong>tesouraria</strong>.
        </p>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FaAngleLeft,
  FaAngleRight,
  FaChartLine,
  FaCalendarCheck,
  FaFileImport,
  FaFlag,
  FaHome,
  FaListAlt,
  FaPercentage,
  FaReceipt,
  FaCog,
  FaSignOutAlt,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";
import type { UserRole } from "@shared";
import logo from "../assets/arno_logo.png";
import { useAuth } from "../context/AuthContext";
import { MONTHS } from "../lib/format";
import { duration, ease } from "../lib/motion";
import "../layout.css";

const SIDEBAR_KEY = "arno.sidebar-collapsed";

const links: {
  to: string;
  label: string;
  icon: typeof FaHome;
  end?: boolean;
  roles: UserRole[];
}[] = [
  { to: "/", label: "Painel", icon: FaHome, end: true, roles: ["admin"] },
  { to: "/fluxo", label: "Fluxo de caixa", icon: FaChartLine, roles: ["admin", "tesoureiro"] },
  { to: "/mensalidades", label: "Mensalidades", icon: FaCalendarCheck, roles: ["admin", "tesoureiro"] },
  { to: "/tipos", label: "Tipos de movimentação", icon: FaListAlt, roles: ["admin", "tesoureiro"] },
  { to: "/taxas", label: "Taxas", icon: FaPercentage, roles: ["admin", "tesoureiro"] },
  { to: "/projetos", label: "Projetos financeiros", icon: FaFlag, roles: ["admin"] },
  { to: "/relatorios", label: "Relatório fiscal", icon: FaReceipt, roles: ["admin"] },
  { to: "/configuracoes", label: "Configurações", icon: FaCog, roles: ["admin"] },
  { to: "/associados", label: "Associados", icon: FaUsers, roles: ["admin", "tesoureiro"] },
  { to: "/usuarios", label: "Usuários", icon: FaUserShield, roles: ["admin"] },
  { to: "/integracao", label: "Integração", icon: FaFileImport, roles: ["admin", "tesoureiro"] },
];

type Period = {
  year: number;
  month: number;
  setYear: (n: number) => void;
  setMonth: (n: number) => void;
};

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Layout({ year, month, setYear, setMonth }: Period) {
  const location = useLocation();
  const { user, name, role, logout } = useAuth();
  const visible = links.filter((link) => role && link.roles.includes(role));
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const roleLabel = role === "admin" ? "Administrador" : "Tesoureiro";

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }

  return (
    <div className={`shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar__brand">
          <img src={logo} alt="" />
          <span>
            <strong>Arno Friedrich</strong>
            <small>Tesouraria · 43 RS</small>
          </span>
        </div>
        <button
          type="button"
          className="sidebar__toggle"
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={toggleCollapsed}
        >
          {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
        </button>
        <nav id="sidebar-nav" aria-label="Tesouraria">
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              title={link.label}
              className={({ isActive }) => `side-link ${isActive ? "is-active" : ""}`}
            >
              <link.icon />
              <span className="side-link__label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <small className="muted sidebar__user" style={{ color: "rgba(244,241,234,.7)" }}>
            {name ?? user}
            <br />
            {roleLabel}
          </small>
          <button className="btn btn-outline" type="button" onClick={logout} title="Sair">
            <FaSignOutAlt />
            <span className="sidebar__foot-label">Sair</span>
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div>
            <strong>Grupo Escoteiro Arno Friedrich</strong>
            <div className="muted">Área administrativa da tesouraria</div>
          </div>
          <div className="topbar__period">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mês">
              <option value={0}>Ano todo</option>
              {MONTHS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Ano">
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-transition"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.base, ease }}
            >
              <Outlet context={{ year, month, setYear, setMonth }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

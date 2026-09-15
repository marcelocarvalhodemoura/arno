import logo from "../assets/images/arno_logo.png";

type LogoProps = {
  compact?: boolean;
};

export default function Logo({ compact = false }: LogoProps) {
  return (
    <span className={`brand ${compact ? "brand--compact" : ""}`}>
      <img
        src={logo}
        alt="Emblema do Grupo Escoteiro Arno Friedrich"
        className="brand-mark"
      />
      <span className="brand-copy">
        <strong>Arno Friedrich</strong>
        {!compact && <small>Grupo Escoteiro · 43 RS</small>}
      </span>
    </span>
  );
}

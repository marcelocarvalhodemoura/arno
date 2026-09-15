import Spinner from "./Spinner";

type Props = {
  label?: string;
};

export default function PageLoader({ label = "Carregando…" }: Props) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__brand">
        <Spinner size="lg" label={label} />
        <span>{label}</span>
      </div>
      <div className="grid-stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton skeleton-stat" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  );
}

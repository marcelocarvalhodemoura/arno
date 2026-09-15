type Props = {
  size?: "sm" | "md" | "lg";
  label?: string;
};

export default function Spinner({ size = "md", label }: Props) {
  return (
    <span className={`spinner spinner-${size}`} role="status" aria-label={label ?? "Carregando"}>
      <span className="sr-only">{label ?? "Carregando"}</span>
    </span>
  );
}

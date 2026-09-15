import {
  auditAction,
  formatCompactDateTime,
  formatDateTime,
  originLabel,
  originShort,
  stampAuthor,
} from "../lib/format";

type Author = {
  name: string;
  username?: string;
} | null | undefined;

export default function RecordStamp({
  origin,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
}: {
  origin?: string;
  createdAt: string;
  createdBy?: Author;
  updatedAt?: string;
  updatedBy?: Author;
}) {
  const altered = auditAction(updatedAt, createdAt) === "Alterado";
  const author = altered ? (updatedBy ?? createdBy) : createdBy;
  const at = altered ? (updatedAt ?? createdAt) : createdAt;
  const action = altered ? "Alterado" : "Lançado";
  const who = stampAuthor(author);
  const detail = `${action} por ${author?.name ?? "Carga inicial"}${
    author?.username ? ` (@${author.username})` : ""
  } · ${formatDateTime(at)} · ${originLabel(origin)}`;

  return (
    <div className={`tx-stamp ${altered ? "is-altered" : ""}`} title={detail}>
      <strong>
        {action} por {who}
      </strong>
      <span>{formatCompactDateTime(at)}</span>
      <span className="tx-stamp__origin">{originShort(origin)}</span>
    </div>
  );
}

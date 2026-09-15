import { PAGE_SIZES, type PageSize } from "../lib/listing";

type Props = {
  total: number;
  fromRow: number;
  toRow: number;
  pageSize: PageSize;
  currentPage: number;
  pageCount: number;
  onPageSize: (size: PageSize) => void;
  onPage: (page: number | ((current: number) => number)) => void;
};

export default function Pager({
  total,
  fromRow,
  toRow,
  pageSize,
  currentPage,
  pageCount,
  onPageSize,
  onPage,
}: Props) {
  return (
    <div className="pager">
      <span className="muted">{total ? `Mostrando ${fromRow}–${toRow} de ${total}` : "Nenhum registro"}</span>
      <label className="pager__size">
        <span>Por página</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
          aria-label="Por página"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="pager__nav">
        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </button>
        <span>
          Página {currentPage} de {pageCount}
        </span>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={currentPage >= pageCount}
          onClick={() => onPage((p) => Math.min(pageCount, p + 1))}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

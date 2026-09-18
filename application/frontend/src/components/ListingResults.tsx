import { type ReactNode } from "react";
import FetchOverlay from "./FetchOverlay";

type Props = {
  fetching?: boolean;
  filtering?: boolean;
  fetchLabel?: string;
  filterLabel?: string;
  children: ReactNode;
};

export default function ListingResults({
  fetching = false,
  filtering = false,
  fetchLabel = "Atualizando…",
  filterLabel = "Filtrando…",
  children,
}: Props) {
  return (
    <FetchOverlay active={fetching} label={fetchLabel}>
      <div
        className={`listing-results${filtering && !fetching ? " is-filtering" : ""}`}
        aria-busy={fetching || filtering}
        data-filter-label={filtering && !fetching ? filterLabel : undefined}
      >
        {children}
        {filtering && !fetching ? (
          <span className="sr-only" role="status">
            {filterLabel}
          </span>
        ) : null}
      </div>
    </FetchOverlay>
  );
}

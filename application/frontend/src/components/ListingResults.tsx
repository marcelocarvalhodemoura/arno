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
  const active = fetching || filtering;

  return (
    <FetchOverlay active={active} label={fetching ? fetchLabel : filterLabel}>
      <div className="listing-results">{children}</div>
    </FetchOverlay>
  );
}

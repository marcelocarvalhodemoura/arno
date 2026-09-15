import { useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  type BranchId,
  type Member,
  type MemberGuardian,
  type MovementType,
  type PaymentMethod,
  type TxNature,
  type TxPaymentStatus,
  type TxType,
} from "@shared";
import IdentifyPaymentsGuide from "../components/IdentifyPaymentsGuide";
import PageHeader from "../components/PageHeader";
import PageLoader from "../components/PageLoader";
import FetchOverlay from "../components/FetchOverlay";
import SubmitButton from "../components/SubmitButton";
import { FaDownload, FaFileImport } from "react-icons/fa";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { brl, downloadCsv, formatDate, roleLabel } from "../lib/format";
import { mapMemberRow, parseCsv, type MapResult, type MemberImportRow } from "../lib/csv";
import { fileToBase64, fileToCsvText, isImportFile, isPdfFile, isStatementImportFile } from "../lib/spreadsheet";
import { isUnidentifiedName, writeIdentifyFlag } from "../lib/movement";
import { usePeriod } from "../lib/period";
import { useFetch } from "../lib/useFetch";

type Kind = "members" | "transactions";

type ImportResult = {
  created: number;
  paid?: number;
  unidentified?: number;
  skipped: { reason: string }[];
};

type Preview<T> = {
  line: number;
  mapped: MapResult<T>;
};

type ImportSample = {
  totalRows: number;
  shown: number;
  columns: { field: string; label: string; source: string; column: string }[];
  rows: Record<string, string>[];
};

type SampleReview = {
  usedAi: boolean;
  ok: boolean;
  summary: string;
};

type SuggestedTx = {
  line: number;
  date: string;
  type: TxType;
  nature: TxNature;
  movementTypeId: string;
  movementTypeName: string;
  description: string;
  amount: number;
  branch: BranchId;
  method: PaymentMethod;
  paymentStatus: TxPaymentStatus;
  memberId?: string;
  memberName?: string;
  memberGuardianId?: string;
  memberGuardianName?: string;
  confidence: "high" | "medium" | "low";
  hint: string;
  error?: string;
  included: boolean;
};

type InterpretResponse = {
  layout: "template" | "bank";
  aiUsed: boolean;
  aiAvailable: boolean;
  aiMapped?: boolean;
  mapping?: Record<string, string>;
  sample?: ImportSample;
  review?: SampleReview;
  rows: Omit<SuggestedTx, "included">[];
};

type MapImportResponse = {
  csv: string;
  usedAi: boolean;
  aiAvailable: boolean;
  mapping: Record<string, string>;
  sample?: ImportSample;
  review?: SampleReview;
};

const FIELD_LABELS: Record<string, string> = {
  date: "Data",
  description: "Histórico",
  amount: "Valor",
  credit: "Crédito",
  debit: "Débito",
  type: "Tipo",
  member: "Associado",
  method: "Meio",
  status: "Situação",
  nature: "Natureza",
  branch: "Ramo",
  movementType: "Tipo de movimentação",
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  monthlyFee: "Mensalidade",
  joinedAt: "Ingresso",
  role: "Papel",
  clubeLtc: "Clube LTC",
  guardianName: "Responsável",
  guardianRelationship: "Parentesco",
  guardianPhone: "Telefone do responsável",
  guardianEmail: "E-mail do responsável",
};

function mappingLegend(mapping: Record<string, string>): string {
  return Object.entries(mapping)
    .filter(([, source]) => source)
    .map(([field, source]) => `${source.replaceAll("_", " ")} → ${FIELD_LABELS[field] ?? field}`)
    .join(" · ");
}

const MEMBER_TEMPLATE = `nome;email;telefone;ramo;papel;mensalidade;ingresso;clube_ltc;responsavel;parentesco
João da Silva;joao.exemplo@arnofriedrich.org.br;(51) 99999-1111;escoteiro;jovem;60,00;01/03/2026;não;Maria da Silva;Mãe
`;

const TX_TEMPLATE = `data;tipo;natureza;tipo_movimentacao;descricao;valor;ramo;meio;situacao;associado;responsavel
14/09/2026;entrada;variável;Doação;Doação via Pix;150,00;grupo;pix;pago;;
`;

function qty(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function Integration() {
  const toast = useToast();
  const navigate = useNavigate();
  const { setYear, setMonth } = usePeriod();
  const members = useFetch<(Member & { guardians?: MemberGuardian[] })[]>("/members");
  const types = useFetch<MovementType[]>("/movement-types");
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>("members");
  const [fileName, setFileName] = useState("");
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [layout, setLayout] = useState<InterpretResponse["layout"] | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiMapped, setAiMapped] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sample, setSample] = useState<ImportSample | null>(null);
  const [review, setReview] = useState<SampleReview | null>(null);
  const [memberPreview, setMemberPreview] = useState<Preview<MemberImportRow>[]>([]);
  const [txPreview, setTxPreview] = useState<SuggestedTx[]>([]);

  const preview = kind === "members" ? memberPreview : txPreview;
  const validMembers = useMemo(
    () => memberPreview.flatMap((row) => (row.mapped.ok ? [row.mapped.value] : [])),
    [memberPreview],
  );
  const validTxs = useMemo(
    () =>
      txPreview.filter(
        (row) =>
          row.included &&
          !row.error &&
          row.date &&
          row.movementTypeId &&
          row.amount > 0 &&
          row.description.length >= 2,
      ),
    [txPreview],
  );
  const validCount = kind === "members" ? validMembers.length : validTxs.length;
  const reviewCount = txPreview.filter((row) => row.included && (row.confidence !== "high" || row.error)).length;
  const errorCount =
    kind === "members" ? memberPreview.length - validMembers.length : txPreview.filter((row) => row.error).length;

  function resetPreview() {
    setMemberPreview([]);
    setTxPreview([]);
    setFileName("");
    setError(null);
    setLayout(null);
    setAiUsed(false);
    setAiMapped(false);
    setMapping({});
    setSample(null);
    setReview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function switchKind(next: Kind) {
    setKind(next);
    resetPreview();
  }

  function patchTx(line: number, patch: Partial<SuggestedTx>) {
    setTxPreview((current) =>
      current.map((row) => {
        if (row.line !== line) return row;
        const next = { ...row, ...patch, confidence: "high" as const, error: undefined, hint: "Conferido" };
        if (patch.memberId !== undefined) {
          const member = (members.data ?? []).find((item) => item.id === patch.memberId);
          next.memberName = member?.name;
          if (member) next.branch = member.branch;
          const guardians = member?.guardians ?? [];
          if (!guardians.some((item) => item.id === next.memberGuardianId)) {
            next.memberGuardianId = guardians[0]?.id;
            next.memberGuardianName = guardians[0]?.name;
          }
        }
        if (patch.memberGuardianId !== undefined) {
          const member = (members.data ?? []).find((item) => item.id === next.memberId);
          next.memberGuardianName = member?.guardians?.find((item) => item.id === patch.memberGuardianId)?.name;
        }
        return next;
      }),
    );
  }

  async function readFile(file: File) {
    if (kind === "members") {
      if (!isImportFile(file)) {
        setError("Use um arquivo .csv, .txt, .xls ou .xlsx");
        return;
      }
    } else if (!isStatementImportFile(file)) {
      setError("Use um arquivo .csv, .txt, .xls, .xlsx ou .pdf");
      return;
    }
    setFileName(file.name);
    setError(null);
    if (kind === "members") {
      setInterpreting(true);
      try {
        const text = await fileToCsvText(file);
        const mapped = await api<MapImportResponse>("/integrations/map-import", {
          method: "POST",
          body: JSON.stringify({ csv: text, kind: "members" }),
        });
        const table = parseCsv(mapped.csv);
        if (!table.rows.length) {
          setMemberPreview([]);
          setError("O arquivo não tem linhas de dados");
          return;
        }
        if (table.rows.length > 500) {
          setMemberPreview([]);
          setError("Importe no máximo 500 linhas por vez");
          return;
        }
        setAiUsed(mapped.usedAi);
        setAiAvailable(mapped.aiAvailable);
        setAiMapped(mapped.usedAi);
        setMapping(mapped.mapping ?? {});
        setSample(mapped.sample ?? null);
        setReview(mapped.review ?? null);
        setTxPreview([]);
        setMemberPreview(table.rows.map((row, index) => ({ line: index + 2, mapped: mapMemberRow(row) })));
      } catch (err) {
        setMemberPreview([]);
        setError(err instanceof Error ? err.message : "Não foi possível interpretar a planilha");
      } finally {
        setInterpreting(false);
      }
      return;
    }
    setInterpreting(true);
    try {
      const payload = isPdfFile(file)
        ? { pdf: await fileToBase64(file) }
        : { csv: await fileToCsvText(file) };
      const result = await api<InterpretResponse>("/integrations/interpret-statement", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await types.reload();
      setLayout(result.layout);
      setAiUsed(result.aiUsed);
      setAiAvailable(result.aiAvailable);
      setAiMapped(Boolean(result.aiMapped));
      setMapping(result.mapping ?? {});
      setSample(result.sample ?? null);
      setReview(result.review ?? null);
      setMemberPreview([]);
      if (!result.rows.length) {
        setTxPreview([]);
        setError("Nenhum lançamento encontrado no arquivo");
        return;
      }
      setTxPreview(result.rows.map((row) => ({ ...row, included: !row.error })));
    } catch (err) {
      setTxPreview([]);
      setError(err instanceof Error ? err.message : "Não foi possível interpretar o extrato");
    } finally {
      setInterpreting(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  async function importRows() {
    setError(null);
    if (!validCount) {
      setError("Nenhuma linha válida para importar");
      return;
    }
    setSaving(true);
    try {
      if (kind === "members") {
        const result = await api<ImportResult>("/integrations/members", {
          method: "POST",
          body: JSON.stringify({ rows: validMembers }),
        });
        const skipped = result.skipped.length;
        if (result.created) {
          toast.success(
            `${qty(result.created, "associado cadastrado", "associados cadastrados")}${
              skipped ? `. ${qty(skipped, "já existia", "já existiam")}.` : "."
            }`,
          );
        } else {
          toast.success(`Nenhum associado novo. ${qty(skipped, "já estava cadastrado", "já estavam cadastrados")}.`);
        }
        await members.reload();
      } else {
        const result = await api<ImportResult>("/integrations/transactions", {
          method: "POST",
          body: JSON.stringify({
            rows: validTxs.map((row) => ({
              date: row.date,
              type: row.type,
              nature: row.nature,
              movementTypeId: row.movementTypeId,
              description: row.description,
              amount: row.amount,
              branch: row.branch,
              method: row.method,
              paymentStatus: row.paymentStatus,
              memberId: row.memberId,
              memberGuardianId: row.memberGuardianId,
            })),
          }),
        });
        const skipped = result.skipped.length;
        const paid = result.paid ?? 0;
        const unidentified =
          result.unidentified ??
          validTxs.filter((row) => isUnidentifiedName(row.movementTypeName)).length;
        const parts = [
          result.created ? qty(result.created, "lançamento importado", "lançamentos importados") : "",
          paid ? qty(paid, "mensalidade marcada como paga", "mensalidades marcadas como pagas") : "",
          unidentified
            ? qty(unidentified, "ficou para identificar o tipo", "ficaram para identificar o tipo")
            : "",
        ].filter(Boolean);
        if (parts.length) {
          toast.success(`${parts.join(". ")}${skipped ? `. ${qty(skipped, "já existia", "já existiam")}.` : "."}`);
        } else {
          toast.success(`Nenhum lançamento novo. ${qty(skipped, "já estava no caixa", "já estavam no caixa")}.`);
        }
        if (unidentified) {
          const first = validTxs.find((row) => isUnidentifiedName(row.movementTypeName));
          if (first?.date) {
            setYear(Number(first.date.slice(0, 4)));
            setMonth(Number(first.date.slice(5, 7)));
          }
          writeIdentifyFlag();
          resetPreview();
          navigate("/fluxo");
          return;
        }
      }
      resetPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível importar o arquivo");
    } finally {
      setSaving(false);
    }
  }

  if (!members.data || !types.data) {
    if (members.error || types.error) {
      return <p className="error">{members.error ?? types.error}</p>;
    }
    return <PageLoader label="Carregando integração…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Integração"
        title="Extratos e associados"
        subtitle="A tesouraria identifica as colunas da planilha ou do PDF do banco, remonta no formato do sistema e sugere tipo, ramo e associado. Você confere a prévia antes de gravar."
        actions={
          <button
            className="btn btn-outline"
            type="button"
            onClick={() =>
              downloadCsv(
                kind === "members" ? "modelo-associados.csv" : "modelo-extrato.csv",
                kind === "members" ? MEMBER_TEMPLATE : TX_TEMPLATE,
              )
            }
          >
            <FaDownload /> Baixar modelo
          </button>
        }
      />

      <div className="tabs">
        <button
          className={`tab ${kind === "members" ? "is-on" : ""}`}
          type="button"
          onClick={() => switchKind("members")}
        >
          Associados
        </button>
        <button
          className={`tab ${kind === "transactions" ? "is-on" : ""}`}
          type="button"
          onClick={() => switchKind("transactions")}
        >
          Extrato
        </button>
      </div>

      {kind === "transactions" ? <IdentifyPaymentsGuide defaultOpen /> : null}

      <FetchOverlay active={interpreting} label="Identificando campos e montando a amostragem…">
        <article className="card">
          <p className="muted" style={{ marginBottom: 16 }}>
            {kind === "members"
              ? "Colunas: nome, e-mail, telefone, ramo, papel, mensalidade, ingresso, clube LTC e, para jovem, responsável e parentesco."
              : "Aceita o modelo da tesouraria, extrato em planilha (data, histórico e valor) ou PDF do Sicredi. Mensalidade identificada marca o associado como pago. Linhas amarelas entram no caixa para conferir o tipo depois."}
          </p>

          <label
            className={`dropzone${over ? " is-over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <FaFileImport />
            <strong>{fileName || "Arraste o arquivo ou clique para selecionar"}</strong>
            <span>
              {kind === "members"
                ? "Arquivos .csv, .txt, .xls ou .xlsx, até 500 linhas"
                : "Arquivos .csv, .txt, .xls, .xlsx ou .pdf do extrato, até 500 linhas"}
            </span>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept={
                kind === "members"
                  ? ".csv,.txt,.xls,.xlsx,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  : ".csv,.txt,.xls,.xlsx,.pdf,text/csv,text/plain,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          {kind === "transactions" && txPreview.length ? (
            <>
              <p style={{ margin: "18px 0 10px" }}>
                {layout === "bank" ? "Extrato do banco" : "Modelo da tesouraria"}
                {aiMapped ? " · colunas identificadas pelo modelo" : " · colunas identificadas"}
                {aiUsed ? " · classificado com modelo" : " · classificado por regras"}
                {!aiUsed && aiAvailable ? " · modelo disponível para linhas duvidosas" : ""}
                {` · ${qty(txPreview.length, "linha lida", "linhas lidas")}`}
                {validCount ? ` · ${qty(validCount, "pronta", "prontas")} para importar` : ""}
                {reviewCount ? ` · ${qty(reviewCount, "para conferir", "para conferir")}` : ""}
                {errorCount ? ` · ${qty(errorCount, "com erro", "com erros")}` : ""}
              </p>
              {mappingLegend(mapping) ? (
                <p className="muted" style={{ margin: "-4px 0 12px" }}>
                  {mappingLegend(mapping)}
                </p>
              ) : null}
              <SamplePanel sample={sample} review={review} />
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Incluir</th>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Tipo</th>
                      <th>Associado</th>
                      <th>Responsável</th>
                      <th>Ramo</th>
                      <th>Sugestão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txPreview.map((row) => (
                      <tr
                        key={row.line}
                        className={row.error ? "" : row.confidence === "high" ? "is-paid" : "is-pending"}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={row.included}
                            aria-label={`Incluir linha ${row.line}`}
                            disabled={Boolean(row.error)}
                            onChange={(event) =>
                              setTxPreview((current) =>
                                current.map((item) =>
                                  item.line === row.line ? { ...item, included: event.target.checked } : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>{row.date ? formatDate(row.date) : "—"}</td>
                        <td>
                          <input
                            className="preview-input"
                            value={row.description}
                            aria-label={`Descrição linha ${row.line}`}
                            onChange={(event) => patchTx(row.line, { description: event.target.value })}
                          />
                        </td>
                        <td>{row.amount ? brl(row.amount) : "—"}</td>
                        <td>
                          <select
                            value={row.movementTypeId}
                            aria-label={`Tipo linha ${row.line}`}
                            onChange={(event) => {
                              const movement = types.data?.find((item) => item.id === event.target.value);
                              patchTx(row.line, {
                                movementTypeId: event.target.value,
                                movementTypeName: movement?.name ?? "",
                                type:
                                  movement?.direction === "expense" || movement?.direction === "income"
                                    ? movement.direction
                                    : row.type,
                              });
                            }}
                          >
                            <option value="">Selecione</option>
                            {(types.data ?? [])
                              .filter(
                                (item) =>
                                  item.id === row.movementTypeId ||
                                  (item.active && (item.direction === "both" || item.direction === row.type)),
                              )
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.memberId ?? ""}
                            aria-label={`Associado linha ${row.line}`}
                            onChange={(event) => patchTx(row.line, { memberId: event.target.value || undefined })}
                          >
                            <option value="">Sem associado</option>
                            {(members.data ?? []).map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.memberGuardianId ?? ""}
                            aria-label={`Responsável linha ${row.line}`}
                            disabled={!row.memberId}
                            onChange={(event) =>
                              patchTx(row.line, { memberGuardianId: event.target.value || undefined })
                            }
                          >
                            <option value="">Não informar</option>
                            {(members.data ?? [])
                              .find((item) => item.id === row.memberId)
                              ?.guardians?.map((guardian) => (
                              <option key={guardian.id} value={guardian.id}>
                                {guardian.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.branch}
                            aria-label={`Ramo linha ${row.line}`}
                            onChange={(event) => patchTx(row.line, { branch: event.target.value as BranchId })}
                          >
                            {ALL_BRANCHES.map((id) => (
                              <option key={id} value={id}>
                                {BRANCH_LABELS[id]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {row.error ? (
                            <span className="preview-err">{row.error}</span>
                          ) : (
                            <span className={row.confidence === "high" ? "preview-ok" : "preview-warn"}>
                              {row.confidence === "high" ? "Ok" : "Conferir"} · {row.hint}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                Meio e natureza entram com a sugestão (Pix/fixa ou variável). Ajuste o tipo se a regra errar.
              </p>
            </>
          ) : null}

          {kind === "members" && memberPreview.length ? (
            <>
              <p style={{ margin: "18px 0 10px" }}>
                {aiMapped ? "Colunas identificadas pelo modelo" : "Colunas identificadas"}
                {` · ${qty(memberPreview.length, "linha lida", "linhas lidas")}`}
                {validCount ? ` · ${qty(validCount, "pronta", "prontas")} para importar` : ""}
                {errorCount ? ` · ${qty(errorCount, "com erro", "com erros")}` : ""}
              </p>
              {mappingLegend(mapping) ? (
                <p className="muted" style={{ margin: "-4px 0 12px" }}>
                  {mappingLegend(mapping)}
                </p>
              ) : null}
              <SamplePanel sample={sample} review={review} />
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Ramo</th>
                      <th>Responsável</th>
                      <th>Mensalidade</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberPreview.map((row) => (
                      <tr key={row.line}>
                        <td>{row.line}</td>
                        {row.mapped.ok ? (
                          <>
                            <td>{row.mapped.value.name}</td>
                            <td>{row.mapped.value.email}</td>
                            <td>{BRANCH_LABELS[row.mapped.value.branch]}</td>
                            <td>
                              {row.mapped.value.guardians?.length
                                ? row.mapped.value.guardians.map((item) => item.name).join(", ")
                                : row.mapped.value.role === "jovem"
                                  ? "Sem responsável"
                                  : "—"}
                            </td>
                            <td>{brl(row.mapped.value.monthlyFee)}</td>
                            <td>
                              <span className="preview-ok">Ok · {roleLabel(row.mapped.value.role)}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td colSpan={5}>—</td>
                            <td>
                              <span className="preview-err">{row.mapped.error}</span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {preview.length ? (
            <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
              <button className="btn btn-ghost" type="button" onClick={resetPreview} disabled={saving || interpreting}>
                Limpar
              </button>
              <SubmitButton
                type="button"
                busy={saving}
                busyLabel="Importando…"
                disabled={!validCount}
                onClick={() => void importRows()}
              >
                Importar{" "}
                {kind === "members"
                  ? qty(validCount, "associado", "associados")
                  : qty(validCount, "lançamento", "lançamentos")}
              </SubmitButton>
            </div>
          ) : null}
        </article>
      </FetchOverlay>
    </div>
  );
}

function SamplePanel({ sample, review }: { sample: ImportSample | null; review: SampleReview | null }) {
  if (!sample?.rows.length) return null;
  return (
    <div className="import-sample">
      <p>
        <strong>Amostragem para validar</strong>
        {` · ${qty(sample.shown, "exemplo", "exemplos")} de ${qty(sample.totalRows, "linha", "linhas")}. Confira se os campos batem antes de importar.`}
      </p>
      {review ? (
        <p className={review.ok ? "preview-ok" : "preview-warn"}>
          {review.usedAi ? "Modelo · " : "Conferência · "}
          {review.summary}
        </p>
      ) : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {sample.columns.map((column) => (
                <th key={column.field}>
                  {column.label}
                  {column.source && column.source !== column.column ? (
                    <span className="muted" style={{ display: "block", fontWeight: 400, letterSpacing: 0 }}>
                      {column.source.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.rows.map((row, index) => (
              <tr key={index}>
                {sample.columns.map((column) => (
                  <td key={column.field}>{row[column.column] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

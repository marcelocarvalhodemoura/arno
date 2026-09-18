export type BranchId = "filhote" | "lobinho" | "escoteiro" | "senior" | "pioneiro" | "flor-de-lis" | "grupo";

export type YouthBranchId = Exclude<BranchId, "grupo">;

export type MemberRole = "jovem" | "escotista" | "dirigente" | "clube";
export type MemberStatus = "active" | "inactive";
export type TxType = "income" | "expense";
export type TxNature = "fixed" | "variable";
export type PaymentMethod = "pix" | "cash" | "transfer" | "card" | "other";
export type TxPaymentStatus = "paid" | "pending";
export type MovementDirection = "income" | "expense" | "both";
export type AccountHolderKind = "parent" | "youth" | "other";
export type GuardianRelationship =
  | "Mãe"
  | "Pai"
  | "Madrasta"
  | "Padrasto"
  | "Tia"
  | "Tio"
  | "Avó"
  | "Avô"
  | "Irmã"
  | "Irmão"
  | "Responsável legal"
  | "Outro";
export type ReportGroupBy = "none" | "month" | "branch" | "movementType" | "nature";
export type UserRole = "admin" | "tesoureiro";
export type RecordOrigin = "manual" | "integration" | "sicredi";
export type BankProvider = "sicredi";
export type BankMovementStatus = "new" | "matched" | "imported";

export interface AuditInfo {
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DASHBOARD_BRANCHES: BranchId[] = [
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
  "grupo",
];

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  origin: RecordOrigin;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BranchMeta {
  id: YouthBranchId;
  name: string;
  unit: string;
  color: string;
  tone: string;
}

export const YOUTH_BRANCHES: BranchMeta[] = [
  {
    id: "filhote",
    name: "Ramo Filhotes",
    unit: "Filhotes",
    color: "#ee9b00",
    tone: "amber",
  },
  {
    id: "lobinho",
    name: "Ramo Lobinho",
    unit: "Alcateia",
    color: "#e8b423",
    tone: "gold",
  },
  {
    id: "escoteiro",
    name: "Ramo Escoteiro",
    unit: "Tropa Escoteira",
    color: "#2d8a4e",
    tone: "pine",
  },
  {
    id: "senior",
    name: "Ramo Sênior",
    unit: "Tropa Sênior",
    color: "#c8102e",
    tone: "clay",
  },
  {
    id: "pioneiro",
    name: "Ramo Pioneiro",
    unit: "Clã Pioneiro",
    color: "#8b1a2b",
    tone: "wine",
  },
  {
    id: "flor-de-lis",
    name: "Clube da Flor de Lis",
    unit: "Flor de Lis",
    color: "#c45d7a",
    tone: "rose",
  },
];

export const BRANCH_LABELS: Record<BranchId, string> = {
  filhote: "Filhotes",
  lobinho: "Lobinho",
  escoteiro: "Escoteiro",
  senior: "Sênior",
  pioneiro: "Pioneiro",
  "flor-de-lis": "Flor de Lis",
  grupo: "Grupo",
};

export const ALL_BRANCHES: BranchId[] = [
  "filhote",
  "lobinho",
  "escoteiro",
  "senior",
  "pioneiro",
  "flor-de-lis",
  "grupo",
];

export const GUARDIAN_RELATIONSHIPS: GuardianRelationship[] = [
  "Mãe",
  "Pai",
  "Madrasta",
  "Padrasto",
  "Tia",
  "Tio",
  "Avó",
  "Avô",
  "Irmã",
  "Irmão",
  "Responsável legal",
  "Outro",
];

export interface MovementType {
  id: string;
  name: string;
  direction: MovementDirection;
  description: string;
  active: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Fee {
  id: string;
  name: string;
  amount: number;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: YouthBranchId;
  role: MemberRole;
  monthlyFee: number;
  status: MemberStatus;
  joinedAt: string;
  clubeLtc: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberGuardian {
  id: string;
  memberId: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemberAccount {
  id: string;
  memberId: string;
  holderName: string;
  holderKind: AccountHolderKind;
  relationship: string;
  pixKey: string;
  bank: string;
  agency: string;
  accountNumber: string;
  document: string;
  notes?: string;
  isPrimary: boolean;
  active: boolean;
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TxType;
  nature: TxNature;
  movementTypeId: string;
  description: string;
  amount: number;
  branch: BranchId;
  method: PaymentMethod;
  paymentStatus: TxPaymentStatus;
  memberId?: string;
  memberAccountId?: string;
  memberGuardianId?: string;
  projectId?: string;
  notes?: string;
  externalId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  origin: RecordOrigin;
}

export interface BankMovement {
  id: string;
  provider: BankProvider;
  externalId: string;
  occurredAt: string;
  date: string;
  amount: number;
  type: TxType;
  method: PaymentMethod;
  description: string;
  payerName: string;
  payerDocument: string;
  txid: string;
  status: BankMovementStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectItem {
  id: string;
  category: string;
  description: string;
  planned: number;
  movementTypeId?: string;
}

export interface FinancialProject {
  id: string;
  branch: BranchId;
  year: number;
  name: string;
  description: string;
  items: ProjectItem[];
  origin: RecordOrigin;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Settings {
  openingBalance: number;
  groupName: string;
  mensalidadeDueDay?: number;
}

export type MensalidadeCellStatus = "paid" | "pending" | "overdue" | "none";

export interface MensalidadeCell {
  month: number;
  dueDate: string | null;
  status: MensalidadeCellStatus;
  transactionId?: string;
  amount: number;
}

export interface MensalidadeRow {
  memberId: string;
  name: string;
  branch: YouthBranchId;
  role: MemberRole;
  memberStatus: MemberStatus;
  joinedAt: string;
  dueDay: number;
  monthlyFee: number;
  lateFee: number;
  clubeLtc: boolean;
  cells: MensalidadeCell[];
}

export interface MensalidadeReport {
  year: number;
  dueDay: number;
  months: number[];
  rows: MensalidadeRow[];
  summary: {
    paid: number;
    pending: number;
    overdue: number;
    openAmount: number;
    paidAmount: number;
  };
}

export interface DatabaseShape {
  members: Member[];
  memberGuardians: MemberGuardian[];
  memberAccounts: MemberAccount[];
  movementTypes: MovementType[];
  fees: Fee[];
  transactions: Transaction[];
  projects: FinancialProject[];
  settings: Settings;
}

export interface CashFlowMonth {
  month: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
  byMovementType: { movementTypeId: string; name: string; income: number; expense: number }[];
  byBranch: { branch: BranchId; income: number; expense: number }[];
}

export interface CustomReportQuery {
  from: string;
  to: string;
  branches: BranchId[];
  types: TxType[];
  natures: TxNature[];
  movementTypeIds: string[];
  groupBy: ReportGroupBy;
}

export interface CustomReportRow {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface FiscalLedgerLine {
  seq: number;
  id: string;
  date: string;
  type: TxType;
  nature: TxNature;
  movementType: string;
  branch: BranchId;
  memberName?: string;
  guardianName?: string;
  accountHolder?: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
  createdByName: string;
  createdAt: string;
  updatedByName?: string;
  updatedAt?: string;
  origin: RecordOrigin;
}

export interface DashboardPayload {
  year: number;
  month: number;
  from: string;
  to: string;
  opening: number;
  income: number;
  expense: number;
  current: number;
  members: number;
  activeMembers: number;
  byBranch: {
    branch: BranchId;
    income: number;
    expense: number;
    members: number;
  }[];
  chart: { month: string; income: number; expense: number; balance: number }[];
}

/** Padrão do cartaz; o valor vigente fica em Configurações (`mensalidadeDueDay`). */
export const DEFAULT_MENSALIDADE_DUE_DAY = 10;

export function resolveMensalidadeDueDay(value?: number | null): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) return DEFAULT_MENSALIDADE_DUE_DAY;
  return day;
}

export const MENSALIDADE_TABLE = {
  baseRegular: 75,
  basePioneer: 25,
  extra: 4.5,
  punctual: 10,
  late: 20,
} as const;

export type MensalidadeProfile = {
  branch: string;
  clubeLtc: boolean;
};

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function amountsNear(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.05;
}

export function mensalidadeBase(branch: string): number {
  return branch === "pioneiro" ? MENSALIDADE_TABLE.basePioneer : MENSALIDADE_TABLE.baseRegular;
}

export function onTimeMonthlyFee(profile: MensalidadeProfile): number {
  const base = mensalidadeBase(profile.branch);
  if (profile.clubeLtc) return base;
  return money(base + MENSALIDADE_TABLE.punctual + MENSALIDADE_TABLE.extra);
}

export function lateMonthlyFee(profile: MensalidadeProfile): number {
  const base = mensalidadeBase(profile.branch);
  if (profile.clubeLtc) return base;
  return money(base + MENSALIDADE_TABLE.late + MENSALIDADE_TABLE.extra);
}

export function expectedMonthlyFee(profile: MensalidadeProfile, dueDate: string, today: string): number {
  return dueDate < today ? lateMonthlyFee(profile) : onTimeMonthlyFee(profile);
}

export function isOfficialMensalidadeAmount(profile: MensalidadeProfile, amount: number): boolean {
  return amountsNear(amount, onTimeMonthlyFee(profile)) || amountsNear(amount, lateMonthlyFee(profile));
}

export function matchesMensalidadeAmount(
  profile: MensalidadeProfile & { monthlyFee?: number },
  amount: number,
): boolean {
  if (profile.monthlyFee !== undefined && amountsNear(amount, profile.monthlyFee)) return true;
  return isOfficialMensalidadeAmount(profile, amount);
}

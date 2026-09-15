export type BranchId =
  | "filhote"
  | "lobinho"
  | "escoteiro"
  | "senior"
  | "pioneiro"
  | "flor-de-lis"
  | "grupo";

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
export type RecordOrigin = "manual" | "integration";

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
  "grupo",
  "flor-de-lis",
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
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  origin: RecordOrigin;
}

export interface ProjectItem {
  id: string;
  category: string;
  description: string;
  planned: number;
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
  chart: { month: string; income: number; expense: number }[];
}

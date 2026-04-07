
export enum AssetStatus {
  OPERATIONAL = 'OPERACIONAL',
  MAINTENANCE = 'MANUTENÇÃO',
  DOWN = 'PARADO'
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVA',
  CORRETIVA = 'CORRETIVA'
}

export enum Criticality {
  LOW = 'BAIXA',
  MEDIUM = 'MÉDIA',
  HIGH = 'ALTA',
  CRITICAL = 'CRÍTICA'
}

export enum Frequency {
  MENSAL = 'MENSAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL'
}

export type ChecklistType = 'PONTE_PRINCIPAL' | 'TALHA_PRINCIPAL';

export interface UserProfile {
  id: string; // Formato FE-001, FE-002, etc.
  name: string;
  email: string;
  role: 'ADMIN' | 'TECNICO';
  password?: string;
}

export interface CraneAsset {
  id: string;
  client: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  capacity: string;
  span: string;
  location: string;
  commissioningDate: string;
  status: AssetStatus;
  equipmentType?: string;
}

export interface ChecklistItem {
  id: string;
  category: 'MECÂNICO' | 'ELÉTRICO' | 'SEGURANÇA';
  label: string;
  isOk: boolean | null;
  observation: string;
  photos?: string[];
  instruction?: string;
}

export interface MaintenanceRecord {
  id: string; // Server ID or Local UUID
  local_id?: string; // Dexie Primary Key
  inspectionNumber?: number;
  assetId: string;
  type: MaintenanceType;
  checklistType: ChecklistType;
  frequency: Frequency;
  date: string;
  technician: string;
  technicianId?: string;
  downtimeHours: number;
  criticality?: Criticality;
  checklists?: ChecklistItem[];
  cause?: string;
  actionTaken?: string;
  partsUsed?: string[];
  signature?: string;
  clientRepresentative?: string;
  status?: 'OPEN' | 'COMPLETED';
}

export enum Weather {
  SOL = 'SOL',
  CHUVA_FRACA = 'CHUVA FRACA',
  CHUVA_FORTE = 'CHUVA FORTE'
}

export interface RdoRecord {
  id: string; // Server ID or Local UUID
  local_id?: string;
  date: string;
  arrivalTime: string;
  startTime: string;
  siteName: string;
  clientName: string;
  weather: Weather;
  teamDescription: string;
  activities: string[]; // Lista de atividades
  materials: { label: string; isOk: boolean | null; observation: string }[];
  equipment: { label: string; isOk: boolean | null; observation: string }[];
  occurrences: string;
  photos: string[]; // Base64 ou URLs
  technicianId: string;
  technicianName: string;
  signature?: string;
  endTime?: string; // Horário de fechamento
  rdoNumber: number; // Número sequencial global
  status: 'OPEN' | 'COMPLETED';
  created_at?: string;
  updated_at?: string;
}

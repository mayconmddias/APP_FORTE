import Dexie, { Table } from 'dexie';
import { MaintenanceRecord, UserProfile, CraneAsset, RdoRecord } from '../types';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'ERROR';

export interface LocalMetadata {
  local_id: string; // UUID
  server_id?: string | null;
  sync_status: SyncStatus;
  updated_at: string;
  version: number;
  last_server_version?: number;
}

// Extended types for local storage
export type LocalAsset = CraneAsset & LocalMetadata;
export type LocalMaintenanceRecord = MaintenanceRecord & LocalMetadata;
export type LocalUserProfile = UserProfile & LocalMetadata;
export type LocalRdoRecord = RdoRecord & LocalMetadata;

export interface PendingDeletion {
  id?: number;
  server_id: string;
  table_name: string;
  timestamp: string;
}

export interface SyncLog {
  id?: number;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING';
  message: string;
  details?: any;
}

export class OfflineDatabase extends Dexie {
  ativos!: Table<LocalAsset>;
  ordens_servico!: Table<LocalMaintenanceRecord>;
  usuarios!: Table<LocalUserProfile>;
  documentos!: Table<Documento & LocalMetadata>;
  funcionario_integracoes!: Table<FuncionarioIntegracao & LocalMetadata>;
  anexos!: Table<{ local_id: string; metadata: any } & LocalMetadata>;
  exclusoes_pendentes!: Table<PendingDeletion>;
  logs_sincronizacao!: Table<SyncLog>;
  rdo!: Table<LocalRdoRecord>;

  constructor() {
    super('ForteOfflineDB');
    this.version(8).stores({
      ativos: 'local_id, server_id, client, sync_status, updated_at',
      ordens_servico: 'local_id, server_id, assetId, signature, clientSignature, status, sync_status, updated_at',
      usuarios: 'local_id, server_id, name, email, sync_status, updated_at',
      documentos: 'local_id, server_id, funcionario_id, tipo_documento, sync_status, updated_at',
      funcionario_integracoes: 'local_id, server_id, funcionario_id, empresa_id, sync_status, updated_at',
      anexos: 'local_id, server_id, sync_status',
      exclusoes_pendentes: '++id, server_id, table_name',
      logs_sincronizacao: '++id, timestamp, level',
      rdo: 'local_id, server_id, rdoNumber, date, clientName, siteName, status, sync_status, updated_at'
    });
  }

  async log(level: SyncLog['level'], message: string, details?: any) {
    await this.logs_sincronizacao.add({
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    });
  }
}

export const db = new OfflineDatabase();

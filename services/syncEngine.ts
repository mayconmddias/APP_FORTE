import { supabase } from '../supabaseClient';
import { db, SyncStatus } from './offlineDb';
import { networkManager } from './networkManager';

class SyncEngine {
    private isSyncing = false;
    private retryDelays: Record<string, number> = {}; // ms to wait
    private lastAttempt: Record<string, number> = {};

    constructor() {
        networkManager.subscribe((status) => {
            if (status.online) {
                this.triggerSync();
            }
        });

        // Background heart-beat sync (Acelado para 30s para mobile)
        setInterval(() => this.triggerSync(), 30 * 1000);
    }

    async triggerSync() {
        if (this.isSyncing) return;

        const status = networkManager.getStatus();
        if (!status.online) return;

        this.isSyncing = true;
        try {
            await this.syncTable('ativos', 'crane_assets');
            await this.syncTable('ordens_servico', 'maintenance_records');
            await this.syncTable('usuarios', 'user_profiles');
            await this.syncTable('rdo', 'rdo');

            // 4. Process Pending Deletions
            await this.processPendingDeletions();
        } catch (error: any) {
            console.error("Sync Cycle Error:", error);
        } finally {
            this.isSyncing = false;
        }
    }

    forceResetBackoff() {
        this.retryDelays = {};
        this.lastAttempt = {};
    }

    private async syncTable(localTableName: 'ativos' | 'ordens_servico' | 'usuarios' | 'rdo', serverTableName: string) {
        const pending = await db[localTableName]
            .where('sync_status')
            .anyOf(['PENDING', 'ERROR'])
            .toArray();

        if (pending.length === 0) return;

        // Filter out those in backoff
        const now = Date.now();
        const readyToSync = pending.filter(record => {
            const delay = this.retryDelays[record.local_id] || 0;
            const last = this.lastAttempt[record.local_id] || 0;
            return now >= last + delay;
        });

        if (readyToSync.length === 0) return;

        // Batch processing (up to 50 at a time)
        const batchSize = 50;
        for (let i = 0; i < readyToSync.length; i += batchSize) {
            const batch = readyToSync.slice(i, i + batchSize);
            await this.processBatch(localTableName, serverTableName, batch);
        }
    }

    private async processPendingDeletions() {
        const pending = await db.exclusoes_pendentes.toArray();
        if (pending.length === 0) return;

        console.log(`SyncEngine: Processing ${pending.length} pending deletions.`);

        for (const deletion of pending) {
            try {
                const { error } = await supabase
                    .from(deletion.table_name)
                    .delete()
                    .eq('id', deletion.server_id);

                if (error) {
                    console.error(`SyncEngine: Error deleting ${deletion.server_id} from ${deletion.table_name}:`, error);
                    // We don't remove from queue if there's a persistent error, 
                    // unless it's a 404 (already deleted). 
                    // Supabase delete doesn't return 404 easily, but we can assume success if no error.
                    continue;
                }

                await db.exclusoes_pendentes.delete(deletion.id!);
                console.log(`SyncEngine: Successfully deleted ${deletion.server_id} from ${deletion.table_name}`);
            } catch (err) {
                console.error(`SyncEngine: Fatal error processing deletion for ${deletion.server_id}:`, err);
            }
        }
    }

    private async processBatch(localTable: 'ativos' | 'ordens_servico' | 'usuarios' | 'rdo', serverTable: string, batch: any[]) {
        try {
            // 1. Fetch current versions from server to detect conflicts
            const { data: serverRecords, error: fetchError } = await supabase
                .from(serverTable)
                .select('id, version')
                .in('id', batch.map(r => r.server_id || r.local_id));

            if (fetchError) throw fetchError;

            const recordsToUpsert: any[] = [];
            const conflictedRecords: any[] = [];

            for (const localRecord of batch) {
                const serverRecord = serverRecords?.find(r => r.id === (localRecord.server_id || localRecord.local_id));

                // CONFLICT DETECTION: 
                // If server has a higher version than what we last knew about, it's a conflict.
                if (serverRecord && localRecord.last_server_version !== undefined && serverRecord.version > localRecord.last_server_version) {
                    conflictedRecords.push(localRecord);
                    continue;
                }

                const { local_id, sync_status, server_id, last_server_version, ...data } = localRecord;
                const newVersion = (serverRecord?.version || 0) + 1;

                let mapped: any = {
                    id: server_id || data.id || local_id,
                    version: newVersion
                };

                if (localTable === 'ativos') {
                    Object.assign(mapped, {
                        client: data.client,
                        name: data.name,
                        serial_number: data.serialNumber,
                        manufacturer: data.manufacturer,
                        capacity: data.capacity,
                        span: data.span,
                        location: data.location,
                        commissioning_date: data.commissioningDate,
                        status: data.status,
                        equipment_type: data.equipmentType
                    });
                } else if (localTable === 'usuarios') {
                    Object.assign(mapped, {
                        email: data.email,
                        name: data.name,
                        role: data.role,
                        password: data.password
                    });
                } else if (localTable === 'ordens_servico') {
                    const [asset, technician] = await Promise.all([
                        db.ativos.get(data.assetId),
                        db.usuarios.get(data.technicianId)
                    ]);
                    Object.assign(mapped, {
                        inspection_number: data.inspectionNumber,
                        asset_id: asset?.server_id || data.assetId,
                        type: data.type,
                        checklist_type: data.checklistType,
                        frequency: data.frequency,
                        date: data.date,
                        technician: data.technician,
                        technician_id: technician?.server_id || data.technicianId,
                        checklists: data.checklists,
                        client_representative: data.clientRepresentative,
                        signature: data.signature
                    });
                } else if (localTable === 'rdo') {
                    Object.assign(mapped, {
                        date: data.date,
                        arrival_time: data.arrivalTime,
                        start_time: data.startTime,
                        site_name: data.siteName,
                        client_name: data.clientName,
                        weather: data.weather,
                        team_description: data.teamDescription,
                        activities: data.activities,
                        materials: data.materials,
                        equipment: data.equipment,
                        occurrences: data.occurrences,
                        photos: data.photos,
                        technician_id: data.technicianId,
                        technician_name: data.technicianName,
                        signature: data.signature,
                        status: data.status,
                        end_time: data.endTime
                    });
                }
                recordsToUpsert.push(mapped);
            }

            // 2. Perform Upsert for non-conflicted records
            let results: any[] = [];
            if (recordsToUpsert.length > 0) {
                const { data: upsertResults, error: upsertError } = await supabase
                    .from(serverTable)
                    .upsert(recordsToUpsert, { onConflict: 'id' })
                    .select();

                if (upsertError) throw upsertError;
                results = upsertResults || [];
            }

            // 3. Handle Conflicts
            if (conflictedRecords.length > 0) {
                for (const rec of conflictedRecords) {
                    await db[localTable].update(rec.local_id, { sync_status: 'ERROR' });
                    await db.log('WARNING', `Conflito de edição detectado: ${rec.local_id} em ${serverTable}. Versão no servidor é mais recente.`);
                }
            }

            if (results.length > 0 || conflictedRecords.length > 0) {
                // Update local records on success or conflict (status was already updated for conflicts)
                for (const localRecord of batch) {
                    const match = results?.find(r => r.id === (localRecord.server_id || localRecord.local_id));

                    if (match) {
                        await db[localTable].update(localRecord.local_id, {
                            server_id: match.id,
                            sync_status: 'SYNCED',
                            version: localRecord.version, // Use the version we just sent
                            last_server_version: match.version // Store the exact version from server
                        });
                    }

                    delete this.retryDelays[localRecord.local_id];
                    delete this.lastAttempt[localRecord.local_id];
                }
            }

            await db.log('SUCCESS', `Lote processado: ${batch.length} registros em ${serverTable} (${recordsToUpsert.length} enviados, ${conflictedRecords.length} conflitos)`);
        } catch (err: any) {
            console.error(`Batch sync error (${serverTable}):`, err);

            for (const record of batch) {
                const currentDelay = this.retryDelays[record.local_id] || 1000;
                this.retryDelays[record.local_id] = Math.min(currentDelay * 2, 60000);
                this.lastAttempt[record.local_id] = Date.now();

                const attempts = Math.log2(this.retryDelays[record.local_id] / 1000);
                if (attempts >= 5) {
                    await db[localTable].update(record.local_id, { sync_status: 'ERROR' });
                }
            }

            await db.log('ERROR', `Falha no lote de ${serverTable}`, {
                message: err.message || String(err),
                details: err.details || err.hint || err.code
            });
        }
    }
}

export const syncEngine = new SyncEngine();

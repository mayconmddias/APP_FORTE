
import React, { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import AssetManagement from './components/AssetManagement';
import ChecklistForm from './components/ChecklistForm';
import CorrectiveMaintenanceFlow from './components/CorrectiveMaintenanceFlow';
import PreventiveHistory from './components/PreventiveHistory';
import UserManagement from './components/UserManagement';
import OpenInspections from './components/OpenInspections';
import SyncPendencyScreen from './components/SyncPendencyScreen';
import RdoForm from './components/RdoForm';
import RdoHistory from './components/RdoHistory';
import DocumentManagement from './components/DocumentManagement';
import { MaintenanceRecord, UserProfile, CraneAsset, RdoRecord } from './types';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';
import { db, LocalAsset, LocalMaintenanceRecord } from './services/offlineDb';
import { syncEngine } from './services/syncEngine';
import { networkManager } from './services/networkManager';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [rdos, setRdos] = useState<RdoRecord[]>([]);
  const [assets, setAssets] = useState<CraneAsset[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOsNumber, setNextOsNumber] = useState<number>(1);

  const [preselectedAssetId, setPreselectedAssetId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [editingRdo, setEditingRdo] = useState<RdoRecord | null>(null);
  const [nextRdoNumber, setNextRdoNumber] = useState<number>(1);
  const [rdoSelectedClient, setRdoSelectedClient] = useState<string | null>(null);
  const [rdoSourceTab, setRdoSourceTab] = useState<string | null>(null);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAssetIdForAction, setSelectedAssetIdForAction] = useState<string | null>(null);

  const loadLocalData = async () => {
    const localAssets = await db.ativos.toArray();
    const localHistory = await db.ordens_servico.toArray();
    const localUsers = await db.usuarios.toArray();
    const localRdos = await db.rdo.toArray();

    setAssets(localAssets as any);
    setHistory(localHistory as any);
    setUsers(localUsers as any);
    setRdos(localRdos as any);

    // LOGICA DE NUMERAÇÃO RDO: Busca o maior número de RDO existente e soma 1
    if (localRdos.length > 0) {
      const maxRdo = localRdos.reduce((max, rec) => {
        const num = (rec.rdoNumber || 0);
        return num > max ? num : max;
      }, 0);
      setNextRdoNumber(maxRdo + 1);
    } else {
      setNextRdoNumber(1);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carregar o que já temos localmente para UI rápida
      await loadLocalData();

      // 2. Se online, buscar novidades do Supabase
      const status = networkManager.getStatus();
      if (status.online) {
        // Assets
        const { data: assetsData } = await supabase.from('crane_assets').select('*');
        let assetServerToLocalMap: Record<string, string> = {};

        if (assetsData) {
          // Reconciliation: Delete local SYNCED assets missing from server
          const serverAssetIds = assetsData.map(a => a.id);
          const localSyncedAssets = await db.ativos.where('sync_status').equals('SYNCED').toArray();
          const assetsToDelete = localSyncedAssets.filter(la => la.server_id && !serverAssetIds.includes(la.server_id));
          if (assetsToDelete.length > 0) {
            await db.ativos.bulkDelete(assetsToDelete.map(a => a.local_id));
          }

          const mappedAssets = await Promise.all(assetsData.map(async a => {
            const existing = await db.ativos.where('server_id').equals(a.id).first();
            const local_id = existing?.local_id || uuidv4();
            assetServerToLocalMap[a.id] = local_id;
            return {
              id: local_id,
              local_id: local_id,
              server_id: a.id,
              client: a.client,
              name: a.name,
              serialNumber: a.serial_number || a.serialNumber,
              manufacturer: a.manufacturer,
              capacity: a.capacity,
              span: a.span,
              location: a.location,
              commissioningDate: a.commissioning_date || a.commissioningDate,
              status: a.status,
              equipmentType: a.equipment_type || a.equipmentType,
              sync_status: 'SYNCED',
              updated_at: new Date().toISOString(),
              version: 1
            } as LocalAsset;
          }));
          await db.ativos.bulkPut(mappedAssets);
        }

        // Users
        const { data: usersData } = await supabase.from('user_profiles').select('*');
        let userServerToLocalMap: Record<string, string> = {};

        if (usersData) {
          // Reconciliation: Delete local SYNCED users missing from server
          const serverUserIds = usersData.map(u => u.id);
          const localSyncedUsers = await db.usuarios.where('sync_status').equals('SYNCED').toArray();
          const usersToDelete = localSyncedUsers.filter(lu => lu.server_id && !serverUserIds.includes(lu.server_id));
          if (usersToDelete.length > 0) {
            await db.usuarios.bulkDelete(usersToDelete.map(u => u.local_id));
          }

          const mappedUsers = await Promise.all(usersData.map(async u => {
            const existing = await db.usuarios.where('server_id').equals(u.id).first();
            const local_id = existing?.local_id || uuidv4();
            userServerToLocalMap[u.id] = local_id;
            return {
              ...u,
              id: local_id,
              local_id: local_id,
              server_id: u.id,
              sync_status: 'SYNCED',
              updated_at: new Date().toISOString(),
              version: 1
            };
          }));
          await db.usuarios.bulkPut(mappedUsers as any);
        }

        // History (Moved after Users to have mapping)
        const { data: historyData } = await supabase.from('maintenance_records').select('*');
        if (historyData) {
          // Reconciliation: Delete local SYNCED history missing from server
          const serverHistoryIds = historyData.map(h => h.id);
          const localSyncedHistory = await db.ordens_servico.where('sync_status').equals('SYNCED').toArray();
          const historyToDelete = localSyncedHistory.filter(lh => lh.server_id && !serverHistoryIds.includes(lh.server_id));
          if (historyToDelete.length > 0) {
            await db.ordens_servico.bulkDelete(historyToDelete.map(h => h.local_id));
          }

          // LOCAL DEDUPLICATION: Remove duplicates sharing the same logical id
          const allLocal = await db.ordens_servico.toArray();
          const seenIds = new Set<string>();
          const duplicatesToRemove: string[] = [];
          
          // Sort by updated_at descending to keep the most recent
          allLocal.sort((a, b) => (new Date(b.updated_at).getTime()) - (new Date(a.updated_at).getTime()));
          
          allLocal.forEach(rec => {
            if (seenIds.has(rec.id)) {
              duplicatesToRemove.push(rec.local_id);
            } else {
              seenIds.add(rec.id);
            }
          });
          
          if (duplicatesToRemove.length > 0) {
            await db.ordens_servico.bulkDelete(duplicatesToRemove);
            console.log(`Deduplication: Removed ${duplicatesToRemove.length} local duplicates.`);
          }

          const mappedHistory = await Promise.all(historyData.map(async h => {
            const existing = await db.ordens_servico.where('server_id').equals(h.id).first();
            const local_id = existing?.local_id || uuidv4();

            // CRITICAL FIX: Map server IDs to local IDs
            const localAssetId = assetServerToLocalMap[h.asset_id] || h.asset_id;
            const localTechnicianId = userServerToLocalMap[h.technician_id] || h.technician_id;

            return {
              id: local_id,
              local_id: local_id,
              server_id: h.id,
              inspectionNumber: h.inspection_number,
              assetId: localAssetId,
              type: h.type,
              checklistType: h.checklist_type,
              frequency: h.frequency,
              date: h.date,
              technician: h.technician,
              technicianId: localTechnicianId,
              downtimeHours: h.downtime_hours,
              criticality: h.criticality,
              checklists: h.checklists,
              clientRepresentative: h.client_representative,
              signature: h.signature,
              sync_status: 'SYNCED',
              updated_at: new Date().toISOString(),
              version: 1
            } as LocalMaintenanceRecord;
          }));
          await db.ordens_servico.bulkPut(mappedHistory);
        }

        // RDO
        const { data: rdoData } = await supabase.from('rdo').select('*');
        if (rdoData) {
            const serverRdoIds = rdoData.map(r => r.id);
            const localSyncedRdos = await db.rdo.where('sync_status').equals('SYNCED').toArray();
            const rdosToDelete = localSyncedRdos.filter(lr => lr.server_id && !serverRdoIds.includes(lr.server_id));
            if (rdosToDelete.length > 0) {
                await db.rdo.bulkDelete(rdosToDelete.map(r => r.local_id));
            }

            const mappedRdos = await Promise.all(rdoData.map(async r => {
                const existing = await db.rdo.where('server_id').equals(r.id).first();
                const local_id = existing?.local_id || uuidv4();

                return {
                    id: local_id,
                    local_id: local_id,
                    server_id: r.id,
                    date: r.date,
                    arrivalTime: r.arrival_time,
                    startTime: r.start_time,
                    siteName: r.site_name,
                    clientName: r.client_name,
                    weather: r.weather,
                    teamDescription: r.team_description,
                    activities: r.activities,
                    materials: r.materials,
                    equipment: r.equipment,
                    occurrences: r.occurrences,
                    photos: r.photos,
                    technicianId: r.technician_id,
                    technicianName: r.technician_name,
                    signature: r.signature,
                    status: r.status,
                    endTime: r.end_time,
                    rdoNumber: r.rdo_number,
                    sync_status: 'SYNCED',
                    updated_at: new Date().toISOString(),
                    version: 1
                } as any;
            }));
            await db.rdo.bulkPut(mappedRdos);
        }

        // -- DEEP CLEANUP: Purge all invalid RDOs and clear error logs (Applied to all devices on load) --
        const allLocalRdos = await db.rdo.toArray();
        const invalidRdos = allLocalRdos.filter(r => String(r.local_id).startsWith('rdo-') || String(r.id).startsWith('rdo-'));
        
        if (invalidRdos.length > 0) {
            console.warn(`[SyncEngine] Purging ${invalidRdos.length} invalid RDOs...`);
            await db.rdo.bulkDelete(invalidRdos.map(r => r.local_id));
            
            // Clear past sync error logs specifically for RDOs
            const errorLogs = await db.logs_sincronizacao.where('level').equals('ERROR').toArray();
            const logsToDelete = errorLogs.filter(log => log.message.includes('RDO')).map(log => log.id!);
            if (logsToDelete.length > 0) {
                await db.logs_sincronizacao.bulkDelete(logsToDelete);
            }
            await loadLocalData();
        }

        // Recarregar após sync inicial
        await loadLocalData();
        await syncEngine.triggerSync();
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (user: UserProfile) => {
    console.log("App: handleLogin called for:", user.email);
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchData();
    setActiveTab('assets');
    console.log("App: Authentication state updated.");
  };

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('assets');
    setEditingRecord(null);
    setDynamicTitle(null);
    setHeaderAction(null);
    setSelectedClient(null);
    setSelectedAssetIdForAction(null);
  }, []);

  const handleAddRecord = async (record: MaintenanceRecord) => {
    try {
      // 1. Salvar localmente primeiro (Offline-First)
      const localId = record.local_id || (record as any).local_id || uuidv4();
      const localRecord: LocalMaintenanceRecord = {
        ...record,
        id: record.id?.startsWith('h-') ? localId : (record.id || localId), // Prefer UUID over temporary h- format
        local_id: localId,
        sync_status: 'PENDING',
        status: record.status || 'COMPLETED', // GARANTIR STATUS
        updated_at: new Date().toISOString(),
        version: ((record as any).version || 0) + 1
      };

      await db.ordens_servico.put(localRecord);

      // 2. Atualizar UI imediatamente
      await loadLocalData();

      // 3. Disparar Sincronização em background
      syncEngine.triggerSync();

      if (!editingRecord) {
        setNextOsNumber(prev => Math.max(prev, (record.inspectionNumber || 0) + 1));
      }
    } catch (error) {
      console.error("Erro ao salvar inspeção localmente:", error);
      alert("Erro ao salvar localmente. Seus dados estão protegidos.");
    }

    setEditingRecord(null);
    if (record.status === 'COMPLETED') {
      setPreselectedAssetId(record.assetId);
      setActiveTab('history');
    } else {
      setPreselectedAssetId(null);
      setActiveTab('open-orders');
    }
    setDynamicTitle(null);
    setHeaderAction(null);
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      console.log("App: Deleting record", recordId);
      const record = await db.ordens_servico.get(recordId);
      if (!record) return;

      // 1. REGISTRAR NA FILA DE EXCLUSÃO se tiver ID de servidor
      if (record.server_id) {
        console.log("App: Queueing server deletion for:", record.server_id);
        await db.exclusoes_pendentes.add({
          server_id: record.server_id,
          table_name: 'maintenance_records',
          timestamp: new Date().toISOString()
        });
      }

      // 2. Remover localmente (IndexedDB)
      await db.ordens_servico.delete(recordId);

      // 3. Atualizar UI e disparar sincronização
      setHistory(prev => prev.filter(r => (r as any).local_id !== recordId && r.id !== recordId));
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      alert("Erro ao excluir. O registro será removido da nuvem na próxima sincronização.");
    }
  };

  const handleSaveRdo = async (record: RdoRecord) => {
    try {
      const localId = record.local_id || uuidv4();
      const localRecord = {
        ...record,
        id: localId, // Always use localId (which is a UUID) to avoid format errors on Supabase
        local_id: localId,
        sync_status: 'PENDING',
        updated_at: new Date().toISOString(),
        version: ((record as any).version || 0) + 1
      };

      await db.rdo.put(localRecord as any);
      await loadLocalData();
      syncEngine.triggerSync();
      
      setEditingRdo(null);
      setActiveTab('rdo');
    } catch (error) {
      console.error("Erro ao salvar RDO:", error);
    }
  };

  const handleDeleteRdo = async (recordId: string) => {
    if (!confirm("Tem certeza que deseja excluir este RDO?")) return;
    try {
      const record = await db.rdo.get(recordId);
      if (record?.server_id) {
         await db.exclusoes_pendentes.add({
           server_id: record.server_id,
           table_name: 'rdo',
           timestamp: new Date().toISOString()
         });
      }
      await db.rdo.delete(recordId);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao excluir RDO:", error);
    }
  };

  /**
   * RESET DE NUMERAÇÃO (Solicitado pelo usuário)
   * Local: App.tsx -> handleResetOsSequence
   * Esta função reinicia a contagem das OS a partir de 0001.
   */
  const handleResetOsSequence = async () => {
    if (!confirm("Deseja REINICIAR a contagem de OS a partir de 0001? Isso requer limpar o histórico atual.")) return;

    try {
      // 1. Opcional: Limpar tudo (se o usuário quiser começar do zero absoluto)
      // Se apenas resetar o contador, o maxOs + 1 no loadLocalData vai puxar o antigo.
      // Então precisamos limpar ou o app ou as tabelas.
      await db.ordens_servico.clear();
      setNextOsNumber(1);
      alert("Sequência resetada! Próxima OS será 0001.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAsset = async (asset: CraneAsset) => {
    try {
      console.log("App: Saving asset", asset.id);
      const assetId = asset.id || uuidv4();

      const localAsset: LocalAsset = {
        ...asset,
        id: assetId,
        local_id: assetId,
        sync_status: 'PENDING',
        updated_at: new Date().toISOString(),
        version: 1
      };

      await db.ativos.put(localAsset);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao salvar ativo:", error);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const asset = await db.ativos.get(assetId);
      if (!asset) return;

      if (asset.server_id) {
        await supabase.from('crane_assets').delete().eq('id', asset.server_id);
      }

      await db.ativos.delete(assetId);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao deletar ativo:", error);
    }
  };

  const handleDeleteClient = async (clientName: string) => {
    try {
      const clientAssets = await db.ativos.where('client').equals(clientName).toArray();
      for (const asset of clientAssets) {
        await handleDeleteAsset(asset.local_id);
      }
      await loadLocalData();
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    }
  };

  const handleSaveUser = async (user: UserProfile) => {
    try {
      const userId = user.id || uuidv4();
      const localUser = {
        ...user,
        id: userId,
        local_id: userId,
        sync_status: 'PENDING',
        updated_at: new Date().toISOString(),
        version: 1
      };

      await db.usuarios.put(localUser as any);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = await db.usuarios.get(userId);
      if (user?.server_id) {
        await supabase.from('user_profiles').delete().eq('id', user.server_id);
      }
      await db.usuarios.delete(userId);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
    }
  };

  const handleUpdateUsersList = async (newUsers: UserProfile[]) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      for (const u of newUsers) {
        await handleSaveUser(u);
      }
    } catch (error) {
      console.error("Erro ao atualizar usuários:", error);
    }
  };

  const handleTabChange = (tab: string) => {
    setPreselectedAssetId(null);
    setEditingRecord(null);
    setSelectedClient(null);
    setSelectedAssetIdForAction(null);

    setActiveTab(tab);
    setDynamicTitle(null);
    setHeaderAction(null);
  };

  const renderContent = () => {
    const role = currentUser?.role || 'TECNICO';

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
            <Loader2 size={40} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Configuração Incompleta</h2>
          <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed mb-8 uppercase text-[10px]">
            As chaves de conexão com o Banco de Dados (Supabase) não foram encontradas no ambiente de produção.
          </p>
        </div>
      );
    }

    if (loading && isAuthenticated && assets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="animate-spin text-[#0066CC]" size={48} />
          <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Banco de Dados...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'assets':
        return (
          <AssetManagement
            history={history}
            userRole={role}
            assets={assets}
            onInspect={(id) => { setPreselectedAssetId(id); setActiveTab('preventive'); }}
            onCorrective={(id) => { setPreselectedAssetId(id); setActiveTab('corrective'); }}
            onTitleChange={setDynamicTitle}
            onHeaderActionChange={setHeaderAction}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            selectedAssetIdForAction={selectedAssetIdForAction}
            setSelectedAssetIdForAction={setSelectedAssetIdForAction}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
            onDeleteClient={handleDeleteClient}
          />
        );
      case 'preventive':
        return (
          <ChecklistForm
            onSave={handleAddRecord}
            onCancel={() => {
              if (editingRecord) {
                setActiveTab('history');
                setEditingRecord(null);
              } else {
                setActiveTab('assets');
                setPreselectedAssetId(null);
              }
              setDynamicTitle(null);
              setHeaderAction(null);
            }}
            currentUser={currentUser}
            initialAssetId={preselectedAssetId}
            editingRecord={editingRecord}
            assets={assets}
            nextOsNumber={nextOsNumber}
            onTitleChange={setDynamicTitle}
          />
        );
      case 'corrective':
        return (
          <CorrectiveMaintenanceFlow
            onSave={handleAddRecord}
            currentUser={currentUser}
            assets={assets}
            nextOsNumber={nextOsNumber}
            onTitleChange={setDynamicTitle}
            initialAssetId={preselectedAssetId}
            onCancel={() => {
              setPreselectedAssetId(null);
              setActiveTab('assets');
              setDynamicTitle(null);
            }}
            editingRecord={editingRecord}
          />
        );
      case 'open-orders':
        return (
          <OpenInspections
            onContinue={(record) => {
              setPreselectedAssetId(record.assetId);
              setEditingRecord(record);
              setActiveTab(record.type === 'CORRETIVA' ? 'corrective' : 'preventive');
            }}
            assets={assets}
            onTitleChange={setDynamicTitle}
          />
        );
      case 'history':
        return (
          <PreventiveHistory
            currentUser={currentUser}
            history={history}
            onEdit={(rec) => {
              setEditingRecord(rec);
              setPreselectedAssetId(rec.assetId || (rec as any).asset_id);
              setActiveTab('preventive');
            }}
            onDelete={handleDeleteRecord}
            assets={assets}
            userRole={role}
            onTitleChange={setDynamicTitle}
            initialAssetId={preselectedAssetId}
          />
        );
      case 'users':
        return (
          <UserManagement
            users={users}
            onSave={handleSaveUser}
            onDelete={handleDeleteUser}
            userRole={role}
            onTitleChange={setDynamicTitle}
            onHeaderActionChange={setHeaderAction}
          />
        );
      case 'sync-pendencies':
        return <SyncPendencyScreen 
          onTitleChange={setDynamicTitle} 
          onForceSync={() => syncEngine.triggerSync()}
        />;
      case 'rdo':
        return (
          <RdoHistory 
            mode="COMPLETED"
            records={rdos.filter(r => {
              if (r.status !== 'COMPLETED') return false;
              if (currentUser?.role === 'ADMIN') return true;
              return r.technicianId === currentUser?.id;
            })}
            userRole={currentUser?.role}
            selectedClient={rdoSelectedClient}
            onSelectClient={setRdoSelectedClient}
            onNew={() => { setRdoSourceTab('rdo'); setActiveTab('rdo-form'); }}
            onEdit={(rec) => { setRdoSourceTab('rdo'); setEditingRdo(rec); setActiveTab('rdo-form'); }}
            onDelete={handleDeleteRdo}
            onGeneratePdf={(rec) => { /* handleGeneratePdf is inside RdoHistory */ }}
            onTitleChange={setDynamicTitle}
          />
        );
      case 'rdo-form':
        return (
          <RdoForm 
            currentUser={currentUser}
            editingRdo={editingRdo}
            nextRdoNumber={nextRdoNumber}
            allowFinalize={true}
            onSave={handleSaveRdo}
            onCancel={() => { 
              setEditingRdo(null); 
              setActiveTab('rdo'); 
              setDynamicTitle(null); 
            }}
            onTitleChange={setDynamicTitle}
          />
        );
      case 'documents':
        return (
          <DocumentManagement 
            onTitleChange={setDynamicTitle}
          />
        );
      default:
        return <AssetManagement
          history={history}
          userRole={role}
          assets={assets}
          onInspect={(id) => { setPreselectedAssetId(id); setActiveTab('preventive'); }}
          onCorrective={(id) => { setPreselectedAssetId(id); setActiveTab('corrective'); }}
          onTitleChange={setDynamicTitle}
          onHeaderActionChange={setHeaderAction}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          selectedAssetIdForAction={selectedAssetIdForAction}
          setSelectedAssetIdForAction={setSelectedAssetIdForAction}
          onSaveAsset={handleSaveAsset}
          onDeleteAsset={handleDeleteAsset}
          onDeleteClient={handleDeleteClient}
        />;
    }
  };

  const renderContentWithGuard = () => {
    try {
      console.log("App: renderContent called. Tab:", activeTab);
      return renderContent();
    } catch (error) {
      console.error("App: renderContent CRASHED:", error);
      return (
        <div className="p-8 text-center bg-white rounded-3xl border border-red-100 shadow-sm mt-10">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase">Erro de Renderização</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase mt-2 leading-relaxed">Ocorreu um erro ao carregar esta tela. Verifique o console ou limpe os dados do site no navegador.</p>
        </div>
      );
    }
  };

  if (!isAuthenticated || !currentUser) {
    return <Login onLogin={handleLogin} users={users} onRegisterNewUser={async (u) => { await supabase.from('user_profiles').insert([u]); fetchData(); return true; }} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={handleLogout}
      currentUser={currentUser}
      pageTitle={dynamicTitle}
      headerAction={headerAction}
    >
      {renderContentWithGuard()}
    </Layout>
  );
};

export default App;

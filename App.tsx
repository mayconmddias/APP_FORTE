
import React, { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
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
import GenericModal from './components/GenericModal';
import PdfPreviewModal from './components/PdfPreviewModal';
import { MaintenanceRecord, UserProfile, CraneAsset, RdoRecord } from './types';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';
import { db, LocalAsset, LocalMaintenanceRecord } from './services/offlineDb';
import { syncEngine } from './services/syncEngine';
import { networkManager } from './services/networkManager';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem('forte_session');
      return session ? JSON.parse(session).isAuthenticated : false;
    } catch {
      return false;
    }
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const session = localStorage.getItem('forte_session');
      return session ? JSON.parse(session).user : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('forte_active_tab') || 'assets';
    } catch {
      return 'assets';
    }
  });
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [rdos, setRdos] = useState<RdoRecord[]>([]);
  const [assets, setAssets] = useState<CraneAsset[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOsNumber, setNextOsNumber] = useState<number>(1);

  const [preselectedAssetId, setPreselectedAssetId] = useState<string | null>(() => {
    return localStorage.getItem('forte_preselected_asset_id');
  });
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(() => {
    try {
      const saved = localStorage.getItem('forte_editing_record');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [editingRdo, setEditingRdo] = useState<RdoRecord | null>(() => {
    try {
      const saved = localStorage.getItem('forte_editing_rdo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [nextRdoNumber, setNextRdoNumber] = useState<number>(1);
  const [rdoSelectedClient, setRdoSelectedClient] = useState<string | null>(() => {
    return localStorage.getItem('forte_rdo_selected_client');
  });
  const [rdoSourceTab, setRdoSourceTab] = useState<string | null>(() => {
    return localStorage.getItem('forte_rdo_source_tab');
  });

  const [selectedClient, setSelectedClient] = useState<string | null>(() => {
    return localStorage.getItem('forte_selected_client');
  });
  const [selectedAssetIdForAction, setSelectedAssetIdForAction] = useState<string | null>(() => {
    return localStorage.getItem('forte_selected_asset_id_action');
  });

  const [pdfPreview, setPdfPreview] = useState<{ html: string; title: string } | null>(null);
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null);

  // Effects to synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('forte_session', JSON.stringify({ isAuthenticated, user: currentUser }));
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    localStorage.setItem('forte_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (preselectedAssetId) {
      localStorage.setItem('forte_preselected_asset_id', preselectedAssetId);
    } else {
      localStorage.removeItem('forte_preselected_asset_id');
    }
  }, [preselectedAssetId]);

  useEffect(() => {
    if (editingRecord) {
      localStorage.setItem('forte_editing_record', JSON.stringify(editingRecord));
    } else {
      localStorage.removeItem('forte_editing_record');
    }
  }, [editingRecord]);

  useEffect(() => {
    if (editingRdo) {
      localStorage.setItem('forte_editing_rdo', JSON.stringify(editingRdo));
    } else {
      localStorage.removeItem('forte_editing_rdo');
    }
  }, [editingRdo]);

  useEffect(() => {
    if (rdoSelectedClient) {
      localStorage.setItem('forte_rdo_selected_client', rdoSelectedClient);
    } else {
      localStorage.removeItem('forte_rdo_selected_client');
    }
  }, [rdoSelectedClient]);

  useEffect(() => {
    if (rdoSourceTab) {
      localStorage.setItem('forte_rdo_source_tab', rdoSourceTab);
    } else {
      localStorage.removeItem('forte_rdo_source_tab');
    }
  }, [rdoSourceTab]);

  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem('forte_selected_client', selectedClient);
    } else {
      localStorage.removeItem('forte_selected_client');
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedAssetIdForAction) {
      localStorage.setItem('forte_selected_asset_id_action', selectedAssetIdForAction);
    } else {
      localStorage.removeItem('forte_selected_asset_id_action');
    }
  }, [selectedAssetIdForAction]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', (token) => {
        console.log('FCM Token:', token.value);
        setDevicePushToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Erro no registro do Push:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push recebido em primeiro plano:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Ação no push realizada:', notification);
      });
    }
  }, []);

  useEffect(() => {
    if (devicePushToken && currentUser?.id) {
      console.log('Upserting push token linked to user:', currentUser.id);
      supabase
        .from('push_tokens')
        .upsert(
          { token: devicePushToken, user_id: currentUser.id },
          { onConflict: 'token' }
        )
        .then(({ error }) => {
          if (error) console.error('Erro ao salvar token com usuário:', error);
        });
    }
  }, [currentUser, devicePushToken]);

  // Garante que qualquer scroll residual do teclado virtual do Android seja redefinido ao logar,
  // trazendo a barra superior (Header e Hamburguer) de volta à área visível da WebView do APK.
  useEffect(() => {
    if (isAuthenticated) {
      window.scrollTo(0, 0);
      if (document.body) {
        document.body.scrollTop = 0;
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
    }
  }, [isAuthenticated]);

  // Controle de acesso reativo para abas baseado no perfil do usuário
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    if (currentUser.role === 'TECNICO') {
      const allowedTabs = ['rdo', 'rdo-form', 'sync-pendencies', 'instructions'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('rdo');
      }
    } else if (currentUser.role === 'TECNICO_EQUIPAMENTO') {
      const forbiddenTabs = ['documents', 'users'];
      if (forbiddenTabs.includes(activeTab)) {
        setActiveTab('assets');
      }
    }
  }, [isAuthenticated, currentUser, activeTab]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'INFO' | 'WARNING' | 'DANGER' | 'INPUT';
    onConfirm?: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'INFO'
  });

  const showModal = (title: string, description: string, type: 'INFO' | 'WARNING' | 'DANGER' | 'INPUT' = 'INFO', onConfirm?: (val?: string) => void) => {
    setModalState({ isOpen: true, title, description, type, onConfirm });
  };

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

    // LOGICA DE NUMERAÇÃO OS: Busca o maior número de OS existente e soma 1
    if (localHistory.length > 0) {
      const maxOs = localHistory.reduce((max, rec) => {
        const num = (rec.inspectionNumber || 0);
        return num > max ? num : max;
      }, 0);
      setNextOsNumber(maxOs + 1);
    } else {
      setNextOsNumber(1);
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
        // Obter ids pendentes de exclusão para evitar recriação temporária durante o sync
        const pendingDeletions = await db.exclusoes_pendentes.toArray();
        const deletedServerIds = new Set(pendingDeletions.map(d => d.server_id).filter(Boolean));

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

          // Get local pending/error assets to preserve them
          const localPendingAssets = await db.ativos.where('sync_status').anyOf(['PENDING', 'ERROR']).toArray();
          const pendingAssetServerIds = new Set(localPendingAssets.map(a => a.server_id).filter(Boolean));

          const mappedAssets: LocalAsset[] = [];
          for (const a of assetsData) {
            if (deletedServerIds.has(a.id)) continue; // Evitar recriar ativo deletado

            const existing = await db.ativos.where('server_id').equals(a.id).first();
            const local_id = existing?.local_id || uuidv4();
            assetServerToLocalMap[a.id] = local_id;
            
            if (!pendingAssetServerIds.has(a.id)) {
              mappedAssets.push({
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
              } as LocalAsset);
            }
          }
          if (mappedAssets.length > 0) {
            await db.ativos.bulkPut(mappedAssets);
          }
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

          // Get local pending/error users to preserve them
          const localPendingUsers = await db.usuarios.where('sync_status').anyOf(['PENDING', 'ERROR']).toArray();
          const pendingUserIds = new Set(localPendingUsers.map(u => u.id));

          const mappedUsers: any[] = [];
          for (const u of usersData) {
            userServerToLocalMap[u.id] = u.id;
            
            if (!pendingUserIds.has(u.id)) {
              mappedUsers.push({
                ...u,
                id: u.id, // logical ID (FE-001)
                local_id: u.id,
                server_id: u.id,
                sync_status: 'SYNCED' as const,
                updated_at: new Date().toISOString(),
                version: 1
              });
            }
          }
          if (mappedUsers.length > 0) {
            await db.usuarios.bulkPut(mappedUsers as any);
          }
        }

        // -- REPAIR: Deduplicate and cleanup statuses (REGULAR -> APTO) --
        const repairServerData = async () => {
          try {
            // 1. Deduplicate Documents
            const { data: allDocs } = await supabase.from('documentos').select('id, funcionario_id, tipo_documento, created_at');
            if (allDocs) {
              const groups: Record<string, any[]> = {};
              allDocs.forEach(d => {
                const key = `${d.funcionario_id}-${d.tipo_documento}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(d);
              });

              const toDelete: string[] = [];
              Object.values(groups).forEach(group => {
                if (group.length > 1) {
                  group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  group.slice(1).forEach(dup => toDelete.push(dup.id));
                }
              });

              if (toDelete.length > 0) {
                await supabase.from('documentos').delete().in('id', toDelete);
              }
            }

            // 2. Migrate REGULAR to APTO
            await supabase.from('documentos').update({ status_permanente: 'APTO' }).eq('status_permanente', 'REGULAR');
            await supabase.from('funcionario_integracoes').update({ status: 'APTO' }).eq('status', 'REGULAR');
            
          } catch (err) {
            console.error('Erro no reparo de dados:', err);
          }
        };

        await repairServerData();

        // Clear local cache for docs/integrations to ensure 100% online accuracy
        await db.documentos.clear();
        await db.funcionario_integracoes.clear();

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
          }
          // Get local pending/error history to preserve them
          const localPendingHistory = await db.ordens_servico.where('sync_status').anyOf(['PENDING', 'ERROR']).toArray();
          const pendingHistoryServerIds = new Set(localPendingHistory.map(h => h.server_id).filter(Boolean));

          const mappedHistory: LocalMaintenanceRecord[] = [];
          for (const h of historyData) {
            if (deletedServerIds.has(h.id)) continue; // Evitar recriar registro deletado

            const existing = await db.ordens_servico.where('server_id').equals(h.id).first();
            const local_id = existing?.local_id || uuidv4();

            if (!pendingHistoryServerIds.has(h.id)) {
              // CRITICAL FIX: Map server IDs to local IDs
              const localAssetId = assetServerToLocalMap[h.asset_id] || h.asset_id;
              const localTechnicianId = userServerToLocalMap[h.technician_id] || h.technician_id;

              mappedHistory.push({
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
                clientSignature: h.client_signature || h.clientSignature,
                signature: h.signature,
                status: h.status,
                sync_status: 'SYNCED',
                updated_at: new Date().toISOString(),
                version: 1
              } as LocalMaintenanceRecord);
            }
          }
          if (mappedHistory.length > 0) {
            await db.ordens_servico.bulkPut(mappedHistory);
          }
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

            // Get local pending/error RDOs to preserve them
            const localPendingRdos = await db.rdo.where('sync_status').anyOf(['PENDING', 'ERROR']).toArray();
            const pendingRdoServerIds = new Set(localPendingRdos.map(r => r.server_id).filter(Boolean));

            const mappedRdos: any[] = [];
            for (const r of rdoData) {
                if (deletedServerIds.has(r.id)) continue; // Evitar recriar RDO deletado
                
                const existing = await db.rdo.where('server_id').equals(r.id).first();
                const local_id = existing?.local_id || uuidv4();

                if (!pendingRdoServerIds.has(r.id)) {
                    mappedRdos.push({
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
                    } as any);
                }
            }
            if (mappedRdos.length > 0) {
                await db.rdo.bulkPut(mappedRdos);
            }
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

  const [debouncedTrigger, setDebouncedTrigger] = useState(0);

  // Debounced effect to fetch data to avoid slamming the Supabase DB
  useEffect(() => {
    if (debouncedTrigger === 0) return;
    const timer = setTimeout(() => {
      console.log("Realtime: Triggering debounced fetchData...");
      fetchData();
    }, 2000);
    return () => clearTimeout(timer);
  }, [debouncedTrigger]);

  useEffect(() => {
    // Initial fetch on mount
    fetchData();

    // Background polling (every 60 seconds) as a fallback in case websocket breaks
    const pollingInterval = setInterval(() => {
      console.log("Polling: Triggering background sync check...");
      fetchData();
    }, 60000);

    // Supabase Realtime Subscription
    console.log("Realtime: Setting up Supabase channels subscription...");
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log("Realtime event received:", payload);
          setDebouncedTrigger(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime channel status: ${status}`);
      });

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogin = (user: UserProfile) => {
    console.log("App: handleLogin called for:", user.email);
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchData();
    setActiveTab('assets');
    
    // Força o scroll para o topo imediatamente no momento do login
    window.scrollTo(0, 0);
    if (document.body) {
      document.body.scrollTop = 0;
    }
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    
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

      // Deduplicação extra (Correção 4) - Evitar múltiplos toques salvando duplicatas
      if (record.inspectionNumber && record.assetId && record.date) {
        const existingForAsset = await db.ordens_servico
          .where('assetId').equals(record.assetId)
          .toArray();
        
        const isDuplicate = existingForAsset.some(r => 
          r.inspectionNumber === record.inspectionNumber && 
          r.date === record.date &&
          r.local_id !== localId
        );

        if (isDuplicate) {
          console.warn('App: Duplicata detectada. Ignorando salvamento extra.', record);
          // Omitir o put e resetar a UI
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
          return;
        }
      }

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
      showModal("Ops!", "Erro ao salvar localmente. Seus dados estão protegidos.", "WARNING");
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
      showModal("Atenção", "Erro ao excluir. O registro será removido da nuvem na próxima sincronização.", "WARNING");
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
    showModal(
        "Excluir RD?",
        "Tem certeza que deseja excluir este RD permanentemente?",
        "DANGER",
        async () => {
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
                setModalState(prev => ({ ...prev, isOpen: false }));
            } catch (error) {
                console.error("Erro ao excluir RDO:", error);
            }
        }
    );
  };

  /**
   * RESET DE NUMERAÇÃO (Solicitado pelo usuário)
   * Local: App.tsx -> handleResetOsSequence
   * Esta função reinicia a contagem das OS a partir de 0001.
   */
  const handleResetOsSequence = async () => {
    showModal(
        "Resetar Sequência?",
        "Deseja REINICIAR a contagem de OS a partir de 0001? Isso requer limpar o histórico atual.",
        "DANGER",
        async () => {
            try {
                await db.ordens_servico.clear();
                setNextOsNumber(1);
                setModalState(prev => ({ ...prev, isOpen: false }));
                showModal("Sucesso", "Sequência resetada! Próxima OS será 0001.", "INFO");
            } catch (e) {
                console.error(e);
            }
        }
    );
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
      // Use logical ID (FE-XXX) as the primary key
      const userId = user.id; 
      const localUser = {
        ...user,
        local_id: userId,
        sync_status: 'PENDING',
        updated_at: new Date().toISOString(),
        version: 1
      };

      await db.usuarios.put(localUser as any);
      await loadLocalData();
      syncEngine.triggerSync();
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const user = await db.usuarios.get(userId);
      if (user?.server_id) {
        await supabase.from('user_profiles').delete().eq('id', user.server_id);
      }
      await db.usuarios.delete(userId);
      
      // Clean up associated docs and integrations
      const userDocs = await db.documentos.where('funcionario_id').equals(userId).toArray();
      const userInts = await db.funcionario_integracoes.where('funcionario_id').equals(userId).toArray();
      
      if (userDocs.length > 0) await db.documentos.bulkDelete(userDocs.map(d => d.local_id));
      if (userInts.length > 0) await db.funcionario_integracoes.bulkDelete(userInts.map(i => i.local_id));

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
    setRdoSelectedClient(null);
    setEditingRdo(null);

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
                if (editingRecord.status === 'OPEN') {
                  setActiveTab('open-orders');
                } else {
                  setActiveTab('history');
                }
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
              if (editingRecord) {
                if (editingRecord.status === 'OPEN') {
                  setActiveTab('open-orders');
                } else {
                  setActiveTab('assets');
                }
                setEditingRecord(null);
              } else {
                setPreselectedAssetId(null);
                setActiveTab('assets');
              }
              setDynamicTitle(null);
              setHeaderAction?.(null);
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
            onPreviewPdf={Capacitor.isNativePlatform() ? (html, title) => setPdfPreview({ html, title }) : undefined}
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
            userRole={role}
            currentUser={currentUser}
            selectedClient={rdoSelectedClient}
            onSelectClient={setRdoSelectedClient}
            onNew={() => { setRdoSourceTab('rdo'); setActiveTab('rdo-form'); }}
            onEdit={(rec) => { setRdoSourceTab('rdo'); setEditingRdo(rec); setActiveTab('rdo-form'); }}
            onDelete={handleDeleteRdo}
            onGeneratePdf={(rec) => { /* handleGeneratePdf is inside RdoHistory */ }}
            onTitleChange={setDynamicTitle}
            onPreviewPdf={Capacitor.isNativePlatform() ? (html, title) => setPdfPreview({ html, title }) : undefined}
          />
        );
      case 'rdo-form':
        return (
          <RdoForm 
            currentUser={currentUser}
            editingRdo={editingRdo}
            nextRdoNumber={nextRdoNumber}
            allowFinalize={true}
            rdos={rdos}
            assets={assets}
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
        if (role !== 'ADMIN') {
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
        }
        return (
          <DocumentManagement 
            onTitleChange={setDynamicTitle}
            onHeaderActionChange={setHeaderAction}
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

      <GenericModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />

      <PdfPreviewModal
        isOpen={pdfPreview !== null}
        onClose={() => setPdfPreview(null)}
        html={pdfPreview?.html || ''}
        title={pdfPreview?.title || ''}
      />
    </Layout>
  );
};

export default App;


import React, { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import AssetManagement from './components/AssetManagement';
import ChecklistForm from './components/ChecklistForm';
import CorrectiveMaintenanceFlow from './components/CorrectiveMaintenanceFlow';
import PreventiveHistory from './components/PreventiveHistory';
import UserManagement from './components/UserManagement';
import OpenInspections from './components/OpenInspections';
import { MaintenanceRecord, UserProfile, CraneAsset } from './types';
import { supabase } from './supabaseClient';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null);
  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<CraneAsset[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOsNumber, setNextOsNumber] = useState<number>(1);

  const [preselectedAssetId, setPreselectedAssetId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAssetIdForAction, setSelectedAssetIdForAction] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: assetsData } = await supabase.from('crane_assets').select('*');
      if (assetsData) {
        const mappedAssets: CraneAsset[] = assetsData.map(a => ({
          id: a.id,
          client: a.client,
          name: a.name,
          serialNumber: a.serial_number || a.serialNumber,
          manufacturer: a.manufacturer,
          capacity: a.capacity,
          span: a.span,
          location: a.location,
          commissioningDate: a.commissioning_date || a.commissioningDate,
          status: a.status,
          equipmentType: a.equipment_type || a.equipmentType
        }));
        setAssets(mappedAssets);
      }

      const { data: historyData } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('date', { ascending: false });

      if (historyData) {
        // Filter out drafts client-side
        const validHistory = historyData.filter(h =>
          h.signature !== 'DRAFT'
        );

        const mappedHistory: MaintenanceRecord[] = validHistory.map(h => ({
          id: h.id,
          inspectionNumber: h.inspection_number || h.inspectionNumber,
          assetId: h.asset_id || h.assetId,
          type: h.type,
          checklistType: h.checklist_type || h.checklistType,
          frequency: h.frequency,
          date: h.date,
          technician: h.technician,
          technicianId: h.technician_id || h.technicianId,
          downtimeHours: h.downtime_hours || h.downtimeHours,
          criticality: h.criticality,
          checklists: h.checklists,
          clientRepresentative: h.client_representative || h.clientRepresentative,
          signature: h.signature
        }));
        setHistory(mappedHistory);

        const maxOs = historyData.reduce((max, rec) => {
          const num = (rec.inspection_number || rec.inspectionNumber || 0);
          return num > max ? num : max;
        }, 0);
        setNextOsNumber(maxOs + 1);
      }

      const { data: usersData } = await supabase.from('user_profiles').select('*');
      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error("Erro ao sincronizar com Supabase:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchData();
    setActiveTab('assets');
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
    const dbRecord = {
      id: record.id,
      inspection_number: record.inspectionNumber,
      asset_id: record.assetId,
      type: record.type,
      checklist_type: record.checklistType,
      frequency: record.frequency,
      date: record.date,
      technician: record.technician,
      technician_id: record.technicianId,
      downtime_hours: record.downtimeHours,
      criticality: record.criticality || 'MÉDIA',
      checklists: record.checklists,
      client_representative: record.clientRepresentative,
      signature: record.signature
    };

    try {
      const { error } = await supabase.from('maintenance_records').upsert(dbRecord);
      if (error) throw error;

      // Update local state instead of full fetchData() for better performance
      setHistory(prev => {
        const index = prev.findIndex(h => h.id === record.id);
        if (index >= 0) {
          const newHistory = [...prev];
          newHistory[index] = record;
          return newHistory;
        }
        return [record, ...prev];
      });

      // Update next OS number if it's a new record
      if (!editingRecord) {
        setNextOsNumber(prev => Math.max(prev, (record.inspectionNumber || 0) + 1));
      }
    } catch (error) {
      console.error("Erro ao salvar inspeção:", error);
      alert("Erro ao salvar Ordem de Serviço.");
    }

    setPreselectedAssetId(null);
    setEditingRecord(null);
    setActiveTab('history');
    setDynamicTitle(null);
    setHeaderAction(null);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', recordId);
      if (error) throw error;
      setHistory(prev => prev.filter(h => h.id !== recordId));
    } catch (error) {
      console.error("Erro ao excluir no Supabase:", error);
    }
  };

  const handleUpdateUsersList = async (newUsers: UserProfile[]) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const { error } = await supabase.from('user_profiles').upsert(newUsers);
      if (error) throw error;
      setUsers(newUsers);
    } catch (error) {
      console.error("Erro ao atualizar usuários:", error);
    }
  };

  const handleTabChange = (tab: string) => {
    // Ao navegar pelo menu lateral, limpamos as seleções contextuais para garantir
    // que o usuário chegue na tela principal da aba escolhida
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

    // Verificação de Segurança: Variáveis de Ambiente
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left w-full max-w-md space-y-4">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Como corrigir na Vercel:</p>
            <ol className="text-[11px] text-slate-300 space-y-2 list-decimal list-inside font-bold">
              <li>Acesse o painel da <span className="text-white">Vercel</span></li>
              <li>Vá em <span className="text-white">Settings &gt; Environment Variables</span></li>
              <li>Adicione <span className="text-emerald-400">VITE_SUPABASE_URL</span></li>
              <li>Adicione <span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span></li>
              <li>Faça um novo <span className="text-white">Redeploy</span></li>
            </ol>
          </div>
        </div>
      );
    }

    if (loading && isAuthenticated) {
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
            setAssets={setAssets}
            onInspect={(id) => { setPreselectedAssetId(id); setActiveTab('preventive'); }}
            onCorrective={(id) => { setPreselectedAssetId(id); setActiveTab('corrective'); }}
            onTitleChange={setDynamicTitle}
            onHeaderActionChange={setHeaderAction}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            selectedAssetIdForAction={selectedAssetIdForAction}
            setSelectedAssetIdForAction={setSelectedAssetIdForAction}
          />
        );
      case 'preventive':
        return (
          <ChecklistForm
            onSave={handleAddRecord}
            onCancel={() => {
              if (editingRecord) {
                // Se estava editando, volta para o histórico mantendo o ativo selecionado
                setActiveTab('history');
                setEditingRecord(null);
                // preselectedAssetId já deve estar setado pelo onEdit
              } else {
                // Se era nova inspeção, volta para lista de ativos
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
          />
        );
      case 'open-orders':
        return <OpenInspections onContinue={(record) => { setPreselectedAssetId(record.assetId); setEditingRecord(record); setActiveTab('preventive'); }} assets={assets} onTitleChange={setDynamicTitle} />;
      case 'history':
        return (
          <PreventiveHistory
            currentUser={currentUser}
            history={history}
            onEdit={(rec) => {
              setEditingRecord(rec);
              setPreselectedAssetId(rec.assetId || (rec as any).asset_id); // Garante que sabemos de qual ativo viemos
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
            setUsers={handleUpdateUsersList}
            userRole={role}
            onTitleChange={setDynamicTitle}
            onHeaderActionChange={setHeaderAction}
          />
        );
      default:
        return <AssetManagement history={history} userRole={role} assets={assets} setAssets={setAssets} onInspect={(id) => { setPreselectedAssetId(id); setActiveTab('preventive'); }} onCorrective={(id) => { setPreselectedAssetId(id); setActiveTab('corrective'); }} onTitleChange={setDynamicTitle} onHeaderActionChange={setHeaderAction} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} users={users} onRegisterNewUser={async (u) => { await supabase.from('user_profiles').insert([u]); fetchData(); return true; }} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={handleLogout}
      currentUser={currentUser!}
      pageTitle={dynamicTitle}
      headerAction={headerAction}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;


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

      const { data: historyData } = await supabase.from('maintenance_records').select('*').order('date', { ascending: false });
      if (historyData) {
        const mappedHistory: MaintenanceRecord[] = historyData.map(h => ({
          id: h.id,
          inspectionNumber: h.inspection_number || h.inspectionNumber,
          assetId: h.asset_id || h.assetId,
          type: h.type,
          checklistType: h.checklist_type || h.checklistType,
          frequency: h.frequency,
          date: h.date,
          technician: h.technician,
          technician_id: h.technician_id || h.technicianId,
          downtime_hours: h.downtime_hours || h.downtimeHours,
          criticality: h.criticality,
          checklists: h.checklists,
          client_representative: h.client_representative || h.clientRepresentative,
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
  }, []);

  const handleCloseFlow = useCallback(() => {
    // Se estávamos editando um registro do histórico, voltamos para a aba histórico
    const targetTab = editingRecord ? 'history' : 'assets';
    setPreselectedAssetId(null);
    setEditingRecord(null);
    setActiveTab(targetTab);
    setDynamicTitle(null);
    setHeaderAction(null);
  }, [editingRecord]);

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
      await fetchData();
    } catch (error) {
      console.error("Erro ao salvar inspeção:", error);
      alert("Erro ao salvar Ordem de Serviço.");
    }

    handleCloseFlow();
    setActiveTab('history');
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (currentUser?.role !== 'ADMIN') return;
    try {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', recordId);
      if (error) throw error;
      await fetchData();
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
    if (tab === 'preventive' || tab === 'corrective') {
      setPreselectedAssetId(null);
      setEditingRecord(null);
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
    setDynamicTitle(null);
    setHeaderAction(null);
  };

  const renderContent = () => {
    const role = currentUser?.role || 'TECNICO';

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
          />
        );
      case 'preventive':
        return (
          <ChecklistForm
            onSave={handleAddRecord}
            onCancel={handleCloseFlow}
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
            onCancel={handleCloseFlow}
            currentUser={currentUser}
            assets={assets}
            nextOsNumber={nextOsNumber}
            onTitleChange={setDynamicTitle}
            initialAssetId={preselectedAssetId}
          />
        );
      case 'open-orders':
        return <OpenInspections onContinue={(id) => { setPreselectedAssetId(id); setActiveTab('preventive'); }} assets={assets} onTitleChange={setDynamicTitle} />;
      case 'history':
        return (
          <PreventiveHistory
            history={history}
            onEdit={(rec) => { setEditingRecord(rec); setActiveTab('preventive'); }}
            onDelete={handleDeleteRecord}
            assets={assets}
            userRole={role}
            onTitleChange={setDynamicTitle}
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

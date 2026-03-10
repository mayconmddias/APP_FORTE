import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/offlineDb';

const SyncStatus: React.FC = () => {
    const network = useOnlineStatus();

    const pendingCount = useLiveQuery(
        async () => {
            const assets = await db.ativos.where('sync_status').equals('PENDING').count();
            const records = await db.ordens_servico.where('sync_status').equals('PENDING').count();
            return assets + records;
        },
        []
    );

    const errorCount = useLiveQuery(
        async () => {
            const assets = await db.ativos.where('sync_status').equals('ERROR').count();
            const records = await db.ordens_servico.where('sync_status').equals('ERROR').count();
            return assets + records;
        },
        []
    );

    if (!network.online) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 shadow-sm animate-pulse">
                <CloudOff size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Offline</span>
            </div>
        );
    }

    if (errorCount && errorCount > 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">{errorCount} Erros</span>
            </div>
        );
    }

    if (pendingCount && pendingCount > 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[#0066CC] rounded-full border border-blue-100 shadow-sm">
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-wider">Sincronizando ({pendingCount})</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm">
            <Cloud size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Sincronizado</span>
        </div>
    );
};

export default SyncStatus;

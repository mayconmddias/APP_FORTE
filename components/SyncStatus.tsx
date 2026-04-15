import React from 'react';
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 animate-pulse">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px' }}>cloud_off</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
            </div>
        );
    }

    if (network.quality === 'none') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                <span className="material-symbols-outlined select-none notranslate animate-pulse" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Instável</span>
            </div>
        );
    }

    if (errorCount && errorCount > 0) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>error</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{errorCount} Erros</span>
            </div>
        );
    }

    if (pendingCount && pendingCount > 0) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#004a88] rounded-full border border-blue-100">
                <span className="material-symbols-outlined select-none notranslate animate-spin" style={{ fontSize: '14px' }}>sync</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Sinc. ({pendingCount})</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Sincronizado</span>
        </div>
    );
};

export default SyncStatus;

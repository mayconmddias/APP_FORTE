import React from 'react';
import { db } from '../services/offlineDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { syncEngine } from '../services/syncEngine';

interface SyncPendencyScreenProps {
    onTitleChange: (title: string | null) => void;
    onForceSync?: () => void;
}

const SyncPendencyScreen: React.FC<SyncPendencyScreenProps> = ({ onTitleChange, onForceSync }) => {
    React.useEffect(() => {
        onTitleChange('PENDÊNCIAS DE SINCRONIZAÇÃO');
        return () => onTitleChange(null);
    }, [onTitleChange]);

    const pendingAssets = useLiveQuery(() => db.ativos.where('sync_status').notEqual('SYNCED').toArray());
    const pendingRecords = useLiveQuery(() => db.ordens_servico.where('sync_status').notEqual('SYNCED').toArray());

    const handleForceSync = async () => {
        // Reset ERROR items to PENDING so syncEngine processes them again
        await db.ordens_servico.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });
        await db.ativos.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });
        await db.usuarios.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });

        // Reset the engine backoff so it retries immediately
        syncEngine.forceResetBackoff();
        syncEngine.triggerSync();
    };

    const handleDeleteLocal = async (table: 'ativos' | 'ordens_servico', id: string) => {
        if (confirm('Tem certeza que deseja excluir este registro local?')) {
            if (table === 'ativos') await db.ativos.delete(id);
            else await db.ordens_servico.delete(id);
        }
    };

    const total = (pendingAssets?.length || 0) + (pendingRecords?.length || 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Status da Fila</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {total === 0 ? 'Todos os dados estão seguros na nuvem' : `${total} registros aguardando conexão`}
                        </p>
                    </div>
                    <button
                        onClick={handleForceSync}
                        disabled={total === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0066CC] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-200"
                    >
                        <RefreshCw size={16} />
                        Forçar Sincronização
                    </button>
                </div>

                {total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Sincronização em dia</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingAssets?.map(asset => (
                            <div key={asset.local_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${asset.sync_status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {asset.sync_status === 'ERROR' ? <AlertCircle size={20} /> : <RefreshCw size={20} className="animate-spin-slow" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase">{asset.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Ativo • {asset.client}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteLocal('ativos', asset.local_id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        {pendingRecords?.map(record => (
                            <div key={record.local_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${record.sync_status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {record.sync_status === 'ERROR' ? <AlertCircle size={20} /> : <RefreshCw size={20} className="animate-spin-slow" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase">OS #{record.inspectionNumber}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{record.type} • {record.date}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteLocal('ordens_servico', record.local_id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
                <div className="flex gap-4">
                    <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Dica de Campo</h4>
                        <p className="text-xs text-amber-800 font-medium leading-relaxed mt-1 uppercase tracking-tight">
                            Se você estiver em um local sem sinal, não se preocupe. O app salva tudo automaticamente.
                            Ao retornar ao escritório ou local com Wi-Fi, abra esta tela e clique em "Forçar Sincronização" se necessário.
                        </p>
                    </div>
                </div>
            </div>

            <SyncLogSection />
        </div>
    );
};

const SyncLogSection: React.FC = () => {
    const logs = useLiveQuery(() => db.logs_sincronizacao.orderBy('id').reverse().limit(20).toArray());

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-6 pb-10">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4">Log de Atividades</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {logs?.map(log => (
                    <div key={log.id} className="flex gap-3 text-[10px] items-start border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-mono flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`font-black flex-shrink-0 w-16 ${log.level === 'SUCCESS' ? 'text-emerald-600' :
                            log.level === 'ERROR' ? 'text-red-600' :
                                log.level === 'WARNING' ? 'text-amber-600' : 'text-blue-600'
                            }`}>[{log.level}]</span>
                        <div className="flex-1">
                            <span className="text-slate-600 font-bold uppercase block">{log.message}</span>
                            {log.details && (
                                <span className="text-slate-400 font-medium block mt-1 normal-case leading-relaxed">
                                    {typeof log.details === 'object'
                                        ? (log.details.message || JSON.stringify(log.details))
                                        : String(log.details)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {(!logs || logs.length === 0) && (
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Nenhuma atividade registrada ainda.</p>
                )}
            </div>
        </div>
    );
};

export default SyncPendencyScreen;

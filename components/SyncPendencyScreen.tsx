import React, { useState } from 'react';
import GenericModal from './GenericModal';
import { db } from '../services/offlineDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncEngine } from '../services/syncEngine';

interface SyncPendencyScreenProps {
    onTitleChange: (title: string | null) => void;
    onForceSync?: () => void;
}

const SyncPendencyScreen: React.FC<SyncPendencyScreenProps> = ({ onTitleChange, onForceSync }) => {
    React.useEffect(() => {
        onTitleChange('SINCRONIZAÇÃO');
        return () => onTitleChange(null);
    }, [onTitleChange]);

    const pendingAssets = useLiveQuery(() => db.ativos.where('sync_status').notEqual('SYNCED').toArray());
    const pendingRecords = useLiveQuery(() => db.ordens_servico.where('sync_status').notEqual('SYNCED').toArray());

    const handleForceSync = async () => {
        await db.ordens_servico.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });
        await db.ativos.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });
        await db.usuarios.where('sync_status').equals('ERROR').modify({ sync_status: 'PENDING' });
        syncEngine.forceResetBackoff();
        syncEngine.triggerSync();
    };

    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmDesc, setConfirmDesc] = useState('');
    const [onConfirmAction, setOnConfirmAction] = useState<() => void>(() => {});

    const handleDeleteLocal = async (table: 'ativos' | 'ordens_servico', id: string) => {
        setConfirmTitle('Excluir Registro Local?');
        setConfirmDesc('Isso removerá os dados que ainda não foram sincronizados permanentemente.');
        setOnConfirmAction(() => async () => {
            if (table === 'ativos') await db.ativos.delete(id);
            else await db.ordens_servico.delete(id);
            setShowConfirm(false);
        });
        setShowConfirm(true);
    };

    const total = (pendingAssets?.length || 0) + (pendingRecords?.length || 0);

    return (
        <div className="space-y-4 max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">

            {/* Card de Status da Fila */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
                <div className="flex justify-center mb-6">
                    <button
                        onClick={handleForceSync}
                        disabled={total === 0}
                        className="flex items-center gap-2 px-8 py-4 bg-[#004a88] text-white rounded-full font-headline font-bold text-[12px] uppercase tracking-widest shadow-md shadow-blue-900/20 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>sync</span>
                        Forçar Sinc.
                    </button>
                </div>

                {total === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-500 select-none notranslate" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                        </div>
                        <p className="font-headline font-bold text-sm text-slate-400 uppercase">Sincronização em dia</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingAssets?.map(asset => (
                            <div key={asset.local_id} className="flex items-center justify-between p-4 bg-[#eef2f7] rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${asset.sync_status === 'ERROR' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-[#004a88]'}`}>
                                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                            {asset.sync_status === 'ERROR' ? 'error' : 'sync'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-headline font-bold text-sm text-blue-950 uppercase">{asset.name}</h4>
                                        <p className="font-body text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ativo · {asset.client}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteLocal('ativos', asset.local_id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>delete</span>
                                </button>
                            </div>
                        ))}

                        {pendingRecords?.map(record => (
                            <div key={record.local_id} className="flex items-center justify-between p-4 bg-[#eef2f7] rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${record.sync_status === 'ERROR' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-[#004a88]'}`}>
                                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                                            {record.sync_status === 'ERROR' ? 'error' : 'sync'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-headline font-bold text-sm text-blue-950 uppercase">OS #{record.inspectionNumber}</h4>
                                        <p className="font-body text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            {record.type} · {record.date?.split('-').reverse().join('/')}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteLocal('ordens_servico', record.local_id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                                    <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '18px' }}>delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Card Dica */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-amber-600 select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                </div>
                <div>
                    <h4 className="font-headline font-bold text-sm text-amber-900 uppercase">Dica de Campo</h4>
                    <p className="font-body text-xs text-amber-800 font-medium leading-relaxed mt-1">
                        Se você estiver em um local sem sinal, não se preocupe. O app salva tudo automaticamente.
                        Ao retornar ao escritório ou local com Wi-Fi, abra esta tela e clique em "Forçar Sinc." se necessário.
                    </p>
                </div>
            </div>

            {/* Notificações Desktop */}
            <DesktopPushSection />

            {/* Log de Atividades */}
            <SyncLogSection />

            <GenericModal 
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title={confirmTitle}
                description={confirmDesc}
                type="DANGER"
                onConfirm={onConfirmAction}
            />
        </div>
    );
};

const SyncLogSection: React.FC = () => {
    const logs = useLiveQuery(() => db.logs_sincronizacao.orderBy('id').reverse().limit(20).toArray());

    const levelConfig: Record<string, { color: string; icon: string }> = {
        SUCCESS: { color: 'text-emerald-600', icon: 'check_circle' },
        ERROR: { color: 'text-red-500', icon: 'error' },
        WARNING: { color: 'text-amber-500', icon: 'warning' },
        INFO: { color: 'text-[#004a88]', icon: 'info' },
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h3 className="font-headline font-bold text-base text-blue-950 uppercase tracking-widest mb-4">Log de Atividades</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {logs?.map(log => {
                    const cfg = levelConfig[log.level] || levelConfig.INFO;
                    return (
                        <div key={log.id} className="flex items-start gap-3 border-b border-slate-50 pb-2 last:border-0">
                            <span className="material-symbols-outlined select-none notranslate flex-shrink-0 mt-0.5" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" + `; color: inherit` }}>
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-body text-[9px] font-bold ${cfg.color} uppercase tracking-widest`}>[{log.level}]</span>
                                    <span className="font-body text-[9px] text-slate-400 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <span className="font-body text-[10px] font-bold text-slate-600 uppercase block">{log.message}</span>
                                {log.details && (
                                    <span className="font-body text-[9px] text-slate-400 leading-relaxed mt-0.5 block">
                                        {typeof log.details === 'object'
                                            ? (log.details.message || JSON.stringify(log.details))
                                            : String(log.details)}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                {(!logs || logs.length === 0) && (
                    <p className="font-body text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-center">Nenhuma atividade registrada ainda.</p>
                )}
            </div>
        </div>
    );
};

const DesktopPushSection: React.FC = () => {
    const [perm, setPerm] = useState<string>(() => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');

    const handleEnablePush = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPerm(result);
            if (result === 'granted') {
                window.location.reload();
            }
        }
    };

    const handleTestNotification = () => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const title = "Forte Engenharia - Teste Direct";
            const options = {
                body: "Se esta mensagem apareceu no seu Windows 11, as Notificações Desktop estão 100% ativas!",
                icon: "https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_desenho_forte.png",
                badge: "https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_desenho_forte.png"
            };

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, options);
                }).catch(() => {
                    new Notification(title, options);
                });
            } else {
                new Notification(title, options);
            }
        } else {
            alert("As notificações precisam estar ativadas no seu navegador para realizar este teste.");
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004a88] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                    </div>
                    <div>
                        <h3 className="font-headline font-bold text-base text-blue-950 uppercase">Notificações no Desktop</h3>
                        <p className="font-body text-xs text-slate-400 font-medium">Recepção de avisos do sistema em segundo plano no Windows</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {perm === 'granted' && (
                        <button
                            onClick={handleTestNotification}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-headline font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
                        >
                            <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '14px' }}>notifications</span> Testar Notificação
                        </button>
                    )}
                    {perm === 'granted' ? (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full font-headline font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ativas no Browser
                        </span>
                    ) : perm === 'denied' ? (
                        <span className="bg-red-50 text-red-500 border border-red-100 px-3 py-1 rounded-full font-headline font-bold text-[10px] uppercase tracking-wider">
                            Bloqueadas no Navegador
                        </span>
                    ) : (
                        <button
                            onClick={handleEnablePush}
                            className="px-4 py-2 bg-[#004a88] text-white rounded-full font-headline font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-primary transition-all"
                        >
                            Ativar Notificações
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SyncPendencyScreen;

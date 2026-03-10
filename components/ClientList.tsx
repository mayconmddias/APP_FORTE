import React from 'react';
import { Factory, ChevronRight } from 'lucide-react';

interface Client {
    name: string;
    count: number;
}

interface ClientListProps {
    clients: Client[];
    searchTerm: string;
    onSelectClient: (name: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, searchTerm, onSelectClient }) => {
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="grid gap-3">
            {filteredClients.map((client) => (
                <button
                    key={client.name}
                    onClick={() => onSelectClient(client.name)}
                    className="group flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[24px] hover:border-[#0066CC] hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#0066CC] group-hover:text-white transition-all shadow-inner border border-slate-100">
                            <Factory size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 group-hover:text-[#0055AA] transition-colors tracking-tight uppercase">{client.name}</h3>
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">{client.count} ATIVOS CADASTRADOS</p>
                        </div>
                    </div>
                    <ChevronRight size={22} className="text-slate-200 group-hover:text-[#0066CC] transition-all" />
                </button>
            ))}
        </div>
    );
};

export default ClientList;

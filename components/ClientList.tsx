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
        <div className="flex flex-col gap-4">
            {filteredClients.map((client) => (
                <div
                    key={client.name}
                    onClick={() => onSelectClient(client.name)}
                    className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between border border-slate-50"
                >
                    <div className="flex items-center gap-5">
                        <div className="rounded-xl flex items-center justify-center bg-[#004a88] w-12 h-12 transition-all group-hover:bg-primary shadow-sm">
                            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                        </div>
                        <div>
                            <h3 className="font-headline font-bold text-lg tracking-tight text-blue-950 uppercase">{client.name}</h3>
                            <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-[#004a88] mt-1 inline-block">
                                {client.count} {client.count === 1 ? 'ATIVO CADASTRADO' : 'ATIVOS CADASTRADOS'}
                            </p>
                        </div>
                    </div>
                    <div className="text-slate-300 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">chevron_right</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClientList;

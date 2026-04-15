
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { MaintenanceRecord } from '../types';

const mockChartData = [
  { month: 'Jan', mtbf: 420, mttr: 12 },
  { month: 'Fev', mtbf: 380, mttr: 15 },
  { month: 'Mar', mtbf: 450, mttr: 10 },
  { month: 'Abr', mtbf: 500, mttr: 8 },
  { month: 'Mai', mtbf: 480, mttr: 9 },
  { month: 'Jun', mtbf: 550, mttr: 6 },
];

interface DashboardProps {
  history: MaintenanceRecord[];
}

const StatCard: React.FC<{
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}> = ({ icon, iconBg, iconColor, label, value, badge, badgeColor }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex flex-col gap-4">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={`material-symbols-outlined select-none notranslate ${iconColor}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      )}
    </div>
    <div>
      <p className="font-body text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="font-headline font-bold text-2xl text-blue-950 mt-1">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const totalInspections = history.length;
  const totalDowntime = history.reduce((acc, curr) => acc + (curr.downtimeHours || 0), 0);
  const avgMttr = totalInspections > 0 ? (totalDowntime / totalInspections).toFixed(1) : '0.0';
  const availability = totalDowntime > 0 ? (100 - (totalDowntime / (720 * 2) * 100)).toFixed(1) : '99.2';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="trending_up"
          iconBg="bg-blue-50"
          iconColor="text-[#004a88]"
          label="MTBF (Média Falhas)"
          value="482 hrs"
          badge="+4%"
          badgeColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon="schedule"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="MTTR (Média Reparo)"
          value={`${avgMttr} hrs`}
          badge="-5%"
          badgeColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon="verified"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          label="Disponibilidade"
          value={`${availability}%`}
        />
        <StatCard
          icon="assignment"
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          label="Total de Inspeções"
          value={String(totalInspections)}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#004a88] select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>show_chart</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Tendência de Confiabilidade</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v) => `Mês: ${v}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: 11 }}
                />
                <Line type="monotone" name="MTBF (hrs)" dataKey="mtbf" stroke="#004a88" strokeWidth={3} dot={{ r: 4, fill: '#004a88', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 select-none notranslate" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-blue-950 uppercase tracking-widest">Performance de Reparo (MTTR)</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v) => `Mês: ${v}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: 11 }}
                />
                <Bar name="MTTR (hrs)" dataKey="mttr" fill="#004a88" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

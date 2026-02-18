
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
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  History
} from 'lucide-react';
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

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const totalInspections = history.length;
  const totalDowntime = history.reduce((acc, curr) => acc + (curr.downtimeHours || 0), 0);
  const avgMttr = totalInspections > 0 ? (totalDowntime / totalInspections).toFixed(1) : "0.0";
  const availability = totalDowntime > 0 ? (100 - (totalDowntime / (720 * 2) * 100)).toFixed(1) : "99.2";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-[#0066CC] rounded-lg">
              <Activity size={24} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+4%</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">MTBF (Média Falhas)</p>
          <p className="text-2xl font-bold text-slate-800">482 hrs</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Clock size={24} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">-5%</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">MTTR (Média Reparo)</p>
          <p className="text-2xl font-bold text-slate-800">{avgMttr} hrs</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Disponibilidade</p>
          <p className="text-2xl font-bold text-slate-800">{availability}%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Total de Inspeções</p>
          <p className="text-2xl font-bold text-slate-800">{totalInspections}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#0066CC]" />
            Tendência de Confiabilidade
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  labelFormatter={(value) => `Mês: ${value}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" name="MTBF (hrs)" dataKey="mtbf" stroke="#0066CC" strokeWidth={4} dot={{ r: 6, fill: '#0066CC', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <History size={20} className="text-orange-600" />
            Performance de Reparo (MTTR)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  labelFormatter={(value) => `Mês: ${value}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar name="MTTR (hrs)" dataKey="mttr" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Loader2,
  AlertCircle,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  users: UserProfile[];
  onRegisterNewUser: (user: UserProfile) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, onRegisterNewUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!foundUser) {
        const { data } = await supabase.from('user_profiles').select('*').eq('email', email.toLowerCase().trim()).single();
        if (data) foundUser = data as UserProfile;
      }

      if (foundUser && foundUser.password === password) {
        onLogin(foundUser);
      } else {
        setError('E-mail ou senha incorreta.');
      }
    } catch (err) {
      setError('Erro de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all font-bold text-slate-800 text-sm";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-1.5 block";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="mx-auto animate-in zoom-in-90 duration-700">
            <img
              src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png"
              alt="Logo Forte"
              className="h-32 w-auto mx-auto object-contain drop-shadow-xl"
            />
          </div>
          <div className="-mt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Industria Inteligente</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-tight animate-in fade-in">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className={labelClasses}>Usuário</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066CC] transition-colors" size={20} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplo@forte.com" className={inputClasses} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelClasses}>Senha</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066CC] transition-colors" size={20} />
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClasses} />
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 h-16 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                style={{ backgroundColor: 'rgb(0, 102, 204)' }}
              >
                {isLoading ? <Loader2 size={22} className="animate-spin" /> : 'Entrar'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soluções desde © 2016</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  users: UserProfile[];
  onRegisterNewUser: (user: UserProfile) => Promise<boolean>;
}

type ViewMode = 'login' | 'change_password';

const Login: React.FC<LoginProps> = ({ onLogin, users, onRegisterNewUser }) => {
  const [view, setView] = useState<ViewMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Change Password States
  const [changeEmail, setChangeEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Verificar se o usuário existe e a senha atual está correta
      const { data: user, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', changeEmail.toLowerCase().trim())
        .eq('password', currentPassword)
        .single();

      if (fetchError || !user) {
        setError('E-mail ou senha atual incorretos.');
        setIsLoading(false);
        return;
      }

      // 2. Atualizar a senha
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Senha alterada com sucesso! Você já pode entrar.');
      setTimeout(() => {
        setView('login');
        setSuccess('');
        setEmail(changeEmail);
        setPassword('');
      }, 2000);

    } catch (err) {
      console.error(err);
      setError('Erro ao alterar a senha. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const LogoSection = () => (
    <div className="flex flex-col items-center gap-4">
      <div className="w-36 h-36 flex items-center justify-center overflow-hidden">
        <img 
            src="https://tnwbnjksbhskgyqdibsu.supabase.co/storage/v1/object/public/assets/logo_forte.png" 
            alt="Logo Forte" 
            className="w-full h-full object-contain"
        />
      </div>
      <div className="text-center">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Industria Inteligente</h2>
        <p className="text-on-surface-variant font-body text-sm mt-1">Gestão de Engenharia</p>
      </div>
    </div>
  );

  return (
    <div className="bg-background font-body text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="bg-background w-full top-0 bg-gradient-to-b from-surface-container-low to-transparent z-50">
        <div className="flex items-center justify-center px-6 py-8 w-full relative">
          <div className="flex items-center gap-3">
            <h1 className="font-headline tracking-widest text-xl font-bold text-primary uppercase">FORTE-PRO 4.0</h1>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Abstract Industrial Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl"></div>
          <div className="absolute top-1/2 -right-48 w-[32rem] h-[32rem] rounded-full bg-secondary-container/10 blur-[100px]"></div>
          <div className="absolute bottom-0 left-1/4 w-full h-px bg-gradient-to-r from-transparent via-outline-variant/20 to-transparent"></div>
          {/* Structural Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #004a88 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 z-10 max-w-6xl">
          {/* Form Container */}
          <div className="w-full max-w-md transition-all duration-300">
            {view === 'login' ? (
              /* Login Card */
              <div className="bg-surface-container-lowest glass-panel rounded-xl shadow-[0_24px_48px_-12px_rgba(23,28,31,0.08)] overflow-hidden">
                <div className="px-8 pt-10 pb-12 flex flex-col gap-8">
                  <LogoSection />

                  {error && <div className="bg-error/10 text-error p-3 rounded-lg text-xs font-bold uppercase text-center">{error}</div>}
                  {success && <div className="bg-primary/10 text-primary p-3 rounded-lg text-xs font-bold uppercase text-center">{success}</div>}

                  <form className="flex flex-col gap-6" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase px-1">USUÁRIO</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline select-none notranslate" style={{ fontSize: '20px' }} aria-hidden="true">alternate_email</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm" 
                          placeholder="nome@empresa.com.br" 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-end px-1">
                        <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase">SENHA</label>
                        <button 
                          type="button"
                          onClick={() => { setView('change_password'); setError(''); setSuccess(''); }}
                          className="text-[10px] font-bold text-primary hover:text-primary-container transition-colors tracking-tight uppercase"
                        >
                          alterar senha?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline select-none notranslate" style={{ fontSize: '20px' }} aria-hidden="true">lock</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-12 text-on-surface placeholder:text-outline/60 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm" 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button 
                          className="absolute right-4 text-outline hover:text-on-surface-variant transition-colors" 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      className="w-full bg-primary text-white py-4 rounded-full font-label font-bold text-sm tracking-[0.05em] uppercase shadow-xl hover:shadow-primary/20 active:scale-95 duration-200 flex items-center justify-center gap-3 mt-4 disabled:opacity-50" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                              <span className="pt-0.5">ENTRAR</span>
                              <span className="material-symbols-outlined select-none notranslate" style={{ fontSize: '20px' }} aria-hidden="true">arrow_forward</span>
                          </>
                      )}
                    </button>
                  </form>
                </div>
                <div className="h-2 bg-gradient-to-r from-primary via-primary-container to-secondary-container"></div>
              </div>
            ) : (
              /* Change Password Card */
              <div className="bg-surface-container-lowest glass-panel rounded-xl shadow-[0_24px_48px_-12px_rgba(23,28,31,0.08)] overflow-hidden">
                <div className="px-8 pt-10 pb-12 flex flex-col gap-6">
                  <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => setView('login')} className="text-primary hover:bg-primary/5 p-1 rounded-full transition-colors">
                          <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                      <h2 className="text-primary font-headline font-bold tracking-widest text-xs uppercase pt-1">ALTERAR SENHA</h2>
                  </div>

                  {error && <div className="bg-error/10 text-error p-3 rounded-lg text-xs font-bold uppercase text-center">{error}</div>}
                  {success && <div className="bg-primary/10 text-primary p-3 rounded-lg text-xs font-bold uppercase text-center">{success}</div>}

                  <form className="flex flex-col gap-5" onSubmit={handleChangePassword}>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase px-1">EMAIL</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-lg">alternate_email</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-on-surface font-body text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                          type="email" 
                          placeholder="seu@email.com.br"
                          value={changeEmail}
                          onChange={(e) => setChangeEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase px-1">SENHA ATUAL</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-lg">key</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-12 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm" 
                          placeholder="••••••••" 
                          type={showCurrentPass ? "text" : "password"} 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                        <button 
                          className="absolute right-4 text-outline hover:text-on-surface-variant transition-colors" 
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                        >
                          <span className="material-symbols-outlined text-lg">{showCurrentPass ? 'visibility' : 'visibility_off'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-surface-container-high my-1"></div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase px-1">NOVA SENHA</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-lg">lock_open</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm" 
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                           required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-label font-bold text-[10px] tracking-[0.08em] text-on-surface-variant uppercase px-1">CONFIRMAR SENHA</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-lg">lock_reset</span>
                        <input 
                          className="w-full bg-surface-container-low border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-body text-sm" 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      className="w-full bg-primary text-white py-4 rounded-full font-label font-bold text-sm tracking-[0.05em] uppercase shadow-md hover:shadow-lg active:scale-95 duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                              ENVIAR
                              <span className="material-symbols-outlined text-lg">arrow_forward</span>
                          </>
                      )}
                    </button>
                  </form>
                </div>
                <div className="h-2 bg-primary"></div>
              </div>
            )}
          </div>

          {/* Decorative Side Image (Bento-style) */}
          <div className="hidden lg:block w-96 h-[600px] overflow-hidden rounded-3xl shadow-2xl relative">
            <img 
              alt="Industrial robotic arm" 
              className="w-full h-full object-cover grayscale-[0.2] contrast-125" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7nP6iBCZs_AFS6ToVq996sDEX3XkODGkxcfhNmLpHV4d7nqenL9dWwFNFGxDSWzH2DydAz0wUl755-6XDHAN7zKx9m9VkYPPbwp4k28fIgf6-kAg-_s7vhQbHrocej1Hj5XGfIQBDT9HreFxqyzMZM-4avZ4tXMK0YQY06H1RSeoly4teX8UsVCNrEZw_p33Kc7VSLgwnI7y3KqCfcZgIjlv-PaIUct0SwJ2skQwRVCsnID8dzq4PufmKONsZpFq852hZfC4Dk2vO" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-10">
              <span className="font-headline font-bold text-white text-4xl leading-tight">Excelência <br /> Técnica.</span>
              <p className="text-white/80 font-body text-sm mt-4">Projetando o amanhã com a precisão de hoje.</p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="absolute bottom-10 left-0 right-0">
          <p className="text-center font-body text-xs text-on-surface-variant/70 tracking-wide">
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.025em' }}>SOLUÇÕES DESDE © 2016.</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;

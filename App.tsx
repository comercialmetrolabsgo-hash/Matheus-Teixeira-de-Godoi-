
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Clients from './components/Clients';
import Services from './components/Services';
import Reports from './components/Reports';
import Tracking from './components/Tracking';
import Logo from './components/Logo';
import ClientSignatureView from './components/ClientSignatureView';
import { AppSection, User } from './types';
import { db, supabase } from './services/supabase';
import { 
  Lock, Menu, X, ArrowRight, Loader2, AlertCircle, Maximize2, Minimize2, 
  ShieldCheck, Mail, Key, Shield
} from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<AppSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  const [signOsId, setSignOsId] = useState<string | null>(null);

  useEffect(() => {
    // Verificar sessão ativa ao carregar
    const initAuth = async () => {
      try {
        // Testar conexão com o banco
        const isConnected = await db.testConnection();
        if (!isConnected) {
          console.warn("[App] Aplicativo iniciando sem conexão estável com o banco.");
        }
        
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) {
          await fetchUserData(data.session.user.email!);
        }
      } catch (err) {
        console.error("Erro ao inicializar auth:", err);
      }
    };
    initAuth();

    // Listener de mudanças de estado na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
          await fetchUserData(session.user.email!);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentUser(null);
          localStorage.removeItem('metrolab_user');
        }
      } catch (err) {
        console.error("Erro no listener de auth:", err);
      }
    });

    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const id = params.get('sign_os');
    if (id) setSignOsId(id);

    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const fetchUserData = async (email: string) => {
    try {
      const userMetadata = await db.users.getByEmail(email);
      if (userMetadata) {
        const fullUser: User = {
          id: userMetadata.id,
          username: userMetadata.username || email.split('@')[0],
          full_name: userMetadata.full_name,
          email: email,
          role: userMetadata.role || 'user'
        };
        setCurrentUser(fullUser);
        setIsAuthenticated(true);
        localStorage.setItem('metrolab_user', JSON.stringify(fullUser));
      } else {
        // Fallback para quando o usuário existe no Auth mas não no banco metadata 'users'
        const fallbackUser: User = {
          id: email, // Usamos o e-mail como ID temporário
          username: email.split('@')[0],
          full_name: email.split('@')[0],
          email: email,
          role: 'user' // Por padrão entra como usuário comum até ser promovido no SQL
        };
        setCurrentUser(fallbackUser);
        setIsAuthenticated(true);
        localStorage.setItem('metrolab_user', JSON.stringify(fallbackUser));
      }
    } catch (e) {
      console.error("Erro crítico ao buscar metadados:", e);
      setIsAuthenticated(true); // Mantém logado pelo Auth pelo menos
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingLogin(true);
    setLoginError(null);

    try {
      const { data, error } = await db.auth.signIn(loginData.email, loginData.password);
      if (error) throw error;
    } catch (e: any) {
      setLoginError(e.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : "Erro de comunicação com o servidor.");
    } finally {
      setIsLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    await db.auth.signOut();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  if (signOsId) {
    return <ClientSignatureView serviceId={signOsId} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans overflow-hidden">
        {/* Lado Esquerdo - Branding */}
        <div className="hidden lg:flex lg:w-[55%] bg-[#004282] items-center justify-center p-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#74C044]/20 rounded-full blur-[100px]"></div>
          </div>
          
          <div className="relative z-10 text-center max-w-xl">
            <Logo variant="light" className="h-24 mx-auto mb-10" showText={true} />
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-8 leading-[1.1]">
              Gestão Hospitalar <br/> 
              <span className="text-[#74C044]">de Alta Performance</span>
            </h1>
            <p className="text-blue-100/60 font-medium text-lg leading-relaxed mb-12">
              Plataforma centralizada para engenharia clínica, calibração, 
              rastreabilidade de ativos e conformidade normativa.
            </p>
            
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Segurança', icon: ShieldCheck },
                { label: 'OS Digital', icon: Key },
                { label: 'Cloud Sync', icon: Shield }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl">
                   <item.icon className="w-6 h-6 text-[#74C044] mx-auto mb-3" />
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado Direito - Form de Login */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 lg:bg-white relative">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex justify-center mb-10">
               <Logo variant="dark" className="h-10" />
            </div>

            <div className="mb-12 text-center lg:text-left">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-3">Login</h2>
              <p className="text-slate-500 font-medium">Insira suas credenciais para acessar o sistema.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
                <div className="relative group">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#004282] transition-colors">
                      <Mail className="w-5 h-5" />
                   </div>
                   <input required type="email" placeholder="exemplo@metrolabs.com.br" 
                     className="w-full pl-14 pr-6 py-5 bg-slate-100 lg:bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-slate-900 outline-none focus:border-[#004282] focus:bg-white transition-all font-semibold"
                     value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Senha de Acesso</label>
                <div className="relative group">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#004282] transition-colors">
                      <Key className="w-5 h-5" />
                   </div>
                   <input required type="password" placeholder="••••••••" 
                     className="w-full pl-14 pr-6 py-5 bg-slate-100 lg:bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-slate-900 outline-none focus:border-[#004282] focus:bg-white transition-all font-semibold"
                     value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
                </div>
              </div>

              {loginError && (
                <div className="flex items-center space-x-3 bg-red-50 p-4 rounded-2xl text-red-600 border border-red-100 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-tight">{loginError}</p>
                </div>
              )}

              <button type="submit" disabled={isLoadingLogin} className="w-full py-6 bg-[#004282] text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-blue-900 hover:scale-[1.02] transition-all uppercase text-[11px] tracking-[0.2em] flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50">
                {isLoadingLogin ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Acessar Painel</span><ArrowRight className="w-4 h-4 text-[#74C044]" /></>}
              </button>
            </form>

            <div className="mt-16 text-center lg:text-left space-y-6">
               <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-[#004282]" />
                  <span className="text-[10px] font-black text-[#004282] uppercase tracking-widest">Acesso Criptografado SSL</span>
               </div>
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Metrolab's Management &copy; {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar currentSection={currentSection} setSection={s => { setCurrentSection(s); setIsSidebarOpen(false); }} user={currentUser!} onLogout={handleLogout} isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-24 px-10 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center space-x-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-3 text-slate-600 hover:bg-slate-100 rounded-2xl">
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="hidden lg:block w-44 shrink-0">
               <Logo showText={true} className="h-9 w-full" variant="dark" />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button onClick={toggleFullscreen} className="p-3 text-slate-400 hover:text-[#004282] transition-all">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center space-x-4 border-l border-slate-100 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none mb-1">{currentUser?.full_name}</p>
                <p className="text-[10px] text-[#74C044] font-black uppercase tracking-widest">{currentUser?.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#004282] flex items-center justify-center font-black text-white shadow-lg uppercase text-xl">
                {currentUser?.full_name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-12 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'dashboard' && <Dashboard setSection={setCurrentSection} />}
            {currentSection === 'products' && <Products />}
            {currentSection === 'clients' && <Clients />}
            {currentSection === 'services' && <Services />}
            {currentSection === 'tracking' && <Tracking />}
            {currentSection === 'reports' && <Reports />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;


import React, { useEffect, useState } from 'react';
import { Boxes, Users, Wrench, DollarSign, RefreshCcw, CheckCircle2, PlayCircle, Loader2, FileCheck, AlertTriangle, Clock } from 'lucide-react';
import { db } from '../services/supabase';
import { Activity, Product, Service, User as UserType, AppSection } from '../types';

interface DashboardProps {
  setSection: (section: AppSection) => void;
}

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all flex items-center space-x-6 group">
    <div className={`p-5 rounded-2xl transition-transform group-hover:scale-110 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-technical mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ setSection }) => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  const [data, setData] = useState({
    products: 0,
    clients: 0,
    services: 0,
    totalStockValue: 0,
    activities: [] as Activity[],
    myServices: [] as Service[],
    alerts: {
      criticalStock: [] as Product[],
      expiringSoon: [] as Product[],
      stalledServices: [] as Service[]
    }
  });

  const loadData = async () => {
    try {
      setHasError(false);
      const products = await db.products.getAll().catch(() => []);
      const clients = await db.clients.getAll().catch(() => []);
      const services = await db.services.getAll().catch(() => []);
      const activities = await db.activities.getAll().catch(() => []);
      
      const userStr = localStorage.getItem('metrolab_user');
      const user: UserType = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(user);

      const myServices = (services || []).filter((s: Service) => {
        const respName = String(s.responsible || '').trim().toLowerCase();
        const currentName = String(user?.full_name || '').trim().toLowerCase();
        return respName === currentName && s.status !== 'completed';
      });

      const totalStockValue = (products || []).reduce((acc, p) => {
        return acc + ((p.costPrice || 0) * (p.stock || 0));
      }, 0);

      // Lógica de Alertas
      const criticalStock = (products || []).filter(p => (p.stock || 0) <= (p.minStock || 0));
      
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      
      const expiringSoon = (products || []).filter(p => {
        if (!p.expiry_date) return false;
        const expiry = new Date(p.expiry_date + 'T23:59:59');
        return expiry > today && expiry <= nextMonth;
      });

      const stalledServices = (services || []).filter(s => {
        if (s.status !== 'in_progress') return false;
        const created = new Date(s.created_at || s.date);
        const diffHours = (today.getTime() - created.getTime()) / (1000 * 60 * 60);
        return diffHours > 48;
      });
      
      setData({
        products: products.length,
        clients: (clients || []).filter((c: any) => c.status === 'active').length,
        services: (services || []).filter((s: any) => s.status !== 'completed').length,
        totalStockValue: totalStockValue,
        activities: (activities || []).slice(0, 5),
        myServices: myServices,
        alerts: {
          criticalStock,
          expiringSoon,
          stalledServices
        }
      });
    } catch (e) {
      console.error("Erro Dashboard:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadData();
    const subProd = db.subscribe('products', loadData);
    const subCli = db.subscribe('clients', loadData);
    const subSrv = db.subscribe('services', loadData);
    const subAct = db.subscribe('activities', loadData);
    return () => {
      subProd.unsubscribe();
      subCli.unsubscribe();
      subSrv.unsubscribe();
      subAct.unsubscribe();
    };
  }, []);

  const handleAcceptOS = async (service: Service) => {
    if (service.status !== 'pending') return;
    
    setActionLoading(service.id);
    try {
      const updatedService = { ...service, status: 'in_progress' as const };
      const result: any = await db.services.save(updatedService);
      
      if (!result.error) {
        await db.activities.log(`O.S. ${service.id.toString().slice(0,6).toUpperCase()} aceita por ${currentUser?.full_name}`, 'Service');
        await loadData();
      } else {
        alert("Erro ao aceitar O.S.: " + result.error.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizeRedirect = (serviceId: string | number) => {
    setSection('services');
    window.location.hash = `os-${serviceId}`;
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-10 h-10 text-[#004282] animate-spin" />
      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando em tempo real...</p>
    </div>
  );

  if (hasError) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-inner">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-800 uppercase">Erro de Conexão</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">Não conseguimos carregar todos os dados. Verifique se as tabelas foram criadas corretamente no Supabase.</p>
      </div>
      <button onClick={loadData} className="px-8 py-3 bg-[#004282] text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center space-x-2">
        <RefreshCcw className="w-4 h-4" />
        <span>Tentar Novamente</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-10 animate-fadeIn text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Dashboard</h2>
          <p className="text-slate-500 font-medium italic">Olá, {currentUser?.full_name || 'Usuário'}. Suas tarefas sincronizadas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Itens em Catálogo" value={data.products.toString()} icon={<Boxes />} color="bg-green-50 text-green-600" />
        <StatCard label="Clientes Ativos" value={data.clients.toString()} icon={<Users />} color="bg-blue-50 text-indigo-600" />
        <StatCard label="O.S. em Aberto" value={data.services.toString()} icon={<Wrench />} color="bg-orange-50 text-orange-600" />
        <StatCard label="Patrimônio" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalStockValue)} icon={<DollarSign />} color="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Painel de Alertas Inteligentes */}
      {(data.alerts.criticalStock.length > 0 || data.alerts.expiringSoon.length > 0 || data.alerts.stalledServices.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slideUp">
          {data.alerts.criticalStock.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-start space-x-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Estoque Crítico</p>
                <p className="text-sm font-bold text-red-900 mt-1">{data.alerts.criticalStock.length} itens abaixo do mínimo</p>
                <button onClick={() => setSection('products')} className="text-[9px] font-black text-red-600 uppercase mt-2 hover:underline">Verificar Itens</button>
              </div>
            </div>
          )}
          {data.alerts.expiringSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start space-x-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Vencimento Próximo</p>
                <p className="text-sm font-bold text-amber-900 mt-1">{data.alerts.expiringSoon.length} itens vencem em 30 dias</p>
                <button onClick={() => setSection('products')} className="text-[9px] font-black text-amber-600 uppercase mt-2 hover:underline">Gerenciar Lotes</button>
              </div>
            </div>
          )}
          {data.alerts.stalledServices.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex items-start space-x-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><RefreshCcw className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">O.S. Estagnadas</p>
                <p className="text-sm font-bold text-indigo-900 mt-1">{data.alerts.stalledServices.length} serviços sem atualização</p>
                <button onClick={() => setSection('services')} className="text-[9px] font-black text-indigo-600 uppercase mt-2 hover:underline">Revisar Fluxo</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-[2.5rem] shadow-xl border border-indigo-50 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/20">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-tight text-lg">Minhas Tarefas Ativas</h3>
              <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase">{(data.myServices || []).length} pendentes</span>
            </div>
            <div className="divide-y divide-slate-50">
              {data.myServices.length > 0 ? data.myServices.map(s => (
                <div key={s.id} className="p-8 hover:bg-slate-50 flex items-center justify-between transition-all">
                   <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-[10px] font-black uppercase text-indigo-400">{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')} - {s.hour}</p>
                        {s.status === 'in_progress' ? (
                          <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">Em Andamento</span>
                        ) : (
                          <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Pendente Aceite</span>
                        )}
                      </div>
                      <p className="text-base font-black text-slate-800 uppercase mt-1 line-clamp-1">{s.client_name || 'Cliente Indefinido'}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{s.description}</p>
                   </div>
                   
                   {s.status === 'pending' ? (
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleAcceptOS(s); }} 
                       disabled={actionLoading === s.id}
                       className="bg-[#74C044] hover:bg-[#65a83b] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center space-x-2 shrink-0 min-w-[140px]">
                       {actionLoading === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                       <span>Aceitar O.S.</span>
                     </button>
                   ) : (
                     <button 
                       onClick={() => handleFinalizeRedirect(s.id)}
                       className="flex items-center space-x-2 text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-2xl shrink-0 min-w-[140px] justify-center shadow-lg shadow-indigo-100 transition-all active:scale-95">
                       <FileCheck className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase">Finalizar Agora</span>
                     </button>
                   )}
                </div>
              )) : (
                <div className="p-20 text-center text-slate-300 italic text-sm">Nenhuma tarefa pendente para você hoje.</div>
              )}
            </div>
           </div>
        </div>
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white overflow-hidden">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">Atividades em Tempo Real</h3>
           <div className="space-y-6">
              {data.activities.length > 0 ? data.activities.map(a => (
                <div key={a.id} className="border-l-2 border-indigo-500/30 pl-4 animate-fadeIn">
                  <p className="text-xs font-bold line-clamp-2">{a.description}</p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">{a.user} • {new Date(a.date).toLocaleTimeString()}</p>
                </div>
              )) : (
                <p className="text-slate-600 text-[10px] italic">Aguardando atividades...</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

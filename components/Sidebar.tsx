
import React, { useState } from 'react';
import { LayoutDashboard, Boxes, Users, Wrench, BarChart, Shield, LogOut, Key, Loader2, CheckCircle2, Truck, ArrowLeftRight } from 'lucide-react';
import { AppSection, User } from '../types';
import Logo from './Logo';

interface SidebarProps {
  currentSection: AppSection;
  setSection: (section: AppSection) => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentSection, setSection, user, onLogout, isOpen }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const navItems = [
    { id: 'dashboard' as AppSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as AppSection, label: 'Produtos e Insumos', icon: Boxes },
    { id: 'stock_movements' as AppSection, label: 'Movimentação de Estoque', icon: ArrowLeftRight },
    { id: 'clients' as AppSection, label: 'Carteira de Clientes', icon: Users },
    { id: 'services' as AppSection, label: 'Ordens de Serviço', icon: Wrench },
    {id: 'tracking' as AppSection, label: 'Logística e Rastreio', icon: Truck},
    {id: 'reports' as AppSection, label: 'Relatórios', icon: BarChart}
  ];

  const handleResetPassword = () => {
    setIsResetting(true);
    setTimeout(() => {
      setIsResetting(false);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 8000);
    }, 2000);
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 bg-[#004282] text-white transform transition-transform duration-300 ease-in-out border-r border-white/5 shadow-2xl flex flex-col
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0
    `}>
      <div className="p-8 shrink-0">
        <Logo variant="light" showText={false} className="h-14 mx-auto" />
      </div>

      <nav className="mt-4 px-4 flex-1 overflow-y-auto no-scrollbar">
        <p className="px-4 text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-4 opacity-40">Módulos do Sistema</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`
              w-full flex items-center space-x-3 px-5 py-3 rounded-xl transition-all mb-1 text-sm
              ${currentSection === item.id 
                ? 'bg-white/10 text-white font-bold border-l-4 border-[#74C044] shadow-lg' 
                : 'text-blue-100 hover:bg-white/5 hover:text-white'}
            `}
          >
            <item.icon className={`w-4 h-4 ${currentSection === item.id ? 'text-[#74C044]' : 'text-blue-300'}`} />
            <span className="tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 bg-black/10 mt-auto shrink-0">
        <div className="flex items-center space-x-3 mb-4 p-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-xl bg-[#74C044] flex items-center justify-center font-black text-[#004282] shadow-inner text-lg">
            {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate leading-none mb-1">{user?.full_name || 'Usuário'}</p>
            <p className="text-[9px] text-blue-300 uppercase font-black tracking-widest opacity-60">{user?.role === 'admin' ? 'Admin Master' : 'Colaborador'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {resetSent ? (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2 text-green-400 font-black uppercase text-[8px] tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                <span>E-mail Enviado</span>
              </div>
              <p className="text-[8px] text-green-100 leading-tight font-medium">
                Link enviado para o e-mail cadastrado.
              </p>
            </div>
          ) : (
            <button 
              onClick={handleResetPassword}
              disabled={isResetting}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-blue-100`}
            >
              {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3 text-[#74C044]" />}
              <span>Redefinir Senha</span>
            </button>
          )}

          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut className="w-3 h-3" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

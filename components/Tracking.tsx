
import React, { useState, useEffect } from 'react';
import { Search, Package, MapPin, CheckCircle2, Clock, Wrench, Plus, ExternalLink, Trash2, X, Truck, ShoppingCart, Boxes, AlertCircle, UserCheck, Copy, Check, Globe, RefreshCcw } from 'lucide-react';
import { db } from '../services/supabase';
import { Service, TrackingItem } from '../types';

type TrackingTab = 'os' | 'purchases' | 'sales';

const Tracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TrackingTab>('os');
  const [query, setQuery] = useState('');
  const [osResult, setOsResult] = useState<Service | null>(null);
  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<Omit<TrackingItem, 'id' | 'created_at'>>({
    type: 'purchase',
    code: '',
    carrier: '17track',
    description: '',
    status: 'posted'
  });

  useEffect(() => {
    loadTracking();
  }, []);

  const loadTracking = async () => {
    setIsLoading(true);
    try {
      const data = await db.tracking.getAll();
      setTrackingItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar rastreios:", error);
      setTrackingItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOSSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setIsLoading(true);
    try {
      const services = await db.services.getAll();
      const found = (services || []).find((s: any) => 
        s.id.toString().toLowerCase().includes(query.toLowerCase().replace('#', ''))
      );
      setOsResult(found || null);
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: TrackingItem = {
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      ...formData
    };
    await db.tracking.save(newItem);
    await loadTracking();
    setShowAddModal(false);
    setFormData({ ...formData, code: '', description: '', carrier: '17track' });
  };

  const handleDeleteTracking = async (id: string | number) => {
    if(confirm('Excluir este registro de logística?')) {
      await db.tracking.delete(id);
      await loadTracking();
    }
  };

  const copyToClipboard = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id.toString());
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCarrierLink = (code: string, carrier: string) => {
    const cleanCode = code.trim().toUpperCase();
    const encodedCode = encodeURIComponent(cleanCode);
    switch (carrier) {
      case '17track': return `https://www.17track.net/pt#nums=${encodedCode}`;
      case 'correios': return `https://www.linkcorreios.com.br/?id=${encodedCode}`;
      case 'jadlog': return `https://www.jadlog.com.br/siteInstitucional/tracking.jad?tracking=${encodedCode}`;
      case 'azul': return `https://www.azulcargoexpress.com.br/Rastreio?n=${encodedCode}`;
      case 'latam': return `https://www.latamcargo.com/pt/trackshipment?docNumber=${encodedCode}`;
      case 'braspress': return `https://www.braspress.com/`;
      case 'melhorenvio': return `https://melhorrastreio.com.br/rastreio/${encodedCode}`;
      default: return `https://www.google.com/search?q=rastreio+${carrier}+${encodedCode}`;
    }
  };

  const getCarrierName = (carrier: string) => {
    switch (carrier) {
      case '17track': return '17TRACK Universal';
      case 'correios': return 'Correios';
      case 'azul': return 'Azul Cargo';
      case 'jadlog': return 'Jadlog';
      case 'braspress': return 'Braspress';
      case 'latam': return 'LATAM Cargo';
      case 'melhorenvio': return 'Melhor Envio';
      default: return carrier.toUpperCase();
    }
  };

  const filteredItems = (trackingItems || []).filter(item => 
    (activeTab === 'purchases' ? item.type === 'purchase' : item.type === 'sale') &&
    (item.code.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()))
  );

  if (isLoading && trackingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCcw className="w-10 h-10 text-[#004282] animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando Logística...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 text-left">
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-[#004282] tracking-tighter uppercase">Logística & Fluxo</h2>
            <p className="text-sm text-slate-400 font-medium italic">Monitoramento de insumos, compras e envios.</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <button onClick={() => { setActiveTab('os'); setSearched(false); setQuery(''); }} className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all tracking-wider ${activeTab === 'os' ? 'bg-[#004282] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
              <Wrench className="w-3.5 h-3.5" />
              <span>O.S. Internas</span>
            </button>
            <button onClick={() => { setActiveTab('purchases'); setQuery(''); }} className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all tracking-wider ${activeTab === 'purchases' ? 'bg-[#004282] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
              <Boxes className="w-3.5 h-3.5" />
              <span>Compras</span>
            </button>
            <button onClick={() => { setActiveTab('sales'); setQuery(''); }} className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all tracking-wider ${activeTab === 'sales' ? 'bg-[#004282] text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
              <Truck className="w-3.5 h-3.5" />
              <span>Vendas</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" placeholder={activeTab === 'os' ? "Código da O.S. (ex: #a1b2c3)" : "Código de rastreio ou descrição..."} className="w-full pl-12 pr-4 py-5 rounded-[1.5rem] bg-white border border-slate-200 focus:ring-4 focus:ring-[#004282]/5 outline-none text-slate-900 font-bold shadow-sm transition-all placeholder:text-slate-300" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          {activeTab === 'os' ? (
            <button onClick={handleOSSearch} className="bg-[#004282] text-white px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all">Localizar Registro</button>
          ) : (
            <button onClick={() => { setFormData({...formData, type: activeTab === 'purchases' ? 'purchase' : 'sale'}); setShowAddModal(true); }} className="bg-[#74C044] text-white px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all flex items-center space-x-3">
              <Plus className="w-4 h-4" />
              <span>Vincular Encomenda</span>
            </button>
          )}
        </div>

        {activeTab === 'os' && searched && (
          <div className="animate-slideUp">
            {osResult ? (
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-l-8 border-l-[#74C044] border border-slate-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Wrench className="w-32 h-32" />
                 </div>
                 <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{osResult.client_name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Status Operacional: {osResult.status === 'completed' ? 'FINALIZADO' : 'EM EXECUÇÃO'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-2xl">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID da O.S.</p>
                       <p className="text-xl font-black text-[#004282]">#{osResult.id.toString().slice(0,6).toUpperCase()}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-slate-50 mb-8 relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-50 text-[#004282] rounded-xl"><Clock className="w-5 h-5" /></div>
                      <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Data Atendimento</p><p className="font-bold text-slate-700">{osResult.date} às {osResult.hour}</p></div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-50 text-[#74C044] rounded-xl"><UserCheck className="w-5 h-5" /></div>
                      <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Técnico em Campo</p><p className="font-bold text-slate-700">{osResult.responsible}</p></div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-50 text-orange-500 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
                      <div><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Grau Prioridade</p><p className="font-black text-orange-600 uppercase text-xs">{osResult.priority}</p></div>
                    </div>
                 </div>
                 <p className="text-sm text-slate-500 font-medium italic border-l-4 border-slate-100 pl-6 py-2">"{osResult.description}"</p>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <p className="font-black text-slate-400 uppercase text-[11px] tracking-[0.2em]">Registro não localizado na base do sistema.</p>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'purchases' || activeTab === 'sales') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slideUp">
            {filteredItems.length > 0 ? filteredItems.map(item => (
              <div key={item.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:border-[#004282] transition-all group relative overflow-hidden flex flex-col">
                <div className="absolute top-6 right-8">
                  <button onClick={() => handleDeleteTracking(item.id)} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-6 mb-8">
                  <div className={`p-6 rounded-[1.5rem] shadow-inner ${activeTab === 'purchases' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                    {activeTab === 'purchases' ? <ShoppingCart className="w-8 h-8" /> : <Package className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-lg leading-none mb-2">{item.description}</h4>
                    <div className="flex items-center space-x-3">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${activeTab === 'purchases' ? 'bg-orange-100/50 text-orange-600' : 'bg-blue-100/50 text-blue-600'}`}>
                        {getCarrierName(item.carrier)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto flex flex-col space-y-4">
                  <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-black text-slate-300 uppercase mb-1 tracking-widest flex items-center">
                        CÓDIGO DE RASTREIO
                        {copiedId === item.id.toString() ? (
                          <span className="ml-3 text-[#74C044] flex items-center font-black animate-pulse">
                            <Check className="w-3.5 h-3.5 mr-1" /> COPIADO
                          </span>
                        ) : (
                          <button onClick={() => copyToClipboard(item.code, item.id)} className="ml-3 text-slate-300 hover:text-[#004282] transition-all" title="Copiar código">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-wider truncate mr-4">{item.code}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={getCarrierLink(item.code, item.carrier)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full bg-[#004282] text-white py-5 rounded-[1.5rem] text-[11px] font-black flex items-center justify-center space-x-3 hover:bg-[#003569] transition-all shadow-xl active:scale-95 uppercase tracking-widest"
                  >
                    <span>{item.carrier === 'braspress' ? 'Ir para Portal Braspress' : `Rastrear via ${getCarrierName(item.carrier)}`}</span>
                    <ExternalLink className="w-4 h-4 text-[#74C044]" />
                  </a>
                </div>
              </div>
            )) : (
              <div className="col-span-full bg-white p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center">
                <Package className="w-24 h-24 text-slate-100 mb-8" />
                <p className="text-slate-300 font-black uppercase text-xs tracking-[0.4em]">Nenhum registro logístico ativo</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border border-slate-100">
            <div className="px-10 py-8 bg-[#004282] text-white flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Truck className="w-8 h-8 text-[#74C044]" />
                <h3 className="text-2xl font-black uppercase tracking-tight">Nova Movimentação</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-7 h-7" /></button>
            </div>
            
            <form onSubmit={handleAddTracking} className="p-10 space-y-8 bg-white">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Descrição / Nome do Item</label>
                <input required type="text" placeholder="Ex: Peças para O.S. Hospital X..." className="w-full px-8 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-900 font-bold outline-none focus:border-[#004282] focus:bg-white transition-all shadow-inner" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Transportadora</label>
                  <select className="w-full px-8 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-900 font-black outline-none focus:border-[#74C044] focus:bg-white transition-all cursor-pointer shadow-inner appearance-none" value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value as any})}>
                    <option value="17track">17TRACK Universal</option>
                    <option value="correios">Correios</option>
                    <option value="azul">Azul Cargo</option>
                    <option value="braspress">Braspress</option>
                    <option value="jadlog">Jadlog</option>
                    <option value="latam">LATAM Cargo</option>
                    <option value="melhorenvio">Melhor Envio</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Código de Rastreio</label>
                  <input required type="text" placeholder="EX: AA123456789BR" className="w-full px-8 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-900 font-black uppercase outline-none focus:border-[#004282] focus:bg-white transition-all shadow-inner" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end items-center gap-6 pt-10 border-t border-slate-50">
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto px-10 py-5 font-black text-slate-300 uppercase text-[11px] tracking-widest">Descartar</button>
                <button type="submit" className="w-full sm:w-auto bg-[#004282] text-white px-16 py-5 rounded-[2rem] font-black shadow-2xl uppercase text-[11px] tracking-widest active:scale-95 transition-all">Sincronizar Logística</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;

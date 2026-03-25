
import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Package, 
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { db } from '../services/supabase';
import { Product, StockMovement } from '../types';

const StockMovements: React.FC = () => {
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<StockMovement>>({
    type: 'out',
    quantity: 1,
    date: getLocalDate(),
    destination: '',
    requester: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
    const sub = db.subscribe('stock_movements', loadData);
    return () => { sub.unsubscribe(); };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        db.stock_movements.getAll(),
        db.products.getAll()
      ]);
      setMovements(mRes);
      setProducts(pRes);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity || !formData.destination || !formData.requester) {
      setOperationError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsProcessing(true);
    setOperationError(null);

    try {
      const product = products.find(p => p.id === formData.product_id);
      const payload = {
        ...formData,
        product_name: product?.name || 'Produto Desconhecido'
      };

      const { error } = await db.stock_movements.save(payload);
      if (error) throw error;

      setOperationSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setOperationSuccess(false);
        setFormData({
          type: 'out',
          quantity: 1,
          date: getLocalDate(),
          destination: '',
          requester: '',
          reason: ''
        });
      }, 1500);
      loadData();
    } catch (error: any) {
      setOperationError(error.message || "Erro ao salvar movimentação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMovements = movements.filter(m => 
    m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.requester.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-10 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Movimentação de Estoque</h1>
          <p className="text-slate-500 font-medium">Controle de entradas e saídas de insumos e equipamentos.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Movimentação
        </button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por produto, destino ou solicitante..."
            className="w-full bg-white border-none rounded-3xl pl-16 pr-8 py-5 text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="lg:col-span-4 flex gap-4">
          <div className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Entradas</p>
              <p className="text-xl font-black text-slate-800">{movements.filter(m => m.type === 'in').length}</p>
            </div>
          </div>
          <div className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Saídas</p>
              <p className="text-xl font-black text-slate-800">{movements.filter(m => m.type === 'out').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Produto</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Qtd</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Destino / Local</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-400 tracking-widest">Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-4 text-sm font-bold text-slate-400">Carregando movimentações...</p>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Nenhuma movimentação encontrada.</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700">{new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        m.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {m.type === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {m.type === 'in' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{m.product_name}</span>
                        {m.reason && <span className="text-[10px] text-slate-400 font-medium italic">{m.reason}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-slate-800">{m.quantity}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700">{m.destination}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-bold text-slate-700">{m.requester}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Nova Movimentação</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registrar entrada ou saída</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
              {/* Type Toggle */}
              <div className="flex p-1.5 bg-slate-50 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'out'})}
                  className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    formData.type === 'out' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Saída de Estoque
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'in'})}
                  className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    formData.type === 'in' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Entrada de Estoque
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={formData.product_id}
                    onChange={e => setFormData({...formData, product_id: e.target.value})}
                  >
                    <option value="">Selecione o produto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock || 0})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino / Local</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Unidade Centro, Lab 02..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={formData.destination}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Solicitante</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nome de quem solicitou"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={formData.requester}
                    onChange={e => setFormData({...formData, requester: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo / Observação</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva o motivo da movimentação..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Movimentação</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </form>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-8 py-4 text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmar Movimentação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlays */}
      {operationSuccess && (
        <div className="fixed inset-0 z-[2000] bg-indigo-600 flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center animate-bounce mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Movimentação Registrada!</h2>
          <p className="text-indigo-100 font-bold">O estoque foi atualizado com sucesso.</p>
        </div>
      )}

      {operationError && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[2000] bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slideUp">
          <AlertCircle className="w-6 h-6" />
          <span className="font-bold">{operationError}</span>
          <button onClick={() => setOperationError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StockMovements;

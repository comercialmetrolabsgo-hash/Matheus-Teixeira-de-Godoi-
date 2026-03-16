
import React, { useState, useEffect } from 'react';
import { Plus, Search, ShoppingCart, DollarSign, X, Receipt } from 'lucide-react';
import { Sale, Client, Product } from '../types';
import { db } from '../services/supabase';

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    amount: 0,
    items_count: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  // Fix: loadData must await all asynchronous database calls.
  const loadData = async () => {
    // Fix: db.sales.getAll() is async and now exists in services/supabase.ts
    const allSales = await db.sales.getAll();
    setSales(allSales || []);
    // Fix: db.clients.getAll() and db.products.getAll() are async, so we must await them
    const allClients = await db.clients.getAll();
    setClients(allClients.filter(c => c.status === 'active'));
    const allProducts = await db.products.getAll();
    setProducts(allProducts.filter(p => p.status === 'active'));
  };

  // Fix: handleSave must be async to await the sales database call.
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) return alert('Selecione um cliente.');

    setIsProcessing(true);
    setOperationError(null);
    setOperationSuccess(false);

    console.log('[Sales] Iniciando salvamento...', { client_id: formData.client_id });

    try {
      const client = clients.find(c => String(c.id) === String(formData.client_id));
      const userStr = localStorage.getItem('metrolab_user');
      const user = userStr ? JSON.parse(userStr) : {};

      const newSale: Sale = {
        id: Math.random().toString(36).substr(2, 9),
        client_id: formData.client_id,
        client_name: client?.name || 'Cliente',
        amount: formData.amount,
        items_count: formData.items_count,
        date: new Date().toISOString(),
        user_id: user.id || '1'
      };

      console.log('[Sales] Payload preparado:', newSale);

      const result: any = await db.sales.save(newSale);
      
      if (!result.error) {
        console.log('[Sales] Salvo com sucesso!');
        
        const loadPromise = loadData();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        setOperationSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setIsProcessing(false);
          setOperationSuccess(false);
        }, 1200);
      } else {
        console.error('[Sales] Erro retornado pelo banco:', result.error);
        setOperationError(result.error.message || "Erro ao salvar venda.");
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('[Sales] Erro inesperado:', error);
      setOperationError(error.message || "Falha de conexão.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800">Vendas</h2>
          <p className="text-gray-500">Controle financeiro e saída de mercadorias.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md">
          <Plus className="w-5 h-5" />
          <span>Nova Venda</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center space-x-4">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign /></div>
          <div>
            <p className="text-sm text-gray-500">Total em Vendas</p>
            <p className="text-2xl font-bold">R$ {(sales.reduce((acc, s) => acc + (s.amount || 0), 0)).toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl"><ShoppingCart /></div>
          <div>
            <p className="text-sm text-gray-500">Pedidos Realizados</p>
            <p className="text-2xl font-bold">{sales.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Itens</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.length > 0 ? sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{s.client_name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.items_count} un</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">R$ {(s.amount || 0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="p-2 text-gray-400 hover:text-emerald-600"><Receipt className="w-4 h-4" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">Nenhuma venda registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="px-8 py-6 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Registrar Nova Venda</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700">Cliente *</label>
                <select required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none"
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Quantidade de Itens</label>
                  <input type="number" min="1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none"
                    value={formData.items_count} onChange={e => setFormData({...formData, items_count: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700">Valor Total (R$) *</label>
                  <input required type="number" step="0.01" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none"
                    value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-5">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold">Finalizar Venda</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Overlay de Processamento */}
      {(isProcessing || operationError || operationSuccess) && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl text-center border border-slate-100 animate-slideUp">
            {isProcessing && !operationError && !operationSuccess && (
              <div className="space-y-4">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                <p className="font-bold text-gray-800 uppercase text-lg">Processando Venda...</p>
              </div>
            )}

            {operationError && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-800 uppercase text-lg">Erro na Operação</p>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl break-all">{operationError}</p>
                <button onClick={() => setOperationError(null)} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest">
                  Fechar
                </button>
              </div>
            )}

            {operationSuccess && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <Receipt className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-800 uppercase text-lg">Venda Registrada!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

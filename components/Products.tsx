
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Save, Loader2, AlertCircle, CheckCircle2,
  Boxes, AlertTriangle, Copy, Check, Trash, Info, Tag, Truck, ShieldCheck, 
  FileText, Image as ImageIcon, Upload, Camera, Calendar, History
} from 'lucide-react';
import { Product } from '../types';
import { db } from '../services/supabase';

type ProductTab = 'principal' | 'estoque' | 'tecnico' | 'logistica';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductTab>('principal');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState: Partial<Product> = {
    name: '',
    brand: '',
    model: '',
    category: 'GERAL',
    unit: 'UN',
    stock: 0,
    minStock: 0,
    costPrice: 0,
    salePrice: 0,
    location: '',
    warranty: '',
    barcode: '',
    image: '',
    expiry_date: '',
    status: 'active'
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = async () => {
    try {
      const data = await db.products.getAll();
      setProducts(data || []);
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
    }
  };

  useEffect(() => { 
    loadData();
    const sub = db.subscribe('products', loadData);
    return () => { sub.unsubscribe(); };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr + 'T23:59:59');
    return expiry < new Date();
  };

  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, field: 'costPrice' | 'salePrice') => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = rawValue === "" ? 0 : Number(rawValue) / 100;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("A imagem é muito grande. Tente uma foto de até 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return alert('O nome do produto é obrigatório.');
    
    setIsProcessing(true);
    setOperationError(null);
    setOperationSuccess(false);

    try {
      const productData = {
        ...formData,
        id: editingProduct?.id,
        expiry_date: formData.expiry_date === "" ? null : formData.expiry_date
      };

      console.log("[Products] Iniciando salvamento...", productData);
      const result: any = await db.products.save(productData);

      if (!result.error) {
        setOperationSuccess(true);
        
        // Tentamos carregar os dados, mas não deixamos travar a UI se demorar
        try {
          const loadPromise = loadData();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
          await Promise.race([loadPromise, timeoutPromise]);
        } catch (e) {
          console.warn("[Products] loadData demorou ou falhou, mas o save foi ok.");
        }

        setTimeout(() => {
          setShowModal(false);
          setIsProcessing(false);
          setOperationSuccess(false);
          setEditingProduct(null);
          setActiveTab('principal');
        }, 800);
      } else {
        setIsProcessing(false);
        console.error("[Products] Erro retornado pelo banco:", result.error);
        if (result.error.message?.includes('expiry_date')) {
          setOperationError("A coluna 'expiry_date' não foi encontrada no banco. Por favor, execute o script SQL de atualização no Supabase.");
        } else {
          setOperationError(result.error.message || "Erro ao salvar no banco de dados.");
        }
      }
    } catch (e: any) {
      setIsProcessing(false);
      console.error("[Products] Erro inesperado:", e);
      setOperationError(e.message || "Erro inesperado de conexão.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsProcessing(true);
    try {
      await db.products.delete(itemToDelete.id);
      await loadData();
      setItemToDelete(null);
      setIsProcessing(false);
      setOperationSuccess(true);
      setTimeout(() => setOperationSuccess(false), 1500);
    } catch (e: any) {
      setIsProcessing(false);
      setOperationError(e.message);
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode || '').includes(searchTerm)
  );

  return (
    <div className="relative text-left pb-20">
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-[#004282] tracking-tighter uppercase">Produtos</h2>
            <p className="text-sm text-slate-400 font-medium italic mt-1">Gestão de catálogo e estoque Metrolab.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input type="text" placeholder="Buscar no catálogo..." className="h-[56px] w-full md:w-80 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#004282] shadow-sm transition-all font-semibold"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setEditingProduct(null); setFormData(initialFormState); setShowModal(true); }} className="h-[56px] bg-[#74C044] text-white px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center space-x-3 shadow-lg hover:bg-[#65a83b] transition-all transform active:scale-95">
              <Plus className="w-5 h-5" />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Item / Marca</th>
                  <th className="px-8 py-6">Categoria</th>
                  <th className="px-8 py-6">Validade</th>
                  <th className="px-8 py-6">Saldo</th>
                  <th className="px-8 py-6 text-right">Venda (R$)</th>
                  <th className="px-8 py-6 text-center w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.length > 0 ? filteredProducts.map(p => {
                  const expired = isExpired(p.expiry_date);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 group cursor-pointer transition-colors" onClick={() => { setEditingProduct(p); setFormData({...p} as any); setShowModal(true); }}>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 uppercase text-sm group-hover:text-[#004282] transition-colors">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.brand || '---'} {p.model || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase">{p.category || 'GERAL'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          {expired && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <span className={`text-xs font-black uppercase tracking-tight ${expired ? 'text-red-600' : 'text-slate-500'}`}>
                            {formatDate(p.expiry_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-black ${p.stock <= (p.minStock || 0) ? 'text-red-500' : 'text-slate-700'}`}>{p.stock}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{p.unit}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-800">{formatCurrency(p.salePrice || 0)}</td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setFormData({...p} as any); setShowModal(true); }} className="p-3 bg-slate-100 text-slate-400 hover:text-[#004282] rounded-xl transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(p); }} className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm transform active:scale-90" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-24 text-center opacity-20">
                      <Boxes className="w-16 h-16 mx-auto mb-4" />
                      <p className="font-black uppercase text-[10px] tracking-widest">Sincronizando base de dados...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md overflow-y-auto p-4 md:p-10 animate-fadeIn text-left">
          <div className="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col min-h-[80vh]">
            <div className="px-10 py-6 bg-[#004282] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <Boxes className="w-8 h-8 text-[#74C044]" />
                <h3 className="text-xl font-black uppercase tracking-tight">{editingProduct ? 'Editar Produto' : 'Novo Cadastro'}</h3>
              </div>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>

            <div className="flex border-b border-slate-50 px-10 bg-slate-50/50 shrink-0">
               <button onClick={() => setActiveTab('principal')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'principal' ? 'text-[#004282]' : 'text-slate-400 hover:text-slate-600'}`}>
                Geral
                {activeTab === 'principal' && <div className="absolute bottom-0 left-6 right-6 h-1 bg-[#004282] rounded-full"></div>}
               </button>
               <button onClick={() => setActiveTab('estoque')} className={`px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'estoque' ? 'text-[#004282]' : 'text-slate-400 hover:text-slate-600'}`}>
                Estoque & Preço
                {activeTab === 'estoque' && <div className="absolute bottom-0 left-6 right-6 h-1 bg-[#004282] rounded-full"></div>}
               </button>
            </div>
            
            <div className="p-10 space-y-8 flex-1 overflow-y-auto max-h-[60vh] no-scrollbar">
              {activeTab === 'principal' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 animate-fadeIn">
                  
                  <div className="md:col-span-4 flex flex-col items-center space-y-4">
                    <div className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden group">
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <button onClick={() => setFormData({...formData, image: ''})} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-3">
                          <div className="w-16 h-16 bg-blue-50 text-[#004282] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Arraste uma foto ou<br/>clique para carregar</p>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all">
                      <Camera className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Alterar Foto</span>
                    </button>
                  </div>

                  <div className="md:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Comercial *</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#004282]/5" 
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                        <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none" 
                          value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none"
                          value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option value="GERAL">CATEGORIA GERAL</option>
                          <option value="EQUIPAMENTOS">EQUIPAMENTOS</option>
                          <option value="INSUMOS">INSUMOS</option>
                          <option value="SERVICOS">SERVIÇOS</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none"
                          value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                          <option value="UN">UNIDADE (UN)</option>
                          <option value="CX">CAIXA (CX)</option>
                          <option value="PCT">PACOTE (PCT)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'estoque' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Atual</label>
                          <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none" 
                            value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-1">Mínimo Crítico</label>
                          <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-red-500 outline-none" 
                            value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#004282] uppercase tracking-widest ml-1 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-2" /> Data de Validade
                        </label>
                        <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#004282]/5" 
                          value={formData.expiry_date || ''} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo (R$)</label>
                          <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none" 
                            value={formatCurrency(formData.costPrice || 0)} onChange={e => handleCurrencyInput(e, 'costPrice')} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Venda (R$)</label>
                          <input type="text" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-[#004282] outline-none" 
                            value={formatCurrency(formData.salePrice || 0)} onChange={e => handleCurrencyInput(e, 'salePrice')} />
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
            
            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-4 shrink-0">
               <button onClick={() => setShowModal(false)} className="px-8 py-4 font-black text-slate-400 uppercase text-xs">Descartar</button>
               <button onClick={handleSave} disabled={isProcessing} className="w-full sm:w-auto bg-[#004282] text-white px-16 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-[#74C044]" /> : <Save className="w-4 h-4 text-[#74C044]" />}
                  <span>{isProcessing ? 'Sincronizando...' : 'Concluir Alterações'}</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[4000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-red-50 text-center animate-slideUp">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Remover do Catálogo?</h3>
            <p className="text-sm text-slate-500 mb-8">O item <span className="font-bold text-red-600">{itemToDelete.name}</span> será excluído permanentemente.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setItemToDelete(null)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Manter Item</button>
              <button onClick={handleDelete} className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-200">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE STATUS */}
      {(isProcessing || operationError || operationSuccess) && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center animate-slideUp">
             {isProcessing && !operationSuccess && (
               <div className="space-y-6">
                 <Loader2 className="w-16 h-16 text-[#004282] animate-spin mx-auto" />
                 <p className="font-black text-slate-700 uppercase tracking-widest text-xs">Comunicando com Supabase...</p>
               </div>
             )}
             {operationSuccess && (
               <div className="space-y-6">
                 <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                 </div>
                 <p className="font-black text-slate-800 text-2xl uppercase tracking-tighter">Sincronizado!</p>
               </div>
             )}
             {operationError && (
               <div className="space-y-6">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-inner">
                    <AlertCircle className="w-10 h-10" />
                 </div>
                 <p className="font-black text-red-600 uppercase text-xs tracking-widest">Erro na Operação</p>
                 <div className="bg-red-50 p-4 rounded-2xl text-left border border-red-100">
                    <p className="text-[10px] text-red-800 font-mono break-words">{String(operationError)}</p>
                 </div>
                 <button onClick={() => setOperationError(null)} className="w-full py-4 bg-[#004282] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Fechar</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

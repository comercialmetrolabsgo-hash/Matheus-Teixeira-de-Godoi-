
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Edit2, X, Trash2, Save, CheckCircle, Eraser, Loader2, 
  Camera, Image as ImageIcon, PlusCircle, Wrench, Check, Share2, 
  Printer, FileText, ExternalLink, ShieldCheck, Download, FileDown, 
  ImageIcon as ImageIconLucide, ImagePlus, Truck, MapPin, Calendar, Clock,
  ChevronRight, AlertCircle, UserCheck, Users
} from 'lucide-react';
import { Service, Client, User as UserType, ServiceTaskType, ServiceAttachment } from '../types';
import { db } from '../services/supabase';
import Logo from './Logo';

type ViewMode = 'list' | 'calendar';
type ModalTab = 'Geral' | 'Anexos' | 'Assinatura' | 'Logística';

const Services: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [taskTypes, setTaskTypes] = useState<ServiceTaskType[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('Geral');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [showQuickTaskType, setShowQuickTaskType] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);

  const initialFormData: Partial<Service> = {
    client_id: '',
    responsible: '',
    description: '',
    status: 'pending',
    date: new Date().toLocaleDateString('en-CA'),
    hour: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    task_type: '',
    priority: 'media',
    price: 0,
    estimated_duration: '',
    external_code: '',
    keywords: '',
    check_in_type: 'Padrão do colaborador',
    use_satisfaction_survey: false,
    auto_send_os: false,
    repeat_task: false,
    team_mode: 'collaborator',
    signature: '',
    signature_name: '',
    signature_cpf: '',
    attachments: []
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { 
    loadData();
    const savedUser = localStorage.getItem('metrolab_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#os-')) {
        const id = hash.replace('#os-', '');
        setTimeout(async () => {
          const srvs = await db.services.getAll();
          const target = srvs.find(s => s.id.toString() === id);
          if (target) handleOpenModal(target);
          window.location.hash = '';
        }, 800);
      }
    };
    checkHash();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [srvs, clis, usrs, tt] = await Promise.all([
        db.services.getAll(),
        db.clients.getAll(),
        db.users.getAll(),
        db.services.getTaskTypes()
      ]);
      setServices(srvs || []);
      setClients(clis || []);
      setUsers(usrs || []);
      setTaskTypes(tt || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (service?: Service) => {
    setQuickTaskName('');
    setShowQuickTaskType(false);
    if (service?.id) {
      setEditingService(service);
      setFormData({ ...service });
    } else {
      setEditingService(null);
      setFormData({ 
        ...initialFormData, 
        responsible: currentUser?.full_name || '' 
      });
    }
    setActiveTab('Geral');
    setShowModal(true);
  };

  const handleSave = async (closeModal: boolean = true) => {
    if (!formData.client_id) return alert('Por favor, selecione um cliente.');
    if (!formData.description) return alert('A descrição da tarefa é obrigatória.');
    
    setIsProcessing(true);
    setOperationError(null);
    setOperationSuccess(false);
    
    console.log('[Services] Iniciando salvamento...', { id: editingService?.id, closeModal });

    try {
      const selectedClient = clients.find(c => String(c.id) === String(formData.client_id));
      
      const hasSignature = formData.signature && formData.signature.length > 200;
      const finalStatus = hasSignature ? 'completed' : (formData.status || 'pending');

      const payload: any = {
        ...formData,
        id: editingService ? editingService.id : undefined,
        client_id: parseInt(String(formData.client_id), 10),
        client_name: selectedClient?.name || 'Cliente Desconhecido',
        status: finalStatus
      };

      console.log('[Services] Payload preparado:', payload);

      const result: any = await db.services.save(payload);
      
      if (!result.error) {
        console.log('[Services] Salvo com sucesso!', result.data);
        
        // Tenta recarregar os dados, mas não deixa travar a UI se demorar
        const loadPromise = loadData();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        setOperationSuccess(true);
        
        if (closeModal) {
          setTimeout(() => {
            setShowModal(false);
            setIsProcessing(false);
            setOperationSuccess(false);
          }, 1000);
        } else {
          const updated = result.data?.[0];
          if (updated) {
            setEditingService(updated);
            setFormData(updated);
          }
          setTimeout(() => {
            setIsProcessing(false);
            setOperationSuccess(false);
          }, 2000);
        }
      } else {
        console.error('[Services] Erro retornado pelo banco:', result.error);
        setOperationError(result.error.message || "Erro ao salvar no banco de dados.");
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('[Services] Erro inesperado:', error);
      setOperationError(error.message || "Falha de conexão ou erro interno.");
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = (service: Service | Partial<Service>) => {
    if (!service.id) return alert("Salve a O.S. antes de gerar o PDF.");
    setIsGeneratingPDF(true);

    const element = document.getElementById(`print-template-${service.id}`);
    if (!element) {
      setIsGeneratingPDF(false);
      return alert("Erro ao localizar template de impressão.");
    }

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `Relatorio-Metrolab-OS-${service.id}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false,
        allowTaint: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
      html2pdf().set(opt).from(element).save()
        .then(() => setIsGeneratingPDF(false))
        .catch(() => {
          setIsGeneratingPDF(false);
          alert("Erro ao processar PDF.");
        });
    } else {
      setIsGeneratingPDF(false);
      alert("Motor de PDF não carregado.");
    }
  };

  const handleShare = (id: string | number) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?sign_os=${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
    alert("Link de assinatura externa copiado!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: ServiceAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          url: reader.result as string,
          name: file.name,
          created_at: new Date().toISOString()
        };
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    if (e.touches) e.preventDefault();
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    if (e.touches) e.preventDefault();
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    setFormData(prev => ({ 
      ...prev, 
      signature: dataUrl,
      status: 'completed'
    }));
    alert("Assinatura capturada! Clique em Salvar para concluir.");
  };

  const saveQuickTaskType = async () => {
    if (!quickTaskName.trim()) return;
    setIsActionLoading(true);
    try {
      const res: any = await db.services.saveTaskType(quickTaskName.trim());
      if (!res.error) {
        const allTypes = await db.services.getTaskTypes();
        setTaskTypes(allTypes);
        setFormData(prev => ({ ...prev, task_type: quickTaskName.trim() }));
        setShowQuickTaskType(false);
        setQuickTaskName('');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const getClientData = (id: string | number) => {
    return clients.find(c => String(c.id) === String(id));
  };

  return (
    <div className="pb-20 text-left">
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-[#004282] uppercase tracking-tighter">Serviços e O.S.</h2>
            <p className="text-sm text-slate-400 italic font-medium">Controle operacional Metrolab's.</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-[#00c996] text-white px-8 py-4 rounded-2xl font-black flex items-center space-x-3 shadow-lg hover:scale-105 transition-all uppercase text-xs tracking-widest">
             <PlusCircle className="w-5 h-5" />
             <span>Abrir Chamado</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex">
           <button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'calendar' ? 'bg-[#004282] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Calendário</button>
           <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-[#004282] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Lista de O.S.</button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                   <th className="px-8 py-6">ID / Status</th>
                   <th className="px-8 py-6">Contratante</th>
                   <th className="px-8 py-6">Agendamento</th>
                   <th className="px-8 py-6">Tipo</th>
                   <th className="px-8 py-6 text-center">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 cursor-pointer transition-all group" onClick={() => handleOpenModal(s)}>
                     <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${s.status === 'completed' ? 'bg-[#00c996]' : s.status === 'in_progress' ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
                          <div>
                            <p className="text-sm font-black text-slate-800">#{s.id.toString().slice(0,6).toUpperCase()}</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.status === 'completed' ? 'text-[#00c996]' : 'text-slate-400'}`}>
                              {s.status === 'completed' ? 'Finalizada' : s.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <p className="text-sm font-black text-[#004282] uppercase line-clamp-1">{s.client_name || 'NÃO IDENTIFICADO'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.responsible}</p>
                     </td>
                     <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-700">{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        <p className="text-[10px] font-bold text-slate-400">{s.hour}</p>
                     </td>
                     <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">{s.task_type || 'OUTROS'}</span>
                     </td>
                     <td className="px-8 py-6 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleDownloadPDF(s)} disabled={isGeneratingPDF} className="p-3 bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm">
                             {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleShare(s.id)} className={`p-3 rounded-xl transition-all shadow-sm ${copiedId === s.id ? 'bg-[#00c996] text-white' : 'bg-slate-50 text-slate-400 hover:text-[#00c996]'}`}>
                            {copiedId === s.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleOpenModal(s)} className="p-3 bg-slate-50 text-slate-300 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                        </div>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-10 animate-fadeIn text-left">
          <div className="bg-white w-full max-w-[1250px] h-full md:h-auto md:max-h-[92vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-white shrink-0">
              {(['Geral', 'Anexos', 'Assinatura', 'Logística'] as ModalTab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-6 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600"></div>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-10 no-scrollbar bg-[#f8fafc]">
              {activeTab === 'Geral' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Unidade</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
                          value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                          <option value="">Selecione...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-slate-50">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Responsável Técnico</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
                          value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value})}>
                          <option value="">Selecione...</option>
                          {users.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                            <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none" 
                              value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                            <input type="time" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none" 
                              value={formData.hour} onChange={e => setFormData({...formData, hour: e.target.value})} />
                         </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-slate-50">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                        <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-indigo-600 outline-none uppercase text-xs" 
                          value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                          <option value="baixa">BAIXA</option>
                          <option value="media">MÉDIA</option>
                          <option value="alta">ALTA</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
                    <div className="space-y-4">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Relatório Técnico de Atividades</label>
                       <textarea rows={10} className="w-full bg-slate-50 rounded-[2rem] p-8 text-sm font-medium text-slate-700 outline-none border-2 border-transparent focus:border-indigo-100 transition-all resize-none leading-relaxed placeholder:text-slate-300 shadow-inner" 
                        placeholder="Descreva detalhadamente o serviço executado, peças trocadas e observações técnicas..." 
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-2">
                         <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Tarefa</label>
                            <button type="button" onClick={() => setShowQuickTaskType(true)} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Adicionar Novo</button>
                         </div>
                         {showQuickTaskType ? (
                           <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-2xl border-2 border-indigo-100 animate-fadeIn">
                             <input type="text" autoFocus className="flex-1 bg-transparent border-none outline-none text-xs font-bold" 
                               placeholder="NOME" value={quickTaskName} onChange={e => setQuickTaskName(e.target.value.toUpperCase())} />
                             <button type="button" onClick={saveQuickTaskType} className="text-green-500 hover:scale-110 transition-transform"><Check className="w-5 h-5"/></button>
                             <button type="button" onClick={() => setShowQuickTaskType(false)} className="text-red-400 hover:scale-110 transition-transform"><X className="w-5 h-5"/></button>
                           </div>
                         ) : (
                           <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-50" 
                             value={formData.task_type} onChange={e => setFormData({...formData, task_type: e.target.value})}>
                              <option value="">Selecione...</option>
                              {taskTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                           </select>
                         )}
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da O.S.</label>
                         <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black text-green-600 outline-none uppercase" 
                          value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                            <option value="pending">PENDENTE</option>
                            <option value="in_progress">EM EXECUÇÃO</option>
                            <option value="completed">FINALIZADA / ASSINADA</option>
                         </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Anexos' && (
                <div className="animate-fadeIn max-w-4xl mx-auto space-y-12 text-center">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-16 bg-white border-4 border-dashed border-slate-200 rounded-[4rem] hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm">
                         <div className="w-28 h-28 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                            <ImageIcon className="w-14 h-14" />
                         </div>
                         <p className="font-black uppercase text-base tracking-widest text-slate-800">Carregar da Galeria</p>
                         <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Formatos aceitos: JPG, PNG</p>
                      </button>

                      <button type="button" onClick={() => { if(fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); } }} className="flex flex-col items-center justify-center p-16 bg-white border-4 border-dashed border-slate-200 rounded-[4rem] hover:border-[#00c996] hover:bg-green-50 transition-all group shadow-sm">
                         <div className="w-28 h-28 bg-green-50 text-[#00c996] rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                            <Camera className="w-14 h-14" />
                         </div>
                         <p className="font-black uppercase text-base tracking-widest text-slate-800">Capturar em Campo</p>
                         <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Uso exclusivo em Mobile</p>
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      {(formData.attachments || []).map((att) => (
                        <div key={att.id} className="group relative aspect-square bg-slate-100 rounded-[2.5rem] overflow-hidden border-2 border-slate-200 shadow-xl transform transition-all hover:scale-105">
                           <img src={att.url} className="w-full h-full object-cover" alt="Anexo" />
                           <button type="button" onClick={() => setFormData(prev => ({...prev, attachments: prev.attachments?.filter(a => a.id !== att.id)}))} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'Assinatura' && (
                <div className="flex flex-col items-center justify-center p-10 animate-fadeIn space-y-12 text-center">
                  <div className="w-full max-w-4xl bg-white border-4 border-dashed border-slate-200 rounded-[4rem] overflow-hidden relative shadow-2xl h-[480px]">
                    <canvas ref={canvasRef} width={1000} height={480} className="w-full h-full cursor-crosshair touch-none bg-white"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseOut={() => setIsDrawing(false)}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} />
                    {formData.signature && <img src={formData.signature} className="absolute inset-0 w-full h-full object-contain pointer-events-none bg-white/95" alt="Visto" />}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-200 uppercase tracking-[0.8em] pointer-events-none w-full">Assinatura Digital do Recebedor</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 w-full max-w-3xl text-left">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Signatário</label>
                        <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all" 
                          value={formData.signature_name || ''} onChange={e => setFormData({...formData, signature_name: e.target.value.toUpperCase()})} placeholder="NOME COMPLETO" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento (CPF)</label>
                        <input type="text" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all" 
                          value={formData.signature_cpf || ''} onChange={e => setFormData({...formData, signature_cpf: e.target.value})} placeholder="000.000.000-00" />
                     </div>
                  </div>

                  <div className="flex space-x-6">
                    <button type="button" onClick={() => { const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,1000,480); setFormData(prev => ({...prev, signature: ''})); }} className="px-14 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[12px] uppercase flex items-center space-x-3 hover:bg-slate-200 transition-all shadow-md"><Eraser className="w-5 h-5" /> <span>Limpar Campo</span></button>
                    <button type="button" onClick={saveSignature} className="px-16 py-5 bg-[#004282] text-white rounded-3xl font-black text-[12px] uppercase flex items-center space-x-3 shadow-xl hover:scale-105 transition-all"><CheckCircle className="w-5 h-5 text-[#00c996]" /> <span>Confirmar Visto Digital</span></button>
                  </div>
                </div>
              )}

              {activeTab === 'Logística' && (
                <div className="animate-fadeIn max-w-4xl mx-auto space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center space-x-4 mb-6">
                       <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Truck className="w-8 h-8" /></div>
                       <div>
                          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Vínculo de Logística</h4>
                          <p className="text-xs font-bold text-slate-400">Rastreie peças ou equipamentos vinculados a esta O.S.</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Código de Rastreamento Externo</label>
                       <div className="flex space-x-4">
                          <input type="text" className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-slate-700 outline-none uppercase placeholder:text-slate-200" 
                            placeholder="EX: AA123456789BR" value={formData.external_code || ''} onChange={e => setFormData({...formData, external_code: e.target.value.toUpperCase()})} />
                          <button onClick={() => window.open(`https://www.17track.net/pt#nums=${formData.external_code}`, '_blank')} className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase flex items-center space-x-2 shadow-lg active:scale-95 transition-all">
                             <ExternalLink className="w-4 h-4" />
                             <span>Consultar</span>
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-10 py-4 text-slate-300 font-black uppercase text-[11px] flex items-center space-x-3 hover:text-red-500 transition-colors">
                 <X className="w-5 h-5" /> <span>Descartar Alterações</span>
              </button>
              
              <div className="flex space-x-5 w-full sm:w-auto">
                <button type="button" onClick={() => handleSave(false)} disabled={isLoading} className="flex-1 sm:flex-none bg-[#00c996] text-white px-12 py-5 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center space-x-3 hover:bg-[#00b085] transition-all shadow-lg active:scale-95">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  <span>Manter em Aberto</span>
                </button>
                <button type="button" onClick={() => handleSave(true)} disabled={isLoading} className={`flex-1 sm:flex-none text-white px-20 py-5 rounded-3xl font-black text-[11px] uppercase flex items-center justify-center space-x-3 transition-all shadow-xl active:scale-95 ${formData.status === 'completed' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-[#00c996]'}`}>
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                   <span>{formData.status === 'completed' ? 'Finalizar e Arquivar' : 'Salvar e Fechar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE DE PDF PREMIUM (ESTILO AUVO) */}
      <div className="hidden">
        {services.map(s => {
          const clientData = getClientData(s.client_id);
          return (
            <div key={`print-template-${s.id}`} id={`print-template-${s.id}`} className="bg-white text-black font-sans w-[210mm] min-h-[297mm] flex flex-col p-12">
              {/* CABEÇALHO */}
              <div className="flex justify-between items-start border-b-[6px] border-[#004282] pb-10 mb-10">
                <Logo variant="dark" className="h-24" />
                <div className="text-right">
                  <h1 className="text-3xl font-black text-[#004282] uppercase tracking-tighter leading-none mb-4">Relatório de Atendimento Técnico</h1>
                  <div className="inline-block bg-[#f8fafc] border border-slate-200 px-6 py-4 rounded-3xl">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificação da O.S.</p>
                     <p className="text-3xl font-black text-[#004282]">#{s.id.toString().slice(0,6).toUpperCase()}</p>
                  </div>
                  <div className="mt-6 flex flex-col space-y-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     <p>Emissão: {new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {s.hour}</p>
                     <p className={`${s.status === 'completed' ? 'text-[#00c996]' : 'text-orange-500'}`}>
                       Status Operacional: {s.status === 'completed' ? 'CONCLUÍDA' : 'EM ANDAMENTO'}
                     </p>
                  </div>
                </div>
              </div>

              {/* DADOS DO CLIENTE E DO TÉCNICO */}
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-[#f8fafc] p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                     <Users className="w-5 h-5 text-[#004282]" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade Contratante</p>
                  </div>
                  <p className="font-black text-slate-900 uppercase text-lg leading-tight mb-2">{s.client_name || 'NÃO IDENTIFICADO'}</p>
                  <p className="text-[11px] font-bold text-slate-500 mb-4">{clientData?.razao_social || 'Razão Social não informada'}</p>
                  <div className="h-1 w-12 bg-[#74C044] rounded-full mb-4"></div>
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 italic">
                     <MapPin className="w-3.5 h-3.5" />
                     <p className="line-clamp-2">{clientData?.endereco || 'Endereço não cadastrado'}</p>
                  </div>
                </div>
                <div className="bg-[#f8fafc] p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                       <UserCheck className="w-5 h-5 text-[#004282]" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável Técnico</p>
                    </div>
                    <p className="font-black text-slate-900 uppercase text-lg leading-tight">{s.responsible || 'NÃO ATRIBUÍDO'}</p>
                    <div className="inline-block mt-4 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {s.task_type || 'SERVIÇO GERAL'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase border-t border-slate-200/50 pt-4">
                     <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{s.hour}</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* RELATÓRIO TÉCNICO */}
              <div className="space-y-6 mb-12 flex-1">
                <div className="flex items-center space-x-4 border-b-2 border-slate-100 pb-3">
                   <FileText className="w-5 h-5 text-[#004282]" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-[#004282]">Relatório Detalhado das Atividades</h3>
                </div>
                <div className="p-10 bg-[#f8fafc]/50 border border-slate-100 rounded-[3rem] text-slate-800 leading-relaxed text-sm whitespace-pre-wrap min-h-[350px] shadow-inner font-medium">
                  {s.description || 'Nenhum detalhe técnico registrado neste atendimento.'}
                </div>
              </div>

              {/* ANEXOS / EVIDÊNCIAS FOTOGRÁFICAS */}
              {s.attachments && s.attachments.length > 0 && (
                <div className="space-y-6 mb-12 page-break-before">
                  <div className="flex items-center space-x-4 border-b-2 border-slate-100 pb-3">
                     <ImageIconLucide className="w-5 h-5 text-[#004282]" />
                     <h3 className="text-xs font-black uppercase tracking-widest text-[#004282]">Evidências Fotográficas (Check-out)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {s.attachments.map((att, idx) => (
                      <div key={att.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm aspect-video relative">
                         <img src={att.url} className="w-full h-full object-cover" alt={`Anexo ${idx + 1}`} />
                         <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm text-white px-4 py-1 rounded-full text-[9px] font-black uppercase">FOTO {idx + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ÁREA DE ASSINATURA */}
              <div className="mt-auto pt-12 border-t-2 border-slate-100 flex flex-col items-center">
                {s.signature ? (
                  <div className="flex flex-col items-center animate-fadeIn text-center">
                     <div className="relative mb-6">
                        <img src={s.signature} className="h-32 object-contain relative z-10" alt="Assinatura" />
                        <div className="absolute inset-x-0 bottom-6 h-0.5 bg-black/20"></div>
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00c996] mb-2 flex items-center justify-center">
                       <ShieldCheck className="w-4 h-4 mr-2" /> Documento Autenticado Digitalmente
                     </p>
                     <p className="font-black text-slate-900 uppercase text-xl leading-none">{s.signature_name || 'RECEBEDOR NÃO IDENTIFICADO'}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">CPF: {s.signature_cpf || 'Não Informado'}</p>
                     <p className="text-[8px] text-slate-300 mt-2 uppercase font-bold tracking-tighter italic">ID Único: {Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
                  </div>
                ) : (
                  <div className="w-full max-w-sm text-center">
                     <div className="border-b-4 border-dashed border-slate-200 h-24 mb-6"></div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-slate-300 italic">Aguardando Validação Digital do Cliente</p>
                  </div>
                )}
              </div>

              {/* RODAPÉ INSTITUCIONAL */}
              <div className="pt-12 border-t border-slate-100 flex justify-between items-end opacity-40">
                <div className="text-[8px] font-black uppercase text-slate-400 space-y-1 text-left">
                   <p className="text-slate-900">Metrolab's Engenharia Clínica & Hospitalar</p>
                   <p>CNPJ: 46.809.235/0001-XX | CREA-SP Ativo</p>
                   <p>www.metrolabs.com.br | contato@metrolabs.com.br</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
                    Gerado via Metrolab Management System &copy; {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Overlay de Processamento */}
      {(isProcessing || operationError || operationSuccess) && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl text-center border border-slate-100 animate-slideUp">
            {isProcessing && !operationError && !operationSuccess && (
              <div className="space-y-6">
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="font-black text-slate-800 uppercase tracking-tighter text-xl">Sincronizando...</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Comunicando com o servidor Metrolab</p>
              </div>
            )}

            {operationError && (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <p className="font-black text-slate-800 uppercase tracking-tighter text-xl">Ops! Algo deu errado</p>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-mono text-red-600 break-all leading-relaxed uppercase">{operationError}</p>
                </div>
                <button onClick={() => setOperationError(null)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                  Tentar Novamente
                </button>
              </div>
            )}

            {operationSuccess && (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-50 text-[#00c996] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <p className="font-black text-slate-800 uppercase tracking-tighter text-xl">Sucesso!</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Os dados foram salvos com segurança</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

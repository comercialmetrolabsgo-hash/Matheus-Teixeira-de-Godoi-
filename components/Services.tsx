
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Edit2, X, Trash2, Save, CheckCircle, Eraser, Loader2, 
  Camera, Image as ImageIcon, PlusCircle, Wrench, Check, Share2, 
  Printer, FileText, ExternalLink, ShieldCheck, Download, FileDown, 
  ImageIcon as ImageIconLucide, ImagePlus, Truck, MapPin, Calendar, Clock,
  ChevronRight, AlertCircle, UserCheck, Users, Barcode
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
  const [checklistInput, setChecklistInput] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isCertificateMode, setIsCertificateMode] = useState(false);

  const [showQuickTaskType, setShowQuickTaskType] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');

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
    attachments: [],
    checklist: []
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

  const handleDownloadPDF = (service: Service | Partial<Service>, isCertificate: boolean = false) => {
    if (!service.id) return alert("Salve a O.S. antes de gerar o PDF.");
    setIsGeneratingPDF(true);
    setIsCertificateMode(isCertificate);

    const element = document.getElementById(`print-template-${service.id}`);
    if (!element) {
      setIsGeneratingPDF(false);
      return alert("Erro ao localizar template de impressão.");
    }

    const opt = {
      margin: 0,
      filename: `${isCertificate ? 'CERTIFICADO' : 'OS'}_${service.id}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        logging: false,
        allowTaint: true,
        windowWidth: 1200
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

  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), { task: checklistInput.trim(), completed: false }]
    }));
    setChecklistInput('');
  };

  const toggleChecklistItem = (index: number) => {
    setFormData(prev => {
      const newList = [...(prev.checklist || [])];
      newList[index].completed = !newList[index].completed;
      return { ...prev, checklist: newList };
    });
  };

  const removeChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      checklist: (prev.checklist || []).filter((_, i) => i !== index)
    }));
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

  const handleQuickStatusUpdate = async (service: Service, newStatus: 'pending' | 'in_progress' | 'completed') => {
    setIsActionLoading(true);
    try {
      const payload = { ...service, status: newStatus };
      const result: any = await db.services.save(payload);
      if (!result.error) {
        await loadData();
      } else {
        alert("Erro ao atualizar status: " + result.error.message);
      }
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = 
      s.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesTech = techFilter === 'all' || s.responsible === techFilter;

    return matchesSearch && matchesStatus && matchesTech;
  });

  return (
    <div className="pb-20 text-left">
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100 gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#004282] uppercase tracking-tighter">Serviços e O.S.</h2>
            <p className="text-sm text-slate-400 italic font-medium">Controle operacional Metrolab's.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar O.S..." 
                className="h-[56px] w-full pl-12 pr-12 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-[#004282] shadow-sm transition-all font-semibold"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#004282] transition-colors">
                <Barcode className="w-5 h-5" />
              </button>
            </div>
            <button onClick={() => handleOpenModal()} className="bg-[#00c996] text-white px-8 py-4 rounded-2xl font-black flex items-center space-x-3 shadow-lg hover:scale-105 transition-all uppercase text-xs tracking-widest h-[56px]">
               <PlusCircle className="w-5 h-5" />
               <span className="hidden sm:inline">Abrir Chamado</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
             <button onClick={() => setViewMode('calendar')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'calendar' ? 'bg-[#004282] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Calendário</button>
             <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-[#004282] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Lista de O.S.</button>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center gap-3">
            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-[#004282]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Finalizadas</option>
            </select>

            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-[#004282]"
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
            >
              <option value="all">Todos Técnicos</option>
              {users.map(u => (
                <option key={u.id} value={u.full_name}>{u.full_name}</option>
              ))}
            </select>
          </div>
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
                {filteredServices.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 cursor-pointer transition-all group" onClick={() => handleOpenModal(s)}>
                     <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${s.status === 'completed' ? 'bg-green-50 text-green-600' : s.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {s.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : s.status === 'in_progress' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">#{s.id.toString().slice(0,6).toUpperCase()}</p>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.status === 'completed' ? 'text-green-600' : s.status === 'in_progress' ? 'text-blue-600' : 'text-orange-500'}`}>
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
                          {s.status === 'pending' && (
                            <button 
                              onClick={() => handleQuickStatusUpdate(s, 'in_progress')} 
                              title="Iniciar Atendimento"
                              className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <Loader2 className="w-4 h-4" />
                            </button>
                          )}
                          {s.status === 'in_progress' && (
                            <button 
                              onClick={() => handleOpenModal(s)} 
                              title="Concluir Atendimento"
                              className="p-3 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDownloadPDF(s)} disabled={isGeneratingPDF} title="Gerar O.S." className="p-3 bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm">
                             {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDownloadPDF(s, true)} disabled={isGeneratingPDF} title="Certificado de Manutenção" className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm">
                             {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleShare(s.id)} title="Compartilhar Link" className={`p-3 rounded-xl transition-all shadow-sm ${copiedId === s.id ? 'bg-[#00c996] text-white' : 'bg-slate-50 text-slate-400 hover:text-[#00c996]'}`}>
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
            
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-white shrink-0 items-center justify-between pr-8">
              <div className="flex">
                {(['Geral', 'Anexos', 'Assinatura', 'Logística'] as ModalTab[]).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-6 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600"></div>}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${formData.status === 'completed' ? 'bg-green-100 text-green-600' : formData.status === 'in_progress' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {formData.status === 'completed' ? 'Finalizada' : formData.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                </span>
              </div>
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

                      {editingService && (
                        <div className="pt-6 border-t border-slate-50 space-y-3">
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-300 tracking-widest">
                            <span>Criado em:</span>
                            <span>{new Date(editingService.created_at || '').toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-300 tracking-widest">
                            <span>ID Interno:</span>
                            <span className="text-slate-400">{editingService.id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-10">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
                      <div className="space-y-4">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Relatório Técnico de Atividades</label>
                         <textarea rows={6} className="w-full bg-slate-50 rounded-[2rem] p-8 text-sm font-medium text-slate-700 outline-none border-2 border-transparent focus:border-indigo-100 transition-all resize-none leading-relaxed placeholder:text-slate-300 shadow-inner" 
                          placeholder="Descreva detalhadamente o serviço executado, peças trocadas e observações técnicas..." 
                          value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Checklist de Verificação</label>
                          <div className="flex space-x-2">
                            <input 
                              type="text" 
                              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-300"
                              placeholder="Nova tarefa..."
                              value={checklistInput}
                              onChange={e => setChecklistInput(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && addChecklistItem()}
                            />
                            <button onClick={addChecklistItem} className="p-2 bg-indigo-600 text-white rounded-xl hover:scale-105 transition-all">
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(formData.checklist || []).map((item, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.completed ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                              <div className="flex items-center space-x-3">
                                <button onClick={() => toggleChecklistItem(idx)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${item.completed ? 'bg-green-500 text-white' : 'bg-white border-2 border-slate-200 text-transparent'}`}>
                                  <Check className="w-4 h-4" />
                                </button>
                                <span className={`text-xs font-bold ${item.completed ? 'text-green-700 line-through' : 'text-slate-700'}`}>{item.task}</span>
                              </div>
                              <button onClick={() => removeChecklistItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(formData.checklist || []).length === 0 && (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum item no checklist</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-50">
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
            <div key={`print-template-${s.id}`} id={`print-template-${s.id}`} className={`bg-white text-black font-sans w-[210mm] min-h-[297mm] flex flex-col p-12 relative overflow-hidden ${isCertificateMode ? 'border-[1px] border-slate-200' : ''}`}>
              {/* MARCA D'ÁGUA DE FUNDO */}
              <div className="absolute inset-0 opacity-[0.01] pointer-events-none flex items-center justify-center rotate-[-35deg] scale-150 overflow-hidden">
                <Logo variant="dark" width="800px" className="h-auto" />
              </div>

              {/* CABEÇALHO PROFISSIONAL */}
              <div className="flex justify-between items-start mb-12 relative z-10 border-b-2 border-slate-100 pb-8">
                <div className="flex flex-col space-y-4">
                  <Logo variant="dark" width="280px" className="h-auto" />
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Documento Oficial</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest">Metrolab Management System v2.5</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className={`px-6 py-2 rounded-full mb-4 ${isCertificateMode ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} border border-current opacity-80`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {isCertificateMode ? 'Certificado de Manutenção' : 'Relatório de Serviço'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm min-w-[180px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificação</p>
                    <p className="text-xl font-black text-slate-900">O.S. #{s.id.toString().padStart(4, '0')}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-between items-center">
                      <span className="text-[7px] font-bold text-slate-400 uppercase">Emissão</span>
                      <span className="text-[8px] font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUS E DESTAQUE */}
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${s.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Status Operacional: <span className={s.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}>{s.status === 'completed' ? 'CONCLUÍDA' : 'EM ANDAMENTO'}</span>
                  </p>
                </div>
                {isCertificateMode && (
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Equipamento Certificado</span>
                  </div>
                )}
              </div>

              {/* DADOS DO CLIENTE E DO TÉCNICO */}
              <div className="grid grid-cols-2 gap-6 mb-10 relative z-10">
                <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                     <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        <Users className="w-4 h-4 text-[#004282]" />
                     </div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Unidade Contratante</p>
                  </div>
                  <p className="font-black text-slate-900 uppercase text-sm leading-tight mb-1">{s.client_name || 'NÃO IDENTIFICADO'}</p>
                  <p className="text-[9px] font-bold text-slate-500 mb-2">{clientData?.razao_social || 'Razão Social não informada'}</p>
                  <p className="text-[8px] font-black text-slate-400 mb-4 uppercase tracking-widest">CNPJ/CPF: {clientData?.document || 'NÃO INFORMADO'}</p>
                  <div className="h-1 w-12 bg-[#74C044] rounded-full mb-4"></div>
                  <div className="flex items-center space-x-2 text-[8px] font-bold text-slate-400 italic">
                     <MapPin className="w-3 h-3" />
                     <p className="line-clamp-1">{clientData?.endereco || 'Endereço não cadastrado'}</p>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                          <UserCheck className="w-4 h-4 text-[#004282]" />
                       </div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável Técnico</p>
                    </div>
                    <p className="font-black text-slate-900 uppercase text-sm leading-tight">{s.responsible || 'NÃO ATRIBUÍDO'}</p>
                    <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {s.task_type || 'SERVIÇO GERAL'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase border-t border-slate-200/50 pt-4">
                     <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(s.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>{s.hour}</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* RELATÓRIO TÉCNICO */}
              <div className="space-y-4 mb-10 flex-1 relative z-10 page-break-inside-avoid">
                <div className="flex items-center space-x-4 border-b-2 border-slate-100 pb-2">
                   <FileText className="w-4 h-4 text-[#004282]" />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#004282]">Relatório Detalhado das Atividades</h3>
                </div>
                <div className="p-8 bg-[#f8fafc]/30 border border-slate-100 rounded-3xl text-slate-800 leading-relaxed text-xs whitespace-pre-wrap min-h-[250px] shadow-inner font-medium">
                  {s.description || 'Nenhum detalhe técnico registrado neste atendimento.'}
                </div>
              </div>

              {/* EVIDÊNCIAS FOTOGRÁFICAS */}
              {s.attachments && s.attachments.length > 0 && (
                <div className="space-y-4 mb-10 relative z-10 page-break-inside-avoid">
                  <div className="flex items-center space-x-4 border-b-2 border-slate-100 pb-2">
                     <Camera className="w-4 h-4 text-[#004282]" />
                     <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#004282]">Evidências Fotográficas (Check-out)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {s.attachments.map((att: any, idx: number) => (
                      <div key={att.id} className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-50">
                        <img src={att.url} alt={`Evidência ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                          Foto {idx + 1} • {new Date(att.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ASSINATURAS E VALIDAÇÃO */}
              <div className="mt-auto pt-10 border-t-2 border-slate-100 relative z-10 page-break-inside-avoid">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col items-center space-y-4 w-[250px]">
                    {s.signature ? (
                      <div className="flex flex-col items-center">
                        <img src={s.signature} alt="Assinatura" className="h-16 object-contain mb-2" referrerPolicy="no-referrer" />
                        <div className="w-full h-px bg-slate-300 mb-2"></div>
                        <div className="flex items-center space-x-2 text-emerald-600 mb-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="text-[7px] font-black uppercase tracking-widest">Documento Autenticado Digitalmente</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-900 uppercase">{s.signature_name || 'Recebedor'}</p>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">CPF: {s.signature_cpf || 'NÃO INFORMADO'}</p>
                        <p className="text-[6px] text-slate-300 mt-1 font-mono">ID ÚNICO: {s.id.toString().toUpperCase()}{new Date(s.date).getTime().toString(36).toUpperCase()}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">Aguardando Assinatura</div>
                        <div className="w-full h-px bg-slate-200"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Assinatura do Cliente</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col items-end max-w-[350px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Informações Institucionais</p>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-800 uppercase">Metrolab Engenharia Clínica & Hospitalar</p>
                      <p className="text-[7px] font-bold text-slate-500">CNPJ: 46.809.235/0001-XX | CREA-SP ATIVO</p>
                      <p className="text-[7px] font-bold text-slate-500">www.metrolabs.com.br | contato@metrolabs.com.br</p>
                    </div>
                    <p className="text-[6px] text-slate-300 mt-6 uppercase tracking-widest">Gerado via Metrolab Management System © 2026</p>
                  </div>
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

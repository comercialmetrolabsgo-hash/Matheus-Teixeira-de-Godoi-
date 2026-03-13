
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/supabase';
import { Service, Client } from '../types';
import { CheckCircle, PenTool, X, Save, ShieldCheck, Eraser, AlertCircle, FileText, Loader2, Printer, Download, Share2 } from 'lucide-react';
import Logo from './Logo';

interface ClientSignatureViewProps {
  serviceId: string;
}

const ClientSignatureView: React.FC<ClientSignatureViewProps> = ({ serviceId }) => {
  const [service, setService] = useState<Service | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      const found = await db.services.getById(serviceId);
      if (found) {
        setService(found);
        if (found.signature_name) setName(found.signature_name);
        if (found.signature_cpf) setCpf(found.signature_cpf);
        if (found.status === 'completed') setIsSigned(true);
      }
    };
    fetchService();
  }, [serviceId]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    if (e.touches) e.preventDefault();
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (e.touches) e.preventDefault();
  };

  const handleConfirm = async () => {
    if (!name || !canvasRef.current) return alert("Por favor, informe seu nome e assine no campo indicado.");
    
    setIsLoading(true);
    try {
      const signatureBase64 = canvasRef.current.toDataURL();
      
      const updatedService: any = {
        ...service!,
        status: 'completed' as const, // FORÇA O STATUS
        signature: signatureBase64,
        signature_name: name,
        signature_cpf: cpf
      };
      
      // Removemos campos de sistema para evitar conflitos
      delete updatedService.created_at;

      const result: any = await db.services.save(updatedService);
      
      if (!result.error) {
        setIsSigned(true);
        setService({...service!, status: 'completed', signature: signatureBase64, signature_name: name, signature_cpf: cpf});
      } else {
        alert("Erro ao salvar assinatura: " + result.error.message);
      }
    } catch (error: any) {
      alert("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!service) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <Loader2 className="w-16 h-16 text-[#004282] mx-auto animate-spin" />
        <h1 className="text-2xl font-black text-slate-800 uppercase">Localizando O.S. na Nuvem...</h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="dark" className="h-10" />
          <div className="text-center md:text-right">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
              {isSigned ? 'Relatório de Atendimento' : 'Visto Digital'}
            </h2>
            <p className="text-[10px] font-bold text-[#74C044] uppercase tracking-widest font-mono mt-1">OS-#{service.id.toString().slice(0,6).toUpperCase()}</p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-10 animate-slideUp">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Detalhamento Técnico
              </div>
              {isSigned && (
                <div className="flex items-center space-x-2 text-green-500">
                  <CheckCircle className="w-3 h-3" />
                  <span>CONCLUÍDO</span>
                </div>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidade Contratante</p>
                <p className="font-black text-slate-800 uppercase text-base">{service.client_name}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Responsável Técnico</p>
                <p className="font-bold text-slate-700 uppercase text-base">{service.responsible}</p>
              </div>
              <div className="col-span-full">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Relatório das Atividades</p>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 italic text-slate-600 leading-relaxed text-sm shadow-inner min-h-[120px]">
                  {service.description || 'Nenhum detalhe técnico informado.'}
                </div>
              </div>
            </div>
          </div>

          {!isSigned ? (
            <div className="space-y-8 pt-8 border-t border-slate-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Recebedor</label>
                     <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#004282] transition-all" value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="NOME COMPLETO" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento (CPF/RG)</label>
                     <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:border-[#004282] transition-all" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
                  </div>
               </div>

               <div className="flex flex-col items-center space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assine no campo abaixo:</p>
                  <div className="w-full bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] overflow-hidden shadow-inner relative">
                    <canvas 
                      ref={canvasRef} 
                      width={800} 
                      height={400} 
                      className="w-full h-[280px] md:h-[380px] cursor-crosshair touch-none"
                      onMouseDown={startDrawing} 
                      onMouseMove={draw} 
                      onMouseUp={() => setIsDrawing(false)} 
                      onMouseOut={() => setIsDrawing(false)}
                      onTouchStart={startDrawing} 
                      onTouchMove={draw} 
                      onTouchEnd={() => setIsDrawing(false)} 
                    />
                    <div className="absolute bottom-4 right-4 pointer-events-none opacity-20"><PenTool className="w-12 h-12" /></div>
                  </div>
                  <button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,800,400); }} className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase flex items-center space-x-2 hover:bg-slate-100 rounded-xl transition-all">
                     <Eraser className="w-4 h-4" />
                     <span>Limpar Assinatura</span>
                  </button>
               </div>
               <button onClick={handleConfirm} disabled={isLoading} className="w-full py-7 bg-[#10B981] text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-green-100 flex items-center justify-center space-x-4 transition-all active:scale-95 disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                  <span>{isLoading ? 'Sincronizando...' : 'Confirmar e Arquivar'}</span>
               </button>
            </div>
          ) : (
            <div className="space-y-10 pt-8 border-t border-slate-100 animate-fadeIn">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados do Recebedor</p>
                     <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <p className="font-black text-slate-800 uppercase">{service.signature_name || 'NÃO INFORMADO'}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">DOC: {service.signature_cpf || '---'}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visto Digital Arquivado</p>
                     <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden p-4 flex items-center justify-center h-[120px]">
                        {service.signature ? (
                          <img src={service.signature} className="max-h-full object-contain" alt="Assinatura" />
                        ) : (
                          <p className="text-xs text-slate-300 italic">Nenhuma assinatura registrada.</p>
                        )}
                     </div>
                  </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => window.print()} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-3 hover:bg-black transition-all">
                     <Printer className="w-4 h-4" />
                     <span>Imprimir Relatório</span>
                  </button>
                  <button className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all">
                     <Download className="w-4 h-4" />
                     <span>Baixar Cópia Digital</span>
                  </button>
               </div>
            </div>
          )}
        </div>
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Metrolab's &copy; {new Date().getFullYear()} - Documento Sincronizado e Protegido</p>
      </div>
    </div>
  );
};

export default ClientSignatureView;

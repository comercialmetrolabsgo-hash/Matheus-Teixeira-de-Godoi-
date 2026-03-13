
import React, { useState, useEffect } from 'react';
import { BarChart, Download, FileText, PieChart, TrendingUp, Boxes, Users, Wrench, PackageSearch, ShieldAlert, AlertCircle, Printer, ArrowLeft, Globe, Phone, Mail, CheckCircle2, RefreshCcw } from 'lucide-react';
import { db } from '../services/supabase';
import { Product } from '../types';
import Logo from './Logo';

const Reports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    totalClients: 0,
    activeServices: 0,
    completedServices: 0,
    potentialRevenue: 0,
    lowStockCount: 0
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const productsData = (await db.products.getAll()) || [];
      const clients = (await db.clients.getAll()) || [];
      const services = (await db.services.getAll()) || [];

      setProducts(productsData);

      setStats({
        totalProducts: productsData.length,
        totalStockValue: productsData.reduce((acc: number, p: any) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0),
        totalClients: clients.length,
        activeServices: services.filter((s: any) => s.status !== 'completed').length,
        completedServices: services.filter((s: any) => s.status === 'completed').length,
        potentialRevenue: services.reduce((acc: number, s: any) => acc + (s.price || 0), 0),
        lowStockCount: productsData.filter((p: any) => (p.stock || 0) <= (p.minStock || 0)).length
      });
    } catch (e) {
      console.error("Erro no carregamento de relatórios:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-pdf-content');
    if (!element) return;
    setIsGenerating(true);
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Relatorio-Metrolab-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const logoContainer = clonedDoc.querySelector('.logo-pdf-fix');
          if (logoContainer) {
            (logoContainer as HTMLElement).style.width = '180px';
            (logoContainer as HTMLElement).style.display = 'block';
            (logoContainer as HTMLElement).style.overflow = 'visible';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const html2pdf = (window as any).html2pdf;
    if (html2pdf && typeof html2pdf === 'function') {
      html2pdf().set(opt).from(element).save()
        .then(() => setIsGenerating(false))
        .catch((err: any) => {
          console.error("Erro ao gerar PDF:", err);
          setIsGenerating(false);
          alert("Erro ao gerar PDF. Tente novamente.");
        });
    } else {
      setIsGenerating(false);
      alert("O motor de PDF ainda está carregando ou não está disponível. Por favor, aguarde alguns segundos e tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCcw className="w-10 h-10 text-[#004282] animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Processando Inteligência de Dados...</p>
      </div>
    );
  }

  if (isPrinting) {
    return (
      <div className="fixed inset-0 z-[1000] bg-gray-100 overflow-y-auto">
        <div className="no-print sticky top-0 bg-[#004282] text-white p-4 flex justify-between items-center shadow-xl z-50">
          <button onClick={() => setIsPrinting(false)} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-all"><ArrowLeft className="w-5 h-5" /><span>Voltar ao Sistema</span></button>
          <div className="flex items-center space-x-4">
            <button onClick={handleDownloadPDF} disabled={isGenerating} className={`${isGenerating ? 'bg-gray-400' : 'bg-[#00CC00] hover:bg-[#00b300]'} text-white px-6 py-2.5 rounded-xl font-black flex items-center space-x-2 shadow-lg uppercase text-xs transition-all`}>
              {isGenerating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Processando...</span></> : <><Download className="w-4 h-4" /><span>Baixar Arquivo PDF</span></>}
            </button>
          </div>
        </div>
        <div id="report-pdf-content" className="max-w-[210mm] mx-auto bg-white shadow-2xl my-8 min-h-[297mm] p-[15mm] flex flex-col overflow-hidden relative text-black">
          <div className="flex justify-between items-start mb-10 border-b-[4px] border-[#004282] pb-8 bg-white">
            {/* Container de Logo para o PDF com largura timbrada fixa */}
            <div className="logo-pdf-fix" style={{ width: '180px', display: 'block', overflow: 'visible' }}>
              <Logo variant="dark" className="w-full h-auto" />
            </div>
            <div className="text-right text-black">
              <h1 className="text-2xl font-black text-black uppercase tracking-tight">Relatório de Gestão</h1>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Metrolab's Engenharia Clínica</p>
              <div className="mt-4 text-[9px] font-bold text-gray-500 leading-tight">
                <p>DATA: {new Date().toLocaleDateString('pt-BR')} | HORA: {new Date().toLocaleTimeString('pt-BR')}</p>
                <p>RESPONSÁVEL: ADMINISTRADOR DO SISTEMA</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="border-2 border-black p-4 rounded-2xl bg-white"><p className="text-[8px] font-black uppercase text-gray-600 mb-1">Patrimônio em Estoque</p><p className="text-xl font-black text-black">R$ {stats.totalStockValue.toLocaleString('pt-BR')}</p></div>
            <div className="border-2 border-black p-4 rounded-2xl bg-gray-50"><p className="text-[8px] font-black uppercase text-gray-600 mb-1">Itens Críticos</p><p className="text-xl font-black text-red-600">{stats.lowStockCount}</p></div>
            <div className="border-2 border-black p-4 rounded-2xl bg-white"><p className="text-[8px] font-black uppercase text-gray-600 mb-1">Volume de Serviços</p><p className="text-xl font-black text-black">R$ {stats.potentialRevenue.toLocaleString('pt-BR')}</p></div>
          </div>
          <div className="bg-white">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center text-black border-b border-gray-200 pb-2"><Boxes className="w-4 h-4 mr-2 text-[#004282]" /> Inventário Geral</h3>
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-100 text-[9px] font-black uppercase border-y-2 border-black text-black"><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-center">Qtd</th><th className="px-3 py-2 text-right">Custo (un)</th><th className="px-3 py-2 text-right">Total Custo</th></tr></thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(products || []).map(p => (
                  <tr key={p.id} className="text-[10px] text-black">
                    <td className="px-3 py-2 font-bold uppercase">{p.name}</td>
                    <td className={`px-3 py-2 text-center font-black ${(p.stock || 0) <= (p.minStock || 0) ? 'text-red-600' : 'text-black'}`}>{p.stock || 0}</td>
                    <td className="px-3 py-2 text-right">R$ {(p.costPrice || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 text-right font-bold">R$ {((p.costPrice || 0) * (p.stock || 0)).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Relatórios Gerenciais</h2><p className="text-gray-500 font-medium italic">Análise de estoque e indicadores de performance.</p></div>
          <button onClick={() => setIsPrinting(true)} className="bg-[#004282] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center space-x-2 shadow-xl hover:bg-[#003569] transition-all"><Printer className="w-4 h-4" /><span>Abrir Preview PDF</span></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8"><div className="p-4 bg-blue-50 text-[#004282] rounded-2xl"><Boxes className="w-7 h-7" /></div><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Valor em Ativos</span></div>
            <div><p className="text-3xl font-black text-gray-900">R$ {stats.totalStockValue.toLocaleString('pt-BR')}</p><p className="text-[10px] font-black text-gray-400 uppercase mt-2">{stats.totalProducts} produtos ativos</p></div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8"><div className="p-4 bg-red-50 text-red-600 rounded-2xl"><PackageSearch className="w-7 h-7" /></div><span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Saúde do Estoque</span></div>
            <div><p className="text-3xl font-black text-red-600">{stats.lowStockCount}</p><p className="text-[10px] font-black text-gray-400 uppercase mt-2">Abaixo do limite mínimo</p></div>
          </div>
          <div className="bg-[#004282] p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8"><div className="p-4 bg-white/10 text-white rounded-2xl"><TrendingUp className="w-7 h-7" /></div><span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Volume O.S.</span></div>
            <div><p className="text-3xl font-black">R$ {stats.potentialRevenue.toLocaleString('pt-BR')}</p><p className="text-[10px] font-black text-blue-200 uppercase mt-2 italic">Faturamento Bruto em Serviços</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

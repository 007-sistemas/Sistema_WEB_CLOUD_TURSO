import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { RegistroPonto, Cooperado, Hospital } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Search, Filter, Calendar } from 'lucide-react';

// Função helper para converter hex para rgba com transparência
const hexToRgba = (hex: string, alpha: number = 0.1): string => {
  if (hex.startsWith('rgb')) {
    return hex.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
    : `rgba(168, 85, 247, ${alpha})`; // fallback roxo
};

export const Dashboard: React.FC = () => {
  const [pontos, setPontos] = useState<RegistroPonto[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [filterCooperado, setFilterCooperado] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#a855f7'); // fallback roxo
  
  useEffect(() => {
    // Obter cor primária do CSS definida pelo usuário
    const updatePrimaryColor = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const primaryColorVar = rootStyles.getPropertyValue('--primary-color').trim();
      if (primaryColorVar) {
        setPrimaryColor(primaryColorVar);
      }
    };
    
    updatePrimaryColor();
    
    // Escuta mudanças no storage para atualizar a cor quando o usuário troca
    window.addEventListener('storage', updatePrimaryColor);
    return () => window.removeEventListener('storage', updatePrimaryColor);
  }, []);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await StorageService.refreshPontosFromRemote();
        await StorageService.refreshHospitaisFromRemote();
      } catch (error) {
        console.error('Erro ao sincronizar dados:', error);
      }
      setPontos(StorageService.getPontos().reverse());
      setHospitais(StorageService.getHospitais());
    };
    loadData();
  }, []);

  // Simple aggregation for chart (Points per day)
  const getChartData = () => {
    const data: {[key: string]: number} = {};
    pontos.forEach(p => {
      const date = new Date(p.timestamp).toLocaleDateString();
      data[date] = (data[date] || 0) + 1;
    });
    return Object.keys(data).map(date => ({ name: date, Registros: data[date] })).slice(0, 7);
  };

  const filteredPontos = pontos.filter(p => 
    p.cooperadoNome.toLowerCase().includes(filterCooperado.toLowerCase())
  );

  const handleExport = () => {
    alert("Exportando relatório para PDF/Excel... (Simulação)");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard de Produção</h2>
          <p className="text-gray-500">Visão geral da produtividade e plantões</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <p className="text-sm font-medium text-gray-500">Registros Hoje</p>
           <h3 className="text-3xl font-bold text-primary-600 mt-2">
             {pontos.filter(p => new Date(p.timestamp).toDateString() === new Date().toDateString()).length}
           </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <p className="text-sm font-medium text-gray-500">Cooperados Ativos</p>
           <h3 className="text-3xl font-bold text-blue-600 mt-2">
             {StorageService.getCooperados().length}
           </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <p className="text-sm font-medium text-gray-500">Hospitais Cadastrados</p>
           <h3 className="text-3xl font-bold text-amber-500 mt-2">{hospitais.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section - Now spans 3 columns on large screens or we keep layout but remove links */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-6">Volume de Plantões (7 Dias)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    cursor={{fill: hexToRgba(primaryColor, 0.1)}}
                  />
                  <Bar dataKey="Registros" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};
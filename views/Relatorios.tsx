import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { RegistroPonto, Cooperado, Hospital, Setor } from '../types';
import { apiGet } from '../services/api';
import { exportToExcel, exportToPDF, exportToExcelByCooperado, exportToPDFByCooperado } from '../services/reportExport';
import { FileText, Download, Filter, X, FileSpreadsheet, Calendar } from 'lucide-react';

interface RelatorioRow {
  cooperadoNome: string;
  categoriaProfissional: string;
  hospital: string;
  setor: string;
  data: string;
  entrada: string;
  saida: string;
  totalHoras: string;
  status: string;
}

export const Relatorios: React.FC = () => {
        // Handler para exportação
        const handleExport = async (tipo: string, relatorio: string) => {
          setShowExportModal(null);
          // Preparar dados para exportação
          const filterLabels: any = {};
          if (filterHospital) {
            const hospital = hospitais.find(h => h.id === filterHospital);
            filterLabels.hospital = hospital?.nome || filterHospital;
          }
          if (filterSetor) {
            const setor = todosSetores.find(s => s.id.toString() === filterSetor);
            filterLabels.setor = setor?.nome || filterSetor;
          }
          if (filterCooperado) {
            const cooperado = cooperados.find(c => c.id === filterCooperado);
            filterLabels.cooperado = cooperado?.nome || filterCooperado;
          }
          const stats = {
            totalRegistros: relatorioData.length,
            plantoesFechados: relatorioData.filter(r => r.status === 'Fechado').length,
            plantoesAbertos: relatorioData.filter(r => r.status === 'Em Aberto').length,
            totalHoras: relatorioData.reduce((acc, r) => {
              if (r.totalHoras === '--') return acc;
              const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
              return acc + hours + (minutes / 60);
            }, 0).toFixed(1) + 'h'
          };
          try {
            if (tipo === 'pdf') {
              if (relatorio === 'geral') {
                await import('../services/reportExport').then(mod => mod.exportToPDF(relatorioData, filterLabels, stats));
              } else {
                await import('../services/reportExport').then(mod => mod.exportToPDFByCooperado(relatorioData, filterLabels, stats));
              }
            } else {
              if (relatorio === 'geral') {
                await import('../services/reportExport').then(mod => mod.exportToExcel(relatorioData, filterLabels, stats));
              } else {
                await import('../services/reportExport').then(mod => mod.exportToExcelByCooperado(relatorioData, filterLabels, stats));
              }
            }
          } catch (e) {
            alert('Erro ao exportar relatório. Veja o console.');
            console.error(e);
          }
        };
      // Estado para modal de exportação
      const [showExportModal, setShowExportModal] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);
    // Filtro de status
    const [filterStatus, setFilterStatus] = useState<'all' | 'fechados' | 'abertos'>('fechados');
    // Critérios de ordenação
    const orderOptions = [
      { value: 'cooperadoNome', label: 'Nome' },
      { value: 'categoriaProfissional', label: 'Categoria Profissional' },
      { value: 'setor', label: 'Setor' },
      { value: 'data', label: 'Data' },
      { value: 'entrada', label: 'Entrada' },
      { value: 'saida', label: 'Saída' },
    ];
    const [order1, setOrder1] = useState('cooperadoNome');
    const [order2, setOrder2] = useState('data');
    const [order3, setOrder3] = useState('entrada');
    const [order4, setOrder4] = useState('');
  const [logs, setLogs] = useState<RegistroPonto[]>([]);
  const [cooperados, setCooperados] = useState<Cooperado[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<Setor[]>([]);
  const [todosSetores, setTodosSetores] = useState<Setor[]>([]); // Todos os setores de todos os hospitais
  
  // Filtros
  const [filterHospital, setFilterHospital] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterCooperado, setFilterCooperado] = useState('');
  const [filterCooperadoInput, setFilterCooperadoInput] = useState('');
  const [showCooperadoSuggestions, setShowCooperadoSuggestions] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterDataIni, setFilterDataIni] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Dados processados
  const [relatorioData, setRelatorioData] = useState<RelatorioRow[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Carregar todos os setores quando hospitais mudarem
  useEffect(() => {
    if (hospitais.length > 0) {
      loadAllSetores();
    }
  }, [hospitais]);

  // Carregar setores quando hospital for selecionado
  useEffect(() => {
    if (filterHospital) {
      loadSetores(filterHospital);
    } else {
      setSetoresDisponiveis([]);
    }
  }, [filterHospital]);

  // Reprocessar dados quando filtros mudarem
  useEffect(() => {
    processarRelatorio();
  }, [logs, cooperados, hospitais, setoresDisponiveis, todosSetores, filterHospital, filterSetor, filterCooperado, filterCategoria, filterDataIni, filterDataFim, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar dados do Neon antes de carregar do localStorage
      await Promise.all([
        StorageService.refreshPontosFromRemote(),
        StorageService.refreshCooperadosFromRemote(),
        StorageService.refreshHospitaisFromRemote(),
      ]);
    } catch (error) {
      console.error('Erro ao sincronizar dados do Neon:', error);
    }
    
    // Agora carrega dados atualizados do localStorage
    const pontosData = StorageService.getPontos();
    const cooperadosData = StorageService.getCooperados();
    const hospitaisData = StorageService.getHospitais();
    
    setLogs(pontosData);
    setCooperados(cooperadosData);
    setHospitais(hospitaisData);
    setLoading(false);
  };

  const loadSetores = async (hospitalId: string) => {
    try {
      const response = await apiGet<Setor[]>(`hospital-setores?hospitalId=${hospitalId}`);
      if (response && response.length > 0) {
        const normalized = response.map((s: any) => ({ ...s, id: s.id }));
        setSetoresDisponiveis(normalized);
      } else {
        setSetoresDisponiveis([]);
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      setSetoresDisponiveis([]);
    }
  };

  const loadAllSetores = async () => {
    try {
      const globalSetores = await apiGet<Setor[]>('setores');
      const normalized = (globalSetores || []).map((s: any) => ({ ...s, id: s.id }));
      const unique = normalized.filter((setor, index, self) =>
        index === self.findIndex(s => String(s.id) === String(setor.id))
      );
      setTodosSetores(unique);
      console.log('[Relatorios] Setores carregados:', unique);
    } catch (error) {
      console.error('[Relatorios] Erro ao carregar todos os setores:', error);
      setTodosSetores([]);
    }
  };

  const processarRelatorio = () => {
    // Agrupar registros de entrada e saída
    const entradas = logs.filter(l => l.tipo === 'ENTRADA');
    const saidas = logs.filter(l => l.tipo === 'SAIDA');
    const saidasUsadas = new Set<string>();

    const encontrarSaida = (entrada: any) => {
      // 1) relatedId da entrada
      if (entrada.relatedId) {
        const rel = saidas.find(s => s.id === entrada.relatedId && !saidasUsadas.has(s.id));
        if (rel) return rel;
      }
      // 2) relatedId apontando para entrada
      const reverse = saidas.find(s => s.relatedId === entrada.id && !saidasUsadas.has(s.id));
      if (reverse) return reverse;
      // 3) mesmo codigo
      if (entrada.codigo) {
        const sameCode = saidas.find(s => s.codigo === entrada.codigo && !saidasUsadas.has(s.id));
        if (sameCode) return sameCode;
      }
      return undefined;
    };

    const buildSaidaTimestamp = (entradaTs: string, saidaHora: string) => {
      const entradaDate = new Date(entradaTs);
      const [h, m] = saidaHora.split(':').map(Number);
      const base = new Date(
        entradaDate.getFullYear(),
        entradaDate.getMonth(),
        entradaDate.getDate(),
        h,
        m,
        0
      );
      // Se saida menor que entrada, considerar dia seguinte
      if (base.getTime() < entradaDate.getTime()) {
        base.setDate(base.getDate() + 1);
      }
      return base;
    };

    const rows: RelatorioRow[] = [];

    entradas.forEach(entrada => {
      // Encontrar saída correspondente pelo código
      const saida = encontrarSaida(entrada);
      if (saida) {
        saidasUsadas.add(saida.id);
      }
      
      const cooperado = cooperados.find(c => c.id === entrada.cooperadoId);
      const hospital = hospitais.find(h => h.id === entrada.hospitalId);
      const setorId = entrada.setorId ? String(entrada.setorId) : '';
      // Buscar setor apenas no que existe no banco
      const setor = setorId
        ? (todosSetores.find(s => String(s.id) === setorId)
            || setoresDisponiveis.find(s => String(s.id) === setorId))
        : undefined;

      if (!cooperado || !hospital) return;
      // Aplicar filtros
      if (filterHospital && entrada.hospitalId !== filterHospital) return;
      if (filterSetor && String(entrada.setorId || '') !== String(filterSetor)) return;
      if (filterCooperado && entrada.cooperadoId !== filterCooperado) return;
      if (filterCategoria && cooperado.categoriaProfissional !== filterCategoria) return;
      // Filtro de status
      const statusTemp = saida ? 'Fechado' : 'Em Aberto';
      if (filterStatus === 'fechados' && statusTemp !== 'Fechado') return;
      if (filterStatus === 'abertos' && statusTemp !== 'Em Aberto') return;
      const dataEntrada = new Date(entrada.timestamp);
      if (filterDataIni && dataEntrada < new Date(filterDataIni)) return;
      if (filterDataFim && dataEntrada > new Date(filterDataFim + 'T23:59:59')) return;

      const entradaHora = new Date(entrada.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const saidaHora = saida
        ? new Date(saida.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : (entrada.saida || '--:--');
      
      let totalHoras = '--';
      if (saida || entrada.saida) {
        const saidaDate = saida
          ? new Date(saida.timestamp)
          : buildSaidaTimestamp(entrada.timestamp, entrada.saida);
        const diffMs = saidaDate.getTime() - new Date(entrada.timestamp).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        totalHoras = `${diffHours}h ${diffMinutes}m`;
      }

      const status = (saida || (entrada.saida && entrada.saida !== '--:--')) ? 'Fechado' : 'Em Aberto';

      rows.push({
        cooperadoNome: cooperado.nome,
        categoriaProfissional: cooperado.categoriaProfissional || 'N/A',
        hospital: hospital.nome,
        setor: setor?.nome || 'N/A',
        data: dataEntrada.toLocaleDateString('pt-BR'),
        entrada: entradaHora,
        saida: saidaHora,
        totalHoras,
        status
      });
    });

    // Ordenação dinâmica
    const orderFields = [order1, order2, order3, order4].filter(Boolean);
    const compare = (a: any, b: any) => {
      for (const field of orderFields) {
        let valA = a[field] || '';
        let valB = b[field] || '';
        // Datas e horários: comparar como data
        if (field === 'data') {
          const [dA, mA, yA] = a.data.split('/');
          const [dB, mB, yB] = b.data.split('/');
          valA = new Date(`${yA}-${mA}-${dA}`).getTime();
          valB = new Date(`${yB}-${mB}-${dB}`).getTime();
        }
        if (field === 'entrada') {
          valA = a.entrada !== '--:--' ? parseInt(a.entrada.replace(':',''), 10) : 0;
          valB = b.entrada !== '--:--' ? parseInt(b.entrada.replace(':',''), 10) : 0;
        }
        if (field === 'saida') {
          valA = a.saida !== '--:--' ? parseInt(a.saida.replace(':',''), 10) : 0;
          valB = b.saida !== '--:--' ? parseInt(b.saida.replace(':',''), 10) : 0;
        }
        if (valA < valB) return -1;
        if (valA > valB) return 1;
      }
      return 0;
    };
    rows.sort(compare);
    setRelatorioData(rows);
  };

  const handleLimparFiltros = () => {
    setFilterHospital('');
    setFilterSetor('');
    setFilterCooperado('');
    setFilterCooperadoInput('');
    setFilterCategoria('');
    setFilterDataIni('');
    setFilterDataFim('');
  };

  const handleExportarPDF = async () => {
    if (relatorioData.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // O relatorioData já está filtrado pelo status!
    const filterLabels: any = {};
    if (filterHospital) {
      const hospital = hospitais.find(h => h.id === filterHospital);
      filterLabels.hospital = hospital?.nome || filterHospital;
    }
    if (filterSetor) {
      const setor = todosSetores.find(s => s.id.toString() === filterSetor);
      filterLabels.setor = setor?.nome || filterSetor;
    }
    if (filterCooperado) {
      const cooperado = cooperados.find(c => c.id === filterCooperado);
      filterLabels.cooperado = cooperado?.nome || filterCooperado;
    }

    // Exportar apenas os registros filtrados (relatorioData)
    const stats = {
      totalRegistros: relatorioData.length,
      plantoesFechados: relatorioData.filter(r => r.status === 'Fechado').length,
      plantoesAbertos: relatorioData.filter(r => r.status === 'Em Aberto').length,
      totalHoras: relatorioData.reduce((acc, r) => {
        if (r.totalHoras === '--') return acc;
        const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
        return acc + hours + (minutes / 60);
      }, 0).toFixed(1) + 'h'
    };

    await exportToPDF(relatorioData, {
      hospital: filterLabels.hospital || undefined,
      setor: filterLabels.setor || undefined,
      cooperado: filterLabels.cooperado || undefined,
      categoria: filterCategoria || undefined,
      dataIni: filterDataIni || undefined,
      dataFim: filterDataFim || undefined
    }, stats);
  };

  const handleExportarExcel = async () => {
    if (relatorioData.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Preparar dados dos filtros com nomes legíveis
    const filterLabels: any = {};
    if (filterHospital) {
      const hospital = hospitais.find(h => h.id === filterHospital);
      filterLabels.hospital = hospital?.nome || filterHospital;
    }
    if (filterSetor) {
      const setor = todosSetores.find(s => s.id.toString() === filterSetor);
      filterLabels.setor = setor?.nome || filterSetor;
    }
    if (filterCooperado) {
      const cooperado = cooperados.find(c => c.id === filterCooperado);
      filterLabels.cooperado = cooperado?.nome || filterCooperado;
    }

    const stats = {
      totalRegistros: relatorioData.length,
      plantoesFechados: relatorioData.filter(r => r.status === 'Fechado').length,
      plantoesAbertos: relatorioData.filter(r => r.status === 'Em Aberto').length,
      totalHoras: relatorioData.reduce((acc, r) => {
        if (r.totalHoras === '--') return acc;
        const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
        return acc + hours + (minutes / 60);
      }, 0).toFixed(1) + 'h'
    };

    await exportToExcel(relatorioData, {
      hospital: filterLabels.hospital || undefined,
      setor: filterLabels.setor || undefined,
      cooperado: filterLabels.cooperado || undefined,
      categoria: filterCategoria || undefined,
      dataIni: filterDataIni || undefined,
      dataFim: filterDataFim || undefined
    }, stats);
  };

  const handleExportarExcelByCooperado = async () => {
    if (relatorioData.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Preparar dados dos filtros com nomes legíveis
    const filterLabels: any = {};
    if (filterHospital) {
      const hospital = hospitais.find(h => h.id === filterHospital);
      filterLabels.hospital = hospital?.nome || filterHospital;
    }
    if (filterSetor) {
      const setor = todosSetores.find(s => s.id.toString() === filterSetor);
      filterLabels.setor = setor?.nome || filterSetor;
    }
    if (filterCooperado) {
      const cooperado = cooperados.find(c => c.id === filterCooperado);
      filterLabels.cooperado = cooperado?.nome || filterCooperado;
    }

    const stats = {
      totalRegistros: relatorioData.length,
      plantoesFechados: relatorioData.filter(r => r.status === 'Fechado').length,
      plantoesAbertos: relatorioData.filter(r => r.status === 'Em Aberto').length,
      totalHoras: relatorioData.reduce((acc, r) => {
        if (r.totalHoras === '--') return acc;
        const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
        return acc + hours + (minutes / 60);
      }, 0).toFixed(1) + 'h'
    };

    await exportToExcelByCooperado(relatorioData, {
      hospital: filterLabels.hospital || undefined,
      setor: filterLabels.setor || undefined,
      cooperado: filterLabels.cooperado || undefined,
      categoria: filterCategoria || undefined,
      dataIni: filterDataIni || undefined,
      dataFim: filterDataFim || undefined
    }, stats);
  };

  const handleExportarPDFByCooperado = async () => {
    if (relatorioData.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Preparar dados dos filtros com nomes legíveis
    const filterLabels: any = {};
    if (filterHospital) {
      const hospital = hospitais.find(h => h.id === filterHospital);
      filterLabels.hospital = hospital?.nome || filterHospital;
    }
    if (filterSetor) {
      const setor = todosSetores.find(s => s.id.toString() === filterSetor);
      filterLabels.setor = setor?.nome || filterSetor;
    }
    if (filterCooperado) {
      const cooperado = cooperados.find(c => c.id === filterCooperado);
      filterLabels.cooperado = cooperado?.nome || filterCooperado;
    }

    const stats = {
      totalRegistros: relatorioData.length,
      plantoesFechados: relatorioData.filter(r => r.status === 'Fechado').length,
      plantoesAbertos: relatorioData.filter(r => r.status === 'Em Aberto').length,
      totalHoras: relatorioData.reduce((acc, r) => {
        if (r.totalHoras === '--') return acc;
        const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
        return acc + hours + (minutes / 60);
      }, 0).toFixed(1) + 'h'
    };

    await exportToPDFByCooperado(relatorioData, {
      hospital: filterLabels.hospital || undefined,
      setor: filterLabels.setor || undefined,
      cooperado: filterLabels.cooperado || undefined,
      categoria: filterCategoria || undefined,
      dataIni: filterDataIni || undefined,
      dataFim: filterDataFim || undefined
    }, stats);
  };

  const handleGerarPontosTeste = async () => {
    try {
      if (cooperados.length === 0 || hospitais.length === 0) {
        alert('Antes, carregue cooperados e hospitais do Neon.');
        return;
      }

      const setoresFonte: Setor[] = todosSetores.length > 0 ? todosSetores : [
        { id: 1, nome: 'UTI' },
        { id: 2, nome: 'Pronto Atendimento' },
        { id: 3, nome: 'Centro Cirúrgico' },
        { id: 4, nome: 'Ambulatório' },
        { id: 5, nome: 'Maternidade' }
      ];

      const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const randChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

      // Intervalos de plantão permitidos
      const intervalos = [
        { entrada: 7, saida: 19 },   // 07:00 às 19:00
        { entrada: 7, saida: 13 },   // 07:00 às 13:00
        { entrada: 13, saida: 19 },  // 13:00 às 19:00
        { entrada: 19, saida: 7 }    // 19:00 às 07:00 (noturno)
      ];

      const cooperadosAmostra = [...cooperados].sort(() => Math.random() - 0.5).slice(0, Math.min(6, cooperados.length));
      let criados = 0;

      for (const coop of cooperadosAmostra) {
        const quantidadePlantoes = rand(3, 6);
        for (let i = 0; i < quantidadePlantoes; i++) {
          const hospital = randChoice(hospitais);
          const setor = randChoice(setoresFonte);

          const diasAtras = rand(1, 25);
          const dataBase = new Date();
          dataBase.setDate(dataBase.getDate() - diasAtras);
          dataBase.setSeconds(0);

          // Escolher um dos intervalos e gerar entrada/saída
          const intervalo = randChoice(intervalos);
          let entradaHora = intervalo.entrada;
          let saidaHora = intervalo.saida;
          let entradaMin = randChoice([0, 5, 10, 15, 20]);
          let saidaMin = randChoice([0, 5, 10, 15, 20]);

          // Pequena variação de até 10 minutos para mais/menos
          entradaHora += rand(-0.1, 0.1); // até 6 minutos para mais/menos
          if (saidaHora > entradaHora) {
            saidaHora += rand(-0.1, 0.1);
          }

          // Montar datas
          const entradaTimestamp = new Date(dataBase);
          entradaTimestamp.setHours(Math.floor(entradaHora), entradaMin, 0, 0);

          let saidaTimestamp: Date;
          if (intervalo.saida > intervalo.entrada) {
            saidaTimestamp = new Date(entradaTimestamp);
            saidaTimestamp.setHours(intervalo.saida, saidaMin, 0, 0);
          } else {
            // Plantão noturno: saída no dia seguinte
            saidaTimestamp = new Date(entradaTimestamp);
            saidaTimestamp.setDate(saidaTimestamp.getDate() + 1);
            saidaTimestamp.setHours(intervalo.saida, saidaMin, 0, 0);
          }

          const codigo = `MAN-${rand(100000, 999999)}`;
          const entradaId = crypto.randomUUID();

          // 20% dos plantões ficam em aberto (apenas ENTRADA, status Em Aberto)
          const deixaAberto = Math.random() < 0.2;
          const entrada: RegistroPonto = {
            id: entradaId,
            codigo,
            cooperadoId: coop.id,
            cooperadoNome: coop.nome,
            timestamp: entradaTimestamp.toISOString(),
            tipo: 'ENTRADA',
            local: hospital.nome,
            hospitalId: hospital.id,
            setorId: String(setor.id),
            observacao: '',
            status: deixaAberto ? 'Em Aberto' : 'Fechado',
            isManual: true
          } as any;
          StorageService.savePonto(entrada);
          criados++;

          if (!deixaAberto) {
            // Só gera SAÍDA se for plantão fechado
            const saida: RegistroPonto = {
              id: crypto.randomUUID(),
              codigo,
              cooperadoId: coop.id,
              cooperadoNome: coop.nome,
              timestamp: saidaTimestamp.toISOString(),
              tipo: 'SAIDA',
              local: hospital.nome,
              hospitalId: hospital.id,
              setorId: String(setor.id),
              observacao: '',
              status: 'Fechado',
              isManual: true,
              relatedId: entradaId
            } as any;
            StorageService.savePonto(saida);
            criados++;
          }
        }
      }

      await loadData();
      alert(`Pontos de teste gerados: ${criados}`);
    } catch (e) {
      console.error('Erro ao gerar pontos de teste:', e);
      alert('Falha ao gerar pontos de teste. Veja o console.');
    }
  };

  const filteredCooperados = cooperados.filter(c => 
    c.nome.toLowerCase().includes(filterCooperadoInput.toLowerCase())
  );

  const categoriasProfissionais = Array.from(new Set(cooperados.map(c => c.categoriaProfissional).filter(Boolean)));

  return (
      <>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-purple-200 relative animate-fade-in">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                onClick={() => setShowExportModal(null)}
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-purple-700 mb-6 flex items-center gap-2">
                {showExportModal === 'pdf' ? 'Exportar PDF' : 'Exportar Excel'}
              </h2>
              <div className="space-y-4">
                <button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded shadow transition-colors flex items-center justify-center"
                  onClick={() => handleExport(showExportModal, 'geral')}
                >
                  Relatório Geral
                </button>
                <button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded shadow transition-colors flex items-center justify-center"
                  onClick={() => handleExport(showExportModal, 'cooperado')}
                >
                  Relatório por Cooperado
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Relatórios de Produção</h2>
        <div className="flex gap-2">
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow transition-colors flex items-center"
            onClick={() => setShowExportModal('pdf')}
          >
            <span className="mr-2">PDF</span>
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow transition-colors flex items-center"
            onClick={() => setShowExportModal('excel')}
          >
            <span className="mr-2">EXCEL</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-purple-700">
            <Filter className="w-5 h-5" />
            <h3 className="font-semibold">Filtros de Relatório</h3>
          </div>
          <button
            onClick={handleLimparFiltros}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hospital */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade
            </label>
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas as Unidades</option>
              {hospitais.map(h => (
                <option key={h.id} value={h.id}>{h.nome}</option>
              ))}
            </select>
          </div>

          {/* Setor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setor
            </label>
            <select
              value={filterSetor}
              onChange={(e) => setFilterSetor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={!filterHospital}
            >
              <option value="">Todos os Setores</option>
              {setoresDisponiveis.map(s => (
                <option key={s.id} value={s.id.toString()}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Cooperado */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cooperado
            </label>
            <input
              type="text"
              value={filterCooperadoInput}
              onChange={(e) => {
                setFilterCooperadoInput(e.target.value);
                setShowCooperadoSuggestions(true);
                if (!e.target.value) setFilterCooperado('');
              }}
              onFocus={() => setShowCooperadoSuggestions(true)}
              placeholder="Digite o nome..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {showCooperadoSuggestions && filterCooperadoInput && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCooperados.length > 0 ? (
                  filteredCooperados.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setFilterCooperado(c.id);
                        setFilterCooperadoInput(c.nome);
                        setShowCooperadoSuggestions(false);
                      }}
                      className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
                    >
                      {c.nome} - {c.categoriaProfissional}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500">Nenhum cooperado encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Categoria Profissional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria Profissional
            </label>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas as Categorias</option>
              {categoriasProfissionais.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Agrupamento de Data Inicial e Data Final */}
          <div className="col-span-1 md:col-span-2 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filterDataIni}
                onChange={(e) => setFilterDataIni(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status (agora no lugar de Data Final) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Fechados e Abertos</option>
              <option value="fechados">Apenas Fechados</option>
              <option value="abertos">Apenas Abertos</option>
            </select>
          </div>
        </div>
      </div>

      {/* CLASSIFICAR E ORGANIZAR - Prioridade visual */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-primary-200 mb-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-primary-700 text-lg">Classificar e Organizar</span>
            <span className="text-xs text-gray-400">(opcional)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-semibold">1º Critério</label>
              <select className="w-full border rounded p-2" value={order1} onChange={e => setOrder1(e.target.value)}>
                {orderOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold">2º Critério</label>
              <select className="w-full border rounded p-2" value={order2} onChange={e => setOrder2(e.target.value)}>
                <option value="">(nenhum)</option>
                {orderOptions.filter(opt => opt.value !== order1).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold">3º Critério</label>
              <select className="w-full border rounded p-2" value={order3} onChange={e => setOrder3(e.target.value)}>
                <option value="">(nenhum)</option>
                {orderOptions.filter(opt => opt.value !== order1 && opt.value !== order2).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold">4º Critério</label>
              <select className="w-full border rounded p-2" value={order4} onChange={e => setOrder4(e.target.value)}>
                <option value="">(nenhum)</option>
                {orderOptions.filter(opt => opt.value !== order1 && opt.value !== order2 && opt.value !== order3).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ESTATÍSTICAS - Cards menores e menos destacados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg shadow border border-gray-100 flex flex-col items-center">
          <div className="text-xs text-gray-500">Total de Registros</div>
          <div className="text-xl font-bold text-purple-700">{relatorioData.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg shadow border border-gray-100 flex flex-col items-center">
          <div className="text-xs text-gray-500">Plantões Fechados</div>
          <div className="text-xl font-bold text-green-600">{relatorioData.filter(r => r.status === 'Fechado').length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg shadow border border-gray-100 flex flex-col items-center">
          <div className="text-xs text-gray-500">Plantões em Aberto</div>
          <div className="text-xl font-bold text-orange-600">{relatorioData.filter(r => r.status === 'Em Aberto').length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg shadow border border-gray-100 flex flex-col items-center">
          <div className="text-xs text-gray-500">Total de Horas</div>
          <div className="text-xl font-bold text-blue-600">{relatorioData.reduce((acc, r) => {
            if (r.totalHoras === '--') return acc;
            const [hours, minutes] = r.totalHoras.replace('h', '').replace('m', '').split(' ').map(Number);
            return acc + hours + (minutes / 60);
          }, 0).toFixed(1)}h</div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-purple-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cooperado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Unidade</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Setor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Data</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Entrada</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Saída</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-8 w-8 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      <span>Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : relatorioData.length > 0 ? (
                relatorioData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{row.cooperadoNome}</td>
                    <td className="px-4 py-3 text-sm">{row.categoriaProfissional}</td>
                    <td className="px-4 py-3 text-sm">{row.unidade}</td>
                    <td className="px-4 py-3 text-sm">{row.setor}</td>
                    <td className="px-4 py-3 text-sm">{row.data}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{row.entrada}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{row.saida}</td>
                    <td className="px-4 py-3 text-sm font-medium">{row.totalHoras}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Fechado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nenhum registro encontrado com os filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
};

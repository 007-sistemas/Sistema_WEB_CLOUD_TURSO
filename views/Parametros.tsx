import React, { useState, useEffect } from 'react';
import { ParametrosSistema, Feriado } from '../types';
import { ParametrosService } from '../services/parametros';
import { 
  Settings, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle, 
  Type, 
  LayoutDashboard,
  Users,
  Shield,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  AlertCircle
} from 'lucide-react';

type AbaAtiva = 'calendario' | 'relatorios' | 'ponto' | 'justificativas' | 'nomenclatura' | 'dashboard' | 'categorias' | 'validacoes';

export const Parametros: React.FC = () => {
  const [parametros, setParametros] = useState<ParametrosSistema>(ParametrosService.getParametros());
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('calendario');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'success' | 'error', mensagem: string } | null>(null);
  const [novoFeriado, setNovoFeriado] = useState<Feriado>({ data: '', nome: '', tipo: 'nacional' });

  useEffect(() => {
    // Carregar parâmetros do backend ao montar
    const loadParametros = async () => {
      try {
        const remote = await ParametrosService.loadParametrosFromRemote();
        setParametros(remote);
      } catch (error) {
        console.warn('Usando parâmetros locais');
      }
    };
    loadParametros();
  }, []);

  const mostrarToast = (tipo: 'success' | 'error', mensagem: string) => {
    setToast({ tipo, mensagem });
    setTimeout(() => setToast(null), 3000);
  };

  const salvarParametros = async () => {
    setSalvando(true);
    try {
      // Salvar localmente
      ParametrosService.saveParametros(parametros);
      
      // Sincronizar com backend
      await ParametrosService.syncParametrosToRemote(parametros);
      
      mostrarToast('success', 'Parâmetros salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar parâmetros:', error);
      mostrarToast('error', 'Erro ao salvar parâmetros. Verifique a conexão.');
    } finally {
      setSalvando(false);
    }
  };

  const resetarPadrao = () => {
    if (confirm('Tem certeza que deseja resetar todos os parâmetros para o padrão de fábrica? Esta ação não pode ser desfeita.')) {
      ParametrosService.resetParametrosPadrao();
      setParametros(ParametrosService.getParametros());
      mostrarToast('success', 'Parâmetros resetados para o padrão!');
    }
  };

  const adicionarFeriado = () => {
    if (!novoFeriado.data || !novoFeriado.nome) {
      mostrarToast('error', 'Preencha data e nome do feriado');
      return;
    }
    
    setParametros({
      ...parametros,
      calendario: {
        ...parametros.calendario,
        listaFeriados: [...parametros.calendario.listaFeriados, novoFeriado].sort((a, b) => a.data.localeCompare(b.data))
      }
    });
    
    setNovoFeriado({ data: '', nome: '', tipo: 'nacional' });
    mostrarToast('success', 'Feriado adicionado!');
  };

  const removerFeriado = (index: number) => {
    setParametros({
      ...parametros,
      calendario: {
        ...parametros.calendario,
        listaFeriados: parametros.calendario.listaFeriados.filter((_, i) => i !== index)
      }
    });
  };

  const abas = [
    { id: 'calendario', label: 'Calendário', icon: Calendar },
    { id: 'nomenclatura', label: 'Nomenclatura', icon: Type },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'ponto', label: 'Controle de Ponto', icon: Clock },
    { id: 'justificativas', label: 'Justificativas', icon: CheckCircle },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'categorias', label: 'Categorias', icon: Users },
    { id: 'validacoes', label: 'Validações', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {toast.mensagem}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Parâmetros do Sistema</h1>
              <p className="text-gray-500">Configure o sistema de acordo com suas necessidades</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetarPadrao}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <RotateCcw size={20} />
              Resetar Padrão
            </button>
            <button
              onClick={salvarParametros}
              disabled={salvando}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              <Save size={20} />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-thin">
            {abas.map((aba) => {
              const Icon = aba.icon;
              return (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id as AbaAtiva)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  {aba.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* ABA: CALENDÁRIO */}
            {abaAtiva === 'calendario' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Configurações de Calendário</h3>
                  
                  {/* Considerar Finais de Semana */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                    <div>
                      <label className="font-medium text-gray-800">Considerar Finais de Semana</label>
                      <p className="text-sm text-gray-600">Adiciona sufixo "{parametros.nomenclatura.sufixoFDS}" aos turnos em sábados e domingos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={parametros.calendario.considerarFinaisDeSemana}
                      onChange={(e) => setParametros({
                        ...parametros,
                        calendario: { ...parametros.calendario, considerarFinaisDeSemana: e.target.checked }
                      })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Considerar Feriados */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                    <div>
                      <label className="font-medium text-gray-800">Considerar Feriados</label>
                      <p className="text-sm text-gray-600">Adiciona sufixo "{parametros.nomenclatura.sufixoFeriado}" aos turnos em feriados</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={parametros.calendario.considerarFeriados}
                      onChange={(e) => setParametros({
                        ...parametros,
                        calendario: { ...parametros.calendario, considerarFeriados: e.target.checked }
                      })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Formatos */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Formato de Data</label>
                      <select
                        value={parametros.calendario.formatoData}
                        onChange={(e) => setParametros({
                          ...parametros,
                          calendario: { ...parametros.calendario, formatoData: e.target.value as any }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (06/03/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (03/06/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-03-06)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Formato de Hora</label>
                      <select
                        value={parametros.calendario.formatoHora}
                        onChange={(e) => setParametros({
                          ...parametros,
                          calendario: { ...parametros.calendario, formatoHora: e.target.value as any }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="24h">24 horas (19:00)</option>
                        <option value="12h">12 horas (07:00 PM)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lista de Feriados */}
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-3">Feriados Cadastrados ({parametros.calendario.listaFeriados.length})</h4>
                  
                  {/* Adicionar Novo Feriado */}
                  <div className="grid grid-cols-12 gap-2 mb-4">
                    <input
                      type="date"
                      value={novoFeriado.data}
                      onChange={(e) => setNovoFeriado({ ...novoFeriado, data: e.target.value })}
                      className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      placeholder="Nome do feriado"
                      value={novoFeriado.nome}
                      onChange={(e) => setNovoFeriado({ ...novoFeriado, nome: e.target.value })}
                      className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={novoFeriado.tipo}
                      onChange={(e) => setNovoFeriado({ ...novoFeriado, tipo: e.target.value as any })}
                      className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="nacional">Nacional</option>
                      <option value="estadual">Estadual</option>
                      <option value="municipal">Municipal</option>
                    </select>
                    <button
                      onClick={adicionarFeriado}
                      className="col-span-1 flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Tabela de Feriados */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parametros.calendario.listaFeriados.map((feriado, index) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{new Date(feriado.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-sm font-medium">{feriado.nome}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                feriado.tipo === 'nacional' ? 'bg-blue-100 text-blue-700' :
                                feriado.tipo === 'estadual' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {feriado.tipo.charAt(0).toUpperCase() + feriado.tipo.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removerFeriado(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Eye className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <h5 className="font-medium text-blue-900 mb-2">Preview de Nomenclatura</h5>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>• <strong>Segunda-feira:</strong> {parametros.nomenclatura.turnoMatutino}</p>
                        <p>• <strong>Sábado:</strong> {parametros.nomenclatura.turnoMatutino}{parametros.calendario.considerarFinaisDeSemana ? ` ${parametros.nomenclatura.sufixoFDS}` : ''}</p>
                        <p>• <strong>Feriado (Natal):</strong> {parametros.nomenclatura.turnoNoturno}{parametros.calendario.considerarFeriados ? ` ${parametros.nomenclatura.sufixoFeriado}` : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: NOMENCLATURA */}
            {abaAtiva === 'nomenclatura' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Personalizar Nomenclatura</h3>
                  <p className="text-gray-600 mb-6">Define como turnos, cooperados e outros termos aparecem no sistema</p>

                  {/* Turnos */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Turno Matutino</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.turnoMatutino}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, turnoMatutino: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: MT, Manhã, Diurno"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Turno Vespertino</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.turnoVespertino}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, turnoVespertino: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: T, Tarde, Vespertino"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Turno Noturno</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.turnoNoturno}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, turnoNoturno: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: N, Noite, Noturno"
                      />
                    </div>
                  </div>

                  {/* Sufixos */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Sufixo de Final de Semana</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.sufixoFDS}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, sufixoFDS: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: FDS, FS, WEEKEND"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Sufixo de Feriado</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.sufixoFeriado}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, sufixoFeriado: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: F, FER, FERIADO"
                      />
                    </div>
                  </div>

                  {/* Termos Gerais */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Termo para "Cooperado"</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.termoCooperado}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, termoCooperado: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Cooperado, Profissional, Colaborador"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-800 mb-2">Termo para "Plantão"</label>
                      <input
                        type="text"
                        value={parametros.nomenclatura.termoPlantao}
                        onChange={(e) => setParametros({
                          ...parametros,
                          nomenclatura: { ...parametros.nomenclatura, termoPlantao: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Plantão, Turno, Jornada"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview ao Vivo */}
                <div className="mt-6 p-6 bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200 rounded-lg">
                  <h5 className="font-bold text-primary-900 mb-4 flex items-center gap-2">
                    <Eye size={20} />
                    Preview em Tempo Real
                  </h5>
                  <div className="bg-white p-4 rounded-lg shadow-sm space-y-3 text-sm">
                    <p><strong>Exemplo 1:</strong> "O {parametros.nomenclatura.termoCooperado.toLowerCase()} João trabalhou no {parametros.nomenclatura.termoPlantao.toLowerCase()} {parametros.nomenclatura.turnoMatutino}"</p>
                    <p><strong>Exemplo 2:</strong> "Sábado - {parametros.nomenclatura.turnoVespertino} {parametros.nomenclatura.sufixoFDS}"</p>
                    <p><strong>Exemplo 3:</strong> "Natal (25/12) - {parametros.nomenclatura.turnoNoturno} {parametros.nomenclatura.sufixoFeriado}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: RELATÓRIOS (simplificada por enquanto) */}
            {abaAtiva === 'relatorios' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Configurações de Relatórios</h3>
                  <p className="text-gray-600 mb-6">Em breve: personalização de campos, cores, logo e preview em tempo real</p>
                  <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <FileText className="mx-auto text-gray-400 mb-2" size={48} />
                    <p className="text-gray-600">Funcionalidade em desenvolvimento - Fase 2</p>
                  </div>
                </div>
              </div>
            )}

            {/* Demais abas (placeholders) */}
            {['ponto', 'justificativas', 'dashboard', 'categorias', 'validacoes'].includes(abaAtiva) && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {abas.find(a => a.id === abaAtiva)?.label}
                  </h3>
                  <p className="text-gray-600 mb-6">Funcionalidade em desenvolvimento - Fase 2 e 3</p>
                  <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    {React.createElement(abas.find(a => a.id === abaAtiva)!.icon, { 
                      className: "mx-auto text-gray-400 mb-2", 
                      size: 48 
                    })}
                    <p className="text-gray-600">Em breve</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

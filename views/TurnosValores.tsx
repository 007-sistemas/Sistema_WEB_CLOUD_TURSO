import React, { useState, useEffect } from 'react';
import { TurnoPadrao, TurnoUnidade, Hospital } from '../types';
import { apiGet, apiPost, apiDelete } from '../services/api';
import { Clock, Plus, Copy, Edit2, Trash2, Save, X, CheckCircle } from 'lucide-react';

export const TurnosValores: React.FC = () => {
  // NOVA VERSÃO: Apenas cadastro de turnos padrões, sem abas
  const [turnosPadroes, setTurnosPadroes] = useState<TurnoPadrao[]>([]);
  const [formPadrao, setFormPadrao] = useState({
    nome: '',
    horarioInicio: '',
    horarioFim: '',
    toleranciaAntes: 0,
    toleranciaDepois: 0
  });
  const [editandoPadraoId, setEditandoPadraoId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tipo: 'success' | 'error', mensagem: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const padroes = await apiGet<TurnoPadrao[]>('turnos');
        setTurnosPadroes(padroes);
      } catch {
        setTurnosPadroes([]);
      }
    })();
  }, []);

  const mostrarToast = (tipo: 'success' | 'error', mensagem: string) => {
    setToast({ tipo, mensagem });
    setTimeout(() => setToast(null), 3000);
  };

  const salvarTurnoPadrao = async () => {
    if (!formPadrao.nome || !formPadrao.horarioInicio || !formPadrao.horarioFim) {
      mostrarToast('error', 'Preencha todos os campos obrigatórios');
      return;
    }
    const payload = {
      id: editandoPadraoId || undefined,
      nome: formPadrao.nome,
      horario_inicio: formPadrao.horarioInicio,
      horario_fim: formPadrao.horarioFim,
      tolerancia_antes: formPadrao.toleranciaAntes,
      tolerancia_depois: formPadrao.toleranciaDepois
    };
    try {
      await apiPost('turnos', payload);
      const padroes = await apiGet<TurnoPadrao[]>('turnos');
      setTurnosPadroes(padroes);
      mostrarToast('success', editandoPadraoId ? 'Turno padrão atualizado com sucesso!' : 'Turno padrão criado com sucesso!');
      setEditandoPadraoId(null);
      limparFormPadrao();
    } catch (e: any) {
      mostrarToast('error', e?.message || 'Erro ao salvar turno padrão');
    }
  };

  const editarTurnoPadrao = (turno: TurnoPadrao) => {
    setFormPadrao({
      nome: turno.nome,
      horarioInicio: turno.horarioInicio,
      horarioFim: turno.horarioFim,
      toleranciaAntes: turno.toleranciaAntes,
      toleranciaDepois: turno.toleranciaDepois
    });
    setEditandoPadraoId(turno.id);
  };

  const excluirTurnoPadrao = async (id: string) => {
    await apiDelete('turnos', { id });
    try {
      const padroes = await apiGet<TurnoPadrao[]>('turnos');
      setTurnosPadroes(padroes);
    } catch {
      setTurnosPadroes([]);
    }
    mostrarToast('success', 'Turno padrão removido!');
    limparFormPadrao();
  };

  const limparFormPadrao = () => {
    setFormPadrao({
      nome: '',
      horarioInicio: '',
      horarioFim: '',
      toleranciaAntes: 0,
      toleranciaDepois: 0
    });
    setEditandoPadraoId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.tipo === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          {toast.mensagem}
        </div>
      )}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Turnos Padrões</h1>
        {/* Formulário de cadastro de turno padrão */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={formPadrao.nome}
              onChange={e => setFormPadrao({ ...formPadrao, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Início *</label>
            <input
              type="time"
              value={formPadrao.horarioInicio}
              onChange={e => setFormPadrao({ ...formPadrao, horarioInicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário Fim *</label>
            <input
              type="time"
              value={formPadrao.horarioFim}
              onChange={e => setFormPadrao({ ...formPadrao, horarioFim: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tolerância Antes (min)</label>
            <input
              type="number"
              value={formPadrao.toleranciaAntes}
              onChange={e => setFormPadrao({ ...formPadrao, toleranciaAntes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tolerância Depois (min)</label>
            <input
              type="number"
              value={formPadrao.toleranciaDepois}
              onChange={e => setFormPadrao({ ...formPadrao, toleranciaDepois: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          <button
            onClick={salvarTurnoPadrao}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <Save size={20} />
            {editandoPadraoId ? 'Atualizar' : 'Salvar'}
          </button>
          {editandoPadraoId && (
            <button
              onClick={limparFormPadrao}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              <X size={20} />
              Cancelar
            </button>
          )}
        </div>
        {/* Tabela de turnos padrões */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Horário Início</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Horário Fim</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Tolerância Antes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Tolerância Depois</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {turnosPadroes.length > 0 ? (
                  turnosPadroes.map((turno) => (
                    <tr key={turno.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{turno.nome}</td>
                      <td className="px-4 py-3 text-sm">{turno.horarioInicio}</td>
                      <td className="px-4 py-3 text-sm">{turno.horarioFim}</td>
                      <td className="px-4 py-3 text-sm">{turno.toleranciaAntes} min</td>
                      <td className="px-4 py-3 text-sm">{turno.toleranciaDepois} min</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => editarTurnoPadrao(turno)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => excluirTurnoPadrao(turno.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum turno padrão cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const fecharModalClonagem = () => {
    setMostrarModalClonagem(false);
    setHospitalOrigem('');
    setHospitaisDestino([]);
  };

  const toggleHospitalDestino = (hospitalId: string) => {
    if (hospitaisDestino.includes(hospitalId)) {
      setHospitaisDestino(hospitaisDestino.filter(id => id !== hospitalId));
    } else {
      setHospitaisDestino([...hospitaisDestino, hospitalId]);
    }
  };

  const turnosUnidadesFiltrados = turnosUnidades.filter(t => 
    !hospitalSelecionado || t.hospitalId === hospitalSelecionado
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.tipo === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          {toast.mensagem}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="text-primary-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Turnos</h1>
          </div>
          {abaAtiva === 'unidades' && (
            <button
              onClick={() => setMostrarModalClonagem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Copy size={20} />
              Clonar Configurações
            </button>
          )}
        </div>

        {/* Conteúdo: Cadastro de Turnos Padrões */}
        <div className="space-y-6">
            {/* Formulário */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editandoPadraoId ? 'Editar' : 'Cadastrar'} Turno Padrão
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Turno *
                  </label>
                  <input
                    type="text"
                    value={formPadrao.nome}
                    onChange={(e) => setFormPadrao({ ...formPadrao, nome: e.target.value })}
                    placeholder="Ex: MT, N, T"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário Início *
                  </label>
                  <input
                    type="time"
                    value={formPadrao.horarioInicio}
                    onChange={(e) => setFormPadrao({ ...formPadrao, horarioInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário Fim *
                  </label>
                  <input
                    type="time"
                    value={formPadrao.horarioFim}
                    onChange={(e) => setFormPadrao({ ...formPadrao, horarioFim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tolerância Antes (min)
                  </label>
                  <input
                    type="number"
                    value={formPadrao.toleranciaAntes}
                    onChange={(e) => setFormPadrao({ ...formPadrao, toleranciaAntes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tolerância Depois (min)
                  </label>
                  <input
                    type="number"
                    value={formPadrao.toleranciaDepois}
                    onChange={(e) => setFormPadrao({ ...formPadrao, toleranciaDepois: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={salvarTurnoPadrao}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  <Save size={20} />
                  {editandoPadraoId ? 'Atualizar' : 'Salvar'}
                </button>
                {editandoPadraoId && (
                  <button
                    onClick={limparFormPadrao}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    <X size={20} />
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-700 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Horário Início</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Horário Fim</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Tolerância Antes</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Tolerância Depois</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnosPadroes.length > 0 ? (
                      turnosPadroes.map((turno) => (
                        <tr key={turno.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{turno.nome}</td>
                          <td className="px-4 py-3 text-sm">{turno.horarioInicio}</td>
                          <td className="px-4 py-3 text-sm">{turno.horarioFim}</td>
                          <td className="px-4 py-3 text-sm">{turno.toleranciaAntes} min</td>
                          <td className="px-4 py-3 text-sm">{turno.toleranciaDepois} min</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => editarTurnoPadrao(turno)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => excluirTurnoPadrao(turno.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Nenhum turno padrão cadastrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

        {/* Conteúdo da Aba: Turnos por Unidade */}
        {abaAtiva === 'unidades' && (
          <div className="space-y-6">
            {/* Formulário */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editandoUnidadeId ? 'Editar' : 'Vincular'} Turno à Unidade
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Categoria Profissional *
                                  </label>
                                  <select
                                    value={categoriaSelecionada}
                                    onChange={e => setCategoriaSelecionada(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  >
                                    <option value="">Selecione...</option>
                                    {categorias.map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade *
                  </label>
                  <select
                    value={hospitalSelecionado}
                    onChange={(e) => setHospitalSelecionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {hospitais.map((h) => (
                      <option key={h.id} value={h.id}>{h.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Turno Padrão *
                  </label>
                  <select
                    value={turnoPadraoSelecionado}
                    onChange={(e) => handleTurnoPadraoChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {turnosPadroes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.horarioInicio} - {t.horarioFim})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor da Hora (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorHora}
                    onChange={(e) => setValorHora(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={salvarTurnoUnidade}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    <Save size={20} />
                    {editandoUnidadeId ? 'Atualizar' : 'Salvar'}
                  </button>
                  {editandoUnidadeId && (
                    <button
                      onClick={limparFormUnidade}
                      className="ml-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filtro */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Unidade
              </label>
              <select
                value={hospitalSelecionado}
                onChange={(e) => setHospitalSelecionado(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todas as Unidades</option>
                {hospitais.map((h) => (
                  <option key={h.id} value={h.id}>{h.nome}</option>
                ))}
              </select>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-700 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Unidade</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Turno</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Horário</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Valor/Hora</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnosUnidadesFiltrados.length > 0 ? (
                      turnosUnidadesFiltrados.map((turno) => (
                        <tr key={turno.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{turno.hospitalNome}</td>
                          <td className="px-4 py-3 text-sm font-medium">{turno.turnoPadraoNome}</td>
                          <td className="px-4 py-3 text-sm">{turno.categoriaProfissional}</td>
                          <td className="px-4 py-3 text-sm">
                            {turno.horarioInicio} - {turno.horarioFim}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">
                            R$ {turno.valorHora.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => editarTurnoUnidade(turno)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => excluirTurnoUnidade(turno.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Nenhum turno vinculado a unidades
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Clonagem */}
      {mostrarModalClonagem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Clonar Configurações de Turnos</h2>
                <button
                  onClick={fecharModalClonagem}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade de Origem *
                  </label>
                  <select
                    value={hospitalOrigem}
                    onChange={(e) => setHospitalOrigem(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {hospitais.map((h) => (
                      <option key={h.id} value={h.id}>{h.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidades de Destino * (selecione uma ou mais)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                    {hospitais.filter(h => h.id !== hospitalOrigem).map((h) => (
                      <label key={h.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hospitaisDestino.includes(h.id)}
                          onChange={() => toggleHospitalDestino(h.id)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm">{h.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={clonarConfiguracoes}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    <Copy size={20} />
                    Clonar
                  </button>
                  <button
                    onClick={fecharModalClonagem}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

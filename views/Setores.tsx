
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete, apiPut } from '../services/api';
import { Edit2, Trash2, Save, X } from 'lucide-react';
interface Setor { id: string; nome: string; }

const SETORES_KEY = 'biohealth_setores';

// Fallback localStorage functions
const getSetoresLocal = (): Setor[] => {
  const data = localStorage.getItem(SETORES_KEY);
  if (!data) return [];
  // Convert old format (id: number) to new format (id: string)
  const parsed = JSON.parse(data);
  return parsed.map((s: any) => ({ id: String(s.id), nome: s.nome }));
};

const saveSetorLocal = (setor: Setor) => {
  const setores = getSetoresLocal();
  setores.push(setor);
  localStorage.setItem(SETORES_KEY, JSON.stringify(setores));
};

export const SetoresView: React.FC = () => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [searchNome, setSearchNome] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [statusSetores, setStatusSetores] = useState<Record<string, 'ATIVO' | 'INATIVO'>>({});
  const [vinculos, setVinculos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSetores();
    // Carrega status e vínculos dos setores
    // TODO: Buscar status real do setor e se possui vínculo
    // Exemplo: setStatusSetores({ '1': 'ATIVO', '2': 'INATIVO' })
    // Exemplo: setVinculos({ '1': true, '2': false })
    // Pode ser implementado via API ou StorageService
  }, []);

  const loadSetores = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Setor[]>('setores');
      const normalized = data.map((s) => ({ ...s, id: String(s.id) }));
      setSetores(normalized);
      setUseLocal(false);
      // Buscar status e vínculos reais
      const pontos = await apiGet<any[]>('pontos');
      const setoresVinculados = new Set(pontos.map(p => String(p.setorId)).filter(Boolean));
      const statusReal: Record<string, 'ATIVO' | 'INATIVO'> = {};
      const vinculosReal: Record<string, boolean> = {};
      normalized.forEach(s => {
        statusReal[s.id] = (s.status === 'INATIVO') ? 'INATIVO' : 'ATIVO';
        vinculosReal[s.id] = setoresVinculados.has(s.id);
      });
      setStatusSetores(statusReal);
      setVinculos(vinculosReal);
    } catch (err) {
      console.warn('API indisponível, usando localStorage:', err);
      setSetores(getSetoresLocal());
      setUseLocal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSetor = async () => {
    if (!novoNome.trim()) return;
    // Impede duplicidade
    if (setores.some(s => s.nome.toLowerCase() === novoNome.trim().toLowerCase())) {
      alert('Já existe um setor com esse nome!');
      return;
    }
    try {
      setLoading(true);
      
            if (useLocal) {
        // Fallback: usar localStorage com ID numérico (string)
        const maxId = Math.max(0, ...setores.map(s => Number(s.id) || 0));
        const novoSetor: Setor = { id: String(maxId + 1), nome: novoNome.trim() };
        saveSetorLocal(novoSetor);
        setSetores(getSetoresLocal());
      } else {
        // API: POST só com o nome, backend gera o ID
        const novoSetor = await apiPost<Setor>('setores', { nome: novoNome.trim() });
        setSetores([...setores, { ...novoSetor, id: String(novoSetor.id) }]);
      }
      
      setNovoNome('');
    } catch (err) {
      console.error('Erro ao criar setor:', err);
      alert('Erro ao criar setor');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setor: Setor) => {
    setEditingId(setor.id);
    setEditingNome(setor.nome);
  };

  const handleSaveEdit = async (setorId: string) => {
    if (!editingNome.trim()) return;
    try {
      setLoading(true);
      if (!useLocal) {
        // Atualizar via API
        try {
          await apiPut('setores', { id: setorId, nome: editingNome.trim() });
          await loadSetores();
        } catch (apiErr) {
          console.warn('API falhou, atualizando localmente:', apiErr);
          const updated = setores.map(s => s.id === setorId ? { ...s, nome: editingNome.trim() } : s);
          setSetores(updated);
          localStorage.setItem(SETORES_KEY, JSON.stringify(updated));
          setUseLocal(true);
        }
      } else {
        // Atualizar localmente
        const updated = setores.map(s => s.id === setorId ? { ...s, nome: editingNome.trim() } : s);
        setSetores(updated);
        localStorage.setItem(SETORES_KEY, JSON.stringify(updated));
      }
      setEditingId(null);
      setEditingNome('');
    } catch (err) {
      console.error('Erro ao editar setor:', err);
      alert('Erro ao editar setor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingNome('');
  };

  const handleDelete = async (setorId: string) => {
    if (!confirm('Tem certeza que deseja excluir este setor?')) return;
    try {
      setLoading(true);
      if (!useLocal) {
        // Deletar via API
        try {
          await apiDelete('setores', { id: setorId });
          await loadSetores();
        } catch (apiErr) {
          console.warn('API falhou, deletando localmente:', apiErr);
          const updated = setores.filter(s => s.id !== setorId);
          setSetores(updated);
          localStorage.setItem(SETORES_KEY, JSON.stringify(updated));
          setUseLocal(true);
        }
      } else {
        // Deletar localmente
        const updated = setores.filter(s => s.id !== setorId);
        setSetores(updated);
        localStorage.setItem(SETORES_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Erro ao excluir setor:', err);
      alert('Erro ao excluir setor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Setores</h2>
      {useLocal && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ API indisponível. Usando armazenamento local (dados não persistem no Turso).
        </div>
      )}
        <div className="flex gap-2 mb-6">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Pesquisar ou adicionar setor"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            disabled={loading}
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
            onClick={handleAddSetor}
            disabled={loading || !novoNome.trim() || setores.some(s => s.nome.toLowerCase() === novoNome.trim().toLowerCase())}
          >
            {loading ? 'Salvando...' : 'Novo Setor'}
          </button>
        </div>
      {loading && setores.length === 0 ? (
        <p className="text-gray-500 text-center">Carregando setores...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {setores
            .filter(s => !novoNome || s.nome.toLowerCase().includes(novoNome.toLowerCase()))
            .map((setor, index) => (
              <div key={setor.id} className="flex flex-col items-start p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
                <span className="font-mono bg-primary-100 text-primary-700 px-3 py-1 rounded-lg text-sm font-semibold mb-2">
                  {index + 1}
                </span>
                {editingId === setor.id ? (
                  <>
                    <input
                      className="border border-primary-300 rounded px-3 py-1 w-full mb-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      value={editingNome}
                      onChange={e => setEditingNome(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(setor.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(setor.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Salvar"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800 mb-2 w-full truncate">{setor.nome}</span>
                    <div className="flex gap-2 mt-auto">
                      {!vinculos[setor.id] && (
                        <>
                          <button
                            onClick={() => handleEdit(setor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(setor.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          const novoStatus = statusSetores[setor.id] === 'ATIVO' ? 'INATIVO' : 'ATIVO';
                          setLoading(true);
                          try {
                            await apiPut('setores', { id: setor.id, status: novoStatus });
                            setStatusSetores(prev => ({ ...prev, [setor.id]: novoStatus }));
                          } catch (err) {
                            alert('Erro ao atualizar status do setor');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className={statusSetores[setor.id] === 'ATIVO' ? "bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold border border-green-200" : "bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold border border-red-200"}
                        disabled={loading}
                      >
                        {statusSetores[setor.id] === 'ATIVO' ? 'Ativo' : 'Desativado'}
                      </button>
                    </div>
                  </>
                )}
                {vinculos[setor.id] && (
                  <span className="text-xs text-gray-500 mt-2">Setor vinculado a registros</span>
                )}
              </div>
            ))}
          {setores.length === 0 && !loading && (
            <div className="text-gray-400 text-center py-6 col-span-full">Nenhum setor cadastrado</div>
          )}
        </div>
      )}
    </div>
  );
};

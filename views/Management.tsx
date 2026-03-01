import React, { useState, useEffect } from 'react';
import { Manager, HospitalPermissions } from '../types';
import { StorageService } from '../services/storage';
import { Plus, Save, Trash2, Edit2, Shield, Lock, X, Briefcase, AlertCircle } from 'lucide-react';

// Função para formatar CPF visualmente
function formatCpf(cpf: string) {
  const onlyNumbers = (cpf || '').replace(/\D/g, '').slice(0, 11);
  return onlyNumbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export const Management: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filterNome, setFilterNome] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [unidades, setUnidades] = useState<{id: string; nome: string}[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [duplicateManager, setDuplicateManager] = useState<Manager | null>(null);
  
  const initialFormState: Manager & { categoria?: string; unidadesTomador?: string[] } = {
    id: '',
    username: '',
    password: '',
    cpf: '',
    email: '',
    categoria: '', // Nova categoria
    unidadesTomador: [], // Unidades para tomador
    permissoes: {
      dashboard: false,
      ponto: false,
      relatorio: false,
      relatorios: false,
      cadastro: false,
      hospitais: false,
      biometria: false,
      gestao: false,
      espelho: false,
      autorizacao: false,
      perfil: false,
      setores: false,
      turnosValores: false
    }
  };
  
  const [formData, setFormData] = useState<Manager & { categoria?: string; unidadesTomador?: string[] }>(initialFormState);
  
  // Garante que todos os gestores tenham acesso a setores e carrega dados iniciais
  useEffect(() => {
    try {
      const all = StorageService.getManagers();
      let changed = false;
      all.forEach(m => {
        if (!m.permissoes) m.permissoes = {} as any;
        
        // Adiciona permissão de setores apenas para gestores e funcionários (não para tomadores)
        if ((m.categoria === 'gestor' || m.categoria === 'funcionario' || !m.categoria) && !m.permissoes.setores) {
          m.permissoes.setores = true;
          changed = true;
        }
        
        // CLEANUP: Remove permissões extras de tomadores (mantém apenas autorizacao e perfil)
        if (m.categoria === 'tomador') {
          const permissoesCorretas = ['autorizacao', 'perfil'];
          let hasExtras = false;
          
          Object.keys(m.permissoes).forEach(key => {
            if (!permissoesCorretas.includes(key) && m.permissoes[key as keyof HospitalPermissions] === true) {
              m.permissoes[key as keyof HospitalPermissions] = false;
              hasExtras = true;
            }
          });
          
          // Garante que as permissões corretas estão ativadas
          if (!m.permissoes.autorizacao) {
            m.permissoes.autorizacao = true;
            changed = true;
          }
          if (!m.permissoes.perfil) {
            m.permissoes.perfil = true;
            changed = true;
          }
          
          if (hasExtras) {
            changed = true;
            console.log(`🧹 Permissões extras removidas do tomador: ${m.username}`);
          }
        }
      });
      if (changed) {
        // Salva todos os managers de uma vez no localStorage
        localStorage.setItem('biohealth_managers', JSON.stringify(all));
        console.log('✅ Managers atualizados e salvos no localStorage');
      }
      setManagers(all); // Usa os managers já processados
      
      // Carregar unidades
      const hospitais = StorageService.getHospitais();
      setUnidades(hospitais.map(h => ({ id: h.id, nome: h.nome })));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setManagers([]);
      setUnidades([]);
    }
  }, []);

  // Limpa filtro de unidade quando a categoria não é tomador
  useEffect(() => {
    if (filterCategoria !== 'tomador' && filterUnidade) {
      setFilterUnidade('');
    }
  }, [filterCategoria]);

  // Atualiza permissões conforme categoria
  const handleCategoriaChange = (categoria: string) => {
    let permissoes: HospitalPermissions = {
      dashboard: false,
      ponto: false,
      relatorio: false,
      relatorios: false,
      cadastro: false,
      hospitais: false,
      biometria: false,
      gestao: false,
      espelho: false,
      autorizacao: false,
      perfil: false,
      setores: false,
      turnosValores: false
    };
    if (categoria === 'gestor') {
      Object.keys(permissoes).forEach(k => permissoes[k as keyof HospitalPermissions] = true);
    } else if (categoria === 'funcionario') {
      Object.keys(permissoes).forEach(k => permissoes[k as keyof HospitalPermissions] = true);
      permissoes.gestao = false;
    } else if (categoria === 'tomador') {
      permissoes.autorizacao = true;
      permissoes.perfil = true;
    }
    setFormData(prev => ({ ...prev, categoria, permissoes }));
  };

  // Seleção de unidades para tomador
  const handleUnidadesTomadorChange = (id: string) => {
    setFormData(prev => {
      const atual = prev.unidadesTomador || [];
      return {
        ...prev,
        unidadesTomador: atual.includes(id)
          ? atual.filter(u => u !== id)
          : [...atual, id]
      };
    });
  };

  const loadManagers = () => {
    setManagers(StorageService.getManagers());
  };

  // Removido: funções de auditoria e consolidação

  const handleNewManager = () => {
    setFormData(initialFormState);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Management.handleSave] Iniciando salvamento...');
    
    if (!formData.username) {
      console.error('[Management.handleSave] Username vazio');
      return alert('Nome de usuário é obrigatório');
    }
    if (!formData.password) {
      console.error('[Management.handleSave] Password vazio');
      return alert('Senha é obrigatória');
    }
    if (!formData.cpf) {
      console.error('[Management.handleSave] CPF vazio');
      return alert('CPF é obrigatório');
    }
    if (!formData.email) {
      console.error('[Management.handleSave] Email vazio');
      return alert('Email é obrigatório');
    }
    
    console.log('[Management.handleSave] Validações passaram. FormData:', formData);
    
    // Verificar se existe CPF duplicado
    const duplicate = StorageService.checkDuplicateCpf(formData.cpf, formData.id);
    if (duplicate) {
      console.warn('[Management.handleSave] CPF duplicado encontrado:', duplicate.username);
      setDuplicateManager(duplicate);
      return;
    }

    const newManager: Manager = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      categoria: formData.categoria,
      unidadesTomador: formData.unidadesTomador || [],
    };

    console.log('💾 Salvando gestor:', newManager.username, 'ID:', newManager.id, 'Permissões:', newManager.permissoes);
    StorageService.saveManager(newManager);
    console.log('✅ Gestor salvo com sucesso');
    
    // Se estiver editando o usuário atual, atualiza a sessão com as novas permissões
    const currentSession = StorageService.getSession();
    if (currentSession && currentSession.user.id === newManager.id) {
      const updatedSession = {
        ...currentSession,
        permissions: newManager.permissoes
      };
      StorageService.setSession(updatedSession);
      
      console.log('🔄 Sessão atualizada com novas permissões:', updatedSession.permissions);
      // Dispara evento customizado para atualizar as abas SOMENTE após salvar
      window.dispatchEvent(new CustomEvent('permissionsUpdated'));
    }

    loadManagers();
    setIsFormOpen(false);
    setFormData(initialFormState);
  };

  const handleAccessDuplicate = () => {
    if (duplicateManager) {
      setFormData(duplicateManager);
      setDuplicateManager(null);
    }
  };

  const handleCloseDuplicateModal = () => {
    setDuplicateManager(null);
  };

  const handleCloseModal = () => {
    setIsFormOpen(false);
    setFormData(initialFormState);
  };

  const handleEdit = (m: Manager) => {
    // Recarrega do localStorage para garantir que tem os dados mais recentes
    const fresh = StorageService.getManagers().find(manager => manager.id === m.id);
    let managerToEdit = fresh || m;
    // Log para debug
    console.log('[handleEdit] Dados do gestor:', managerToEdit);
    // Validação básica
    if (!managerToEdit || typeof managerToEdit !== 'object' || !managerToEdit.username || !managerToEdit.cpf) {
      console.error('[handleEdit] Dados inválidos ou corrompidos:', managerToEdit);
      alert('Erro ao carregar dados do gestor. Dados inválidos ou corrompidos.');
      return;
    }
    setFormData(managerToEdit);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (id === 'master-001') {
        alert('O usuário master não pode ser excluído.');
        return;
    }
    if (confirm('Tem certeza que deseja remover este gestor?')) {
      StorageService.deleteManager(id);
      loadManagers();
    }
  };

  // Permission Labels Map
  const permissionLabels: { key: keyof HospitalPermissions; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'ponto', label: 'Registrar Produção' },
    { key: 'relatorio', label: 'Controle de Produção' },
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'autorizacao', label: 'Justificativa de Plantão' },
    { key: 'cadastro', label: 'Cooperados' },
    { key: 'hospitais', label: 'Unidades' },
    { key: 'setores', label: 'Setores' },
    { key: 'turnosValores', label: 'Turnos' },
    { key: 'biometria', label: 'Biometria' },
    { key: 'gestao', label: 'Gestão de Usuários' },
    { key: 'perfil', label: 'Meu Perfil' },
  ];

  const togglePermission = (key: keyof HospitalPermissions) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        permissoes: {
          ...prev.permissoes,
          [key]: !prev.permissoes[key]
        }
      };
      console.log(`🔘 Toggle ${key}: ${prev.permissoes[key]} → ${!prev.permissoes[key]}`);
      return updated;
    });
  };

  // Filtrar managers
  const managersFiltered = managers.filter(m => {
    // Filtro por nome
    if (filterNome && m.username && !m.username.toLowerCase().includes(filterNome.toLowerCase())) {
      return false;
    }
    // Filtro por categoria
    if (filterCategoria && m.categoria !== filterCategoria) {
      return false;
    }
    // Filtro por unidade (apenas para tomadores)
    if (filterUnidade && m.categoria === 'tomador') {
      const unidadesDoManager = m.unidadesTomador || [];
      if (!unidadesDoManager.includes(filterUnidade)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h2>
          {/* Frase removida conforme solicitado */}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleNewManager}
            className="flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Duplicate Manager Modal - Renderizado Fora */}
      {duplicateManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-fade-in mx-4">
            <div className="flex items-center gap-2 mb-4 text-orange-600">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-gray-800">CPF Já Cadastrado</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Já existe um gestor registrado com este CPF:
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold text-gray-700">Usuário:</span> {duplicateManager.username}</div>
                <div><span className="font-semibold text-gray-700">Email:</span> {duplicateManager.email}</div>
                <div><span className="font-semibold text-gray-700">CPF:</span> {duplicateManager.cpf}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseDuplicateModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccessDuplicate}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Acessar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen ? (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 animate-fade-in max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-700">
              {formData.id ? 'Editar Gestor' : 'Novo Usuário'}
            </h3>
            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Tratamento de erro para dados inválidos */}
          {(!formData || typeof formData !== 'object') && (
            <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg p-4 mb-4 text-center">
              Erro ao carregar dados do gestor. Dados inválidos ou corrompidos.<br />
              Tente novamente ou limpe o cadastro.
            </div>
          )}
          {formData && typeof formData === 'object' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Categoria de usuário */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Categoria de Usuário <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  value={formData.categoria || ''}
                  onChange={e => handleCategoriaChange(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="gestor">Gestor</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="tomador">Tomador</option>
                </select>
              </div>
              {/* Credentials Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Senha
                  </label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="Digite a senha..."
                  />
                </div>
              </div>
                        {/* Unidades para Tomador */}
                        {formData.categoria === 'tomador' && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Unidades para autorizar justificativas</label>
                            <div className="flex flex-wrap gap-2">
                              {unidades.map(u => (
                                <label key={u.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg border border-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={formData.unidadesTomador?.includes(u.id)}
                                    onChange={() => handleUnidadesTomadorChange(u.id)}
                                  />
                                  <span>{u.nome}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
              {/* Identity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">CPF</label>
                  <input
                    required
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formatCpf(formData.cpf)}
                    onChange={e => {
                      // Aceita só números, mas exibe formatado
                      const raw = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({
                        ...prev,
                        cpf: raw
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    required
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              {/* Permissions Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold border-b border-gray-200 pb-2">
                  <Shield className="h-4 w-4" /> Permissões de Acesso
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                  {permissionLabels.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{perm.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.permissoes?.[perm.key] === true}
                            onChange={() => togglePermission(perm.key)}
                          />
                          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Gestor</span>
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Painel de auditoria/consolidação removido */}

          {/* Filtros de Busca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className={`grid grid-cols-1 gap-4 ${filterCategoria === 'tomador' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Usuário</label>
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={filterNome}
                  onChange={e => setFilterNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={filterCategoria}
                  onChange={e => setFilterCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Todas as categorias</option>
                  <option value="gestor">Gestor</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="tomador">Tomador</option>
                </select>
              </div>
              {filterCategoria === 'tomador' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade (Tomadores)</label>
                  <select
                    value={filterUnidade}
                    onChange={e => setFilterUnidade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Todas as unidades</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Managers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managersFiltered.map(m => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group relative">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="bg-primary-50 p-2 rounded-lg flex-shrink-0">
                    <Briefcase className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                     <h3 className="font-bold text-gray-800 truncate" title={m.username}>{m.username}</h3>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">
                          {m.categoria === 'gestor' ? 'Gestor' : m.categoria === 'funcionario' ? 'Funcionário' : m.categoria === 'tomador' ? 'Tomador' : 'Gestor'}
                        </span>
                     </div>
                  </div>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button onClick={() => handleEdit(m)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {m.id !== 'master-001' && (
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Acessos Liberados
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-hidden">
                  {permissionLabels.filter(p => m.permissoes[p.key]).map(p => (
                    <span key={p.key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};

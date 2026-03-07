# Instruções - Habilitar Parâmetros do Sistema

## Problema Resolvido
✅ **Tela branca corrigida!** O componente agora tem tratamento de erro robusto e funciona mesmo sem o backend.

## Status Atual
- ✅ Frontend funcionando (modo offline)
- ✅ Parâmetros salvos no localStorage
- ⚠️ Backend não disponível (tabela não criada)

## Como Habilitar Sincronização com Backend

### Passo 1: Criar a Tabela no Turso

Execute o seguinte SQL no seu banco Turso:

```sql
-- Tabela de Parâmetros do Sistema
CREATE TABLE IF NOT EXISTS parametros_sistema (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_parametros_updated_at ON parametros_sistema(updated_at);
```

#### Opções para executar:

**Opção A - Via linha de comando:**
```bash
turso db shell <nome-do-seu-banco> < api/sql/parametros.sql
```

**Opção B - Via Turso CLI interativo:**
```bash
turso db shell <nome-do-seu-banco>
# Cole o conteúdo do arquivo api/sql/parametros.sql
```

**Opção C - Via Dashboard Web do Turso:**
1. Acesse https://turso.tech/app
2. Selecione seu banco de dados
3. Vá em "SQL Console"
4. Cole e execute o SQL acima

### Passo 2: Verificar Deploy

Aguarde ~2 minutos para o deploy do Cloudflare completar.

Você pode monitorar em:
- https://dash.cloudflare.com → Pages → sistema-web-cloudflare

### Passo 3: Testar

1. **Faça logout do sistema**
2. **Faça login novamente** (para atualizar permissões)
3. Navegue até: **Cadastros → Parâmetros**
4. Verifique se o aviso amarelo "Modo Offline" desapareceu
5. Faça alterações e clique em "Salvar Alterações"
6. Recarregue a página e veja se as configurações persistem

## Funcionalidades Disponíveis

### Aba Calendário
- ✅ Configurar sufixos de final de semana (FDS)
- ✅ Configurar sufixos de feriados (F)
- ✅ Gerenciar lista de feriados (12 nacionais pré-cadastrados)
- ✅ Formato de data e hora
- ✅ Preview em tempo real

### Aba Nomenclatura
- ✅ Personalizar nomes de turnos (MT, T, N)
- ✅ Personalizar sufixos (FDS, F)
- ✅ Personalizar termos (Cooperado, Plantão)
- ✅ Preview em tempo real

### Abas em Desenvolvimento (Fase 2)
- ⏳ Relatórios (customização de campos, cores, logo)
- ⏳ Controle de Ponto (tolerâncias, padrões)
- ⏳ Justificativas (aprovação automática, prazos)
- ⏳ Dashboard (widgets, período padrão)
- ⏳ Categorias (profissionais ativos)
- ⏳ Validações (intervalos, carga horária)

## Dados Padrão

O sistema já vem com:
- 12 feriados nacionais brasileiros de 2026
- Sufixos padrão: FDS (finais de semana) e F (feriados)
- Turnos padrão: MT (Matutino), T (Vespertino), N (Noturno)
- Formato brasileiro: DD/MM/YYYY e 24h

## Modo Offline (Atual)

Enquanto a tabela não for criada:
- ✅ Interface funciona normalmente
- ✅ Salva no localStorage do navegador
- ✅ Configurações persistem localmente
- ⚠️ Não sincroniza entre dispositivos
- ⚠️ Cada gestor tem sua config local

## Troubleshooting

### Ainda vejo tela branca
1. Limpe o cache do navegador (Ctrl+Shift+Del)
2. Force refresh (Ctrl+F5)
3. Abra DevTools (F12) → Console → veja erros
4. Confira se fez logout/login após deploy

### Aviso "Modo Offline" não desaparece
1. Verifique se executou o SQL no Turso
2. Aguarde deploy do Cloudflare completar
3. Veja no Network tab do DevTools se `/api/parametros` retorna 200
4. Se retornar 500, tabela não foi criada corretamente

### Alterações não salvam
1. Abra DevTools → Console
2. Veja se há erros de CORS ou 500
3. Verifique DATABASE_URL e DATABASE_AUTH_TOKEN no Cloudflare
4. Teste endpoint manualmente: `GET https://seu-site.pages.dev/api/parametros`

## Observações

- **Permissão necessária:** `parametros: true` (já habilitada por padrão)
- **Menu:** Cadastros → Parâmetros
- **Sincronização:** Salva local + backend em paralelo
- **Performance:** Cache no localStorage reduz chamadas à API

---

**Última atualização:** 6 de março de 2026  
**Commit:** 3a1c331  
**Desenvolvedor:** Gabriel Gomes

# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.1.0] - 13/11/2025

**Versão Inicial - Lançamento do Sistema SECRIMPO PMDF**

### Adicionado
- Sistema completo de gestão de ocorrências policiais
- Interface moderna com tema oficial da PMDF
- Dashboard interativo com gráficos e estatísticas
- Sistema de autenticação segura com KeyAuth
- Integração completa com Google Sheets
- Sistema TCO (Termo Circunstanciado de Ocorrência)
- Preenchimento automático via upload de documentos
- Exportação avançada para Excel com filtros
- Sistema de atualizações automáticas
- Geração de Termo de Apreensão em PDF

---

#### Interface e Usabilidade
- Tela de login com autenticação KeyAuth
- Dashboard principal com navegação intuitiva
- Formulário de ocorrências organizado por seções
- Sistema de seleção de modo (Manual/Arquivo)
- Tema responsivo com cores da PMDF
- Contador de usuários ativos em tempo real

---

#### Gestão de Ocorrências
- Formulário completo com validação automática
- Campos organizados: Dados da Ocorrência, Item Apreendido, Proprietário, Policial
- Máscaras automáticas para CPF, RG e datas
- Geração automática de número Genesis com ano
- Sistema de status baseado na espécie do item
- Campo opcional "Nº PJE" para controle adicional
- Conversão automática de todos os campos para maiúsculas

---

#### Sistema TCO
- Migração automática de todas as ocorrências para TCO
- Estrutura simplificada: RAP (GÊNESIS), Envolvido, Ilícito
- Funcionalidades completas de CRUD
- Tabela dedicada com busca e filtros
- Modais de visualização, edição e exclusão
- Exportação específica para Excel

---

#### Preenchimento Automático
- Suporte a arquivos PDF, Word (.docx) e imagens
- Extração automática via OCR (Tesseract.js)
- Detecção de CPF, RG, nomes e datas
- Campos preenchidos destacados visualmente
- Sistema de arrastar e soltar arquivos
- Processamento inteligente de documentos

---

#### Dashboard e Estatísticas
- Gráficos interativos com Chart.js
- Visão geral simplificada com 3 gráficos principais:
  - Evolução Temporal (com filtro de data)
  - Distribuição por Unidades
  - Tipos de Itens Apreendidos
- Estatísticas em tempo real:
  - Total de ocorrências registradas
  - Ocorrências do mês atual
  - Ocorrências de hoje
  - Usuários ativos no sistema
- Filtros personalizados por período
- Tooltips informativos com percentuais

---

#### Relatórios e Exportação
- Exportação para Excel com formatação profissional
- Filtros avançados para exportação:
  - Filtro por data personalizada
  - Filtro por tipo de item (Substância, Objeto, Simulacro, Arma Branca)
  - Filtros de status específicos do sistema
- Geração de Termo de Apreensão moderno em formato A5
- Etiquetas de apreensão com campo "Nº PJE"
- Formatação automática de colunas e centralização
- Normalização de texto com capitalização correta

---

#### Integração e Sincronização
- Google Apps Script para comunicação com planilhas
- Estrutura de dados limitada a 19 colunas (A-S) na Página 1
- Página 2 dedicada aos TCOs (colunas A-C)
- Dados iniciando na linha 3 em ambas as páginas
- Conversão automática para maiúsculas no backend
- Sincronização em tempo real entre usuários
- Backup local automático em JSON

---

#### Sistema de Status Inteligente
- Status específicos por espécie:
  - **Substância**: SECRIMPO, INSTITUTO DE CRIMINALÍSTICA, DOP, DESTRUIÇÃO
  - **Objeto/Simulacro/Arma Branca**: SECRIMPO, CEGOC, IC
- Dropdown dinâmico baseado na espécie selecionada
- Consistência entre formulário de criação e edição
- Atualização automática das opções disponíveis

---

#### Segurança e Autenticação
- Sistema KeyAuth com credenciais atualizadas:
  - name: "Credencial Removida"
  - ownerid: "Credencial Removida"
  - version: "Credencial Removida"
- Validação de Hardware ID (HWID)
- Controle de sessões e licenças
- Contagem de usuários online
- Autenticação silenciosa sem janelas extras

---

#### Sistema de Atualizações
- Verificação automática via GitHub Releases
- Notificações discretas na tela de login
- Verificação silenciosa a cada 5 minutos
- Controle de usuário com botões "Atualizar Agora" e "Depois"
- Tratamento inteligente de erros
- Não interrompe o uso da aplicação

---

### Técnico

#### Arquitetura
- Aplicação Electron com Node.js
- Frontend: HTML5, CSS3, JavaScript ES6+
- Backend: Python para autenticação
- Integração: Google Apps Script

#### Dependências Principais
- **Frontend**: Chart.js, Flatpickr, XLSX, Mammoth, Tesseract.js, PDF.js
- **Backend**: Electron, dotenv
- **Autenticação**: KeyAuth, pywin32, requests, qrcode, Pillow

#### Build e Distribuição
- Script automatizado `build-completo.bat`
- Compilação Python para executável standalone
- Electron Builder para distribuição Windows
- Suporte a instalador NSIS e versão portátil
- Executável totalmente standalone sem dependências

#### Estrutura de Dados
- Página 1 (Ocorrências): 19 campos completos (A-S)
- Página 2 (TCOs): 3 campos essenciais (A-C)
- Formato de data: dd/mm/yyyy
- Conversão automática para maiúsculas
- IDs únicos para controle de registros

#### URLs e Endpoints
- Google Apps Script: Credencial Removida
- GitHub Releases: Credencial Removida
- KeyAuth: Aplicação "Credencial Removida"

---

### Corrigido
- Formatação de datas em exportações Excel
- Conversão de timestamps para números Genesis em TCOs
- Mapeamento correto de dados entre ocorrências e TCOs
- Tratamento de erros em verificações de atualização
- Posicionamento do botão "Nova Ocorrência" na navegação
- Largura automática de colunas em exportações
- Centralização de texto em relatórios Excel

---

### Alterado
- Dashboard simplificado de 9 para 3 gráficos principais
- Sistema de status unificado para todas as espécies
- Estrutura TCO simplificada para 3 campos essenciais
- Verificações de atualização agora são silenciosas
- Exportações baseadas em dados atuais da aplicação
- Credenciais KeyAuth atualizadas para nova aplicação

---

### Removido
- Categorização específica por tipo de droga para TCO
- Gráficos redundantes no dashboard
- Janelas de console em modo produção
- Verificações manuais obrigatórias de atualização

---

## Convenções de Versionamento

Este projeto segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/):

- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Funcionalidades adicionadas de forma compatível
- **PATCH** (0.0.X): Correções de bugs compatíveis

### Tipos de Mudanças

- **Adicionado**: Para novas funcionalidades
- **Alterado**: Para mudanças em funcionalidades existentes
- **Descontinuado**: Para funcionalidades que serão removidas
- **Removido**: Para funcionalidades removidas
- **Corrigido**: Para correções de bugs
- **Segurança**: Para vulnerabilidades de segurança

### Categorias

- **Interface**: Mudanças na interface do usuário
- **Técnico**: Mudanças técnicas internas
- **Integração**: Mudanças em integrações externas
- **Performance**: Melhorias de performance
- **Segurança**: Melhorias de segurança

---

## Direitos Autorais e Propriedade Intelectual

© 2025 **Salva Soluções Ltda** - Todos os direitos reservados

**SECRIMPO PMDF** é propriedade exclusiva da Salva Soluções Ltda e está protegido por leis de direitos autorais e propriedade intelectual brasileiras e internacionais.

### Proteção Legal
- Todo o código fonte, documentação, design e funcionalidades são propriedade intelectual da Salva Soluções Ltda
- O uso, distribuição, venda, modificação ou exploração comercial sem autorização é proibido
- Violações estarão sujeitas a medidas judiciais cabíveis

**Desenvolvido por Salva Soluções Ltda para a Polícia Militar do Distrito Federal**

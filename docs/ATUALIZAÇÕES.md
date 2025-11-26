# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 26/11/2025

**Primeira Versão Final para Produção**

Esta é a primeira versão estável e final do sistema SecrimpoPMDF, pronta para uso em produção.

### Características Principais
- Sistema completo de gestão de ocorrências policiais
- Integração com KeyAuth para autenticação segura
- Geração de termos de apreensão em PDF
- Exportação de dados para Excel
- Sistema de atualizações automáticas
- Interface moderna e intuitiva
- Salvamento de termos como PNG
- Gestão completa de ocorrências e TCOs

### Estabilidade
- Todas as funcionalidades principais testadas e validadas
- Sistema de atualizações robusto e confiável
- Tratamento de erros aprimorado
- Performance otimizada

---

## [0.3.4] - 26/11/2025

**Correção - Erro ao Instalar Atualizações**

### Corrigido
- Erro "spawn EBUSY" ao baixar e instalar atualizações
- Melhorias na verificação de acesso ao arquivo antes da execução
- Execução do instalador via cmd.exe no Windows para maior compatibilidade
- Aguardar arquivo estar completamente escrito antes de executar

### Melhorado
- Sistema de retry para verificação de acesso ao arquivo
- Tratamento de erros mais robusto no processo de instalação
- Delays adicionais para garantir que arquivos estão liberados

---

## [0.3.3] - 26/11/2025

**Atualização - Funcionalidade de Salvar PNG**

### Adicionado
- Botão "Salvar como PNG" no termo de apreensão
- Funcionalidade para salvar termo de apreensão como imagem PNG
- Salvamento em `C:/SECRIMPO/PNG/` com nome padrão `[Nº Genesis][Data].png`
- Diálogo personalizado para editar caminho e nome do arquivo
- Alertas personalizados seguindo padrão visual do projeto

### Melhorado
- Ajustes visuais nos campos do termo de apreensão
- Campo "Espécie" agora exibe como texto (sem aparência de dropdown)
- Campo "Item" expande automaticamente para mostrar todo o conteúdo
- Todos os dados do termo ficam visíveis e ajustados

---

## [0.3.2] - 15/11/2025

**Atualização - Credenciais KeyAuth**

### Alterado
- Credenciais KeyAuth atualizadas para nova aplicação

---

## [0.3.1] - 15/11/2025

**Atualização - Correções e Melhorias de UX**

### Corrigido
- Dropdown do menu do usuário na tela "Nova Ocorrência" agora inclui o item "Verificar Atualizações"
- Ícone do usuário no dropdown corrigido (adicionado path completo do corpo)
- Formulário não mantém dados ao sair e voltar - limpeza automática implementada
- Upload de arquivos não abre múltiplas vezes o seletor de arquivo
- Estado do upload de arquivos é resetado corretamente ao voltar para seleção de modo

### Alterado
- Modais com formulários (Suporte, Edição) não fecham mais ao clicar fora - apenas através dos botões de fechar/cancelar
- Campo de descrição (textarea) agora ajusta altura automaticamente conforme o conteúdo
- Removido ícone de redimensionamento manual do campo de descrição
- Limpeza automática do formulário ao:
  - Carregar a página
  - Clicar em "Controle de Ocorrências"
  - Clicar em "Voltar" do formulário
  - Clicar em "Voltar" da tela de upload
  - Selecionar "Preenchimento Manual"
- **Organização de exportações em subpastas:**
  - Exportações de Ocorrências agora são salvas em `C:\SECRIMPO\Exportacao\Ocorrencias\`
  - Exportações de TCOs agora são salvas em `C:\SECRIMPO\Exportacao\Tco\`
  - Melhor organização e separação dos arquivos exportados

### Melhorias de Interface
- Auto-resize do textarea de descrição mantém tamanho mínimo de 80px e expande automaticamente
- Dropdown do menu do usuário padronizado entre dashboard e nova ocorrência
- Melhor experiência ao trabalhar com formulários - dados não são perdidos acidentalmente
- Estrutura de pastas organizada para facilitar localização de arquivos exportados
- **Indicador visual de filtros ativos:**
  - Botão de filtro muda de cor cinza (padrão) para verde quando há filtros aplicados
  - Funciona tanto para Ocorrências quanto para TCOs
  - Atualização automática ao aplicar, limpar ou carregar dados
  - Feedback visual imediato sobre o estado dos filtros

---

## [0.3.0] - 15/01/2025

**Atualização - Sistema de Suporte Integrado**

### Adicionado
- Sistema de suporte completo integrado com Discord
- Botão "Suporte" no dropdown do menu do usuário
- Modal de formulário de suporte com validação
- Integração com Discord via webhook
- Embed formatado com informações da solicitação
- Sistema de prioridades (Baixa, Média, Alta, Urgente)
- Notificação automática com @everyone no Discord
- Cores dinâmicas no embed baseadas na prioridade:
  - Urgente: Vermelho
  - Alta: Laranja
  - Média: Amarelo
  - Baixa: Verde
- Preenchimento automático do nome do usuário no formulário
- Formatação de data e hora em português brasileiro
- Tratamento de descrições longas (truncamento automático)

#### Sistema de Suporte
- Formulário modal acessível via dropdown do usuário
- Campos obrigatórios: Nome, Unidade, Prioridade, Problema, Descrição
- Validação completa de campos antes do envio
- Envio assíncrono com feedback visual
- Integração direta com Discord webhook
- Embed profissional sem emojis
- Estrutura organizada em campos verticais
- Timestamp automático no embed

---

## [0.2.0] - 15/01/2025

**Atualização - Sistema de Filtros e Melhorias**

### Adicionado
- Sistema de filtros avançados para ocorrências e TCOs
- Modal de filtros dedicado com campos específicos
- Edição do campo "Nº Genesis" no modal de edição de ocorrências
- Sistema de atualização automática via GitHub Releases
- Verificação manual de atualizações no menu do usuário
- Persistência de filtros selecionados
- Preenchimento dinâmico de opções de filtro
- Botão "Verificar Atualizações" no dropdown do usuário (cor verde)

#### Sistema de Filtros de Ocorrências
- Filtro por Nº Genesis (campo de texto)
- Filtro por Data de Apreensão (range de datas: inicial e final)
- Filtro por Unidade (dropdown preenchido dinamicamente)
- Filtro por Status (dropdown preenchido dinamicamente)
- Filtros combinados (AND entre campos)
- Botão "Limpar" para resetar todos os filtros
- Persistência dos filtros ao reabrir o modal

#### Sistema de Filtros de TCOs
- Filtro por RAP (Gênesis) (campo de texto)
- Filtro por Ilícito (dropdown preenchido dinamicamente)
- Filtro por Item (campo de texto)
- Filtros combinados (AND entre campos)
- Botão "Limpar" para resetar todos os filtros
- Persistência dos filtros ao reabrir o modal

#### Sistema de Atualizações
- Verificação automática uma vez por dia ao abrir a aplicação
- Verificação manual via botão no menu do usuário
- Modal de atualização com informações da nova versão
- Notas da versão (release notes) exibidas no modal
- Link direto para download da atualização
- Controle de intervalo de verificação (24 horas)
- Tratamento robusto de erros (rate limit, repositório não encontrado, etc.)

#### Melhorias na Edição
- Campo "Nº Genesis" totalmente editável no modal de edição
- Validação para não permitir Genesis vazio
- Conversão automática para maiúsculas
- Atualização automática do TCO correspondente quando o Genesis é alterado
- Correção na busca de ocorrências quando o Genesis original é 'N/A'

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
- Tabela dedicada com sistema de filtros avançados
- Modais de visualização, edição e exclusão
- Exportação específica para Excel com filtros
- Sincronização automática do RAP quando o Genesis da ocorrência é alterado

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

#### Sistema de Atualizações (v0.1.0 - Depreciado)
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
- Exibição correta do Genesis em ocorrências e TCOs (evitando conversão para Date)
- Atualização do Genesis no Google Sheets usando getDisplayValue()
- Sincronização do RAP (Gênesis) no TCO quando o Genesis da ocorrência é alterado
- Busca de ocorrências quando o Genesis original é 'N/A' ou vazio
- Tratamento de erros do GitHub API (400, 403, 404)

---

### Alterado
- Dashboard simplificado de 9 para 3 gráficos principais
- Sistema de status unificado para todas as espécies
- Estrutura TCO simplificada para 3 campos essenciais
- Verificações de atualização agora são silenciosas
- Exportações baseadas em dados atuais da aplicação
- Credenciais KeyAuth atualizadas para nova aplicação
- Sistema de busca substituído por sistema de filtros avançados
- Campo de busca antigo removido e substituído por botão de filtro
- Ordem dos campos no modal de filtros: Data de Apreensão no topo
- Sistema de atualizações melhorado com verificação diária automática
- Modal de atualização com interface mais informativa

---

### Removido
- Categorização específica por tipo de droga para TCO
- Gráficos redundantes no dashboard
- Janelas de console em modo produção
- Verificações manuais obrigatórias de atualização
- Campo de busca antigo (substituído por sistema de filtros)
- Sistema de busca simples (substituído por filtros avançados)

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

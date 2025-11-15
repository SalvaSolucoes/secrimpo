# SECRIMPO PMDF

Sistema de Controle e Registro de Itens e Materiais para Polícia Militar do Distrito Federal

## Sobre o Projeto

O SECRIMPO PMDF é uma aplicação desktop desenvolvida em Electron para gerenciamento de ocorrências policiais, especificamente para o controle de itens apreendidos e materiais relacionados às atividades da Polícia Militar do Distrito Federal.

## Características Principais

- Interface moderna e responsiva com tema oficial da PMDF
- Sistema de autenticação segura
- Dashboard com gráficos e estatísticas em tempo real
- Registro completo de ocorrências com validação automática
- Sistema TCO (Termo Circunstanciado de Ocorrência)
- Preenchimento automático através de upload de documentos
- Exportação avançada para Excel com filtros personalizados
- Geração de Termo de Apreensão e etiquetas de impressão
- Integração completa com Google Sheets para armazenamento na nuvem
- Sistema de atualizações automáticas via GitHub Releases
- Sistema de filtros avançados para ocorrências e TCOs
- Edição do campo Nº Genesis com sincronização automática
- Sistema de suporte integrado com Discord via webhook

## Tecnologias Utilizadas

### Frontend
- Electron (Framework principal)
- HTML5/CSS3 (Interface responsiva)
- JavaScript ES6+ (Lógica da aplicação)
- Chart.js (Gráficos e visualizações)

### Backend e Integração
- Node.js (Runtime JavaScript)
- Google Apps Script (Integração com Google Sheets)
- Python (Sistema de autenticação)
- KeyAuth (Plataforma de autenticação)

### Bibliotecas Principais
- XLSX (Manipulação de arquivos Excel)
- Mammoth (Processamento de documentos Word)
- Tesseract.js (OCR para extração de texto)
- PDF.js (Processamento de arquivos PDF)

## Estrutura do Projeto

```
SecrimpoPMDF/
├── src/                          # Código fonte principal
│   ├── main.js                   # Processo principal do Electron
│   ├── views/                    # Páginas HTML
│   ├── scripts/                  # Scripts JavaScript
│   ├── styles/                   # Arquivos CSS
│   ├── templates/                # Templates de documentos
│   └── updater/                  # Sistema de atualizações
├── auth/                         # Sistema de autenticação
├── assets/                       # Recursos estáticos
├── docs/                         # Documentação
│   ├── README.md                 # Este arquivo
│   ├── CHANGELOG.md              # Histórico de versões
│   ├── DOCUMENTATION.md          # Documentação técnica
│   └── LICENSE.md                # Direitos autorais e licença
├── google-apps-script.gs         # Script do Google Sheets
├── build-completo.bat           # Script de build
└── package.json                 # Configuração Node.js
```

## Instalação

### Pré-requisitos
- Windows 10/11
- Node.js 16+ (para desenvolvimento)
- Python 3.8+ (para desenvolvimento)

### Para Desenvolvimento
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Instale dependências Python: `pip install -r auth/requirements.txt`
4. Configure as credenciais (Google Sheets e KeyAuth)
5. Execute: `npm start`

### Build para Produção
Execute o script de build completo:
```bash
build-completo.bat
```

## Funcionalidades

### Gestão de Ocorrências
- Formulário organizado por categorias
- Máscaras automáticas para CPF, RG e datas
- Sistema de status baseado na espécie do item
- Conversão automática para maiúsculas
- Edição do campo Nº Genesis com validação
- Sistema de filtros avançados (Nº Genesis, Data, Unidade, Status)

### Sistema TCO
- Migração automática de ocorrências para TCO
- Funcionalidades completas de CRUD
- Exportação específica para Excel
- Sistema de filtros avançados (RAP, Ilícito, Item)
- Sincronização automática do RAP quando o Genesis é alterado

### Preenchimento Automático
- Suporte a arquivos PDF, Word e imagens
- Extração automática via OCR
- Detecção de CPF, RG, nomes e datas

### Relatórios e Exportação
- Exportação para Excel com formatação profissional
- Filtros avançados por data, tipo e status
- Geração de Termo de Apreensão
- Etiquetas de apreensão para impressão
- Organização automática de exportações em subpastas:
  - Ocorrências: `C:\SECRIMPO\Exportacao\Ocorrencias\`
  - TCOs: `C:\SECRIMPO\Exportacao\Tco\`

### Sistema de Atualizações
- Verificação automática uma vez por dia
- Verificação manual via menu do usuário
- Notificações discretas com modal informativo
- Download direto da atualização

### Sistema de Suporte
- Formulário de suporte acessível via menu do usuário
- Campos: Nome, Unidade, Prioridade, Problema e Descrição
- Integração com Discord via webhook
- Embed formatado com informações da solicitação
- Sistema de prioridades (Baixa, Média, Alta, Urgente)
- Notificação automática com @everyone no Discord
- Cores dinâmicas no embed baseadas na prioridade
- Modais com formulários não fecham ao clicar fora (proteção contra perda de dados)

### Melhorias de Interface e UX
- Limpeza automática do formulário ao navegar entre telas
- Campo de descrição com auto-resize automático
- Dropdown do menu do usuário padronizado em todas as telas
- Verificação de atualizações disponível em todas as telas
- Upload de arquivos com estado resetado corretamente
- Indicador visual de filtros ativos: botão de filtro muda para verde quando há filtros aplicados (Ocorrências e TCOs)

## Documentação

- **Documentação Técnica**: Consulte `docs/DOCUMENTATION.md`
- **Histórico de Versões**: Consulte `docs/CHANGELOG.md`
- **Direitos Autorais**: Consulte `docs/LICENSE.md`

## Suporte

Para suporte técnico ou dúvidas sobre o sistema:
- Email: salvasolucoes@gmail.com
- Telefone: (61) 9196-3651
- Documentação: Consulte os arquivos em `docs/`

## Desenvolvido por

**Salva Soluções Ltda** para a Polícia Militar do Distrito Federal

Para informações sobre licença e direitos autorais, consulte o arquivo `LICENSE.md`.

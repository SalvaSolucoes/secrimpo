const { ipcRenderer } = require('electron');
const Chart = require('chart.js/auto');

// Elements
const userInfo = document.getElementById('userInfo');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const loadingSubtext = document.getElementById('loadingSubtext');

// Tabs
const tabDashboard = document.getElementById('tabDashboard');
const tabOcorrencias = document.getElementById('tabOcorrencias');
const tabTCO = document.getElementById('tabTCO');
const tabNovaOcorrencia = document.getElementById('tabNovaOcorrencia');

// Sections
const sectionDashboard = document.getElementById('sectionDashboard');
const sectionOcorrencias = document.getElementById('sectionOcorrencias');
const sectionTCO = document.getElementById('sectionTCO');

// Stats
const statTotal = document.getElementById('statTotal');
const statMes = document.getElementById('statMes');
const statHoje = document.getElementById('statHoje');
const statUsuarios = document.getElementById('statUsuarios');

// Table
const occurrencesTableBody = document.getElementById('occurrencesTableBody');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const emptyState = document.getElementById('emptyState');
const btnNovaOcorrenciaEmpty = document.getElementById('btnNovaOcorrenciaEmpty');

// Modals
const viewModal = document.getElementById('viewModal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const btnDelete = document.getElementById('btnDelete');
const btnSaveEdit = document.getElementById('btnSaveEdit');

const deleteModal = document.getElementById('deleteModal');
const deleteModalClose = document.getElementById('deleteModalClose');
const deleteOccurrenceId = document.getElementById('deleteOccurrenceId');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

const printModal = document.getElementById('printModal');
const printModalClose = document.getElementById('printModalClose');
const printOccurrenceId = document.getElementById('printOccurrenceId');
const btnCancelPrint = document.getElementById('btnCancelPrint');
const btnPrintTermoApreensao = document.getElementById('btnPrintTermoApreensao');

// State
let allOccurrences = [];
let filteredOccurrences = [];
let currentOccurrence = null;
let isEditMode = false;

// Charts - Visão Geral (3 gráficos principais)
let lineChart = null;           // Evolução Temporal
let pieChartUnidade = null;     // Distribuição por Unidades
let pieChartItens = null;       // Tipos de Itens Apreendidos

// Date filter
let customDateRange = null; // { startDate: Date, endDate: Date }
const filterDataInicio = document.getElementById('filterDataInicio');
const filterDataFim = document.getElementById('filterDataFim');
const btnFilterChart = document.getElementById('btnFilterChart');
const btnResetFilter = document.getElementById('btnResetFilter');


// Load user info
window.addEventListener('load', () => {
    const username = sessionStorage.getItem('username');
    if (username) {
        userInfo.textContent = username;
    }
    loadOccurrences();
});

// Funções de loading
function showLoading(text = 'Processando', subtext = 'Aguarde um momento') {
    loadingText.textContent = text;
    loadingSubtext.textContent = subtext;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Load occurrences
async function loadOccurrences() {
    try {
        const result = await ipcRenderer.invoke('get-occurrences');
        if (result.success) {
            // Mapear dados do Google Sheets para a estrutura esperada
            allOccurrences = result.data.map(row => {
                // Se já está na estrutura correta, retorna como está
                if (row.ocorrencia && row.itemApreendido && row.proprietario && row.policial) {
                    return row;
                }
                
                // Caso contrário, mapeia da estrutura do Google Sheets
                return {
                    ocorrencia: {
                        numeroGenesis: row.numeroGenesis || '',
                        unidade: row.unidade || '',
                        dataApreensao: row.dataApreensao || '',
                        leiInfrigida: row.leiInfrigida || '',
                        artigo: row.artigo || '',
                        status: row.status || '',
                        policialCondutor: row.policialCondutor || ''
                    },
                    itemApreendido: {
                        especie: row.especie || '',
                        item: row.item || '',
                        quantidade: row.quantidade || '',
                        descricao: row.descricaoItem || '',
                        ocorrencia: row.ocorrenciaItem || '',
                        proprietario: row.proprietarioItem || '',
                        policial: row.policialItem || ''
                    },
                    proprietario: {
                        nome: row.nomeProprietario || '',
                        tipoDocumento: row.tipoDocumento || '',
                        numeroDocumento: row.numeroDocumento || ''
                    },
                    policial: {
                        nome: row.nomePolicialCompleto || row.nomePolicial || '',
                        matricula: row.matricula || '',
                        graduacao: row.graduacao || '',
                        unidade: row.unidadePolicial || ''
                    },
                    metadata: {
                        registradoPor: row.registradoPor || '',
                        dataRegistro: row.logRegistro || new Date().toISOString()
                    }
                };
            });
            
            filteredOccurrences = [...allOccurrences];
            console.log('Ocorrências carregadas:', allOccurrences.length);
            updateStats();
            renderTable();
        } else {
            console.error('Erro ao carregar ocorrências:', result.message);
            showEmptyState();
        }
    } catch (error) {
        console.error('Erro ao carregar ocorrências:', error);
        showEmptyState();
    }
}

// Update statistics
function updateStats() {
    const total = allOccurrences.length;
    statTotal.textContent = total;

    // Count this month
    const now = new Date();
    const thisMonth = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate.getMonth() === now.getMonth() && 
               occDate.getFullYear() === now.getFullYear();
    }).length;
    statMes.textContent = thisMonth;

    // Count today
    const today = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate.toDateString() === now.toDateString();
    }).length;
    statHoje.textContent = today;
    
    // Update active users count from KeyAuth
    updateActiveUsers();
    
    // Update charts
    updateCharts();
}

// Update active users count from KeyAuth
async function updateActiveUsers() {
    try {
        if (window.electron && window.electron.ipcRenderer) {
            const count = await window.electron.ipcRenderer.invoke('get-active-users-count');
            if (statUsuarios) {
                statUsuarios.textContent = count || 1;
            }
        } else {
            // Fallback: show 1 (current user)
            if (statUsuarios) {
                statUsuarios.textContent = 1;
            }
        }
    } catch (error) {
        console.error('Erro ao buscar usuários ativos:', error);
        // Fallback: show 1 (current user)
        if (statUsuarios) {
            statUsuarios.textContent = 1;
        }
    }
}

// Render table
function renderTable() {
    if (filteredOccurrences.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();
    occurrencesTableBody.innerHTML = '';

    filteredOccurrences.forEach((occ, index) => {
        const row = document.createElement('tr');
        const statusOptions = getStatusOptions(occ.itemApreendido?.especie);
        const currentStatus = occ.ocorrencia?.status || '';
        
        row.innerHTML = `
            <td><strong>${occ.ocorrencia?.numeroGenesis || 'N/A'}</strong></td>
            <td>${occ.ocorrencia?.dataApreensao ? formatDate(occ.ocorrencia.dataApreensao) : 'N/A'}</td>
            <td>${occ.ocorrencia?.unidade || 'N/A'}</td>
            <td>${occ.proprietario?.nome || 'N/A'}</td>
            <td>
                <select class="status-dropdown" data-index="${index}" onchange="updateStatus(${index}, this.value)">
                    <option value="">Selecione...</option>
                    ${statusOptions.map(option => 
                        `<option value="${option}" ${currentStatus === option ? 'selected' : ''}>${option}</option>`
                    ).join('')}
                </select>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewOccurrence(${index})" title="Ver detalhes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-edit" onclick="editOccurrence(${index})" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-print" onclick="openPrintModal(${index})" title="Imprimir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-delete-action" onclick="confirmDelete(${index})" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        occurrencesTableBody.appendChild(row);
    });
}

// View occurrence
window.viewOccurrence = function(index) {
    currentOccurrence = filteredOccurrences[index];
    isEditMode = false;
    showModal(false);
};

// Edit occurrence
window.editOccurrence = function(index) {
    currentOccurrence = filteredOccurrences[index];
    isEditMode = true;
    showModal(true);
};

// Show modal
function showModal(editable) {
    if (!currentOccurrence) return;

    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = editable ? 'Editar Ocorrência' : 'Detalhes da Ocorrência';
    
    // Preencher formulário com dados da ocorrência
    fillModalForm(editable);

    btnDelete.style.display = 'none'; // Sempre oculto no modal de edição
    btnSaveEdit.style.display = editable ? 'inline-flex' : 'none';
    
    viewModal.classList.add('active');
    
    // Configurar lógica dinâmica do modal de edição se estiver em modo editável
    if (editable) {
        setupModalEditLogic();
    }
}

// Função para preencher o formulário do modal
function fillModalForm(editable) {
    // Dados da Ocorrência
    document.getElementById('modalNumeroGenesis').value = currentOccurrence.ocorrencia?.numeroGenesis || '';
    document.getElementById('modalUnidade').value = currentOccurrence.ocorrencia?.unidade || '';
    document.getElementById('modalDataApreensao').value = formatDateBR(currentOccurrence.ocorrencia?.dataApreensao) || '';
    document.getElementById('modalLeiInfrigida').value = currentOccurrence.ocorrencia?.leiInfrigida || '';
    document.getElementById('modalArtigo').value = currentOccurrence.ocorrencia?.artigo || '';
    document.getElementById('modalStatus').value = currentOccurrence.ocorrencia?.status || '';
    document.getElementById('modalNumeroPje').value = currentOccurrence.ocorrencia?.numeroPje === '-' ? '' : (currentOccurrence.ocorrencia?.numeroPje || '');

    // Item Apreendido
    document.getElementById('modalEspecie').value = currentOccurrence.itemApreendido?.especie || '';
    document.getElementById('modalItem').value = currentOccurrence.itemApreendido?.item || '';
    document.getElementById('modalQuantidade').value = currentOccurrence.itemApreendido?.quantidade || '';
    document.getElementById('modalDescricaoItem').value = currentOccurrence.itemApreendido?.descricao || '';

    // Proprietário
    document.getElementById('modalNomeProprietario').value = currentOccurrence.proprietario?.nome || '';
    document.getElementById('modalTipoDocumento').value = currentOccurrence.proprietario?.tipoDocumento || '';
    document.getElementById('modalNumeroDocumento').value = currentOccurrence.proprietario?.numeroDocumento || '';

    // Policial
    document.getElementById('modalNomePolicial').value = currentOccurrence.policial?.nome || '';
    document.getElementById('modalMatricula').value = currentOccurrence.policial?.matricula || '';
    document.getElementById('modalGraduacao').value = currentOccurrence.policial?.graduacao || '';
    document.getElementById('modalUnidadePolicial').value = currentOccurrence.policial?.unidade || '';

    // Informações do Registro
    document.getElementById('modalRegistradoPor').value = currentOccurrence.metadata?.registradoPor || '';
    document.getElementById('modalDataRegistro').value = formatDateTime(currentOccurrence.metadata?.dataRegistro) || '';

    // Desabilitar campos se não for editável
    const formElements = document.querySelectorAll('#modalOccurrenceForm input, #modalOccurrenceForm select, #modalOccurrenceForm textarea');
    formElements.forEach(element => {
        if (element.id === 'modalRegistradoPor' || element.id === 'modalDataRegistro') {
            element.disabled = true; // Sempre desabilitados
        } else {
            element.disabled = !editable;
        }
    });

    // Se estiver em modo editável, inicializar o status baseado na espécie
    if (editable) {
        setTimeout(() => {
            const especieSelect = document.getElementById('modalEspecie');
            if (especieSelect && especieSelect.value) {
                // Disparar evento change para carregar as opções de status
                especieSelect.dispatchEvent(new Event('change'));
            }
        }, 100);
    }
}

// Configurar lógica dinâmica do modal de edição
function setupModalEditLogic() {
    const especieSelect = document.getElementById('modalEspecie');
    const statusSelect = document.getElementById('modalStatus');
    const tipoDocumentoSelect = document.getElementById('modalTipoDocumento');
    const numeroDocumentoInput = document.getElementById('modalNumeroDocumento');
    const dataApreensaoInput = document.getElementById('modalDataApreensao');
    const numeroGenesisInput = document.getElementById('modalNumeroGenesis');
    
    // === LÓGICA DO STATUS BASEADO NA ESPÉCIE ===
    if (especieSelect && statusSelect) {
        // Função para atualizar opções do status baseado na espécie
        function updateStatusOptions() {
            const especieSelecionada = especieSelect.value;
            const statusAtual = currentOccurrence.ocorrencia.status || '';
            
            // Limpar opções atuais
            statusSelect.innerHTML = '';
            
            if (!especieSelecionada) {
                statusSelect.innerHTML = '<option value="">Selecione primeiro a espécie...</option>';
                statusSelect.disabled = true;
                return;
            }
            
            // Adicionar opção padrão
            statusSelect.innerHTML = '<option value="">Selecione...</option>';
            statusSelect.disabled = false;
            
            // Status específicos baseados na espécie
            if (especieSelecionada === 'SUBSTÂNCIA') {
                // Status para substâncias
                statusSelect.innerHTML += '<option value="SECRIMPO">SECRIMPO</option>';
                statusSelect.innerHTML += '<option value="INSTITUTO DE CRIMINALÍSTICA">INSTITUTO DE CRIMINALÍSTICA</option>';
                statusSelect.innerHTML += '<option value="DOP">DOP</option>';
                statusSelect.innerHTML += '<option value="DESTRUIÇÃO">DESTRUIÇÃO</option>';
            } else if (especieSelecionada === 'OBJETO' || especieSelecionada === 'SIMULACRO' || especieSelecionada === 'ARMA BRANCA') {
                // Status para objetos, simulacros e armas brancas
                statusSelect.innerHTML += '<option value="SECRIMPO">SECRIMPO</option>';
                statusSelect.innerHTML += '<option value="CEGOC">CEGOC</option>';
                statusSelect.innerHTML += '<option value="IC">IC</option>';
            } else {
                // Status gerais para outras espécies
                statusSelect.innerHTML += '<option value="SECRIMPO">SECRIMPO</option>';
                statusSelect.innerHTML += '<option value="CEGOC">CEGOC</option>';
                statusSelect.innerHTML += '<option value="IC">IC</option>';
            }
            
            // Restaurar valor atual se ainda for válido
            if (statusAtual) {
                const option = statusSelect.querySelector(`option[value="${statusAtual}"]`);
                if (option) {
                    statusSelect.value = statusAtual;
                }
            }
        }
        
        // Event listener para mudança na espécie
        especieSelect.addEventListener('change', updateStatusOptions);
        
        // Event listener para limpar status quando "Selecione..." for escolhido
        statusSelect.addEventListener('change', function() {
            if (this.value === '') {
                this.value = '';
            }
        });
        
        // Inicializar com a espécie atual
        updateStatusOptions();
    }
    
    // === MÁSCARAS PARA DOCUMENTOS ===
    if (tipoDocumentoSelect && numeroDocumentoInput) {
        // Função para formatar CPF: 000.000.000-00
        function formatCPF(value) {
            value = value.replace(/\D/g, '');
            if (value.length > 11) value = value.substring(0, 11);
            
            if (value.length <= 3) {
                return value;
            } else if (value.length <= 6) {
                return value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            } else if (value.length <= 9) {
                return value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else {
                return value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            }
        }
        
        // Função para formatar RG: 0.000.000 (7 dígitos) ou 00.000.000-0 (9 dígitos)
        function formatRG(value) {
            value = value.replace(/\D/g, '');
            if (value.length > 9) value = value.substring(0, 9);
            
            // Formato com 7 dígitos: 0.000.000
            if (value.length <= 7) {
                if (value.length <= 1) {
                    return value;
                } else if (value.length <= 4) {
                    return value.replace(/(\d{1})(\d{1,3})/, '$1.$2');
                } else {
                    return value.replace(/(\d{1})(\d{3})(\d{1,3})/, '$1.$2.$3');
                }
            }
            // Formato com 8-9 dígitos: 00.000.000-0
            else {
                if (value.length <= 2) {
                    return value;
                } else if (value.length <= 5) {
                    return value.replace(/(\d{2})(\d{1,3})/, '$1.$2');
                } else if (value.length <= 8) {
                    return value.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else {
                    return value.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
                }
            }
        }
        
        // Aplicar máscara no campo de documento
        numeroDocumentoInput.addEventListener('input', function(e) {
            const tipo = tipoDocumentoSelect.value;
            let value = e.target.value;
            
            if (tipo === 'CPF') {
                e.target.value = formatCPF(value);
            } else if (tipo === 'RG') {
                e.target.value = formatRG(value);
            }
        });
        
        // Limpar e reaplicar máscara quando mudar o tipo de documento
        tipoDocumentoSelect.addEventListener('change', function(e) {
            const value = numeroDocumentoInput.value.replace(/\D/g, '');
            
            if (e.target.value === 'CPF') {
                numeroDocumentoInput.value = formatCPF(value);
                numeroDocumentoInput.placeholder = '000.000.000-00';
                numeroDocumentoInput.maxLength = 14;
            } else if (e.target.value === 'RG') {
                numeroDocumentoInput.value = formatRG(value);
                numeroDocumentoInput.placeholder = '0.000.000 ou 00.000.000-0';
                numeroDocumentoInput.maxLength = 12;
            } else {
                numeroDocumentoInput.value = value;
                numeroDocumentoInput.placeholder = '';
                numeroDocumentoInput.removeAttribute('maxLength');
            }
        });
    }
    
    // === MÁSCARA PARA DATA ===
    if (dataApreensaoInput) {
        // Máscara para data no formato brasileiro (dd/mm/aaaa)
        function applyDateMask(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
        }
        
        dataApreensaoInput.addEventListener('input', applyDateMask);
        
        // Atualizar Nº Genesis com o ano automaticamente
        function updateGenesisWithYear() {
            const dataApreensao = dataApreensaoInput.value;
            
            // Verificar se a data está completa (dd/mm/aaaa)
            if (dataApreensao.length === 10 && isValidDate(dataApreensao)) {
                const year = dataApreensao.split('/')[2]; // Extrair o ano
                const currentValue = numeroGenesisInput.value;
                
                // Remover ano anterior se existir (formato: xxxx-yyyy)
                const valueWithoutYear = currentValue.replace(/-\d{4}$/, '');
                
                // Adicionar o novo ano
                if (valueWithoutYear) {
                    numeroGenesisInput.value = valueWithoutYear + '-' + year;
                }
            }
        }
        
        dataApreensaoInput.addEventListener('input', updateGenesisWithYear);
        
        if (numeroGenesisInput) {
            numeroGenesisInput.addEventListener('input', updateGenesisWithYear);
        }
    }
    
    // === FUNÇÃO AUXILIAR PARA VALIDAR DATA ===
    function isValidDate(dateString) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = dateString.match(regex);
        
        if (!match) return false;
        
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;
        
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day;
    }
}

// Validar data no formato brasileiro (para modal de edição)
function isValidDateEdit(dateString) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

// Converter data brasileira para ISO (yyyy-mm-dd) - para modal de edição
function brDateToISO(brDate) {
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
}

// Close modal
function closeModal() {
    viewModal.classList.remove('active');
    currentOccurrence = null;
    isEditMode = false;
}

// Save edit
async function saveEdit() {
    if (!currentOccurrence) return;

    // Validar datas antes de enviar
    const dataApreensao = document.getElementById('modalDataApreensao').value;
    
    if (!isValidDateEdit(dataApreensao)) {
        customAlert.error('Data de apreensão inválida. Use o formato dd/mm/aaaa');
        return;
    }

    // Guardar o número Genesis original para identificação
    const numeroGenesisOriginal = currentOccurrence.ocorrencia.numeroGenesis;
    const numeroGenesisNovo = document.getElementById('modalNumeroGenesis').value;

    const updatedData = {
        id: currentOccurrence.id,
        numeroGenesisOriginal: numeroGenesisOriginal, // Para identificar a linha no Google Sheets
        ocorrencia: {
            numeroGenesis: numeroGenesisNovo.toUpperCase(),
            unidade: document.getElementById('modalUnidade').value.toUpperCase(),
            dataApreensao: brDateToISO(document.getElementById('modalDataApreensao').value),
            leiInfrigida: document.getElementById('modalLeiInfrigida').value.toUpperCase(),
            artigo: document.getElementById('modalArtigo').value.toUpperCase(),
            status: (document.getElementById('modalStatus').value || '').toUpperCase(),
            numeroPje: document.getElementById('modalNumeroPje').value || '-',
            policialCondutor: '' // Campo removido do novo formulário
        },
        itemApreendido: {
            especie: document.getElementById('modalEspecie').value.toUpperCase(),
            item: document.getElementById('modalItem').value.toUpperCase(),
            quantidade: document.getElementById('modalQuantidade').value.toUpperCase(),
            descricao: document.getElementById('modalDescricaoItem').value.toUpperCase()
        },
        proprietario: {
            nome: document.getElementById('modalNomeProprietario').value.toUpperCase(),
            tipoDocumento: document.getElementById('modalTipoDocumento').value.toUpperCase(),
            numeroDocumento: document.getElementById('modalNumeroDocumento').value.toUpperCase()
        },
        policial: {
            nome: document.getElementById('modalNomePolicial').value.toUpperCase(),
            matricula: document.getElementById('modalMatricula').value.toUpperCase(),
            graduacao: document.getElementById('modalGraduacao').value.toUpperCase(),
            unidade: document.getElementById('modalUnidadePolicial').value.toUpperCase()
        },
        metadata: currentOccurrence.metadata
    };

    console.log('Dados de atualização:', updatedData);
    console.log('Número Genesis Original:', numeroGenesisOriginal);
    console.log('Número Genesis Novo:', numeroGenesisNovo);

    showLoading('Atualizando ocorrência', 'Salvando alterações...');
    try {
        const result = await ipcRenderer.invoke('update-occurrence', updatedData);
        hideLoading();
        if (result.success) {
            customAlert.success('Ocorrência atualizada com sucesso!');
            closeModal();
            loadOccurrences();
        } else {
            customAlert.error('Erro ao atualizar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        hideLoading();
        customAlert.error('Erro ao atualizar ocorrência');
    }
}

// Open delete modal
window.confirmDelete = function(index) {
    currentOccurrence = filteredOccurrences[index];
    deleteOccurrenceId.textContent = currentOccurrence.ocorrencia.numeroGenesis;
    deleteModal.classList.add('active');
};

// Execute delete occurrence
async function executeDelete() {
    if (!currentOccurrence) return;

    showLoading('Excluindo ocorrência', 'Removendo do sistema...');
    try {
        const result = await ipcRenderer.invoke('delete-occurrence', currentOccurrence.ocorrencia.numeroGenesis);
        hideLoading();
        if (result.success) {
            customAlert.success('Ocorrência excluída com sucesso!');
            deleteModal.classList.remove('active');
            closeModal();
            loadOccurrences();
        } else {
            customAlert.error('Erro ao excluir: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        hideLoading();
        customAlert.error('Erro ao excluir ocorrência');
    }
}

// Open print modal
window.openPrintModal = function(index) {
    currentOccurrence = filteredOccurrences[index];
    printOccurrenceId.textContent = currentOccurrence.ocorrencia.numeroGenesis;
    printModal.classList.add('active');
};

// Close print modal
function closePrintModal() {
    printModal.classList.remove('active');
}

// Print Termo de Apreensão
async function printTermoApreensao() {
    if (!currentOccurrence) return;
    
    printModal.classList.remove('active');
    showLoading('Gerando documento', 'Criando Termo de Apreensão...');
    
    try {
        closePrintModal();
        
        // Gerar e exibir prévia do documento
        const result = await ipcRenderer.invoke('print-termo-apreensao', currentOccurrence);
        hideLoading();
        if (!result.success) {
            customAlert.error('Erro ao gerar documento: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao gerar documento:', error);
        hideLoading();
        customAlert.error('Erro ao gerar documento');
    }
}

// Export to Excel - Abrir modal de filtros
function exportToExcel() {
    const modal = document.getElementById('exportFilterModal');
    modal.style.display = 'flex';
}

// Aplicar filtros e exportar
async function applyFiltersAndExport() {
    const filters = getExportFilters();
    
    // Log dos filtros aplicados para debug
    console.log('Filtros aplicados:', filters);
    console.log('Total de ocorrências antes do filtro:', allOccurrences.length);
    
    const filteredData = applyExportFilters(allOccurrences, filters);
    
    console.log('Total de ocorrências após filtro:', filteredData.length);
    
    if (filteredData.length === 0) {
        customAlert.warning('Nenhuma ocorrência encontrada com os filtros aplicados.<br><br>Verifique se os filtros estão corretos ou se há dados disponíveis.');
        return;
    }
    
    // Fechar modal
    closeExportModal();
    
    showLoading('Exportando dados', `Gerando arquivo Excel com ${filteredData.length} ocorrências...`);
    try {
        const result = await ipcRenderer.invoke('export-occurrences', filteredData);
        hideLoading();
        if (result.success) {
            customAlert.success(`Arquivo Excel exportado com sucesso!<br><br><strong>Total de registros:</strong> ${filteredData.length}<br><strong>Local:</strong> ${result.filePath}`);
        } else {
            customAlert.error('Erro ao exportar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao exportar:', error);
        hideLoading();
        customAlert.error('Erro ao exportar arquivo');
    }
}

// Obter filtros do modal
function getExportFilters() {
    return {
        dataInicio: document.getElementById('exportDataInicio').value,
        dataFim: document.getElementById('exportDataFim').value,
        tiposItem: {
            substancia: document.getElementById('filterSubstancia').checked,
            objeto: document.getElementById('filterObjeto').checked,
            simulacro: document.getElementById('filterSimulacro').checked,
            armaBranca: document.getElementById('filterArmaBranca').checked
        },
        status: {
            // Status para substância
            secrimpo: document.getElementById('filterStatusSecrimpo').checked,
            institutoIC: document.getElementById('filterStatusIC').checked,
            dop: document.getElementById('filterStatusDOP').checked,
            destruicao: document.getElementById('filterStatusDestruicao').checked,
            // Status para objeto
            secrimpoObj: document.getElementById('filterStatusSecrimpoObj').checked,
            cegoc: document.getElementById('filterStatusCEGOC').checked,
            icObj: document.getElementById('filterStatusICObj').checked
        }
    };
}

// Aplicar filtros aos dados
function applyExportFilters(data, filters) {
    let filteredCount = 0;
    let dateFilterCount = 0;
    let typeFilterCount = 0;
    let statusFilterCount = 0;
    
    const result = data.filter((occ, index) => {
        try {
            // Log da primeira ocorrência para debug
            if (index === 0) {
                console.log('Estrutura da primeira ocorrência:', occ);
            }
            // Filtro por data
            if (filters.dataInicio || filters.dataFim) {
                let dataOcorrencia = '';
                
                // Tentar extrair data da ocorrência
                if (occ.ocorrencia?.dataApreensao) {
                    dataOcorrencia = occ.ocorrencia.dataApreensao;
                } else if (occ.dataApreensao) {
                    dataOcorrencia = occ.dataApreensao;
                } else if (occ['Data Apreensão']) {
                    dataOcorrencia = occ['Data Apreensão'];
                }
                
                if (dataOcorrencia) {
                    // Converter para formato de data comparável
                    let dataOccDate;
                    
                    // Tentar diferentes formatos de data
                    if (dataOcorrencia.includes('/')) {
                        // Formato dd/mm/yyyy
                        const parts = dataOcorrencia.split('/');
                        if (parts.length === 3) {
                            dataOccDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        }
                    } else if (dataOcorrencia.includes('-')) {
                        // Formato yyyy-mm-dd ou dd-mm-yyyy
                        if (dataOcorrencia.length === 10) {
                            const parts = dataOcorrencia.split('-');
                            if (parts[0].length === 4) {
                                // yyyy-mm-dd
                                dataOccDate = new Date(dataOcorrencia);
                            } else {
                                // dd-mm-yyyy
                                dataOccDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                            }
                        }
                    } else {
                        // Tentar parsing direto
                        dataOccDate = new Date(dataOcorrencia);
                    }
                    
                    if (dataOccDate && !isNaN(dataOccDate)) {
                        if (filters.dataInicio) {
                            const dataInicio = new Date(filters.dataInicio);
                            if (dataOccDate < dataInicio) return false;
                        }
                        
                        if (filters.dataFim) {
                            const dataFim = new Date(filters.dataFim);
                            dataFim.setHours(23, 59, 59, 999); // Incluir todo o dia final
                            if (dataOccDate > dataFim) return false;
                        }
                    }
                }
            }
            
            // Filtro por tipo de item (espécie)
            let especie = '';
            if (occ.itemApreendido?.especie) {
                especie = occ.itemApreendido.especie.toLowerCase();
            } else if (occ.especie) {
                especie = occ.especie.toLowerCase();
            } else if (occ['Espécie']) {
                especie = occ['Espécie'].toLowerCase();
            } else if (occ.itemApreendido?.item) {
                especie = occ.itemApreendido.item.toLowerCase();
            } else if (occ.item) {
                especie = occ.item.toLowerCase();
            } else if (occ['Item']) {
                especie = occ['Item'].toLowerCase();
            }
            
            // Verificar se pelo menos um tipo está selecionado
            const algumTipoSelecionado = filters.tiposItem.substancia || 
                                       filters.tiposItem.objeto || 
                                       filters.tiposItem.simulacro || 
                                       filters.tiposItem.armaBranca;
            
            if (especie && algumTipoSelecionado) {
                const tiposAtivos = [];
                if (filters.tiposItem.substancia) tiposAtivos.push('substancia', 'substância', 'droga', 'entorpecente');
                if (filters.tiposItem.objeto) tiposAtivos.push('objeto', 'celular', 'eletrônico', 'aparelho');
                if (filters.tiposItem.simulacro) tiposAtivos.push('simulacro', 'replica', 'imitação');
                if (filters.tiposItem.armaBranca) tiposAtivos.push('arma branca', 'arma', 'faca', 'canivete', 'punhal');
                
                const encontrou = tiposAtivos.some(tipo => especie.includes(tipo));
                if (!encontrou) return false;
            }
            
            // Filtro por status
            let status = '';
            if (occ.ocorrencia?.status) {
                status = occ.ocorrencia.status.toLowerCase();
            } else if (occ.status) {
                status = occ.status.toLowerCase();
            } else if (occ['Status']) {
                status = occ['Status'].toLowerCase();
            }
            
            // Verificar se pelo menos um status está selecionado
            const algumStatusSelecionado = filters.status.secrimpo || 
                                         filters.status.institutoIC || 
                                         filters.status.dop || 
                                         filters.status.destruicao ||
                                         filters.status.secrimpoObj || 
                                         filters.status.cegoc || 
                                         filters.status.icObj;
            
            if (status && algumStatusSelecionado) {
                const statusAtivos = [];
                
                // Status para substância
                if (filters.status.secrimpo) statusAtivos.push('secrimpo');
                if (filters.status.institutoIC) statusAtivos.push('instituto de criminalística', 'instituto criminalística', 'ic');
                if (filters.status.dop) statusAtivos.push('dop');
                if (filters.status.destruicao) statusAtivos.push('destruição', 'destruicao');
                
                // Status para objeto
                if (filters.status.secrimpoObj) statusAtivos.push('secrimpo');
                if (filters.status.cegoc) statusAtivos.push('cegoc');
                if (filters.status.icObj) statusAtivos.push('ic');
                
                const encontrou = statusAtivos.some(tipo => status.includes(tipo));
                if (!encontrou) return false;
            }
            
            filteredCount++;
            return true;
        } catch (error) {
            console.error('Erro ao aplicar filtro na ocorrência:', error, occ);
            return true; // Incluir em caso de erro
        }
    });
    
    // Log das estatísticas de filtros
    console.log('Estatísticas de filtros:');
    console.log('- Total processado:', data.length);
    console.log('- Total filtrado:', result.length);
    console.log('- Filtros aplicados:', {
        data: !!(filters.dataInicio || filters.dataFim),
        tipos: !!(filters.tiposItem.substancia || filters.tiposItem.objeto || filters.tiposItem.simulacro || filters.tiposItem.armaBranca),
        status: !!(filters.status.secrimpo || filters.status.institutoIC || filters.status.dop || filters.status.destruicao || filters.status.secrimpoObj || filters.status.cegoc || filters.status.icObj)
    });
    
    return result;
}

// Fechar modal de filtros
function closeExportModal() {
    const modal = document.getElementById('exportFilterModal');
    modal.style.display = 'none';
}

// Resetar filtros
function resetExportFilters() {
    // Resetar filtros de data
    document.getElementById('exportDataInicio').value = '';
    document.getElementById('exportDataFim').value = '';
    
    // Resetar filtros de tipo de item
    document.getElementById('filterSubstancia').checked = true;
    document.getElementById('filterObjeto').checked = true;
    document.getElementById('filterSimulacro').checked = true;
    document.getElementById('filterArmaBranca').checked = true;
    
    // Resetar filtros de status para substância
    document.getElementById('filterStatusSecrimpo').checked = true;
    document.getElementById('filterStatusIC').checked = true;
    document.getElementById('filterStatusDOP').checked = true;
    document.getElementById('filterStatusDestruicao').checked = true;
    
    // Resetar filtros de status para objeto
    document.getElementById('filterStatusSecrimpoObj').checked = true;
    document.getElementById('filterStatusCEGOC').checked = true;
    document.getElementById('filterStatusICObj').checked = true;
}

// Search
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        filteredOccurrences = [...allOccurrences];
    } else {
        filteredOccurrences = allOccurrences.filter(occ => {
            try {
                // Tentar diferentes possíveis estruturas de dados
                let numeroGenesis = '';
                
                if (occ.ocorrencia?.numeroGenesis) {
                    numeroGenesis = occ.ocorrencia.numeroGenesis;
                }
                else if (occ.numeroGenesis) {
                    numeroGenesis = occ.numeroGenesis;
                }
                else if (occ['Nº Genesis']) {
                    numeroGenesis = occ['Nº Genesis'];
                }
                else if (occ['numeroGenesis']) {
                    numeroGenesis = occ['numeroGenesis'];
                }
                else if (occ['numero_genesis']) {
                    numeroGenesis = occ['numero_genesis'];
                }
                
                const numeroGenesisLower = (numeroGenesis || '').toString().toLowerCase();
                return numeroGenesisLower.includes(query);
            } catch (error) {
                console.error('Erro ao filtrar ocorrência:', error, occ);
                return false;
            }
        });
    }
    
    renderTable();
});

// Tab navigation
tabDashboard.addEventListener('click', () => {
    setActiveTab('dashboard');
});

tabOcorrencias.addEventListener('click', () => {
    setActiveTab('ocorrencias');
});

tabTCO.addEventListener('click', () => {
    setActiveTab('tco');
});

tabNovaOcorrencia.addEventListener('click', () => {
    ipcRenderer.send('load-panel');
});

function setActiveTab(tab) {
    // Remove active from all tabs
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    // Hide all sections
    sectionDashboard.style.display = 'none';
    sectionOcorrencias.style.display = 'none';
    sectionTCO.style.display = 'none';
    
    if (tab === 'dashboard') {
        tabDashboard.classList.add('active');
        sectionDashboard.style.display = 'block';
    } else if (tab === 'ocorrencias') {
        tabOcorrencias.classList.add('active');
        sectionOcorrencias.style.display = 'block';
    } else if (tab === 'tco') {
        tabTCO.classList.add('active');
        sectionTCO.style.display = 'block';
    }
}

// User menu
userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
        userDropdown.classList.remove('active');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    customAlert.confirm(
        'Deseja realmente sair do sistema?',
        () => {
            sessionStorage.clear();
            ipcRenderer.send('logout');
        }
    );
});

// Modal events
modalClose.addEventListener('click', closeModal);
btnCancelEdit.addEventListener('click', closeModal);
btnSaveEdit.addEventListener('click', saveEdit);
// Botão de deletar removido do modal de edição

deleteModalClose.addEventListener('click', () => {
    deleteModal.classList.remove('active');
});
btnCancelDelete.addEventListener('click', () => {
    deleteModal.classList.remove('active');
});
btnConfirmDelete.addEventListener('click', executeDelete);

printModalClose.addEventListener('click', closePrintModal);
btnCancelPrint.addEventListener('click', closePrintModal);
btnPrintTermoApreensao.addEventListener('click', printTermoApreensao);

// Refresh button
refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    
    try {
        await loadOccurrences();
        // Pequeno delay para mostrar a animação
        setTimeout(() => {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }, 500);
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
});

// Export button
exportBtn.addEventListener('click', exportToExcel);

// Modal de filtros de exportação - Event listeners
document.getElementById('closeExportModal').addEventListener('click', closeExportModal);
document.getElementById('applyFiltersBtn').addEventListener('click', applyFiltersAndExport);
document.getElementById('resetFiltersBtn').addEventListener('click', resetExportFilters);

// Fechar modal clicando fora
document.getElementById('exportFilterModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportFilterModal')) {
        closeExportModal();
    }
});

// Empty state button
btnNovaOcorrenciaEmpty.addEventListener('click', () => {
    ipcRenderer.send('load-panel');
});

// Close modal on outside click
viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) {
        closeModal();
    }
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.remove('active');
    }
});

printModal.addEventListener('click', (e) => {
    if (e.target === printModal) {
        closePrintModal();
    }
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateBR(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

function brDateToISO(brDate) {
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
}

function showEmptyState() {
    document.querySelector('.table-container').style.display = 'none';
    emptyState.style.display = 'block';
}

function hideEmptyState() {
    document.querySelector('.table-container').style.display = 'block';
    emptyState.style.display = 'none';
}

// Update charts
function updateCharts() {
    // Visão Geral - 3 gráficos principais
    createLineChart();          // Evolução Temporal
    createPieChartUnidade();    // Distribuição por Unidades
    createPieChartItens();      // Tipos de Itens Apreendidos
}

// Create pie chart - Occurrences over custom date range or last 30 days
function createLineChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (lineChart) {
        lineChart.destroy();
    }
    
    // Determine date range
    let startDate, endDate;
    if (customDateRange) {
        startDate = customDateRange.startDate;
        endDate = customDateRange.endDate;
    } else {
        // Default: last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
    }
    
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let labels = [];
    let counts = [];
    
    // Se período maior que 60 dias, agrupar por mês
    if (daysDiff > 60) {
        const monthCounts = {};
        
        // Filtrar ocorrências no período
        const filteredOccs = allOccurrences.filter(occ => {
            if (!occ.metadata?.dataRegistro) return false;
            const occDate = new Date(occ.metadata.dataRegistro);
            return occDate >= startDate && occDate <= endDate;
        });
        
        // Contar por mês
        filteredOccs.forEach(occ => {
            const occDate = new Date(occ.metadata.dataRegistro);
            const monthKey = `${monthNames[occDate.getMonth()]}/${occDate.getFullYear()}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });
        
        // Ordenar por data
        const sortedMonths = Object.entries(monthCounts).sort((a, b) => {
            const [monthA, yearA] = a[0].split('/');
            const [monthB, yearB] = b[0].split('/');
            const dateA = new Date(yearA, monthNames.indexOf(monthA));
            const dateB = new Date(yearB, monthNames.indexOf(monthB));
            return dateA - dateB;
        });
        
        labels = sortedMonths.map(([month]) => month);
        counts = sortedMonths.map(([, count]) => count);
    } else {
        // Período curto: agrupar por dia
        for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            labels.push(dateStr);
            
            const count = allOccurrences.filter(occ => {
                if (!occ.metadata?.dataRegistro) return false;
                const occDate = new Date(occ.metadata.dataRegistro);
                return occDate.toDateString() === date.toDateString();
            }).length;
            counts.push(count);
        }
    }
    
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalEvolutionOccurrences');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    const colors = ['#279b4d', '#071d49', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ff5722', '#795548'];
    
    lineChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create pie chart - Distribuição por Unidades
function createPieChartUnidade() {
    const ctx = document.getElementById('pieChartUnidade');
    if (!ctx) return;
    
    // Destroy existing chart
    if (pieChartUnidade) {
        pieChartUnidade.destroy();
    }
    
    // Contar por unidade (todos os dados)
    const unitCounts = {};
    allOccurrences.forEach(occ => {
        const unit = occ.ocorrencia?.unidade || 'Não especificado';
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sortedUnits = Object.entries(unitCounts)
        .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedUnits.map(([unit]) => unit);
    const counts = sortedUnits.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalUnidadeOccurrences');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ff5722', '#795548'];
    
    pieChartUnidade = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create pie chart - Tipos de Itens Apreendidos
function createPieChartItens() {
    const ctx = document.getElementById('pieChartItens');
    if (!ctx) return;
    
    // Destroy existing chart
    if (pieChartItens) {
        pieChartItens.destroy();
    }
    
    // Contar por espécie (todos os dados)
    const itemCounts = {};
    allOccurrences.forEach(occ => {
        const especie = occ.itemApreendido?.especie || 'Não especificado';
        itemCounts[especie] = (itemCounts[especie] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedItems.map(([item]) => item);
    const counts = sortedItems.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalItensOccurrences');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ff5722', '#795548'];
    
    pieChartItens = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create bar chart - Occurrences by day (last 7 days)
function createBarChartDay() {
    const ctx = document.getElementById('barChartDay');
    if (!ctx) return;
    
    // Destroy existing chart
    if (barChartDay) {
        barChartDay.destroy();
    }
    
    // Get last 7 days data
    const last7Days = [];
    const counts = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        last7Days.push(dateStr);
        
        const count = allOccurrences.filter(occ => {
            if (!occ.metadata?.dataRegistro) return false;
            const occDate = new Date(occ.metadata.dataRegistro);
            return occDate.toDateString() === date.toDateString();
        }).length;
        counts.push(count);
    }
    
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalDayOccurrences');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    barChartDay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Ocorrências',
                data: counts,
                backgroundColor: '#279b4d',
                borderColor: '#279b4d',
                borderWidth: 1,
                borderRadius: 6,
                hoverBackgroundColor: '#1f7d3d'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666'
                    },
                    grid: {
                        color: '#f0f2f5'
                    }
                },
                x: {
                    ticks: {
                        color: '#666'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create pie chart - Occurrences by unit with date filter
function createPieChartUnidadePeriodo() {
    const ctx = document.getElementById('pieChartUnidadePeriodo');
    if (!ctx) return;
    
    // Destroy existing chart
    if (pieChartUnidadePeriodo) {
        pieChartUnidadePeriodo.destroy();
    }
    
    // Determine date range
    let startDate, endDate;
    if (customDateRangeUnidade) {
        startDate = customDateRangeUnidade.startDate;
        endDate = customDateRangeUnidade.endDate;
    } else {
        // Default: last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
    }
    
    // Filtrar ocorrências no período
    const filteredOccs = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate >= startDate && occDate <= endDate;
    });
    
    // Contar por unidade
    const unitCounts = {};
    filteredOccs.forEach(occ => {
        const unit = occ.ocorrencia?.unidade || 'Não especificado';
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sortedUnits = Object.entries(unitCounts)
        .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedUnits.map(([unit]) => unit);
    const counts = sortedUnits.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalUnidadePeriodo');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ff5722', '#795548'];
    
    pieChartUnidadePeriodo = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create pie chart - Item types with date filter
function createPieChartItensPeriodo() {
    const ctx = document.getElementById('pieChartItensPeriodo');
    if (!ctx) return;
    
    // Destroy existing chart
    if (pieChartItensPeriodo) {
        pieChartItensPeriodo.destroy();
    }
    
    // Determine date range
    let startDate, endDate;
    if (customDateRangeItens) {
        startDate = customDateRangeItens.startDate;
        endDate = customDateRangeItens.endDate;
    } else {
        // Default: last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
    }
    
    // Filtrar ocorrências no período
    const filteredOccs = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate >= startDate && occDate <= endDate;
    });
    
    // Contar por tipo de item
    const itemCounts = {};
    filteredOccs.forEach(occ => {
        const item = occ.itemApreendido?.item || 'Não especificado';
        itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1]);
    
    const labels = sortedItems.map(([item]) => item);
    const counts = sortedItems.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalItensPeriodo');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    const colors = ['#fac709', '#279b4d', '#071d49', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#2196f3', '#ff5722', '#795548'];
    
    pieChartItensPeriodo = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create pie chart - Occurrences by unit by month
function createPieChartUnidadeMes() {
    const ctx = document.getElementById('pieChartUnidadeMes');
    if (!ctx) return;
    
    if (pieChartUnidadeMes) {
        pieChartUnidadeMes.destroy();
    }
    
    const unitCounts = {};
    allOccurrences.forEach(occ => {
        const unit = occ.ocorrencia?.unidade || 'Não especificado';
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });
    
    const sortedUnits = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedUnits.map(([unit]) => unit);
    const data = sortedUnits.map(([, count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    
    const totalElement = document.getElementById('totalUnidadeMes');
    if (totalElement) totalElement.textContent = total;
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50'];
    
    pieChartUnidadeMes = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create bar chart - Occurrences by unit by day (last 7 days)
function createBarChartUnidadeDia() {
    const ctx = document.getElementById('barChartUnidadeDia');
    if (!ctx) return;
    
    if (barChartUnidadeDia) {
        barChartUnidadeDia.destroy();
    }
    
    // Filtrar ocorrências dos últimos 7 dias
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const last7DaysOccs = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate >= sevenDaysAgo && occDate <= now;
    });
    
    // Agrupar por unidade
    const unitCounts = {};
    last7DaysOccs.forEach(occ => {
        const unit = occ.ocorrencia?.unidade || 'Não especificado';
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });
    
    const sortedUnits = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedUnits.map(([unit]) => unit);
    const counts = sortedUnits.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    const totalElement = document.getElementById('totalUnidadeDia');
    if (totalElement) totalElement.textContent = total;
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50'];
    
    barChartUnidadeDia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ocorrências',
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#666' }, grid: { color: '#f0f2f5' } },
                x: { ticks: { color: '#666' }, grid: { display: false } }
            }
        }
    });
}

// Create pie chart - Items by month
function createPieChartItensMes() {
    const ctx = document.getElementById('pieChartItensMes');
    if (!ctx) return;
    
    if (pieChartItensMes) {
        pieChartItensMes.destroy();
    }
    
    const itemCounts = {};
    allOccurrences.forEach(occ => {
        const item = occ.itemApreendido?.item || 'Não especificado';
        itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedItems.map(([item]) => item);
    const data = sortedItems.map(([, count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    
    const totalElement = document.getElementById('totalItensMes');
    if (totalElement) totalElement.textContent = total;
    
    const colors = ['#071d49', '#279b4d', '#fac709', '#c33', '#1976d2', '#f57c00', '#7b1fa2', '#00897b', '#00bcd4', '#ff9800'];
    
    pieChartItensMes = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create bar chart - Items by day (last 7 days)
function createBarChartItensDia() {
    const ctx = document.getElementById('barChartItensDia');
    if (!ctx) return;
    
    if (barChartItensDia) {
        barChartItensDia.destroy();
    }
    
    // Filtrar ocorrências dos últimos 7 dias
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const last7DaysOccs = allOccurrences.filter(occ => {
        if (!occ.metadata?.dataRegistro) return false;
        const occDate = new Date(occ.metadata.dataRegistro);
        return occDate >= sevenDaysAgo && occDate <= now;
    });
    
    // Agrupar por tipo de item
    const itemCounts = {};
    last7DaysOccs.forEach(occ => {
        const item = occ.itemApreendido?.item || 'Não especificado';
        itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedItems.map(([item]) => item);
    const counts = sortedItems.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);
    
    const totalElement = document.getElementById('totalItensDia');
    if (totalElement) totalElement.textContent = total;
    
    const colors = ['#fac709', '#279b4d', '#071d49', '#c33', '#00bcd4', '#ff9800', '#9c27b0', '#4caf50'];
    
    barChartItensDia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ocorrências',
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#666' }, grid: { color: '#f0f2f5' } },
                x: { ticks: { color: '#666' }, grid: { display: false } }
            }
        }
    });
}

// Create pie chart - Occurrences by month
function createPieChartMonth() {
    const ctx = document.getElementById('pieChartMonth');
    if (!ctx) return;
    
    // Destroy existing chart
    if (pieChartMonth) {
        pieChartMonth.destroy();
    }
    
    // Count by month
    const monthCounts = {};
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Initialize all months with 0
    monthNames.forEach(month => {
        monthCounts[month] = 0;
    });
    
    // Count occurrences by month
    allOccurrences.forEach(occ => {
        if (occ.metadata?.dataRegistro) {
            const occDate = new Date(occ.metadata.dataRegistro);
            const monthName = monthNames[occDate.getMonth()];
            monthCounts[monthName]++;
        }
    });
    
    // Filter out months with 0 occurrences and sort by month order
    const sortedData = monthNames
        .map(month => ({ month, count: monthCounts[month] }))
        .filter(item => item.count > 0);
    
    const labels = sortedData.map(item => item.month);
    const data = sortedData.map(item => item.count);
    const total = data.reduce((a, b) => a + b, 0);
    
    // Update total display
    const totalElement = document.getElementById('totalMonthOccurrences');
    if (totalElement) {
        totalElement.textContent = total;
    }
    
    // Colors for each month
    const colors = [
        '#279b4d', '#071d49', '#fac709', '#c33',
        '#00bcd4', '#ff9800', '#9c27b0', '#4caf50',
        '#f44336', '#2196f3', '#ff5722', '#795548'
    ];
    
    pieChartMonth = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#071d49',
                    padding: 16,
                    titleFont: {
                        size: 0
                    },
                    bodyFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyColor: '#fff',
                    borderColor: '#fac709',
                    borderWidth: 2,
                    displayColors: false,
                    callbacks: {
                        title: function() {
                            return '';
                        },
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ==================== FILTRO DE DATA PERSONALIZADA ====================

// Função para validar data no formato brasileiro
function isValidDateFilter(dateString) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

// Função para converter data brasileira para objeto Date
function brDateToDateObj(brDate) {
    const [day, month, year] = brDate.split('/');
    return new Date(year, month - 1, day);
}

// Aplicar máscara de data nos campos de filtro
function applyDateMaskFilter(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }
    
    e.target.value = value;
}

// Event listeners para máscaras de data
if (filterDataInicio) {
    filterDataInicio.addEventListener('input', applyDateMaskFilter);
}

if (filterDataFim) {
    filterDataFim.addEventListener('input', applyDateMaskFilter);
}

// Filtrar gráfico por data personalizada
if (btnFilterChart) {
    btnFilterChart.addEventListener('click', () => {
        const dataInicio = filterDataInicio.value;
        const dataFim = filterDataFim.value;
        
        if (!dataInicio || !dataFim) {
            customAlert.error('Por favor, preencha ambas as datas');
            return;
        }
        
        if (!isValidDateFilter(dataInicio)) {
            customAlert.error('Data de início inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        if (!isValidDateFilter(dataFim)) {
            customAlert.error('Data de fim inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        const startDate = brDateToDateObj(dataInicio);
        const endDate = brDateToDateObj(dataFim);
        
        if (startDate > endDate) {
            customAlert.error('A data de início deve ser anterior à data de fim');
            return;
        }
        
        customDateRange = { startDate, endDate };
        createLineChart();
    });
}

// Resetar filtro para últimos 30 dias
if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
        customDateRange = null;
        filterDataInicio.value = '';
        filterDataFim.value = '';
        createLineChart();
    });
}

// ==================== FILTRO DE DATA PARA UNIDADE ====================

// Event listeners para máscaras de data - Unidade
if (filterDataInicioUnidade) {
    filterDataInicioUnidade.addEventListener('input', applyDateMaskFilter);
}

if (filterDataFimUnidade) {
    filterDataFimUnidade.addEventListener('input', applyDateMaskFilter);
}

// Filtrar gráfico de Unidade por data personalizada
if (btnFilterChartUnidade) {
    btnFilterChartUnidade.addEventListener('click', () => {
        const dataInicio = filterDataInicioUnidade.value;
        const dataFim = filterDataFimUnidade.value;
        
        if (!dataInicio || !dataFim) {
            customAlert.error('Por favor, preencha ambas as datas');
            return;
        }
        
        if (!isValidDateFilter(dataInicio)) {
            customAlert.error('Data de início inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        if (!isValidDateFilter(dataFim)) {
            customAlert.error('Data de fim inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        const startDate = brDateToDateObj(dataInicio);
        const endDate = brDateToDateObj(dataFim);
        
        if (startDate > endDate) {
            customAlert.error('A data de início deve ser anterior à data de fim');
            return;
        }
        
        customDateRangeUnidade = { startDate, endDate };
        createPieChartUnidade();
    });
}

// Resetar filtro de Unidade
if (btnResetFilterUnidade) {
    btnResetFilterUnidade.addEventListener('click', () => {
        customDateRangeUnidade = null;
        filterDataInicioUnidade.value = '';
        filterDataFimUnidade.value = '';
        createPieChartUnidade();
    });
}

// ==================== FILTRO DE DATA PARA ITENS ====================

// Event listeners para máscaras de data - Itens
if (filterDataInicioItens) {
    filterDataInicioItens.addEventListener('input', applyDateMaskFilter);
}

if (filterDataFimItens) {
    filterDataFimItens.addEventListener('input', applyDateMaskFilter);
}

// Filtrar gráfico de Itens por data personalizada
if (btnFilterChartItens) {
    btnFilterChartItens.addEventListener('click', () => {
        const dataInicio = filterDataInicioItens.value;
        const dataFim = filterDataFimItens.value;
        
        if (!dataInicio || !dataFim) {
            customAlert.error('Por favor, preencha ambas as datas');
            return;
        }
        
        if (!isValidDateFilter(dataInicio)) {
            customAlert.error('Data de início inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        if (!isValidDateFilter(dataFim)) {
            customAlert.error('Data de fim inválida. Use o formato dd/mm/aaaa');
            return;
        }
        
        const startDate = brDateToDateObj(dataInicio);
        const endDate = brDateToDateObj(dataFim);
        
        if (startDate > endDate) {
            customAlert.error('A data de início deve ser anterior à data de fim');
            return;
        }
        
        customDateRangeItens = { startDate, endDate };
        createPieChartItens();
    });
}

// Resetar filtro de Itens
if (btnResetFilterItens) {
    btnResetFilterItens.addEventListener('click', () => {
        customDateRangeItens = null;
        filterDataInicioItens.value = '';
        filterDataFimItens.value = '';
        createPieChartItens();
    });
}

// ==================== FUNCIONALIDADE TCO ====================

// Elementos TCO
const searchInputTCO = document.getElementById('searchInputTCO');
const refreshBtnTCO = document.getElementById('refreshBtnTCO');
const exportBtnTCO = document.getElementById('exportBtnTCO');
const tcoTableBody = document.getElementById('tcoTableBody');

let tcoData = []; // Array para armazenar dados dos TCOs

// Função para carregar TCOs do Google Sheets
async function loadTCOs() {
    try {
        const response = await ipcRenderer.invoke('get-tcos');
        
        if (response.success && response.tcos) {
            // Mapear os dados corretamente
            tcoData = response.tcos.map(tco => mapTCOData(tco));
            console.log('TCOs carregados e mapeados:', tcoData.length);
        } else {
            console.error('Erro ao carregar TCOs:', response);
            tcoData = [];
        }
        
        renderTCOTable();
        
    } catch (error) {
        console.error('Erro ao carregar TCOs:', error);
        tcoData = [];
        renderTCOTable();
    }
}

// Variável para armazenar TCOs filtrados (igual às ocorrências)
let filteredTCOs = [];

// Função para extrair dados corretos do TCO baseado na ocorrência
function mapTCOData(tco) {
    // O TCO deve ter os dados mapeados da ocorrência:
    // RAP = numeroGenesis da ocorrência (Nº Genesis)
    // ENVOLVIDO = nome completo do proprietário (Nome Completo em Dados do Proprietário)
    // ILÍCITO = espécie do item apreendido (Espécie em Item Apreendido)
    
    let rap = 'N/A';
    let envolvido = 'N/A';
    let ilicito = 'N/A';
    
    // Tentar diferentes possíveis campos para RAP (Nº Genesis)
    if (tco['RAP (GÊNESIS)']) rap = tco['RAP (GÊNESIS)'];
    else if (tco.numeroGenesis) rap = tco.numeroGenesis;
    else if (tco['Nº Genesis']) rap = tco['Nº Genesis'];
    else if (tco.rap) rap = tco.rap;
    
    // Tentar diferentes possíveis campos para ENVOLVIDO (Nome Completo)
    if (tco['Envolvido']) envolvido = tco['Envolvido'];
    else if (tco.nomeCompleto) envolvido = tco.nomeCompleto;
    else if (tco['Nome Completo']) envolvido = tco['Nome Completo'];
    else if (tco.envolvido) envolvido = tco.envolvido;
    
    // Tentar diferentes possíveis campos para ILÍCITO (Espécie)
    if (tco['Ilícito']) ilicito = tco['Ilícito'];
    else if (tco.especie) ilicito = tco.especie;
    else if (tco['Espécie']) ilicito = tco['Espécie'];
    else if (tco.ilicito) ilicito = tco.ilicito;
    
    return {
        rap: rap,
        envolvido: envolvido,
        ilicito: ilicito,
        // Manter outros campos se existirem
        id: tco.id || Math.random().toString(36).substr(2, 9),
        dataRegistro: tco.dataRegistro || tco['Data Registro'] || new Date().toISOString()
    };
}

// Função para renderizar tabela de TCOs
function renderTCOTable(searchTerm = '') {
    tcoTableBody.innerHTML = '';
    
    filteredTCOs = tcoData;
    
    // Filtrar por termo de busca
    if (searchTerm) {
        filteredTCOs = tcoData.filter(tco => 
            tco.rap.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tco.envolvido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tco.ilicito.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Se não houver dados, mostra mensagem na tabela
    if (filteredTCOs.length === 0) {
        tcoTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #999;">Nenhum TCO encontrado</td></tr>';
        return;
    }
    
    filteredTCOs.forEach((tco, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${tco.rap}</strong></td>
            <td>${tco.envolvido}</td>
            <td>${tco.ilicito}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewTCO(${index})" title="Ver detalhes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-edit" onclick="editTCO(${index})" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-print" onclick="openTCOPrintModal(${index})" title="Imprimir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-delete-action" onclick="confirmTCODelete(${index})" title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tcoTableBody.appendChild(row);
    });
}

// Busca de TCO
if (searchInputTCO) {
    searchInputTCO.addEventListener('input', (e) => {
        renderTCOTable(e.target.value);
    });
}

// Atualizar TCOs
if (refreshBtnTCO) {
    refreshBtnTCO.addEventListener('click', async () => {
        refreshBtnTCO.classList.add('loading');
        refreshBtnTCO.disabled = true;
        
        try {
            await loadTCOs();
            // Pequeno delay para mostrar a animação
            setTimeout(() => {
                refreshBtnTCO.classList.remove('loading');
                refreshBtnTCO.disabled = false;
            }, 500);
        } catch (error) {
            console.error('Erro ao atualizar TCOs:', error);
            refreshBtnTCO.classList.remove('loading');
            refreshBtnTCO.disabled = false;
        }
    });
}

// Exportar TCOs para Excel - Abrir modal de filtros
if (exportBtnTCO) {
    exportBtnTCO.addEventListener('click', () => {
        document.getElementById('exportTCOFilterModal').style.display = 'flex';
    });
}

// ==================== VARIÁVEIS GLOBAIS TCO ====================
let currentTCO = null;
let isTCOEditMode = false;

// Elementos dos modais de TCO
const tcoModal = document.getElementById('tcoModal');
const tcoModalClose = document.getElementById('tcoModalClose');
const tcoModalTitle = document.getElementById('tcoModalTitle');
const tcoModalBody = document.getElementById('tcoModalBody');
const btnCloseTCO = document.getElementById('btnCloseTCO');
const btnSaveEditTCO = document.getElementById('btnSaveEditTCO');

const deleteTCOModal = document.getElementById('deleteTCOModal');
const deleteTCOModalClose = document.getElementById('deleteTCOModalClose');
const deleteTCOId = document.getElementById('deleteTCOId');
const btnCancelDeleteTCO = document.getElementById('btnCancelDeleteTCO');
const btnConfirmDeleteTCO = document.getElementById('btnConfirmDeleteTCO');

const printTCOModal = document.getElementById('printTCOModal');
const printTCOModalClose = document.getElementById('printTCOModalClose');
const printTCOId = document.getElementById('printTCOId');
const btnCancelPrintTCO = document.getElementById('btnCancelPrintTCO');
const btnPrintTCODocument = document.getElementById('btnPrintTCODocument');

// ==================== EVENT LISTENERS DOS MODAIS TCO ====================

// Modal de visualização/edição de TCO
if (tcoModalClose) {
    tcoModalClose.addEventListener('click', closeTCOModal);
}
if (btnCloseTCO) {
    btnCloseTCO.addEventListener('click', closeTCOModal);
}
if (btnSaveEditTCO) {
    btnSaveEditTCO.addEventListener('click', executeTCOEdit);
}

// Modal de exclusão de TCO
if (deleteTCOModalClose) {
    deleteTCOModalClose.addEventListener('click', () => {
        deleteTCOModal.classList.remove('active');
    });
}
if (btnCancelDeleteTCO) {
    btnCancelDeleteTCO.addEventListener('click', () => {
        deleteTCOModal.classList.remove('active');
    });
}
if (btnConfirmDeleteTCO) {
    btnConfirmDeleteTCO.addEventListener('click', executeTCODelete);
}

// Modal de impressão de TCO
if (printTCOModalClose) {
    printTCOModalClose.addEventListener('click', () => {
        printTCOModal.classList.remove('active');
    });
}
if (btnCancelPrintTCO) {
    btnCancelPrintTCO.addEventListener('click', () => {
        printTCOModal.classList.remove('active');
    });
}
if (btnPrintTCODocument) {
    btnPrintTCODocument.addEventListener('click', printTCODocument);
}

// Fechar modais ao clicar fora
if (tcoModal) {
    tcoModal.addEventListener('click', (e) => {
        if (e.target === tcoModal) {
            closeTCOModal();
        }
    });
}
if (deleteTCOModal) {
    deleteTCOModal.addEventListener('click', (e) => {
        if (e.target === deleteTCOModal) {
            deleteTCOModal.classList.remove('active');
        }
    });
}
if (printTCOModal) {
    printTCOModal.addEventListener('click', (e) => {
        if (e.target === printTCOModal) {
            printTCOModal.classList.remove('active');
        }
    });
}

// ==================== FUNÇÕES DOS MODAIS TCO ====================

// Fechar modal de TCO
function closeTCOModal() {
    tcoModal.classList.remove('active');
    currentTCO = null;
    isTCOEditMode = false;
}

// View TCO (igual às ocorrências)
window.viewTCO = function(index) {
    currentTCO = filteredTCOs[index];
    isTCOEditMode = false;
    showTCOModal(false);
};

// Edit TCO (igual às ocorrências)
window.editTCO = function(index) {
    currentTCO = filteredTCOs[index];
    isTCOEditMode = true;
    showTCOModal(true);
};

// Open TCO print modal (igual às ocorrências)
window.openTCOPrintModal = function(index) {
    currentTCO = filteredTCOs[index];
    printTCOId.textContent = currentTCO.rap;
    printTCOModal.classList.add('active');
};

// Open TCO delete modal (igual às ocorrências)
window.confirmTCODelete = function(index) {
    currentTCO = filteredTCOs[index];
    deleteTCOId.textContent = currentTCO.rap;
    deleteTCOModal.classList.add('active');
};

// ==================== FUNÇÕES DE MODAL TCO ====================

// Show TCO modal (igual às ocorrências, mas apenas com dados do TCO)
function showTCOModal(editable) {
    if (!currentTCO) return;

    tcoModalTitle.textContent = editable ? 'Editar TCO' : 'Detalhes do TCO';

    tcoModalBody.innerHTML = `
        <!-- Seção TCO -->
        <section class="form-section">
            <h2 class="section-title">Dados do TCO</h2>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-tco-rap">RAP (GÊNESIS)</label>
                    <input type="text" id="edit-tco-rap" name="edit-tco-rap" value="${currentTCO.rap || ''}" ${!editable ? 'disabled' : 'required'}>
                </div>
                <div class="form-group">
                    <label for="edit-tco-envolvido">Envolvido</label>
                    <input type="text" id="edit-tco-envolvido" name="edit-tco-envolvido" value="${currentTCO.envolvido || ''}" ${!editable ? 'disabled' : 'required'}>
                </div>
                <div class="form-group">
                    <label for="edit-tco-ilicito">Ilícito</label>
                    ${editable ? `
                    <select id="edit-tco-ilicito" name="edit-tco-ilicito" required>
                        <option value="">Selecione...</option>
                        <option value="SUBSTÂNCIA" ${currentTCO.ilicito === 'SUBSTÂNCIA' ? 'selected' : ''}>SUBSTÂNCIA</option>
                        <option value="OBJETO" ${currentTCO.ilicito === 'OBJETO' ? 'selected' : ''}>OBJETO</option>
                        <option value="SIMULACRO" ${currentTCO.ilicito === 'SIMULACRO' ? 'selected' : ''}>SIMULACRO</option>
                        <option value="ARMA BRANCA" ${currentTCO.ilicito === 'ARMA BRANCA' ? 'selected' : ''}>ARMA BRANCA</option>
                    </select>
                    ` : `
                    <input type="text" id="edit-tco-ilicito" value="${currentTCO.ilicito || ''}" disabled>
                    `}
                </div>
            </div>
        </section>

        <!-- Seção Informações do Registro -->
        <section class="form-section">
            <h2 class="section-title">Informações do Registro</h2>
            <div class="form-grid">
                <div class="form-group">
                    <label>Data do Registro</label>
                    <input type="text" value="${formatDateTime(currentTCO.dataRegistro)}" disabled>
                </div>
            </div>
        </section>
    `;

    btnSaveEditTCO.style.display = editable ? 'inline-flex' : 'none';
    
    tcoModal.classList.add('active');
    
    // Configurar lógica dinâmica do modal de edição se estiver em modo editável
    if (editable) {
        setupTCOModalEditLogic();
    }
}

// Configurar lógica dinâmica do modal de edição de TCO (simplificada)
function setupTCOModalEditLogic() {
    // Como agora temos apenas 3 campos simples (RAP, Envolvido, Ilícito),
    // não precisamos de lógica complexa de máscaras ou validações especiais
    
    // Focar no campo RAP e Ilícito se necessário
    const rapInput = document.getElementById('edit-tco-rap');
    const ilicitoSelect = document.getElementById('edit-tco-ilicito');
    
    // Apenas garantir que os campos estão funcionando corretamente
    if (rapInput) {
        rapInput.addEventListener('input', function() {
            // Remover espaços extras
            this.value = this.value.trim();
        });
    }
    
    if (ilicitoSelect) {
        ilicitoSelect.addEventListener('change', function() {
            // Garantir que uma opção foi selecionada
            if (this.value === '') {
                this.style.borderColor = '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

// Executar edição de TCO (apenas 3 campos principais)
async function executeTCOEdit() {
    if (!currentTCO) return;

    // Coletar dados do formulário (apenas os 3 campos principais) em maiúsculas
    const formData = {
        id: currentTCO.id,
        rap: document.getElementById('edit-tco-rap').value.toUpperCase(),
        envolvido: document.getElementById('edit-tco-envolvido').value.toUpperCase(),
        ilicito: document.getElementById('edit-tco-ilicito').value.toUpperCase()
    };

    // Validar campos obrigatórios
    if (!formData.rap || !formData.envolvido || !formData.ilicito) {
        customAlert.error('Preencha todos os campos obrigatórios');
        return;
    }

    showLoading('Atualizando TCO', 'Salvando alterações...');
    try {
        const result = await ipcRenderer.invoke('update-tco', formData);
        hideLoading();
        if (result.success) {
            customAlert.success('TCO atualizado com sucesso!');
            closeTCOModal();
            loadTCOs();
        } else {
            customAlert.error('Erro ao atualizar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao atualizar TCO:', error);
        hideLoading();
        customAlert.error('Erro ao atualizar TCO');
    }
}

// Execute TCO delete (igual às ocorrências)
async function executeTCODelete() {
    if (!currentTCO) return;

    showLoading('Excluindo TCO', 'Removendo do sistema...');
    try {
        const result = await ipcRenderer.invoke('delete-tco', currentTCO.rap);
        hideLoading();
        if (result.success) {
            customAlert.success('TCO excluído com sucesso!');
            deleteTCOModal.classList.remove('active');
            closeTCOModal();
            loadTCOs();
        } else {
            customAlert.error('Erro ao excluir: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao excluir TCO:', error);
        hideLoading();
        customAlert.error('Erro ao excluir TCO');
    }
}

// Close TCO print modal (igual às ocorrências)
function closeTCOPrintModal() {
    printTCOModal.classList.remove('active');
}

// Print TCO document (igual às ocorrências)
async function printTCODocument() {
    if (!currentTCO) return;
    
    printTCOModal.classList.remove('active');
    showLoading('Gerando documento', 'Criando documento TCO...');
    
    try {
        closeTCOPrintModal();
        
        // Gerar e exibir prévia do documento
        const result = await ipcRenderer.invoke('print-tco-document', currentTCO);
        hideLoading();
        if (!result.success) {
            customAlert.error('Erro ao gerar documento: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao gerar documento TCO:', error);
        hideLoading();
        customAlert.error('Erro ao gerar documento');
    }
}

// ==================== FILTROS DE EXPORTAÇÃO TCO ====================

// Elementos do modal de filtros TCO
const exportTCOFilterModal = document.getElementById('exportTCOFilterModal');
const closeExportTCOModal = document.getElementById('closeExportTCOModal');
const resetTCOFiltersBtn = document.getElementById('resetTCOFiltersBtn');
const applyTCOFiltersBtn = document.getElementById('applyTCOFiltersBtn');

// Fechar modal de filtros TCO
if (closeExportTCOModal) {
    closeExportTCOModal.addEventListener('click', () => {
        exportTCOFilterModal.style.display = 'none';
    });
}

// Limpar filtros TCO
if (resetTCOFiltersBtn) {
    resetTCOFiltersBtn.addEventListener('click', () => {
        // Limpar campos de data
        document.getElementById('exportTCODataInicio').value = '';
        document.getElementById('exportTCODataFim').value = '';
        
        // Marcar todos os checkboxes de ilícito
        document.getElementById('filterTCOSubstancia').checked = true;
        document.getElementById('filterTCOObjeto').checked = true;
        document.getElementById('filterTCOSimulacro').checked = true;
        document.getElementById('filterTCOArmaBranca').checked = true;
    });
}

// Aplicar filtros e exportar TCO
if (applyTCOFiltersBtn) {
    applyTCOFiltersBtn.addEventListener('click', async () => {
        // Fechar modal
        exportTCOFilterModal.style.display = 'none';
        
        // Coletar filtros
        const filters = {
            dataInicio: document.getElementById('exportTCODataInicio').value,
            dataFim: document.getElementById('exportTCODataFim').value,
            ilicitos: {
                substancia: document.getElementById('filterTCOSubstancia').checked,
                objeto: document.getElementById('filterTCOObjeto').checked,
                simulacro: document.getElementById('filterTCOSimulacro').checked,
                armaBranca: document.getElementById('filterTCOArmaBranca').checked
            }
        };
        
        // Filtrar dados
        const filteredTCOs = applyTCOFilters(tcoData, filters);
        
        if (filteredTCOs.length === 0) {
            customAlert.warning('Nenhum TCO encontrado com os filtros aplicados.');
            return;
        }
        
        showLoading('Exportando TCOs', 'Gerando arquivo Excel...');
        try {
            const result = await ipcRenderer.invoke('export-tcos', filteredTCOs);
            hideLoading();
            if (result.success) {
                customAlert.success(`Arquivo Excel exportado com sucesso!<br><br><strong>Registros:</strong> ${filteredTCOs.length}<br><strong>Local:</strong> ${result.filePath}`);
            } else {
                customAlert.error('Erro ao exportar: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao exportar TCOs:', error);
            hideLoading();
            customAlert.error('Erro ao exportar arquivo');
        }
    });
}

// Função para aplicar filtros aos TCOs
function applyTCOFilters(data, filters) {
    return data.filter(tco => {
        // Filtro por data
        if (filters.dataInicio || filters.dataFim) {
            const tcoDate = new Date(tco.dataRegistro);
            if (filters.dataInicio) {
                const startDate = new Date(filters.dataInicio);
                if (tcoDate < startDate) return false;
            }
            if (filters.dataFim) {
                const endDate = new Date(filters.dataFim);
                endDate.setHours(23, 59, 59, 999);
                if (tcoDate > endDate) return false;
            }
        }
        
        // Filtro por tipo de ilícito
        const ilicito = (tco.ilicito || '').toLowerCase();
        const ilicitoTerms = {
            substancia: ['substância', 'substancia', 'droga', 'entorpecente'],
            objeto: ['objeto', 'celular', 'eletrônico', 'aparelho', 'bem', 'item'],
            simulacro: ['simulacro', 'replica', 'imitação'],
            armaBranca: ['arma branca', 'arma', 'faca', 'canivete', 'punhal']
        };
        
        let matchesIlicito = false;
        
        if (filters.ilicitos.substancia && (ilicito === 'substância' || ilicitoTerms.substancia.some(term => ilicito.includes(term)))) {
            matchesIlicito = true;
        }
        if (filters.ilicitos.objeto && (ilicito === 'objeto' || ilicitoTerms.objeto.some(term => ilicito.includes(term)))) {
            matchesIlicito = true;
        }
        if (filters.ilicitos.simulacro && (ilicito === 'simulacro' || ilicitoTerms.simulacro.some(term => ilicito.includes(term)))) {
            matchesIlicito = true;
        }
        if (filters.ilicitos.armaBranca && (ilicito === 'arma branca' || ilicitoTerms.armaBranca.some(term => ilicito.includes(term)))) {
            matchesIlicito = true;
        }
        
        return matchesIlicito;
    });
}

// Função para obter opções de status baseado na espécie
function getStatusOptions(especie) {
    if (especie === 'SUBSTÂNCIA') {
        // Status para substâncias
        return ['SECRIMPO', 'INSTITUTO DE CRIMINALÍSTICA', 'DOP', 'DESTRUIÇÃO'];
    } else if (especie === 'OBJETO' || especie === 'SIMULACRO' || especie === 'ARMA BRANCA') {
        // Status para objetos, simulacros e armas brancas
        return ['SECRIMPO', 'CEGOC', 'IC'];
    } else {
        // Status gerais para outras espécies
        return ['SECRIMPO', 'CEGOC', 'IC'];
    }
}

// Função para atualizar status
window.updateStatus = async function(index, newStatus) {
    // Permitir valores vazios para limpar o status
    if (newStatus === undefined || newStatus === null) return;
    
    const occurrence = filteredOccurrences[index];
    if (!occurrence) return;
    
    try {
        console.log('Atualizando status para:', newStatus);
        console.log('Ocorrência atual:', occurrence);
        
        // Verificar se a estrutura da ocorrência está correta
        if (!occurrence.ocorrencia) {
            occurrence.ocorrencia = {};
        }
        
        // Atualizar localmente
        occurrence.ocorrencia.status = newStatus || '';
        
        // Função auxiliar para converter para maiúsculas com segurança
        const safeToUpperCase = (value) => {
            if (value === null || value === undefined) return '';
            return String(value).toUpperCase();
        };

        // Preparar dados para atualização (em maiúsculas)
        const updatedData = {
            id: occurrence.id,
            numeroGenesisOriginal: occurrence.ocorrencia?.numeroGenesis || '',
            ocorrencia: {
                numeroGenesis: safeToUpperCase(occurrence.ocorrencia?.numeroGenesis),
                unidade: safeToUpperCase(occurrence.ocorrencia?.unidade),
                dataApreensao: occurrence.ocorrencia?.dataApreensao || '',
                leiInfrigida: safeToUpperCase(occurrence.ocorrencia?.leiInfrigida),
                artigo: safeToUpperCase(occurrence.ocorrencia?.artigo),
                status: safeToUpperCase(newStatus),
                policialCondutor: safeToUpperCase(occurrence.ocorrencia?.policialCondutor)
            },
            itemApreendido: convertToUppercase(occurrence.itemApreendido || {}),
            proprietario: convertToUppercase(occurrence.proprietario || {}),
            policial: convertToUppercase(occurrence.policial || {}),
            metadata: {
                registradoPor: 'Dashboard',
                dataRegistro: new Date().toISOString()
            }
        };
        
        // Enviar atualização para o backend
        const result = await ipcRenderer.invoke('update-occurrence', updatedData);
        
        if (result.success) {
            customAlert.success('Status atualizado com sucesso!');
            
            // Atualizar também no array principal
            const mainIndex = allOccurrences.findIndex(occ => 
                occ.ocorrencia?.numeroGenesis === occurrence.ocorrencia.numeroGenesis
            );
            if (mainIndex !== -1) {
                allOccurrences[mainIndex].ocorrencia.status = newStatus || '';
            }
            
            // Não precisamos recarregar a página, apenas atualizar visualmente
            // renderTable(); // Comentado para evitar piscar da tela
            
        } else {
            customAlert.error('Erro ao atualizar status: ' + (result.message || 'Erro desconhecido'));
            // Reverter mudança local em caso de erro
            occurrence.ocorrencia.status = '';
            renderTable();
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        console.error('Detalhes do erro:', error.message, error.stack);
        console.error('Dados da ocorrência:', occurrence);
        customAlert.error('Erro ao atualizar status: ' + error.message);
        // Reverter mudança local em caso de erro
        if (occurrence.ocorrencia) {
            occurrence.ocorrencia.status = '';
        }
        renderTable();
    }
};

// Carregar TCOs quando a aba for ativada
const originalSetActiveTab = setActiveTab;
setActiveTab = function(tab) {
    originalSetActiveTab(tab);
    if (tab === 'tco') {
        loadTCOs();
    }
};

// ==================== TEXTO EM MAIÚSCULAS ====================

// Função para converter objeto para maiúsculas recursivamente
function convertToUppercase(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    } else if (typeof obj === 'string') {
        return obj.toUpperCase();
    } else if (Array.isArray(obj)) {
        return obj.map(item => convertToUppercase(item));
    } else if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = convertToUppercase(obj[key]);
            }
        }
        return result;
    }
    return obj;
}

// Função para converter texto em maiúsculas em tempo real
function setupUppercaseInputs() {
    // Selecionar todos os campos de texto
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="search"], textarea');
    
    textInputs.forEach(input => {
        // Converter para maiúsculas ao digitar
        input.addEventListener('input', function() {
            const cursorPosition = this.selectionStart;
            this.value = this.value.toUpperCase();
            
            // Manter a posição do cursor
            this.setSelectionRange(cursorPosition, cursorPosition);
        });
        
        // Converter para maiúsculas ao colar texto
        input.addEventListener('paste', function(e) {
            setTimeout(() => {
                this.value = this.value.toUpperCase();
            }, 10);
        });
    });
}

// Aplicar maiúsculas quando a página carregar
window.addEventListener('load', () => {
    setupUppercaseInputs();
    
    // Reaplicar quando novos elementos forem adicionados (modais, etc.)
    const observer = new MutationObserver(() => {
        setupUppercaseInputs();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

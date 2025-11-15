const { ipcRenderer } = require('electron');

// Elements
const userInfo = document.getElementById('userInfo');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
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
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const emptyState = document.getElementById('emptyState');
const btnNovaOcorrenciaEmpty = document.getElementById('btnNovaOcorrenciaEmpty');

// Filter elements
const filterBtn = document.getElementById('filterBtn');
const filterModal = document.getElementById('filterModal');
const filterModalClose = document.getElementById('filterModalClose');
const btnApplyFilters = document.getElementById('btnApplyFilters');
const btnClearFilters = document.getElementById('btnClearFilters');

const filterBtnTCO = document.getElementById('filterBtnTCO');
const filterModalTCO = document.getElementById('filterModalTCO');
const filterModalTCOClose = document.getElementById('filterModalTCOClose');
const btnApplyFiltersTCO = document.getElementById('btnApplyFiltersTCO');
const btnClearFiltersTCO = document.getElementById('btnClearFiltersTCO');

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

const exportFilterModal = document.getElementById('exportFilterModal');
const exportFilterModalClose = document.getElementById('exportFilterModalClose');
const btnCancelExportFilter = document.getElementById('btnCancelExportFilter');
const btnConfirmExportFilter = document.getElementById('btnConfirmExportFilter');

const exportTCOFilterModal = document.getElementById('exportTCOFilterModal');
const exportTCOFilterModalClose = document.getElementById('exportTCOFilterModalClose');
const btnCancelExportTCOFilter = document.getElementById('btnCancelExportTCOFilter');
const btnConfirmExportTCOFilter = document.getElementById('btnConfirmExportTCOFilter');

const updateModal = document.getElementById('updateModal');
const updateModalClose = document.getElementById('updateModalClose');
const btnUpdateLater = document.getElementById('btnUpdateLater');
const btnDownloadUpdate = document.getElementById('btnDownloadUpdate');
const currentVersionDisplay = document.getElementById('currentVersionDisplay');
const latestVersionDisplay = document.getElementById('latestVersionDisplay');
const releaseNotesContent = document.getElementById('releaseNotesContent');

// State
let allOccurrences = [];
let filteredOccurrences = [];
let currentOccurrence = null;
let isEditMode = false;
let activeFilters = {
    numeroGenesis: '',
    dataInicial: '',
    dataFinal: '',
    unidade: '',
    status: ''
};
let activeFiltersTCO = {
    rap: '',
    ilicito: '',
    item: ''
};


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
        if (result.success && result.data) {
            console.log('Dados recebidos do backend:', JSON.stringify(result.data, null, 2));
            console.log('Total de itens recebidos:', result.data?.length || 0);
            
            // Mapear dados do Google Sheets para a estrutura esperada
            allOccurrences = result.data.map((row, index) => {
                console.log(`Mapeando ocorrência ${index}:`, JSON.stringify(row, null, 2));
                
                // Se já está na estrutura correta, retorna como está
                if (row.ocorrencia && row.itemApreendido && row.proprietario && row.policial) {
                    console.log(`Ocorrência ${index} já está na estrutura correta`);
                    return row;
                }
                
                // Caso contrário, mapeia da estrutura do Google Sheets
                // Converter numeroGenesis se vier como data ISO ou formato incorreto
                let numeroGenesis = row.numeroGenesis || row['Nº Genesis'] || row.numero_genesis || '';
                
                // Se vier como data ISO, tentar extrair ou usar um valor padrão
                if (numeroGenesis && (numeroGenesis.includes('T') || numeroGenesis.includes('Z') || numeroGenesis instanceof Date)) {
                    console.warn(`numeroGenesis veio como data ISO ou Date: ${numeroGenesis}`);
                    // Tentar converter Date para string se for objeto Date
                    if (numeroGenesis instanceof Date) {
                        numeroGenesis = '';
                    } else if (typeof numeroGenesis === 'string' && numeroGenesis.includes('T')) {
                        numeroGenesis = '';
                    }
                }
                
                // Garantir que seja string e não vazio
                numeroGenesis = String(numeroGenesis || '').trim();
                
                // Se ainda estiver vazio ou for 'N/A', tentar outras fontes
                if (!numeroGenesis || numeroGenesis === 'N/A' || numeroGenesis === '') {
                    // Tentar pegar do logRegistro ou gerar um valor temporário
                    numeroGenesis = row.logRegistro ? String(row.logRegistro).substring(0, 10) : '';
                }
                
                // Converter valores numéricos para strings quando necessário
                const mapped = {
                    ocorrencia: {
                        numeroGenesis: numeroGenesis || '',
                        unidade: String(row.unidade || ''), // Mantém caracteres especiais como º
                        dataApreensao: row.dataApreensao || '',
                        leiInfrigida: String(row.leiInfrigida || ''),
                        artigo: String(row.artigo || ''),
                        status: String(row.status || ''),
                        numeroPje: String(row.numeroPje || '')
                    },
                    itemApreendido: {
                        especie: String(row.especie || ''),
                        item: String(row.item || ''),
                        quantidade: String(row.quantidade || ''),
                        descricao: String(row.descricaoItem || ''),
                        ocorrencia: String(row.ocorrenciaItem || ''),
                        proprietario: String(row.proprietarioItem || ''),
                        policial: String(row.policialItem || '')
                    },
                    proprietario: {
                        nome: String(row.nomeProprietario || ''),
                        tipoDocumento: String(row.tipoDocumento || ''),
                        numeroDocumento: String(row.numeroDocumento || '')
                    },
                    policial: {
                        nome: String(row.nomePolicialCompleto || row.nomePolicial || ''),
                        matricula: String(row.matricula || ''),
                        graduacao: String(row.graduacao || ''),
                        unidade: String(row.unidadePolicial || '')
                    },
                    metadata: {
                        registradoPor: String(row.registradoPor || ''),
                        dataRegistro: row.logRegistro || new Date().toISOString()
                    }
                };
                
                console.log(`Ocorrência ${index} mapeada:`, JSON.stringify(mapped, null, 2));
                return mapped;
            });
            
            console.log('Total de ocorrências mapeadas:', allOccurrences.length);
            if (allOccurrences.length > 0) {
                console.log('Estrutura da primeira ocorrência:', JSON.stringify(allOccurrences[0], null, 2));
            }
            
            filteredOccurrences = [...allOccurrences];
            console.log('Ocorrências carregadas:', allOccurrences.length);
            console.log('filteredOccurrences após cópia:', filteredOccurrences.length);
            
            // Verificar se há ocorrências válidas
            const validOccurrences = allOccurrences.filter(occ => {
                const hasOcorrencia = occ.ocorrencia && Object.keys(occ.ocorrencia).length > 0;
                console.log('Ocorrência válida?', hasOcorrencia, occ);
                return hasOcorrencia;
            });
            
            console.log('Ocorrências válidas:', validOccurrences.length);
            
            if (validOccurrences.length > 0) {
                allOccurrences = validOccurrences;
            }
            
            // Aplicar filtros ativos se houver
            applyOccurrenceFiltersOnLoad();
            
            updateStats();
        } else {
            console.error('Erro ao carregar ocorrências:', result.message);
            
            // Mostrar mensagem de erro adequada ao usuário
            if (result.errorType === 'rate_limit') {
                customAlert.warning(
                    'Há muitas solicitações sendo feitas ao Google Sheets. Por favor, aguarde alguns instantes e tente novamente clicando no botão "Atualizar".',
                    'Google Sheets temporariamente indisponível'
                );
            } else if (result.message) {
                customAlert.error('Erro ao carregar dados: ' + result.message);
            } else {
                customAlert.error('Erro ao carregar ocorrências do Google Sheets.');
            }
            
            // Manter dados locais se existirem
            if (allOccurrences.length > 0) {
                console.log('Mantendo dados locais existentes');
                filteredOccurrences = [...allOccurrences];
                updateStats();
                renderTable();
            } else {
                showEmptyState();
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ocorrências:', error);
        customAlert.error('Erro ao carregar ocorrências: ' + error.message);
        
        // Manter dados locais se existirem
        if (allOccurrences.length > 0) {
            console.log('Mantendo dados locais existentes após erro');
            filteredOccurrences = [...allOccurrences];
            updateStats();
            renderTable();
        } else {
            showEmptyState();
        }
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
    console.log('renderTable chamado. filteredOccurrences.length:', filteredOccurrences.length);
    console.log('filteredOccurrences:', JSON.stringify(filteredOccurrences, null, 2));
    
    if (filteredOccurrences.length === 0) {
        console.log('Nenhuma ocorrência filtrada, mostrando estado vazio');
        showEmptyState();
        return;
    }

    console.log('Ocultando estado vazio e renderizando tabela');
    hideEmptyState();
    occurrencesTableBody.innerHTML = '';

    filteredOccurrences.forEach((occ, index) => {
        const row = document.createElement('tr');
        const statusOptions = getStatusOptions(occ.itemApreendido?.especie);
        const currentStatus = occ.ocorrencia?.status || '';
        
        // Garantir que numeroGenesis seja exibido corretamente
        const numeroGenesis = (occ.ocorrencia?.numeroGenesis || '').toString().trim();
        row.innerHTML = `
            <td><strong>${numeroGenesis || 'N/A'}</strong></td>
            <td>${occ.ocorrencia?.dataApreensao ? formatDate(occ.ocorrencia.dataApreensao) : 'N/A'}</td>
            <td>${occ.ocorrencia?.unidade || 'N/A'}</td>
            <td>${occ.proprietario?.nome || 'N/A'}</td>
            <td>
                ${statusOptions.length > 0 ? `
                <select class="status-dropdown" data-index="${index}" onchange="updateStatus(${index}, this.value)">
                    <option value="">Selecione...</option>
                    ${statusOptions.map(option => 
                        `<option value="${option}" ${currentStatus === option ? 'selected' : ''}>${option}</option>`
                    ).join('')}
                </select>
                ` : `
                <select class="status-dropdown" data-index="${index}" disabled>
                    <option value="">Selecione primeiro a espécie...</option>
                </select>
                `}
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

    modalBody.innerHTML = `
        <div class="modal-form-section">
            <h3 class="modal-section-title">Dados da Ocorrência</h3>
            <div class="modal-form-grid">
                <div class="modal-form-group">
                    <label>Nº Genesis</label>
                    <input type="text" id="edit-numeroGenesis" value="${currentOccurrence.ocorrencia.numeroGenesis}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Unidade</label>
                    ${editable ? `
                    <select id="edit-unidade" ${!editable ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="8º BPM" ${currentOccurrence.ocorrencia.unidade === '8º BPM' ? 'selected' : ''}>8º BPM</option>
                        <option value="10º BPM" ${currentOccurrence.ocorrencia.unidade === '10º BPM' ? 'selected' : ''}>10º BPM</option>
                        <option value="16º BPM" ${currentOccurrence.ocorrencia.unidade === '16º BPM' ? 'selected' : ''}>16º BPM</option>
                    </select>
                    ` : `
                    <input type="text" id="edit-unidade" value="${currentOccurrence.ocorrencia.unidade}" disabled>
                    `}
                </div>
                <div class="modal-form-group">
                    <label>Data da Apreensão</label>
                    <input type="text" id="edit-dataApreensao" value="${formatDateBR(currentOccurrence.ocorrencia.dataApreensao)}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Lei Infringida</label>
                    <input type="text" id="edit-leiInfrigida" value="${currentOccurrence.ocorrencia.leiInfrigida || ''}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Artigo</label>
                    <input type="text" id="edit-artigo" value="${currentOccurrence.ocorrencia.artigo || ''}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Status</label>
                    <select id="edit-status" ${!editable ? 'disabled' : ''}>
                        <option value="">Selecione primeiro a espécie...</option>
                    </select>
                </div>
                <div class="modal-form-group">
                    <label>Nº PJE</label>
                    <input type="text" id="edit-numeroPje" value="${currentOccurrence.ocorrencia.numeroPje || ''}" ${!editable ? 'disabled' : ''}>
                </div>
            </div>
        </div>

        <div class="modal-form-section">
            <h3 class="modal-section-title">Item Apreendido</h3>
            <div class="modal-form-grid">
                <div class="modal-form-group">
                    <label>Espécie</label>
                    ${editable ? `
                    <select id="edit-especie" ${!editable ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="SUBSTÂNCIA" ${currentOccurrence.itemApreendido.especie === 'SUBSTÂNCIA' ? 'selected' : ''}>SUBSTÂNCIA</option>
                        <option value="OBJETO" ${currentOccurrence.itemApreendido.especie === 'OBJETO' ? 'selected' : ''}>OBJETO</option>
                        <option value="SIMULACRO" ${currentOccurrence.itemApreendido.especie === 'SIMULACRO' ? 'selected' : ''}>SIMULACRO</option>
                        <option value="ARMA BRANCA" ${currentOccurrence.itemApreendido.especie === 'ARMA BRANCA' ? 'selected' : ''}>ARMA BRANCA</option>
                    </select>
                    ` : `
                    <input type="text" id="edit-especie" value="${currentOccurrence.itemApreendido.especie || ''}" disabled>
                    `}
                </div>
                <div class="modal-form-group">
                    <label>Item</label>
                    <input type="text" id="edit-item" value="${currentOccurrence.itemApreendido.item}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Quantidade</label>
                    <input type="text" id="edit-quantidade" value="${currentOccurrence.itemApreendido.quantidade}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group full-width">
                    <label>Descrição</label>
                    <textarea id="edit-descricao" rows="3" ${!editable ? 'disabled' : ''}>${currentOccurrence.itemApreendido.descricao || ''}</textarea>
                </div>
            </div>
        </div>

        <div class="modal-form-section">
            <h3 class="modal-section-title">Dados do Proprietário</h3>
            <div class="modal-form-grid">
                <div class="modal-form-group">
                    <label>Nome Completo</label>
                    <input type="text" id="edit-nomeProprietario" value="${currentOccurrence.proprietario.nome}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Tipo de Documento</label>
                    ${editable ? `
                    <select id="edit-tipoDocumento" ${!editable ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="CPF" ${currentOccurrence.proprietario.tipoDocumento === 'CPF' ? 'selected' : ''}>CPF</option>
                        <option value="RG" ${currentOccurrence.proprietario.tipoDocumento === 'RG' ? 'selected' : ''}>RG</option>
                    </select>
                    ` : `
                    <input type="text" id="edit-tipoDocumento" value="${currentOccurrence.proprietario.tipoDocumento}" disabled>
                    `}
                </div>
                <div class="modal-form-group">
                    <label>Nº Documento</label>
                    <input type="text" id="edit-numeroDocumento" value="${currentOccurrence.proprietario.numeroDocumento}" ${!editable ? 'disabled' : ''}>
                </div>
            </div>
        </div>

        <div class="modal-form-section">
            <h3 class="modal-section-title">Dados do Policial</h3>
            <div class="modal-form-grid">
                <div class="modal-form-group">
                    <label>Nome Completo</label>
                    <input type="text" id="edit-nomePolicial" value="${currentOccurrence.policial.nome}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Matrícula</label>
                    <input type="text" id="edit-matricula" value="${currentOccurrence.policial.matricula}" ${!editable ? 'disabled' : ''}>
                </div>
                <div class="modal-form-group">
                    <label>Graduação</label>
                    ${editable ? `
                    <select id="edit-graduacao" ${!editable ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="Soldado de 2ª Classe" ${currentOccurrence.policial.graduacao === 'Soldado de 2ª Classe' ? 'selected' : ''}>Soldado 2ª Classe</option>
                        <option value="Soldado de 1ª Classe" ${currentOccurrence.policial.graduacao === 'Soldado de 1ª Classe' ? 'selected' : ''}>Soldado 1ª Classe</option>
                        <option value="Cabo" ${currentOccurrence.policial.graduacao === 'Cabo' ? 'selected' : ''}>Cabo</option>
                        <option value="3º Sargento" ${currentOccurrence.policial.graduacao === '3º Sargento' ? 'selected' : ''}>3º Sargento</option>
                        <option value="2º Sargento" ${currentOccurrence.policial.graduacao === '2º Sargento' ? 'selected' : ''}>2º Sargento</option>
                        <option value="1º Sargento" ${currentOccurrence.policial.graduacao === '1º Sargento' ? 'selected' : ''}>1º Sargento</option>
                        <option value="Subtenente" ${currentOccurrence.policial.graduacao === 'Subtenente' ? 'selected' : ''}>Subtenente</option>
                        <option value="Aspirante-a-Oficial" ${currentOccurrence.policial.graduacao === 'Aspirante-a-Oficial' ? 'selected' : ''}>Aspirante-a-Oficial</option>
                        <option value="Segundo-Tenente" ${currentOccurrence.policial.graduacao === 'Segundo-Tenente' ? 'selected' : ''}>Segundo-Tenente</option>
                        <option value="Primeiro-Tenente" ${currentOccurrence.policial.graduacao === 'Primeiro-Tenente' ? 'selected' : ''}>Primeiro-Tenente</option>
                        <option value="Capitão" ${currentOccurrence.policial.graduacao === 'Capitão' ? 'selected' : ''}>Capitão</option>
                        <option value="Major" ${currentOccurrence.policial.graduacao === 'Major' ? 'selected' : ''}>Major</option>
                        <option value="Tenente-Coronel" ${currentOccurrence.policial.graduacao === 'Tenente-Coronel' ? 'selected' : ''}>Tenente-Coronel</option>
                        <option value="Coronel" ${currentOccurrence.policial.graduacao === 'Coronel' ? 'selected' : ''}>Coronel</option>
                    </select>
                    ` : `
                    <input type="text" id="edit-graduacao" value="${currentOccurrence.policial.graduacao || ''}" disabled>
                    `}
                </div>
                <div class="modal-form-group">
                    <label>Unidade</label>
                    <input type="text" id="edit-unidadePolicial" value="${currentOccurrence.policial.unidade}" ${!editable ? 'disabled' : ''}>
                </div>
            </div>
        </div>

        <div class="modal-form-section">
            <h3 class="modal-section-title">Informações do Registro</h3>
            <div class="modal-form-grid">
                <div class="modal-form-group">
                    <label>Registrado Por</label>
                    <input type="text" value="${currentOccurrence.metadata.registradoPor}" disabled>
                </div>
                <div class="modal-form-group">
                    <label>Data do Registro</label>
                    <input type="text" value="${formatDateTime(currentOccurrence.metadata.dataRegistro)}" disabled>
                </div>
            </div>
        </div>
    `;

    btnDelete.style.display = 'none'; // Sempre oculto no modal de edição
    btnSaveEdit.style.display = editable ? 'inline-flex' : 'none';
    
    viewModal.classList.add('active');
    
    // Converter sigla antiga para nome completo no campo Lei Infringida
    if (typeof converterSiglaParaNome === 'function') {
        const leiInput = document.getElementById('edit-leiInfrigida');
        if (leiInput && leiInput.value) {
            const nomeCompleto = converterSiglaParaNome(leiInput.value);
            if (nomeCompleto !== leiInput.value) {
                leiInput.value = nomeCompleto;
            }
        }
    }
    
    // Configurar lógica do campo Status baseado na Espécie (igual ao formulário principal)
    if (editable) {
        const especieSelect = document.getElementById('edit-especie');
        const statusSelect = document.getElementById('edit-status');
        
        if (especieSelect && statusSelect) {
            // Função para atualizar opções do Status baseado na Espécie
            const updateStatusOptions = () => {
                const especieSelecionada = especieSelect.value;
                // Usar o valor atual do select ou o valor da ocorrência
                const currentStatus = statusSelect.value || currentOccurrence.ocorrencia.status || '';
                
                // Definir opções válidas para cada espécie
                const statusOptionsSubstancia = ['SECRIMPO', 'INSTITUTO DE CRIMINALISTICA', 'DOP', 'DESTRUIÇÃO'];
                const statusOptionsOutros = ['SECRIMPO', 'CEGOC', 'IC'];
                
                // Limpar opções atuais
                statusSelect.innerHTML = '';
                
                if (!especieSelecionada) {
                    statusSelect.innerHTML = '<option value="">Selecione primeiro a espécie...</option>';
                    statusSelect.disabled = true;
                    statusSelect.value = '';
                    return;
                }
                
                // Adicionar opção padrão
                statusSelect.innerHTML = '<option value="">Selecione...</option>';
                statusSelect.disabled = false;
                
                // Determinar quais opções usar baseado na espécie
                const validStatusOptions = especieSelecionada === 'SUBSTÂNCIA' 
                    ? statusOptionsSubstancia 
                    : statusOptionsOutros;
                
                // Verificar se o status atual é válido para a espécie atual
                const isCurrentStatusValid = validStatusOptions.includes(currentStatus);
                
                // Adicionar opções de status
                validStatusOptions.forEach(option => {
                    const isSelected = currentStatus === option && isCurrentStatusValid;
                    statusSelect.innerHTML += `<option value="${option}"${isSelected ? ' selected' : ''}>${option}</option>`;
                });
                
                // Se o status atual não for válido para a espécie, limpar a seleção
                // Mas manter o valor se for válido
                if (currentStatus && !isCurrentStatusValid) {
                    statusSelect.value = '';
                } else if (currentStatus && isCurrentStatusValid) {
                    // Garantir que o valor correto esteja selecionado
                    statusSelect.value = currentStatus;
                }
            };
            
            // Atualizar opções quando a espécie mudar
            especieSelect.addEventListener('change', function() {
                // Apenas atualizar as opções de status, sem alterar outros campos
                updateStatusOptions();
                // Atualizar apenas a espécie no objeto currentOccurrence (não tocar em item, quantidade, descrição)
                if (currentOccurrence) {
                    currentOccurrence.itemApreendido.especie = especieSelect.value;
                }
            });
            
            // Atualizar opções inicialmente
            updateStatusOptions();
        }
        
        // Adicionar conversão para maiúsculas em tempo real nos campos de texto
        const textFields = [
            'edit-numeroGenesis',
            'edit-dataApreensao',
            'edit-leiInfrigida',
            'edit-artigo',
            'edit-numeroPje',
            'edit-item',
            'edit-quantidade',
            'edit-descricao',
            'edit-nomeProprietario',
            'edit-numeroDocumento',
            'edit-nomePolicial',
            'edit-matricula',
            'edit-unidadePolicial'
        ];
        
        textFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Converter ao digitar
                field.addEventListener('input', function(e) {
                    const input = e.target;
                    const cursorPosition = input.selectionStart;
                    const originalValue = input.value;
                    const upperValue = originalValue.toUpperCase();
                    
                    if (originalValue !== upperValue) {
                        input.value = upperValue;
                        input.setSelectionRange(cursorPosition, cursorPosition);
                    }
                });
                
                // Converter ao colar
                field.addEventListener('paste', function(e) {
                    setTimeout(() => {
                        const input = e.target;
                        const cursorPosition = input.selectionStart;
                        const originalValue = input.value;
                        const upperValue = originalValue.toUpperCase();
                        
                        if (originalValue !== upperValue) {
                            input.value = upperValue;
                            input.setSelectionRange(cursorPosition, cursorPosition);
                        }
                    }, 0);
                });
            }
        });
        
        // Converter sigla para nome completo no campo Lei Infringida quando perder o foco
        const leiInputEdit = document.getElementById('edit-leiInfrigida');
        if (leiInputEdit && typeof converterSiglaParaNome === 'function') {
            leiInputEdit.addEventListener('blur', function() {
                if (leiInputEdit.value) {
                    const nomeCompleto = converterSiglaParaNome(leiInputEdit.value);
                    if (nomeCompleto !== leiInputEdit.value) {
                        leiInputEdit.value = nomeCompleto;
                    }
                }
            });
        }
    }
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

    // Guardar o número Genesis original para identificação
    let numeroGenesisOriginal = currentOccurrence.ocorrencia.numeroGenesis || '';
    // Se o original for 'N/A' ou vazio, tentar usar o valor atual do campo
    if (!numeroGenesisOriginal || numeroGenesisOriginal === 'N/A' || numeroGenesisOriginal === '') {
        numeroGenesisOriginal = document.getElementById('edit-numeroGenesis').value.trim() || '';
    }
    
    const numeroGenesisNovo = document.getElementById('edit-numeroGenesis').value.trim();

    // Validar se o Genesis não está vazio
    if (!numeroGenesisNovo || numeroGenesisNovo === '') {
        customAlert.error('O campo Nº Genesis é obrigatório e não pode estar vazio.');
        document.getElementById('edit-numeroGenesis').focus();
        return;
    }

    // Função auxiliar para converter strings para maiúsculas
    function toUpperCase(value) {
        return typeof value === 'string' ? value.toUpperCase() : value;
    }

    const updatedData = {
        id: currentOccurrence.id,
        numeroGenesisOriginal: numeroGenesisOriginal, // Para identificar a linha no Google Sheets
        ocorrencia: {
            numeroGenesis: toUpperCase(numeroGenesisNovo),
            unidade: document.getElementById('edit-unidade').value,
            dataApreensao: brDateToISO(document.getElementById('edit-dataApreensao').value),
            leiInfrigida: toUpperCase(document.getElementById('edit-leiInfrigida').value),
            artigo: toUpperCase(document.getElementById('edit-artigo').value),
            status: document.getElementById('edit-status').value,
            numeroPje: toUpperCase(document.getElementById('edit-numeroPje').value || '')
        },
        itemApreendido: {
            especie: document.getElementById('edit-especie').value,
            item: toUpperCase(document.getElementById('edit-item').value),
            quantidade: toUpperCase(document.getElementById('edit-quantidade').value),
            descricao: toUpperCase(document.getElementById('edit-descricao').value || '')
        },
        proprietario: {
            nome: toUpperCase(document.getElementById('edit-nomeProprietario').value),
            tipoDocumento: document.getElementById('edit-tipoDocumento').value,
            numeroDocumento: toUpperCase(document.getElementById('edit-numeroDocumento').value)
        },
        policial: {
            nome: toUpperCase(document.getElementById('edit-nomePolicial').value),
            matricula: toUpperCase(document.getElementById('edit-matricula').value),
            graduacao: document.getElementById('edit-graduacao').value,
            unidade: toUpperCase(document.getElementById('edit-unidadePolicial').value)
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
            // Se for erro temporário, não reverter a mudança
            if (result.temporary) {
                customAlert.warning(result.message || 'Erro temporário ao atualizar. Os dados foram salvos localmente.');
                // Não fechar o modal e não recarregar, mantendo as alterações visíveis
            } else {
                customAlert.error('Erro ao atualizar: ' + result.message);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        hideLoading();
        customAlert.error('Erro ao atualizar ocorrência: ' + error.message);
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

// Export to Excel - Abre modal de filtros
function exportToExcel() {
    const exportFilterModal = document.getElementById('exportFilterModal');
    if (exportFilterModal) {
        // Limpar filtros anteriores
        document.getElementById('exportDataInicial').value = '';
        document.getElementById('exportDataFinal').value = '';
        
        // Limpar checkboxes de status
        document.querySelectorAll('.export-status-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Limpar checkboxes de espécie
        document.querySelectorAll('.export-especie-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        exportFilterModal.classList.add('active');
    }
}

// Função para aplicar filtros e exportar
async function performExportWithFilters() {
    const dataInicial = document.getElementById('exportDataInicial').value;
    const dataFinal = document.getElementById('exportDataFinal').value;
    
    // Obter status selecionados (checkboxes)
    const selectedStatuses = Array.from(document.querySelectorAll('.export-status-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    // Obter espécies selecionadas (checkboxes)
    const selectedEspecies = Array.from(document.querySelectorAll('.export-especie-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    // Fechar modal
    const exportFilterModal = document.getElementById('exportFilterModal');
    if (exportFilterModal) {
        exportFilterModal.classList.remove('active');
    }
    
    // Aplicar filtros
    let filteredData = [...allOccurrences];
    
    // Filtro por data
    if (dataInicial || dataFinal) {
        filteredData = filteredData.filter(occ => {
            const dataApreensao = occ.ocorrencia.dataApreensao;
            if (!dataApreensao) return false;
            
            try {
                // Converter data brasileira (dd/mm/yyyy) para Date
                const [day, month, year] = dataApreensao.split('/');
                if (!day || !month || !year) return false;
                
                const occDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                occDate.setHours(0, 0, 0, 0);
                
                if (dataInicial) {
                    const initDate = new Date(dataInicial + 'T00:00:00');
                    if (occDate < initDate) return false;
                }
                
                if (dataFinal) {
                    const finalDate = new Date(dataFinal + 'T23:59:59');
                    if (occDate > finalDate) return false;
                }
                
                return true;
            } catch (error) {
                console.error('Erro ao processar data:', error);
                return false;
            }
        });
    }
    
    // Filtro por status (múltiplos)
    if (selectedStatuses.length > 0) {
        filteredData = filteredData.filter(occ => {
            return selectedStatuses.includes(occ.ocorrencia.status);
        });
    }
    
    // Filtro por espécie (múltiplas)
    if (selectedEspecies.length > 0) {
        filteredData = filteredData.filter(occ => {
            return selectedEspecies.includes(occ.itemApreendido?.especie);
        });
    }
    
    // Verificar se há dados para exportar
    if (filteredData.length === 0) {
        customAlert.error('Nenhuma ocorrência encontrada com os filtros selecionados.');
        return;
    }
    
    // Exportar
    showLoading('Exportando dados', `Gerando arquivo Excel com ${filteredData.length} ocorrência(s)...`);
    try {
        const result = await ipcRenderer.invoke('export-occurrences', filteredData);
        hideLoading();
        if (result.success) {
            customAlert.success(`Arquivo Excel exportado com sucesso!<br><br><strong>Ocorrências exportadas:</strong> ${filteredData.length}<br><strong>Local:</strong> ${result.filePath}`);
        } else {
            customAlert.error('Erro ao exportar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao exportar:', error);
        hideLoading();
        customAlert.error('Erro ao exportar arquivo');
    }
}

// ==================== FUNCIONALIDADE DE FILTROS ====================

// Abrir modal de filtros de ocorrências
if (filterBtn) {
    filterBtn.addEventListener('click', () => {
        populateStatusOptions();
        restoreFilterValues();
        if (filterModal) {
            filterModal.classList.add('active');
        }
    });
}

// Fechar modal de filtros
if (filterModalClose) {
    filterModalClose.addEventListener('click', () => {
        if (filterModal) filterModal.classList.remove('active');
    });
}

// Preencher opções de status e unidade dinamicamente
function populateStatusOptions() {
    const statusSelect = document.getElementById('filterStatus');
    const unidadeSelect = document.getElementById('filterUnidade');
    
    // Preencher Status
    if (statusSelect) {
        // Obter todos os status únicos das ocorrências
        const allStatus = [...new Set(allOccurrences.map(occ => occ.ocorrencia?.status).filter(Boolean))];
        
        // Limpar opções existentes (exceto "Todos os status")
        statusSelect.innerHTML = '<option value="">Todos os status</option>';
        
        // Adicionar opções
        allStatus.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });
    }
    
    // Preencher Unidade
    if (unidadeSelect) {
        // Obter todas as unidades únicas das ocorrências
        const allUnidades = [...new Set(allOccurrences.map(occ => occ.ocorrencia?.unidade).filter(Boolean))];
        
        // Limpar opções existentes (exceto "Todas as unidades")
        unidadeSelect.innerHTML = '<option value="">Todas as unidades</option>';
        
        // Adicionar opções
        allUnidades.forEach(unidade => {
            const option = document.createElement('option');
            option.value = unidade;
            option.textContent = unidade;
            unidadeSelect.appendChild(option);
        });
    }
}

// Restaurar valores dos filtros
function restoreFilterValues() {
    const filterNumeroGenesis = document.getElementById('filterNumeroGenesis');
    const filterDataInicial = document.getElementById('filterDataInicial');
    const filterDataFinal = document.getElementById('filterDataFinal');
    const filterUnidade = document.getElementById('filterUnidade');
    const filterStatus = document.getElementById('filterStatus');
    
    if (filterNumeroGenesis) filterNumeroGenesis.value = activeFilters.numeroGenesis || '';
    if (filterDataInicial) filterDataInicial.value = activeFilters.dataInicial || '';
    if (filterDataFinal) filterDataFinal.value = activeFilters.dataFinal || '';
    if (filterUnidade) filterUnidade.value = activeFilters.unidade || '';
    if (filterStatus) filterStatus.value = activeFilters.status || '';
}

// Aplicar filtros de ocorrências
if (btnApplyFilters) {
    btnApplyFilters.addEventListener('click', () => {
        applyOccurrenceFilters();
        if (filterModal) filterModal.classList.remove('active');
    });
}

// Limpar filtros de ocorrências
if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
        clearOccurrenceFilters();
    });
}

// Função para verificar se há filtros ativos em ocorrências
function hasActiveOccurrenceFilters() {
    return !!(activeFilters.numeroGenesis || activeFilters.dataInicial || activeFilters.dataFinal || 
              activeFilters.unidade || activeFilters.status);
}

// Função para atualizar estado visual do botão de filtro de ocorrências
function updateOccurrenceFilterButtonState() {
    if (filterBtn) {
        if (hasActiveOccurrenceFilters()) {
            filterBtn.classList.add('active');
        } else {
            filterBtn.classList.remove('active');
        }
    }
}

function applyOccurrenceFilters() {
    const filterNumeroGenesis = document.getElementById('filterNumeroGenesis');
    const filterDataInicial = document.getElementById('filterDataInicial');
    const filterDataFinal = document.getElementById('filterDataFinal');
    const filterUnidade = document.getElementById('filterUnidade');
    const filterStatus = document.getElementById('filterStatus');
    
    // Salvar filtros ativos
    activeFilters = {
        numeroGenesis: filterNumeroGenesis ? filterNumeroGenesis.value.trim() : '',
        dataInicial: filterDataInicial ? filterDataInicial.value : '',
        dataFinal: filterDataFinal ? filterDataFinal.value : '',
        unidade: filterUnidade ? filterUnidade.value : '',
        status: filterStatus ? filterStatus.value : ''
    };
    
    // Aplicar filtros
    filteredOccurrences = allOccurrences.filter(occ => {
        // Filtro por Nº Genesis
        if (activeFilters.numeroGenesis) {
            const numeroGenesis = (occ.ocorrencia?.numeroGenesis || '').toString().toLowerCase();
            if (!numeroGenesis.includes(activeFilters.numeroGenesis.toLowerCase())) {
                return false;
            }
        }
        
        // Filtro por Data
        if (activeFilters.dataInicial || activeFilters.dataFinal) {
            const occDate = occ.ocorrencia?.dataApreensao ? new Date(occ.ocorrencia.dataApreensao) : null;
            if (occDate) {
                if (activeFilters.dataInicial) {
                    const dataInicial = new Date(activeFilters.dataInicial);
                    dataInicial.setHours(0, 0, 0, 0);
                    if (occDate < dataInicial) {
                        return false;
                    }
                }
                if (activeFilters.dataFinal) {
                    const dataFinal = new Date(activeFilters.dataFinal);
                    dataFinal.setHours(23, 59, 59, 999);
                    if (occDate > dataFinal) {
                        return false;
                    }
                }
            } else if (activeFilters.dataInicial || activeFilters.dataFinal) {
                return false;
            }
        }
        
        // Filtro por Unidade
        if (activeFilters.unidade && occ.ocorrencia?.unidade !== activeFilters.unidade) {
            return false;
        }
        
        // Filtro por Status
        if (activeFilters.status && occ.ocorrencia?.status !== activeFilters.status) {
            return false;
        }
        
        return true;
    });
    
    // Atualizar estado visual do botão
    updateOccurrenceFilterButtonState();
    
    renderTable();
}

function clearOccurrenceFilters() {
    activeFilters = {
        numeroGenesis: '',
        dataInicial: '',
        dataFinal: '',
        unidade: '',
        status: ''
    };
    
    const filterNumeroGenesis = document.getElementById('filterNumeroGenesis');
    const filterDataInicial = document.getElementById('filterDataInicial');
    const filterDataFinal = document.getElementById('filterDataFinal');
    const filterUnidade = document.getElementById('filterUnidade');
    const filterStatus = document.getElementById('filterStatus');
    
    if (filterNumeroGenesis) filterNumeroGenesis.value = '';
    if (filterDataInicial) filterDataInicial.value = '';
    if (filterDataFinal) filterDataFinal.value = '';
    if (filterUnidade) filterUnidade.value = '';
    if (filterStatus) filterStatus.value = '';
    
    filteredOccurrences = [...allOccurrences];
    
    // Atualizar estado visual do botão
    updateOccurrenceFilterButtonState();
    
    renderTable();
}

// Aplicar filtros quando carregar ocorrências
function applyOccurrenceFiltersOnLoad() {
    if (activeFilters.numeroGenesis || activeFilters.dataInicial || activeFilters.dataFinal || 
        activeFilters.unidade || activeFilters.status) {
        applyOccurrenceFilters();
    } else {
        filteredOccurrences = [...allOccurrences];
        // Atualizar estado visual do botão (sem filtros ativos)
        updateOccurrenceFilterButtonState();
        renderTable();
    }
}

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
        // Atualizar estado do botão de filtro quando a aba for ativada
        updateOccurrenceFilterButtonState();
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

// Verificar atualizações manualmente
if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
        showLoading('Verificando atualizações', 'Buscando novas versões...');
        try {
            const result = await ipcRenderer.invoke('check-updates-manual');
            hideLoading();
            
            if (result && result.error) {
                customAlert.error('Erro ao verificar atualizações: ' + result.error);
            } else if (result && result.available) {
                currentUpdateInfo = result;
                showUpdateModal(result);
            } else if (result && !result.available) {
                customAlert.success('Você está usando a versão mais recente do aplicativo!');
            } else {
                customAlert.info('Não foi possível verificar atualizações no momento. Tente novamente mais tarde.');
            }
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
            hideLoading();
            customAlert.error('Erro ao verificar atualizações: ' + error.message);
        }
    });
}

// Modal de atualização
let currentUpdateInfo = null;

if (updateModalClose) {
    updateModalClose.addEventListener('click', () => {
        if (updateModal) updateModal.classList.remove('active');
    });
}

if (btnUpdateLater) {
    btnUpdateLater.addEventListener('click', () => {
        if (updateModal) updateModal.classList.remove('active');
    });
}

// Elementos de progresso
const updateProgressContainer = document.getElementById('updateProgressContainer');
const updateProgressBar = document.getElementById('updateProgressBar');
const updateProgressText = document.getElementById('updateProgressText');

if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', async () => {
        if (!currentUpdateInfo) {
            customAlert.error('Informações de atualização não disponíveis.');
            return;
        }

        // Verificar se tem instalador disponível
        if (!currentUpdateInfo.installerUrl || !currentUpdateInfo.installerName) {
            // Fallback: abrir página de releases
            if (currentUpdateInfo.downloadUrl) {
                try {
                    const result = await ipcRenderer.invoke('open-external-url', currentUpdateInfo.downloadUrl);
                    if (result.success) {
                        if (updateModal) updateModal.classList.remove('active');
                        customAlert.info('O link de download foi aberto no seu navegador. Após baixar, instale a nova versão para atualizar o aplicativo.');
                    } else {
                        customAlert.error('Erro ao abrir link de download: ' + (result.error || 'Erro desconhecido'));
                    }
                } catch (error) {
                    console.error('Erro ao abrir link de download:', error);
                    customAlert.error('Erro ao abrir link de download.');
                }
            } else {
                customAlert.error('Arquivo de instalação não disponível. Por favor, baixe manualmente.');
            }
            return;
        }

        // Desabilitar botões durante download
        btnDownloadUpdate.disabled = true;
        btnUpdateLater.disabled = true;
        btnDownloadUpdate.textContent = 'Baixando...';

        // Mostrar progresso
        if (updateProgressContainer) {
            updateProgressContainer.style.display = 'block';
        }
        if (updateProgressBar) {
            updateProgressBar.style.width = '0%';
        }
        if (updateProgressText) {
            updateProgressText.textContent = 'Iniciando download...';
        }

        try {
            // Baixar e instalar automaticamente
            const result = await ipcRenderer.invoke('download-and-install-update', currentUpdateInfo);
            
            if (result.success) {
                if (updateProgressText) {
                    updateProgressText.textContent = 'Instalação iniciada. A aplicação será fechada em instantes...';
                }
                // A aplicação será fechada automaticamente pelo main process
            } else {
                // Reabilitar botões em caso de erro
                btnDownloadUpdate.disabled = false;
                btnUpdateLater.disabled = false;
                btnDownloadUpdate.textContent = 'Baixar Atualização';
                
                if (updateProgressContainer) {
                    updateProgressContainer.style.display = 'none';
                }
                
                customAlert.error('Erro ao baixar/instalar atualização: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao baixar/instalar atualização:', error);
            
            // Reabilitar botões em caso de erro
            btnDownloadUpdate.disabled = false;
            btnUpdateLater.disabled = false;
            btnDownloadUpdate.textContent = 'Baixar Atualização';
            
            if (updateProgressContainer) {
                updateProgressContainer.style.display = 'none';
            }
            
            customAlert.error('Erro ao baixar/instalar atualização: ' + error.message);
        }
    });
}

// Listener para receber progresso do download
ipcRenderer.on('update-download-progress', (event, progress) => {
    if (updateProgressBar && progress.percent !== undefined) {
        updateProgressBar.style.width = progress.percent + '%';
    }
    if (updateProgressText && progress.message) {
        updateProgressText.textContent = progress.message;
    }
});

// Listener para receber notificação de atualização do main process
ipcRenderer.on('update-available', (event, updateInfo) => {
    if (updateInfo && updateInfo.available) {
        currentUpdateInfo = updateInfo;
        showUpdateModal(updateInfo);
    }
});

// Função para mostrar modal de atualização
function showUpdateModal(updateInfo) {
    if (currentVersionDisplay) {
        currentVersionDisplay.textContent = updateInfo.currentVersion || 'Desconhecida';
    }
    if (latestVersionDisplay) {
        latestVersionDisplay.textContent = updateInfo.latestVersion || 'Desconhecida';
    }
    if (releaseNotesContent) {
        releaseNotesContent.textContent = updateInfo.releaseNotes || 'Sem notas de versão disponíveis.';
    }
    
    // Esconder progresso ao mostrar modal
    if (updateProgressContainer) {
        updateProgressContainer.style.display = 'none';
    }
    if (updateProgressBar) {
        updateProgressBar.style.width = '0%';
    }
    
    // Reabilitar botões
    if (btnDownloadUpdate) {
        btnDownloadUpdate.disabled = false;
        const svgIcon = btnDownloadUpdate.querySelector('svg');
        if (svgIcon) {
            btnDownloadUpdate.innerHTML = svgIcon.outerHTML + ' Baixar e Instalar';
        } else {
            btnDownloadUpdate.textContent = 'Baixar e Instalar';
        }
    }
    if (btnUpdateLater) {
        btnUpdateLater.disabled = false;
    }
    
    if (updateModal) {
        updateModal.classList.add('active');
    }
}

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

// ==================== FUNCIONALIDADE DE SUPORTE ====================

// Elementos do modal de suporte
const suporteBtn = document.getElementById('suporteBtn');
const suporteModal = document.getElementById('suporteModal');
const suporteModalClose = document.getElementById('suporteModalClose');
const suporteCancelBtn = document.getElementById('suporteCancelBtn');
const suporteSubmitBtn = document.getElementById('suporteSubmitBtn');
const suporteForm = document.getElementById('suporteForm');

// Abrir modal de suporte
if (suporteBtn) {
    suporteBtn.addEventListener('click', () => {
        // Preencher nome automaticamente se disponível
        const username = sessionStorage.getItem('username');
        if (username && document.getElementById('suporteNome')) {
            document.getElementById('suporteNome').value = username;
        }
        suporteModal.classList.add('active');
        userDropdown.classList.remove('active'); // Fechar dropdown
    });
}

// Fechar modal de suporte
if (suporteModalClose) {
    suporteModalClose.addEventListener('click', () => {
        suporteModal.classList.remove('active');
        suporteForm.reset();
    });
}

if (suporteCancelBtn) {
    suporteCancelBtn.addEventListener('click', () => {
        suporteModal.classList.remove('active');
        suporteForm.reset();
    });
}

// Não fechar modal ao clicar fora (modal contém formulário)
// O modal só fecha através dos botões de fechar/cancelar

// Enviar formulário de suporte
if (suporteSubmitBtn) {
    suporteSubmitBtn.addEventListener('click', async () => {
        if (!suporteForm.checkValidity()) {
            suporteForm.reportValidity();
            return;
        }

        const formData = {
            nome: document.getElementById('suporteNome').value.trim(),
            unidade: document.getElementById('suporteUnidade').value,
            problema: document.getElementById('suporteProblema').value.trim(),
            prioridade: document.getElementById('suportePrioridade').value,
            descricao: document.getElementById('suporteDescricao').value.trim()
        };

        // Validar campos
        if (!formData.nome || !formData.unidade || !formData.problema || !formData.prioridade || !formData.descricao) {
            customAlert.error('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Desabilitar botão durante envio
        suporteSubmitBtn.disabled = true;
        suporteSubmitBtn.textContent = 'Enviando...';

        try {
            const result = await ipcRenderer.invoke('send-support-request', formData);
            
            if (result.success) {
                customAlert.success('Solicitação de suporte enviada com sucesso!');
                suporteModal.classList.remove('active');
                suporteForm.reset();
            } else {
                customAlert.error('Erro ao enviar solicitação: ' + (result.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao enviar suporte:', error);
            customAlert.error('Erro ao enviar solicitação de suporte: ' + error.message);
        } finally {
            suporteSubmitBtn.disabled = false;
            suporteSubmitBtn.textContent = 'Enviar';
        }
    });
}

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

// Modal de filtros de exportação
if (exportFilterModalClose) {
    exportFilterModalClose.addEventListener('click', () => {
        exportFilterModal.classList.remove('active');
    });
}
if (btnCancelExportFilter) {
    btnCancelExportFilter.addEventListener('click', () => {
        exportFilterModal.classList.remove('active');
    });
}
if (btnConfirmExportFilter) {
    btnConfirmExportFilter.addEventListener('click', performExportWithFilters);
}

// Modal de filtros de exportação de TCOs
if (exportTCOFilterModalClose) {
    exportTCOFilterModalClose.addEventListener('click', () => {
        exportTCOFilterModal.classList.remove('active');
    });
}
if (btnCancelExportTCOFilter) {
    btnCancelExportTCOFilter.addEventListener('click', () => {
        exportTCOFilterModal.classList.remove('active');
    });
}
if (btnConfirmExportTCOFilter) {
    btnConfirmExportTCOFilter.addEventListener('click', performExportTCOsWithFilters);
}

// Adicionar event listeners para checkboxes para atualizar visual
document.addEventListener('DOMContentLoaded', () => {
    // Atualizar visual dos checkboxes quando mudarem
    const updateCheckboxVisual = (checkbox) => {
        const option = checkbox.closest('.checkbox-option');
        if (checkbox.checked) {
            option.classList.add('checked');
        } else {
            option.classList.remove('checked');
        }
    };
    
    // Adicionar listeners para todos os checkboxes
    document.querySelectorAll('.export-status-checkbox, .export-especie-checkbox, .export-ilicito-checkbox, .export-tco-status-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => updateCheckboxVisual(checkbox));
        // Inicializar estado visual
        updateCheckboxVisual(checkbox);
    });
});

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

// Empty state button
btnNovaOcorrenciaEmpty.addEventListener('click', () => {
    ipcRenderer.send('load-panel');
});

// Não fechar modal ao clicar fora (modal contém formulário para edição)
// O modal só fecha através dos botões de fechar/cancelar

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

// ==================== FUNCIONALIDADE TCO ====================

// Elementos TCO
const refreshBtnTCO = document.getElementById('refreshBtnTCO');
const exportBtnTCO = document.getElementById('exportBtnTCO');
const tcoTableBody = document.getElementById('tcoTableBody');

let tcoData = []; // Array para armazenar dados dos TCOs

// Função para carregar TCOs do Google Sheets
async function loadTCOs() {
    try {
        const response = await ipcRenderer.invoke('get-tcos');
        
        if (response.success && response.tcos) {
            tcoData = response.tcos;
            console.log('TCOs carregados:', tcoData.length);
        } else {
            console.error('Erro ao carregar TCOs:', response);
            tcoData = [];
        }
        
        // Atualizar estado visual do botão após carregar
        updateTCOFilterButtonState();
        
        renderTCOTable();
        
    } catch (error) {
        console.error('Erro ao carregar TCOs:', error);
        tcoData = [];
        // Atualizar estado visual do botão mesmo em caso de erro
        updateTCOFilterButtonState();
        renderTCOTable();
    }
}

// Aplicar filtros quando carregar TCOs
function loadTCOsWithFilters() {
    loadTCOs().then(() => {
        // Aplicar filtros ativos após carregar
        renderTCOTable();
        // Atualizar estado visual do botão
        updateTCOFilterButtonState();
    });
}

// Função para renderizar tabela de TCOs (com filtros)
function renderTCOTable() {
    tcoTableBody.innerHTML = '';
    
    let filteredData = [...tcoData];
    
    // Aplicar filtros
    if (activeFiltersTCO.rap) {
        filteredData = filteredData.filter(tco => {
            const rap = (tco.rap || '').toString().toLowerCase();
            return rap.includes(activeFiltersTCO.rap.toLowerCase());
        });
    }
    
    if (activeFiltersTCO.ilicito) {
        filteredData = filteredData.filter(tco => tco.ilicito === activeFiltersTCO.ilicito);
    }
    
    if (activeFiltersTCO.item) {
        filteredData = filteredData.filter(tco => {
            const item = (tco.item || '').toString().toLowerCase();
            return item.includes(activeFiltersTCO.item.toLowerCase());
        });
    }
    
    // Se não houver dados, mostra mensagem na tabela
    if (filteredData.length === 0) {
        tcoTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">Nenhum TCO encontrado</td></tr>';
        return;
    }
    
    filteredData.forEach(tco => {
        const row = document.createElement('tr');
        // Garantir que o RAP (Genesis) seja exibido corretamente
        const rapValue = (tco.rap || '').toString().trim();
        row.innerHTML = `
            <td><strong>${rapValue || 'N/A'}</strong></td>
            <td>${tco.envolvido || 'N/A'}</td>
            <td>${tco.ilicito || 'N/A'}</td>
            <td>${tco.item || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewTCO('${tco.id}')" title="Ver detalhes">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-edit" onclick="editTCO('${tco.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-print" onclick="printTCO('${tco.id}')" title="Imprimir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                    </button>
                    <button class="btn-action btn-delete-action" onclick="deleteTCO('${tco.id}')" title="Excluir">
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

// Filtros TCO
if (filterBtnTCO) {
    filterBtnTCO.addEventListener('click', () => {
        populateIlicitoOptions();
        restoreTCOFilterValues();
        if (filterModalTCO) {
            filterModalTCO.classList.add('active');
        }
    });
}

if (filterModalTCOClose) {
    filterModalTCOClose.addEventListener('click', () => {
        if (filterModalTCO) filterModalTCO.classList.remove('active');
    });
}

// Preencher opções de ilícito dinamicamente
function populateIlicitoOptions() {
    const ilicitoSelect = document.getElementById('filterIlicito');
    if (!ilicitoSelect) return;
    
    // Obter todos os ilícitos únicos dos TCOs
    const allIlicitos = [...new Set(tcoData.map(tco => tco.ilicito).filter(Boolean))];
    
    // Limpar opções existentes (exceto "Todos os ilícitos")
    ilicitoSelect.innerHTML = '<option value="">Todos os ilícitos</option>';
    
    // Adicionar opções
    allIlicitos.forEach(ilicito => {
        const option = document.createElement('option');
        option.value = ilicito;
        option.textContent = ilicito;
        ilicitoSelect.appendChild(option);
    });
}

// Restaurar valores dos filtros TCO
function restoreTCOFilterValues() {
    const filterRAP = document.getElementById('filterRAP');
    const filterIlicito = document.getElementById('filterIlicito');
    const filterItem = document.getElementById('filterItem');
    
    if (filterRAP) filterRAP.value = activeFiltersTCO.rap || '';
    if (filterIlicito) filterIlicito.value = activeFiltersTCO.ilicito || '';
    if (filterItem) filterItem.value = activeFiltersTCO.item || '';
}

if (btnApplyFiltersTCO) {
    btnApplyFiltersTCO.addEventListener('click', () => {
        applyTCOFilters();
        if (filterModalTCO) filterModalTCO.classList.remove('active');
    });
}

if (btnClearFiltersTCO) {
    btnClearFiltersTCO.addEventListener('click', () => {
        clearTCOFilters();
    });
}

// Função para verificar se há filtros ativos em TCOs
function hasActiveTCOFilters() {
    return !!(activeFiltersTCO.rap || activeFiltersTCO.ilicito || activeFiltersTCO.item);
}

// Função para atualizar estado visual do botão de filtro de TCOs
function updateTCOFilterButtonState() {
    if (filterBtnTCO) {
        if (hasActiveTCOFilters()) {
            filterBtnTCO.classList.add('active');
        } else {
            filterBtnTCO.classList.remove('active');
        }
    }
}

function applyTCOFilters() {
    const filterRAP = document.getElementById('filterRAP');
    const filterIlicito = document.getElementById('filterIlicito');
    const filterItem = document.getElementById('filterItem');
    
    // Salvar filtros ativos
    activeFiltersTCO = {
        rap: filterRAP ? filterRAP.value.trim() : '',
        ilicito: filterIlicito ? filterIlicito.value : '',
        item: filterItem ? filterItem.value.trim() : ''
    };
    
    // Atualizar estado visual do botão
    updateTCOFilterButtonState();
    
    // Aplicar filtros na renderização
    renderTCOTable();
}

function clearTCOFilters() {
    activeFiltersTCO = {
        rap: '',
        ilicito: '',
        item: ''
    };
    
    const filterRAP = document.getElementById('filterRAP');
    const filterIlicito = document.getElementById('filterIlicito');
    const filterItem = document.getElementById('filterItem');
    
    if (filterRAP) filterRAP.value = '';
    if (filterIlicito) filterIlicito.value = '';
    if (filterItem) filterItem.value = '';
    
    // Atualizar estado visual do botão
    updateTCOFilterButtonState();
    
    renderTCOTable();
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

// Exportar TCOs para Excel - Abre modal de filtros
if (exportBtnTCO) {
    exportBtnTCO.addEventListener('click', () => {
        const exportTCOFilterModal = document.getElementById('exportTCOFilterModal');
        if (exportTCOFilterModal) {
            // Limpar filtros anteriores
            document.getElementById('exportTCODataInicial').value = '';
            document.getElementById('exportTCODataFinal').value = '';
            
            // Limpar checkboxes de ilícito
            document.querySelectorAll('.export-ilicito-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Limpar checkboxes de status
            document.querySelectorAll('.export-tco-status-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            exportTCOFilterModal.classList.add('active');
        }
    });
}

// Função para aplicar filtros e exportar TCOs
async function performExportTCOsWithFilters() {
    const dataInicial = document.getElementById('exportTCODataInicial').value;
    const dataFinal = document.getElementById('exportTCODataFinal').value;
    
    // Obter ilícitos selecionados (checkboxes)
    const selectedIlicitos = Array.from(document.querySelectorAll('.export-ilicito-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    // Obter status selecionados (checkboxes)
    const selectedStatuses = Array.from(document.querySelectorAll('.export-tco-status-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    // Fechar modal
    const exportTCOFilterModal = document.getElementById('exportTCOFilterModal');
    if (exportTCOFilterModal) {
        exportTCOFilterModal.classList.remove('active');
    }
    
    // Aplicar filtros
    let filteredData = [...tcoData];
    
    // Para filtrar por data e status, precisamos buscar informações das ocorrências relacionadas
    // Vamos carregar as ocorrências para fazer o match
    let occurrencesData = [];
    if (dataInicial || dataFinal || selectedStatuses.length > 0) {
        try {
            const result = await ipcRenderer.invoke('get-occurrences');
            if (result.success && result.data) {
                occurrencesData = result.data;
            }
        } catch (error) {
            console.error('Erro ao carregar ocorrências para filtro:', error);
        }
    }
    
    // Criar mapa de RAP -> ocorrência para busca rápida
    const rapToOccurrence = {};
    occurrencesData.forEach(occ => {
        if (occ.ocorrencia?.numeroGenesis) {
            rapToOccurrence[occ.ocorrencia.numeroGenesis] = occ;
        }
    });
    
    // Filtro por ilícito (direto do TCO)
    if (selectedIlicitos.length > 0) {
        filteredData = filteredData.filter(tco => {
            return selectedIlicitos.includes(tco.ilicito);
        });
    }
    
    // Filtro por data e status (precisa buscar da ocorrência relacionada)
    if (dataInicial || dataFinal || selectedStatuses.length > 0) {
        filteredData = filteredData.filter(tco => {
            const occurrence = rapToOccurrence[tco.rap];
            if (!occurrence) return false; // Se não encontrar ocorrência, excluir
            
            // Filtro por data
            if (dataInicial || dataFinal) {
                const dataApreensao = occurrence.ocorrencia?.dataApreensao;
                if (!dataApreensao) return false;
                
                try {
                    const [day, month, year] = dataApreensao.split('/');
                    if (!day || !month || !year) return false;
                    
                    const occDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    occDate.setHours(0, 0, 0, 0);
                    
                    if (dataInicial) {
                        const initDate = new Date(dataInicial + 'T00:00:00');
                        if (occDate < initDate) return false;
                    }
                    
                    if (dataFinal) {
                        const finalDate = new Date(dataFinal + 'T23:59:59');
                        if (occDate > finalDate) return false;
                    }
                } catch (error) {
                    console.error('Erro ao processar data:', error);
                    return false;
                }
            }
            
            // Filtro por status
            if (selectedStatuses.length > 0) {
                const status = occurrence.ocorrencia?.status;
                if (!selectedStatuses.includes(status)) return false;
            }
            
            return true;
        });
    }
    
    // Verificar se há dados para exportar
    if (filteredData.length === 0) {
        customAlert.error('Nenhum TCO encontrado com os filtros selecionados.');
        return;
    }
    
    // Exportar
    showLoading('Exportando TCOs', `Gerando arquivo Excel com ${filteredData.length} TCO(s)...`);
    try {
        const result = await ipcRenderer.invoke('export-tcos', filteredData);
        hideLoading();
        if (result.success) {
            customAlert.success(`Arquivo Excel exportado com sucesso!<br><br><strong>TCOs exportados:</strong> ${filteredData.length}<br><strong>Local:</strong> ${result.filePath}`);
        } else {
            customAlert.error('Erro ao exportar: ' + result.message);
        }
    } catch (error) {
        console.error('Erro ao exportar TCOs:', error);
        hideLoading();
        customAlert.error('Erro ao exportar arquivo');
    }
}

// Funções globais para ações da tabela
window.viewTCO = function(id) {
    customAlert.info('Visualização de TCO em desenvolvimento.');
};

window.editTCO = function(id) {
    customAlert.info('Edição de TCO em desenvolvimento.');
};

window.printTCO = function(id) {
    customAlert.info('Impressão de TCO em desenvolvimento.');
};

window.deleteTCO = function(id) {
    // Encontrar o TCO pelo ID
    const tco = tcoData.find(t => t.id === id);
    if (!tco) {
        customAlert.error('TCO não encontrado');
        return;
    }
    
    customAlert.confirm('Tem certeza que deseja excluir este TCO? Esta ação não pode ser desfeita.', async () => {
        showLoading('Excluindo TCO', 'Removendo do Google Sheets...');
        try {
            const result = await ipcRenderer.invoke('delete-tco', tco.rap);
            hideLoading();
            
            if (result.success) {
                customAlert.success('TCO excluído com sucesso!');
                // Recarregar TCOs
                await loadTCOs();
            } else {
                customAlert.error('Erro ao excluir TCO: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao excluir TCO:', error);
            hideLoading();
            customAlert.error('Erro ao excluir TCO: ' + error.message);
        }
    });
};

// Função para obter opções de status baseado na espécie
function getStatusOptions(especie) {
    if (!especie) return [];
    
    // Converter para maiúsculo para comparação
    const especieUpper = especie.toUpperCase();
    
    if (especieUpper === 'SUBSTÂNCIA') {
        return ['SECRIMPO', 'INSTITUTO DE CRIMINALISTICA', 'DOP', 'DESTRUIÇÃO'];
    } else if (especieUpper === 'OBJETO' || especieUpper === 'SIMULACRO' || especieUpper === 'ARMA BRANCA') {
        return ['SECRIMPO', 'CEGOC', 'IC'];
    } else {
        // Se espécie não reconhecida, não mostra opções
        return [];
    }
}

// Função para atualizar status
window.updateStatus = async function(index, newStatus) {
    if (!newStatus || newStatus === '') {
        // Se o status foi limpo, não fazer nada
        return;
    }
    
    const occurrence = filteredOccurrences[index];
    if (!occurrence) {
        customAlert.error('Ocorrência não encontrada');
        return;
    }
    
    // Validar se o status é válido para a espécie
    const especie = occurrence.itemApreendido?.especie;
    const validStatusOptions = getStatusOptions(especie);
    
    if (!validStatusOptions.includes(newStatus)) {
        customAlert.error('Status inválido para esta espécie. Por favor, selecione um status válido.');
        // Restaurar o valor anterior
        const statusDropdown = document.querySelector(`.status-dropdown[data-index="${index}"]`);
        if (statusDropdown) {
            const previousStatus = occurrence.ocorrencia.status || '';
            statusDropdown.value = previousStatus;
        }
        return;
    }
    
    // Guardar o status anterior para possível reversão
    const previousStatus = occurrence.ocorrencia.status;
    
    try {
        // Atualizar localmente primeiro para feedback imediato
        occurrence.ocorrencia.status = newStatus;
        
        // Preparar dados para atualização
        const updatedData = {
            id: occurrence.id,
            numeroGenesisOriginal: occurrence.ocorrencia.numeroGenesis,
            ocorrencia: {
                numeroGenesis: occurrence.ocorrencia.numeroGenesis,
                unidade: occurrence.ocorrencia.unidade || '',
                dataApreensao: occurrence.ocorrencia.dataApreensao || '',
                leiInfrigida: occurrence.ocorrencia.leiInfrigida || '',
                artigo: occurrence.ocorrencia.artigo || '',
                status: newStatus,
                numeroPje: occurrence.ocorrencia.numeroPje || ''
            },
            itemApreendido: {
                especie: occurrence.itemApreendido?.especie || '',
                item: occurrence.itemApreendido?.item || '',
                quantidade: occurrence.itemApreendido?.quantidade || '',
                descricao: occurrence.itemApreendido?.descricao || ''
            },
            proprietario: occurrence.proprietario || {},
            policial: occurrence.policial || {},
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
                allOccurrences[mainIndex].ocorrencia.status = newStatus;
            }
            
            // Não precisamos recarregar a página, apenas atualizar visualmente
            // renderTable(); // Comentado para evitar piscar da tela
            
        } else {
            // Reverter mudança local se falhar
            occurrence.ocorrencia.status = previousStatus;
            const statusDropdown = document.querySelector(`.status-dropdown[data-index="${index}"]`);
            if (statusDropdown) {
                statusDropdown.value = previousStatus || '';
            }
            customAlert.error('Erro ao atualizar status: ' + (result.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        console.error('Detalhes do erro:', error.message, error.stack);
        // Reverter mudança local em caso de erro
        occurrence.ocorrencia.status = previousStatus;
        const statusDropdown = document.querySelector(`.status-dropdown[data-index="${index}"]`);
        if (statusDropdown) {
            statusDropdown.value = previousStatus || '';
        }
        customAlert.error('Erro ao atualizar status: ' + error.message);
    }
};

// Carregar TCOs quando a aba for ativada
const originalSetActiveTab = setActiveTab;
setActiveTab = function(tab) {
    originalSetActiveTab(tab);
    if (tab === 'tco') {
        if (tcoData.length === 0) {
            loadTCOs();
        } else {
            // Atualizar estado do botão mesmo se os dados já estiverem carregados
            updateTCOFilterButtonState();
        }
    }
};

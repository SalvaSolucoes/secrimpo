const { ipcRenderer } = require('electron');

const occurrenceForm = document.getElementById('occurrenceForm');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');
const logoutBtn = document.getElementById('logoutBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const userInfo = document.getElementById('userInfo');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const loadingSubtext = document.getElementById('loadingSubtext');

// Navigation tabs
const tabDashboard = document.getElementById('tabDashboard');
const tabNovaOcorrencia = document.getElementById('tabNovaOcorrencia');

// Elementos de múltiplos proprietários
const addProprietarioBtn = document.getElementById('addProprietarioBtn');
const proprietariosContainer = document.getElementById('proprietariosContainer');
let proprietarioCount = 1; // Começa com 1 porque já temos o primeiro

// Função para auto-resize do textarea de descrição
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    // Resetar altura para calcular o scrollHeight corretamente
    textarea.style.height = 'auto';
    
    // Definir altura baseada no conteúdo
    const newHeight = Math.max(80, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';
}

// Carregar informações do usuário
window.addEventListener('load', () => {
    const username = sessionStorage.getItem('username');
    if (username) {
        userInfo.textContent = `${username}`;
    }
    
    // Limpar formulário ao carregar a página
    clearForm();
    
    // Resetar estado de upload ao carregar
    resetFileUploadState();
    
    // Inicializar calendários Flatpickr
    initializeDatePickers();
    
    // Configurar auto-resize para o textarea de descrição
    const descricaoItem = document.getElementById('descricaoItem');
    if (descricaoItem) {
        // Auto-resize ao digitar
        descricaoItem.addEventListener('input', () => {
            autoResizeTextarea(descricaoItem);
        });
        
        // Auto-resize inicial
        autoResizeTextarea(descricaoItem);
    }
});

// ==================== FUNCIONALIDADE DE MÚLTIPLOS PROPRIETÁRIOS ====================

// Função auxiliar para converter strings para maiúsculas
function toUpperCase(value) {
    return typeof value === 'string' ? value.toUpperCase() : value;
}

// Função para coletar todos os proprietários do formulário
function collectProprietarios() {
    const proprietarios = [];
    const proprietarioItems = document.querySelectorAll('.proprietario-item');
    
    proprietarioItems.forEach((item, index) => {
        const nome = item.querySelector('.proprietario-nome').value.trim();
        const tipoDocumento = item.querySelector('.proprietario-tipo-documento').value;
        const numeroDocumento = item.querySelector('.proprietario-numero-documento').value.trim();
        
        // Só adicionar se pelo menos o nome estiver preenchido
        if (nome || tipoDocumento || numeroDocumento) {
            proprietarios.push({
                nome: toUpperCase(nome),
                tipoDocumento: tipoDocumento, // Select mantém valor original
                numeroDocumento: toUpperCase(numeroDocumento)
            });
        }
    });
    
    return proprietarios;
}

// Função para criar um novo campo de proprietário
function addProprietario() {
    proprietarioCount++;
    const index = proprietarioCount - 1;
    
    const proprietarioItem = document.createElement('div');
    proprietarioItem.className = 'proprietario-item';
    proprietarioItem.setAttribute('data-proprietario-index', index);
    
    proprietarioItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; font-size: 1rem; color: #333;">Proprietário ${proprietarioCount}</h3>
            <button type="button" class="btn-remove-proprietario" onclick="removeProprietario(this)">
                Remover
            </button>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" class="proprietario-nome" data-index="${index}" required>
            </div>
            <div class="form-group">
                <label>Tipo de Documento</label>
                <select class="proprietario-tipo-documento" data-index="${index}" required>
                    <option value="">Selecione...</option>
                    <option value="CPF">CPF</option>
                    <option value="RG">RG</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nº Documento</label>
                <input type="text" class="proprietario-numero-documento" data-index="${index}" required>
            </div>
        </div>
    `;
    
    proprietariosContainer.appendChild(proprietarioItem);
    
    // Adicionar listeners para máscaras e conversão para maiúsculas
    setupProprietarioListeners(proprietarioItem);
    
    // Scroll suave para o novo proprietário
    proprietarioItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Função para remover um proprietário
window.removeProprietario = function(button) {
    const proprietarioItem = button.closest('.proprietario-item');
    const index = parseInt(proprietarioItem.getAttribute('data-proprietario-index'));
    
    // Não permitir remover o primeiro proprietário
    if (index === 0) {
        return;
    }
    
    proprietarioItem.remove();
    
    // Renumerar os proprietários restantes
    updateProprietarioNumbers();
}

// Função para renumerar os proprietários após remoção
function updateProprietarioNumbers() {
    const proprietarioItems = document.querySelectorAll('.proprietario-item');
    proprietarioCount = proprietarioItems.length;
    
    proprietarioItems.forEach((item, index) => {
        const title = item.querySelector('h3');
        if (title) {
            title.textContent = `Proprietário ${index + 1}`;
        }
        item.setAttribute('data-proprietario-index', index);
        
        // Atualizar data-index nos inputs
        const inputs = item.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.setAttribute('data-index', index);
        });
    });
}

// Função para configurar listeners em um item de proprietário
function setupProprietarioListeners(proprietarioItem) {
    const nomeInput = proprietarioItem.querySelector('.proprietario-nome');
    const tipoDocumentoSelect = proprietarioItem.querySelector('.proprietario-tipo-documento');
    const numeroDocumentoInput = proprietarioItem.querySelector('.proprietario-numero-documento');
    
    // Converter nome para maiúsculas
    if (nomeInput) {
        nomeInput.addEventListener('input', convertToUpperCase);
    }
    
    // Aplicar máscara no número do documento baseado no tipo
    if (tipoDocumentoSelect && numeroDocumentoInput) {
        tipoDocumentoSelect.addEventListener('change', function() {
            applyDocumentMask(numeroDocumentoInput, this.value);
        });
        
        // Converter número do documento para maiúsculas
        numeroDocumentoInput.addEventListener('input', convertToUpperCase);
    }
}

// Função para aplicar máscara no documento
function applyDocumentMask(input, tipo) {
    if (!input) return;
    
    let value = input.value.replace(/\D/g, '');
    
    if (tipo === 'CPF') {
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
    } else if (tipo === 'RG') {
        // Máscara simples para RG (pode ser ajustada conforme necessário)
        if (value.length > 9) {
            value = value.substring(0, 9);
        }
    }
    
    input.value = value;
}

// Event listener para o botão de adicionar proprietário
if (addProprietarioBtn) {
    addProprietarioBtn.addEventListener('click', addProprietario);
}

// Configurar listeners no primeiro proprietário
window.addEventListener('load', () => {
    const firstProprietarioItem = document.querySelector('.proprietario-item[data-proprietario-index="0"]');
    if (firstProprietarioItem) {
        setupProprietarioListeners(firstProprietarioItem);
    }
});

// Submit do formulário
occurrenceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Formulário submetido');
    
    // Verificar validação HTML5
    if (!occurrenceForm.checkValidity()) {
        console.log('Formulário inválido - campos obrigatórios não preenchidos');
        occurrenceForm.reportValidity();
        return;
    }
    
    // Validar datas antes de enviar
    const dataApreensao = document.getElementById('dataApreensao').value;
    
    if (!isValidDate(dataApreensao)) {
        showError('Data de apreensão inválida. Use o formato dd/mm/aaaa');
        return;
    }
    
    console.log('Coletando dados do formulário...');
    
    // Coletar dados do formulário e converter para maiúsculas
    const formData = {
        ocorrencia: {
            numeroGenesis: toUpperCase(document.getElementById('numeroGenesis').value),
            unidade: document.getElementById('unidade').value, // Select mantém valor original
            dataApreensao: brDateToISO(dataApreensao),
            leiInfrigida: toUpperCase(document.getElementById('leiInfrigida').value),
            artigo: toUpperCase(document.getElementById('artigo').value),
            status: document.getElementById('status').value, // Select mantém valor original
            numeroPje: toUpperCase(document.getElementById('numeroPje').value || '')
        },
        itemApreendido: {
            especie: document.getElementById('especie').value, // Select mantém valor original
            item: toUpperCase(document.getElementById('item').value),
            quantidade: toUpperCase(document.getElementById('quantidade').value),
            descricao: toUpperCase(document.getElementById('descricaoItem').value)
        },
        proprietarios: collectProprietarios(),
        policial: {
            nome: toUpperCase(document.getElementById('nomePolicial').value),
            matricula: toUpperCase(document.getElementById('matricula').value),
            graduacao: document.getElementById('graduacao').value, // Select mantém valor original
            unidade: toUpperCase(document.getElementById('unidadePolicial').value)
        },
        metadata: {
            registradoPor: sessionStorage.getItem('username'),
            dataRegistro: new Date().toISOString()
        }
    };
    
    console.log('Dados coletados:', formData);
    
    // Mostrar loading global
    showLoading('Salvando ocorrência', 'Enviando dados para o sistema...');
    hideMessages();
    
    try {
        console.log('Enviando dados para o backend...');
        const result = await ipcRenderer.invoke('save-occurrence', formData);
        console.log('Resposta do backend:', result);
        
        if (result.success) {
            hideLoading();
            showSuccess(result.message);
            // Limpar formulário após sucesso
            setTimeout(() => {
                clearForm();
            }, 2000);
        } else {
            hideLoading();
            showError(result.message || 'Erro ao salvar ocorrência');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        hideLoading();
        showError('Erro ao salvar ocorrência: ' + error.message);
    }
});

// Limpar formulário
clearBtn.addEventListener('click', () => {
    customAlert.confirm(
        'Deseja realmente limpar todos os campos do formulário?',
        () => {
            clearForm();
        },
        null,
        'Limpar Formulário'
    );
});

// Toggle do menu do usuário
userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('active');
});

// Fechar menu ao clicar fora
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

// ==================== FUNCIONALIDADE DE VERIFICAR ATUALIZAÇÕES ====================

if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
        showLoading('Verificando atualizações', 'Buscando novas versões...');
        try {
            const result = await ipcRenderer.invoke('check-updates-manual');
            hideLoading();
            
            if (result && result.error) {
                customAlert.error('Erro ao verificar atualizações: ' + result.error);
            } else if (result && result.available) {
                customAlert.info('Nova versão disponível! Versão ' + result.version + '. Verifique as atualizações no dashboard.');
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

// Funções auxiliares
function showLoading(text = 'Processando', subtext = 'Aguarde um momento') {
    loadingText.textContent = text;
    loadingSubtext.textContent = subtext;
    loadingOverlay.classList.add('active');
    submitBtn.disabled = true;
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
    submitBtn.disabled = false;
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

function clearForm() {
    if (!occurrenceForm) return;
    
    occurrenceForm.reset();
    hideMessages();
    hideLoading();
    
    // Limpar proprietários extras (manter apenas o primeiro)
    const proprietarioItems = document.querySelectorAll('.proprietario-item');
    proprietarioItems.forEach((item, index) => {
        if (index > 0) {
            item.remove();
        } else {
            // Limpar campos do primeiro proprietário
            const nomeInput = item.querySelector('.proprietario-nome');
            const tipoSelect = item.querySelector('.proprietario-tipo-documento');
            const numeroInput = item.querySelector('.proprietario-numero-documento');
            
            if (nomeInput) nomeInput.value = '';
            if (tipoSelect) tipoSelect.value = '';
            if (numeroInput) numeroInput.value = '';
        }
    });
    
    // Resetar contador de proprietários
    proprietarioCount = 1;
    updateProprietarioNumbers();
    
    // Reinicializar calendários com data atual
    if (typeof initializeDatePickers === 'function') {
        initializeDatePickers();
    }
    
    // Resetar altura do textarea de descrição
    const descricaoItem = document.getElementById('descricaoItem');
    if (descricaoItem) {
        autoResizeTextarea(descricaoItem);
    }
    
    // Focar no primeiro campo se existir
    const numeroGenesis = document.getElementById('numeroGenesis');
    if (numeroGenesis) {
        numeroGenesis.focus();
    }
}

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

// Validar data no formato brasileiro
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

// Converter data brasileira para ISO (yyyy-mm-dd)
function brDateToISO(brDate) {
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
}

// Função vazia para manter compatibilidade
function initializeDatePickers() {
    // Calendário removido
}

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

// Máscaras de documento agora são aplicadas via setupProprietarioListeners para cada proprietário

// Função para atualizar o Nº Genesis com o ano automaticamente
function updateGenesisWithYear() {
    const dataApreensao = document.getElementById('dataApreensao').value;
    const numeroGenesis = document.getElementById('numeroGenesis');
    
    // Verificar se a data está completa (dd/mm/aaaa)
    if (dataApreensao.length === 10 && isValidDate(dataApreensao)) {
        const year = dataApreensao.split('/')[2]; // Extrair o ano
        const currentValue = numeroGenesis.value;
        
        // Remover ano anterior se existir (formato: xxxx-yyyy)
        const valueWithoutYear = currentValue.replace(/-\d{4}$/, '');
        
        // Adicionar o novo ano
        if (valueWithoutYear) {
            numeroGenesis.value = valueWithoutYear + '-' + year;
        }
    }
}

// Atualizar Nº Genesis quando a data de apreensão mudar
document.getElementById('dataApreensao').addEventListener('input', function(e) {
    applyDateMask(e);
    updateGenesisWithYear();
});

// Atualizar Nº Genesis quando o número for digitado
document.getElementById('numeroGenesis').addEventListener('input', function(e) {
    updateGenesisWithYear();
});

// ==================== FUNCIONALIDADE DE PREENCHIMENTO POR ARQUIVO ====================

// Elementos da interface
const modeSelectionScreen = document.getElementById('modeSelectionScreen');
const selectManualMode = document.getElementById('selectManualMode');
const selectFileMode = document.getElementById('selectFileMode');
const fileUploadSection = document.getElementById('fileUploadSection');
const formWrapper = document.getElementById('formWrapper');
const backFromFileBtn = document.getElementById('backFromFileBtn');
const backFromFormBtn = document.getElementById('backFromFormBtn');

// Elementos de upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const extractBtn = document.getElementById('extractBtn');

let selectedFile = null;

// Função para resetar estado de upload de arquivo
function resetFileUploadState() {
    selectedFile = null;
    if (fileInput) {
        fileInput.value = '';
    }
    if (uploadArea) {
        uploadArea.style.display = 'block';
    }
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    if (uploadArea) {
        uploadArea.classList.remove('drag-over');
    }
}

// Navigation tab events
tabDashboard.addEventListener('click', () => {
    // Limpar formulário ao sair da tela de nova ocorrência
    clearForm();
    // Resetar estado de upload
    resetFileUploadState();
    // Resetar para tela de seleção de modo
    if (modeSelectionScreen) modeSelectionScreen.style.display = 'flex';
    if (formWrapper) formWrapper.style.display = 'none';
    if (fileUploadSection) fileUploadSection.style.display = 'none';
    ipcRenderer.send('load-dashboard');
});

// Navegar para modo manual - vai direto para o formulário
selectManualMode.addEventListener('click', () => {
    // Limpar formulário antes de mostrar
    clearForm();
    modeSelectionScreen.style.display = 'none';
    formWrapper.style.display = 'block';
    // Garantir que o textarea tenha altura correta ao mostrar o formulário
    setTimeout(() => {
        const descricaoItem = document.getElementById('descricaoItem');
        if (descricaoItem) {
            autoResizeTextarea(descricaoItem);
        }
    }, 10);
});

// Modo arquivo - abre o seletor de arquivo imediatamente
selectFileMode.addEventListener('click', (e) => {
    e.stopPropagation();
    // Resetar estado de upload antes de abrir seletor
    resetFileUploadState();
    // Mostrar tela de upload
    modeSelectionScreen.style.display = 'none';
    fileUploadSection.style.display = 'block';
    // Limpar o valor do input para garantir que o evento change seja disparado
    if (fileInput) {
        fileInput.value = '';
        // Abrir seletor imediatamente
        fileInput.click();
    }
});

// Voltar da tela de upload para seleção
backFromFileBtn.addEventListener('click', () => {
    fileUploadSection.style.display = 'none';
    modeSelectionScreen.style.display = 'flex';
    // Resetar completamente o estado de upload
    resetFileUploadState();
    // Limpar formulário se estiver preenchido
    clearForm();
});

// Voltar da tela de formulário para seleção
backFromFormBtn.addEventListener('click', () => {
    // Limpar formulário ao voltar
    clearForm();
    formWrapper.style.display = 'none';
    modeSelectionScreen.style.display = 'flex';
});

// Abrir seletor de arquivo
selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Limpar valor do input para garantir que o evento change seja disparado
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
});

uploadArea.addEventListener('click', (e) => {
    // Só abrir seletor se clicar diretamente na área de upload, não em elementos filhos
    if (e.target === uploadArea || (e.target.closest('.upload-area') && e.target === uploadArea)) {
        e.stopPropagation();
        // Limpar valor do input para garantir que o evento change seja disparado
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
    }
});

// Processar arquivo selecionado
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Esconder tela de seleção e mostrar tela de upload
        modeSelectionScreen.style.display = 'none';
        fileUploadSection.style.display = 'block';
        handleFileSelect(file);
    }
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

// Função para processar arquivo selecionado
function handleFileSelect(file) {
    const validExtensions = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showError('Tipo de arquivo não suportado. Use PDF, Word, Imagem ou TXT.');
        return;
    }
    
    selectedFile = file;
    
    // Mostrar informações do arquivo
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'block';
}

// Remover arquivo selecionado
removeFileBtn.addEventListener('click', () => {
    resetFileUploadState();
});

// Extrair dados do arquivo
extractBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showError('Nenhum arquivo selecionado');
        return;
    }
    
    showLoading('Extraindo dados', 'Processando arquivo... Isso pode levar alguns instantes.');
    hideMessages();
    
    try {
        // Enviar arquivo para o processo principal para extração
        const result = await ipcRenderer.invoke('extract-file-data', selectedFile.path);
        
        hideLoading();
        
        if (result.success) {
            // Preencher formulário com os dados extraídos
            fillFormWithExtractedData(result.data);
            showSuccess('Dados extraídos com sucesso!');
            
            // Ir para o formulário após extração
            setTimeout(() => {
                fileUploadSection.style.display = 'none';
                formWrapper.style.display = 'block';
                // Garantir que o textarea tenha altura correta após preencher dados
                const descricaoItem = document.getElementById('descricaoItem');
                if (descricaoItem) {
                    autoResizeTextarea(descricaoItem);
                }
            }, 2000);
        } else {
            showError(result.message || 'Erro ao extrair dados do arquivo');
        }
    } catch (error) {
        console.error('Erro ao extrair dados:', error);
        hideLoading();
        showError('Erro ao processar arquivo: ' + error.message);
    }
});

// Função para preencher o formulário com dados extraídos
function fillFormWithExtractedData(data) {
    // Função auxiliar para converter strings para maiúsculas
    function toUpperCase(value) {
        return typeof value === 'string' ? value.toUpperCase() : value;
    }
    
    // Dados da Ocorrência
    if (data.numeroGenesis) {
        document.getElementById('numeroGenesis').value = toUpperCase(data.numeroGenesis);
    }
    
    if (data.unidade) {
        const unidadeField = document.getElementById('unidade');
        if (unidadeField) {
            unidadeField.value = data.unidade;
        }
    }
    
    if (data.dataApreensao) {
        document.getElementById('dataApreensao').value = data.dataApreensao;
    }
    
    if (data.leiInfrigida) {
        document.getElementById('leiInfrigida').value = toUpperCase(data.leiInfrigida);
    }
    
    if (data.artigo) {
        document.getElementById('artigo').value = toUpperCase(data.artigo);
    }
    
    if (data.numeroPje) {
        document.getElementById('numeroPje').value = toUpperCase(data.numeroPje);
    }
    
    // Item Apreendido
    if (data.especie) {
        document.getElementById('especie').value = data.especie; // Select mantém valor original
        // Trigger change event para atualizar as opções do status
        document.getElementById('especie').dispatchEvent(new Event('change'));
    }
    
    if (data.item) {
        document.getElementById('item').value = toUpperCase(data.item);
    }
    
    if (data.quantidade) {
        document.getElementById('quantidade').value = toUpperCase(data.quantidade);
    }
    
    if (data.descricaoItem) {
        const descricaoItem = document.getElementById('descricaoItem');
        if (descricaoItem) {
            descricaoItem.value = data.descricaoItem;
            // Ajustar altura após preencher
            autoResizeTextarea(descricaoItem);
        }
    }
    
    if (data.status) {
        // Aguardar um pouco para que as opções do status sejam carregadas
        setTimeout(() => {
            document.getElementById('status').value = data.status; // Select mantém valor original
        }, 100);
    }
    
    // Dados do Proprietário (suporta múltiplos proprietários)
    if (data.proprietarios && Array.isArray(data.proprietarios) && data.proprietarios.length > 0) {
        // Limpar proprietários existentes (exceto o primeiro)
        const proprietarioItems = document.querySelectorAll('.proprietario-item');
        proprietarioItems.forEach((item, index) => {
            if (index > 0) {
                item.remove();
            }
        });
        proprietarioCount = 1;
        
        // Preencher cada proprietário
        data.proprietarios.forEach((proprietario, index) => {
            if (index === 0) {
                // Preencher o primeiro proprietário
                const firstItem = document.querySelector('.proprietario-item[data-proprietario-index="0"]');
                if (firstItem) {
                    const nomeInput = firstItem.querySelector('.proprietario-nome');
                    const tipoSelect = firstItem.querySelector('.proprietario-tipo-documento');
                    const numeroInput = firstItem.querySelector('.proprietario-numero-documento');
                    
                    if (nomeInput && proprietario.nome) nomeInput.value = toUpperCase(proprietario.nome);
                    if (tipoSelect && proprietario.tipoDocumento) {
                        tipoSelect.value = proprietario.tipoDocumento;
                        tipoSelect.dispatchEvent(new Event('change'));
                    }
                    if (numeroInput && proprietario.numeroDocumento) numeroInput.value = toUpperCase(proprietario.numeroDocumento);
                }
            } else {
                // Adicionar novos proprietários
                addProprietario();
                const newItem = document.querySelectorAll('.proprietario-item')[index];
                if (newItem) {
                    const nomeInput = newItem.querySelector('.proprietario-nome');
                    const tipoSelect = newItem.querySelector('.proprietario-tipo-documento');
                    const numeroInput = newItem.querySelector('.proprietario-numero-documento');
                    
                    if (nomeInput && proprietario.nome) nomeInput.value = toUpperCase(proprietario.nome);
                    if (tipoSelect && proprietario.tipoDocumento) {
                        tipoSelect.value = proprietario.tipoDocumento;
                        tipoSelect.dispatchEvent(new Event('change'));
                    }
                    if (numeroInput && proprietario.numeroDocumento) numeroInput.value = toUpperCase(proprietario.numeroDocumento);
                }
            }
        });
    } else if (data.nomeProprietario || data.tipoDocumento || data.numeroDocumento) {
        // Compatibilidade com formato antigo (um único proprietário)
        const firstItem = document.querySelector('.proprietario-item[data-proprietario-index="0"]');
        if (firstItem) {
            const nomeInput = firstItem.querySelector('.proprietario-nome');
            const tipoSelect = firstItem.querySelector('.proprietario-tipo-documento');
            const numeroInput = firstItem.querySelector('.proprietario-numero-documento');
            
            if (nomeInput && data.nomeProprietario) nomeInput.value = toUpperCase(data.nomeProprietario);
            if (tipoSelect && data.tipoDocumento) {
                tipoSelect.value = data.tipoDocumento;
                tipoSelect.dispatchEvent(new Event('change'));
            }
            if (numeroInput && data.numeroDocumento) numeroInput.value = toUpperCase(data.numeroDocumento);
        }
    }
    
    // Dados do Policial
    if (data.nomePolicial) {
        document.getElementById('nomePolicial').value = toUpperCase(data.nomePolicial);
    }
    
    if (data.matricula) {
        document.getElementById('matricula').value = toUpperCase(data.matricula);
    }
    
    if (data.graduacao) {
        document.getElementById('graduacao').value = data.graduacao; // Select mantém valor original
    }
    
    if (data.unidadePolicial) {
        document.getElementById('unidadePolicial').value = toUpperCase(data.unidadePolicial);
    }
    
    // Adicionar classe de destaque aos campos preenchidos
    highlightFilledFields();
}

// Destacar campos preenchidos automaticamente
function highlightFilledFields() {
    const inputs = document.querySelectorAll('#occurrenceForm input, #occurrenceForm select, #occurrenceForm textarea');
    inputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            input.style.backgroundColor = '#e8f5e9';
            input.style.borderColor = '#4caf50';
            
            // Remover destaque após 3 segundos
            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '';
            }, 3000);
        }
    });
}

// Função auxiliar para formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Função para converter texto para maiúsculas
function convertToUpperCase(e) {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const originalValue = input.value;
    const upperValue = originalValue.toUpperCase();
    
    // Só atualizar se o valor mudou (evita loop infinito)
    if (originalValue !== upperValue) {
        input.value = upperValue;
        // Restaurar posição do cursor
        input.setSelectionRange(cursorPosition, cursorPosition);
    }
}

// Aplicar conversão para maiúsculas em todos os campos de texto
function applyUpperCaseToTextFields() {
    // Lista de IDs dos campos de texto que devem ser convertidos para maiúsculas
    const textFields = [
        'numeroGenesis',
        'dataApreensao',
        'leiInfrigida',
        'artigo',
        'numeroPje',
        'item',
        'quantidade',
        'descricaoItem',
        'nomeProprietario',
        'numeroDocumento',
        'nomePolicial',
        'matricula',
        'unidadePolicial'
    ];
    
    textFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Converter ao digitar
            field.addEventListener('input', convertToUpperCase);
            // Converter ao colar
            field.addEventListener('paste', function(e) {
                setTimeout(() => convertToUpperCase(e), 0);
            });
        }
    });
}

// Inicializar autocomplete para leis quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar conversão para maiúsculas em todos os campos de texto
    applyUpperCaseToTextFields();
    
    // Inicializar autocomplete para o campo Lei Infringida
    const leiInput = document.getElementById('leiInfrigida');
    if (leiInput) {
        // Converter sigla antiga para nome completo se existir
        if (leiInput.value && typeof converterSiglaParaNome === 'function') {
            const nomeCompleto = converterSiglaParaNome(leiInput.value);
            if (nomeCompleto !== leiInput.value) {
                leiInput.value = nomeCompleto;
            }
        }
        
        const autocompleteLei = initAutocompleteLeis(leiInput, {
            onSelect: function(leiSelecionada) {
                console.log('Lei selecionada:', leiSelecionada);
                // Aqui você pode adicionar lógica adicional quando uma lei for selecionada
            }
        });
        
        // Escutar evento customizado de seleção
        leiInput.addEventListener('leiSelecionada', function(event) {
            const lei = event.detail;
            console.log('Evento leiSelecionada disparado:', lei);
            
            // Você pode adicionar validações ou ações específicas aqui
            // Por exemplo, limpar o campo artigo quando uma nova lei for selecionada
            const artigoInput = document.getElementById('artigo');
            if (artigoInput && artigoInput.value) {
                // Opcional: perguntar se deseja limpar o campo artigo
                // artigoInput.value = '';
            }
        });
        
        // Converter sigla para nome completo quando o campo perder o foco (se for uma sigla conhecida)
        leiInput.addEventListener('blur', function() {
            if (leiInput.value && typeof converterSiglaParaNome === 'function') {
                const nomeCompleto = converterSiglaParaNome(leiInput.value);
                if (nomeCompleto !== leiInput.value) {
                    leiInput.value = nomeCompleto;
                }
            }
        });
    }
    
    // Configurar lógica do campo Status baseado na Espécie
    const especieSelect = document.getElementById('especie');
    const statusSelect = document.getElementById('status');
    
    if (especieSelect && statusSelect) {
        especieSelect.addEventListener('change', function() {
            const especieSelecionada = this.value;
            
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
            
            if (especieSelecionada === 'SUBSTÂNCIA') {
                // Opções para SUBSTÂNCIA
                statusSelect.innerHTML += '<option value="SECRIMPO">SECRIMPO</option>';
                statusSelect.innerHTML += '<option value="INSTITUTO DE CRIMINALISTICA">INSTITUTO DE CRIMINALISTICA</option>';
                statusSelect.innerHTML += '<option value="DOP">DOP</option>';
                statusSelect.innerHTML += '<option value="DESTRUIÇÃO">DESTRUIÇÃO</option>';
            } else {
                // Opções para OBJETO, SIMULACRO e ARMA BRANCA
                statusSelect.innerHTML += '<option value="SECRIMPO">SECRIMPO</option>';
                statusSelect.innerHTML += '<option value="CEGOC">CEGOC</option>';
                statusSelect.innerHTML += '<option value="IC">IC</option>';
            }
        });
        
        // Inicializar o campo como desabilitado
        statusSelect.disabled = true;
    }
});


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

// Submit do formulário
occurrenceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validar datas antes de enviar
    const dataApreensao = document.getElementById('dataApreensao').value;
    
    if (!isValidDate(dataApreensao)) {
        showError('Data de apreensão inválida. Use o formato dd/mm/aaaa');
        return;
    }
    
    // Função auxiliar para converter strings para maiúsculas
    function toUpperCase(value) {
        return typeof value === 'string' ? value.toUpperCase() : value;
    }
    
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
        proprietario: {
            nome: toUpperCase(document.getElementById('nomeProprietario').value),
            tipoDocumento: document.getElementById('tipoDocumento').value, // Select mantém valor original
            numeroDocumento: toUpperCase(document.getElementById('numeroDocumento').value)
        },
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
    
    // Mostrar loading global
    showLoading('Salvando ocorrência', 'Enviando dados para o sistema...');
    hideMessages();
    
    try {
        const result = await ipcRenderer.invoke('save-occurrence', formData);
        
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

// Aplicar máscara no campo de documento
document.getElementById('numeroDocumento').addEventListener('input', function(e) {
    const tipo = document.getElementById('tipoDocumento').value;
    let value = e.target.value;
    
    if (tipo === 'CPF') {
        e.target.value = formatCPF(value);
    } else if (tipo === 'RG') {
        e.target.value = formatRG(value);
    }
});

// Limpar e reaplicar máscara quando mudar o tipo de documento
document.getElementById('tipoDocumento').addEventListener('change', function(e) {
    const numeroDocumento = document.getElementById('numeroDocumento');
    const value = numeroDocumento.value.replace(/\D/g, '');
    
    if (e.target.value === 'CPF') {
        numeroDocumento.value = formatCPF(value);
        numeroDocumento.placeholder = '000.000.000-00';
        numeroDocumento.maxLength = 14;
    } else if (e.target.value === 'RG') {
        numeroDocumento.value = formatRG(value);
        numeroDocumento.placeholder = '0.000.000 ou 00.000.000-0';
        numeroDocumento.maxLength = 12;
    } else {
        numeroDocumento.value = value;
        numeroDocumento.placeholder = '';
        numeroDocumento.removeAttribute('maxLength');
    }
});

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
    
    // Dados do Proprietário
    if (data.nomeProprietario) {
        document.getElementById('nomeProprietario').value = toUpperCase(data.nomeProprietario);
    }
    
    if (data.tipoDocumento) {
        document.getElementById('tipoDocumento').value = data.tipoDocumento; // Select mantém valor original
        // Trigger change event para aplicar máscara
        document.getElementById('tipoDocumento').dispatchEvent(new Event('change'));
    }
    
    if (data.numeroDocumento) {
        document.getElementById('numeroDocumento').value = toUpperCase(data.numeroDocumento);
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


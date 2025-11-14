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
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const loadingSubtext = document.getElementById('loadingSubtext');

// Navigation tabs
const tabDashboard = document.getElementById('tabDashboard');
const tabNovaOcorrencia = document.getElementById('tabNovaOcorrencia');

// Carregar informações do usuário
window.addEventListener('load', () => {
    const username = sessionStorage.getItem('username');
    if (username) {
        userInfo.textContent = `${username}`;
    }
    
    // Inicializar calendários Flatpickr
    initializeDatePickers();
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
    
    // Coletar dados do formulário
    const formData = {
        ocorrencia: {
            numeroGenesis: document.getElementById('numeroGenesis').value,
            unidade: document.getElementById('unidade').value,
            dataApreensao: brDateToISO(dataApreensao),
            leiInfrigida: document.getElementById('leiInfrigida').value,
            artigo: document.getElementById('artigo').value,
            status: document.getElementById('status').value || '',
            numeroPje: document.getElementById('numeroPje').value || '-'
        },
        itemApreendido: {
            especie: document.getElementById('especie').value,
            item: document.getElementById('item').value,
            quantidade: document.getElementById('quantidade').value,
            descricao: document.getElementById('descricaoItem').value
        },
        proprietario: {
            nome: document.getElementById('nomeProprietario').value,
            tipoDocumento: document.getElementById('tipoDocumento').value,
            numeroDocumento: document.getElementById('numeroDocumento').value
        },
        policial: {
            nome: document.getElementById('nomePolicial').value,
            matricula: document.getElementById('matricula').value,
            graduacao: document.getElementById('graduacao').value,
            unidade: document.getElementById('unidadePolicial').value
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
    occurrenceForm.reset();
    hideMessages();
    hideLoading();
    
    // Reinicializar calendários com data atual
    initializeDatePickers();
    
    // Focar no primeiro campo
    document.getElementById('numeroGenesis').focus();
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


// Navigation tab events
tabDashboard.addEventListener('click', () => {
    ipcRenderer.send('load-dashboard');
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

// Navegar para modo manual - vai direto para o formulário
selectManualMode.addEventListener('click', () => {
    modeSelectionScreen.style.display = 'none';
    formWrapper.style.display = 'block';
});

// Modo arquivo - abre o seletor de arquivo imediatamente
selectFileMode.addEventListener('click', () => {
    fileInput.click();
});

// Voltar da tela de upload para seleção
backFromFileBtn.addEventListener('click', () => {
    fileUploadSection.style.display = 'none';
    modeSelectionScreen.style.display = 'flex';
    // Limpar arquivo selecionado
    if (selectedFile) {
        removeFileBtn.click();
    }
});

// Voltar da tela de formulário para seleção
backFromFormBtn.addEventListener('click', () => {
    formWrapper.style.display = 'none';
    modeSelectionScreen.style.display = 'flex';
});

// Abrir seletor de arquivo
selectFileBtn.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('click', (e) => {
    if (e.target === uploadArea || e.target.closest('.upload-area')) {
        fileInput.click();
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
    selectedFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
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
    // Preencher campos se os dados existirem
    if (data.numeroGenesis) {
        document.getElementById('numeroGenesis').value = data.numeroGenesis;
    }
    
    if (data.dataApreensao) {
        document.getElementById('dataApreensao').value = data.dataApreensao;
    }
    
    if (data.artigo) {
        document.getElementById('artigo').value = data.artigo;
    }
    
    if (data.quantidade) {
        document.getElementById('quantidade').value = data.quantidade;
    }
    
    if (data.especie) {
        document.getElementById('especie').value = data.especie;
        // Atualizar as opções do status baseado na espécie
        updateStatusOptions();
    }
    
    if (data.status) {
        // Aguardar um pouco para que as opções do status sejam carregadas
        setTimeout(() => {
            document.getElementById('status').value = data.status;
        }, 100);
    }
    
    // Dados do proprietário
    if (data.nomeProprietario) {
        document.getElementById('nomeProprietario').value = data.nomeProprietario;
    }
    
    if (data.tipoDocumento) {
        document.getElementById('tipoDocumento').value = data.tipoDocumento;
        // Trigger change event para aplicar máscara
        document.getElementById('tipoDocumento').dispatchEvent(new Event('change'));
    }
    
    if (data.numeroDocumento) {
        document.getElementById('numeroDocumento').value = data.numeroDocumento;
    }
    
    if (data.matricula) {
        document.getElementById('matricula').value = data.matricula;
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

// Função para atualizar opções de status baseado na espécie
function updateStatusOptions() {
    const especieSelect = document.getElementById('especie');
    const statusSelect = document.getElementById('status');
    
    if (!especieSelect || !statusSelect) return;
    
    const especieSelecionada = especieSelect.value;
    
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
}

// Inicializar sistema de status quando a página carregar
window.addEventListener('load', function() {
    const especieSelect = document.getElementById('especie');
    const statusSelect = document.getElementById('status');
    
    if (especieSelect && statusSelect) {
        // Inicializar o campo como desabilitado
        statusSelect.disabled = true;
        
        // Adicionar listener para mudança de espécie
        especieSelect.addEventListener('change', updateStatusOptions);
        
        // Adicionar listener para limpar o valor quando "Selecione..." for escolhido
        statusSelect.addEventListener('change', function() {
            if (this.value === '') {
                this.value = '';
            }
        });
    }
});

// Inicializar autocomplete para leis quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar autocomplete para o campo Lei Infringida
    const leiInput = document.getElementById('leiInfrigida');
    if (leiInput) {
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
    }
    
    // Garantir que o sistema de status seja inicializado após o DOM
    setTimeout(function() {
        const especieSelect = document.getElementById('especie');
        const statusSelect = document.getElementById('status');
        
        if (especieSelect && statusSelect) {
            // Forçar inicialização do sistema de status
            statusSelect.disabled = true;
            especieSelect.addEventListener('change', updateStatusOptions);
        }
    }, 100);
});


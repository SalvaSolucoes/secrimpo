const { ipcRenderer } = require('electron');

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberUserCheckbox = document.getElementById('rememberUser');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

// Elementos da notificação de atualização
const updateNotification = document.getElementById('updateNotification');
const updateVersionSpan = document.getElementById('updateVersion');
const updateNowBtn = document.getElementById('updateNowBtn');
const updateLaterBtn = document.getElementById('updateLaterBtn');

// Variável para armazenar informações da atualização
let currentUpdateInfo = null;

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const rememberUser = rememberUserCheckbox.checked;
    
    if (!username || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Desabilitar botão
    setLoading(true);
    hideError();
    
    try {
        // Chamar autenticação via Python/KeyAuth
        const result = await ipcRenderer.invoke('authenticate', username, password);
        
        if (result && result.success) {
            // Salvar informações do usuário (se necessário)
            sessionStorage.setItem('username', username);
            if (result.userData) {
                sessionStorage.setItem('userData', JSON.stringify(result.userData));
            }
            
            // Salvar ou remover usuário do localStorage
            if (rememberUser) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            // Carregar dashboard
            ipcRenderer.send('load-dashboard');
        } else {
            // Exibir mensagem de erro categorizada
            setLoading(false);
            const errorMsg = result?.message || 'Falha na autenticação. Verifique suas credenciais.';
            showError(errorMsg);
        }
    } catch (error) {
        console.error('Erro na autenticação:', error);
        setLoading(false);
        // Se o erro for um objeto, tentar extrair a mensagem
        const errorMsg = error?.message || error?.toString() || 'Erro ao conectar com o servidor de autenticação.';
        showError(errorMsg);
    }
});

function setLoading(loading) {
    loginBtn.disabled = loading;
    const btnText = loginBtn.querySelector('.btn-text');
    const btnLoader = loginBtn.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Carregar usuário salvo ao iniciar
window.addEventListener('load', () => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    
    if (rememberedUser) {
        usernameInput.value = rememberedUser;
        rememberUserCheckbox.checked = true;
        passwordInput.focus(); // Focar na senha se usuário já está preenchido
    } else {
        usernameInput.value = '';
        passwordInput.value = '';
        rememberUserCheckbox.checked = false;
        usernameInput.focus();
    }

    // Verificar atualizações silenciosamente ao carregar a tela de login
    checkForUpdatesOnLogin();
});

// Verificar atualizações silenciosamente
async function checkForUpdatesOnLogin() {
    try {
        const result = await ipcRenderer.invoke('check-for-updates-silent');
        if (result.hasUpdate && result.updateInfo) {
            showUpdateNotification(result.updateInfo);
        }
    } catch (error) {
        console.log('Erro ao verificar atualizações:', error);
    }
}

// Mostrar notificação de atualização
function showUpdateNotification(updateInfo) {
    currentUpdateInfo = updateInfo;
    updateVersionSpan.textContent = updateInfo.latestVersion;
    updateNotification.style.display = 'block';
}

// Ocultar notificação de atualização
function hideUpdateNotification() {
    updateNotification.style.display = 'none';
    currentUpdateInfo = null;
}

// Event listeners para os botões da notificação
updateNowBtn.addEventListener('click', () => {
    if (currentUpdateInfo) {
        // Iniciar processo de atualização
        ipcRenderer.send('start-update', currentUpdateInfo);
        hideUpdateNotification();
    }
});

updateLaterBtn.addEventListener('click', () => {
    hideUpdateNotification();
});

// Escutar eventos de atualização do processo principal
ipcRenderer.on('update-available-silent', (event, updateInfo) => {
    showUpdateNotification(updateInfo);
});

ipcRenderer.on('update-downloading', () => {
    console.log('Download da atualização iniciado...');
    // Opcionalmente, você pode mostrar um indicador de progresso aqui
});

ipcRenderer.on('download-progress', (event, progress) => {
    console.log(`Progresso do download: ${progress}%`);
    // Opcionalmente, você pode atualizar um indicador de progresso aqui
});

ipcRenderer.on('update-downloaded', () => {
    console.log('Atualização baixada com sucesso!');
    // Opcionalmente, você pode mostrar uma notificação de sucesso aqui
});

ipcRenderer.on('update-error', (event, error) => {
    console.error('Erro na atualização:', error);
    // Opcionalmente, você pode mostrar uma mensagem de erro aqui
});

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const XLSX = require('xlsx');
const fs = require('fs');
const updater = require('./utils/updater');
const packageJson = require('../package.json');

// Configurar pastas de salvamento
const BASE_DIR = 'C:\\SECRIMPO';
const FOLDERS = {
  ocorrencias: path.join(BASE_DIR, 'Ocorrencias'),
  exportacoes: path.join(BASE_DIR, 'Exportacao'),
  exportacoesOcorrencias: path.join(BASE_DIR, 'Exportacao', 'Ocorrencias'),
  exportacoesTco: path.join(BASE_DIR, 'Exportacao', 'Tco'),
  termos: path.join(BASE_DIR, 'Termos'),
  png: path.join(BASE_DIR, 'PNG')
};

// Criar pastas se não existirem
function ensureFolders() {
  Object.values(FOLDERS).forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
}

// Formatar data para nome de arquivo [dd.mm.yyyy]
function formatDateForFilename() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

// .env não é mais necessário - credenciais estão hardcoded no auth_keyauth.exe
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Desabilitar aceleração de hardware para evitar erros de GPU
app.disableHardwareAcceleration();

// Suprimir avisos de GPU no console
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#071d49',
    icon: path.join(__dirname, '../assets/App_Logo.ico'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'views/login.html'));
  
  // Remove o menu completamente
  mainWindow.setMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Quando a janela carregar o dashboard, verificar atualizações novamente
  mainWindow.webContents.on('did-finish-load', () => {
    const url = mainWindow.webContents.getURL();
    if (url && url.includes('dashboard.html')) {
      // Aguardar um pouco para garantir que o dashboard está pronto
      setTimeout(() => {
        checkForUpdates();
      }, 2000);
    }
  });
}

app.whenReady().then(() => {
  ensureFolders();
  createWindow();
  
  // Verificar atualizações após um pequeno delay para não bloquear a inicialização
  setTimeout(() => {
    checkForUpdates();
  }, 3000); // 3 segundos após a aplicação abrir

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

/**
 * Verifica atualizações do GitHub
 */
async function checkForUpdates() {
  try {
    const currentVersion = packageJson.version;
    const updateInfo = await updater.checkForUpdate(currentVersion);
    
    if (updateInfo && updateInfo.available) {
      console.log('Atualização disponível:', updateInfo);
      // Enviar notificação para a janela principal quando estiver pronta
      sendUpdateNotification(updateInfo);
    } else {
      console.log('Aplicação está atualizada ou não há atualizações disponíveis.');
    }
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
  }
}

/**
 * Envia notificação de atualização para a janela
 */
function sendUpdateNotification(updateInfo) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Verificar se a janela está carregada
    if (mainWindow.webContents.isLoading()) {
      // Se ainda estiver carregando, aguardar
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', updateInfo);
          }
        }, 1000);
      });
    } else {
      // Se já estiver carregada, enviar imediatamente
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-available', updateInfo);
        }
      }, 1000);
    }
  } else {
    // Se a janela ainda não estiver pronta, aguardar
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
    }, 5000);
  }
}

// IPC Handler para verificar atualizações manualmente (sem restrição de tempo)
ipcMain.handle('check-updates-manual', async () => {
  try {
    const currentVersion = packageJson.version;
    // force = true para ignorar a restrição de 24 horas
    const updateInfo = await updater.checkForUpdate(currentVersion, true);
    return updateInfo;
  } catch (error) {
    console.error('Erro ao verificar atualizações manualmente:', error);
    return { error: error.message };
  }
});

// IPC Handler para abrir URL externa (download de atualização)
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Erro ao abrir URL:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler para baixar e instalar atualização automaticamente
ipcMain.handle('download-and-install-update', async (event, updateInfo) => {
  try {
    if (!updateInfo || !updateInfo.installerUrl || !updateInfo.installerName) {
      return { 
        success: false, 
        error: 'Informações de instalação não disponíveis. Por favor, baixe manualmente.' 
      };
    }

    // Enviar progresso para o renderer
    const sendProgress = (percent, downloaded, total, message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', {
          percent,
          downloaded,
          total,
          message
        });
      }
    };

    // Baixar e instalar
    await updater.downloadAndInstall(
      updateInfo.installerUrl,
      updateInfo.installerName,
      sendProgress
    );

    console.log('✓ Atualização baixada e instalação iniciada');
    
    // Aguardar um pouco antes de fechar a aplicação
    setTimeout(() => {
      app.quit();
    }, 2000);

    return { success: true };
  } catch (error) {
    console.error('Erro ao baixar e instalar atualização:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao baixar/instalar atualização' 
    };
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler para autenticação KeyAuth via Python
ipcMain.handle('authenticate', async (event, username, password) => {
  return new Promise((resolve, reject) => {
    // Verificar se está em produção (executável) ou desenvolvimento
    const isDev = !app.isPackaged;
    
    let authCommand;
    let authArgs;
    
    if (isDev) {
      // Desenvolvimento: usar Python script diretamente
      const pythonScript = path.join(__dirname, '../auth/auth_wrapper.py');
      authCommand = 'python';
      authArgs = [pythonScript, username, password];
    } else {
      // Produção: usar executável compilado
      authCommand = path.join(process.resourcesPath, 'auth/auth_keyauth.exe');
      authArgs = [username, password];
      
      // Verificar se o executável existe
      const fs = require('fs');
      if (!fs.existsSync(authCommand)) {
        // Tentar caminho alternativo
        const alternativePath = path.join(__dirname, '../auth/auth_keyauth.exe');
        
        if (fs.existsSync(alternativePath)) {
          authCommand = alternativePath;
        } else {
          resolve({
            success: false,
            errorCode: 93,
            errorType: 'EXECUTABLE_NOT_FOUND',
            message: 'Erro 93: Sistema de autenticação não encontrado. Reinstale o aplicativo.'
          });
          return;
        }
      }
    }
    
    const authProcess = spawn(authCommand, authArgs);

    let dataString = '';
    let errorString = '';

    authProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    authProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    authProcess.on('close', (code) => {
      
      if (code === 0 && dataString.trim()) {
        try {
          // Extract JSON from output (KeyAuth library prints messages before JSON)
          const lines = dataString.trim().split('\n');
          let jsonString = '';
          
          // Find the line that starts with { (JSON object)
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('{')) {
              jsonString = trimmedLine;
              break;
            }
          }
          
          if (!jsonString) {
            throw new Error('No JSON found in output');
          }
          
          const result = JSON.parse(jsonString);
          resolve(result);
        } catch (e) {
          resolve({ 
            success: false,
            errorCode: 92,
            errorType: 'PARSE_ERROR',
            message: 'Erro 92: Falha ao processar resposta do servidor'
          });
        }
      } else {
        // Tentar extrair JSON de erro do Python (stdout ou stderr)
        try {
          const outputToCheck = dataString.trim() || errorString.trim();
          const lines = outputToCheck.split('\n');
          let jsonString = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('{')) {
              jsonString = trimmedLine;
              break;
            }
          }
          
          if (jsonString) {
            const errorResult = JSON.parse(jsonString);
            resolve(errorResult);
            return;
          }
        } catch (e) {
          // Silencioso em produção
        }
        
        // Se não conseguiu extrair JSON, retornar erro genérico
        resolve({ 
          success: false,
          errorCode: 95,
          errorType: 'AUTH_ERROR',
          message: 'Erro 95: Falha na autenticação. Verifique suas credenciais.'
        });
      }
    });

    authProcess.on('error', (error) => {
      console.error('Auth spawn error:', error);
      resolve({ 
        success: false, 
        message: 'Erro ao executar autenticação: ' + error.message
      });
    });
  });
});

// IPC Handler para carregar painel principal
ipcMain.on('load-panel', () => {
  mainWindow.loadFile(path.join(__dirname, 'views/panel.html'));
});

// Função auxiliar para converter data ISO para formato brasileiro
function isoToBrDate(isoDate) {
  if (!isoDate) return '';
  
  // Se a data contém 'T' (timestamp), extrair apenas a parte da data
  let dateOnly = isoDate;
  if (isoDate.includes('T')) {
    dateOnly = isoDate.split('T')[0];
  }
  
  // Se a data contém 'Z' ou outros caracteres, limpar
  dateOnly = dateOnly.replace(/[TZ]/g, '');
  
  // Dividir por '-' para obter ano, mês, dia
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  
  // Se não conseguir processar, retornar a data original
  return isoDate;
}

// Função para normalizar capitalização de texto (primeira letra maiúscula, resto minúsculo)
function normalizeCapitalization(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Remover espaços extras no início e fim
  text = text.trim();
  
  // Se estiver vazio após trim, retornar vazio
  if (text.length === 0) return text;
  
  // Converter para minúsculo e depois primeira letra maiúscula
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Função para converter strings para maiúsculas
function toUpperCase(value) {
  if (!value || typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

// IPC Handler para salvar ocorrência
ipcMain.handle('save-occurrence', async (event, data) => {
  try {
    console.log('Dados da ocorrência:', JSON.stringify(data, null, 2));
    
    // Formato: [NumeroGenesis][dd.mm.yyyy]
    const dateStr = formatDateForFilename();
    const numeroGenesis = data.ocorrencia.numeroGenesis;
    
    // Salvar JSON (backup) em C:\SECRIMPO\Ocorrencias
    const jsonFilename = `[${numeroGenesis}][${dateStr}].json`;
    const jsonFilepath = path.join(FOLDERS.ocorrencias, jsonFilename);
    fs.writeFileSync(jsonFilepath, JSON.stringify(data, null, 2));
    
    console.log('✓ JSON salvo em:', jsonFilepath);
    
    // Enviar para Google Sheets (se configurado)
    const GOOGLE_SHEETS_URL = "Credencial Removida"; // Cole sua URL do Google Apps Script aqui
    
    if (GOOGLE_SHEETS_URL) {
      try {
        const https = require('https');
        const url = require('url');
        
        // Adicionar um pequeno delay para evitar "muitas solicitações"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Preparar dados para envio (formato array para Google Apps Script)
        // Envia apenas a linha de dados (sem cabeçalhos, pois já existem na planilha)
        // Converter todos os campos de texto para maiúsculas
        const sheetData = {
          values: [
            new Date().toLocaleString('pt-BR'),
            toUpperCase(data.ocorrencia.numeroGenesis),
            data.ocorrencia.unidade || '', // Select mantém valor original
            isoToBrDate(data.ocorrencia.dataApreensao),
            toUpperCase(data.ocorrencia.leiInfrigida || ''),
            toUpperCase(data.ocorrencia.artigo || ''),
            data.ocorrencia.status || '', // Select mantém valor original
            toUpperCase(data.ocorrencia.numeroPje || ''),
            data.itemApreendido.especie || '', // Select mantém valor original
            toUpperCase(data.itemApreendido.item || ''),
            toUpperCase(data.itemApreendido.quantidade || ''),
            toUpperCase(data.itemApreendido.descricao || ''),
            toUpperCase(data.proprietario.nome || ''),
            data.proprietario.tipoDocumento || '', // Select mantém valor original
            toUpperCase(data.proprietario.numeroDocumento || ''),
            toUpperCase(data.policial.nome || ''),
            toUpperCase(data.policial.matricula || ''),
            data.policial.graduacao || '', // Select mantém valor original
            toUpperCase(data.policial.unidade || ''),
            data.metadata.registradoPor || '' // Username mantém valor original
          ]
        };
        
        console.log('Enviando dados para Google Sheets:', JSON.stringify(sheetData, null, 2));
        const postData = JSON.stringify(sheetData);
        
        // Função recursiva para seguir redirecionamentos em POST
        const postWithRedirects = (targetUrl, payload, maxRedirects = 5) => {
          return new Promise((resolve, reject) => {
            if (maxRedirects === 0) {
              reject(new Error('Muitos redirecionamentos'));
              return;
            }
            
            const parsedUrl = url.parse(targetUrl);
            const options = {
              hostname: parsedUrl.hostname,
              path: parsedUrl.path,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            };
            
            const req = https.request(options, (res) => {
              // Seguir redirecionamentos
              if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
                const redirectUrl = res.headers.location;
                console.log(`Redirecionando POST para: ${redirectUrl}`);
                
                // Para redirecionamentos 307 e 308, manter POST
                // Para 301 e 302, usar GET (Google Apps Script geralmente redireciona para GET)
                if (res.statusCode === 307 || res.statusCode === 308) {
                  postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
                } else {
                  // Converter para GET (Google Apps Script faz isso)
                  https.get(redirectUrl, (getRes) => {
                    let responseData = '';
                    getRes.on('data', (chunk) => { responseData += chunk; });
                    getRes.on('end', () => {
                      resolve(responseData);
                    });
                  }).on('error', reject);
                }
                return;
              }
              
              let responseData = '';
              res.on('data', (chunk) => { responseData += chunk; });
              res.on('end', () => {
                resolve(responseData);
              });
            });
            
            req.on('error', reject);
            req.write(payload);
            req.end();
          });
        };
        
        try {
          const responseData = await postWithRedirects(GOOGLE_SHEETS_URL, postData);
          console.log('Resposta do Google Sheets (primeiros 500 caracteres):', responseData.substring(0, 500));
          
          // Verificar se a resposta é JSON válido
          try {
            const result = JSON.parse(responseData);
            if (result.success) {
              console.log('✓ Dados enviados com sucesso para Google Sheets');
            } else {
              console.warn('⚠ Resposta do Google Sheets indica falha:', result.message || result.error);
            }
          } catch (parseError) {
            // Se não for JSON, verificar se é erro de "muitas solicitações"
            if (responseData.includes('muitas solicitações') || responseData.includes('indisponível')) {
              console.warn('⚠ Google Sheets temporariamente indisponível (muitas solicitações). Os dados foram salvos localmente.');
              console.warn('   Tente novamente em alguns instantes ou verifique manualmente na planilha.');
            } else if (responseData.includes('success') || responseData.includes('<!DOCTYPE')) {
              // Pode ser uma página de sucesso do Google
              console.log('✓ Dados enviados para Google Sheets (resposta não-JSON, mas provavelmente sucesso)');
            } else {
              console.warn('⚠ Resposta inesperada do Google Sheets:', responseData.substring(0, 200));
            }
          }
        } catch (postError) {
          console.error('Erro ao enviar POST para Google Sheets:', postError.message);
          console.warn('⚠ Os dados foram salvos localmente, mas não foi possível enviar para o Google Sheets.');
          console.warn('   Verifique sua conexão com a internet e tente novamente.');
        }
        
        console.log('✓ Dados salvos localmente');
      } catch (sheetError) {
        console.error('Erro ao enviar para planilha:', sheetError);
        // Continua mesmo se falhar o envio para planilha
      }
    }
    
    return { 
      success: true, 
      message: 'Ocorrência registrada com sucesso!',
      jsonPath: jsonFilepath
    };
  } catch (error) {
    console.error('Erro ao salvar ocorrência:', error);
    return { 
      success: false, 
      message: 'Erro ao salvar ocorrência: ' + error.message 
    };
  }
});

// IPC Handler para logout
ipcMain.on('logout', () => {
  mainWindow.loadFile(path.join(__dirname, 'views/login.html'));
});

// IPC Handler para carregar dashboard
ipcMain.on('load-dashboard', () => {
  mainWindow.loadFile(path.join(__dirname, 'views/dashboard.html'));
});

// IPC Handler para obter todas as ocorrências do Google Sheets
ipcMain.handle('get-occurrences', async (event) => {
  try {
    const GOOGLE_SHEETS_URL = "Credencial Removida";
    
    if (!GOOGLE_SHEETS_URL) {
      console.log('Google Sheets URL não configurada, retornando dados locais');
      return { success: true, data: [] };
    }
    
    const https = require('https');
    const url = require('url');
    
    // Função recursiva para seguir redirecionamentos
    const followRedirects = (targetUrl, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
          reject(new Error('Muitos redirecionamentos'));
          return;
        }
        
        https.get(targetUrl, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            console.log(`Redirecionando para: ${redirectUrl}`);
            followRedirects(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        }).on('error', (error) => {
          reject(error);
        });
      });
    };
    
    return new Promise((resolve, reject) => {
      followRedirects(GOOGLE_SHEETS_URL)
        .then(responseData => {
          try {
            console.log('Resposta do Google Sheets (primeiros 500 caracteres):', responseData.substring(0, 500));
            
            // Verificar se a resposta é HTML (erro do Google)
            if (responseData.trim().startsWith('<!DOCTYPE') || responseData.trim().startsWith('<!doctype')) {
              // Verificar se é erro de "muitas solicitações"
              if (responseData.includes('muitas solicitações') || responseData.includes('Há muitas solicitações') || 
                  responseData.includes('too many requests') || responseData.includes('indisponível')) {
                console.warn('⚠ Google Sheets temporariamente indisponível (muitas solicitações)');
                console.warn('   Aguarde alguns instantes antes de tentar novamente.');
                return resolve({ 
                  success: false, 
                  message: 'Google Sheets temporariamente indisponível. Aguarde alguns instantes e tente novamente.',
                  data: [],
                  errorType: 'rate_limit'
                });
              }
              
              // Outro tipo de erro HTML
              console.warn('⚠ Google Sheets retornou HTML em vez de JSON');
              return resolve({ 
                success: false, 
                message: 'Erro ao carregar dados do Google Sheets. Tente novamente em alguns instantes.',
                data: [],
                errorType: 'html_response'
              });
            }
            
            const data = JSON.parse(responseData);
            console.log('Dados parseados com sucesso. Total de ocorrências:', data.occurrences?.length || 0);
            resolve({ success: true, data: data.occurrences || [] });
          } catch (err) {
            console.error('Erro ao parsear resposta:', err);
            console.error('Resposta recebida:', responseData.substring(0, 200));
            
            // Verificar se é erro de "muitas solicitações" mesmo no catch
            if (responseData.includes('muitas solicitações') || responseData.includes('Há muitas solicitações') || 
                responseData.includes('too many requests')) {
              return resolve({ 
                success: false, 
                message: 'Google Sheets temporariamente indisponível. Aguarde alguns instantes e tente novamente.',
                data: [],
                errorType: 'rate_limit'
              });
            }
            
            resolve({ 
              success: false, 
              message: 'Erro ao processar resposta do Google Sheets. Tente novamente.',
              data: [],
              errorType: 'parse_error'
            });
          }
        })
        .catch(error => {
          console.error('Erro ao carregar do Google Sheets:', error);
          resolve({ 
            success: false, 
            message: 'Erro ao conectar com Google Sheets: ' + error.message,
            data: [],
            errorType: 'connection_error'
          });
        });
    });
  } catch (error) {
    console.error('Erro ao obter ocorrências:', error);
    return { success: false, message: error.message, data: [] };
  }
});

// IPC Handler para atualizar ocorrência (APENAS Google Sheets)
ipcMain.handle('update-occurrence', async (event, data) => {
  console.log('Atualizando ocorrência:', data);
  
  try {
    const GOOGLE_SHEETS_URL = "Credencial Removida";
    
    if (!GOOGLE_SHEETS_URL) {
      return { success: false, message: 'Google Sheets URL não configurada' };
    }
    
    const https = require('https');
    const url = require('url');
    
    // Usar numeroGenesisOriginal para identificar a linha, se fornecido
    const numeroGenesisParaBusca = data.numeroGenesisOriginal || data.ocorrencia?.numeroGenesis;
    
    const updateData = {
      action: 'update',
      timestamp: new Date().toLocaleString('pt-BR'),
      numeroGenesisOriginal: numeroGenesisParaBusca, // Para identificar a linha
      numeroGenesis: data.ocorrencia?.numeroGenesis || '', // Novo valor (pode ser igual ao original)
      unidade: data.ocorrencia?.unidade || '',
      dataApreensao: data.ocorrencia?.dataApreensao ? isoToBrDate(data.ocorrencia.dataApreensao) : '',
      leiInfrigida: data.ocorrencia?.leiInfrigida || '',
      artigo: data.ocorrencia?.artigo || '',
      status: data.ocorrencia?.status || '',
      numeroPje: data.ocorrencia?.numeroPje || '',
      especie: data.itemApreendido?.especie || '', // Espécie mantém valor original (já vem em maiúsculas do select)
      item: data.itemApreendido?.item ? normalizeCapitalization(data.itemApreendido.item) : '',
      quantidade: data.itemApreendido?.quantidade || '',
      descricaoItem: data.itemApreendido?.descricao || '',
      nomeProprietario: data.proprietario?.nome || '',
      tipoDocumento: data.proprietario?.tipoDocumento || '',
      numeroDocumento: data.proprietario?.numeroDocumento || '',
      nomePolicial: data.policial?.nome || '',
      matricula: data.policial?.matricula || '',
      graduacao: data.policial?.graduacao || '',
      unidadePolicial: data.policial?.unidade || '',
      registradoPor: data.metadata?.registradoPor || 'Dashboard'
    };
    
    console.log('Enviando atualização para Google Sheets:', updateData);
    console.log('Número Genesis para busca:', numeroGenesisParaBusca);
    console.log('Número Genesis novo:', data.ocorrencia.numeroGenesis);
    
    const postData = JSON.stringify(updateData);
    
    // Função recursiva para seguir redirecionamentos em POST
    const postWithRedirects = (targetUrl, payload, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
          reject(new Error('Muitos redirecionamentos'));
          return;
        }
        
        const parsedUrl = url.parse(targetUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        
        const req = https.request(options, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            console.log(`Redirecionando POST para: ${redirectUrl}`);
            
            // Para redirecionamentos 307 e 308, manter POST
            // Para 301 e 302, usar GET
            if (res.statusCode === 307 || res.statusCode === 308) {
              postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
            } else {
              // Converter para GET
              https.get(redirectUrl, (getRes) => {
                let responseData = '';
                getRes.on('data', (chunk) => { responseData += chunk; });
                getRes.on('end', () => {
                  resolve(responseData);
                });
              }).on('error', reject);
            }
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        });
        
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    };
    
    return new Promise((resolve, reject) => {
      postWithRedirects(GOOGLE_SHEETS_URL, postData)
        .then(responseData => {
          console.log('✓ Resposta do Google Sheets:', responseData.substring(0, 500));
          
          // Verificar se é erro de "muitas solicitações"
          if (responseData.includes('muitas solicitações') || responseData.includes('indisponível') || responseData.trim().startsWith('<!DOCTYPE')) {
            console.warn('⚠ Google Sheets temporariamente indisponível (muitas solicitações)');
            // Retornar erro temporário, mas não crítico
            resolve({ 
              success: false, 
              message: 'Google Sheets temporariamente indisponível. Os dados foram atualizados localmente. Tente novamente em alguns instantes.',
              temporary: true 
            });
            return;
          }
          
          try {
            const result = JSON.parse(responseData);
            if (result.success) {
              resolve({ success: true, message: 'Ocorrência atualizada com sucesso' });
            } else {
              resolve({ success: false, message: result.message || 'Erro ao atualizar' });
            }
          } catch (err) {
            // Se não for JSON válido, mas não é erro de "muitas solicitações", considerar sucesso
            console.warn('⚠ Resposta não-JSON do Google Sheets, mas assumindo sucesso');
            resolve({ success: true, message: 'Ocorrência atualizada com sucesso' });
          }
        })
        .catch(error => {
          console.error('Erro ao atualizar no Google Sheets:', error);
          reject({ success: false, message: 'Erro ao atualizar: ' + error.message });
        });
    });
    
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para excluir ocorrência (APENAS Google Sheets)
ipcMain.handle('delete-occurrence', async (event, numeroGenesis) => {
  try {
    const GOOGLE_SHEETS_URL = "Credencial Removida";
    
    if (!GOOGLE_SHEETS_URL) {
      return { success: false, message: 'Google Sheets URL não configurada' };
    }
    
    if (!numeroGenesis) {
      return { success: false, message: 'Número Genesis não fornecido' };
    }
    
    const https = require('https');
    const url = require('url');
    
    const deleteData = {
      action: 'delete',
      numeroGenesis: numeroGenesis
    };
    
    console.log('Enviando exclusão para Google Sheets:', deleteData);
    
    const postData = JSON.stringify(deleteData);
    
    // Função recursiva para seguir redirecionamentos em POST
    const postWithRedirects = (targetUrl, payload, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
          reject(new Error('Muitos redirecionamentos'));
          return;
        }
        
        const parsedUrl = url.parse(targetUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        
        const req = https.request(options, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            console.log(`Redirecionando DELETE para: ${redirectUrl}`);
            
            // Para redirecionamentos 307 e 308, manter POST
            // Para 301 e 302, usar GET
            if (res.statusCode === 307 || res.statusCode === 308) {
              postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
            } else {
              // Converter para GET
              https.get(redirectUrl, (getRes) => {
                let responseData = '';
                getRes.on('data', (chunk) => { responseData += chunk; });
                getRes.on('end', () => {
                  resolve(responseData);
                });
              }).on('error', reject);
            }
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        });
        
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    };
    
    return new Promise((resolve, reject) => {
      postWithRedirects(GOOGLE_SHEETS_URL, postData)
        .then(responseData => {
          console.log('✓ Resposta do Google Sheets (delete):', responseData);
          try {
            const result = JSON.parse(responseData);
            if (result.success) {
              resolve({ success: true, message: 'Ocorrência excluída com sucesso' });
            } else {
              resolve({ success: false, message: result.message || 'Erro ao excluir' });
            }
          } catch (err) {
            // Se não for JSON, considerar sucesso se não houver erro
            resolve({ success: true, message: 'Ocorrência excluída com sucesso' });
          }
        })
        .catch(error => {
          console.error('Erro ao deletar no Google Sheets:', error);
          reject({ success: false, message: 'Erro ao excluir: ' + error.message });
        });
    });
    
  } catch (error) {
    console.error('Erro ao excluir ocorrência:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para excluir TCO (APENAS Google Sheets)
ipcMain.handle('delete-tco', async (event, rap) => {
  try {
    const GOOGLE_SHEETS_URL = "Credencial Removida";
    
    if (!GOOGLE_SHEETS_URL) {
      return { success: false, message: 'Google Sheets URL não configurada' };
    }
    
    if (!rap) {
      return { success: false, message: 'RAP não fornecido' };
    }
    
    const https = require('https');
    const url = require('url');
    
    const deleteData = {
      action: 'delete-tco',
      rap: rap
    };
    
    console.log('Enviando exclusão de TCO para Google Sheets:', deleteData);
    
    const postData = JSON.stringify(deleteData);
    
    // Função recursiva para seguir redirecionamentos em POST
    const postWithRedirects = (targetUrl, payload, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
          reject(new Error('Muitos redirecionamentos'));
          return;
        }
        
        const parsedUrl = url.parse(targetUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        
        const req = https.request(options, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            console.log(`Redirecionando DELETE TCO para: ${redirectUrl}`);
            
            if (res.statusCode === 307 || res.statusCode === 308) {
              postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
            } else {
              https.get(redirectUrl, (getRes) => {
                let responseData = '';
                getRes.on('data', (chunk) => { responseData += chunk; });
                getRes.on('end', () => {
                  resolve(responseData);
                });
              }).on('error', reject);
            }
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        });
        
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    };
    
    return new Promise((resolve, reject) => {
      postWithRedirects(GOOGLE_SHEETS_URL, postData)
        .then(responseData => {
          console.log('✓ Resposta do Google Sheets (exclusão TCO):', responseData.substring(0, 500));
          
          try {
            const result = JSON.parse(responseData);
            if (result.success) {
              resolve({ success: true, message: 'TCO excluído com sucesso' });
            } else {
              resolve({ success: false, message: result.message || 'Erro ao excluir TCO' });
            }
          } catch (err) {
            console.error('Erro ao parsear resposta de exclusão de TCO:', err);
            resolve({ success: false, message: 'Erro ao processar resposta do Google Sheets' });
          }
        })
        .catch(error => {
          console.error('Erro ao excluir TCO no Google Sheets:', error);
          reject({ success: false, message: 'Erro ao excluir TCO: ' + error.message });
        });
    });
    
  } catch (error) {
    console.error('Erro ao excluir TCO:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para exportar todas as ocorrências para Excel
ipcMain.handle('export-occurrences', async (event, occurrencesData) => {
  try {
    // Verificar se há dados para exportar
    if (!occurrencesData || occurrencesData.length === 0) {
      return { success: false, message: 'Nenhuma ocorrência encontrada' };
    }
    
    // Preparar dados para exportação (mesma ordem do Google Sheets)
    const worksheetData = [
      [
        'Log Registro',
        'Nº Genesis',
        'Unidade',
        'Data Apreensão',
        'Lei Infringida',
        'Artigo',
        'Status',
        'Espécie',
        'Item',
        'Quantidade',
        'Descrição',
        'Nome Proprietário',
        'Tipo Documento',
        'Nº Documento',
        'Nome Policial',
        'Matrícula',
        'Graduação',
        'Unidade Policial',
        'Registrado Por'
      ]
    ];
    
    occurrencesData.forEach(data => {
      try {
        worksheetData.push([
          new Date(data.metadata.dataRegistro).toLocaleString('pt-BR'),
          data.ocorrencia.numeroGenesis,
          data.ocorrencia.unidade,
          isoToBrDate(data.ocorrencia.dataApreensao),
          data.ocorrencia.leiInfrigida,
          data.ocorrencia.artigo,
          data.ocorrencia.status,
          normalizeCapitalization(data.itemApreendido.especie),
          normalizeCapitalization(data.itemApreendido.item),
          data.itemApreendido.quantidade,
          data.itemApreendido.descricao,
          data.proprietario.nome,
          data.proprietario.tipoDocumento,
          data.proprietario.numeroDocumento,
          data.policial.nome,
          data.policial.matricula,
          data.policial.graduacao,
          data.policial.unidade,
          data.metadata.registradoPor
        ]);
      } catch (err) {
        console.error('Erro ao processar ocorrência:', err);
      }
    });
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Função para calcular largura automática baseada no conteúdo
    const calculateColumnWidths = (data) => {
      const colWidths = [];
      
      // Para cada coluna
      for (let col = 0; col < data[0].length; col++) {
        let maxWidth = 0;
        
        // Verificar todas as linhas para encontrar o conteúdo mais longo
        for (let row = 0; row < data.length; row++) {
          const cellValue = data[row][col];
          const cellLength = cellValue ? String(cellValue).length : 0;
          maxWidth = Math.max(maxWidth, cellLength);
        }
        
        // Definir largura mínima de 10 e máxima de 50
        const width = Math.min(Math.max(maxWidth + 2, 10), 50);
        colWidths.push({ wch: width });
      }
      
      return colWidths;
    };
    
    // Ajustar largura das colunas automaticamente
    const columnWidths = calculateColumnWidths(worksheetData);
    worksheet['!cols'] = columnWidths;
    
    // Aplicar formatação a todas as células
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ c: col, r: row });
        
        if (!worksheet[cellAddress]) continue;
        
        // Formatação base para todas as células
        worksheet[cellAddress].s = {
          alignment: { horizontal: "center", vertical: "center" }
        };
        
        // Formatação especial para cabeçalho (primeira linha)
        if (row === 0) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E6E6FA" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Todas Ocorrências');
    
    // Salvar arquivo em C:\SECRIMPO\Exportacao\Ocorrencias
    const dateStr = formatDateForFilename();
    const exportFilename = `[EXPORTACAO][${dateStr}].xlsx`;
    const exportPath = path.join(FOLDERS.exportacoesOcorrencias, exportFilename);
    
    XLSX.writeFile(workbook, exportPath);
    console.log('✓ Exportação salva em:', exportPath);
    
    return { 
      success: true, 
      message: 'Exportação concluída com sucesso',
      filePath: exportPath
    };
  } catch (error) {
    console.error('Erro ao exportar ocorrências:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para gerar e visualizar Termo de Apreensão
ipcMain.handle('print-termo-apreensao', async (event, occurrenceData) => {
  try {
    const fs = require('fs');
    const os = require('os');
    
    // Criar janela temporária para gerar o PDF
    const tempWindow = new BrowserWindow({
      width: 800,
      height: 1000,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Carregar o template do termo de apreensão
    const templatePath = path.join(__dirname, 'templates/termo_apreensao.html');
    await tempWindow.loadFile(templatePath);

    // Injetar os dados da ocorrência no template
    await tempWindow.webContents.executeJavaScript(`
      window.occurrenceData = ${JSON.stringify(occurrenceData)};
      if (typeof populateForm === 'function') {
        populateForm(window.occurrenceData);
      }
    `);

    // Aguardar para garantir que os dados foram preenchidos
    await new Promise(resolve => setTimeout(resolve, 800));

    // Gerar PDF em C:\SECRIMPO\Termos
    const dateStr = formatDateForFilename();
    const numeroGenesis = occurrenceData.ocorrencia.numeroGenesis;
    const pdfFilename = `[${numeroGenesis}][${dateStr}].pdf`;
    const pdfPath = path.join(FOLDERS.termos, pdfFilename);

    const pdfData = await tempWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        marginType: 'none'
      },
      pageSize: 'A4',
      landscape: false,
      preferCSSPageSize: true
    });

    fs.writeFileSync(pdfPath, pdfData);
    console.log('PDF gerado:', pdfPath);

    // Fechar janela temporária
    tempWindow.close();

    // Criar janela de prévia do PDF
    const previewWindow = new BrowserWindow({
      width: 900,
      height: 1000,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        plugins: true
      },
      autoHideMenuBar: true,
      title: 'Termo de Apreensão - Prévia'
    });

    // Remover menu
    previewWindow.setMenu(null);

    // Carregar wrapper HTML que exibe o PDF
    const wrapperPath = path.join(__dirname, 'views/pdf_viewer_wrapper.html');
    await previewWindow.loadFile(wrapperPath);

    // Aguardar um pouco para garantir que a página carregou
    await new Promise(resolve => setTimeout(resolve, 300));

    // Serializar dados antes de enviar para evitar erro de clonagem
    let serializedOccurrenceData;
    try {
      serializedOccurrenceData = JSON.parse(JSON.stringify(occurrenceData));
    } catch (serializeError) {
      console.error('Erro ao serializar dados da ocorrência:', serializeError);
      // Criar objeto básico serializável como fallback
      serializedOccurrenceData = {
        ocorrencia: {
          numeroGenesis: occurrenceData?.ocorrencia?.numeroGenesis || '',
          unidade: occurrenceData?.ocorrencia?.unidade || '',
          dataApreensao: occurrenceData?.ocorrencia?.dataApreensao || '',
          leiInfrigida: occurrenceData?.ocorrencia?.leiInfrigida || '',
          artigo: occurrenceData?.ocorrencia?.artigo || '',
          status: occurrenceData?.ocorrencia?.status || '',
          numeroPje: occurrenceData?.ocorrencia?.numeroPje || ''
        },
        itemApreendido: {
          especie: occurrenceData?.itemApreendido?.especie || '',
          item: occurrenceData?.itemApreendido?.item || '',
          quantidade: occurrenceData?.itemApreendido?.quantidade || '',
          descricao: occurrenceData?.itemApreendido?.descricao || ''
        },
        proprietario: {
          nome: occurrenceData?.proprietario?.nome || '',
          tipoDocumento: occurrenceData?.proprietario?.tipoDocumento || '',
          numeroDocumento: occurrenceData?.proprietario?.numeroDocumento || ''
        },
        policial: {
          nome: occurrenceData?.policial?.nome || '',
          matricula: occurrenceData?.policial?.matricula || '',
          graduacao: occurrenceData?.policial?.graduacao || '',
          unidade: occurrenceData?.policial?.unidade || ''
        },
        metadata: {
          registradoPor: occurrenceData?.metadata?.registradoPor || '',
          dataRegistro: occurrenceData?.metadata?.dataRegistro || new Date().toISOString()
        }
      };
    }

    // Enviar dados da ocorrência e caminho do PDF para o wrapper
    previewWindow.webContents.send('pdf-data', {
      pdfPath: pdfPath,
      occurrenceData: serializedOccurrenceData
    });

    previewWindow.show();

    return { success: true, message: 'Prévia do documento gerada', pdfPath: pdfPath };
  } catch (error) {
    console.error('Erro ao gerar termo de apreensão:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para salvar termo de apreensão como PNG
ipcMain.handle('save-termo-as-png', async (event, occurrenceData) => {
  try {
    // Criar pasta PNG se não existir
    if (!fs.existsSync(FOLDERS.png)) {
      fs.mkdirSync(FOLDERS.png, { recursive: true });
    }

    // Extrair dados necessários
    const numeroGenesis = occurrenceData?.ocorrencia?.numeroGenesis || '';
    
    // Formatar nome padrão do arquivo
    const dateStr = formatDateForFilename();
    const defaultFilename = `[${numeroGenesis}][${dateStr}].png`;
    const defaultPath = path.join(FOLDERS.png, defaultFilename);

    // Abrir diálogo de salvamento
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar como PNG',
      defaultPath: defaultPath,
      filters: [
        { name: 'Imagens PNG', extensions: ['png'] }
      ],
      properties: ['showOverwriteConfirmation']
    });

    if (canceled || !filePath) {
      return { success: false, message: 'Operação cancelada pelo usuário' };
    }

    // Criar janela temporária para capturar o HTML como PNG
    // Tamanho A4 em pixels (96 DPI): 210mm x 297mm = 794px x 1123px
    const a4Width = 794;
    const a4Height = 1123;
    
    const captureWindow = new BrowserWindow({
      width: a4Width,
      height: a4Height,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Carregar o template do termo de apreensão
    const templatePath = path.join(__dirname, 'templates/termo_apreensao.html');
    await captureWindow.loadFile(templatePath);

    // Aguardar o DOM estar pronto e o listener IPC estar registrado
    try {
      await captureWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // Verificar se o listener IPC está registrado
            const checkListener = () => {
              if (window.ipcListenerReady) {
                resolve();
              } else {
                setTimeout(checkListener, 100);
              }
            };
            setTimeout(checkListener, 200);
          } else {
            const onReady = () => {
              const checkListener = () => {
                if (window.ipcListenerReady) {
                  resolve();
                } else {
                  setTimeout(checkListener, 100);
                }
              };
              setTimeout(checkListener, 200);
            };
            document.addEventListener('DOMContentLoaded', onReady);
            window.addEventListener('load', onReady);
          }
        });
      `);
    } catch (error) {
      console.warn('Aviso ao aguardar DOM:', error);
      // Fallback: aguardar um tempo fixo
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Serializar dados antes de enviar
    let serializedData;
    try {
      serializedData = JSON.parse(JSON.stringify(occurrenceData));
    } catch (serializeError) {
      console.error('Erro ao serializar dados para captura:', serializeError);
      // Usar dados básicos como fallback
      serializedData = {
        ocorrencia: {
          numeroGenesis: occurrenceData?.ocorrencia?.numeroGenesis || '',
          unidade: occurrenceData?.ocorrencia?.unidade || '',
          dataApreensao: occurrenceData?.ocorrencia?.dataApreensao || '',
          leiInfrigida: occurrenceData?.ocorrencia?.leiInfrigida || '',
          artigo: occurrenceData?.ocorrencia?.artigo || '',
          status: occurrenceData?.ocorrencia?.status || '',
          numeroPje: occurrenceData?.ocorrencia?.numeroPje || ''
        },
        itemApreendido: {
          especie: occurrenceData?.itemApreendido?.especie || '',
          item: occurrenceData?.itemApreendido?.item || '',
          quantidade: occurrenceData?.itemApreendido?.quantidade || '',
          descricao: occurrenceData?.itemApreendido?.descricao || ''
        },
        proprietario: {
          nome: occurrenceData?.proprietario?.nome || '',
          tipoDocumento: occurrenceData?.proprietario?.tipoDocumento || '',
          numeroDocumento: occurrenceData?.proprietario?.numeroDocumento || ''
        },
        policial: {
          nome: occurrenceData?.policial?.nome || '',
          matricula: occurrenceData?.policial?.matricula || '',
          graduacao: occurrenceData?.policial?.graduacao || '',
          unidade: occurrenceData?.policial?.unidade || ''
        },
        metadata: {
          registradoPor: occurrenceData?.metadata?.registradoPor || '',
          dataRegistro: occurrenceData?.metadata?.dataRegistro || new Date().toISOString()
        }
      };
    }

    // Enviar dados via IPC em vez de injetar via executeJavaScript
    console.log('Enviando dados via IPC. Tamanho do JSON:', JSON.stringify(serializedData).length);
    
    // Verificar se o listener está pronto
    let listenerReady = false;
    try {
      listenerReady = await captureWindow.webContents.executeJavaScript('window.ipcListenerReady === true');
    } catch (error) {
      console.warn('Não foi possível verificar se o listener está pronto:', error);
    }
    
    if (!listenerReady) {
      console.log('Listener não está pronto, aguardando...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Aguardar confirmação de que os dados foram preenchidos
    const populatePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('Timeout aguardando confirmação via IPC, tentando fallback...');
        // Fallback: tentar injetar diretamente
        captureWindow.webContents.executeJavaScript(`
          try {
            window.occurrenceData = ${JSON.stringify(serializedData)};
            if (typeof populateForm === 'function') {
              populateForm(window.occurrenceData);
            }
          } catch (e) {
            console.error('Erro no fallback:', e);
          }
        `).then(() => {
          console.log('Fallback executado com sucesso');
          resolve();
        }).catch((fallbackError) => {
          console.error('Erro no fallback:', fallbackError);
          reject(new Error('Timeout e fallback falharam'));
        });
      }, 3000);
      
      captureWindow.webContents.once('termo-data-populated', (event, success) => {
        clearTimeout(timeout);
        if (success) {
          console.log('Dados preenchidos com sucesso via IPC');
          resolve();
        } else {
          reject(new Error('Erro ao preencher formulário no renderer'));
        }
      });
    });
    
    // Enviar dados para o renderer via IPC
    captureWindow.webContents.send('populate-termo-data', serializedData);
    
    // Aguardar confirmação
    await populatePromise;

    // Aguardar para garantir que os dados foram preenchidos e renderizados
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ocultar a página 2 (etiqueta) e ajustar para capturar apenas a página 1 (termo)
    await captureWindow.webContents.executeJavaScript(`
      (function() {
        try {
          // Ocultar a página 2 (etiqueta)
          const labelPage = document.querySelector('.label-page');
          if (labelPage) {
            labelPage.style.display = 'none';
          }
          
          // Ajustar estilos para garantir que apenas a página 1 seja visível
          const style = document.createElement('style');
          style.textContent = 'body { overflow: hidden !important; height: 100vh !important; } .container { page-break-after: auto !important; height: 100% !important; } .label-page { display: none !important; }';
          document.head.appendChild(style);
        } catch (error) {
          console.error('Erro ao ajustar estilos:', error);
        }
      })();
    `);

    // Aguardar um pouco para o CSS ser aplicado
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Ajustar o tamanho da janela para A4 (já definido acima)
    captureWindow.setSize(a4Width, a4Height);
    
    // Aguardar um pouco para a janela redimensionar e o conteúdo renderizar
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capturar a página completa como imagem
    const image = await captureWindow.webContents.capturePage();
    
    // Converter NativeImage para PNG buffer
    const pngBuffer = image.toPNG();
    
    // Fechar janela temporária
    captureWindow.close();
    
    // Salvar arquivo
    fs.writeFileSync(filePath, pngBuffer);
    console.log('PNG salvo em:', filePath);

    return { 
      success: true, 
      message: 'PNG salvo com sucesso!',
      filePath: filePath
    };
  } catch (error) {
    console.error('Erro ao salvar PNG:', error);
    return { 
      success: false, 
      message: 'Erro ao salvar PNG: ' + error.message 
    };
  }
});

// IPC Handler para imprimir PDF
ipcMain.handle('print-pdf', async (event, pdfPath) => {
  try {
    const fs = require('fs');
    
    if (!fs.existsSync(pdfPath)) {
      return { success: false, message: 'Arquivo PDF não encontrado' };
    }

    // Criar janela para impressão
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Carregar o PDF
    await printWindow.loadFile(pdfPath);

    // Aguardar carregamento
    await new Promise(resolve => setTimeout(resolve, 500));

    // Abrir diálogo de impressão
    printWindow.webContents.print({
      silent: false,
      printBackground: true
    }, (success, errorType) => {
      if (!success) {
        console.error('Erro ao imprimir:', errorType);
      }
      printWindow.close();
    });

    return { success: true, message: 'Documento enviado para impressão' };
  } catch (error) {
    console.error('Erro ao imprimir PDF:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para extrair dados de arquivo
ipcMain.handle('extract-file-data', async (event, filePath) => {
  try {
    console.log('=== INICIANDO EXTRAÇÃO DE ARQUIVO ===');
    console.log('Arquivo:', filePath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error('Arquivo não encontrado: ' + filePath);
    }
    
    const fileExtractor = require('./scripts/fileExtractor');
    console.log('Módulo fileExtractor carregado com sucesso');
    
    // Extrair texto do arquivo
    console.log('Iniciando extração de texto...');
    const text = await fileExtractor.extractTextFromFile(filePath);
    console.log('Texto extraído com sucesso!');
    console.log('Tamanho do texto:', text.length, 'caracteres');
    console.log('Primeiros 500 caracteres:', text.substring(0, 500));
    
    // Extrair campos específicos do texto
    console.log('Extraindo campos específicos...');
    const extractedFields = fileExtractor.extractFieldsFromText(text);
    console.log('Campos extraídos:', JSON.stringify(extractedFields, null, 2));
    
    // Mapear para o formato do formulário
    console.log('Mapeando dados para o formulário...');
    const formData = fileExtractor.mapFieldsToForm(extractedFields);
    console.log('Dados mapeados:', JSON.stringify(formData, null, 2));
    
    console.log('=== EXTRAÇÃO CONCLUÍDA COM SUCESSO ===');
    
    return { 
      success: true, 
      data: formData,
      message: 'Dados extraídos com sucesso'
    };
  } catch (error) {
    console.error('=== ERRO NA EXTRAÇÃO ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return { 
      success: false, 
      message: error.message || 'Erro ao processar arquivo'
    };
  }
});

// IPC Handler para obter contagem de usuários ativos do KeyAuth
ipcMain.handle('get-active-users-count', async (event) => {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;
    
    let pythonCommand;
    let pythonArgs;
    
    if (isDev) {
      // Desenvolvimento: usar Python script diretamente
      const pythonScript = path.join(__dirname, '../auth/get_online_users.py');
      pythonCommand = 'python';
      pythonArgs = [pythonScript];
    } else {
      // Produção: usar executável compilado (se existir)
      const exePath = path.join(process.resourcesPath, 'auth/get_online_users.exe');
      
      if (fs.existsSync(exePath)) {
        pythonCommand = exePath;
        pythonArgs = [];
      } else {
        // Fallback: tentar Python script
        const pythonScript = path.join(__dirname, '../auth/get_online_users.py');
        pythonCommand = 'python';
        pythonArgs = [pythonScript];
      }
    }
    
    const pythonProcess = spawn(pythonCommand, pythonArgs);
    
    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      try {
        // Extrair JSON da saída
        const lines = dataString.trim().split('\n');
        let jsonString = '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('{')) {
            jsonString = trimmedLine;
            break;
          }
        }
        
        if (jsonString) {
          const result = JSON.parse(jsonString);
          if (result.success) {
            resolve(result.count);
          } else {
            console.error('Erro ao buscar usuários online:', result.error);
            resolve(1); // Fallback: 1 usuário
          }
        } else {
          console.error('Nenhum JSON encontrado na resposta');
          resolve(1); // Fallback: 1 usuário
        }
      } catch (e) {
        console.error('Erro ao parsear resposta de usuários online:', e);
        resolve(1); // Fallback: 1 usuário
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Erro ao executar script de usuários online:', error);
      resolve(1); // Fallback: 1 usuário
    });
  });
});

// IPC Handler para obter TCOs do Google Sheets (Página 2)
ipcMain.handle('get-tcos', async (event) => {
  try {
    const GOOGLE_SHEETS_URL = "Credencial Removida";
    
    if (!GOOGLE_SHEETS_URL) {
      console.log('Google Sheets URL não configurada');
      return { success: false, tcos: [] };
    }
    
    const https = require('https');
    const url = require('url');
    
    // Adicionar parâmetro type=tco para buscar TCOs
    const tcoUrl = GOOGLE_SHEETS_URL + '?type=tco';
    
    // Função para seguir redirecionamentos
    const getWithRedirects = (targetUrl, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects === 0) {
          reject(new Error('Muitos redirecionamentos'));
          return;
        }
        
        const parsedUrl = url.parse(targetUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        };
        
        const req = https.request(options, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            console.log('Redirecionando TCO para:', redirectUrl);
            getWithRedirects(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve(data);
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.end();
      });
    };
    
    const data = await getWithRedirects(tcoUrl);
    
    try {
      const response = JSON.parse(data);
      console.log('TCOs recebidos:', response);
      return response;
    } catch (error) {
      console.error('Erro ao parsear resposta de TCOs:', error);
      console.error('Resposta recebida:', data.substring(0, 200));
      return { success: false, tcos: [] };
    }
    
  } catch (error) {
    console.error('Erro ao obter TCOs:', error);
    return { success: false, tcos: [] };
  }
});

// IPC Handler para enviar solicitação de suporte para Discord
ipcMain.handle('send-support-request', async (event, formData) => {
  try {
    // URL do webhook do Discord
    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'Credencial Removida';
    
    if (!DISCORD_WEBHOOK_URL) {
      console.warn('⚠ Discord webhook URL não configurada');
      return { 
        success: false, 
        message: 'Webhook do Discord não configurado. Entre em contato com o administrador.' 
      };
    }
    
    const https = require('https');
    const url = require('url');
    
    // Formatar data e hora
    const now = new Date();
    const dataFormatada = now.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const horaFormatada = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Truncar descrição se muito longa (limite do Discord é 1024 caracteres por field)
    const descricaoFormatada = formData.descricao && formData.descricao.length > 1000 
      ? formData.descricao.substring(0, 997) + '...' 
      : (formData.descricao || 'Não informado');
    
    // Determinar cor baseada na prioridade
    let embedColor = 0x071d49; // Cor padrão (azul escura)
    if (formData.prioridade === 'Urgente') {
      embedColor = 0xff0000; // Vermelho
    } else if (formData.prioridade === 'Alta') {
      embedColor = 0xff6600; // Laranja
    } else if (formData.prioridade === 'Média') {
      embedColor = 0xffaa00; // Amarelo
    } else if (formData.prioridade === 'Baixa') {
      embedColor = 0x00ff00; // Verde
    }
    
    // Criar embed do Discord simplificado e organizado
    const embed = {
      title: 'Nova Solicitação de Suporte',
      color: embedColor,
      fields: [
        {
          name: 'Solicitante',
          value: `\`\`\`\n${formData.nome || 'Não informado'}\n\`\`\``,
          inline: false
        },
        {
          name: 'Unidade',
          value: `\`\`\`\n${formData.unidade || 'Não informado'}\n\`\`\``,
          inline: false
        },
        {
          name: 'Prioridade',
          value: `\`\`\`\n${formData.prioridade || 'Não informado'}\n\`\`\``,
          inline: false
        },
        {
          name: 'Problema',
          value: `\`\`\`\n${formData.problema || 'Não informado'}\n\`\`\``,
          inline: false
        },
        {
          name: 'Descrição',
          value: `\`\`\`\n${descricaoFormatada}\n\`\`\``,
          inline: false
        },
        {
          name: 'Data e Hora',
          value: `\`\`\`\n${dataFormatada} às ${horaFormatada}\n\`\`\``,
          inline: false
        }
      ],
      timestamp: now.toISOString(),
      footer: {
        text: 'SECRIMPO SUPORTE'
      }
    };
    
    const payload = {
      content: '@everyone',
      embeds: [embed]
    };
    
    const postData = JSON.stringify(payload);
    
    // Função para enviar POST para Discord
    const sendToDiscord = (webhookUrl, payload) => {
      return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(webhookUrl);
        
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };
        
        const req = https.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, response: responseData });
            } else {
              reject(new Error(`Discord API retornou status ${res.statusCode}: ${responseData}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(payload);
        req.end();
      });
    };
    
    try {
      await sendToDiscord(DISCORD_WEBHOOK_URL, postData);
      console.log('✓ Solicitação de suporte enviada para Discord');
      return { 
        success: true, 
        message: 'Solicitação de suporte enviada com sucesso!' 
      };
    } catch (error) {
      console.error('Erro ao enviar para Discord:', error);
      return { 
        success: false, 
        message: 'Erro ao enviar para Discord: ' + error.message 
      };
    }
  } catch (error) {
    console.error('Erro ao processar solicitação de suporte:', error);
    return { 
      success: false, 
      message: 'Erro ao processar solicitação: ' + error.message 
    };
  }
});

// IPC Handler para exportar TCOs para Excel
ipcMain.handle('export-tcos', async (event, tcoData) => {
  try {
    // Verificar se há dados para exportar
    if (!tcoData || tcoData.length === 0) {
      return { success: false, message: 'Nenhum TCO encontrado' };
    }
    
    // Preparar dados para exportação
    const worksheetData = [
      [
        'RAP (GÊNESIS)',
        'Envolvido',
        'Ilícito',
        'Item'
      ]
    ];
    
    tcoData.forEach(tco => {
      worksheetData.push([
        tco.rap || '',
        tco.envolvido || '',
        tco.ilicito || '',
        tco.item || ''
      ]);
    });
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Ajustar largura das colunas
    const columnWidths = [
      { wch: 20 }, // RAP
      { wch: 30 }, // Envolvido
      { wch: 30 }, // Ilícito
      { wch: 30 }  // Item
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TCOs');
    
    // Salvar arquivo em C:\SECRIMPO\Exportacao\Tco
    const dateStr = formatDateForFilename();
    const exportFilename = `[EXPORTACAO][${dateStr}].xlsx`;
    const exportPath = path.join(FOLDERS.exportacoesTco, exportFilename);
    
    XLSX.writeFile(workbook, exportPath);
    console.log('✓ Exportação de TCOs salva em:', exportPath);
    
    return { 
      success: true, 
      message: 'Exportação de TCOs concluída com sucesso',
      filePath: exportPath
    };
  } catch (error) {
    console.error('Erro ao exportar TCOs:', error);
    return { 
      success: false, 
      message: 'Erro ao exportar TCOs: ' + error.message 
    };
  }
});

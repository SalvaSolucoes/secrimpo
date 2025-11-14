const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const XLSX = require('xlsx');
const fs = require('fs');

// Configurar variáveis de ambiente para UTF-8 no Windows
if (process.platform === 'win32') {
  process.env.PYTHONIOENCODING = 'utf-8';
  process.env.LANG = 'pt_BR.UTF-8';
}

// Função para logs organizados
function logInfo(message) {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${timestamp}] ${message}`);
}

function logError(message, error = null) {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  console.error(`[${timestamp}] ${message}${error ? ': ' + error : ''}`);
}

// Banner de inicialização
function showStartupBanner() {
  console.clear();
  console.log('='.repeat(60));
  console.log('              SECRIMPO PMDF - SISTEMA INICIADO');
  console.log('='.repeat(60));
  logInfo('Inicializando aplicacao...');
}

// Sistema de atualizações
const AutoUpdater = require('./updater/updater');

// Configurar pastas de salvamento
const BASE_DIR = 'C:\\SECRIMPO';
const FOLDERS = {
  ocorrencias: path.join(BASE_DIR, 'Ocorrencias'),
  exportacoes: path.join(BASE_DIR, 'Exportacao'),
  exportacoesOcorrencias: path.join(BASE_DIR, 'Exportacao', 'Ocorrencias'),
  exportacoesTco: path.join(BASE_DIR, 'Exportacao', 'Tco'),
  termos: path.join(BASE_DIR, 'Termos')
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
let updater;

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
}

app.whenReady().then(() => {
  showStartupBanner();
  ensureFolders();
  createWindow();
  
  // Inicializar sistema de atualizações
  initializeUpdater();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA"; // URL do Google Apps Script
    
    if (GOOGLE_SHEETS_URL) {
      try {
        const https = require('https');
        const url = require('url');
        
        // Preparar dados para envio (formato array para Google Apps Script)
        // Envia apenas a linha de dados (sem cabeçalhos, pois já existem na planilha)
        const sheetData = {
          values: [
            new Date().toLocaleString('pt-BR'),
            data.ocorrencia.numeroGenesis,
            data.ocorrencia.unidade,
            isoToBrDate(data.ocorrencia.dataApreensao),
            data.ocorrencia.leiInfrigida,
            data.ocorrencia.artigo,
            data.ocorrencia.status,
            data.ocorrencia.numeroPje || '-',
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
          ]
        };
        
        // Preparar dados TCO - TODAS as ocorrências vão para TCO
        const tcoData = {
          action: 'add_tco',
          rap: data.ocorrencia.numeroGenesis, // RAP = GENESIS
          envolvido: data.proprietario.nome, // ENVOLVIDO = Nome do proprietário
          ilicito: normalizeCapitalization(data.itemApreendido.especie), // ILÍCITO = Espécie
          dataRegistro: new Date().toLocaleString('pt-BR'),
          // Dados adicionais para referência
          unidade: data.ocorrencia.unidade,
          dataApreensao: isoToBrDate(data.ocorrencia.dataApreensao),
          item: normalizeCapitalization(data.itemApreendido.item),
          quantidade: data.itemApreendido.quantidade,
          policial: data.policial.nome,
          matricula: data.policial.matricula
        };
        
        const postData = JSON.stringify(sheetData);
        const parsedUrl = url.parse(GOOGLE_SHEETS_URL);
        
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
        
        await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            // Seguir redirecionamentos (302, 301, 307)
            if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307) {
              const redirectUrl = res.headers.location;
              console.log('Seguindo redirecionamento para Google Sheets...');
              
              https.get(redirectUrl, (redirectRes) => {
                let responseData = '';
                redirectRes.on('data', (chunk) => { responseData += chunk; });
                redirectRes.on('end', () => {
                  console.log('Dados enviados para Google Sheets:', responseData);
                  resolve();
                });
              }).on('error', (error) => {
                console.error('Erro no redirect para Google Sheets:', error);
                reject(error);
              });
              
              return;
            }
            
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
              console.log('Dados enviados para Google Sheets:', responseData);
              resolve();
            });
          });
          
          req.on('error', (error) => {
            console.error('Erro ao enviar para Google Sheets:', error);
            reject(error);
          });
          
          req.write(postData);
          req.end();
        });
        
        // Enviar dados TCO para planilha
        const tcoPostData = JSON.stringify(tcoData);
        
        await new Promise((resolve, reject) => {
          const tcoReq = https.request(options, (res) => {
            // Seguir redirecionamentos (302, 301, 307)
            if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307) {
              const redirectUrl = res.headers.location;
              console.log('Seguindo redirecionamento TCO para Google Sheets...');
              
              https.get(redirectUrl, (redirectRes) => {
                let responseData = '';
                redirectRes.on('data', (chunk) => { responseData += chunk; });
                redirectRes.on('end', () => {
                  console.log('Dados TCO enviados para Google Sheets:', responseData);
                  resolve();
                });
              }).on('error', (error) => {
                console.error('Erro no redirect TCO para Google Sheets:', error);
                reject(error);
              });
              
              return;
            }
            
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
              console.log('Dados TCO enviados para Google Sheets:', responseData);
              resolve();
            });
          });
          
          tcoReq.on('error', (error) => {
            console.error('Erro ao enviar TCO para Google Sheets:', error);
            reject(error);
          });
          
          tcoReq.write(tcoPostData);
          tcoReq.end();
        });
        
        console.log('✓ Dados de Ocorrência e TCO enviados para planilha online');
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
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
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
            logInfo('[SHEETS] Redirecionamento para Google Sheets');
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
            logInfo('[SHEETS] Dados recebidos com sucesso');
            const data = JSON.parse(responseData);
            logInfo(`[SHEETS] ${data.occurrences?.length || 0} ocorrencias carregadas`);
            resolve({ success: true, data: data.occurrences || [] });
          } catch (err) {
            console.error('Erro ao parsear resposta:', err);
            console.error('Resposta recebida:', responseData.substring(0, 200));
            resolve({ success: true, data: [] });
          }
        })
        .catch(error => {
          console.error('Erro ao carregar do Google Sheets:', error);
          resolve({ success: true, data: [] });
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
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
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
      numeroPje: data.ocorrencia?.numeroPje || '-',
      especie: data.itemApreendido?.especie ? normalizeCapitalization(data.itemApreendido.especie) : '',
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
          logInfo('[SHEETS] Ocorrencia salva com sucesso');
          try {
            const result = JSON.parse(responseData);
            if (result.success) {
              resolve({ success: true, message: 'Ocorrência atualizada com sucesso' });
            } else {
              resolve({ success: false, message: result.message || 'Erro ao atualizar' });
            }
          } catch (err) {
            // Se não for JSON, considerar sucesso se não houver erro
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

// IPC Handler para obter TCOs do Google Sheets
ipcMain.handle('get-tcos', async (event) => {
  try {
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
    if (!GOOGLE_SHEETS_URL) {
      console.log('Google Sheets URL não configurada para TCOs');
      return { success: true, tcos: [] };
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
        
        // Adicionar parâmetro para indicar que queremos TCOs
        const urlWithParam = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=get_tcos';
        
        https.get(urlWithParam, (res) => {
          // Seguir redirecionamentos
          if (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307 || res.statusCode === 308) {
            const redirectUrl = res.headers.location;
            logInfo('[TCO] Redirecionamento para Google Sheets');
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
            logInfo('[TCO] Dados recebidos com sucesso');
            const data = JSON.parse(responseData);
            logInfo(`[TCO] ${data.tcos?.length || 0} TCOs carregados`);
            resolve({ success: true, tcos: data.tcos || [] });
          } catch (err) {
            console.error('Erro ao parsear resposta TCO:', err);
            console.error('Resposta recebida:', responseData.substring(0, 200));
            resolve({ success: true, tcos: [] });
          }
        })
        .catch(error => {
          console.error('Erro ao carregar TCOs do Google Sheets:', error);
          resolve({ success: true, tcos: [] });
        });
    });
  } catch (error) {
    console.error('Erro ao obter TCOs:', error);
    return { success: false, message: error.message, tcos: [] };
  }
});

// IPC Handler para exportar TCOs para Excel
ipcMain.handle('export-tcos', async (event, tcosData) => {
  try {
    console.log('Exportação de TCOs iniciada com', tcosData?.length || 0, 'registros');
    
    // Verificar se há dados para exportar
    if (!tcosData || tcosData.length === 0) {
      return { success: false, message: 'Nenhum TCO encontrado' };
    }
    
    // Preparar dados para exportação
    const worksheetData = [
      [
        'Data Registro',
        'RAP (GÊNESIS)',
        'Envolvido',
        'Ilícito',
        'Unidade',
        'Data Apreensão',
        'Item',
        'Quantidade',
        'Policial',
        'Matrícula'
      ]
    ];
    
    tcosData.forEach((tco, index) => {
      try {
        worksheetData.push([
          tco.dataRegistro || '',
          tco.rap || '',
          tco.envolvido || '',
          tco.ilicito || '',
          tco.unidade || '',
          tco.dataApreensao || '',
          tco.item || '',
          tco.quantidade || '',
          tco.policial || '',
          tco.matricula || ''
        ]);
      } catch (err) {
        console.error(`Erro ao processar TCO ${index}:`, err, tco);
      }
    });
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Aplicar larguras automáticas
    const colWidths = [];
    for (let col = 0; col < worksheetData[0].length; col++) {
      let maxWidth = 0;
      for (let row = 0; row < worksheetData.length; row++) {
        const cellValue = worksheetData[row][col];
        if (cellValue) {
          const cellLength = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      colWidths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) });
    }
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TCOs');
    
    // Gerar nome do arquivo
    const dateStr = formatDateForFilename();
    const filename = `[EXPORTAÇÃO][${dateStr}].xlsx`;
    const filepath = path.join(FOLDERS.exportacoesTco, filename);
    
    // Salvar arquivo
    XLSX.writeFile(workbook, filepath);
    
    console.log('✓ Arquivo Excel de TCOs criado:', filepath);
    
    return {
      success: true,
      message: `TCOs exportados com sucesso! Total: ${tcosData.length} registros`,
      filePath: filepath,
      recordCount: tcosData.length
    };
    
  } catch (error) {
    console.error('Erro ao exportar TCOs:', error);
    return {
      success: false,
      message: 'Erro ao exportar TCOs: ' + error.message
    };
  }
});

// IPC Handler para excluir ocorrência (APENAS Google Sheets)
ipcMain.handle('delete-occurrence', async (event, numeroGenesis) => {
  try {
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
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
          logInfo('[SHEETS] Ocorrencia excluida com sucesso');
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

// IPC Handler para atualizar TCO
ipcMain.handle('update-tco', async (event, tcoData) => {
  try {
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
    if (!GOOGLE_SHEETS_URL) {
      return { success: false, message: 'Google Sheets URL não configurada' };
    }
    
    if (!tcoData || !tcoData.rap) {
      return { success: false, message: 'Dados do TCO não fornecidos' };
    }
    
    const https = require('https');
    const url = require('url');
    
    const updateData = {
      action: 'update_tco',
      ...tcoData
    };
    
    console.log('Enviando atualização de TCO para Google Sheets:', updateData);
    
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
            console.log('[TCO Update] Redirecionamento para:', redirectUrl);
            postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(payload);
        req.end();
      });
    };
    
    return new Promise((resolve, reject) => {
      postWithRedirects(GOOGLE_SHEETS_URL, postData)
        .then(responseData => {
          try {
            console.log('[TCO Update] Resposta recebida:', responseData);
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (err) {
            console.error('Erro ao parsear resposta de atualização TCO:', err);
            resolve({ success: true, message: 'TCO atualizado com sucesso' });
          }
        })
        .catch(error => {
          console.error('Erro ao atualizar TCO:', error);
          reject({ success: false, message: 'Erro ao atualizar: ' + error.message });
        });
    });
    
  } catch (error) {
    console.error('Erro ao atualizar TCO:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para excluir TCO
ipcMain.handle('delete-tco', async (event, rap) => {
  try {
    const GOOGLE_SHEETS_URL = "CREDENCIAL_REMOVIDA";
    
    if (!GOOGLE_SHEETS_URL) {
      return { success: false, message: 'Google Sheets URL não configurada' };
    }
    
    if (!rap) {
      return { success: false, message: 'RAP não fornecido' };
    }
    
    const https = require('https');
    const url = require('url');
    
    const deleteData = {
      action: 'delete_tco',
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
            console.log('[TCO Delete] Redirecionamento para:', redirectUrl);
            postWithRedirects(redirectUrl, payload, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve(responseData);
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(payload);
        req.end();
      });
    };
    
    return new Promise((resolve, reject) => {
      postWithRedirects(GOOGLE_SHEETS_URL, postData)
        .then(responseData => {
          try {
            console.log('[TCO Delete] Resposta recebida:', responseData);
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (err) {
            console.error('Erro ao parsear resposta de exclusão TCO:', err);
            resolve({ success: true, message: 'TCO excluído com sucesso' });
          }
        })
        .catch(error => {
          console.error('Erro ao excluir TCO:', error);
          reject({ success: false, message: 'Erro ao excluir: ' + error.message });
        });
    });
    
  } catch (error) {
    console.error('Erro ao excluir TCO:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para imprimir documento de TCO
ipcMain.handle('print-tco-document', async (event, tcoData) => {
  try {
    console.log('Gerando documento TCO para:', tcoData.rap);
    
    // Por enquanto, apenas simular a geração do documento
    // Futuramente pode ser implementado um template específico para TCO
    console.log('Funcionalidade de impressão de TCO em desenvolvimento.');
    
    return { success: false, message: 'Funcionalidade de impressão de TCO em desenvolvimento.' };
    
  } catch (error) {
    console.error('Erro ao gerar documento TCO:', error);
    return { success: false, message: error.message };
  }
});

// IPC Handler para exportar todas as ocorrências para Excel
ipcMain.handle('export-occurrences', async (event, occurrencesData) => {
  try {
    console.log('Exportação iniciada com', occurrencesData?.length || 0, 'ocorrências');
    
    // Verificar se há dados para exportar
    if (!occurrencesData || occurrencesData.length === 0) {
      return { success: false, message: 'Nenhuma ocorrência encontrada' };
    }
    
    // Log da estrutura da primeira ocorrência para debug
    if (occurrencesData.length > 0) {
      console.log('Estrutura da primeira ocorrência para exportação:', JSON.stringify(occurrencesData[0], null, 2));
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
        'Nº PJE',
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
    
    occurrencesData.forEach((data, index) => {
      try {
        // Função auxiliar para extrair dados de forma robusta
        const safeGet = (obj, path, defaultValue = '') => {
          try {
            return path.split('.').reduce((current, key) => current?.[key], obj) || defaultValue;
          } catch {
            return defaultValue;
          }
        };
        
        // Extrair dados com fallbacks para diferentes estruturas
        const logRegistro = safeGet(data, 'metadata.dataRegistro') || 
                           safeGet(data, 'dataRegistro') || 
                           new Date().toISOString();
        
        const numeroGenesis = safeGet(data, 'ocorrencia.numeroGenesis') || 
                             safeGet(data, 'numeroGenesis') || 
                             safeGet(data, 'Nº Genesis') || '';
        
        const unidade = safeGet(data, 'ocorrencia.unidade') || 
                       safeGet(data, 'unidade') || 
                       safeGet(data, 'Unidade') || '';
        
        const dataApreensao = safeGet(data, 'ocorrencia.dataApreensao') || 
                             safeGet(data, 'dataApreensao') || 
                             safeGet(data, 'Data Apreensão') || '';
        
        const leiInfrigida = safeGet(data, 'ocorrencia.leiInfrigida') || 
                            safeGet(data, 'leiInfrigida') || 
                            safeGet(data, 'Lei Infringida') || '';
        
        const artigo = safeGet(data, 'ocorrencia.artigo') || 
                      safeGet(data, 'artigo') || 
                      safeGet(data, 'Artigo') || '';
        
        const status = safeGet(data, 'ocorrencia.status') || 
                      safeGet(data, 'status') || 
                      safeGet(data, 'Status') || '';
        
        const numeroPje = safeGet(data, 'ocorrencia.numeroPje') || 
                         safeGet(data, 'numeroPje') || 
                         safeGet(data, 'Nº PJE') || '-';
        
        const especie = safeGet(data, 'itemApreendido.especie') || 
                       safeGet(data, 'especie') || 
                       safeGet(data, 'Espécie') || '';
        
        const item = safeGet(data, 'itemApreendido.item') || 
                    safeGet(data, 'item') || 
                    safeGet(data, 'Item') || '';
        
        const quantidade = safeGet(data, 'itemApreendido.quantidade') || 
                          safeGet(data, 'quantidade') || 
                          safeGet(data, 'Quantidade') || '';
        
        const descricao = safeGet(data, 'itemApreendido.descricao') || 
                         safeGet(data, 'descricao') || 
                         safeGet(data, 'Descrição') || '';
        
        const nomeProprietario = safeGet(data, 'proprietario.nome') || 
                                safeGet(data, 'nomeProprietario') || 
                                safeGet(data, 'Nome Proprietário') || '';
        
        const tipoDocumento = safeGet(data, 'proprietario.tipoDocumento') || 
                             safeGet(data, 'tipoDocumento') || 
                             safeGet(data, 'Tipo Documento') || '';
        
        const numeroDocumento = safeGet(data, 'proprietario.numeroDocumento') || 
                               safeGet(data, 'numeroDocumento') || 
                               safeGet(data, 'Nº Documento') || '';
        
        const nomePolicial = safeGet(data, 'policial.nome') || 
                            safeGet(data, 'nomePolicial') || 
                            safeGet(data, 'Nome Policial') || '';
        
        const matricula = safeGet(data, 'policial.matricula') || 
                         safeGet(data, 'matricula') || 
                         safeGet(data, 'Matrícula') || '';
        
        const graduacao = safeGet(data, 'policial.graduacao') || 
                         safeGet(data, 'graduacao') || 
                         safeGet(data, 'Graduação') || '';
        
        const unidadePolicial = safeGet(data, 'policial.unidade') || 
                               safeGet(data, 'unidadePolicial') || 
                               safeGet(data, 'Unidade Policial') || '';
        
        const registradoPor = safeGet(data, 'metadata.registradoPor') || 
                             safeGet(data, 'registradoPor') || 
                             safeGet(data, 'Registrado Por') || '';
        
        worksheetData.push([
          new Date(logRegistro).toLocaleString('pt-BR'),
          numeroGenesis,
          unidade,
          isoToBrDate(dataApreensao),
          leiInfrigida,
          artigo,
          status,
          numeroPje,
          normalizeCapitalization(especie),
          normalizeCapitalization(item),
          quantidade,
          descricao,
          nomeProprietario,
          tipoDocumento,
          numeroDocumento,
          nomePolicial,
          matricula,
          graduacao,
          unidadePolicial,
          registradoPor
        ]);
      } catch (err) {
        console.error(`Erro ao processar ocorrência ${index}:`, err, data);
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
    const exportFilename = `[EXPORTAÇÃO][${dateStr}].xlsx`;
    const exportPath = path.join(FOLDERS.exportacoesOcorrencias, exportFilename);
    
    XLSX.writeFile(workbook, exportPath);
    console.log('Exportação concluída com sucesso:');
    console.log('- Total de linhas no Excel:', worksheetData.length);
    console.log('- Arquivo salvo em:', exportPath);
    
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

    // Carregar PDF diretamente
    console.log('Carregando PDF na janela:', pdfPath);
    await previewWindow.loadFile(pdfPath);

    // Adicionar botões de ação via JavaScript injetado
    await previewWindow.webContents.executeJavaScript(`
      // Criar toolbar com botões
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #071d49 0%, #0a2d6e 100%); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; font-family: system-ui, -apple-system, sans-serif;';
      
      const title = document.createElement('div');
      title.textContent = 'Termo de Apreensão';
      title.style.cssText = 'font-size: 16px; font-weight: normal;';
      
      const actions = document.createElement('div');
      actions.style.cssText = 'display: flex; gap: 10px;';
      
      const btnPrint = document.createElement('button');
      btnPrint.textContent = 'Imprimir';
      btnPrint.style.cssText = 'padding: 10px 20px; background: linear-gradient(135deg, #279b4d 0%, #1f8040 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: normal; cursor: pointer; font-family: inherit;';
      btnPrint.onclick = () => window.print();
      
      const btnClose = document.createElement('button');
      btnClose.textContent = 'Fechar';
      btnClose.style.cssText = 'padding: 10px 20px; background: #e0e0e0; color: #333; border: none; border-radius: 8px; font-size: 14px; font-weight: normal; cursor: pointer; font-family: inherit;';
      btnClose.onclick = () => window.close();
      
      actions.appendChild(btnPrint);
      actions.appendChild(btnClose);
      toolbar.appendChild(title);
      toolbar.appendChild(actions);
      document.body.insertBefore(toolbar, document.body.firstChild);
      
      // Ajustar margem do corpo para não sobrepor a toolbar
      document.body.style.marginTop = '60px';
    `);

    previewWindow.show();

    return { success: true, message: 'Prévia do documento gerada', pdfPath: pdfPath };
  } catch (error) {
    console.error('Erro ao gerar termo de apreensão:', error);
    return { success: false, message: error.message };
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



// ============================================================================
// SISTEMA DE ATUALIZAÇÕES
// ============================================================================

// Inicializar sistema de atualizações
function initializeUpdater() {
  try {
    updater = new AutoUpdater({
      owner: 'CREDENCIAL_REMOVIDA', // Usuário do GitHub
      repo: 'CREDENCIAL_REMOVIDA', // Nome do repositório
      currentVersion: app.getVersion(),
      autoCheck: true,
      checkInterval: 5 * 60 * 1000 // Verificar a cada 5 minutos
    });

    // Eventos do updater
    updater.on('checking-for-update', () => {
      console.log('[UPDATE] Verificando atualizacoes disponveis...');
    });

    updater.on('update-available', (updateInfo) => {
      console.log('[UPDATE] Nova versao disponivel:', updateInfo.latestVersion);
      // Mostrar diálogo apenas se foi verificação manual
      updater.showUpdateDialog(updateInfo);
    });

    updater.on('update-available-silent', (updateInfo) => {
      console.log('[UPDATE] Atualizacao detectada (modo silencioso):', updateInfo.latestVersion);
      // Enviar para o renderer process para mostrar notificação na tela de login
      if (mainWindow) {
        mainWindow.webContents.send('update-available-silent', updateInfo);
      }
    });

    updater.on('update-not-available', () => {
      console.log('[UPDATE] Sistema ja esta na versao mais recente');
    });

    updater.on('update-downloading', () => {
      console.log('[UPDATE] Iniciando download da atualizacao...');
      if (mainWindow) {
        mainWindow.webContents.send('update-downloading');
      }
    });

    updater.on('download-progress', (progress) => {
      console.log(`[UPDATE] Progresso do download: ${progress}%`);
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });

    updater.on('update-downloaded', (filePath) => {
      console.log('[UPDATE] Download concluido:', filePath);
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', filePath);
      }
    });

    updater.on('error', (error) => {
      console.error('[UPDATE] Erro durante atualizacao:', error);
      if (mainWindow) {
        mainWindow.webContents.send('update-error', error);
      }
    });

    logInfo('Sistema de atualizacoes inicializado');
  } catch (error) {
    console.error('[ERRO] Falha ao inicializar sistema de atualizacoes:', error.message);
  }
}

// IPC Handlers para atualizações
ipcMain.handle('check-for-updates', async () => {
  if (updater) {
    return await updater.checkForUpdatesManual();
  }
  return false;
});

ipcMain.handle('check-for-updates-silent', async () => {
  if (updater) {
    return await updater.checkForUpdatesSilent();
  }
  return { hasUpdate: false };
});

ipcMain.on('start-update', (event, updateInfo) => {
  if (updater) {
    updater.startUpdate(updateInfo);
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

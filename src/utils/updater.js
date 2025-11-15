const https = require('https');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { spawn } = require('child_process');

// Configuração do repositório GitHub
const GITHUB_REPO = {
  owner: 'SalvaSolucoes',
  repo: 'secrimpo'
};

// Caminho para armazenar a última verificação
const UPDATE_CHECK_FILE = path.join(app.getPath('userData'), 'update-check.json');

/**
 * Compara duas versões (formato: x.y.z)
 * Retorna: 1 se version1 > version2, -1 se version1 < version2, 0 se iguais
 */
function compareVersions(version1, version2) {
  const v1Parts = version1.replace(/^v/, '').split('.').map(Number);
  const v2Parts = version2.replace(/^v/, '').split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

/**
 * Verifica se já passou 24 horas desde a última verificação
 */
function shouldCheckForUpdate() {
  try {
    if (!fs.existsSync(UPDATE_CHECK_FILE)) {
      return true; // Primeira verificação
    }
    
    const data = JSON.parse(fs.readFileSync(UPDATE_CHECK_FILE, 'utf8'));
    const lastCheck = new Date(data.lastCheck);
    const now = new Date();
    const hoursSinceLastCheck = (now - lastCheck) / (1000 * 60 * 60);
    
    return hoursSinceLastCheck >= 24;
  } catch (error) {
    console.error('Erro ao verificar última data de verificação:', error);
    return true; // Em caso de erro, verificar
  }
}

/**
 * Salva a data da última verificação
 */
function saveLastCheckDate() {
  try {
    const data = {
      lastCheck: new Date().toISOString()
    };
    fs.writeFileSync(UPDATE_CHECK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar data de verificação:', error);
  }
}

/**
 * Busca a última release do GitHub
 */
function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${encodeURIComponent(GITHUB_REPO.owner)}/${encodeURIComponent(GITHUB_REPO.repo)}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'SECRIMPO-PMDF-Updater/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const release = JSON.parse(data);
            resolve(release);
          } catch (error) {
            reject(new Error('Erro ao parsear resposta do GitHub: ' + error.message));
          }
        } else if (res.statusCode === 404) {
          reject(new Error(`Repositório não encontrado: ${GITHUB_REPO.owner}/${GITHUB_REPO.repo}. Verifique se o repositório existe e tem releases públicas.`));
        } else if (res.statusCode === 403) {
          // Rate limit ou repositório privado
          if (data.includes('rate limit') || data.includes('API rate limit')) {
            reject(new Error('Limite de requisições da API do GitHub excedido. Tente novamente mais tarde.'));
          } else {
            reject(new Error('Acesso negado. O repositório pode ser privado ou não estar acessível.'));
          }
        } else if (res.statusCode === 400) {
          reject(new Error(`Requisição inválida. Verifique se o repositório "${GITHUB_REPO.owner}/${GITHUB_REPO.repo}" está correto.`));
        } else {
          // Tentar extrair mensagem de erro se for JSON
          try {
            const errorData = JSON.parse(data);
            reject(new Error(`Erro ao buscar release: ${res.statusCode} - ${errorData.message || data.substring(0, 200)}`));
          } catch {
            reject(new Error(`Erro ao buscar release: ${res.statusCode} - ${data.substring(0, 200)}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error('Erro de conexão: ' + error.message));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout ao buscar atualização. Verifique sua conexão com a internet.'));
    });
    
    req.end();
  });
}

/**
 * Verifica se há atualização disponível
 * @param {string} currentVersion - Versão atual da aplicação
 * @param {boolean} force - Se true, ignora a verificação de tempo e força a checagem
 */
async function checkForUpdate(currentVersion, force = false) {
  try {
    // Verificar se deve fazer a verificação (ignorar se force = true)
    if (!force && !shouldCheckForUpdate()) {
      console.log('Verificação de atualização já foi feita nas últimas 24 horas.');
      return null;
    }
    
    console.log(`Verificando atualizações no GitHub: ${GITHUB_REPO.owner}/${GITHUB_REPO.repo}...`);
    const release = await getLatestRelease();
    
    // Salvar data da verificação apenas se a requisição foi bem-sucedida
    saveLastCheckDate();
    
    const latestVersion = release.tag_name.replace(/^v/, '');
    const currentVersionClean = currentVersion.replace(/^v/, '');
    
    console.log(`Versão atual: ${currentVersionClean}`);
    console.log(`Última versão disponível: ${latestVersion}`);
    
    // Comparar versões
    if (compareVersions(latestVersion, currentVersionClean) > 0) {
      // Identificar o arquivo de instalação correto
      const installerAsset = findInstallerAsset(release.assets || []);
      
      // Há atualização disponível
      return {
        available: true,
        currentVersion: currentVersionClean,
        latestVersion: latestVersion,
        releaseNotes: release.body || 'Sem notas de versão.',
        downloadUrl: release.html_url,
        installerUrl: installerAsset ? installerAsset.browser_download_url : null,
        installerName: installerAsset ? installerAsset.name : null,
        assets: release.assets || []
      };
    } else {
      console.log('Aplicação está atualizada.');
      return {
        available: false,
        currentVersion: currentVersionClean,
        latestVersion: latestVersion
      };
    }
  } catch (error) {
    console.error('Erro ao verificar atualização:', error.message);
    
    // Para erros, não salvar data para tentar novamente na próxima vez
    // Mas não mostrar erro ao usuário para não incomodar (apenas log)
    return null;
  }
}

/**
 * Encontra o arquivo de instalação correto nos assets
 * Prioriza: .exe que não seja portable
 */
function findInstallerAsset(assets) {
  if (!assets || assets.length === 0) {
    return null;
  }
  
  // Priorizar instalador NSIS (não portable)
  const nsisInstaller = assets.find(asset => 
    asset.name.endsWith('.exe') && 
    !asset.name.toLowerCase().includes('portable')
  );
  
  if (nsisInstaller) {
    return nsisInstaller;
  }
  
  // Se não encontrar NSIS, procurar qualquer .exe
  const anyExe = assets.find(asset => asset.name.endsWith('.exe'));
  
  return anyExe || null;
}

/**
 * Baixa o arquivo de instalação
 * @param {string} url - URL do arquivo para download
 * @param {string} filePath - Caminho onde salvar o arquivo
 * @param {Function} onProgress - Callback de progresso (percent, downloaded, total)
 */
function downloadFile(url, filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const urlModule = require('url');
    const parsedUrl = urlModule.parse(url);
    const file = fs.createWriteStream(filePath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'SECRIMPO-PMDF-Updater/1.0',
        'Accept': '*/*'
      }
    };
    
    const req = https.request(options, (res) => {
      // Obter tamanho total do arquivo
      totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        reject(new Error(`Erro ao baixar arquivo: ${res.statusCode}`));
        return;
      }
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        file.write(chunk);
        
        if (onProgress && totalBytes > 0) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100);
          onProgress(percent, downloadedBytes, totalBytes);
        }
      });
      
      res.on('end', () => {
        file.end();
        resolve(filePath);
      });
    });
    
    req.on('error', (error) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(error);
    });
    
    req.setTimeout(300000, () => { // 5 minutos de timeout
      req.destroy();
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(new Error('Timeout ao baixar arquivo'));
    });
    
    req.end();
  });
}

/**
 * Instala o arquivo baixado
 * @param {string} installerPath - Caminho do instalador
 */
function installUpdate(installerPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(installerPath)) {
      reject(new Error('Arquivo de instalação não encontrado'));
      return;
    }
    
    try {
      // Executar o instalador
      // /S = modo silencioso, /D= = diretório de instalação (opcional)
      const installer = spawn(installerPath, ['/S'], {
        detached: true,
        stdio: 'ignore'
      });
      
      installer.unref(); // Permitir que o processo pai termine
      
      // Aguardar um pouco para garantir que o instalador iniciou
      setTimeout(() => {
        resolve();
      }, 1000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Baixa e instala a atualização
 * @param {string} installerUrl - URL do instalador
 * @param {string} installerName - Nome do arquivo instalador
 * @param {Function} onProgress - Callback de progresso
 */
async function downloadAndInstall(installerUrl, installerName, onProgress) {
  if (!installerUrl || !installerName) {
    throw new Error('URL ou nome do instalador não fornecido');
  }
  
  // Criar diretório temporário
  const tempDir = path.join(app.getPath('temp'), 'secrimpo-update');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const installerPath = path.join(tempDir, installerName);
  
  try {
    // Baixar arquivo
    if (onProgress) {
      onProgress(0, 0, 0, 'Iniciando download...');
    }
    
    await downloadFile(installerUrl, installerPath, (percent, downloaded, total) => {
      if (onProgress) {
        onProgress(percent, downloaded, total, `Baixando: ${percent}%`);
      }
    });
    
    if (onProgress) {
      onProgress(100, 0, 0, 'Download concluído. Iniciando instalação...');
    }
    
    // Instalar
    await installUpdate(installerPath);
    
    return { success: true, installerPath };
  } catch (error) {
    // Limpar arquivo em caso de erro
    if (fs.existsSync(installerPath)) {
      try {
        fs.unlinkSync(installerPath);
      } catch (e) {
        console.error('Erro ao remover arquivo temporário:', e);
      }
    }
    throw error;
  }
}

module.exports = {
  checkForUpdate,
  compareVersions,
  downloadAndInstall,
  findInstallerAsset
};


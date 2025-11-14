const https = require('https');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

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
 */
async function checkForUpdate(currentVersion) {
  try {
    // Verificar se deve fazer a verificação
    if (!shouldCheckForUpdate()) {
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
      // Há atualização disponível
      return {
        available: true,
        currentVersion: currentVersionClean,
        latestVersion: latestVersion,
        releaseNotes: release.body || 'Sem notas de versão.',
        downloadUrl: release.html_url,
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

module.exports = {
  checkForUpdate,
  compareVersions
};


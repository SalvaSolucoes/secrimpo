const { app, dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class AutoUpdater {
  constructor(options = {}) {
    this.owner = options.owner || 'CREDENCIAL_REMOVIDA'; // Usuário do GitHub
    this.repo = options.repo || 'CREDENCIAL_REMOVIDA'; // Nome do repositório
    this.currentVersion = options.currentVersion || app.getVersion();
    this.checkInterval = options.checkInterval || 5 * 60 * 1000; // 5 minutos
    this.autoCheck = options.autoCheck !== false;
    this.downloadPath = path.join(app.getPath('temp'), 'secrimpo-update');
    
    // Eventos
    this.listeners = {};
    
    if (this.autoCheck) {
      this.startPeriodicCheck();
    }
  }

  // Sistema de eventos
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Verificar atualizações periodicamente
  startPeriodicCheck() {
    // Verificar na inicialização (após 10 segundos) - silenciosamente
    setTimeout(() => {
      this.checkForUpdatesSilent();
    }, 10000);

    // Verificar periodicamente - silenciosamente
    setInterval(() => {
      this.checkForUpdatesSilent();
    }, this.checkInterval);
  }

  // Verificar se há atualizações disponíveis
  async checkForUpdates(showNoUpdateDialog = true) {
    try {
      console.log('[UPDATE] Verificando novas versoes...');
      this.emit('checking-for-update');

      const latestRelease = await this.getLatestRelease();
      
      if (!latestRelease) {
        if (showNoUpdateDialog) {
          this.emit('error', 'Não foi possível verificar atualizações');
        }
        return false;
      }

      const latestVersion = this.cleanVersion(latestRelease.tag_name);
      const currentVersion = this.cleanVersion(this.currentVersion);

      console.log(`[UPDATE] Versao atual: ${currentVersion}`);
      console.log(`[UPDATE] Versao disponivel: ${latestVersion}`);

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        console.log('[UPDATE] Nova versao encontrada!');
        this.emit('update-available', {
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          releaseNotes: latestRelease.body,
          downloadUrl: this.getDownloadUrl(latestRelease),
          releaseData: latestRelease
        });
        return true;
      } else {
        console.log('[UPDATE] Sistema atualizado');
        if (showNoUpdateDialog) {
          this.emit('update-not-available');
        }
        return false;
      }
    } catch (error) {
      console.error('[UPDATE] Erro na verificacao:', error.message);
      this.emit('error', error.message);
      return false;
    }
  }

  // Buscar última release do GitHub
  async getLatestRelease() {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
      
      const options = {
        headers: {
          'User-Agent': 'SECRIMPO-PMDF-Updater'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const release = JSON.parse(data);
              resolve(release);
            } else if (res.statusCode === 404) {
              console.log('[UPDATE] Nenhuma release encontrada no repositorio');
              resolve(null);
            } else {
              reject(new Error(`GitHub API retornou status ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error('Erro ao processar resposta da API: ' + error.message));
          }
        });
      }).on('error', (error) => {
        reject(new Error('Erro de conexão: ' + error.message));
      });
    });
  }

  // Obter URL de download do executável
  getDownloadUrl(release) {
    // Procurar por arquivo .exe nos assets
    const asset = release.assets.find(asset => 
      asset.name.toLowerCase().includes('.exe') && 
      (asset.name.toLowerCase().includes('setup') || 
       asset.name.toLowerCase().includes('install') ||
       asset.name.toLowerCase().includes('secrimpo'))
    );
    
    return asset ? asset.browser_download_url : null;
  }

  // Limpar versão (remover 'v' e caracteres extras)
  cleanVersion(version) {
    return version.replace(/^v/, '').replace(/[^\d.]/g, '');
  }

  // Comparar versões (formato semver básico)
  isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    // Garantir que ambas tenham 3 partes
    while (latestParts.length < 3) latestParts.push(0);
    while (currentParts.length < 3) currentParts.push(0);
    
    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    
    return false;
  }

  // Download da atualização
  async downloadUpdate(downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      if (!downloadUrl) {
        reject(new Error('URL de download não encontrada'));
        return;
      }

      // Criar diretório de download
      if (!fs.existsSync(this.downloadPath)) {
        fs.mkdirSync(this.downloadPath, { recursive: true });
      }

      const fileName = path.basename(downloadUrl.split('?')[0]) || 'SECRIMPO-Update.exe';
      const filePath = path.join(this.downloadPath, fileName);

      console.log(`Baixando atualização: ${fileName}`);
      
      const file = fs.createWriteStream(filePath);
      
      https.get(downloadUrl, (response) => {
        // Seguir redirecionamentos
        if (response.statusCode === 302 || response.statusCode === 301) {
          https.get(response.headers.location, (redirectResponse) => {
            const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
            let downloadedSize = 0;

            redirectResponse.on('data', (chunk) => {
              downloadedSize += chunk.length;
              if (onProgress && totalSize) {
                const progress = (downloadedSize / totalSize) * 100;
                onProgress(Math.round(progress));
              }
            });

            redirectResponse.pipe(file);
            
            file.on('finish', () => {
              file.close();
              console.log('Download concluído:', filePath);
              resolve(filePath);
            });
          }).on('error', reject);
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (onProgress && totalSize) {
            const progress = (downloadedSize / totalSize) * 100;
            onProgress(Math.round(progress));
          }
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('Download concluído:', filePath);
          resolve(filePath);
        });
      }).on('error', (error) => {
        fs.unlink(filePath, () => {}); // Remover arquivo parcial
        reject(error);
      });
    });
  }

  // Instalar atualização
  async installUpdate(filePath) {
    return new Promise((resolve, reject) => {
      console.log('Iniciando instalação da atualização...');
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        reject(new Error('Arquivo de atualização não encontrado'));
        return;
      }

      try {
        // Executar o instalador
        const installer = spawn(filePath, ['/S'], { // /S para instalação silenciosa
          detached: true,
          stdio: 'ignore'
        });

        installer.unref();

        // Aguardar um pouco e fechar a aplicação
        setTimeout(() => {
          console.log('Fechando aplicação para instalação...');
          app.quit();
          resolve();
        }, 2000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Mostrar diálogo de atualização disponível (apenas quando solicitado manualmente)
  async showUpdateDialog(updateInfo) {
    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Atualização Disponível',
      message: `Nova versão disponível: ${updateInfo.latestVersion}`,
      detail: `Versão atual: ${updateInfo.currentVersion}\n\nDeseja atualizar agora?`,
      buttons: ['Atualizar Agora', 'Lembrar Depois', 'Ver Detalhes'],
      defaultId: 0,
      cancelId: 1
    });

    switch (response.response) {
      case 0: // Atualizar Agora
        this.startUpdate(updateInfo);
        break;
      case 1: // Lembrar Depois
        console.log('Atualização adiada pelo usuário');
        break;
      case 2: // Ver Detalhes
        if (updateInfo.releaseData.html_url) {
          shell.openExternal(updateInfo.releaseData.html_url);
        }
        break;
    }
  }

  // Verificar atualizações silenciosamente (sem mostrar diálogos)
  async checkForUpdatesSilent() {
    try {
      console.log('[UPDATE] Verificacao silenciosa iniciada...');
      this.emit('checking-for-update');

      const latestRelease = await this.getLatestRelease();
      
      if (!latestRelease) {
        return { hasUpdate: false };
      }

      const latestVersion = this.cleanVersion(latestRelease.tag_name);
      const currentVersion = this.cleanVersion(this.currentVersion);

      console.log(`[UPDATE] Versao atual: ${currentVersion}`);
      console.log(`[UPDATE] Versao disponivel: ${latestVersion}`);

      if (this.isNewerVersion(latestVersion, currentVersion)) {
        console.log('[UPDATE] Nova versao encontrada (modo silencioso)!');
        const updateInfo = {
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          releaseNotes: latestRelease.body,
          downloadUrl: this.getDownloadUrl(latestRelease),
          releaseData: latestRelease
        };
        
        this.emit('update-available-silent', updateInfo);
        return { hasUpdate: true, updateInfo };
      } else {
        console.log('Aplicação já está atualizada (verificação silenciosa)');
        return { hasUpdate: false };
      }
    } catch (error) {
      console.error('Erro na verificação silenciosa:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  // Iniciar processo de atualização
  async startUpdate(updateInfo) {
    try {
      this.emit('update-downloading');
      
      // Mostrar progresso
      const progressDialog = dialog.showMessageBox({
        type: 'info',
        title: 'Baixando Atualização',
        message: 'Baixando atualização...',
        detail: 'Por favor, aguarde.',
        buttons: []
      });

      const filePath = await this.downloadUpdate(updateInfo.downloadUrl, (progress) => {
        console.log(`Progresso: ${progress}%`);
        this.emit('download-progress', progress);
      });

      this.emit('update-downloaded', filePath);
      
      // Perguntar se quer instalar agora
      const installResponse = await dialog.showMessageBox({
        type: 'question',
        title: 'Download Concluído',
        message: 'Atualização baixada com sucesso!',
        detail: 'Deseja instalar agora? A aplicação será fechada durante a instalação.',
        buttons: ['Instalar Agora', 'Instalar Depois'],
        defaultId: 0
      });

      if (installResponse.response === 0) {
        await this.installUpdate(filePath);
      } else {
        console.log('Atualização salva para instalação posterior:', filePath);
      }

    } catch (error) {
      console.error('Erro durante atualização:', error);
      this.emit('error', error.message);
      
      dialog.showErrorBox('Erro na Atualização', 
        'Ocorreu um erro durante a atualização:\n' + error.message);
    }
  }

  // Verificação manual (chamada pelo usuário)
  async checkForUpdatesManual() {
    return this.checkForUpdates(true);
  }
}

module.exports = AutoUpdater;

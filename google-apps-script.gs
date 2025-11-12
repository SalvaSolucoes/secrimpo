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

function doGet(e) {
  try {
    const params = e.parameter;
    
    // Se for requisição de TCOs
    if (params.type === 'tco') {
      return getTCOs();
    }
    
    // Requisição padrão de ocorrências
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // Página 1
    
    // Pegar todos os dados a partir da linha 3, coluna A
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 3) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        occurrences: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 19); // A3 até S (19 colunas a partir da coluna A)
    const values = dataRange.getValues();
    
    const occurrences = values.map(row => ({
      logRegistro: row[0],
      numeroGenesis: row[1],
      unidade: row[2],
      dataApreensao: row[3],
      leiInfrigida: row[4],
      artigo: row[5],
      status: row[6],
      especie: row[7],
      item: row[8],
      quantidade: row[9],
      descricaoItem: row[10],
      nomeProprietario: row[11],
      tipoDocumento: row[12],
      numeroDocumento: row[13],
      nomePolicial: row[14],
      matricula: row[15],
      graduacao: row[16],
      unidadePolicial: row[17],
      registradoPor: row[18]
    }));
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      occurrences: occurrences
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para buscar TCOs da Página 2
function getTCOs() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    if (sheets.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Página 2 não existe. Crie uma segunda aba na planilha.',
        tcos: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const tcoSheet = sheets[1]; // Página 2
    const lastRow = tcoSheet.getLastRow();
    
    if (lastRow < 3) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        tcos: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const numRows = lastRow - 2;
    const dataRange = tcoSheet.getRange(3, 1, numRows, 3); // A3 até C (3 colunas)
    const values = dataRange.getValues();
    
    const tcos = values
      .filter(row => row[0] && row[0] !== '') // Filtrar linhas vazias
      .map((row, index) => ({
        id: 'tco_' + (index + 1),
        rap: row[0],        // Coluna A: RAP (Nº Genesis)
        envolvido: row[1],  // Coluna B: Envolvido (Nome Completo)
        ilicito: row[2]     // Coluna C: Ilícito (Item)
      }));
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      tcos: tcos
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      tcos: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Se for uma ação de atualização
    if (data.action === 'update') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mainSheet = spreadsheet.getSheets()[0]; // Página 1
      const numeroParaBusca = data.numeroGenesisOriginal || data.numeroGenesis;
      const numeroGenesisNovo = data.numeroGenesis;
      const lastRow = mainSheet.getLastRow();
      
      // Procurar a linha com o número Genesis correspondente (coluna B = índice 2)
      for (let i = 3; i <= lastRow; i++) {
        const valorCelula = mainSheet.getRange(i, 2).getValue();
        if (valorCelula == numeroParaBusca) {
          const especieNormalizada = normalizeCapitalization(data.especie);
          const itemNormalizado = normalizeCapitalization(data.item);
          
          // Atualizar a linha encontrada (a partir da coluna A = índice 1)
          mainSheet.getRange(i, 1, 1, 19).setValues([[
            data.timestamp,
            numeroGenesisNovo,
            data.unidade,
            data.dataApreensao,
            data.leiInfrigida,
            data.artigo,
            data.status,
            especieNormalizada,
            itemNormalizado,
            data.quantidade,
            data.descricaoItem,
            data.nomeProprietario,
            data.tipoDocumento,
            data.numeroDocumento,
            data.nomePolicial,
            data.matricula,
            data.graduacao,
            data.unidadePolicial,
            data.registradoPor
          ]]);
          
          // Verificar se a espécie é "Droga" para atualizar/inserir no TCO
          if (especieNormalizada && especieNormalizada.toLowerCase() === 'droga') {
            const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
            const tcoLastRow = tcoSheet.getLastRow();
            
            // Procurar se já existe um TCO com este RAP
            let tcoRowIndex = -1;
            for (let j = 3; j <= tcoLastRow; j++) {
              const rapTCO = tcoSheet.getRange(j, 1).getValue();
              if (rapTCO == numeroParaBusca || rapTCO == numeroGenesisNovo) {
                tcoRowIndex = j;
                break;
              }
            }
            
            const tcoData = [
              numeroGenesisNovo,     // RAP (Nº Genesis)
              data.nomeProprietario, // Envolvido (Nome Completo)
              itemNormalizado        // Ilícito (Item)
            ];
            
            if (tcoRowIndex !== -1) {
              // Atualizar TCO existente
              tcoSheet.getRange(tcoRowIndex, 1, 1, 3).setValues([tcoData]);
            } else {
              // Inserir novo TCO
              const tcoNextRow = Math.max(3, tcoLastRow + 1);
              tcoSheet.getRange(tcoNextRow, 1, 1, 3).setValues([tcoData]);
            }
          } else {
            // Se a espécie NÃO é droga, remover do TCO se existir
            const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
            const tcoLastRow = tcoSheet.getLastRow();
            
            for (let j = 3; j <= tcoLastRow; j++) {
              const rapTCO = tcoSheet.getRange(j, 1).getValue();
              if (rapTCO == numeroParaBusca || rapTCO == numeroGenesisNovo) {
                tcoSheet.deleteRow(j);
                break;
              }
            }
          }
          
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'Ocorrência atualizada com sucesso'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Ocorrência não encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Se for uma ação de exclusão
    if (data.action === 'delete') {
      const numeroGenesis = data.numeroGenesis;
      const lastRow = sheet.getLastRow();
      
      // Procurar a linha com o número Genesis correspondente (coluna B = índice 2)
      for (let i = 3; i <= lastRow; i++) {
        if (sheet.getRange(i, 2).getValue() == numeroGenesis) {
          // Deletar a linha encontrada
          sheet.deleteRow(i);
          
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'Ocorrência excluída com sucesso'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Ocorrência não encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Inserção normal (adicionar nova linha)
    if (data.values && Array.isArray(data.values)) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mainSheet = spreadsheet.getSheets()[0]; // Página 1
      
      // Encontrar a próxima linha vazia a partir da linha 3
      const lastRow = mainSheet.getLastRow();
      const nextRow = Math.max(3, lastRow + 1);
      
      // Normalizar capitalização dos campos especie (índice 7) e item (índice 8)
      const normalizedValues = data.values.map((value, index) => {
        if (index === 7 || index === 8) {
          return normalizeCapitalization(value);
        }
        return value;
      });
      
      // Inserir dados a partir da coluna A (1ª coluna) na Página 1
      mainSheet.getRange(nextRow, 1, 1, normalizedValues.length).setValues([normalizedValues]);
      
      // Verificar se a espécie é "Droga" para salvar também na Página 2 (TCO)
      const especie = normalizedValues[7]; // Índice 7 = espécie
      
      if (especie && especie.toLowerCase() === 'droga') {
        const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
        const tcoLastRow = tcoSheet.getLastRow();
        const tcoNextRow = Math.max(3, tcoLastRow + 1);
        
        // Dados para TCO: RAP (Nº Genesis), Envolvido (Nome Completo), Ilícito (Item)
        const tcoData = [
          normalizedValues[1],  // Nº Genesis (índice 1)
          normalizedValues[11], // Nome Completo (índice 11)
          normalizedValues[8]   // Item (índice 8)
        ];
        
        // Inserir na Página 2
        tcoSheet.getRange(tcoNextRow, 1, 1, 3).setValues([tcoData]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Dados inseridos com sucesso'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Formato de dados inválido'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

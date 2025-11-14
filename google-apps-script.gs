// Função para converter texto para maiúsculas
function convertToUppercase(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Remover espaços extras no início e fim e converter para maiúsculas
  return text.trim().toUpperCase();
}

// Função para converter array de dados para maiúsculas (exceto datas e números)
function convertArrayToUppercase(values) {
  return values.map((value, index) => {
    // Não converter datas (índices específicos) e valores numéricos
    if (value instanceof Date || typeof value === 'number') {
      return value;
    }
    
    // Converter strings para maiúsculas
    if (typeof value === 'string' && value.trim() !== '') {
      return convertToUppercase(value);
    }
    
    return value;
  });
}

function doGet(e) {
  try {
    const params = e.parameter;
    
    // Se for requisição de TCOs
    if (params.action === 'get_tcos') {
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
    
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 20); // A3 até T (20 colunas a partir da coluna A)
    const values = dataRange.getValues();
    
    const occurrences = values.map(row => ({
      logRegistro: row[0],
      numeroGenesis: row[1],
      unidade: row[2],
      dataApreensao: row[3],
      leiInfrigida: row[4],
      artigo: row[5],
      status: row[6],
      numeroPje: row[7],
      especie: row[8],
      item: row[9],
      quantidade: row[10],
      descricaoItem: row[11],
      nomeProprietario: row[12],
      tipoDocumento: row[13],
      numeroDocumento: row[14],
      nomePolicial: row[15],
      matricula: row[16],
      graduacao: row[17],
      unidadePolicial: row[18],
      registradoPor: row[19]
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
        rap: row[0],           // Coluna A: RAP (Nº Genesis)
        envolvido: row[1],     // Coluna B: Envolvido (Nome Completo)
        ilicito: row[2]        // Coluna C: Ilícito (Espécie)
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
    
    // Se for uma ação de adicionar TCO
    if (data.action === 'add_tco') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let tcoSheet;
      
      // Verificar se existe a Página 2, se não, criar
      if (spreadsheet.getSheets().length < 2) {
        tcoSheet = spreadsheet.insertSheet('TCOs');
        // Adicionar cabeçalhos na Página 2 (TCO)
        tcoSheet.getRange(1, 1, 1, 3).setValues([[
          'RAP (GÊNESIS)', 'Envolvido', 'Ilícito'
        ]]);
        // Formatar cabeçalhos
        const headerRange = tcoSheet.getRange(1, 1, 1, 3);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#28a745');
        headerRange.setFontColor('white');
      } else {
        tcoSheet = spreadsheet.getSheets()[1]; // Página 2
      }
      
      const tcoLastRow = tcoSheet.getLastRow();
      const tcoNextRow = Math.max(3, tcoLastRow + 1);
      
      // Dados para TCO - APENAS 3 campos (em maiúsculas)
      const tcoData = [
        convertToUppercase(data.rap || ''),           // RAP (Nº Genesis)
        convertToUppercase(data.envolvido || ''),     // Envolvido (Nome)
        convertToUppercase(data.ilicito || '')        // Ilícito (Espécie)
      ];
      
      // Inserir na Página 2
      tcoSheet.getRange(tcoNextRow, 1, 1, 3).setValues([tcoData]);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'TCO adicionado com sucesso'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
          // Atualizar a linha encontrada (a partir da coluna A = índice 1) - todos em maiúsculas
          const updatedRow = [
            data.timestamp,
            convertToUppercase(numeroGenesisNovo),
            convertToUppercase(data.unidade),
            data.dataApreensao,
            convertToUppercase(data.leiInfrigida),
            convertToUppercase(data.artigo),
            convertToUppercase(data.status),
            convertToUppercase(data.numeroPje),
            convertToUppercase(data.especie),
            convertToUppercase(data.item),
            convertToUppercase(data.quantidade),
            convertToUppercase(data.descricaoItem),
            convertToUppercase(data.nomeProprietario),
            convertToUppercase(data.tipoDocumento),
            convertToUppercase(data.numeroDocumento),
            convertToUppercase(data.nomePolicial),
            convertToUppercase(data.matricula),
            convertToUppercase(data.graduacao),
            convertToUppercase(data.unidadePolicial),
            convertToUppercase(data.registradoPor)
          ];
          
          mainSheet.getRange(i, 1, 1, 20).setValues([updatedRow]);
          
          // Migrar dados da ocorrência para TCO (Página 2)
          let tcoSheet;
          if (spreadsheet.getSheets().length < 2) {
            tcoSheet = spreadsheet.insertSheet('TCOs');
            // Adicionar cabeçalhos na Página 2 (TCO)
            tcoSheet.getRange(1, 1, 1, 3).setValues([[
              'RAP (GÊNESIS)', 'Envolvido', 'Ilícito'
            ]]);
            // Formatar cabeçalhos
            const headerRange = tcoSheet.getRange(1, 1, 1, 3);
            headerRange.setFontWeight('bold');
            headerRange.setBackground('#28a745');
            headerRange.setFontColor('white');
          } else {
            tcoSheet = spreadsheet.getSheets()[1]; // Página 2 (TCO)
          }
          
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
          
          // Dados migrados da OCORRÊNCIA para TCO - APENAS 3 campos (em maiúsculas)
          const tcoData = [
            convertToUppercase(numeroGenesisNovo),     // RAP = Nº Genesis da ocorrência
            convertToUppercase(data.nomeProprietario), // ENVOLVIDO = Nome completo do proprietário
            convertToUppercase(data.especie)           // ILÍCITO = Espécie da ocorrência
          ];
          
          if (tcoRowIndex !== -1) {
            // Atualizar TCO existente com dados da ocorrência
            tcoSheet.getRange(tcoRowIndex, 1, 1, 3).setValues([tcoData]);
          } else {
            // Inserir novo TCO com dados migrados da ocorrência
            const tcoNextRow = Math.max(3, tcoLastRow + 1);
            tcoSheet.getRange(tcoNextRow, 1, 1, 3).setValues([tcoData]);
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
      
      // Converter todos os campos para maiúsculas (exceto datas e números)
      const uppercaseValues = convertArrayToUppercase(data.values);
      
      // Garantir que apenas 20 colunas (A até T) sejam inseridas na Página 1
      const limitedValues = uppercaseValues.slice(0, 20);
      
      // Inserir dados da OCORRÊNCIA na Página 1 (máximo 20 colunas)
      mainSheet.getRange(nextRow, 1, 1, 20).setValues([limitedValues]);
      
      // Migrar automaticamente dados da OCORRÊNCIA para TCO (Página 2)
      let tcoSheet;
      
      // Verificar se existe a Página 2 (TCO), se não, criar
      if (spreadsheet.getSheets().length < 2) {
        tcoSheet = spreadsheet.insertSheet('TCOs');
        // Adicionar cabeçalhos na Página 2 (TCO)
        tcoSheet.getRange(1, 1, 1, 3).setValues([[
          'RAP (GÊNESIS)', 'Envolvido', 'Ilícito'
        ]]);
        // Formatar cabeçalhos do TCO
        const headerRange = tcoSheet.getRange(1, 1, 1, 3);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#28a745');
        headerRange.setFontColor('white');
      } else {
        tcoSheet = spreadsheet.getSheets()[1]; // Página 2 (TCO)
      }
      
      const tcoLastRow = tcoSheet.getLastRow();
      const tcoNextRow = Math.max(3, tcoLastRow + 1);
      
      // Migrar dados da OCORRÊNCIA para TCO - APENAS 3 campos (já em maiúsculas)
      const tcoData = [
        limitedValues[1],  // RAP = Nº Genesis da ocorrência
        limitedValues[12], // ENVOLVIDO = Nome completo do proprietário (posição ajustada)
        limitedValues[8]   // ILÍCITO = Espécie da ocorrência (posição ajustada)
      ];
      
      // Inserir TCO migrado na Página 2 
      tcoSheet.getRange(tcoNextRow, 1, 1, 3).setValues([tcoData]);
      
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

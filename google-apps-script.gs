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
    
    // Ordem das colunas: Log Registro(0), Nº Genesis(1), Unidade(2), Data Apreensão(3), 
    // Lei Infringida(4), Artigo(5), Status(6), Nº PJE(7), Espécie(8), Item(9), 
    // Quantidade(10), Descrição(11), Nome Completo(12), Documento(13), Nº Documento(14), 
    // Nome Policial(15), Matrícula(16), Graduação(17), Unidade(18), Registrado Por(19) = 20 colunas
    const dataRange = sheet.getRange(3, 1, lastRow - 2, 20); // A3 até T (20 colunas a partir da coluna A)
    const values = dataRange.getValues();
    
    // Usar getDisplayValues para obter valores como string (evita conversão automática para Date)
    const displayValues = dataRange.getDisplayValues();
    
    const occurrences = values.map((row, index) => {
      // Usar displayValue para numeroGenesis para evitar conversão para Date
      let numeroGenesis = displayValues[index][1]; // Usar displayValue ao invés de value
      numeroGenesis = String(numeroGenesis || '').trim();
      
      return {
      logRegistro: row[0],
      numeroGenesis: numeroGenesis,
      unidade: row[2],
      dataApreensao: row[3],
      leiInfrigida: row[4],
      artigo: row[5],
      status: row[6],
      numeroPje: row[7], // Nº PJE
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
    };
    });
    
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
    const dataRange = tcoSheet.getRange(3, 1, numRows, 4); // A3 até D (4 colunas)
    const values = dataRange.getValues();
    
    // Usar getDisplayValues para obter valores como string (evita conversão automática para Date)
    const tcoDisplayValues = dataRange.getDisplayValues();
    
    const tcos = values
      .filter((row, index) => {
        // Filtrar usando displayValue para verificar se está vazio
        const rapDisplay = tcoDisplayValues[index][0];
        return rapDisplay && rapDisplay !== '';
      })
      .map((row, index) => {
        // Usar displayValue para RAP (Genesis) para evitar conversão para Date
        const rap = String(tcoDisplayValues[index][0] || '').trim();
        
        return {
          id: 'tco_' + (index + 1),
          rap: rap,        // Coluna A: RAP (Nº Genesis) - usando displayValue
          envolvido: String(tcoDisplayValues[index][1] || '').trim(),  // Coluna B: Envolvido (Nome Completo)
          ilicito: String(tcoDisplayValues[index][2] || '').trim(),   // Coluna C: Ilícito (Espécie)
          item: String(tcoDisplayValues[index][3] || '').trim()       // Coluna D: Item
        };
      });
    
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
      let numeroParaBusca = data.numeroGenesisOriginal || data.numeroGenesis;
      const numeroGenesisNovo = data.numeroGenesis;
      const lastRow = mainSheet.getLastRow();
      
      // Se numeroParaBusca for 'N/A' ou vazio, usar o novo Genesis
      if (!numeroParaBusca || numeroParaBusca === 'N/A' || numeroParaBusca === '') {
        numeroParaBusca = numeroGenesisNovo;
      }
      
      // Procurar a linha com o número Genesis correspondente (coluna B = índice 2)
      // Usar getDisplayValue para comparar como string e evitar problemas com Date
      let linhaEncontrada = -1;
      for (let i = 3; i <= lastRow; i++) {
        const valorCelula = mainSheet.getRange(i, 2).getDisplayValue(); // Usar getDisplayValue
        if (String(valorCelula).trim() == String(numeroParaBusca).trim() || 
            String(valorCelula).trim() == String(numeroGenesisNovo).trim()) {
          linhaEncontrada = i;
          break;
        }
      }
      
      if (linhaEncontrada !== -1) {
        const i = linhaEncontrada;
        // Converter todos os campos de texto para maiúsculas
        const numeroGenesisUpper = toUpperCase(numeroGenesisNovo);
        const leiInfrigidaUpper = toUpperCase(data.leiInfrigida);
        const artigoUpper = toUpperCase(data.artigo);
        const especieUpper = data.especie; // Select mantém valor original
        const itemUpper = toUpperCase(data.item);
        const quantidadeUpper = toUpperCase(data.quantidade);
        const descricaoUpper = toUpperCase(data.descricaoItem);
        const nomeProprietarioUpper = toUpperCase(data.nomeProprietario);
        const numeroDocumentoUpper = toUpperCase(data.numeroDocumento);
        const nomePolicialUpper = toUpperCase(data.nomePolicial);
        const matriculaUpper = toUpperCase(data.matricula);
        const unidadePolicialUpper = toUpperCase(data.unidadePolicial);
        
        // Atualizar a linha encontrada (a partir da coluna A = índice 1)
        // Ordem: timestamp(0), numeroGenesis(1), unidade(2), dataApreensao(3), 
        // leiInfrigida(4), artigo(5), status(6), numeroPje(7), especie(8), item(9), 
        // quantidade(10), descricao(11), nomeProprietario(12), tipoDocumento(13), 
        // numeroDocumento(14), nomePolicial(15), matricula(16), graduacao(17), 
        // unidadePolicial(18), registradoPor(19) = 20 colunas
        mainSheet.getRange(i, 1, 1, 20).setValues([[
          data.timestamp,
          numeroGenesisUpper,
          data.unidade, // Select mantém valor original
          data.dataApreensao,
          leiInfrigidaUpper,
          artigoUpper,
          data.status, // Select mantém valor original
          data.numeroPje ? toUpperCase(data.numeroPje) : '',
          especieUpper,
          itemUpper,
          quantidadeUpper,
          descricaoUpper,
          nomeProprietarioUpper,
          data.tipoDocumento, // Select mantém valor original
          numeroDocumentoUpper,
          nomePolicialUpper,
          matriculaUpper,
          data.graduacao, // Select mantém valor original
          unidadePolicialUpper,
          data.registradoPor // Username mantém valor original
        ]]);
        
        // Sempre atualizar/inserir no TCO (migração automática)
        const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
        const tcoLastRow = tcoSheet.getLastRow();
        
        // Procurar se já existe um TCO com este RAP
        // Usar getDisplayValue para comparar como string
        let tcoRowIndex = -1;
        for (let j = 3; j <= tcoLastRow; j++) {
          const rapTCO = tcoSheet.getRange(j, 1).getDisplayValue(); // Usar getDisplayValue
          const rapTCOStr = String(rapTCO).trim();
          const numeroParaBuscaStr = String(numeroParaBusca).trim();
          const numeroGenesisNovoStr = String(numeroGenesisNovo).trim();
          if (rapTCOStr == numeroParaBuscaStr || rapTCOStr == numeroGenesisNovoStr) {
            tcoRowIndex = j;
            break;
          }
        }
        
        // Mapeamento: RAP = Genesis, ENVOLVIDO = Nome Completo, ILÍCITO = Espécie, ITEM = Item
        const tcoData = [
          numeroGenesisUpper,     // RAP (Nº Genesis)
          nomeProprietarioUpper,  // Envolvido (Nome Completo)
          especieUpper,           // Ilícito (Espécie)
          itemUpper               // Item
        ];
        
        if (tcoRowIndex !== -1) {
          // Atualizar TCO existente
          tcoSheet.getRange(tcoRowIndex, 1, 1, 4).setValues([tcoData]);
        } else {
          // Inserir novo TCO
          const tcoNextRow = Math.max(3, tcoLastRow + 1);
          tcoSheet.getRange(tcoNextRow, 1, 1, 4).setValues([tcoData]);
        }
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'Ocorrência atualizada com sucesso'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Se não encontrou, retornar erro
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Ocorrência não encontrada. Número Genesis para busca: ' + numeroParaBusca + ', Novo: ' + numeroGenesisNovo
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Se for uma ação de exclusão de ocorrência
    if (data.action === 'delete') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mainSheet = spreadsheet.getSheets()[0]; // Página 1
      const numeroGenesis = data.numeroGenesis;
      const lastRow = mainSheet.getLastRow();
      
      // Procurar a linha com o número Genesis correspondente (coluna B = índice 2)
      // Usar getDisplayValue para comparar como string
      for (let i = 3; i <= lastRow; i++) {
        const valorCelula = mainSheet.getRange(i, 2).getDisplayValue(); // Usar getDisplayValue
        if (String(valorCelula).trim() == String(numeroGenesis).trim()) {
          // Deletar a linha encontrada na Página 1
          mainSheet.deleteRow(i);
          
          // Também remover o TCO correspondente na Página 2
          const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
          const tcoLastRow = tcoSheet.getLastRow();
          
          for (let j = 3; j <= tcoLastRow; j++) {
            const rapTCO = tcoSheet.getRange(j, 1).getDisplayValue(); // Usar getDisplayValue
            if (String(rapTCO).trim() == String(numeroGenesis).trim()) {
              tcoSheet.deleteRow(j);
              break;
            }
          }
          
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
    
    // Se for uma ação de exclusão de TCO
    if (data.action === 'delete-tco') {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
      
      if (!tcoSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Página de TCO não encontrada'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const rap = data.rap; // RAP (Nº Genesis) do TCO a ser excluído
      const tcoLastRow = tcoSheet.getLastRow();
      
      // Procurar o TCO na Página 2 (coluna A = RAP)
      for (let j = 3; j <= tcoLastRow; j++) {
        const rapTCO = tcoSheet.getRange(j, 1).getDisplayValue(); // Usar getDisplayValue
        if (String(rapTCO).trim() == String(rap).trim()) {
          // Deletar a linha do TCO
          tcoSheet.deleteRow(j);
          
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'TCO excluído com sucesso'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'TCO não encontrado'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Inserção normal (adicionar nova linha)
    if (data.values && Array.isArray(data.values)) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const mainSheet = spreadsheet.getSheets()[0]; // Página 1
      
      // Encontrar a próxima linha vazia a partir da linha 3
      const lastRow = mainSheet.getLastRow();
      const nextRow = Math.max(3, lastRow + 1);
      
      // Converter todos os campos de texto para maiúsculas
      // Ordem dos campos: timestamp(0), numeroGenesis(1), unidade(2), dataApreensao(3), 
      // leiInfrigida(4), artigo(5), status(6), numeroPje(7), especie(8), item(9), 
      // quantidade(10), descricao(11), nomeProprietario(12), tipoDocumento(13), 
      // numeroDocumento(14), nomePolicial(15), matricula(16), graduacao(17), 
      // unidadePolicial(18), registradoPor(19)
      const normalizedValues = data.values.map((value, index) => {
        // Campos que devem ser convertidos para maiúsculas: 1, 4, 5, 7, 9, 10, 11, 12, 14, 15, 16, 18
        // Campos que mantêm valor original: 0 (timestamp), 2 (unidade - select), 3 (data), 
        // 6 (status - select), 8 (especie - select), 13 (tipoDocumento - select), 
        // 17 (graduacao - select), 19 (registradoPor - username)
        if ([1, 4, 5, 7, 9, 10, 11, 12, 14, 15, 16, 18].includes(index)) {
          return toUpperCase(value);
        }
        return value;
      });
      
      // Inserir dados a partir da coluna A (1ª coluna) na Página 1
      mainSheet.getRange(nextRow, 1, 1, normalizedValues.length).setValues([normalizedValues]);
      
      // Sempre migrar para TCO (Página 2) - migração automática de todas as ocorrências
      const tcoSheet = spreadsheet.getSheets()[1]; // Página 2
      const tcoLastRow = tcoSheet.getLastRow();
      const tcoNextRow = Math.max(3, tcoLastRow + 1);
      
      // Mapeamento para TCO:
      // RAP (GÊNESIS) = numeroGenesis (índice 1)
      // ENVOLVIDO = nomeProprietario (índice 12)
      // ILÍCITO = especie (índice 8)
      // ITEM = item (índice 9)
      const tcoData = [
        normalizedValues[1],  // RAP (Nº Genesis) - já em maiúsculas
        normalizedValues[12], // Envolvido (Nome Completo) - já em maiúsculas
        normalizedValues[8],  // Ilícito (Espécie) - mantém valor original (select)
        normalizedValues[9]   // Item - já em maiúsculas
      ];
      
      // Inserir na Página 2
      tcoSheet.getRange(tcoNextRow, 1, 1, 4).setValues([tcoData]);
      
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

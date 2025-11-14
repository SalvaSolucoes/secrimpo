// Módulo para extração de texto de diferentes tipos de arquivo
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Importações das bibliotecas de extração
let pdfjsLib, mammoth, Tesseract;

/**
 * Obtém o caminho correto para node_modules (funciona em dev e produção)
 */
function getNodeModulesPath() {
    let appPath;
    
    try {
        // Tentar obter o caminho do app (pode não estar disponível em todos os contextos)
        if (app && typeof app.getAppPath === 'function') {
            appPath = app.getAppPath();
        } else {
            appPath = __dirname;
        }
    } catch (error) {
        // Se houver erro, usar __dirname como fallback
        appPath = __dirname;
    }
    
    // Se estiver em um .asar, precisamos acessar os recursos desempacotados
    if (appPath && appPath.endsWith('.asar')) {
        // Em produção, node_modules pode estar em resources/app.asar.unpacked
        const resourcesPath = path.join(path.dirname(appPath), '..', 'resources', 'app.asar.unpacked', 'node_modules');
        if (fs.existsSync(resourcesPath)) {
            return resourcesPath;
        }
        // Fallback: tentar caminho relativo ao executável
        try {
            const exePath = process.execPath;
            const exeDir = path.dirname(exePath);
            const unpackedPath = path.join(exeDir, 'resources', 'app.asar.unpacked', 'node_modules');
            if (fs.existsSync(unpackedPath)) {
                return unpackedPath;
            }
        } catch (error) {
            // Ignorar erro
        }
    }
    
    // Em desenvolvimento ou se não estiver em .asar
    // Tentar caminho relativo ao __dirname primeiro
    const relativePath = path.join(__dirname, '../../node_modules');
    if (fs.existsSync(relativePath)) {
        return relativePath;
    }
    
    // Fallback: usar caminho relativo ao appPath
    if (appPath) {
        return path.join(path.dirname(appPath), 'node_modules');
    }
    
    // Último fallback
    return path.join(__dirname, '../../node_modules');
}

// Carregar bibliotecas
try {
    // pdfjs-dist usa ES modules, precisamos usar import dinâmico
    // Por enquanto, vamos usar uma abordagem alternativa
    pdfjsLib = null; // Será carregado dinamicamente quando necessário
    console.log('pdfjs-dist será carregado dinamicamente');
} catch (error) {
    console.error('Erro ao configurar pdfjs-dist:', error.message);
    pdfjsLib = null;
}

try {
    mammoth = require('mammoth');
    console.log('mammoth carregado com sucesso');
} catch (error) {
    console.error('Erro ao carregar mammoth:', error.message);
}

try {
    Tesseract = require('tesseract.js');
    console.log('tesseract.js carregado com sucesso');
} catch (error) {
    console.error('Erro ao carregar tesseract.js:', error.message);
}

/**
 * Extrai texto de arquivo PDF usando pdfjs-dist (legacy build)
 */
async function extractFromPDF(filePath) {
    try {
        // Carregar pdfjs-dist dinamicamente (legacy build para Node.js)
        if (!pdfjsLib) {
            let pdfjsPath;
            let standardFontsPath;
            
            try {
                // Tentar obter caminho correto para node_modules
                const nodeModulesPath = getNodeModulesPath();
                pdfjsPath = path.join(nodeModulesPath, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
                standardFontsPath = path.join(nodeModulesPath, 'pdfjs-dist', 'standard_fonts');
                
                // Verificar se o arquivo existe
                if (!fs.existsSync(pdfjsPath)) {
                    // Fallback: tentar caminho relativo (desenvolvimento)
                    pdfjsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
                    standardFontsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts');
                }
                
                // Converter caminho para formato file:// (necessário para import dinâmico)
                const normalizedPath = pdfjsPath.replace(/\\/g, '/');
                pdfjsLib = await import('file://' + normalizedPath);
                console.log('pdfjs-dist legacy carregado com sucesso de:', pdfjsPath);
            } catch (importError) {
                console.error('Erro ao carregar pdfjs-dist:', importError);
                // Tentar caminho alternativo
                pdfjsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
                standardFontsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts');
                const normalizedPath = pdfjsPath.replace(/\\/g, '/');
                pdfjsLib = await import('file://' + normalizedPath);
            }
        }
        
        const dataBuffer = fs.readFileSync(filePath);
        const data = new Uint8Array(dataBuffer);
        
        // Obter caminho para standard_fonts
        const nodeModulesPath = getNodeModulesPath();
        let standardFontsPath = path.join(nodeModulesPath, 'pdfjs-dist', 'standard_fonts');
        if (!fs.existsSync(standardFontsPath)) {
            standardFontsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts');
        }
        
        // Carregar o documento PDF
        const loadingTask = pdfjsLib.getDocument({
            data: data,
            useSystemFonts: true,
            standardFontDataUrl: standardFontsPath
        });
        
        const pdfDocument = await loadingTask.promise;
        const numPages = pdfDocument.numPages;
        let fullText = '';
        
        console.log(`PDF carregado: ${numPages} página(s)`);
        
        // Extrair texto de cada página
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Concatenar todos os itens de texto
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            
            fullText += pageText + '\n';
            console.log(`Página ${pageNum}/${numPages} processada`);
        }
        
        console.log(`Extração concluída: ${fullText.length} caracteres`);
        return fullText;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        throw new Error('Não foi possível extrair texto do PDF: ' + error.message);
    }
}

/**
 * Extrai texto de arquivo Word (.docx)
 */
async function extractFromWord(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: dataBuffer });
        return result.value;
    } catch (error) {
        console.error('Erro ao extrair texto do Word:', error);
        throw new Error('Não foi possível extrair texto do documento Word');
    }
}

/**
 * Extrai texto de imagem usando OCR
 */
async function extractFromImage(filePath) {
    try {
        const result = await Tesseract.recognize(
            filePath,
            'por', // Português
            {
                logger: m => console.log(m) // Log do progresso
            }
        );
        return result.data.text;
    } catch (error) {
        console.error('Erro ao extrair texto da imagem:', error);
        throw new Error('Não foi possível extrair texto da imagem');
    }
}

/**
 * Extrai texto de arquivo de texto simples
 */
function extractFromText(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error('Erro ao ler arquivo de texto:', error);
        throw new Error('Não foi possível ler o arquivo de texto');
    }
}

/**
 * Função principal que detecta o tipo de arquivo e extrai o texto
 */
async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
        case '.pdf':
            // pdfjs-dist será carregado dinamicamente dentro da função
            return await extractFromPDF(filePath);
        
        case '.docx':
        case '.doc':
            if (!mammoth) {
                throw new Error('Biblioteca mammoth não está instalada. Execute: npm install mammoth');
            }
            return await extractFromWord(filePath);
        
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.bmp':
        case '.tiff':
        case '.gif':
            if (!Tesseract) {
                throw new Error('Biblioteca tesseract.js não está instalada. Execute: npm install tesseract.js');
            }
            return await extractFromImage(filePath);
        
        case '.txt':
            return extractFromText(filePath);
        
        default:
            throw new Error(`Tipo de arquivo não suportado: ${ext}`);
    }
}

/**
 * Normaliza o texto removendo espaços extras e caracteres especiais
 */
function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Busca um valor próximo a uma palavra-chave no texto
 * @param {string} text - Texto completo
 * @param {Array<string>} keywords - Array de palavras-chave possíveis
 * @param {RegExp} valuePattern - Padrão regex para o valor
 * @param {number} maxDistance - Distância máxima em caracteres da palavra-chave
 * @returns {string|null} - Valor encontrado ou null
 */
function findValueNearKeyword(text, keywords, valuePattern, maxDistance = 100) {
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const keywordIndex = lowerText.indexOf(lowerKeyword);
        
        if (keywordIndex !== -1) {
            // Buscar no contexto ao redor da palavra-chave
            const start = Math.max(0, keywordIndex - 50);
            const end = Math.min(normalizedText.length, keywordIndex + keyword.length + maxDistance);
            const context = normalizedText.substring(start, end);
            
            // Tentar encontrar o valor no contexto
            // Criar uma cópia do padrão sem flag global para evitar problemas
            const localPattern = new RegExp(valuePattern.source, valuePattern.flags.replace('g', ''));
            let match;
            const matches = [];
            
            // Buscar todas as ocorrências
            const globalPattern = new RegExp(valuePattern.source, valuePattern.flags.includes('g') ? valuePattern.flags : valuePattern.flags + 'g');
            let searchText = context;
            while ((match = globalPattern.exec(searchText)) !== null) {
                matches.push({
                    value: match[1] || match[0],
                    index: match.index
                });
                // Evitar loop infinito
                if (!globalPattern.global) break;
            }
            
            if (matches.length > 0) {
                // Priorizar matches que vêm depois da palavra-chave
                const keywordPosInContext = keywordIndex - start;
                for (const match of matches) {
                    if (match.index > keywordPosInContext) {
                        return match.value.trim();
                    }
                }
                // Se não encontrou depois, pegar o mais próximo
                return matches[0].value.trim();
            }
        }
    }
    
    return null;
}

/**
 * Extrai CPF do texto usando múltiplas estratégias
 */
function extractCPF(text) {
    // Múltiplas palavras-chave possíveis
    const keywords = ['cpf', 'documento cpf', 'cpf nº', 'cpf n°', 'cpf número', 'cpf numero'];
    
    // Padrões para CPF (com e sem formatação)
    const patterns = [
        /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,
        /\b(\d{11})\b/g
    ];
    
    for (const pattern of patterns) {
        const value = findValueNearKeyword(text, keywords, pattern, 50);
        if (value) {
            // Validar CPF (deve ter 11 dígitos)
            const digits = value.replace(/\D/g, '');
            if (digits.length === 11) {
                return value;
            }
        }
    }
    
    // Fallback: buscar qualquer CPF no texto
    const fallbackMatch = text.match(/\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/);
    if (fallbackMatch) {
        return fallbackMatch[1];
    }
    
    return null;
}

/**
 * Extrai RG do texto usando múltiplas estratégias
 */
function extractRG(text) {
    const keywords = ['rg', 'documento rg', 'rg nº', 'rg n°', 'rg número', 'rg numero', 'identidade'];
    const pattern = /\b(\d{1,2}\.?\d{3}\.?\d{3}-?\d{0,2})\b/g;
    
    const value = findValueNearKeyword(text, keywords, pattern, 50);
    if (value) {
        return value;
    }
    
    // Fallback
    const fallbackMatch = text.match(/\b(\d{1,2}\.?\d{3}\.?\d{3}-?\d{0,2})\b/);
    if (fallbackMatch) {
        return fallbackMatch[1];
    }
    
    return null;
}

/**
 * Extrai nome completo do texto (proprietário)
 */
function extractNome(text) {
    // Palavra-chave específica do PDF: "Vinculado a:"
    const keywords = [
        'vinculado a', 'vinculado a:', 'vinculado'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            // Buscar texto após "Vinculado a:" (até 150 caracteres)
            const context = normalizedText.substring(index, index + 150);
            const afterKeyword = context.substring(keyword.length).trim();
            
            // Remover ":" se houver
            let searchText = afterKeyword.replace(/^:\s*/, '').trim();
            
            // Buscar nome completo (mínimo 2 palavras, começando com maiúscula)
            // Parar em quebras de linha, dois pontos, ou palavras-chave de outros campos
            const nomeMatch = searchText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+){1,})/);
            if (nomeMatch) {
                let nome = nomeMatch[1].trim();
                
                // Validar que não é uma palavra-chave ou campo do formulário
                const invalidWords = [
                    'genesis', 'matrícula', 'matricula', 'artigo', 'data', 'quantidade', 
                    'espécie', 'especie', 'tipo', 'descrição', 'descricao', 'nascimento',
                    'dt', 'data de', 'data nascimento', 'cpf', 'rg', 'documento'
                ];
                const lowerNome = nome.toLowerCase();
                
                // Verificar se contém palavras inválidas
                if (invalidWords.some(word => lowerNome.includes(word))) {
                    continue;
                }
                
                // Verificar se não começa com abreviações comuns de campos
                if (lowerNome.match(/^(dt|data|cpf|rg|nasc|nascimento)/)) {
                    continue;
                }
                
                // Limitar tamanho do nome (nomes muito longos provavelmente estão errados)
                if (nome.length > 100) {
                    // Tentar pegar apenas as primeiras palavras
                    const words = nome.split(/\s+/);
                    if (words.length > 5) {
                        nome = words.slice(0, 5).join(' ');
                    }
                }
                
                return nome;
            }
        }
    }
    
    return null;
}

/**
 * Extrai data de apreensão do texto (apenas data, sem horário)
 */
function extractDataApreensao(text) {
    // Palavra-chave específica do PDF: "Chegada Local"
    const keywords = [
        'chegada local', 'chegada local:', 'chegada'
    ];
    
    // Padrões para data (dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa)
    // Buscar data sem horário (evitar padrões com hora)
    const pattern = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const keywordIndex = lowerText.indexOf(lowerKeyword);
        
        if (keywordIndex !== -1) {
            // Buscar no contexto após a palavra-chave (até 100 caracteres)
            const start = keywordIndex;
            const end = Math.min(normalizedText.length, keywordIndex + keyword.length + 100);
            const context = normalizedText.substring(start, end);
            
            // Buscar primeira data no contexto (ignorar horários)
            const dateMatch = context.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
            if (dateMatch) {
                const dateValue = dateMatch[1];
                // Normalizar formato para dd/mm/aaaa
                const normalized = dateValue.replace(/[-\.]/g, '/');
                // Validar que é uma data válida
                const parts = normalized.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                        // Formatar ano com 4 dígitos
                        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
                        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${fullYear}`;
                    }
                }
            }
        }
    }
    
    // Fallback: buscar outras palavras-chave
    const fallbackKeywords = [
        'data da apreensão', 'data de apreensão', 'data apreensão', 'data da apreensao', 
        'data de apreensao', 'data apreensao', 'data', 'dia', 'ocorreu em', 'ocorrido em'
    ];
    
    const fallbackValue = findValueNearKeyword(text, fallbackKeywords, pattern, 60);
    if (fallbackValue) {
        const normalized = fallbackValue.replace(/[-\.]/g, '/');
        const parts = normalized.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
                return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${fullYear}`;
            }
        }
    }
    
    return null;
}

/**
 * Extrai número Genesis do texto
 */
function extractNumeroGenesis(text) {
    const keywords = [
        'número genesis', 'numero genesis', 'nº genesis', 'n° genesis', 
        'genesis', 'genesis nº', 'genesis n°', 'genesis número', 'genesis numero',
        'ocorrência', 'ocorrencia', 'número da ocorrência', 'numero da ocorrencia'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            // Buscar número após a palavra-chave (até 100 caracteres)
            const context = normalizedText.substring(index, index + 100);
            const afterKeyword = context.substring(keyword.length).trim();
            
            // Buscar número (4 ou mais dígitos, mas não anos comuns)
            const numberMatch = afterKeyword.match(/\b(\d{4,})\b/);
            if (numberMatch) {
                const numero = numberMatch[1];
                const numValue = parseInt(numero);
                
                // Validar que não é um ano (1900-2100) a menos que tenha mais de 4 dígitos
                if (numero.length === 4) {
                    if (numValue >= 1900 && numValue <= 2100) {
                        // Provavelmente é um ano, pular
                        continue;
                    }
                }
                
                // Validar que não é um CPF ou RG (muitos dígitos)
                if (numero.length >= 10) {
                    // Pode ser CPF ou RG, pular
                    continue;
                }
                
                return numero;
            }
        }
    }
    
    return null;
}

/**
 * Extrai Nº PJE (Nº Procedimento) do texto
 */
function extractNumeroPje(text) {
    // Palavra-chave específica do PDF: "Nº Procedimento:"
    const keywords = [
        'nº procedimento:', 'n° procedimento:', 'numero procedimento:', 'número procedimento:',
        'nº procedimento', 'n° procedimento', 'numero procedimento', 'número procedimento'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 100);
            const afterKeyword = context.substring(keyword.length).trim();
            
            // Remover ":" se houver
            let searchText = afterKeyword.replace(/^:\s*/, '').trim();
            
            // Buscar padrão de processo PJE (geralmente números com formatação ou alfanumérico)
            // Primeiro tentar padrão numérico com formatação (ex: 1234567-12.2025.8.07.0001)
            const pjeMatch = searchText.match(/^([0-9]{7,}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4})/);
            if (pjeMatch) {
                return pjeMatch[1];
            }
            
            // Tentar padrão numérico simples (mínimo 6 dígitos)
            const numMatch = searchText.match(/^([0-9]{6,})/);
            if (numMatch) {
                return numMatch[1];
            }
            
            // Tentar padrão alfanumérico (mas não palavras comuns)
            const invalidWords = ['ilesa', 'não', 'nao', 'sem', 'inexistente', 'n/a', 'n/a'];
            const alphanumMatch = searchText.match(/^([A-Z0-9\-\.\/]{3,30})/);
            if (alphanumMatch) {
                const value = alphanumMatch[1].trim().toUpperCase();
                // Verificar se não é uma palavra inválida
                if (!invalidWords.some(word => value.toLowerCase().includes(word))) {
                    // Verificar se contém pelo menos um número (processos geralmente têm números)
                    if (/\d/.test(value)) {
                        return value;
                    }
                }
            }
        }
    }
    
    return null;
}

/**
 * Extrai matrícula do texto (na seção POLICIAL/GUARNIÇÃO)
 */
function extractMatricula(text) {
    // Buscar na seção específica do policial
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    // Encontrar seção do policial
    let policialSectionIndex = lowerText.indexOf('policial/guarnição responsável pelo atendimento');
    if (policialSectionIndex === -1) {
        // Tentar variações
        const variations = [
            'policial/guarnição',
            'policial guarnição',
            'policial responsável',
            'guarnição responsável'
        ];
        for (const variation of variations) {
            const index = lowerText.indexOf(variation);
            if (index !== -1) {
                policialSectionIndex = index;
                break;
            }
        }
    }
    
    if (policialSectionIndex !== -1) {
        // Buscar "Matrícula:" na seção do policial (até 500 caracteres após)
        const sectionText = normalizedText.substring(policialSectionIndex, policialSectionIndex + 500);
        const sectionLower = sectionText.toLowerCase();
        
        const keywords = ['matrícula:', 'matricula:', 'matrícula', 'matricula'];
        for (const keyword of keywords) {
            const index = sectionLower.indexOf(keyword.toLowerCase());
            if (index !== -1) {
                const afterKeyword = sectionText.substring(index + keyword.length).trim();
                // Buscar número de 4 ou mais dígitos
                const match = afterKeyword.match(/^[:\-]?\s*(\d{4,})/);
                if (match) {
                    return match[1];
                }
            }
        }
    }
    
    // Fallback: buscar em todo o texto
    const fallbackKeywords = [
        'matrícula', 'matricula', 'matrícula nº', 'matricula nº', 'matrícula n°', 
        'matricula n°', 'matrícula número', 'matricula numero', 'registro', 'reg'
    ];
    
    const pattern = /\b(\d{4,})\b/g;
    const value = findValueNearKeyword(text, fallbackKeywords, pattern, 50);
    if (value) {
        return value;
    }
    
    return null;
}

/**
 * Extrai espécie do texto
 */
function extractEspecie(text) {
    const keywords = [
        'espécie', 'especie', 'tipo', 'natureza', 'classificação', 'classificacao'
    ];
    
    const normalizedText = text.toUpperCase();
    
    // Buscar palavras-chave e contexto
    for (const keyword of keywords) {
        const index = normalizedText.indexOf(keyword.toUpperCase());
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 100);
            
            // Verificar cada tipo de espécie
            if (context.includes('SUBSTÂNCIA') || context.includes('SUBSTANCIA')) {
                return 'SUBSTÂNCIA';
            }
            if (context.includes('OBJETO')) {
                return 'OBJETO';
            }
            if (context.includes('SIMULACRO')) {
                return 'SIMULACRO';
            }
            if (context.includes('ARMA') && context.includes('BRANCA')) {
                return 'ARMA BRANCA';
            }
        }
    }
    
    // Busca direta no texto
    if (normalizedText.includes('SUBSTÂNCIA') || normalizedText.includes('SUBSTANCIA')) {
        return 'SUBSTÂNCIA';
    }
    if (normalizedText.includes('OBJETO')) {
        return 'OBJETO';
    }
    if (normalizedText.includes('SIMULACRO')) {
        return 'SIMULACRO';
    }
    if (normalizedText.includes('ARMA BRANCA') || (normalizedText.includes('ARMA') && normalizedText.includes('BRANCA'))) {
        return 'ARMA BRANCA';
    }
    
    return null;
}

/**
 * Extrai artigo do texto
 */
function extractArtigo(text) {
    const keywords = [
        'artigo', 'art.', 'art ', 'lei', 'infração', 'infracao', 'tipificação', 'tipificacao'
    ];
    
    // Padrão para artigo (números com possíveis vírgulas)
    const pattern = /\b(\d+(?:\s*,\s*\d+)*)\b/g;
    
    const value = findValueNearKeyword(text, keywords, pattern, 50);
    if (value) {
        return value;
    }
    
    // Buscar padrão "art. X" ou "artigo X"
    const artMatch = text.match(/(?:art\.?|artigo)\s*(\d+(?:\s*,\s*\d+)*)/i);
    if (artMatch) {
        return artMatch[1];
    }
    
    return null;
}

/**
 * Extrai quantidade do texto
 */
function extractQuantidade(text) {
    const keywords = [
        'quantidade', 'qtd', 'qtd.', 'peso', 'gramas', 'grama', 'kg', 'kilograma', 
        'kilogramas', 'unidade', 'unidades', 'un', 'un.'
    ];
    
    // Padrão para quantidade (números com possíveis decimais e unidades)
    const pattern = /\b(\d+(?:[.,]\d+)?)\s*(?:mg|g|kg|t|un|unidade|unidades)?\b/gi;
    
    const value = findValueNearKeyword(text, keywords, pattern, 50);
    if (value) {
        // Normalizar vírgula para ponto
        return value.replace(',', '.');
    }
    
    return null;
}

/**
 * Extrai item apreendido do texto
 */
function extractItem(text) {
    // Palavra-chave específica do PDF: "Tipo:"
    const keywords = [
        'tipo:', 'tipo'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 200);
            const afterKeyword = context.substring(keyword.length).trim();
            
            // Remover ":" se houver
            let searchText = afterKeyword.replace(/^:\s*/, '').trim();
            
            // Buscar texto até encontrar palavras-chave de outros campos ou caracteres de parada
            const stopWords = ['descrição', 'descricao', 'vinculado', 'chegada', 'natureza', 'procedimento', 'policial', 'matrícula', 'matricula'];
            let item = '';
            
            // Buscar texto válido (começando com maiúscula)
            const match = searchText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\.\n]{3,150})/);
            if (match) {
                item = match[1].trim();
                
                // Parar em palavras-chave de outros campos
                for (const stopWord of stopWords) {
                    const stopIndex = item.toLowerCase().indexOf(stopWord.toLowerCase());
                    if (stopIndex > 10) { // Só parar se não for no início
                        item = item.substring(0, stopIndex).trim();
                        break;
                    }
                }
                
                // Remover informações de valor (R$)
                item = item.replace(/\s*R\$\s*\d+[.,]?\d*/gi, '').trim();
                
                // Remover "APREENDIDO PM" se estiver no início
                item = item.replace(/^APREENDIDO\s+PM\s+/i, '').trim();
                
                // Limitar tamanho (itens muito longos provavelmente estão errados)
                if (item.length > 100) {
                    // Tentar pegar até o primeiro ponto ou vírgula significativa
                    const shortMatch = item.match(/^([^\.]{10,100})/);
                    if (shortMatch) {
                        item = shortMatch[1].trim();
                    } else {
                        item = item.substring(0, 100).trim();
                    }
                }
                
                // Validar que não é só número ou data
                if (!item.match(/^\d+$/) && !item.match(/^\d{2}[\/\-\.]\d{2}/) && item.length > 3) {
                    return item;
                }
            }
        }
    }
    
    return null;
}

/**
 * Extrai descrição do item do texto
 */
function extractDescricao(text) {
    // Palavra-chave específica do PDF: "Descrição:"
    const keywords = [
        'descrição:', 'descricao:', 'descrição', 'descricao'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 600);
            const afterKeyword = context.substring(keyword.length).trim();
            
            // Remover ":" se houver
            let searchText = afterKeyword.replace(/^:\s*/, '').trim();
            
            // Buscar texto válido
            const match = searchText.match(/^(.{10,400})/);
            if (match) {
                let descricao = match[1].trim();
                
                // Limpar quebras de linha e espaços extras
                descricao = descricao.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                
                // Parar em informações de página/impressão
                const pagePatterns = [
                    /página\s+\d+\s+de\s+\d+/i,
                    /página\s+\d+/i,
                    /impresso\s+em/i,
                    /imprimido\s+em/i,
                    /\d{2}\/\d{2}\/\d{4}\s+às\s+\d{2}:\d{2}:\d{2}/i
                ];
                
                for (const pattern of pagePatterns) {
                    const pageIndex = descricao.search(pattern);
                    if (pageIndex > 10) {
                        descricao = descricao.substring(0, pageIndex).trim();
                        break;
                    }
                }
                
                // Parar em palavras-chave de outros campos
                const stopWords = ['vinculado', 'tipo:', 'chegada', 'natureza', 'procedimento', 'policial', 'matrícula', 'matricula', 'posto', 'grad', 'registro de atividade'];
                for (const stopWord of stopWords) {
                    const stopIndex = descricao.toLowerCase().indexOf(stopWord.toLowerCase());
                    if (stopIndex > 10) {
                        descricao = descricao.substring(0, stopIndex).trim();
                        break;
                    }
                }
                
                // Remover informações de valor repetidas
                descricao = descricao.replace(/\s*R\$\s*\d+[.,]?\d*/gi, '').trim();
                
                // Remover "Tipo:" se estiver no início
                descricao = descricao.replace(/^tipo:\s*/i, '').trim();
                
                if (descricao.length > 10) {
                    return descricao;
                }
            }
        }
    }
    
    return null;
}

/**
 * Extrai lei infringida do texto
 */
function extractLeiInfringida(text) {
    // Palavra-chave específica do PDF: "Natureza(s):"
    const keywords = [
        'natureza(s):', 'natureza(s)', 'natureza:', 'natureza'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword.toLowerCase());
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 150);
            const afterKeyword = context.substring(keyword.length).trim();
            // Buscar padrão de lei (ex: Lei 11.343/2006, Lei nº 11.343, ou apenas números)
            const leiMatch = afterKeyword.match(/(?:lei\s*(?:n[º°]|n[úu]mero)?\s*)?(\d+\.?\d*\/?\d*)/i);
            if (leiMatch) {
                const leiValue = leiMatch[0].toUpperCase();
                // Se não começou com "Lei", adicionar
                if (!leiValue.toUpperCase().startsWith('LEI')) {
                    return `LEI ${leiValue}`.toUpperCase();
                }
                return leiValue;
            }
            // Se não encontrou padrão de lei, buscar qualquer texto após a palavra-chave
            const textMatch = afterKeyword.match(/^[:\-]?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^\.\n]{3,100})/);
            if (textMatch) {
                return textMatch[1].trim().toUpperCase();
            }
        }
    }
    
    // Fallback: buscar outras palavras-chave
    const fallbackKeywords = [
        'lei', 'lei nº', 'lei n°', 'lei número', 'lei numero', 
        'infringida', 'violada', 'transgredida'
    ];
    
    const pattern = /lei\s*(?:n[º°]|n[úu]mero)?\s*(\d+\.?\d*\/?\d*)/gi;
    const value = findValueNearKeyword(text, fallbackKeywords, pattern, 50);
    if (value) {
        return value.toUpperCase();
    }
    
    // Buscar padrão "Lei X" no texto
    const leiMatch = text.match(/lei\s*(?:n[º°]|n[úu]mero)?\s*(\d+\.?\d*\/?\d*)/i);
    if (leiMatch) {
        return leiMatch[0].toUpperCase();
    }
    
    return null;
}

/**
 * Extrai unidade do texto
 */
function extractUnidade(text) {
    const keywords = [
        'unidade', 'bpm', 'batalhão', 'batalhao', 'comando', 'delegacia'
    ];
    
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    for (const keyword of keywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
            const context = normalizedText.substring(Math.max(0, index - 30), index + 100);
            // Buscar padrão como "8º BPM", "10º BPM", etc.
            const bpmMatch = context.match(/(\d+[º°]\s*BPM)/i);
            if (bpmMatch) {
                return bpmMatch[1].toUpperCase();
            }
        }
    }
    
    return null;
}

/**
 * Extrai nome do policial do texto (na seção POLICIAL/GUARNIÇÃO)
 */
function extractNomePolicial(text) {
    // Buscar na seção específica do policial
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    // Encontrar seção do policial
    let policialSectionIndex = lowerText.indexOf('policial/guarnição responsável pelo atendimento');
    if (policialSectionIndex === -1) {
        // Tentar variações
        const variations = [
            'policial/guarnição',
            'policial guarnição',
            'policial responsável',
            'guarnição responsável'
        ];
        for (const variation of variations) {
            const index = lowerText.indexOf(variation);
            if (index !== -1) {
                policialSectionIndex = index;
                break;
            }
        }
    }
    
    if (policialSectionIndex !== -1) {
        // Buscar "Nome:" na seção do policial (até 500 caracteres após)
        const sectionText = normalizedText.substring(policialSectionIndex, policialSectionIndex + 500);
        const sectionLower = sectionText.toLowerCase();
        
        const keywords = ['nome:', 'nome'];
        for (const keyword of keywords) {
            const index = sectionLower.indexOf(keyword.toLowerCase());
            if (index !== -1) {
                const afterKeyword = sectionText.substring(index + keyword.length).trim();
                
                // Remover ":" se houver
                let searchText = afterKeyword.replace(/^:\s*/, '').trim();
                
                // Buscar nome completo (mínimo 2 palavras, começando com maiúscula)
                // Parar em números de matrícula, graduações, ou outras palavras-chave
                const nomeMatch = searchText.match(/^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+){1,})/);
                if (nomeMatch) {
                    let nome = nomeMatch[1].trim();
                    
                    // Parar em números de matrícula (geralmente 8 dígitos após o nome)
                    const matriculaMatch = nome.match(/^(.+?)\s+\d{6,}/);
                    if (matriculaMatch) {
                        nome = matriculaMatch[1].trim();
                    }
                    
                    // Parar em abreviações de graduação
                    const gradAbbrev = /\s+(SD|CB|SGT|ST|ASP|TEN|CAP|MAJ|TC|CEL|PATRULHEIRO|QPPMC)/i;
                    const gradMatch = nome.match(new RegExp('^(.+?)' + gradAbbrev.source));
                    if (gradMatch) {
                        nome = gradMatch[1].trim();
                    }
                    
                    // Limitar tamanho (nomes muito longos provavelmente estão errados)
                    if (nome.length > 80) {
                        const words = nome.split(/\s+/);
                        if (words.length > 5) {
                            nome = words.slice(0, 5).join(' ');
                        } else {
                            nome = nome.substring(0, 80).trim();
                        }
                    }
                    
                    // Validar que não é uma palavra-chave
                    const invalidWords = ['genesis', 'matrícula', 'matricula', 'artigo', 'data', 'tipo', 'descrição', 'descricao', 'patrulheiro', 'qppmc'];
                    const lowerNome = nome.toLowerCase();
                    if (!invalidWords.some(word => lowerNome.includes(word)) && nome.length > 3) {
                        return nome;
                    }
                }
            }
        }
    }
    
    // Fallback: buscar em todo o texto
    const fallbackKeywords = [
        'policial', 'policial militar', 'pm', 'agente', 'soldado', 'cabo', 
        'sargento', 'tenente', 'capitão', 'capitao', 'major', 'coronel'
    ];
    
    const pattern = /\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+){1,})\b/g;
    const value = findValueNearKeyword(text, fallbackKeywords, pattern, 80);
    if (value) {
        const lowerValue = value.toLowerCase();
        const invalidWords = ['genesis', 'matrícula', 'matricula', 'artigo', 'data'];
        if (!invalidWords.some(word => lowerValue.includes(word))) {
            return value;
        }
    }
    
    return null;
}

/**
 * Mapeia abreviações de graduação para valores completos
 */
function mapGraduacaoAbreviada(abreviacao) {
    const map = {
        // Soldados
        'SD': 'Soldado de 2ª Classe',
        'SD 2ª CL': 'Soldado de 2ª Classe',
        'SD 2ª CLASSE': 'Soldado de 2ª Classe',
        'SOLDADO 2ª CL': 'Soldado de 2ª Classe',
        'SOLDADO 2ª CLASSE': 'Soldado de 2ª Classe',
        '1ª CL': 'Soldado de 1ª Classe',
        'SD 1ª CL': 'Soldado de 1ª Classe',
        'SD 1ª CLASSE': 'Soldado de 1ª Classe',
        'SOLDADO 1ª CL': 'Soldado de 1ª Classe',
        'SOLDADO 1ª CLASSE': 'Soldado de 1ª Classe',
        // Cabo
        'CB': 'Cabo',
        'CABO': 'Cabo',
        // Sargentos
        '3º SGT': '3º Sargento',
        '3º SARGENTO': '3º Sargento',
        '3 SGT': '3º Sargento',
        '3 SARGENTO': '3º Sargento',
        '2º SGT': '2º Sargento',
        '2º SARGENTO': '2º Sargento',
        '2 SGT': '2º Sargento',
        '2 SARGENTO': '2º Sargento',
        '1º SGT': '1º Sargento',
        '1º SARGENTO': '1º Sargento',
        '1 SGT': '1º Sargento',
        '1 SARGENTO': '1º Sargento',
        // Subtenente
        'ST': 'Subtenente',
        'SUBTENENTE': 'Subtenente',
        // Aspirante
        'ASP': 'Aspirante-a-Oficial',
        'ASPIRANTE': 'Aspirante-a-Oficial',
        // Tenentes
        '2º TEN': 'Segundo-Tenente',
        '2º TENENTE': 'Segundo-Tenente',
        '2 TEN': 'Segundo-Tenente',
        '2 TENENTE': 'Segundo-Tenente',
        '1º TEN': 'Primeiro-Tenente',
        '1º TENENTE': 'Primeiro-Tenente',
        '1 TEN': 'Primeiro-Tenente',
        '1 TENENTE': 'Primeiro-Tenente',
        // Capitão
        'CAP': 'Capitão',
        'CAPITÃO': 'Capitão',
        'CAPITAO': 'Capitão',
        // Major
        'MAJ': 'Major',
        'MAJOR': 'Major',
        // Tenente-Coronel
        'TC': 'Tenente-Coronel',
        'TEN CEL': 'Tenente-Coronel',
        'TENENTE-CORONEL': 'Tenente-Coronel',
        // Coronel
        'CEL': 'Coronel',
        'CORONEL': 'Coronel'
    };
    
    const upperAbrev = abreviacao.toUpperCase().trim();
    return map[upperAbrev] || null;
}

/**
 * Extrai graduação do texto (na seção POLICIAL/GUARNIÇÃO)
 */
function extractGraduacao(text) {
    // Buscar na seção específica do policial
    const normalizedText = normalizeText(text);
    const lowerText = normalizedText.toLowerCase();
    
    // Encontrar seção do policial
    let policialSectionIndex = lowerText.indexOf('policial/guarnição responsável pelo atendimento');
    if (policialSectionIndex === -1) {
        // Tentar variações
        const variations = [
            'policial/guarnição',
            'policial guarnição',
            'policial responsável',
            'guarnição responsável'
        ];
        for (const variation of variations) {
            const index = lowerText.indexOf(variation);
            if (index !== -1) {
                policialSectionIndex = index;
                break;
            }
        }
    }
    
    if (policialSectionIndex !== -1) {
        // Buscar "Posto/Grad." na seção do policial (até 500 caracteres após)
        const sectionText = normalizedText.substring(policialSectionIndex, policialSectionIndex + 500);
        const sectionLower = sectionText.toLowerCase();
        
        const keywords = ['posto/grad.', 'posto/grad', 'posto grad', 'posto:', 'grad:', 'graduação:', 'graduacao:'];
        for (const keyword of keywords) {
            const index = sectionLower.indexOf(keyword.toLowerCase());
            if (index !== -1) {
                const afterKeyword = sectionText.substring(index + keyword.length).trim();
                
                // Remover ":" se houver
                let searchText = afterKeyword.replace(/^:\s*/, '').trim();
                
                // Buscar apenas abreviação (2-10 caracteres, pode ter números e símbolos)
                // Parar em espaços ou caracteres que indicam fim
                const abbrevMatch = searchText.match(/^([A-Z0-9ºª\s]{2,15})/);
                if (abbrevMatch) {
                    let gradValue = abbrevMatch[1].trim();
                    
                    // Limitar a primeira palavra ou abreviação (até espaço ou número de matrícula)
                    const firstPart = gradValue.split(/\s+/)[0];
                    
                    // Tentar mapear abreviação primeiro
                    const mapped = mapGraduacaoAbreviada(firstPart);
                    if (mapped) {
                        return mapped;
                    }
                    
                    // Tentar mapear com o valor completo também
                    const mappedFull = mapGraduacaoAbreviada(gradValue);
                    if (mappedFull) {
                        return mappedFull;
                    }
                    
                    // Se não mapeou, verificar se contém abreviações conhecidas no texto
                    const abbrevPatterns = [
                        /\b(SD|SOLDADO)\s*(?:DE\s*)?(?:2ª|2|SEGUNDA)?\s*(?:CLASSE|CL)?/i,
                        /\b(SD|SOLDADO)\s*(?:DE\s*)?(?:1ª|1|PRIMEIRA)?\s*(?:CLASSE|CL)?/i,
                        /\b(CB|CABO)\b/i,
                        /\b(3º|3)\s*(SGT|SARGENTO)\b/i,
                        /\b(2º|2)\s*(SGT|SARGENTO)\b/i,
                        /\b(1º|1)\s*(SGT|SARGENTO)\b/i,
                        /\b(ST|SUBTENENTE)\b/i,
                        /\b(ASP|ASPIRANTE)\b/i,
                        /\b(2º|2)\s*(TEN|TENENTE)\b/i,
                        /\b(1º|1)\s*(TEN|TENENTE)\b/i,
                        /\b(CAP|CAPITÃO|CAPITAO)\b/i,
                        /\b(MAJ|MAJOR)\b/i,
                        /\b(TC|TEN\s*CEL|TENENTE-CORONEL)\b/i,
                        /\b(CEL|CORONEL)\b/i
                    ];
                    
                    for (const pattern of abbrevPatterns) {
                        const match = gradValue.match(pattern);
                        if (match) {
                            const abbrev = match[0].toUpperCase().trim();
                            const mapped = mapGraduacaoAbreviada(abbrev);
                            if (mapped) {
                                return mapped;
                            }
                        }
                    }
                    
                    // Se ainda não encontrou, buscar padrão "SD" isolado (pode estar no meio do texto)
                    const sdMatch = gradValue.match(/\b(SD)\b/i);
                    if (sdMatch) {
                        // Por padrão, SD sem especificação é 2ª Classe
                        return 'Soldado de 2ª Classe';
                    }
                }
            }
        }
    }
    
    // Fallback: buscar em todo o texto
    const fallbackKeywords = ['graduação', 'graduacao', 'posto', 'patente', 'hierarquia'];
    const graduacoes = [
        'Soldado de 2ª Classe', 'Soldado de 1ª Classe', 'Cabo', '3º Sargento',
        '2º Sargento', '1º Sargento', 'Subtenente', 'Aspirante-a-Oficial',
        'Segundo-Tenente', 'Primeiro-Tenente', 'Capitão', 'Major',
        'Tenente-Coronel', 'Coronel'
    ];
    
    for (const keyword of fallbackKeywords) {
        const index = lowerText.indexOf(keyword);
        if (index !== -1) {
            const context = normalizedText.substring(index, index + 100);
            for (const graduacao of graduacoes) {
                if (context.toLowerCase().includes(graduacao.toLowerCase())) {
                    return graduacao;
                }
            }
        }
    }
    
    // Busca direta
    for (const graduacao of graduacoes) {
        if (lowerText.includes(graduacao.toLowerCase())) {
            return graduacao;
        }
    }
    
    return null;
}

/**
 * Extrai informações específicas do texto usando múltiplas estratégias inteligentes
 */
function extractFieldsFromText(text) {
    const fields = {};
    
    console.log('Iniciando extração inteligente de campos...');
    
    // Extrair cada campo usando funções especializadas
    fields.cpf = extractCPF(text);
    fields.rg = extractRG(text);
    fields.nome = extractNome(text);
    fields.dataApreensao = extractDataApreensao(text);
    fields.numeroGenesis = extractNumeroGenesis(text);
    fields.numeroPje = extractNumeroPje(text);
    fields.matricula = extractMatricula(text);
    fields.especie = extractEspecie(text);
    fields.artigo = extractArtigo(text);
    fields.quantidade = extractQuantidade(text);
    fields.item = extractItem(text);
    fields.descricao = extractDescricao(text);
    fields.leiInfringida = extractLeiInfringida(text);
    fields.unidade = extractUnidade(text);
    fields.nomePolicial = extractNomePolicial(text);
    fields.graduacao = extractGraduacao(text);
    
    // Log dos campos encontrados
    console.log('Campos extraídos:', Object.keys(fields).filter(k => fields[k] !== null));
    
    return fields;
}

/**
 * Mapeia os campos extraídos para os IDs do formulário
 */
function mapFieldsToForm(extractedFields) {
    const formData = {};
    
    // Função auxiliar para converter strings para maiúsculas
    function toUpperCase(value) {
        return typeof value === 'string' ? value.toUpperCase() : value;
    }
    
    // Mapear CPF/RG
    if (extractedFields.cpf) {
        formData.tipoDocumento = 'CPF';
        // Formatar CPF se necessário
        let cpf = extractedFields.cpf.replace(/\D/g, '');
        if (cpf.length === 11) {
            formData.numeroDocumento = `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9, 11)}`;
        } else {
        formData.numeroDocumento = toUpperCase(extractedFields.cpf);
        }
    } else if (extractedFields.rg) {
        formData.tipoDocumento = 'RG';
        formData.numeroDocumento = toUpperCase(extractedFields.rg);
    }
    
    // Mapear dados da ocorrência
    if (extractedFields.numeroGenesis) {
        formData.numeroGenesis = toUpperCase(extractedFields.numeroGenesis);
    }
    
    if (extractedFields.unidade) {
        formData.unidade = extractedFields.unidade;
    }
    
    if (extractedFields.dataApreensao) {
        formData.dataApreensao = extractedFields.dataApreensao;
    }
    
    if (extractedFields.leiInfringida) {
        formData.leiInfrigida = toUpperCase(extractedFields.leiInfringida);
    }
    
    if (extractedFields.artigo) {
        formData.artigo = toUpperCase(extractedFields.artigo);
    }
    
    if (extractedFields.numeroPje) {
        formData.numeroPje = toUpperCase(extractedFields.numeroPje);
    }
    
    // Mapear dados do item apreendido
    if (extractedFields.especie) {
        // A espécie já vem normalizada da função extractEspecie
        formData.especie = extractedFields.especie;
    }
    
    if (extractedFields.item) {
        formData.item = toUpperCase(extractedFields.item);
    }
    
    if (extractedFields.quantidade) {
        formData.quantidade = toUpperCase(extractedFields.quantidade);
    }
    
    if (extractedFields.descricao) {
        formData.descricaoItem = extractedFields.descricao;
    }
    
    // Mapear dados do proprietário
    if (extractedFields.nome) {
        formData.nomeProprietario = toUpperCase(extractedFields.nome);
    }
    
    // Mapear dados do policial
    if (extractedFields.nomePolicial) {
        formData.nomePolicial = toUpperCase(extractedFields.nomePolicial);
    }
    
    if (extractedFields.matricula) {
        formData.matricula = toUpperCase(extractedFields.matricula);
    }
    
    if (extractedFields.graduacao) {
        formData.graduacao = extractedFields.graduacao;
    }
    
    if (extractedFields.unidade) {
        // Se não tiver unidade da ocorrência, usar a unidade do policial
        if (!formData.unidade) {
            formData.unidadePolicial = extractedFields.unidade;
        } else {
            formData.unidadePolicial = extractedFields.unidade;
        }
    }
    
    console.log('Dados mapeados para o formulário:', Object.keys(formData));
    
    return formData;
}

module.exports = {
    extractTextFromFile,
    extractFieldsFromText,
    mapFieldsToForm
};

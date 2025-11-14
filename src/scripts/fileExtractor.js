// Módulo para extração de texto de diferentes tipos de arquivo
const fs = require('fs');
const path = require('path');

// Importações das bibliotecas de extração
let pdfjsLib, mammoth, Tesseract;

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
            const pdfjsPath = path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
            pdfjsLib = await import('file://' + pdfjsPath.replace(/\\/g, '/'));
            console.log('pdfjs-dist legacy carregado com sucesso');
        }
        
        const dataBuffer = fs.readFileSync(filePath);
        const data = new Uint8Array(dataBuffer);
        
        // Carregar o documento PDF
        const loadingTask = pdfjsLib.getDocument({
            data: data,
            useSystemFonts: true,
            standardFontDataUrl: path.join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts/')
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
 * Extrai informações específicas do texto usando regex
 */
function extractFieldsFromText(text) {
    const fields = {};
    
    // Regex patterns para diferentes campos
    const patterns = {
        // CPF: 000.000.000-00 ou 00000000000
        cpf: /(?:CPF[:\s]*)?(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/gi,
        
        // RG: 0.000.000 ou 00.000.000-0
        rg: /(?:RG[:\s]*)?(\d{1,2}\.?\d{3}\.?\d{3}-?\d{0,1})/gi,
        
        // Nome completo (após palavras-chave)
        nome: /(?:Nome(?:\s+Completo)?[:\s]+)([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+)+)/gi,
        
        // Data de apreensão
        dataApreensao: /(?:Data\s+(?:da\s+)?Apreens[ãa]o[:\s]+)?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
        
        // Número Genesis
        numeroGenesis: /(?:N[úu]mero\s+Genesis[:\s]+)?(\d{4,})/gi,
        
        // Matrícula
        matricula: /(?:Matr[íi]cula[:\s]+)?(\d{4,})/gi,
        
        // Espécie
        especie: /(?:Esp[eé]cie[:\s]+)?(SUBST[AÂ]NCIA|OBJETO|SIMULACRO|ARMA\s+BRANCA)/gi,
        
        // Artigo
        artigo: /(?:Artigo[:\s]+)?(\d+(?:\s*,\s*\d+)*)/gi,
        
        // Quantidade
        quantidade: /(?:Quantidade[:\s]+)?(\d+(?:[.,]\d+)?)\s*(?:mg|g|kg|t|un)?/gi,
    };
    
    // Extrair cada campo
    for (const [field, pattern] of Object.entries(patterns)) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
            // Pegar a primeira ocorrência
            fields[field] = matches[0][1].trim();
        }
    }
    
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
        formData.numeroDocumento = toUpperCase(extractedFields.cpf);
    } else if (extractedFields.rg) {
        formData.tipoDocumento = 'RG';
        formData.numeroDocumento = toUpperCase(extractedFields.rg);
    }
    
    // Mapear outros campos, convertendo para maiúsculas
    if (extractedFields.nome) {
        formData.nomeProprietario = toUpperCase(extractedFields.nome);
    }
    
    if (extractedFields.dataApreensao) {
        formData.dataApreensao = extractedFields.dataApreensao.replace(/-/g, '/');
    }
    
    if (extractedFields.numeroGenesis) {
        formData.numeroGenesis = toUpperCase(extractedFields.numeroGenesis);
    }
    
    if (extractedFields.matricula) {
        formData.matricula = toUpperCase(extractedFields.matricula);
    }
    
    if (extractedFields.artigo) {
        formData.artigo = toUpperCase(extractedFields.artigo);
    }
    
    if (extractedFields.quantidade) {
        formData.quantidade = toUpperCase(extractedFields.quantidade);
    }
    
    if (extractedFields.especie) {
        // Normalizar a espécie para corresponder às opções do select
        let especie = extractedFields.especie.toUpperCase();
        if (especie.includes('SUBSTANCIA') || especie.includes('SUBSTÂNCIA')) {
            formData.especie = 'SUBSTÂNCIA';
        } else if (especie.includes('OBJETO')) {
            formData.especie = 'OBJETO';
        } else if (especie.includes('SIMULACRO')) {
            formData.especie = 'SIMULACRO';
        } else if (especie.includes('ARMA') && especie.includes('BRANCA')) {
            formData.especie = 'ARMA BRANCA';
        } else {
            formData.especie = especie; // Manter o valor original se não corresponder
        }
    }
    
    return formData;
}

module.exports = {
    extractTextFromFile,
    extractFieldsFromText,
    mapFieldsToForm
};

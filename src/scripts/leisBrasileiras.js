/**
 * Base de dados das principais leis brasileiras
 * Organizada por categoria para facilitar a busca
 */

const leisBrasileiras = [
    // Constituição Federal
    {
        sigla: "CF",
        nome: "Constituição Federal",
        descricao: "Constituição da República Federativa do Brasil de 1988",
        ano: "1988",
        categoria: "constitucional"
    },
    
    // Códigos Penais
    {
        sigla: "CP",
        nome: "Código Penal",
        descricao: "Decreto-Lei nº 2.848, de 7 de dezembro de 1940",
        ano: "1940",
        categoria: "penal"
    },
    {
        sigla: "CPP",
        nome: "Código de Processo Penal",
        descricao: "Decreto-Lei nº 3.689, de 3 de outubro de 1941",
        ano: "1941",
        categoria: "processual"
    },
    {
        sigla: "LCP",
        nome: "Lei das Contravenções Penais",
        descricao: "Decreto-Lei nº 3.688, de 3 de outubro de 1941",
        ano: "1941",
        categoria: "penal"
    },
    
    // Leis de Drogas
    {
        sigla: "Lei 11.343/06",
        nome: "Lei de Drogas",
        descricao: "Lei nº 11.343, de 23 de agosto de 2006 - Sistema Nacional de Políticas Públicas sobre Drogas",
        ano: "2006",
        categoria: "drogas"
    },
    
    // Estatutos
    {
        sigla: "ECA",
        nome: "Estatuto da Criança e do Adolescente",
        descricao: "Lei nº 8.069, de 13 de julho de 1990",
        ano: "1990",
        categoria: "estatuto"
    },
    {
        sigla: "Estatuto do Idoso",
        nome: "Estatuto do Idoso",
        descricao: "Lei nº 10.741, de 1º de outubro de 2003",
        ano: "2003",
        categoria: "estatuto"
    },
    {
        sigla: "Estatuto do Desarmamento",
        nome: "Estatuto do Desarmamento",
        descricao: "Lei nº 10.826, de 22 de dezembro de 2003",
        ano: "2003",
        categoria: "armas"
    },
    
    // Leis de Trânsito
    {
        sigla: "CTB",
        nome: "Código de Trânsito Brasileiro",
        descricao: "Lei nº 9.503, de 23 de setembro de 1997",
        ano: "1997",
        categoria: "transito"
    },
    
    // Lei Maria da Penha
    {
        sigla: "Lei Maria da Penha",
        nome: "Lei Maria da Penha",
        descricao: "Lei nº 11.340, de 7 de agosto de 2006 - Violência Doméstica e Familiar contra a Mulher",
        ano: "2006",
        categoria: "violencia_domestica"
    },
    
    // Leis Ambientais
    {
        sigla: "Lei 9.605/98",
        nome: "Lei de Crimes Ambientais",
        descricao: "Lei nº 9.605, de 12 de fevereiro de 1998",
        ano: "1998",
        categoria: "ambiental"
    },
    
    // Leis Eleitorais
    {
        sigla: "Código Eleitoral",
        nome: "Código Eleitoral",
        descricao: "Lei nº 4.737, de 15 de julho de 1965",
        ano: "1965",
        categoria: "eleitoral"
    },
    
    // Leis Tributárias
    {
        sigla: "CTN",
        nome: "Código Tributário Nacional",
        descricao: "Lei nº 5.172, de 25 de outubro de 1966",
        ano: "1966",
        categoria: "tributario"
    },
    
    // Leis Trabalhistas
    {
        sigla: "CLT",
        nome: "Consolidação das Leis do Trabalho",
        descricao: "Decreto-Lei nº 5.452, de 1º de maio de 1943",
        ano: "1943",
        categoria: "trabalhista"
    },
    
    // Código Civil
    {
        sigla: "CC",
        nome: "Código Civil",
        descricao: "Lei nº 10.406, de 10 de janeiro de 2002",
        ano: "2002",
        categoria: "civil"
    },
    {
        sigla: "CPC",
        nome: "Código de Processo Civil",
        descricao: "Lei nº 13.105, de 16 de março de 2015",
        ano: "2015",
        categoria: "processual"
    },
    
    // Leis Específicas Importantes
    {
        sigla: "Lei 8.072/90",
        nome: "Lei dos Crimes Hediondos",
        descricao: "Lei nº 8.072, de 25 de julho de 1990",
        ano: "1990",
        categoria: "penal"
    },
    {
        sigla: "Lei 9.099/95",
        nome: "Lei dos Juizados Especiais",
        descricao: "Lei nº 9.099, de 26 de setembro de 1995",
        ano: "1995",
        categoria: "processual"
    },
    {
        sigla: "Lei 12.850/13",
        nome: "Lei das Organizações Criminosas",
        descricao: "Lei nº 12.850, de 2 de agosto de 2013",
        ano: "2013",
        categoria: "penal"
    },
    {
        sigla: "Lei 9.613/98",
        nome: "Lei de Lavagem de Dinheiro",
        descricao: "Lei nº 9.613, de 3 de março de 1998",
        ano: "1998",
        categoria: "financeiro"
    },
    {
        sigla: "Lei 8.137/90",
        nome: "Lei dos Crimes contra a Ordem Tributária",
        descricao: "Lei nº 8.137, de 27 de dezembro de 1990",
        ano: "1990",
        categoria: "tributario"
    },
    {
        sigla: "Lei 7.716/89",
        nome: "Lei do Racismo",
        descricao: "Lei nº 7.716, de 5 de janeiro de 1989",
        ano: "1989",
        categoria: "discriminacao"
    },
    {
        sigla: "Lei 8.078/90",
        nome: "Código de Defesa do Consumidor",
        descricao: "Lei nº 8.078, de 11 de setembro de 1990",
        ano: "1990",
        categoria: "consumidor"
    },
    {
        sigla: "Lei 12.965/14",
        nome: "Marco Civil da Internet",
        descricao: "Lei nº 12.965, de 23 de abril de 2014",
        ano: "2014",
        categoria: "digital"
    },
    {
        sigla: "Lei 13.709/18",
        nome: "Lei Geral de Proteção de Dados (LGPD)",
        descricao: "Lei nº 13.709, de 14 de agosto de 2018",
        ano: "2018",
        categoria: "digital"
    }
];

/**
 * Função para buscar leis por termo
 * @param {string} termo - Termo de busca
 * @returns {Array} Array de leis que correspondem ao termo
 */
function buscarLeis(termo) {
    if (!termo || termo.length < 1) {
        return leisBrasileiras.slice(0, 10); // Retorna as primeiras 10 se não houver termo
    }
    
    const termoLower = termo.toLowerCase();
    
    return leisBrasileiras.filter(lei => {
        return lei.sigla.toLowerCase().includes(termoLower) ||
               lei.nome.toLowerCase().includes(termoLower) ||
               lei.descricao.toLowerCase().includes(termoLower) ||
               lei.categoria.toLowerCase().includes(termoLower);
    }).slice(0, 15); // Limita a 15 resultados
}

/**
 * Função para obter leis por categoria
 * @param {string} categoria - Categoria da lei
 * @returns {Array} Array de leis da categoria especificada
 */
function obterLeisPorCategoria(categoria) {
    return leisBrasileiras.filter(lei => lei.categoria === categoria);
}

/**
 * Função para obter todas as categorias disponíveis
 * @returns {Array} Array de categorias únicas
 */
function obterCategorias() {
    const categorias = [...new Set(leisBrasileiras.map(lei => lei.categoria))];
    return categorias.sort();
}

/**
 * Função para converter sigla em nome completo
 * @param {string} sigla - Sigla da lei (ex: "CP", "LCP")
 * @returns {string} Nome completo da lei ou a sigla original se não encontrada
 */
function converterSiglaParaNome(sigla) {
    if (!sigla || typeof sigla !== 'string') return sigla;
    
    const siglaUpper = sigla.trim().toUpperCase();
    const lei = leisBrasileiras.find(l => l.sigla.toUpperCase() === siglaUpper);
    
    return lei ? lei.nome : sigla;
}

// Exportar para Node.js se disponível
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        leisBrasileiras,
        buscarLeis,
        obterLeisPorCategoria,
        obterCategorias,
        converterSiglaParaNome
    };
} else {
    // Expor globalmente para o browser
    window.leisBrasileiras = leisBrasileiras;
    window.buscarLeis = buscarLeis;
    window.obterLeisPorCategoria = obterLeisPorCategoria;
    window.obterCategorias = obterCategorias;
    window.converterSiglaParaNome = converterSiglaParaNome;
}

/**
 * Componente de Autocomplete para Leis Brasileiras
 * Permite busca inteligente e seleção de leis com interface moderna
 */

class AutocompleteLeis {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            placeholder: '',
            minChars: 1,
            maxResults: 15,
            debounceTime: 300,
            showCategories: true,
            ...options
        };
        
        this.container = null;
        this.dropdown = null;
        this.currentIndex = -1;
        this.isOpen = false;
        this.debounceTimer = null;
        this.selectedLei = null;
        
        this.init();
    }
    
    init() {
        this.createStructure();
        this.bindEvents();
        this.setupInput();
    }
    
    createStructure() {
        // Criar container principal
        this.container = document.createElement('div');
        this.container.className = 'autocomplete-container';
        
        // Substituir o input original
        this.input.parentNode.insertBefore(this.container, this.input);
        this.container.appendChild(this.input);
        
        // Criar dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        this.container.appendChild(this.dropdown);
    }
    
    setupInput() {
        this.input.className = 'autocomplete-input';
        if (this.options.placeholder) {
            this.input.placeholder = this.options.placeholder;
        }
        this.input.autocomplete = 'off';
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-autocomplete', 'list');
    }
    
    bindEvents() {
        // Eventos do input
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.input.addEventListener('focus', () => this.handleFocus());
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        
        // Eventos do dropdown
        this.dropdown.addEventListener('mousedown', (e) => e.preventDefault());
        this.dropdown.addEventListener('click', (e) => this.handleDropdownClick(e));
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }
    
    handleInput(e) {
        const value = e.target.value.trim();
        
        // Limpar timer anterior
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Debounce para evitar muitas requisições
        this.debounceTimer = setTimeout(() => {
            if (value.length >= this.options.minChars) {
                this.search(value);
            } else if (value.length === 0) {
                this.showInitialSuggestions();
            } else {
                this.close();
            }
        }, this.options.debounceTime);
    }
    
    handleKeydown(e) {
        if (!this.isOpen) return;
        
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentIndex = Math.min(this.currentIndex + 1, items.length - 1);
                this.updateHighlight();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentIndex = Math.max(this.currentIndex - 1, -1);
                this.updateHighlight();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentIndex >= 0 && items[this.currentIndex]) {
                    this.selectItem(items[this.currentIndex]);
                }
                break;
                
            case 'Escape':
                this.close();
                break;
        }
    }
    
    handleFocus() {
        if (this.input.value.trim().length === 0) {
            this.showInitialSuggestions();
        } else if (this.input.value.trim().length >= this.options.minChars) {
            this.search(this.input.value.trim());
        }
    }
    
    handleBlur(e) {
        // Pequeno delay para permitir cliques no dropdown
        setTimeout(() => {
            if (!this.container.contains(document.activeElement)) {
                this.close();
            }
        }, 150);
    }
    
    handleDropdownClick(e) {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            this.selectItem(item);
        }
    }
    
    async search(termo) {
        this.showLoading();
        
        try {
            // Simular busca assíncrona (pode ser substituída por uma API real)
            const results = await this.performSearch(termo);
            this.showResults(results);
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showError('Erro ao buscar leis');
        }
    }
    
    async performSearch(termo) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Usar a função de busca global (carregada via script tag)
        if (typeof buscarLeis === 'function') {
            return buscarLeis(termo);
        } else {
            console.error('Função buscarLeis não encontrada');
            return [];
        }
    }
    
    showInitialSuggestions() {
        this.performSearch('').then(results => {
            this.showResults(results.slice(0, 8)); // Mostrar apenas as 8 primeiras
        });
    }
    
    showLoading() {
        this.dropdown.innerHTML = '<div class="autocomplete-loading">Buscando leis...</div>';
        this.open();
    }
    
    showResults(results) {
        if (results.length === 0) {
            this.dropdown.innerHTML = '<div class="autocomplete-no-results">Nenhuma lei encontrada</div>';
        } else {
            this.dropdown.innerHTML = results.map((lei, index) => 
                this.createItemHTML(lei, index)
            ).join('');
        }
        
        this.currentIndex = -1;
        this.open();
    }
    
    showError(message) {
        this.dropdown.innerHTML = `<div class="autocomplete-no-results">${message}</div>`;
        this.open();
    }
    
    createItemHTML(lei, index) {
        const categoriaBadge = this.options.showCategories ? 
            `<span class="categoria-badge categoria-${lei.categoria}">${lei.categoria}</span>` : '';
        
        return `
            <div class="autocomplete-item" data-index="${index}" data-sigla="${lei.sigla}" data-nome="${lei.nome}">
                <div class="autocomplete-item-title">
                    <span class="autocomplete-item-sigla">${lei.sigla}</span>
                    <span>${lei.nome}</span>
                    ${categoriaBadge}
                </div>
                <div class="autocomplete-item-description">${lei.descricao}</div>
                <div class="autocomplete-item-year">Ano: ${lei.ano}</div>
            </div>
        `;
    }
    
    selectItem(itemElement) {
        const sigla = itemElement.dataset.sigla;
        const nome = itemElement.dataset.nome;
        
        // Atualizar o input com o nome completo da lei selecionada
        this.input.value = nome;
        
        // Armazenar a lei selecionada
        this.selectedLei = {
            sigla: sigla,
            nome: nome
        };
        
        // Disparar evento customizado
        const event = new CustomEvent('leiSelecionada', {
            detail: this.selectedLei
        });
        this.input.dispatchEvent(event);
        
        this.close();
        
        // Callback se fornecido
        if (this.options.onSelect) {
            this.options.onSelect(this.selectedLei);
        }
    }
    
    updateHighlight() {
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.currentIndex);
        });
        
        // Scroll para o item destacado
        if (this.currentIndex >= 0 && items[this.currentIndex]) {
            items[this.currentIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }
    
    open() {
        this.dropdown.classList.add('show');
        this.isOpen = true;
        this.input.setAttribute('aria-expanded', 'true');
    }
    
    close() {
        this.dropdown.classList.remove('show');
        this.isOpen = false;
        this.currentIndex = -1;
        this.input.setAttribute('aria-expanded', 'false');
    }
    
    // Métodos públicos
    getValue() {
        return this.selectedLei;
    }
    
    setValue(sigla) {
        this.input.value = sigla;
        this.selectedLei = { sigla: sigla };
    }
    
    clear() {
        this.input.value = '';
        this.selectedLei = null;
        this.close();
    }
    
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Remover eventos
        this.input.removeEventListener('input', this.handleInput);
        this.input.removeEventListener('keydown', this.handleKeydown);
        this.input.removeEventListener('focus', this.handleFocus);
        this.input.removeEventListener('blur', this.handleBlur);
        
        // Restaurar input original
        const parent = this.container.parentNode;
        parent.insertBefore(this.input, this.container);
        parent.removeChild(this.container);
    }
}

// Função utilitária para inicializar o autocomplete
function initAutocompleteLeis(selector, options = {}) {
    const elements = typeof selector === 'string' ? 
        document.querySelectorAll(selector) : [selector];
    
    const instances = [];
    
    elements.forEach(element => {
        if (element && element.tagName === 'INPUT') {
            instances.push(new AutocompleteLeis(element, options));
        }
    });
    
    return instances.length === 1 ? instances[0] : instances;
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutocompleteLeis, initAutocompleteLeis };
} else {
    window.AutocompleteLeis = AutocompleteLeis;
    window.initAutocompleteLeis = initAutocompleteLeis;
}

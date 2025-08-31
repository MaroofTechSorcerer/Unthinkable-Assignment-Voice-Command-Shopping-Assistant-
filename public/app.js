// Voice Command Shopping Assistant - Main Application
class VoiceShoppingAssistant {
    constructor() {
        // No authentication required - use default user
        this.currentUserId = 1;
        this.socket = io();
        this.recognition = null;
        this.isListening = false;
        this.isContinuousListening = false;
        this.currentLanguage = 'en-US';
        this.currentListId = null;
        this.shoppingItems = [];
        this.suggestions = {};
        
        this.init();
    }

    init() {
        this.initVoiceRecognition();
        this.initSocketListeners();
        this.initEventListeners();
        this.ensureShoppingList().then(() => {
            this.loadShoppingList();
        });
        this.loadSuggestions();
        this.loadLanguages();
    }

    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage;
            
            this.recognition.onstart = () => {
                this.setVoiceStatus('listening');
                this.isListening = true;
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                if (interimTranscript) {
                    this.showInterimResult(interimTranscript);
                }
                
                if (finalTranscript) {
                    this.processVoiceCommand(finalTranscript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    if (this.isContinuousListening) {
                        setTimeout(() => {
                            this.recognition.start();
                        }, 1000);
                    }
                } else {
                    this.setVoiceStatus('error');
                    this.showToast('Error recognizing speech', 'error');
                }
            };
            
            this.recognition.onend = () => {
                if (this.isContinuousListening) {
                    setTimeout(() => {
                        this.recognition.start();
                    }, 1000);
                } else {
                    this.setVoiceStatus('idle');
                    this.isListening = false;
                }
            };
        } else {
            console.warn('Speech recognition not supported');
            this.showToast('Speech recognition not supported in this browser', 'warning');
        }
    }

    showInterimResult(transcript) {
        const interimDiv = document.getElementById('interimResult');
        if (interimDiv) {
            const interimText = interimDiv.querySelector('.interim-text');
            if (interimText) {
                interimText.textContent = transcript;
            }
            interimDiv.style.display = 'flex';
        }
    }

    initSocketListeners() {
        this.socket.on('voiceResponse', (response) => {
            this.handleVoiceResponse(response);
        });
        
        this.socket.on('error', (error) => {
            this.showToast(error.message, 'error');
        });
    }

    initEventListeners() {
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => {
                this.toggleVoiceRecognition();
            });
        }



        const continuousToggle = document.getElementById('continuousToggle');
        if (continuousToggle) {
            continuousToggle.addEventListener('change', (e) => {
                this.toggleContinuousListening(e.target.checked);
            });
        }

        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        const languageBtn = document.getElementById('languageBtn');
        if (languageBtn) {
            languageBtn.addEventListener('click', () => {
                this.showModal('languageModal');
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showModal('settingsModal');
            });
        }

        const addItemModal = document.getElementById('addItemModal');
        if (addItemModal) {
            addItemModal.addEventListener('click', (e) => {
                if (e.target.id === 'addItemModal') {
                    this.hideModal('addItemModal');
                }
            });
        }

        const closeAddItemModal = document.getElementById('closeAddItemModal');
        if (closeAddItemModal) {
            closeAddItemModal.addEventListener('click', () => {
                this.hideModal('addItemModal');
            });
        }

        const cancelAddItem = document.getElementById('cancelAddItem');
        if (cancelAddItem) {
            cancelAddItem.addEventListener('click', () => {
                this.hideModal('addItemModal');
            });
        }

        const saveAddItem = document.getElementById('saveAddItem');
        if (saveAddItem) {
            saveAddItem.addEventListener('click', () => {
                this.saveAddItem();
            });
        }

        const closeLanguageModal = document.getElementById('closeLanguageModal');
        if (closeLanguageModal) {
            closeLanguageModal.addEventListener('click', () => {
                this.hideModal('languageModal');
            });
        }

        const closeSettingsModal = document.getElementById('closeSettingsModal');
        if (closeSettingsModal) {
            closeSettingsModal.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        const cancelSettings = document.getElementById('cancelSettings');
        if (cancelSettings) {
            cancelSettings.addEventListener('click', () => {
                this.hideModal('settingsModal');
            });
        }

        const saveSettings = document.getElementById('saveSettings');
        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        const newListBtn = document.getElementById('newListBtn');
        if (newListBtn) {
            newListBtn.addEventListener('click', () => {
                this.createNewList();
            });
        }

        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => {
                this.clearCompletedItems();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterItems(e.target.value);
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterByCategory(e.target.value);
            });
        }

        const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');
        if (refreshSuggestionsBtn) {
            refreshSuggestionsBtn.addEventListener('click', () => {
                this.loadSuggestions();
            });
        }

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }



    toggleContinuousListening(enabled) {
        this.isContinuousListening = enabled;
        
        if (enabled) {
            if (!this.isListening) {
                this.recognition.start();
            }
            this.showToast('Continuous listening enabled', 'success');
        } else {
            if (this.isListening) {
                this.recognition.stop();
            }
            this.showToast('Continuous listening disabled', 'info');
        }
    }

    toggleVoiceRecognition() {
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    setVoiceStatus(status) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (!statusIndicator || !statusText) return;
        
        statusIndicator.className = 'status-indicator';
        
        switch (status) {
            case 'listening':
                statusIndicator.classList.add('listening');
                statusText.textContent = this.isContinuousListening ? 'Continuous Listening... Speak anytime' : 'Listening... Speak now';
                break;
            case 'processing':
                statusIndicator.classList.add('processing');
                statusText.textContent = 'Processing your command...';
                break;
            case 'error':
                statusText.textContent = 'Error occurred. Try again.';
                break;
            default:
                statusText.textContent = this.isContinuousListening ? 'Continuous mode active - tap to stop' : 'Tap to start voice command';
        }
    }

    async processVoiceCommand(command) {
        this.setVoiceStatus('processing');
        
        const interimDiv = document.getElementById('interimResult');
        if (interimDiv) {
            interimDiv.style.display = 'none';
        }
        
        try {
            const result = await fetch('/api/voice/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command,
                    userId: this.currentUserId,
                    language: this.currentLanguage.split('-')[0]
                })
            });
            const data = await result.json();
            
            if (result.ok) {
                this.handleVoiceResponse(data);
            } else {
                this.showToast(data.error || 'Error processing command', 'error');
            }
        } catch (error) {
            console.error('Error processing voice command:', error);
            this.showToast('Error processing command', 'error');
        }
        
        this.setVoiceStatus(this.isContinuousListening ? 'listening' : 'idle');
    }

    handleVoiceResponse(response) {
        const feedbackText = document.getElementById('feedbackText');
        const confidenceFill = document.getElementById('confidenceFill');
        const voiceFeedback = document.getElementById('voiceFeedback');
        
        if (feedbackText) feedbackText.textContent = response.response;
        if (confidenceFill) confidenceFill.style.width = `${response.confidence * 100}%`;
        if (voiceFeedback) voiceFeedback.classList.add('show');
        
        setTimeout(() => {
            if (voiceFeedback) voiceFeedback.classList.remove('show');
        }, 3000);
        
        this.executeVoiceAction(response);
        this.showToast(response.response, 'success');
    }

    executeVoiceAction(response) {
        switch (response.action) {
            case 'shopping.add_item':
                if (response.itemInfo && response.itemInfo.items) {
                    response.itemInfo.items.forEach(item => {
                        this.addItemFromVoice(item);
                    });
                } else if (response.itemInfo && response.itemInfo.name) {
                    this.addItemFromVoice(response.itemInfo);
                }
                break;
            case 'shopping.remove_item':
                if (response.itemInfo && response.itemInfo.items) {
                    response.itemInfo.items.forEach(item => {
                        this.removeItemFromVoice(item);
                    });
                } else if (response.itemInfo && response.itemInfo.name) {
                    this.removeItemFromVoice(response.itemInfo);
                }
                break;
            case 'shopping.show_list':
                this.loadShoppingList();
                break;
            case 'shopping.clear_list':
                this.clearShoppingList();
                break;
            case 'shopping.new_list':
                this.createNewList();
                break;
            case 'shopping.search_item':
                if (response.itemInfo && response.itemInfo.items) {
                    response.itemInfo.items.forEach(item => {
                        this.searchItems(item.name);
                    });
                } else if (response.itemInfo && response.itemInfo.name) {
                    this.searchItems(response.itemInfo.name);
                }
                break;
        }
    }

    addItemFromVoice(itemInfo) {
        const articles = ['a', 'an', 'the'];
        let itemName = itemInfo.name.toLowerCase();
        const nameParts = itemName.split(' ');

        if (articles.includes(nameParts[0])) {
            itemName = nameParts.slice(1).join(' ');
        }
        
        // Clean up the item name further
        itemName = itemName.trim();
        
        // Check if item already exists in the list
        const existingItemIndex = this.shoppingItems.findIndex(item => 
            item.name.toLowerCase() === itemName.toLowerCase()
        );
        
        if (existingItemIndex !== -1) {
            // Item already exists, remove it instead
            this.removeShoppingItem(this.shoppingItems[existingItemIndex].id);
            this.showToast(`"${itemName}" was already on your list, so I removed it.`, 'info');
            return;
        }
        
        const item = {
            name: itemName.charAt(0).toUpperCase() + itemName.slice(1),
            quantity: itemInfo.quantity || 1,
            unit: itemInfo.unit || '',
            category: itemInfo.category || '',
            price: null,
            brand: itemInfo.brand || '',
            notes: itemInfo.notes || ''
        };
        
        this.addShoppingItem(item);
    }

    removeItemFromVoice(itemInfo) {
        // Enhanced item matching - try multiple approaches
        let itemToRemove = null;
        let matchIndex = -1;
        
        const searchName = itemInfo.name.toLowerCase().trim();
        
        // 1. Exact match
        matchIndex = this.shoppingItems.findIndex(item => 
            item.name.toLowerCase() === searchName
        );
        
        // 2. If no exact match, try partial match
        if (matchIndex === -1) {
            matchIndex = this.shoppingItems.findIndex(item => 
                item.name.toLowerCase().includes(searchName) || 
                searchName.includes(item.name.toLowerCase())
            );
        }
        
        // 3. If still no match, try word-by-word matching
        if (matchIndex === -1) {
            const searchWords = searchName.split(' ');
            matchIndex = this.shoppingItems.findIndex(item => {
                const itemWords = item.name.toLowerCase().split(' ');
                return searchWords.some(searchWord => 
                    itemWords.some(itemWord => 
                        itemWord.includes(searchWord) || searchWord.includes(itemWord)
                    )
                );
            });
        }
        
        if (matchIndex !== -1) {
            itemToRemove = this.shoppingItems[matchIndex];
            this.removeShoppingItem(itemToRemove.id);
            this.showToast(`Removed "${itemToRemove.name}" from your list.`, 'success');
        } else {
            this.showToast(`Could not find "${itemInfo.name}" in your list.`, 'error');
        }
    }

    handleQuickAction(action) {
        switch (action) {
            case 'add-item':
                this.showModal('addItemModal');
                break;
            case 'show-list':
                this.loadShoppingList();
                break;
            case 'search':
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
                break;
            case 'suggestions':
                this.loadSuggestions();
                break;
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}Tab`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }

    async ensureShoppingList() {
        if (!this.currentListId) {
            try {
                const result = await fetch(`/api/shopping/lists/${this.currentUserId}`);
                const data = await result.json();
                if (data.success && data.lists.length > 0) {
                    this.currentListId = data.lists[0].id;
                } else {
                    const newListResult = await fetch('/api/shopping/lists', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: this.currentUserId,
                            name: 'My Shopping List'
                        })
                    });
                    const newData = await newListResult.json();
                    if (newData.success) {
                        this.currentListId = newData.listId;
                    }
                }
            } catch (error) {
                console.error('Error ensuring shopping list:', error);
            }
        }
    }

    async loadShoppingList() {
        if (!this.currentListId) {
            console.log('No shopping list ID available');
            return;
        }

        try {
            const result = await fetch(`/api/shopping/lists/${this.currentListId}/items`);
            const data = await result.json();
            
            if (data.success) {
                this.shoppingItems = data.items;
                this.renderShoppingList();
            }
        } catch (error) {
            console.error('Error loading shopping list:', error);
            this.showToast('Error loading shopping list', 'error');
        }
    }

    renderShoppingList() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;
        
        if (this.shoppingItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your shopping list is empty. Add items using voice commands or the quick actions above.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.shoppingItems.map(item => this.renderShoppingItem(item)).join('');
        this.addItemEventListeners();
    }

    renderShoppingItem(item) {
        const completedClass = item.is_completed ? 'completed' : '';
        const checked = item.is_completed ? 'checked' : '';
        
        return `
            <div class="shopping-item ${completedClass}" data-item-id="${item.id}">
                <input type="checkbox" class="item-checkbox" ${checked} onchange="app.toggleItemComplete(${item.id}, this.checked)">
                <div class="item-content">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <span>Qty: ${item.quantity} ${item.unit}</span>
                        ${item.category ? `<span class="item-category">${item.category}</span>` : ''}
                        ${item.price ? `<span>${item.price}</span>` : ''}
                        ${item.brand ? `<span>${item.brand}</span>` : ''}
                    </div>
                    ${item.notes ? `<div style="margin-top: 5px; font-size: 0.9rem; color: #a0aec0;">${item.notes}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button onclick="app.editItem(${item.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.removeShoppingItem(${item.id})" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    addItemEventListeners() {
        // Event listeners are added inline
    }

    async toggleItemComplete(itemId, isCompleted) {
        try {
            const result = await fetch(`/api/shopping/items/${itemId}/complete`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_completed: isCompleted })
            });
            const data = await result.json();
            
            if (data.success) {
                this.showToast(`Item marked as ${isCompleted ? 'completed' : 'incomplete'}`, 'success');
                if (isCompleted) {
                    this.removeItemWithoutConfirmation(itemId);
                } else {
                    this.loadShoppingList();
                }
            }
        } catch (error) {
            console.error('Error updating item:', error);
            this.showToast('Error updating item', 'error');
        }
    }

    async addShoppingItem(item) {
        if (!this.currentListId) {
            this.showToast('No shopping list available', 'error');
            return;
        }

        try {
            const result = await fetch(`/api/shopping/lists/${this.currentListId}/items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });
            
            const data = await result.json();
            if (data.success) {
                this.loadShoppingList();
                this.showToast('Item added successfully', 'success');
                this.hideModal('addItemModal');
                this.resetAddItemForm();
            } else {
                this.showToast(data.error || 'Error adding item', 'error');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            this.showToast('Error adding item', 'error');
        }
    }

    async removeShoppingItem(itemId) {
        this.showConfirmation('Are you sure you want to remove this item?', () => {
            this.removeItemWithoutConfirmation(itemId);
        });
    }

    async removeItemWithoutConfirmation(itemId) {
        try {
            const result = await fetch(`/api/shopping/items/${itemId}`, {
                method: 'DELETE'
            });
            
            const data = await result.json();
            if (data.success) {
                this.loadShoppingList();
                this.showToast('Item removed successfully', 'success');
            } else {
                this.showToast(data.error || 'Error removing item', 'error');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            this.showToast('Error removing item', 'error');
        }
    }

    saveAddItem() {
        const form = document.getElementById('addItemForm');
        if (!form) return;

        const formData = new FormData(form);
        
        const item = {
            name: formData.get('itemName'),
            quantity: parseInt(formData.get('itemQuantity')) || 1,
            unit: formData.get('itemUnit') || '',
            category: formData.get('itemCategory') || '',
            price: parseFloat(formData.get('itemPrice')) || null,
            brand: formData.get('itemBrand') || '',
            notes: formData.get('itemNotes') || ''
        };
        
        if (!item.name) {
            this.showToast('Item name is required', 'error');
            return;
        }
        
        this.addShoppingItem(item);
    }

    resetAddItemForm() {
        const form = document.getElementById('addItemForm');
        if (form) form.reset();
    }

    async loadSuggestions() {
        try {
            const result = await fetch(`/api/ai/suggestions/${this.currentUserId}`);
            const data = await result.json();
            
            if (data.success && data.suggestions) {
                this.suggestions = data.suggestions;
            } else {
                this.suggestions = this.getSampleSuggestions();
            }
            
            this.renderSuggestions();
        } catch (error) {
            console.error('Error loading suggestions:', error);
            this.suggestions = this.getSampleSuggestions();
            this.renderSuggestions();
        }
    }

    getSampleSuggestions() {
        return {
            basedOnHistory: [
                { name: 'Milk', category: 'Dairy', reason: 'You buy this weekly' },
                { name: 'Bread', category: 'Bakery', reason: 'Frequently purchased item' },
                { name: 'Bananas', category: 'Produce', reason: 'Your favorite fruit' },
                { name: 'Eggs', category: 'Dairy', reason: 'Regular breakfast item' },
                { name: 'Chicken Breast', category: 'Meat', reason: 'Weekly protein source' }
            ],
            seasonal: [
                { name: 'Pumpkin Spice', category: 'Pantry', reason: 'Perfect for fall recipes' },
                { name: 'Fresh Herbs', category: 'Produce', reason: 'Great for seasonal cooking' },
                { name: 'Citrus Fruits', category: 'Produce', reason: 'Winter vitamin boost' },
                { name: 'Hot Chocolate', category: 'Beverages', reason: 'Warm winter drink' },
                { name: 'Root Vegetables', category: 'Produce', reason: 'Seasonal comfort food' }
            ],
            substitutes: [
                {
                    original: 'Milk',
                    reason: 'Lactose intolerant or vegan alternatives',
                    alternatives: ['Almond Milk', 'Soy Milk', 'Oat Milk', 'Coconut Milk']
                },
                {
                    original: 'Butter',
                    reason: 'Healthier alternatives',
                    alternatives: ['Olive Oil', 'Coconut Oil', 'Avocado', 'Greek Yogurt']
                },
                {
                    original: 'White Rice',
                    reason: 'More nutritious alternatives',
                    alternatives: ['Brown Rice', 'Quinoa', 'Cauliflower Rice', 'Wild Rice']
                }
            ]
        };
    }

    renderSuggestions() {
        const frequentContainer = document.getElementById('frequentSuggestions');
        if (frequentContainer) {
            frequentContainer.innerHTML = this.suggestions.basedOnHistory?.map(item => 
                this.renderSuggestionItem(item)
            ).join('') || '<p style="color: #718096; text-align: center;">No frequent items found</p>';
        }
        
        const seasonalContainer = document.getElementById('seasonalSuggestions');
        if (seasonalContainer) {
            seasonalContainer.innerHTML = this.suggestions.seasonal?.map(item => 
                this.renderSuggestionItem(item)
            ).join('') || '<p style="color: #718096; text-align: center;">No seasonal items found</p>';
        }
        
        const substitutesContainer = document.getElementById('substitutesSuggestions');
        if (substitutesContainer) {
            substitutesContainer.innerHTML = this.suggestions.substitutes?.map(item => 
                this.renderSubstituteItem(item)
            ).join('') || '<p style="color: #718096; text-align: center;">No substitutes found</p>';
        }
    }

    renderSuggestionItem(item) {
        return `
            <div class="suggestion-item">
                <div class="suggestion-header">
                    <span class="suggestion-name">${item.name}</span>
                    ${item.category ? `<span class="suggestion-category">${item.category}</span>` : ''}
                </div>
                <div class="suggestion-reason">${item.reason}</div>
                <div class="suggestion-actions">
                    <button class="btn btn-small" onclick="app.addSuggestionItem('${item.name}', '${item.category || ''}')">
                        <i class="fas fa-plus"></i>
                        Add to List
                    </button>
                </div>
            </div>
        `;
    }

    renderSubstituteItem(item) {
        return `
            <div class="suggestion-item">
                <div class="suggestion-header">
                    <span class="suggestion-name">${item.original}</span>
                    <span class="suggestion-category">Substitutes</span>
                </div>
                <div class="suggestion-reason">${item.reason}</div>
                <div class="suggestion-actions">
                    ${item.alternatives.map(alt => `
                        <button class="btn btn-small" onclick="app.addSuggestionItem('${alt}', '')">
                            <i class="fas fa-plus"></i>
                            ${alt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    addSuggestionItem(name, category) {
        const item = {
            name,
            quantity: 1,
            unit: '',
            category,
            price: null,
            brand: '',
            notes: ''
        };
        
        this.addShoppingItem(item);
    }

    async loadLanguages() {
        try {
            const result = await fetch('/api/voice/languages');
            const data = await result.json();
            
            if (data.success) {
                this.renderLanguages(data.languages);
            }
        } catch (error) {
            console.error('Error loading languages:', error);
        }
    }

    renderLanguages(languages) {
        const container = document.getElementById('languageGrid');
        if (!container) return;
        
        container.innerHTML = languages.map(lang => `
            <div class="language-option" data-code="${lang.code}">
                <div class="language-flag">${lang.flag}</div>
                <div class="language-name">${lang.name}</div>
            </div>
        `).join('');
        
        container.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectLanguage(option.dataset.code);
            });
        });
    }

    selectLanguage(languageCode) {
        this.currentLanguage = languageCode;
        const currentLanguageElement = document.getElementById('currentLanguage');
        if (currentLanguageElement) {
            currentLanguageElement.textContent = languageCode.split('-')[0].toUpperCase();
        }
        
        if (this.recognition) {
            this.recognition.lang = languageCode;
        }
        
        this.hideModal('languageModal');
        this.showToast(`Language changed to ${languageCode}`, 'success');
    }

    async createNewList() {
        try {
            const result = await fetch('/api/shopping/lists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId,
                    name: `Shopping List ${new Date().toLocaleDateString()}`
                })
            });
            
            const data = await result.json();
            if (data.success) {
                this.currentListId = data.listId;
                this.shoppingItems = [];
                this.renderShoppingList();
                this.showToast('New shopping list created', 'success');
            }
        } catch (error) {
            console.error('Error creating new list:', error);
            this.showToast('Error creating new list', 'error');
        }
    }

    async clearCompletedItems() {
        this.showConfirmation('Are you sure you want to clear all completed items?', async () => {
            try {
                const result = await fetch(`/api/shopping/lists/${this.currentListId}/items/completed`, {
                    method: 'DELETE'
                });
                
                const data = await result.json();
                if (data.success) {
                    this.loadShoppingList();
                    this.showToast(data.message, 'success');
                }
            } catch (error) {
                console.error('Error clearing completed items:', error);
                this.showToast('Error clearing completed items', 'error');
            }
        });
    }

    filterItems(query) {
        const items = document.querySelectorAll('.shopping-item');
        
        items.forEach(item => {
            const itemName = item.querySelector('.item-name').textContent.toLowerCase();
            const shouldShow = itemName.includes(query.toLowerCase());
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    filterByCategory(category) {
        const items = document.querySelectorAll('.shopping-item');
        
        items.forEach(item => {
            const itemCategory = item.querySelector('.item-category')?.textContent || '';
            const shouldShow = !category || itemCategory.toLowerCase() === category.toLowerCase();
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    async searchItems(query) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = query;

        if (!this.currentListId) {
            this.showToast('No shopping list available to search', 'error');
            return;
        }

        try {
            const result = await fetch(`/api/shopping/lists/${this.currentListId}/search?query=${encodeURIComponent(query)}`);
            const data = await result.json();
            
            if (data.success) {
                this.shoppingItems = data.items;
                this.renderShoppingList();
                this.showToast(`Found ${data.items.length} items matching "${query}"`, 'success');
            } else {
                this.showToast(data.error || 'Error searching for items', 'error');
            }
        } catch (error) {
            console.error('Error searching for items:', error);
            this.showToast('Error searching for items', 'error');
        }
    }

    async clearShoppingList() {
        this.showConfirmation('Are you sure you want to clear the entire shopping list?', async () => {
            if (!this.currentListId) {
                this.showToast('No shopping list to clear', 'error');
                return;
            }

            try {
                const result = await fetch(`/api/shopping/lists/${this.currentListId}/items`, {
                    method: 'DELETE'
                });

                const data = await result.json();
                if (data.success) {
                    this.shoppingItems = [];
                    this.renderShoppingList();
                    this.showToast('Shopping list cleared successfully', 'success');
                } else {
                    this.showToast(data.error || 'Error clearing shopping list', 'error');
                }
            } catch (error) {
                console.error('Error clearing shopping list:', error);
                this.showToast('Error clearing shopping list', 'error');
            }
        });
    }

    editItem(itemId) {
        const item = this.shoppingItems.find(i => i.id === itemId);
        if (!item) return;
        
        const itemName = document.getElementById('itemName');
        const itemQuantity = document.getElementById('itemQuantity');
        const itemUnit = document.getElementById('itemUnit');
        const itemCategory = document.getElementById('itemCategory');
        const itemPrice = document.getElementById('itemPrice');
        const itemBrand = document.getElementById('itemBrand');
        const itemNotes = document.getElementById('itemNotes');
        
        if (itemName) itemName.value = item.name;
        if (itemQuantity) itemQuantity.value = item.quantity;
        if (itemUnit) itemUnit.value = item.unit;
        if (itemCategory) itemCategory.value = item.category;
        if (itemPrice) itemPrice.value = item.price || '';
        if (itemBrand) itemBrand.value = item.brand;
        if (itemNotes) itemNotes.value = item.notes;
        
        const modalTitle = document.querySelector('#addItemModal .modal-header h3');
        const saveButton = document.getElementById('saveAddItem');
        
        if (modalTitle) modalTitle.textContent = 'Edit Item';
        if (saveButton) {
            saveButton.textContent = 'Update Item';
            saveButton.onclick = () => this.updateItem(itemId);
        }
        
        this.showModal('addItemModal');
    }

    async updateItem(itemId) {
        const form = document.getElementById('addItemForm');
        if (!form) return;

        const formData = new FormData(form);
        
        const item = {
            name: formData.get('itemName'),
            quantity: parseInt(formData.get('itemQuantity')) || 1,
            unit: formData.get('itemUnit') || '',
            category: formData.get('itemCategory') || '',
            price: parseFloat(formData.get('itemPrice')) || null,
            brand: formData.get('itemBrand') || '',
            notes: formData.get('itemNotes') || ''
        };
        
        try {
            const result = await fetch(`/api/shopping/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });
            
            const data = await result.json();
            if (data.success) {
                this.loadShoppingList();
                this.showToast('Item updated successfully', 'success');
                this.hideModal('addItemModal');
                this.resetAddItemForm();
                
                const modalTitle = document.querySelector('#addItemModal .modal-header h3');
                const saveButton = document.getElementById('saveAddItem');
                
                if (modalTitle) modalTitle.textContent = 'Add Item';
                if (saveButton) {
                    saveButton.textContent = 'Add Item';
                    saveButton.onclick = () => this.saveAddItem();
                }
            }
        } catch (error) {
            console.error('Error updating item:', error);
            this.showToast('Error updating item', 'error');
        }
    }

    saveSettings() {
        const voiceSpeed = document.getElementById('voiceSpeed').value;
        const voiceVolume = document.getElementById('voiceVolume').value;
        const enableNotifications = document.getElementById('enableNotifications').checked;
        const enableSound = document.getElementById('enableSound').checked;

        localStorage.setItem('voiceSpeed', voiceSpeed);
        localStorage.setItem('voiceVolume', voiceVolume);
        localStorage.setItem('enableNotifications', enableNotifications);
        localStorage.setItem('enableSound', enableSound);

        this.hideModal('settingsModal');
        this.showToast('Settings saved successfully', 'success');
    }

    loadSettings() {
        const voiceSpeed = document.getElementById('voiceSpeed');
        const voiceVolume = document.getElementById('voiceVolume');
        const enableNotifications = document.getElementById('enableNotifications');
        const enableSound = document.getElementById('enableSound');

        if (voiceSpeed) voiceSpeed.value = localStorage.getItem('voiceSpeed') || '1.0';
        if (voiceVolume) voiceVolume.value = localStorage.getItem('voiceVolume') || '0.8';
        if (enableNotifications) enableNotifications.checked = localStorage.getItem('enableNotifications') !== 'false';
        if (enableSound) enableSound.checked = localStorage.getItem('enableSound') !== 'false';
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('show');

        if (modalId === 'settingsModal') {
            this.loadSettings();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        if (localStorage.getItem('enableSound') === 'true') {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = parseFloat(localStorage.getItem('voiceSpeed')) || 1.0;
            utterance.volume = parseFloat(localStorage.getItem('voiceVolume')) || 0.8;
            window.speechSynthesis.speak(utterance);
        }

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('show');
    }
    
    showConfirmation(message, onConfirm) {
        if (confirm(message)) {
            onConfirm();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceShoppingAssistant();
});

// Global functions for inline event handlers
function addSuggestionItem(name, category) {
    if (window.app) {
        window.app.addSuggestionItem(name, category);
    }
}

function toggleItemComplete(itemId, isCompleted) {
    if (window.app) {
        window.app.toggleItemComplete(itemId, isCompleted);
    }
}

function editItem(itemId) {
    if (window.app) {
        window.app.editItem(itemId);
    }
}

function removeShoppingItem(itemId) {
    if (window.app) {
        window.app.removeShoppingItem(itemId);
    }
}

function removeItemWithoutConfirmation(itemId) {
    if (window.app) {
        window.app.removeItemWithoutConfirmation(itemId);
    }
}

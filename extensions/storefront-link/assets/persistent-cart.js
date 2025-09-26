// Persistent Cart Management - Quantity-based System
class PersistentCart {
  constructor() {
    this.isCustomer = window.customerId !== null && window.customerId !== 'null';
    this.customerId = window.customerId;
    this.storageKey = 'quick_order_quantities';
    this.saveTimeout = null;
    this.isSaving = false; // Prevent save loops
    this.isLoading = false; // Prevent load loops
    
    console.log('PersistentCart initialized:');
    console.log('- window.customerId:', window.customerId);
    console.log('- this.isCustomer:', this.isCustomer);
    console.log('- this.customerId:', this.customerId);
    
    this.init();
  }

  async init() {
    await this.loadCartState();
    this.bindQuantityEvents();
    this.bindFormEvents();
    this.bindCartRemovalEvents();
    // Temporarily disable polling to prevent loops
    // this.startCartPolling();
    
    // Listen for cart events instead
    this.bindCartEvents();
    
    // Ensure subtotal is calculated after everything is loaded
    setTimeout(() => {
      this.updateInitialSubtotal();
    }, 500);
  }

  // Update subtotal on initial load
  updateInitialSubtotal() {
    if (window.priceCalculator) {
      window.priceCalculator.updateSubtotal();
      console.log('✅ Initial subtotal calculated');
    } else {
      console.warn('⚠️ Price calculator not yet available, retrying...');
      setTimeout(() => this.updateInitialSubtotal(), 200);
    }
  }

  // Load cart state and sync with quick order quantities
  async loadCartState() {
    console.log('Loading cart state and syncing quantities...');
    
    try {
      // Get current cart from Shopify
      const cartData = await this.fetchCurrentCart();
      console.log('Current cart data:', cartData);
      
      // Convert cart items to quantity map
      const cartQuantities = this.extractQuantitiesFromCart(cartData);
      console.log('Cart quantities:', cartQuantities);
      
      // Load any additional metafield data for customers
      let metafieldQuantities = {};
      if (this.isCustomer) {
        metafieldQuantities = await this.loadQuantitiesFromMetafields();
        console.log('Metafield quantities:', metafieldQuantities);
      }
      
      // Cart quantities take priority - only show quantities for items actually in cart
      const finalQuantities = cartQuantities;
      console.log('Final quantities to display:', finalQuantities);
      
      // Restore quantities to the form
      this.restoreQuantitiesToInputs(finalQuantities);
      
      // Save the cart state to metafields for persistence
      if (this.isCustomer && Object.keys(cartQuantities).length > 0) {
        await this.saveQuantitiesToMetafields(cartQuantities);
      }
      
    } catch (error) {
      console.error('Error loading cart state:', error);
      // Fallback to metafields only
      if (this.isCustomer) {
        const savedQuantities = await this.loadQuantitiesFromMetafields();
        this.restoreQuantitiesToInputs(savedQuantities);
      }
    }
  }

  // Fetch current cart from Shopify
  async fetchCurrentCart() {
    try {
      const response = await fetch('/cart.js');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
    return { items: [] };
  }

  // Extract quantities from cart data
  extractQuantitiesFromCart(cartData) {
    const quantities = {};
    
    if (cartData && cartData.items) {
      cartData.items.forEach(item => {
        const variantId = item.variant_id?.toString() || item.id?.toString();
        if (variantId) {
          quantities[variantId] = item.quantity || 0;
        }
      });
    }
    
    return quantities;
  }

  // Start polling for cart changes
  startCartPolling() {
    // Poll cart every 5 seconds to detect changes (reduced frequency)
    this.cartPollInterval = setInterval(async () => {
      // Only sync if we're not already saving/loading
      if (!this.isSaving && !this.isLoading) {
        await this.syncWithCart();
      }
    }, 5000); // Increased from 3000 to 5000ms
    
    // Also listen for cart events
    this.bindCartEvents();
  }

  // Sync quick order with current cart state
  async syncWithCart() {
    // Prevent sync loops
    if (this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      const cartData = await this.fetchCurrentCart();
      const cartQuantities = this.extractQuantitiesFromCart(cartData);
      
      // Get current quick order quantities
      const currentQuantities = this.getCurrentQuantities();
      
      // Check if cart quantities are different from quick order
      let needsSync = false;
      const allVariantIds = new Set([
        ...Object.keys(cartQuantities),
        ...Object.keys(currentQuantities)
      ]);
      
      for (const variantId of allVariantIds) {
        const cartQty = cartQuantities[variantId] || 0;
        const quickOrderQty = currentQuantities[variantId] || 0;
        
        if (cartQty !== quickOrderQty) {
          needsSync = true;
          break;
        }
      }
      
      if (needsSync) {
        console.log('Cart and quick order out of sync, updating quick order...');
        this.updateQuickOrderQuantities(cartQuantities);
        
        // Save the synced state to metafields (without triggering another sync)
        if (this.isCustomer && !this.isSaving) {
          const cartData = {
            quantities: cartQuantities,
            timestamp: new Date().toISOString()
          };
          await this.saveQuantitiesToMetafields(cartData.quantities);
        }
      }
    } catch (error) {
      console.error('Error syncing with cart:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Bind cart-specific events
  bindCartEvents() {
    // Listen for Shopify cart events
    document.addEventListener('cart:updated', (event) => {
      console.log('Cart updated event received:', event.detail);
      setTimeout(() => this.syncWithCart(), 500);
    });
    
    // Listen for cart drawer/page events
    const cartEvents = ['cart:open', 'cart:close', 'cart:change', 'cart:add', 'cart:remove'];
    cartEvents.forEach(eventName => {
      document.addEventListener(eventName, () => {
        setTimeout(() => this.syncWithCart(), 500);
      });
    });
    
    // Listen for cart form submissions
    document.addEventListener('submit', (event) => {
      if (event.target.matches('[action="/cart"], [action="/cart/add"], [action*="cart"]')) {
        setTimeout(() => this.syncWithCart(), 1000);
      }
    });
  }

  // Load saved quantities and restore them to input fields (fallback method)
  async loadQuantities() {
    console.log('Loading saved quantities...');
    let savedQuantities = {};
    
    if (this.isCustomer) {
      savedQuantities = await this.loadQuantitiesFromMetafields();
    } else {
      savedQuantities = this.loadQuantitiesFromLocalStorage();
    }
    
    console.log('Loaded quantities:', savedQuantities);
    this.restoreQuantitiesToInputs(savedQuantities);
  }

  // Restore quantities to input fields
  restoreQuantitiesToInputs(quantities) {
    console.log('Restoring quantities to inputs:', quantities);
    
    // First, reset ALL quantity inputs to 0
    const allInputs = document.querySelectorAll('input[data-variant-id], input[name^="updates["]');
    allInputs.forEach(input => {
      input.value = 0;
    });
    
    // Then set the correct quantities from cart
    Object.entries(quantities).forEach(([variantId, quantity]) => {
      const input = document.querySelector(`input[data-variant-id="${variantId}"], input[name="updates[${variantId}]"]`);
      if (input) {
        input.value = quantity || 0;
        console.log(`Set quantity for variant ${variantId}: ${quantity}`);
        // Trigger change event to update totals
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    console.log('✅ All quantities synced with cart state');
    
    // Update subtotal after restoring quantities
    setTimeout(() => {
      if (window.priceCalculator) {
        window.priceCalculator.updateSubtotal();
      }
    }, 100);
  }

  // Reset specific variant quantity to zero
  resetVariantQuantity(variantId) {
    console.log(`🔄 Resetting quantity for variant ${variantId} to zero`);
    
    const input = document.querySelector(`input[data-variant-id="${variantId}"], input[name="updates[${variantId}]"]`);
    if (input) {
      input.value = 0;
      console.log(`✅ Reset quantity for variant ${variantId} to 0`);
      
      // Trigger change event to update totals and save
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Update the price calculator
      if (window.priceCalculator) {
        window.priceCalculator.updateRowTotal(input.closest('.table-row, .product-row, .variant-row'));
        window.priceCalculator.updateSubtotal();
      }
    } else {
      console.warn(`Input not found for variant ${variantId}`);
    }
  }

  // Listen for cart removal events and reset quantities
  bindCartRemovalEvents() {
    console.log('Binding cart removal events...');
    
    // Method 1: Listen for Shopify cart updates
    document.addEventListener('cart:updated', (event) => {
      console.log('🛒 Cart updated event received:', event.detail);
      this.handleCartUpdate(event.detail);
    });

    // Method 2: Listen for cart line item removals
    document.addEventListener('cart:line-item-removed', (event) => {
      console.log('🗑️ Cart line item removed:', event.detail);
      if (event.detail && event.detail.variant_id) {
        this.resetVariantQuantity(event.detail.variant_id.toString());
      }
    });

    // Method 3: Listen for remove button clicks with enhanced selectors
    document.addEventListener('click', (e) => {
      const removeSelectors = [
        '.remove-item-btn', '.cart-remove-btn', '[data-cart-remove]',
        '.cart__remove', '.remove', '.btn--remove', '.cart-item__remove',
        '[aria-label*="remove" i]', '[title*="remove" i]'
      ];
      
      if (removeSelectors.some(selector => e.target.matches(selector))) {
        console.log('🗑️ Remove button clicked:', e.target);
        
        const variantId = this.getVariantIdFromElement(e.target);
        if (variantId) {
          console.log(`Remove button clicked for variant: ${variantId}`);
          setTimeout(() => this.resetVariantQuantity(variantId), 200);
        }
      }
    });

    // Method 4: Listen for cart form submissions with quantity 0
    document.addEventListener('submit', (e) => {
      if (e.target.matches('form[action*="/cart"]')) {
        console.log('🛒 Cart form submitted');
        setTimeout(() => this.checkForRemovedItems(), 300);
      }
    });

    // Method 5: Listen for quantity input changes to 0
    document.addEventListener('change', (e) => {
      if (e.target.matches('input[name*="updates["]') && e.target.value === '0') {
        const variantId = this.extractVariantIdFromCartInput(e.target);
        if (variantId) {
          console.log(`🗑️ Quantity set to 0 for variant: ${variantId}`);
          setTimeout(() => this.resetVariantQuantity(variantId), 100);
        }
      }
    });

    // Method 6: Enhanced DOM observer for cart changes
    const cartObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const variantId = this.findVariantIdInRemovedNode(node);
            if (variantId) {
              console.log(`🗑️ Cart item removed via DOM mutation for variant: ${variantId}`);
              this.resetVariantQuantity(variantId);
            }
          }
        });
      });
    });

    // Observe more cart areas including common theme structures
    const cartAreas = document.querySelectorAll([
      '.cart', '.cart-drawer', '.cart-items', '#cart-items', '[data-cart]',
      '.drawer__contents', '.cart-content', '.ajax-cart', '.mini-cart',
      '.cart__items', '#CartItems', '.cart-form'
    ].join(', '));
    
    cartAreas.forEach(area => {
      cartObserver.observe(area, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-variant-id', 'data-line-id']
      });
    });

    this.cartObserver = cartObserver;

    // Method 7: Periodic cart state check if on cart page
    if (window.location.pathname.includes('/cart')) {
      this.startCartStateMonitoring();
    }
  }

  // Get variant ID from various element sources
  getVariantIdFromElement(element) {
    // Check data attributes on the element
    let variantId = element.dataset.variantId || element.dataset.lineId;
    
    // Check parent elements
    if (!variantId) {
      const parent = element.closest('[data-variant-id], [data-line-id], .cart-item, .line-item');
      if (parent) {
        variantId = parent.dataset.variantId || parent.dataset.lineId;
      }
    }
    
    // Check for input elements with updates[] name
    if (!variantId) {
      const input = element.closest('form')?.querySelector('input[name*="updates["]');
      if (input) {
        variantId = this.extractVariantIdFromCartInput(input);
      }
    }
    
    return variantId;
  }

  // Extract variant ID from cart input name
  extractVariantIdFromCartInput(input) {
    const nameMatch = input.name?.match(/updates\[(\d+)\]/);
    return nameMatch ? nameMatch[1] : null;
  }

  // Find variant ID in removed DOM node
  findVariantIdInRemovedNode(node) {
    if (!node.querySelector) {
      return node.dataset?.variantId || node.dataset?.lineId;
    }
    
    const cartItem = node.querySelector('[data-variant-id], [data-line-id], input[name*="updates["]');
    if (cartItem) {
      return cartItem.dataset?.variantId || 
             cartItem.dataset?.lineId || 
             this.extractVariantIdFromCartInput(cartItem);
    }
    
    return node.dataset?.variantId || node.dataset?.lineId;
  }

  // Check for items that were removed from cart
  checkForRemovedItems() {
    const currentQuantities = this.getCurrentQuantities();
    const cartItems = this.getCurrentCartItems();
    
    // Reset quantities for items no longer in cart
    Object.keys(currentQuantities).forEach(variantId => {
      if (!cartItems.includes(variantId) && currentQuantities[variantId] > 0) {
        console.log(`🗑️ Item ${variantId} no longer in cart, resetting quantity`);
        this.resetVariantQuantity(variantId);
      }
    });
  }

  // Get current cart items from DOM
  getCurrentCartItems() {
    const items = [];
    const cartElements = document.querySelectorAll('[data-variant-id], [data-line-id], input[name*="updates["]');
    
    cartElements.forEach(element => {
      const variantId = element.dataset?.variantId || 
                      element.dataset?.lineId || 
                      this.extractVariantIdFromCartInput(element);
      if (variantId && !items.includes(variantId)) {
        items.push(variantId);
      }
    });
    
    return items;
  }

  // Start monitoring cart state changes
  startCartStateMonitoring() {
    if (this.cartMonitorInterval) return;
    
    let lastCartItems = this.getCurrentCartItems();
    
    this.cartMonitorInterval = setInterval(() => {
      const currentCartItems = this.getCurrentCartItems();
      const removedItems = lastCartItems.filter(id => !currentCartItems.includes(id));
      
      removedItems.forEach(variantId => {
        console.log(`🗑️ Cart monitoring detected removed item: ${variantId}`);
        this.resetVariantQuantity(variantId);
      });
      
      lastCartItems = currentCartItems;
    }, 1500); // Check every 1.5 seconds
  }

  // Handle cart update events from Shopify
  handleCartUpdate(cartData) {
    console.log('Handling cart update:', cartData);
    
    if (!cartData || !cartData.items) return;
    
    // Get current quantities from the quick order form
    const currentQuantities = this.getCurrentQuantities();
    
    // Get variant IDs currently in cart
    const cartVariantIds = cartData.items.map(item => item.variant_id?.toString() || item.id?.toString()).filter(Boolean);
    
    // Find variants that were in our form but are no longer in cart
    Object.keys(currentQuantities).forEach(variantId => {
      if (!cartVariantIds.includes(variantId)) {
        console.log(`Variant ${variantId} was removed from cart, resetting quantity`);
        this.resetVariantQuantity(variantId);
      }
    });
  }

  // Bind events to quantity inputs and form submission
  bindQuantityEvents() {
    console.log('Binding quantity events...');
    
    // Auto-save when quantities change
    document.addEventListener('change', (e) => {
      if (e.target.matches('input[data-variant-id], input[name^="updates["]')) {
        console.log('Quantity changed for input:', e.target);
        this.handleQuantityChange(e.target);
      }
    });
    
    // Also save on input (for real-time updates)
    document.addEventListener('input', (e) => {
      if (e.target.matches('input[data-variant-id], input[name^="updates["]')) {
        // Debounce the quantity change to avoid too many requests
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          this.handleQuantityChange(e.target);
        }, 1000);
      }
    });
  }

  // Handle quantity change - update cart and metafields
  async handleQuantityChange(input) {
    // Prevent handling the same change multiple times
    if (this.isHandlingChange) {
      return;
    }
    
    this.isHandlingChange = true;
    
    try {
      const variantId = input.dataset.variantId || input.name.match(/\[(\d+)\]/)?.[1];
      const newQuantity = parseInt(input.value) || 0;
      
      console.log(`Quantity changed for variant ${variantId}: ${newQuantity}`);
      
      // Update the cart with new quantity
      await this.updateCartQuantity(variantId, newQuantity);
      
      // Save current state to metafields
      await this.saveCurrentQuantities();
      
    } catch (error) {
      console.error('Error handling quantity change:', error);
    } finally {
      this.isHandlingChange = false;
    }
  }

  // Update cart quantity via Shopify Cart API
  async updateCartQuantity(variantId, quantity) {
    try {
      const updates = {};
      updates[variantId] = quantity;
      
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      });
      
      if (response.ok) {
        const cartData = await response.json();
        console.log(`✅ Cart updated for variant ${variantId}: ${quantity}`);
        
        // Trigger cart updated event for theme compatibility
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { cart: cartData }
        }));
        
        return cartData;
      } else {
        throw new Error('Failed to update cart');
      }
      
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }

  bindFormEvents() {
    console.log('Binding form events...');
    
    // Save before form submission
    const form = document.querySelector('.quick-order-form, #quick-order-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('Form submitting, saving quantities...');
        this.saveCurrentQuantities();
      });
    }
  }

  // Get current quantities from all inputs
  getCurrentQuantities() {
    const quantities = {};
    
    // Find all quantity inputs
    const inputs = document.querySelectorAll('input[data-variant-id], input[name^="updates["]');
    console.log('Found quantity inputs:', inputs.length);
    
    inputs.forEach(input => {
      const variantId = input.dataset.variantId || input.name.match(/\[(\d+)\]/)?.[1];
      const quantity = parseInt(input.value) || 0;
      
      if (variantId && quantity > 0) {
        quantities[variantId] = quantity;
      }
    });
    
    console.log('Current quantities:', quantities);
    return quantities;
  }

  // Save current quantities
  async saveCurrentQuantities() {
    // Prevent save loops
    if (this.isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }
    
    this.isSaving = true;
    
    try {
      const quantities = this.getCurrentQuantities();
      console.log('Saving quantities:', quantities);
      
      if (this.isCustomer) {
        await this.saveQuantitiesToMetafields(quantities);
      } else {
        this.saveQuantitiesToLocalStorage(quantities);
      }
    } finally {
      this.isSaving = false;
    }
  }

  // localStorage methods for quantities
  loadQuantitiesFromLocalStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading quantities from localStorage:', error);
      return {};
    }
  }

  saveQuantitiesToLocalStorage(quantities) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(quantities));
      console.log('Quantities saved to localStorage');
    } catch (error) {
      console.error('Error saving quantities to localStorage:', error);
    }
  }

  // Metafield methods for quantities
  async loadQuantitiesFromMetafields() {
    try {
      console.log('Loading quantities from metafields...');
      const response = await fetch('/apps/quick-order/cart/metafields?customerId=' + this.customerId, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Metafield response:', data);
        
        // Return the quantities directly (stored as JSON in metafield)
        return data.cartData && data.cartData.quantities ? data.cartData.quantities : {};
      } else {
        console.error('Failed to load quantities from metafields');
        return {};
      }
    } catch (error) {
      console.error('Error loading quantities from metafields:', error);
      return {};
    }
  }

  async saveQuantitiesToMetafields(quantities) {
    try {
      console.log('💾 Saving quantities to metafields:', quantities);
      
      const cartData = {
        quantities: quantities,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/apps/quick-order/cart/metafields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: this.customerId,
          cartData: cartData
        })
      });

      if (response.ok) {
        console.log('✅ Quantities saved to metafields successfully');
      } else {
        console.error('❌ Failed to save quantities to metafields');
      }
    } catch (error) {
      console.error('❌ Error saving quantities to metafields:', error);
    }
  }

  // Cleanup method to stop polling
  cleanup() {
    if (this.cartPollInterval) {
      clearInterval(this.cartPollInterval);
      this.cartPollInterval = null;
    }
    
    if (this.cartObserver) {
      this.cartObserver.disconnect();
      this.cartObserver = null;
    }
    
    console.log('🧹 PersistentCart cleanup completed');
  }
}

// Search and Filter functionality
class QuickOrderSearch {
  constructor() {
    this.rows = document.querySelectorAll(".table-row");
    this.searchInput = document.getElementById("collection-search");
    this.collectionSelect = document.getElementById("collection-select");
    this.currentPage = 1;
    this.productsPerPage = 10;
    this.filteredRows = Array.from(this.rows);
    
    this.init();
  }

  init() {
    if (!this.searchInput || !this.collectionSelect) {
      console.log('Search elements not found, skipping search initialization');
      return;
    }
    
    this.setupMobileLabels();
    this.bindEvents();
    this.updatePagination();
    this.showCurrentPage();
  }

  setupMobileLabels() {
    if (window.innerWidth <= 749) {
      this.rows.forEach(row => {
        const priceCell = row.querySelector('.price-column');
        const quantityCell = row.querySelector('.quantity-column');
        const totalCell = row.querySelector('.total-column');
        
        if (priceCell) priceCell.setAttribute('data-label', 'Price');
        if (quantityCell) quantityCell.setAttribute('data-label', 'Quantity');
        if (totalCell) totalCell.setAttribute('data-label', 'Total');
      });
    }
  }

  bindEvents() {
    this.searchInput.addEventListener("input", () => this.filterProducts());
    this.collectionSelect.addEventListener("change", () => this.filterProducts());
    
    // Pagination events
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.goToPage(this.currentPage - 1);
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredRows.length / this.productsPerPage);
        if (this.currentPage < totalPages) {
          this.goToPage(this.currentPage + 1);
        }
      });
    }
  }

  filterProducts() {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    const selectedCollection = this.collectionSelect.value;

    this.filteredRows = Array.from(this.rows).filter(row => {
      const productTitle = (row.dataset.productTitle || '').toLowerCase();
      const productSku = (row.dataset.productSku || '').toLowerCase();
      const variantSku = (row.dataset.variantSku || '').toLowerCase();
      const productCollections = row.dataset.collections;

      const matchesSearch = searchTerm === '' || 
                           productTitle.includes(searchTerm) ||
                           productSku.includes(searchTerm) ||
                           variantSku.includes(searchTerm);
      const matchesCollection = selectedCollection === 'all' ||
        (productCollections && productCollections.includes(selectedCollection));

      return matchesSearch && matchesCollection;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.showCurrentPage();
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredRows.length / this.productsPerPage);
    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = Math.min(startIndex + this.productsPerPage, this.filteredRows.length);

    // Update pagination info
    const showingStart = document.getElementById('showing-start');
    const showingEnd = document.getElementById('showing-end');
    const totalProducts = document.getElementById('total-products');
    
    if (showingStart) showingStart.textContent = this.filteredRows.length > 0 ? startIndex + 1 : 0;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (totalProducts) totalProducts.textContent = this.filteredRows.length;

    // Update pagination buttons
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;

    // Update page numbers
    const pageNumbersContainer = document.getElementById('page-numbers');
    if (pageNumbersContainer) {
      pageNumbersContainer.innerHTML = '';

      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => this.goToPage(i));
        pageNumbersContainer.appendChild(pageBtn);
      }
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.showCurrentPage();
    this.updatePagination();
  }

  showCurrentPage() {
    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;

    // Hide all rows first
    this.rows.forEach(row => {
      row.style.display = 'none';
    });

    // Show filtered rows for current page
    this.filteredRows.forEach((row, index) => {
      if (index >= startIndex && index < endIndex) {
        row.style.display = '';
      }
    });
  }
}

// Price calculation functionality
class PriceCalculator {
  constructor() {
    this.init();
  }

  init() {
    this.bindPriceEvents();
    this.updateSubtotal();
  }

  bindPriceEvents() {
    // Bind to all quantity inputs
    document.addEventListener('input', (e) => {
      if (e.target.matches('.qty-input')) {
        this.updateRowTotal(e.target.closest('.table-row, .product-row, .variant-row'));
        this.updateSubtotal();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.matches('.qty-input')) {
        this.updateRowTotal(e.target.closest('.table-row, .product-row, .variant-row'));
        this.updateSubtotal();
      }
    });
  }

  updateRowTotal(row) {
    if (!row) return;
    
    const qtyInput = row.querySelector(".qty-input");
    const rowTotal = row.querySelector(".row-total");
    const priceElement = row.querySelector(".price");
    
    if (qtyInput && rowTotal && priceElement) {
      let price = 0;
      
      // Priority 1: Use data-price attribute (Shopify prices in cents)
      if (priceElement.dataset.price) {
        const priceInCents = parseInt(priceElement.dataset.price) || 0;
        price = priceInCents / 100; // Convert cents to rupees
      }
      // Priority 2: Parse displayed text if data-price not available
      else {
        const priceText = priceElement.textContent;
        const cleanPrice = priceText.toString()
          .replace(/[Rs\s₹$£€]/g, '') // Remove currency symbols
          .replace(/,/g, '') // Remove commas
          .replace(/[^\d.]/g, ''); // Keep only digits and decimal
        price = parseFloat(cleanPrice) || 0;
      }
      
      const quantity = parseInt(qtyInput.value) || 0;
      const total = (price * quantity).toFixed(2);
      rowTotal.textContent = `Rs ${total}`;
    }
  }

  calculateSubtotal() {
    let subtotal = 0;
    
    // Get ALL quantity inputs regardless of pagination visibility
    const qtyInputs = document.querySelectorAll(".qty-input");
    qtyInputs.forEach(input => {
      const quantity = parseInt(input.value) || 0;
      if (quantity > 0) {
        // Find the price element in the same row
        const row = input.closest('.table-row, .product-row, .variant-row');
        // REMOVED: row.style.display !== 'none' check to include all pages
        if (row) {
          const priceElement = row.querySelector('.price');
          if (priceElement) {
            let price = 0;
            
            // Priority 1: Use data-price attribute (Shopify prices in cents)
            if (priceElement.dataset.price) {
              const priceInCents = parseInt(priceElement.dataset.price) || 0;
              price = priceInCents / 100; // Convert cents to rupees
              console.log(`Using data-price: ${priceInCents} cents = ${price} rupees`);
            }
            // Priority 2: Parse displayed text if data-price not available
            else {
              const priceText = priceElement.textContent;
              const cleanPrice = priceText.toString()
                .replace(/[Rs\s₹$£€]/g, '') // Remove currency symbols
                .replace(/,/g, '') // Remove commas
                .replace(/[^\d.]/g, ''); // Keep only digits and decimal
              price = parseFloat(cleanPrice) || 0;
              console.log(`Using text price: "${priceText}" -> ${price} rupees`);
            }
            
            const lineTotal = price * quantity;
            subtotal += lineTotal;
            
            console.log(`Multi-page calculation: ${price} x ${quantity} = ${lineTotal}`);
          }
        }
      }
    });
    
    console.log('🧮 Total subtotal calculated (all pages):', subtotal.toFixed(2));
    return subtotal;
  }

  updateSubtotal() {
    const subtotal = this.calculateSubtotal();
    const subtotalElement = document.getElementById("subtotal-amount");
    if (subtotalElement) {
      subtotalElement.textContent = `Rs ${subtotal.toFixed(2)}`;
      console.log('✅ Subtotal updated:', `Rs ${subtotal.toFixed(2)}`);
    } else {
      console.warn('❌ Subtotal element not found (#subtotal-amount)');
    }
  }
}

// Variant Toggle functionality
class VariantToggle {
  constructor() {
    this.init();
  }

  init() {
    this.bindToggleEvents();
  }

  bindToggleEvents() {
    // Add click event listeners to all variant toggle buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.variant-toggle-btn')) {
        this.handleToggle(e.target.closest('.variant-toggle-btn'));
      }
    });
  }

  handleToggle(button) {
    const productId = button.dataset.productId;
    const variantRows = document.querySelector(`.variant-rows[data-product-id="${productId}"]`);
    const toggleText = button.querySelector('.toggle-text');
    const toggleIcon = button.querySelector('.toggle-icon');
    
    if (!variantRows) {
      console.warn('Variant rows not found for product:', productId);
      return;
    }

    // Toggle visibility
    if (variantRows.style.display === 'none' || !variantRows.style.display) {
      // Show variants
      variantRows.style.display = 'block';
      toggleText.textContent = 'Hide Variants';
      toggleIcon.textContent = '▲';
      button.classList.add('expanded');
      
      console.log(`Showing variants for product ${productId}`);
    } else {
      // Hide variants
      variantRows.style.display = 'none';
      toggleText.textContent = 'Show Variants';
      toggleIcon.textContent = '▼';
      button.classList.remove('expanded');
      
      console.log(`Hiding variants for product ${productId}`);
    }

    // Update subtotal in case any hidden variant quantities affect the total
    setTimeout(() => {
      if (window.priceCalculator) {
        window.priceCalculator.updateSubtotal();
      }
    }, 100);
  }
}

// Initialize all functionality when the page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Quick Order functionality...');
  
  // Initialize persistent cart
  window.persistentCart = new PersistentCart();
  
  // Initialize search and filtering
  window.quickOrderSearch = new QuickOrderSearch();
  
  // Initialize price calculations
  window.priceCalculator = new PriceCalculator();
  
  // Initialize variant toggle functionality
  window.variantToggle = new VariantToggle();
  
  console.log('✅ All Quick Order functionality initialized');
});

// Global function to reset variant quantity (can be called from anywhere)
window.resetVariantQuantity = function(variantId) {
  console.log(`🌍 Global function called to reset variant ${variantId}`);
  if (window.persistentCart) {
    window.persistentCart.resetVariantQuantity(variantId);
  } else {
    console.warn('PersistentCart not initialized yet');
  }
};

// Global function to handle cart removal events
window.handleCartItemRemoval = function(variantIds) {
  console.log(`🌍 Global function called to handle cart item removal:`, variantIds);
  if (window.persistentCart) {
    const ids = Array.isArray(variantIds) ? variantIds : [variantIds];
    ids.forEach(variantId => {
      if (variantId) {
        window.persistentCart.resetVariantQuantity(variantId);
      }
    });
  } else {
    console.warn('PersistentCart not initialized yet');
  }
};
// Quick Order List JavaScript
class QuickOrderList {
  constructor(container) {
    console.log('🔧 QuickOrderList constructor called with container:', container);
    this.container = container;
    this.productId = container.dataset.productId;
    this.variantId = container.dataset.variantId;
    console.log('📋 Product ID:', this.productId, 'Variant ID:', this.variantId);
    this.init();
  }

  init() {
    // Check if we have a valid product
    if (this.productId && this.productId !== 'no-product') {
      this.bindEvents();
      this.setupFormValidation();
    } else {
      this.handleNoProduct();
    }
  }

  handleNoProduct() {
    console.log('QuickOrderList: No product object available');
    
    // Try to get product from URL if we're on a product page
    const urlPath = window.location.pathname;
    if (urlPath.includes('/products/')) {
      const handle = urlPath.split('/products/')[1]?.split('?')[0]?.split('#')[0];
      if (handle) {
        this.fetchProductByHandle(handle);
      }
    }
    
    // Show error message
    const errorElement = this.container.querySelector('.quick-order-error');
    if (errorElement) {
      errorElement.style.display = 'block';
    }
  }

  async fetchProductByHandle(handle) {
    try {
      console.log('QuickOrderList: Fetching product by handle:', handle);
      
      // Try to fetch product data from Shopify's product API
      const response = await fetch(`/products/${handle}.js`);
      if (response.ok) {
        const productData = await response.json();
        this.updateProductData(productData);
      } else {
        console.error('QuickOrderList: Failed to fetch product data');
      }
    } catch (error) {
      console.error('QuickOrderList: Error fetching product:', error);
    }
  }

  updateProductData(productData) {
    console.log('QuickOrderList: Updating product data:', productData);
    
    // Update the container data attributes
    this.container.dataset.productId = productData.id;
    this.container.dataset.variantId = productData.variants[0]?.id || 'no-variant';
    
    // Update the product title
    const titleElement = this.container.querySelector('h4');
    if (titleElement && productData.title) {
      titleElement.textContent = productData.title;
    }
    
    // Update the price
    const priceElement = this.container.querySelector('.price__regular');
    if (priceElement && productData.variants[0]?.price) {
      priceElement.textContent = this.formatPrice(productData.variants[0].price);
    }
    
    // Update the variant ID input
    const variantInput = this.container.querySelector('input[name="id"]');
    if (variantInput && productData.variants[0]?.id) {
      variantInput.value = productData.variants[0].id;
    }
    
    // Update SKU if available
    const skuElement = this.container.querySelector('.sku');
    if (skuElement && productData.variants[0]?.sku) {
      skuElement.textContent = `SKU: ${productData.variants[0].sku}`;
    }
    
    // Update product image if available
    const imageElement = this.container.querySelector('.quick-order-image img');
    if (imageElement && productData.featured_image) {
      imageElement.src = productData.featured_image;
      imageElement.alt = productData.title;
    }
    
    // Hide error message and enable functionality
    const errorElement = this.container.querySelector('.quick-order-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    
    // Now bind events since we have product data
    this.bindEvents();
    this.setupFormValidation();
    
    console.log('QuickOrderList: Product data updated successfully');
  }

  formatPrice(price) {
    // Simple price formatting - you might want to use Shopify's money format
    return `$${(price / 100).toFixed(2)}`;
  }

  bindEvents() {
    // Add to cart button
    const addToCartButton = this.container.querySelector('.quick-order-add-to-cart');
    if (addToCartButton) {
      addToCartButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.addToCart();
      });
    }

    // Quantity input validation
    const quantityInput = this.container.querySelector('.quantity-input');
    if (quantityInput) {
      quantityInput.addEventListener('input', (e) => {
        this.validateQuantity(e.target);
      });
      
      quantityInput.addEventListener('blur', (e) => {
        this.normalizeQuantity(e.target);
      });
    }

    // Form submission
    const form = this.container.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addToCart();
      });
    }
  }

  setupFormValidation() {
    const quantityInput = this.container.querySelector('.quantity-input');
    if (quantityInput) {
      // Set min and max attributes
      quantityInput.setAttribute('min', '1');
      quantityInput.setAttribute('max', '99');
      
      // Add validation message container
      const validationMessage = document.createElement('div');
      validationMessage.className = 'quantity-validation-message';
      validationMessage.style.cssText = `
        font-size: 12px;
        color: #d82c0d;
        margin-top: 4px;
        display: none;
      `;
      quantityInput.parentNode.appendChild(validationMessage);
    }
  }

  validateQuantity(input) {
    const value = parseInt(input.value);
    const validationMessage = input.parentNode.querySelector('.quantity-validation-message');
    
    if (isNaN(value) || value < 1) {
      this.showValidationMessage(validationMessage, 'Please enter a valid quantity (minimum 1)');
      return false;
    } else if (value > 99) {
      this.showValidationMessage(validationMessage, 'Maximum quantity is 99');
      return false;
    } else {
      this.hideValidationMessage(validationMessage);
      return true;
    }
  }

  normalizeQuantity(input) {
    const value = parseInt(input.value);
    if (isNaN(value) || value < 1) {
      input.value = '1';
    } else if (value > 99) {
      input.value = '99';
    }
  }

  showValidationMessage(element, message) {
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }

  hideValidationMessage(element) {
    if (element) {
      element.style.display = 'none';
    }
  }

  addToCart() {
    const quantityInput = this.container.querySelector('.quantity-input');
    const addToCartButton = this.container.querySelector('.quick-order-add-to-cart');
    
    if (!quantityInput || !addToCartButton) return;

    // Validate quantity
    if (!this.validateQuantity(quantityInput)) {
      return;
    }

    const quantity = parseInt(quantityInput.value);
    const variantId = this.getVariantId();

    if (!variantId) {
      this.showError('Product variant not found');
      return;
    }

    // Disable button and show loading state
    this.setLoadingState(addToCartButton, true);

    // Prepare cart data
    const cartData = {
      items: [{
        id: variantId,
        quantity: quantity
      }]
    };

    // Add to cart using Shopify's Cart API
    this.addToCartAPI(cartData)
      .then(response => {
        if (response.ok) {
          this.showSuccess('Product added to cart successfully!');
          
          // Also add to persistent cart for metafield storage
          if (window.persistentCart) {
            const productTitle = this.getProductTitle();
            window.persistentCart.addToCart(variantId, quantity, productTitle)
              .catch(error => {
                console.error('Failed to save to persistent cart:', error);
              });
          }
          
          this.resetForm();
        } else {
          throw new Error('Failed to add to cart');
        }
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        this.showError('Failed to add product to cart. Please try again.');
      })
      .finally(() => {
        this.setLoadingState(addToCartButton, false);
      });
  }

  getProductTitle() {
    // Try to get product title from various sources
    const titleElement = this.container.querySelector('.product-title, .product-name, h3, h2');
    if (titleElement) {
      return titleElement.textContent.trim();
    }
    
    // Fallback to data attribute or generic name
    const productData = this.container.querySelector('[data-product-title]');
    if (productData) {
      return productData.getAttribute('data-product-title');
    }
    
    return 'Product'; // Generic fallback
  }

  getVariantId() {
    // Try to get variant ID from various sources
    const variantIdInput = this.container.querySelector('input[name="id"]');
    if (variantIdInput) {
      return variantIdInput.value;
    }

    // Check if we have a product variant selector
    const variantSelector = this.container.querySelector('select[name="id"]');
    if (variantSelector) {
      return variantSelector.value;
    }

    // Try to get from data attribute
    return this.container.dataset.variantId;
  }

  async addToCartAPI(cartData) {
    // Use Shopify's Cart API endpoint
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartData)
    });
  }

  setLoadingState(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.textContent = 'Adding...';
      button.style.opacity = '0.7';
    } else {
      button.disabled = false;
      button.textContent = 'Add to Cart';
      button.style.opacity = '1';
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `quick-order-notification quick-order-notification--${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // Set background color based on type
    if (type === 'success') {
      notification.style.backgroundColor = '#008060';
    } else {
      notification.style.backgroundColor = '#d82c0d';
    }

    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  resetForm() {
    const quantityInput = this.container.querySelector('.quantity-input');
    if (quantityInput) {
      quantityInput.value = '1';
      this.hideValidationMessage(quantityInput.parentNode.querySelector('.quantity-validation-message'));
    }
  }
}

// Initialize quick order lists when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 QuickOrderList script loaded!');
  const containers = document.querySelectorAll('.quick-order-list');
  console.log('📦 Found containers:', containers.length);
  containers.forEach(container => {
    console.log('✅ Initializing QuickOrderList for container:', container);
    new QuickOrderList(container);
  });
});

// Export for potential external use
window.QuickOrderList = QuickOrderList; 
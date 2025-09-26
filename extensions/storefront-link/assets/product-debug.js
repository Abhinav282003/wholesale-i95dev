// Product Debug Script
// This script helps debug product object creation and availability

class ProductDebugger {
  constructor() {
    this.init();
  }

  init() {
    console.log('ProductDebugger: Initializing...');
    this.checkProductContext();
    this.monitorProductChanges();
    this.setupDebugUI();
  }

  checkProductContext() {
    console.log('ProductDebugger: Checking product context...');
    
    // Check if we're on a product page
    const isProductPage = window.location.pathname.includes('/products/');
    console.log('ProductDebugger: Is product page:', isProductPage);
    
    // Check for product data in various locations
    this.checkShopifyProductData();
    this.checkQuickOrderElements();
  }

  checkShopifyProductData() {
    // Check for Shopify's product data
    if (typeof window.Shopify !== 'undefined' && window.Shopify.product) {
      console.log('ProductDebugger: Shopify.product found:', window.Shopify.product);
    } else {
      console.log('ProductDebugger: Shopify.product not found');
    }

    // Check for product data in meta tags
    const productMeta = document.querySelector('meta[property="product:price:amount"]');
    if (productMeta) {
      console.log('ProductDebugger: Product meta tag found:', productMeta.content);
    } else {
      console.log('ProductDebugger: Product meta tag not found');
    }
  }

  checkQuickOrderElements() {
    const quickOrderElements = document.querySelectorAll('.quick-order-list');
    console.log('ProductDebugger: Quick order elements found:', quickOrderElements.length);
    
    quickOrderElements.forEach((element, index) => {
      const productId = element.dataset.productId;
      const variantId = element.dataset.variantId;
      
      console.log(`ProductDebugger: Element ${index + 1}:`, {
        productId,
        variantId,
        hasProduct: productId && productId !== 'no-product',
        element: element
      });
    });
  }

  monitorProductChanges() {
    // Monitor for dynamic changes to product data
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-product-id') {
          console.log('ProductDebugger: Product ID changed:', {
            target: mutation.target,
            oldValue: mutation.oldValue,
            newValue: mutation.target.dataset.productId
          });
        }
      });
    });

    // Observe all quick order elements
    const quickOrderElements = document.querySelectorAll('.quick-order-list');
    quickOrderElements.forEach(element => {
      observer.observe(element, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['data-product-id', 'data-variant-id']
      });
    });
  }

  setupDebugUI() {
    // Create a debug panel if in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('myshopify.com')) {
      this.createDebugPanel();
    }
  }

  createDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'product-debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: #333;
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    `;

    debugPanel.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Product Debug Info</strong>
        <button onclick="document.getElementById('product-debug-panel').remove()" 
                style="float: right; background: #666; border: none; color: #fff; cursor: pointer;">×</button>
      </div>
      <div id="debug-content">
        <div>Page: ${window.location.pathname}</div>
        <div>Product Page: ${window.location.pathname.includes('/products/') ? 'Yes' : 'No'}</div>
        <div>Quick Order Elements: ${document.querySelectorAll('.quick-order-list').length}</div>
      </div>
    `;

    document.body.appendChild(debugPanel);
    
    // Update debug info periodically
    setInterval(() => {
      this.updateDebugInfo();
    }, 2000);
  }

  updateDebugInfo() {
    const debugContent = document.getElementById('debug-content');
    if (debugContent) {
      const quickOrderElements = document.querySelectorAll('.quick-order-list');
      const productElements = quickOrderElements.length;
      const validProducts = Array.from(quickOrderElements).filter(el => 
        el.dataset.productId && el.dataset.productId !== 'no-product'
      ).length;

      debugContent.innerHTML = `
        <div>Page: ${window.location.pathname}</div>
        <div>Product Page: ${window.location.pathname.includes('/products/') ? 'Yes' : 'No'}</div>
        <div>Quick Order Elements: ${productElements}</div>
        <div>Valid Products: ${validProducts}</div>
        <div>Time: ${new Date().toLocaleTimeString()}</div>
      `;
    }
  }

  // Public method to manually trigger product fetch
  async fetchProductByHandle(handle) {
    console.log('ProductDebugger: Manually fetching product:', handle);
    
    try {
      const response = await fetch(`/products/${handle}.js`);
      if (response.ok) {
        const productData = await response.json();
        console.log('ProductDebugger: Product data fetched:', productData);
        return productData;
      } else {
        console.error('ProductDebugger: Failed to fetch product data');
        return null;
      }
    } catch (error) {
      console.error('ProductDebugger: Error fetching product:', error);
      return null;
    }
  }
}

// Initialize debugger when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.productDebugger = new ProductDebugger();
});

// Export for external use
window.ProductDebugger = ProductDebugger; 
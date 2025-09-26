// Price Per Item JavaScript
class PricePerItem {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.bindEvents();
    this.updatePricePerItem();
  }

  bindEvents() {
    const quantityInput = this.container.querySelector('.quantity-input');
    if (quantityInput) {
      quantityInput.addEventListener('change', () => {
        this.updatePricePerItem();
      });
      
      quantityInput.addEventListener('input', () => {
        this.updatePricePerItem();
      });
    }
  }

  updatePricePerItem() {
    const quantityInput = this.container.querySelector('.quantity-input');
    const priceElement = this.container.querySelector('.price__regular');
    const pricePerItemElement = this.container.querySelector('.price-per-item');
    
    if (!quantityInput || !priceElement) return;

    const quantity = parseInt(quantityInput.value) || 1;
    const priceText = priceElement.textContent.trim();
    const price = this.extractPrice(priceText);
    
    if (price && quantity > 0) {
      const pricePerItem = price / quantity;
      const formattedPricePerItem = this.formatPrice(pricePerItem);
      
      if (pricePerItemElement) {
        pricePerItemElement.textContent = `(${formattedPricePerItem} each)`;
      } else {
        this.createPricePerItemElement(formattedPricePerItem);
      }
    }
  }

  extractPrice(priceText) {
    // Remove currency symbols and commas, then parse as float
    const cleanPrice = priceText.replace(/[^\d.,]/g, '');
    const price = parseFloat(cleanPrice.replace(',', '.'));
    return isNaN(price) ? null : price;
  }

  formatPrice(price) {
    // Format price with 2 decimal places
    return price.toFixed(2);
  }

  createPricePerItemElement(formattedPrice) {
    const priceContainer = this.container.querySelector('.price');
    if (!priceContainer) return;

    const pricePerItemElement = document.createElement('span');
    pricePerItemElement.className = 'price-per-item';
    pricePerItemElement.style.cssText = `
      font-size: 12px;
      color: #6d7175;
      font-weight: 400;
      margin-left: 8px;
    `;
    pricePerItemElement.textContent = `(${formattedPrice} each)`;
    
    priceContainer.appendChild(pricePerItemElement);
  }
}

// Initialize price per item calculations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.quick-order-list');
  containers.forEach(container => {
    new PricePerItem(container);
  });
});

// Export for potential external use
window.PricePerItem = PricePerItem; 
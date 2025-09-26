// Quantity Popover JavaScript
class QuantityPopover {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createPopover();
    this.bindEvents();
  }

  createPopover() {
    const trigger = this.container.querySelector('.quantity-input');
    if (!trigger) return;

    // Create popover container
    const popover = document.createElement('div');
    popover.className = 'quantity-popover__content';
    popover.style.display = 'none';
    
    popover.innerHTML = `
      <div class="quantity-popover__header">
        <h4 class="quantity-popover__title">Select Quantity</h4>
        <button class="quantity-popover__close" aria-label="Close">×</button>
      </div>
      <div class="quantity-popover__input-group">
        <label class="quantity-popover__label">Quantity:</label>
        <div class="quantity-stepper">
          <button class="quantity-stepper__button" data-action="decrease">−</button>
          <input type="number" class="quantity-stepper__input" value="1" min="1" max="99">
          <button class="quantity-stepper__button" data-action="increase">+</button>
        </div>
      </div>
      <div class="quantity-popover__buttons">
        <button class="quantity-popover__button quantity-popover__button--secondary" data-action="cancel">Cancel</button>
        <button class="quantity-popover__button quantity-popover__button--primary" data-action="confirm">Confirm</button>
      </div>
    `;

    // Insert popover after trigger
    trigger.parentNode.insertBefore(popover, trigger.nextSibling);
    this.popover = popover;
  }

  bindEvents() {
    const trigger = this.container.querySelector('.quantity-input');
    if (!trigger) return;

    // Toggle popover on trigger click
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle();
    });

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });

    // Popover events
    this.popover.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'close':
        case 'cancel':
          this.close();
          break;
        case 'confirm':
          this.confirm();
          break;
        case 'increase':
          this.increaseQuantity();
          break;
        case 'decrease':
          this.decreaseQuantity();
          break;
      }
    });

    // Handle quantity input changes
    const quantityInput = this.popover.querySelector('.quantity-stepper__input');
    if (quantityInput) {
      quantityInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 1;
        e.target.value = Math.max(1, Math.min(99, value));
      });
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.popover.style.display = 'block';
    this.isOpen = true;
    
    // Focus on quantity input
    const quantityInput = this.popover.querySelector('.quantity-stepper__input');
    if (quantityInput) {
      quantityInput.focus();
      quantityInput.select();
    }
  }

  close() {
    this.popover.style.display = 'none';
    this.isOpen = false;
  }

  confirm() {
    const quantityInput = this.popover.querySelector('.quantity-stepper__input');
    const trigger = this.container.querySelector('.quantity-input');
    
    if (quantityInput && trigger) {
      trigger.value = quantityInput.value;
      trigger.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    this.close();
  }

  increaseQuantity() {
    const quantityInput = this.popover.querySelector('.quantity-stepper__input');
    if (quantityInput) {
      const currentValue = parseInt(quantityInput.value) || 1;
      quantityInput.value = (99, currentValue + 1);
    }
  }

  decreaseQuantity() {
    const quantityInput = this.popover.querySelector('.quantity-stepper__input');
    if (quantityInput) {
      const currentValue = parseInt(quantityInput.value) || 1;
      quantityInput.value = Math.max(1, currentValue - 1);
    }
  }
}

// Initialize quantity popovers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.quick-order-list');
  containers.forEach(container => {
    new QuantityPopover(container);
  });
});

// Export for potential external use
window.QuantityPopover = QuantityPopover; 
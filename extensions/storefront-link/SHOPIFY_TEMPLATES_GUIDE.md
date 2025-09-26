# Shopify Templates and Liquid Guide

## Overview

In Shopify, templates are reusable pieces of Liquid code that help you organize and modularize your storefront code. This guide explains how to create and use different types of templates in Shopify.

## Types of Templates in Shopify

### 1. **Snippets** (Most Common)
Snippets are reusable pieces of Liquid code that can be included in other templates.

**Location**: `snippets/` directory
**File extension**: `.liquid`
**Usage**: `{% render 'snippet-name' %}`

### 2. **Page Templates**
Full page templates that can be assigned to specific pages.

**Location**: `templates/page.{template-name}.liquid`
**Usage**: Assigned through Shopify admin

### 3. **Section Templates**
Modular page sections that can be added to themes.

**Location**: `sections/{section-name}.liquid`
**Usage**: Added through theme customizer

## Creating Snippets

### Basic Snippet Structure

```liquid
{% comment %}
  Snippet Name: product-card
  Usage: {% render 'product-card', product: product %}
  
  Parameters:
  - product: The product object to display
  - show_vendor: Boolean to show/hide vendor (default: true)
{% endcomment %}

<div class="product-card">
  <!-- Your HTML/Liquid code here -->
</div>

<style>
  /* Your CSS here */
</style>

<script>
  // Your JavaScript here
</script>
```

### Snippet with Parameters

```liquid
{% comment %}
  Usage: {% render 'product-card', product: product, show_vendor: false %}
{% endcomment %}

<div class="product-card" data-product-id="{{ product.id }}">
  <div class="product-image">
    {% if product.featured_image %}
      <img src="{{ product.featured_image | img_url: '300x300' }}" alt="{{ product.title }}">
    {% endif %}
  </div>
  
  <div class="product-info">
    <h3>{{ product.title }}</h3>
    
    {% if show_vendor != false and product.vendor %}
      <p class="vendor">{{ product.vendor }}</p>
    {% endif %}
    
    <div class="price">{{ product.price | money }}</div>
  </div>
</div>
```

## Using Snippets

### Basic Usage
```liquid
{% render 'product-card' %}
```

### With Parameters
```liquid
{% render 'product-card', 
  product: product, 
  show_vendor: true, 
  show_price: false 
%}
```

### Conditional Rendering
```liquid
{% if product.available %}
  {% render 'product-card', product: product %}
{% else %}
  {% render 'product-unavailable', product: product %}
{% endif %}
```

## Best Practices

### 1. **Documentation**
Always include a comment block at the top of your snippet explaining:
- What the snippet does
- Required parameters
- Optional parameters with defaults
- Usage examples

### 2. **Parameter Defaults**
Use Liquid filters to set default values:
```liquid
{% assign show_vendor = show_vendor | default: true %}
{% assign image_size = image_size | default: '300x300' %}
```

### 3. **Modular Design**
Break down complex templates into smaller, reusable snippets:
```liquid
<!-- Main template -->
<div class="product-page">
  {% render 'product-header', product: product %}
  {% render 'product-gallery', product: product %}
  {% render 'product-details', product: product %}
  {% render 'product-actions', product: product %}
</div>
```

### 4. **Consistent Naming**
Use descriptive, consistent names:
- `product-card.liquid`
- `collection-grid.liquid`
- `pagination-controls.liquid`

## Advanced Techniques

### 1. **Nested Snippets**
Snippets can call other snippets:
```liquid
{% comment %}
  collection-grid.liquid
{% endcomment %}

<div class="collection-grid">
  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}
</div>
```

### 2. **Dynamic Snippet Names**
Use variables to dynamically choose snippets:
```liquid
{% assign card_style = card_style | default: 'default' %}
{% render 'product-card-' | append: card_style, product: product %}
```

### 3. **Snippet with JavaScript**
Include JavaScript in your snippets for interactivity:
```liquid
<div class="product-card" data-product-id="{{ product.id }}">
  <!-- HTML content -->
</div>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
      card.addEventListener('click', function() {
        const productId = this.dataset.productId;
        // Handle click event
      });
    });
  });
</script>
```

## File Organization

### Recommended Structure
```
snippets/
├── components/
│   ├── product-card.liquid
│   ├── collection-grid.liquid
│   └── pagination-controls.liquid
├── forms/
│   ├── search-controls.liquid
│   └── cart-summary.liquid
└── layout/
    ├── header.liquid
    └── footer.liquid
```

## Common Patterns

### 1. **Product Display Pattern**
```liquid
{% render 'product-card', 
  product: product, 
  show_vendor: true, 
  show_price: true,
  image_size: '300x300' 
%}
```

### 2. **Collection Display Pattern**
```liquid
{% render 'collection-grid', 
  collection: collection, 
  products_per_page: 12,
  show_pagination: true 
%}
```

### 3. **Form Pattern**
```liquid
<form method="post" action="/cart/add">
  {% render 'product-selection', products: products %}
  {% render 'cart-summary' %}
  {% render 'checkout-buttons' %}
</form>
```

## Debugging Snippets

### 1. **Check Parameters**
```liquid
{% comment %}Debug: Check what parameters are passed{% endcomment %}
{% if product %}
  <p>Product: {{ product.title }}</p>
{% else %}
  <p>No product passed</p>
{% endif %}
```

### 2. **Validate Data**
```liquid
{% if product.featured_image %}
  <img src="{{ product.featured_image | img_url: '300x300' }}" alt="{{ product.title }}">
{% else %}
  <div class="no-image">No image available</div>
{% endif %}
```

## Performance Tips

### 1. **Minimize Snippet Calls**
Instead of calling snippets in loops, consider passing arrays:
```liquid
<!-- Instead of -->
{% for product in products %}
  {% render 'product-card', product: product %}
{% endfor %}

<!-- Consider -->
{% render 'product-grid', products: products %}
```

### 2. **Use Caching**
Shopify automatically caches snippets, but you can optimize further:
```liquid
{% comment %}Cache expensive operations{% endcomment %}
{% assign expensive_data = expensive_data | default: nil %}
{% unless expensive_data %}
  {% assign expensive_data = some_expensive_operation %}
{% endunless %}
```

## Examples from Your Project

### 1. **Product Card Snippet**
See `snippets/product-card.liquid` for a complete example of a reusable product display component.

### 2. **Collection Grid Snippet**
See `snippets/collection-grid.liquid` for an example of a collection display with pagination.

### 3. **Refactored Quick Order List**
See `snippets/quick-order-list-refactored.liquid` for an example of how to break down a complex template into smaller snippets.

## Next Steps

1. **Review existing snippets** in your project
2. **Identify repetitive code** that can be converted to snippets
3. **Create new snippets** for common UI components
4. **Refactor existing templates** to use snippets
5. **Test thoroughly** to ensure all functionality works correctly

## Resources

- [Shopify Liquid Documentation](https://shopify.dev/docs/themes/liquid)
- [Shopify Snippets Guide](https://shopify.dev/docs/themes/architecture/sections/section-schema)
- [Liquid Template Language](https://shopify.github.io/liquid/) 
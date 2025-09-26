# Product Object Debug Guide

This guide helps debug the "No product object available" issue in the Quick Order List snippet.

## Overview

The Quick Order List snippet requires a valid product object to function properly. This guide explains how the product object is created and how to debug when it's not available.

## How Product Object is Created

### 1. Liquid Template Level
The product object is passed through the Liquid template hierarchy:

```
quick-order-link.liquid (block) 
  ↓ (passes product object)
quick-order-list.liquid (snippet)
```

### 2. Product Object Sources
The snippet tries multiple sources for the product object:

1. **Direct product variable**: `{{ product }}`
2. **Product by handle**: `{{ all_products[handle] }}`
3. **Template context**: Checks if on product template
4. **JavaScript fallback**: Fetches product data via API

### 3. Debug Information Added

The snippet now includes comprehensive debug information:

```liquid
<!-- Debug: Product object check -->
<!-- Product: {{ product | json }} -->
<!-- Handle: {{ handle }} -->
<!-- All products handle: {{ all_products[handle] | json }} -->
<!-- Section settings: {{ section.settings | json }} -->
```

## Testing Product Object Creation

### 1. Manual Test Button
When no product object is available, a "Test Product Creation" button appears. Click it to:

- Check if you're on a product page
- Extract the product handle from the URL
- Fetch product data via Shopify's product API
- Display results in console and alert

### 2. Debug Panel
A debug panel appears in development mode showing:

- Current page URL
- Whether it's a product page
- Number of quick order elements
- Number of valid products
- Real-time updates

### 3. Console Logging
Check the browser console for detailed logs:

```
ProductDebugger: Initializing...
ProductDebugger: Checking product context...
ProductDebugger: Is product page: true/false
ProductDebugger: Quick order elements found: X
```

## Common Issues and Solutions

### Issue 1: Not on Product Page
**Symptoms**: "No product object available" message
**Solution**: Navigate to a product page (URL contains `/products/`)

### Issue 2: Product Object Not Passed
**Symptoms**: Product variable is null/undefined
**Solution**: Check if the block is properly configured in the theme

### Issue 3: Handle Not Available
**Symptoms**: Can't fetch product by handle
**Solution**: Ensure the product exists and has a valid handle

### Issue 4: API Fetch Fails
**Symptoms**: JavaScript can't fetch product data
**Solution**: Check network connectivity and Shopify API availability

## Debug Steps

1. **Check Template Context**
   - Verify you're on a product page
   - Check the URL contains `/products/`

2. **Inspect Debug Information**
   - Look at the HTML comments in the page source
   - Check browser console for debug logs

3. **Test Manual Fetch**
   - Click "Test Product Creation" button
   - Check console for results

4. **Verify Block Configuration**
   - Ensure the block is added to the product template
   - Check section settings

5. **Check JavaScript Console**
   - Look for any JavaScript errors
   - Verify debug panel is visible

## Files Modified

- `snippets/quick-order-list.liquid`: Enhanced product object handling and debug info
- `blocks/quick-order-link.liquid`: Improved product object passing
- `assets/quick-order-list.js`: Added dynamic product fetching
- `assets/product-debug.js`: New debug script for monitoring

## Testing Checklist

- [ ] Navigate to a product page
- [ ] Check browser console for debug logs
- [ ] Look for debug panel (if in development)
- [ ] Click "Test Product Creation" if no product available
- [ ] Verify product data is fetched successfully
- [ ] Check that quick order functionality works

## Next Steps

If the product object is still not available after these improvements:

1. Check theme configuration
2. Verify block placement in product template
3. Test with different products
4. Check Shopify API permissions
5. Review theme customizations that might interfere 
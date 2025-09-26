# Troubleshooting: Block Not Loading on Storefront

This guide helps identify and fix issues when the Quick Order List block is not appearing on the storefront.

## Common Issues and Solutions

### 1. Block Not Added to Theme
**Symptoms**: Block doesn't appear anywhere on the page
**Solution**: 
- Go to your Shopify admin → Online Store → Themes
- Click "Customize" on your active theme
- Navigate to a product page
- Click "Add section" and look for "Quick Order List"
- Add the section to your product template

### 2. Block Added but Not Visible
**Symptoms**: Block is added but shows no content
**Possible Causes**:
- Product object not available
- CSS not loading
- JavaScript errors

**Debugging Steps**:
1. Check browser console for JavaScript errors
2. Look for debug comments in page source
3. Verify CSS files are loading
4. Check if you're on a product page

### 3. Translation Keys Not Found
**Symptoms**: Block shows translation keys instead of text
**Solution**: 
- Ensure locale files are properly deployed
- Check that translation keys match between schema and locale files

### 4. Assets Not Loading
**Symptoms**: Styles not applied, JavaScript not working
**Solution**:
- Verify all asset files exist in the `assets/` directory
- Check that asset URLs are correct
- Ensure extension is properly deployed

## Debug Information

### Check Page Source
Look for these debug comments in the page source:
```html
<!-- Debug: Block rendering -->
<!-- Template: product -->
<!-- Product object: {...} -->
<!-- Product ID: 123456789 -->
<!-- Product title: Product Name -->
<!-- Section settings: {...} -->
```

### Check Browser Console
Look for these debug messages:
```
ProductDebugger: Initializing...
ProductDebugger: Checking product context...
ProductDebugger: Is product page: true/false
ProductDebugger: Quick order elements found: X
```

### Check Network Tab
Verify these files are loading:
- `component-price.css`
- `quick-order-list.css`
- `quantity-popover.css`
- `quantity-popover.js`
- `price-per-item.js`
- `quick-order-list.js`
- `product-debug.js`

## Manual Testing

### Test Product Creation Button
If you see "No product object available":
1. Click the "Test Product Creation" button
2. Check console for results
3. Verify you're on a product page (URL contains `/products/`)

### Debug Panel
In development mode, look for a debug panel in the top-left corner showing:
- Current page URL
- Whether it's a product page
- Number of quick order elements
- Number of valid products

## Extension Configuration

### Verify Extension Settings
Check `shopify.extension.toml`:
```toml
[[extensions]]
name = "Quick Order List"
handle = "quick-order-list"
type = "theme_app_extension"

[[extensions.targeting]]
target = "section"
module = "blocks/quick-order-link.liquid"
templates = ["product"]
```

### Verify Block Schema
Check that the schema in `blocks/quick-order-link.liquid` is valid:
- No syntax errors
- All required keys present
- Translation keys match locale files

## Deployment Issues

### Extension Not Deployed
**Symptoms**: Block doesn't appear in theme customizer
**Solution**:
```bash
shopify app deploy
```

### Theme Not Updated
**Symptoms**: Changes not reflected on storefront
**Solution**:
- Publish theme changes in Shopify admin
- Clear browser cache
- Check if using development theme

## Common Error Messages

### "Translation key not found"
- Check locale files exist and are properly formatted
- Verify translation keys match between schema and locale files

### "Asset not found"
- Verify all asset files exist in the `assets/` directory
- Check file names match exactly (case-sensitive)

### "Product object not available"
- Ensure you're on a product page
- Check if product exists and is published
- Verify product has variants

## Getting Help

If the block still doesn't load after trying these solutions:

1. Check the browser console for specific error messages
2. Look at the page source for debug information
3. Verify the extension is properly deployed
4. Test on a different product page
5. Check if the issue occurs in different browsers

## Testing Checklist

- [ ] Extension is deployed
- [ ] Block is added to product template
- [ ] You're on a product page
- [ ] No JavaScript errors in console
- [ ] CSS files are loading
- [ ] Debug information is visible in page source
- [ ] Product object is available
- [ ] Translation keys are working 
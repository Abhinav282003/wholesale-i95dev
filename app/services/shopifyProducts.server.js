// app/services/shopifyProducts.server.js
export async function createRandomSnowboard(admin) {
  const colors = ["Red", "Orange", "Yellow", "Green"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const productRes = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges { node { id price barcode createdAt } }
            }
          }
        }
      }`,
    { variables: { product: { title: `${color} Snowboard` } } }
  );

  const productJson = await productRes.json();
  const product = productJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;

  const variantRes = await admin.graphql(
    `#graphql
      mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price barcode createdAt }
        }
      }`,
    { variables: { productId: product.id, variants: [{ id: variantId, price: "100.00" }] } }
  );

  const variantJson = await variantRes.json();
  return { product, variant: variantJson.data.productVariantsBulkUpdate.productVariants };
}

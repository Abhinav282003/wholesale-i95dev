import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "PRODUCTS_CREATE") {
    try {
      const product = payload;
      
      // Create a product update entry for new product
      await db.I95DevShopifyMessage.create({
        data: {
          shop: shop,
          shopifyId: product.id.toString(),
          entityCode: "product",
          variantId: product.variants?.[0]?.id.toString() || null,
          variantTitle: product.variants?.[0]?.title || null,
          status: "pending",
          erpCode: "laravel",
          erpId: null,
          count: "0",
          updatedBy: "Shopify Admin",
        },
      });

      console.log(`Recorded product creation for ${product.title || product.id}`);
    } catch (error) {
      console.error("Error recording product creation:", error);
    }
  }

  return new Response();
};

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "PRODUCTS_UPDATE") {
    try {
      const product = payload;
      
      // Determine what type of update occurred based on the payload
      let updateType = "product_update";
      let description = `Product updated via Shopify admin`;
      let oldValue = null;
      let newValue = null;

      // Check if specific fields were updated
      /*if (product.title) {
        updateType = "description_update";
        description = `Product title updated`;
        newValue = product.title;
      }

      if (product.status) {
        updateType = "status_change";
        description = `Product status changed to ${product.status}`;
        newValue = product.status;
      }

      if (product.description) {
        updateType = "description_update";
        description = `Product description updated`;
        newValue = product.description;
      }*/

      // Create a product update entry
      await db.I95DevShopifyMessage.create({
        data: {
          shop: shop,
          shopifyId: product.id.toString(),
          entityCode: "product",
          variantId: product.variants?.[0]?.id.toString() || null,
          variantTitle: product.variants?.[0]?.title || null,
          status: "pending", // Assuming the update was successful
          erpId: null,
          count: "0", // Assuming a single update for simplicity
          erpCode: "laravel", // Assuming a default ERP code
          updatedBy: "Shopify Admin",
        },
      });

      console.log(`Recorded product update for ${product.title || product.id}`);
    } catch (error) {
      console.error("Error recording product update:", error);
    }
  }

  return new Response();
};

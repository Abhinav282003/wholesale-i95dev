import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "CUSTOMERS_CREATE") {
    try {
      const customer = payload;
      
      // Create a customer update entry for new customer
      await db.I95DevShopifyMessage.create({
        data: {
          shop: shop,
          shopifyId: customer.id.toString(),
          entityCode: "customer",
          variantId: null,
          variantTitle: null,
          status: "pending",
          erpCode: "LAR",
          erpId: null,
          count: "0",
          updatedBy: "Shopify Admin",
        },
      });

      console.log(`Recorded customer creation for ${customer.email || customer.id}`);
    } catch (error) {
      console.error("Error recording customer creation:", error);
    }
  }

  return new Response();
};

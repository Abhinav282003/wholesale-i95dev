import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Order payload:", JSON.stringify(payload, null, 2));

  if (topic === "ORDERS_UPDATED") {
    try {
      const order = payload;
      
      // Check if order and order.id exist
      if (!order || !order.id) {
        console.error("Order payload missing or invalid:", order);
        return new Response();
      }
      
      // Create an order update entry
      await db.I95DevShopifyMessage.create({
        data: {
          shop: shop,
          shopifyId: order.id.toString(),
          entityCode: "order",
          variantId: null,
          variantTitle: null,
          status: "pending",
          erpCode: "LAR",
          erpId: null,
          count: "0",
          updatedBy: "Shopify Admin",
        },
      });

      console.log(`Recorded order update for ${order.order_number || order.id}`);
    } catch (error) {
      console.error("Error recording order update:", error);
    }
  }

  return new Response();
};

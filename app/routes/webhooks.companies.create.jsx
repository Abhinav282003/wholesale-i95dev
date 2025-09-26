import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Company payload:", JSON.stringify(payload, null, 2));

  if (topic === "COMPANIES_CREATE") {
    try {
      const company = payload;
      
      // Check if company and admin_graphql_api_id exist
      if (!company || !company.admin_graphql_api_id) {
        console.error("Company payload missing or invalid:", company);
        return new Response();
      }
      
      // Extract the numeric ID from the GraphQL ID (e.g., "gid://shopify/Company/1003225334" -> "1003225334")
      const companyId = company.admin_graphql_api_id.split('/').pop();
      
      // Create a company update entry for new company
      await db.I95DevShopifyMessage.create({
        data: {
          shop: shop,
          shopifyId: companyId,
          entityCode: "company",
          variantId: null,
          variantTitle: null,
          status: "pending",
          erpCode: "LAR",
          erpId: null,
          count: "0",
          updatedBy: "Shopify Admin",
        },
      });

      console.log(`Recorded company creation for ID: ${companyId}`);
    } catch (error) {
      console.error("Error recording company creation:", error);
    }
  }

  return new Response();
};

import { authenticate } from "../shopify.server";
import db from "../db.server";
import dotenv from "dotenv";
dotenv.config();


export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Clean up custom pages created by the app before uninstalling
  // Note: During uninstall, the session token may already be revoked
  // We'll try to clean up but handle gracefully if access is denied
  if (session) {
    try {
      console.log(`Starting cleanup for shop: ${shop}`);
      console.log(`Session access token available: ${!!session.accessToken}`);
      
      // Use the provided access token for reliable cleanup
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      console.log(`Using provided access token for cleanup`);
      
      if (!accessToken) {
        console.log(`No access token available for cleanup`);
        await db.session.deleteMany({ where: { shop } });
        return new Response();
      }
      
      // Use direct fetch with session token for webhook context
      const pagesResponse = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            query GetCustomPages {
              pages(first: 50, query: "title:Wholesale Registration" ) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
            }
          `
        })
      });

      const pagesData = await pagesResponse.json();
      console.log(`Pages response:`, pagesData);
      
      // Check for authentication errors
      if (pagesData.errors) {
        console.log(`API access denied during uninstall - this is expected behavior`);
        console.log(`Pages will remain but app data will be cleaned up`);
      } else if (pagesData.data?.pages?.edges?.length > 0) {
        console.log(`Found ${pagesData.data.pages.edges.length} pages to delete`);
        
        // Delete each custom page found
        for (const pageEdge of pagesData.data.pages.edges) {
          const pageId = pageEdge.node.id;
          
          const deleteResponse = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              query: `
                mutation DeletePage($id: ID!) {
                  pageDelete(id: $id) {
                    deletedPageId
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `,
              variables: {
                id: pageId
              }
            })
          });
          
          const deleteData = await deleteResponse.json();
          console.log(`Delete response for ${pageEdge.node.title}:`, deleteData);
          
          if (deleteData.data?.pageDelete?.deletedPageId) {
            console.log(`Successfully deleted page: ${pageEdge.node.title} (${pageId})`);
          } else {
            console.error(`Failed to delete page: ${pageEdge.node.title}`, deleteData.data?.pageDelete?.userErrors);
          }
        }
      } else {
        console.log(`No custom pages found to delete`);
      }
    } catch (error) {
      console.error("Error cleaning up custom pages:", error);
    }
  }

  // Always clean up app sessions
  await db.session.deleteMany({ where: { shop } });
  console.log(`Cleaned up app sessions for shop: ${shop}`);

  return new Response();
};

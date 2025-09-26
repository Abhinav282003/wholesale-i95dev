import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { createQuickOrderPage } from "../services/shopifyPages.server";
import { getMainMenu, updateMenu, createMainMenu } from "../services/shopifyMenus.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Create quick order page and update menu
  try {
    const shopDomain = process.env.SHOPIFY_DOMAIN;
    const accessToken = process.env.ACCESS_TOKEN;
    const newPage = await createQuickOrderPage(shopDomain, accessToken);

    if (newPage) {
      const menu = await getMainMenu(admin);
      if (menu) {
        await updateMenu(admin, menu, newPage);
      } else {
        await createMainMenu(admin, newPage);
      }
    }

    return json({ 
      success: true, 
      message: "Quick Order page created/updated successfully",
      pageHandle: newPage?.handle || "quick-order"
    });
  } catch (error) {
    console.error("Error setting up quick order page:", error);
    return json({ 
      success: false, 
      message: "Error setting up quick order page: " + error.message 
    });
  }
};

export default function CreateQuickOrder() {
  return (
    <Page>
      <TitleBar title="Quick Order Management" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Order Page 🛒
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This page manages the Quick Order functionality for your store.
                    The Quick Order page allows customers to quickly add multiple products to their cart.
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Quick Order Features:
                  </Text>
                  <List>
                    <List.Item>Customer login protection</List.Item>
                    <List.Item>Bulk product ordering interface</List.Item>
                    <List.Item>Quantity input for multiple items</List.Item>
                    <List.Item>Add to cart functionality</List.Item>
                    <List.Item>Responsive design for mobile and desktop</List.Item>
                    <List.Item>Integration with existing theme</List.Item>
                  </List>
                </BlockStack>

                <Text variant="bodyMd" as="p">
                  The Quick Order page has been created with the handle "quick-order" and is available 
                  at /pages/quick-order on your storefront. It requires customers to be logged in to access the functionality.
                </Text>

                <Text variant="bodyMd" as="p">
                  Visit your storefront to see the Quick Order page in action!
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
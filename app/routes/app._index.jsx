import { useEffect } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
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

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  // Just return basic info, the wholesale page setup is handled in app.wholesalepage.jsx
  return {
    appInstalled: true,
    timestamp: new Date().toISOString()
  };
};

export default function Index() {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Trigger the wholesale page setup when this component mounts
  useEffect(() => {
    fetcher.load("/app/wholesalepage");
    fetcher.load("/app/metafielddefinition");
  }, []);

  return (
    <Page>
      <TitleBar title="Wholesale i95Dev Portal" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Wholesale i95Dev Portal 🎉
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Your wholesale registration app has been successfully installed! 
                    The wholesale registration page is being set up automatically.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    i95Dev B2B Portal Features:
                  </Text>
                  <List>
                    <List.Item>Automatic wholesale registration page creation</List.Item>
                    <List.Item>Customer login protection for the registration form</List.Item>
                    <List.Item>B2B company and customer management integration</List.Item>
                    <List.Item>Form validation and error handling</List.Item>
                    <List.Item>Automatic navigation menu integration</List.Item>
                    <List.Item>Quick Order</List.Item>
                    <List.Item>Wholesale Company Management</List.Item>
                    <List.Item>Purchase Order Processing</List.Item>
                  </List>
                </BlockStack>
                <InlineStack gap="300">
                  <Button
                    onClick={() => navigate("/app/wholesalepage")}
                    variant="primary"
                  >
                    View Wholesale Page Management
                  </Button>
                </InlineStack>
                <Text variant="bodyMd" as="p">
                  Visit your storefront to see the wholesale registration form in action!
                  For any questions or assistance, feel free to reach out to us at [info@i95dev.com]. We're here to help!
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

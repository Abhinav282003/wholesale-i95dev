import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  ChoiceList,
  Text,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    // Get existing settings for the shop
    const settings = await prisma.settings.findUnique({
      where: { shop: session.shop },
    });

    return json({ settings });
  } catch (error) {
    console.error("Database error:", error);
    // Return null settings if database error occurs
    return json({ settings: null });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const settingsData = {
    shop: session.shop,
    extensionEnabled: formData.get("extensionEnabled") === "true",
    packetSize: parseInt(formData.get("packetSize")) || 10,
    component: formData.get("component") || "Laravel",
    erpUrl: formData.get("erpUrl") || null,
    emailConfirmations: formData.get("emailConfirmations") || null,
    adminEmail: formData.get("adminEmail") || null,
    adminUsername: formData.get("adminUsername") || null,
    apiIntegrationToken: formData.get("apiIntegrationToken") || null,
    encryptionPassKey: formData.get("encryptionPassKey") || null,
    retryLimit: parseInt(formData.get("retryLimit")) || 1,
    mqDataCleanDays: formData.get("mqDataCleanDays") ? parseInt(formData.get("mqDataCleanDays")) : null,
  };

  try {
    await prisma.settings.upsert({
      where: { shop: session.shop },
      update: settingsData,
      create: settingsData,
    });

    return json({ success: true, message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return json({ success: false, message: "Error saving settings" }, { status: 500 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();
  
  const isLoading = navigation.state === "submitting";
  
  // Form state
  const [extensionEnabled, setExtensionEnabled] = useState(settings?.extensionEnabled || false);
  const [packetSize, setPacketSize] = useState(settings?.packetSize?.toString() || "10");
  const [component, setComponent] = useState(settings?.component || "Laravel");
  const [erpUrl, setErpUrl] = useState(settings?.erpUrl || "");
  const [emailConfirmations, setEmailConfirmations] = useState(
    settings?.emailConfirmations ? JSON.parse(settings.emailConfirmations) : []
  );
  const [adminEmail, setAdminEmail] = useState(settings?.adminEmail || "");
  const [adminUsername, setAdminUsername] = useState(settings?.adminUsername || "");
  const [apiIntegrationToken, setApiIntegrationToken] = useState(settings?.apiIntegrationToken || "");
  const [encryptionPassKey, setEncryptionPassKey] = useState(settings?.encryptionPassKey || "");
  const [retryLimit, setRetryLimit] = useState(settings?.retryLimit?.toString() || "1");
  const [mqDataCleanDays, setMqDataCleanDays] = useState(settings?.mqDataCleanDays?.toString() || "");
  
  const [showSuccess, setShowSuccess] = useState(false);

  // Function to clear form to default values
  const clearForm = useCallback(() => {
    setExtensionEnabled(false);
    setPacketSize("10");
    setComponent("Laravel");
    setErpUrl("");
    setEmailConfirmations([]);
    setAdminEmail("");
    setAdminUsername("");
    setApiIntegrationToken("");
    setEncryptionPassKey("");
    setRetryLimit("1");
    setMqDataCleanDays("");
  }, []);

  // Effect to handle successful form submission
  useEffect(() => {
    if (actionData?.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      // Clear form after successful submission
      clearForm();
    }
  }, [actionData, clearForm]);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("extensionEnabled", extensionEnabled.toString());
    formData.append("packetSize", packetSize);
    formData.append("component", component);
    formData.append("erpUrl", erpUrl);
    formData.append("emailConfirmations", JSON.stringify(emailConfirmations));
    formData.append("adminEmail", adminEmail);
    formData.append("adminUsername", adminUsername);
    formData.append("apiIntegrationToken", apiIntegrationToken);
    formData.append("encryptionPassKey", encryptionPassKey);
    formData.append("retryLimit", retryLimit);
    formData.append("mqDataCleanDays", mqDataCleanDays);

    submit(formData, { method: "post" });
  }, [
    extensionEnabled, packetSize, component, erpUrl, emailConfirmations,
    adminEmail, adminUsername, apiIntegrationToken, encryptionPassKey,
    retryLimit, mqDataCleanDays, submit
  ]);

  const packetSizeOptions = [
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "30", value: "30" },
    { label: "40", value: "40" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
  ];

  const componentOptions = [
    { label: "Laravel", value: "Laravel" },
  ];

  const retryLimitOptions = [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
  ];

  const emailConfirmationOptions = [
    { label: "Invoice", value: "Invoice" },
    { label: "Shipment", value: "Shipment" },
  ];

  return (
    <Page
      title="Settings"
      backAction={{ content: "Back", url: "/app" }}
      primaryAction={{
        content: "Save Settings",
        onAction: handleSubmit,
        loading: isLoading,
      }}
    >
      <Layout>
        <Layout.Section>
          {showSuccess && (
            <Banner status="success" onDismiss={() => setShowSuccess(false)}>
              <p>Settings saved successfully!</p>
            </Banner>
          )}
          
          {actionData?.success === false && (
            <Banner status="critical" onDismiss={() => {}}>
              <p>{actionData.message || "Error saving settings"}</p>
            </Banner>
          )}
          
          <BlockStack gap="500">
            {/* Extension Settings */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Extension</Text>
                <FormLayout>
                  <Checkbox
                    label="Enable Extension"
                    checked={extensionEnabled}
                    onChange={setExtensionEnabled}
                  />
                  <Select
                    label="Set Packet Size"
                    options={packetSizeOptions}
                    value={packetSize}
                    onChange={setPacketSize}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Connector Settings */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Connector Settings</Text>
                <FormLayout>
                  <Select
                    label="Component"
                    options={componentOptions}
                    value={component}
                    onChange={setComponent}
                  />
                  <TextField
                    label="ERP URL"
                    value={erpUrl}
                    onChange={setErpUrl}
                    placeholder="Enter ERP URL"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Connector Notification */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Connector Notification</Text>
                <ChoiceList
                  title="E-Mail Confirmations"
                  choices={emailConfirmationOptions}
                  selected={emailConfirmations}
                  onChange={setEmailConfirmations}
                  allowMultiple
                />
              </BlockStack>
            </Card>

            {/* General Contact Info */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">General Contact Info</Text>
                <FormLayout>
                  <TextField
                    label="Admin Email"
                    value={adminEmail}
                    onChange={setAdminEmail}
                    type="email"
                    placeholder="admin@example.com"
                  />
                  <TextField
                    label="Admin Username"
                    value={adminUsername}
                    onChange={setAdminUsername}
                    placeholder="Enter admin username"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Credentials */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Credentials</Text>
                <FormLayout>
                  <TextField
                    label="API Integration Token"
                    value={apiIntegrationToken}
                    onChange={setApiIntegrationToken}
                    type="password"
                    placeholder="Enter API token"
                  />
                  <TextField
                    label="Encryption Pass Key"
                    value={encryptionPassKey}
                    onChange={setEncryptionPassKey}
                    type="password"
                    placeholder="Enter encryption key"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Message Queue Settings */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Message Queue Settings</Text>
                <FormLayout>
                  <Select
                    label="Select Retry Limit"
                    options={retryLimitOptions}
                    value={retryLimit}
                    onChange={setRetryLimit}
                  />
                  <TextField
                    label="MQ Data Clean Days"
                    value={mqDataCleanDays}
                    onChange={setMqDataCleanDays}
                    type="number"
                    placeholder="Enter number of days"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

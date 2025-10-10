// app/routes/app.metafields.jsx
import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  TextField,
  Toast,
  DataTable,
  Badge,
  Select,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const metafieldDefinitionsResponse = await admin.graphql(`
    query GetMetafieldDefinitions {
      companyMetafields: metafieldDefinitions(first: 50, ownerType: COMPANY) {
        edges {
          node {
            id
            name
            namespace
            key
            type { name }
            description
            capabilities {
              uniqueValues { eligible enabled }
            }
          }
        }
      }
    }
  `);

  const companiesResponse = await admin.graphql(`
    query GetCompaniesWithMetafields {
      companies(first: 100) {
        edges {
          node {
            id
            name
            metafields(first: 20, namespace: "custom", keys: ["companyEmail", "targetCompanyId"]) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                }
              }
            }
          }
        }
      }
    }
  `);

  const defsJson = await metafieldDefinitionsResponse.json();
  const companiesJson = await companiesResponse.json();

  return {
    metafieldDefinitions: {
      companies: defsJson.data?.companyMetafields?.edges || [],
    },
    companies: companiesJson.data?.companies?.edges || [],
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.formData();
  const actionType = body.get("actionType");

  if (actionType === "setMetafield") {
    const entityId = body.get("entityId");
    const emailValue = (body.get("emailValue") || "").toString().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!entityId || !emailRegex.test(emailValue)) {
      return {
        success: false,
        errors: [{ message: "Please select a company and enter a valid email." }],
      };
    }

    const resp = await admin.graphql(
      `
      mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id key namespace value type }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          metafields: [
            {
              ownerId: entityId,
              namespace: "custom",
              key: "companyEmail",
              value: emailValue,
              type: "single_line_text_field",
            },
          ],
        },
      }
    );

    const json = await resp.json();
    const errs = json.data?.metafieldsSet?.userErrors || [];

    // Improve unique/duplicate error clarity
    const processed = errs.map((e) =>
      /unique|duplicate|already exists/i.test(e.message)
        ? {
            ...e,
            message:
              "This email address is already in use by another company. Please use a unique email address.",
          }
        : e
    );

    return {
      success: processed.length === 0,
      metafields: json.data?.metafieldsSet?.metafields,
      errors: processed,
    };
  }

  if (actionType === "setTargetCompanyId") {
    const entityId = body.get("entityId");
    const targetCompanyIdValue = (body.get("targetCompanyIdValue") || "").toString().trim();

    // Basic integer validation
    const isValidInteger = /^\d+$/.test(targetCompanyIdValue);
    if (!entityId || !isValidInteger) {
      return {
        success: false,
        errors: [{ message: "Please select a company and enter a valid integer for target company ID." }],
      };
    }

    const resp = await admin.graphql(
      `
      mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id key namespace value type }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          metafields: [
            {
              ownerId: entityId,
              namespace: "custom",
              key: "targetCompanyId",
              value: targetCompanyIdValue,
              type: "number_integer",
            },
          ],
        },
      }
    );

    const json = await resp.json();
    const errs = json.data?.metafieldsSet?.userErrors || [];

    // Improve unique/duplicate error clarity
    const processed = errs.map((e) =>
      /unique|duplicate|already exists/i.test(e.message)
        ? {
            ...e,
            message:
              "This target company ID is already in use by another company. Please use a unique target company ID.",
          }
        : e
    );

    return {
      success: processed.length === 0,
      metafields: json.data?.metafieldsSet?.metafields,
      errors: processed,
    };
  }

  return { success: false, errors: [{ message: "Invalid action type" }] };
};

export default function Metafields() {
  const { metafieldDefinitions, companies } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [targetCompanyIdValue, setTargetCompanyIdValue] = useState("");
  const [toast, setToast] = useState({ open: false, content: "", error: false });

  // Prepare <Select> options for companies
  const companyOptions = companies.map(({ node }) => ({
    label: node.name || "Unnamed company",
    value: node.id,
  }));

  // Prepare table rows
  const tableRows = companies.map(({ node }) => {
    const emailMf = node.metafields?.edges?.find(e => e.node.key === "companyEmail");
    const targetIdMf = node.metafields?.edges?.find(e => e.node.key === "targetCompanyId");
    
    const emailVal = emailMf?.node?.value || "Not set";
    const targetIdVal = targetIdMf?.node?.value || "Not set";
    
    const emailBadge = emailMf ? (
      <Badge status="success">Set</Badge>
    ) : (
      <Badge status="attention">Not set</Badge>
    );
    
    const targetIdBadge = targetIdMf ? (
      <Badge status="success">Set</Badge>
    ) : (
      <Badge status="attention">Not set</Badge>
    );

    return [
      node.name || "Unnamed", 
      node.id.replace("gid://shopify/Company/", ""), 
      emailVal, 
      emailBadge,
      targetIdVal,
      targetIdBadge
    ];
  });

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.success) {
      if (fetcher.formData?.get("actionType") === "setMetafield") {
        shopify.toast.show("Company email saved");
        setEmailValue("");
      } else if (fetcher.formData?.get("actionType") === "setTargetCompanyId") {
        shopify.toast.show("Target company ID saved");
        setTargetCompanyIdValue("");
      }
    } else if (fetcher.data.errors?.length) {
      setToast({ open: true, content: `Error: ${fetcher.data.errors[0].message}`, error: true });
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    if (!selectedEntityId || !emailValue.trim()) {
      setToast({ open: true, content: "Select a company and enter an email.", error: true });
      return;
    }
    fetcher.submit(
      { actionType: "setMetafield", entityId: selectedEntityId, emailValue },
      { method: "POST" }
    );
  };

  const handleSaveTargetCompanyId = () => {
    if (!selectedEntityId || !targetCompanyIdValue.trim()) {
      setToast({ open: true, content: "Select a company and enter a target company ID.", error: true });
      return;
    }
    fetcher.submit(
      { actionType: "setTargetCompanyId", entityId: selectedEntityId, targetCompanyIdValue },
      { method: "POST" }
    );
  };

  const hasDefinition =
    (metafieldDefinitions.companies || []).some(
      (e) => e.node.namespace === "custom" && e.node.key === "companyEmail"
    );

  const hasTargetCompanyIdDefinition =
    (metafieldDefinitions.companies || []).some(
      (e) => e.node.namespace === "custom" && e.node.key === "targetCompanyId"
    );

  return (
    <Page>
      <TitleBar title="Company Metafields" />

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Company Email Metafield
              </Text>
              {!hasDefinition && (
                <Text variant="bodyMd" tone="critical">
                  The metafield definition <code>custom.companyEmail</code> was not found. Return to the Dashboard to initialize it.
                </Text>
              )}

              <Select
                label="Company"
                placeholder="Select a company"
                options={companyOptions}
                onChange={setSelectedEntityId}
                value={selectedEntityId}
              />
              <TextField
                label="Company Email"
                value={emailValue}
                onChange={setEmailValue}
                autoComplete="email"
                helpText="Must be unique across companies"
              />
              <Button onClick={handleSave} variant="primary" disabled={!hasDefinition || fetcher.state === "submitting"}>
                {fetcher.state === "submitting" ? "Saving…" : "Save Email"}
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Target Company ID Metafield
              </Text>
              {!hasTargetCompanyIdDefinition && (
                <Text variant="bodyMd" tone="critical">
                  The metafield definition <code>custom.targetCompanyId</code> was not found. Return to the Dashboard to initialize it.
                </Text>
              )}

              <Select
                label="Company"
                placeholder="Select a company"
                options={companyOptions}
                onChange={setSelectedEntityId}
                value={selectedEntityId}
              />
              <TextField
                label="Target Company ID"
                value={targetCompanyIdValue}
                onChange={setTargetCompanyIdValue}
                type="number"
                helpText="Must be a unique integer across companies"
              />
              <Button onClick={handleSaveTargetCompanyId} variant="primary" disabled={!hasTargetCompanyIdDefinition || fetcher.state === "submitting"}>
                {fetcher.state === "submitting" ? "Saving…" : "Save Target Company ID"}
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Companies Overview
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={["Company", "Company ID", "Email (custom.companyEmail)", "Email Status", "Target Company ID (custom.targetCompanyId)", "Target ID Status"]}
                rows={tableRows}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {toast.open && (
        <div style={{ position: "fixed", bottom: 16, right: 16 }}>
          <Toast
            content={toast.content}
            error={toast.error}
            onDismiss={() => setToast({ open: false, content: "", error: false })}
          />
        </div>
      )}
    </Page>
  );
}

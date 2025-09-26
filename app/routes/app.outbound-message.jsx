import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  DataTable,
  Badge,
  InlineStack,
  BlockStack,
  Text,
  Modal,
  FormLayout,
  ChoiceList,
  Spinner,
  EmptyState,
  Pagination,
  Combobox,
  Listbox,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get product update entries for this shop
  const entries = await db.I95DevShopifyMessage.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: limit,
  });

  // Get total count for pagination
  const totalCount = await db.I95DevShopifyMessage.count({
    where: {
      shop: session.shop,
    },
  });

  return json({
    entries,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
  });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create") {
    const shopifyId = formData.get("shopifyId");
    const entityCode = formData.get("entityCode");
    const variantId = formData.get("variantId") || null;
    const variantTitle = formData.get("variantTitle") || null;
    const status = formData.get("status") || "pending";
    const erpCode = formData.get("erpCode") || "laravel";
    const erpId = formData.get("erpId") || null;
    const count = formData.get("count") || "0";

    const entry = await db.I95DevShopifyMessage.create({
      data: {
        shop: session.shop,
        shopifyId,
        entityCode,
        variantId,
        variantTitle,
        status,
        erpCode,
        erpId,
        count,
        updatedBy: session.email || "Unknown",
      },
    });

    return json({ success: true, entry });
  }

  if (action === "delete") {
    const entryId = formData.get("entryId");
    await db.I95DevShopifyMessage.delete({
      where: { id: entryId },
    });
    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function OutBoundMessageQueue() {
  const { entries, totalCount, currentPage, totalPages } = useLoaderData();
  const fetcher = useFetcher();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [webhookSetupStatus, setWebhookSetupStatus] = useState(null);
  const [formData, setFormData] = useState({
    productId: "",
    productTitle: "",
    variantId: "",
    variantTitle: "",
    updateType: "price_change",
    oldValue: "",
    newValue: "",
    description: "",
  });

  /*const entityCodeOptions = [
    { label: "Price Change", value: "price_change" },
    { label: "Inventory Update", value: "inventory_update" },
    { label: "Description Update", value: "description_update" },
    { label: "Status Change", value: "status_change" },
    { label: "Image Update", value: "image_update" },
    { label: "Variant Update", value: "variant_update" },
    { label: "Product Create", value: "product_create" },
    { label: "Product Delete", value: "product_delete" },
    { label: "Variant Create", value: "variant_create" },
    { label: "Variant Delete", value: "variant_delete" },
    { label: "Product Update", value: "product_update" },
    { label: "Other", value: "other" },
  ];*/
  
  const entityCodeOptions = [
    { label: "Product", value: "product" },
    { label: "Inventory", value: "inventory_update" },
    { label: "Customer", value: "customer" },
    { label: "Company", value: "company" },
    { label: "Order", value: "order" },
	{ label: "Variant", value: "variant" },
    { label: "Other", value: "other" },
  ];

  // Product search functionality
  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/product-search?query=${encodeURIComponent(query)}`);
      const products = await response.json();
      setSearchResults(products);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFormData({
      ...formData,
      productId: product.id,
      productTitle: product.title,
    });
    setSearchQuery(product.title);
    setSearchResults([]);
  };

  const handleCreateEntry = () => {
    const form = new FormData();
    form.append("action", "create");
    Object.keys(formData).forEach((key) => {
      if (formData[key]) {
        form.append(key, formData[key]);
      }
    });
    fetcher.submit(form, { method: "POST" });
    setShowCreateModal(false);
    setFormData({
      productId: "",
      productTitle: "",
      variantId: "",
      variantTitle: "",
      updateType: "price_change",
      oldValue: "",
      newValue: "",
      description: "",
    });
  };

  const handleDeleteEntry = (entryId) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      const form = new FormData();
      form.append("action", "delete");
      form.append("entryId", entryId);
      fetcher.submit(form, { method: "POST" });
    }
  };

  const handleWebhookSetup = async () => {
    try {
      const response = await fetch("/webhooks/setup", { method: "POST" });
      const result = await response.json();
      setWebhookSetupStatus(result);
    } catch (error) {
      setWebhookSetupStatus({ success: false, error: error.message });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getUpdateTypeBadge = (type) => {
    const colors = {
      price_change: "info",
      inventory_update: "success",
      description_update: "warning",
      status_change: "critical",
      image_update: "attention",
      variant_update: "info",
      product_create: "success",
      product_delete: "critical",
      variant_create: "success",
      variant_delete: "critical",
      product_update: "info",
      other: "default",
    };
    return <Badge tone={colors[type] || "default"}>{type.replace("_", " ")}</Badge>;
  };

  // Filter entries based on selected filter
  const filteredEntries = entries.filter(entry => {
    if (filterType === "all") return true;
    return entry.entityCode === filterType;
  });

  const rows = filteredEntries.map((entry) => [
    entry.id,
    entry.entityCode.charAt(0).toUpperCase() + entry.entityCode.slice(1),
    formatDate(entry.createdAt),
    formatDate(entry.updatedAt),
    entry.status,
    entry.erpCode,
    entry.shopifyId,
    entry.targetId,
    entry.count || 0,
    entry.updatedBy,
  ]);

  const headers = [
    "Message ID",
    "Entity",
    "Created Date",
    "Updated Date",
    "Status",
    "ERP Code",
    "Source ID",
    "ERP ID",
    "Counter",
    "Updated By"    
  ];

  return (
    <Page
      title="Outbound Message Queue"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Entities Update History
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Track and manage entities updates across your store. Total entries: {totalCount}
              </Text>
              
			<InlineStack gap="400" align="space-between">
                 <Select
                   label="Filter by type"
                   options={[
                     { label: "All Types", value: "all" },
                     ...entityCodeOptions
                   ]}
                   value={filterType}
                   onChange={setFilterType}
                 />
                 <InlineStack gap="200">
                   <Button
                     onClick={handleWebhookSetup}
					 onloading={setWebhookSetupStatus === null}
                   >
                     Setup Webhooks
                   </Button>
                 </InlineStack>
               </InlineStack>
               
               {webhookSetupStatus && (
                 <Card>
                   <BlockStack gap="200">
                     <Text variant="headingSm" as="h3">
                       Webhook Setup Status
                     </Text>
                     {webhookSetupStatus.success ? (
                       <Text tone="success">
                         Webhooks configured successfully! All product updates will now be automatically recorded.
                       </Text>
                     ) : (
                       <Text tone="critical">
                         Webhook setup failed: {webhookSetupStatus.error}
                       </Text>
                     )}
                   </BlockStack>
                 </Card>
               )}
              
                              {filteredEntries.length === 0 ? (
                <EmptyState
                  heading="No entity update entries yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start tracking your entities updates by adding new entries.</p>
                </EmptyState>
              ) : (
                <>
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                      "text",
                    ]}
                    headings={headers}
                    rows={rows}
                  />
                  
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                      <Pagination
                        hasPrevious={currentPage > 1}
                        onPrevious={() => {
                          const url = new URL(window.location);
                          url.searchParams.set("page", (currentPage - 1).toString());
                          window.location = url;
                        }}
                        hasNext={currentPage < totalPages}
                        onNext={() => {
                          const url = new URL(window.location);
                          url.searchParams.set("page", (currentPage + 1).toString());
                          window.location = url;
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Product Update Entry"
        primaryAction={{
          content: "Create Entry",
          onAction: handleCreateEntry,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateModal(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Combobox
              label="Search Products"
              value={searchQuery}
              onChange={setSearchQuery}
              options={searchResults.map(product => ({
                label: product.title,
                value: product.id,
                product: product
              }))}
              onSelect={(selected) => {
                const product = searchResults.find(p => p.id === selected);
                if (product) {
                  handleProductSelect(product);
                }
              }}
              loading={isSearching}
              placeholder="Search for products..."
              helpText="Start typing to search for products in your store"
            />
            
            <TextField
              label="Product ID"
              value={formData.productId}
              onChange={(value) => setFormData({ ...formData, productId: value })}
              helpText="Shopify product ID (auto-filled when product is selected)"
              required
            />
            
            <TextField
              label="Product Title"
              value={formData.productTitle}
              onChange={(value) => setFormData({ ...formData, productTitle: value })}
              helpText="Product name or title (auto-filled when product is selected)"
              required
            />
            
            {selectedProduct && selectedProduct.variants.length > 1 && (
              <Select
                label="Select Variant (Optional)"
                options={selectedProduct.variants.map(variant => ({
                  label: variant.title === 'Default Title' ? 'Default' : variant.title,
                  value: variant.id,
                  variant: variant
                }))}
                value={formData.variantId}
                onChange={(value) => {
                  const variant = selectedProduct.variants.find(v => v.id === value);
                  setFormData({
                    ...formData,
                    variantId: value,
                    variantTitle: variant ? variant.title : ""
                  });
                }}
                helpText="Select a specific variant (optional)"
              />
            )}
            
            <TextField
              label="Variant ID (Optional)"
              value={formData.variantId}
              onChange={(value) => setFormData({ ...formData, variantId: value })}
              helpText="Shopify variant ID (auto-filled when variant is selected)"
            />
            
            <TextField
              label="Variant Title (Optional)"
              value={formData.variantTitle}
              onChange={(value) => setFormData({ ...formData, variantTitle: value })}
              helpText="Variant name (auto-filled when variant is selected)"
            />
            
            <Select
              label="Update Type"
              options={entityCodeOptions}
              value={formData.entityCode}
              onChange={(value) => setFormData({ ...formData, updateType: value })}
              helpText="Type of update being recorded"
            />
            
            <TextField
              label="Old Value (Optional)"
              value={formData.oldValue}
              onChange={(value) => setFormData({ ...formData, oldValue: value })}
              helpText="Previous value before the update"
            />
            
            <TextField
              label="New Value (Optional)"
              value={formData.newValue}
              onChange={(value) => setFormData({ ...formData, newValue: value })}
              helpText="New value after the update"
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              helpText="Detailed description of the update"
              multiline={3}
              required
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

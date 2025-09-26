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
  const entries = await db.I95DevERPMessage.findMany({
    orderBy: {
      createdAt: "desc",
    },
    skip: offset,
    take: limit,
  });
  
  // Get the IDs of the current page entries
  const entryIds = entries.map(entry => entry.id);
  
  // Fetch dataEntries that correspond to the current page's message IDs
  const dataEntries = await db.I95DevErpData.findMany({
    where: {
      msgId: {
        in: entryIds
      }
    }
  });
  

  // Get total count for pagination
  const totalCount = await db.I95DevERPMessage.count({

  });

  return json({
    entries,
    dataEntries,
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
    const entityCode = formData.get("entityCode");
    const targetId = formData.get("targetId");
    const variantId = formData.get("variantId") || null;
    const variantTitle = formData.get("variantTitle") || null;
    const status = formData.get("status") || "pending";
    const erpCode = formData.get("erpCode") || "laravel";
    const shopifyId = formData.get("shopifyId") || null;
    const counter = formData.get("counter") || "0";

    const entry = await db.I95DevERPMessage.create({
      data: {
        entityCode,
        targetId,
        variantId,
        variantTitle,
        status,
        erpCode,
        shopifyId,
        counter,
        updatedBy: session.email || "Unknown",
      },
    });

    return json({ success: true, entry });
  }

  if (action === "delete") {
    const entryId = formData.get("entryId");
    await db.I95DevERPMessage.delete({
      where: { id: entryId },
    });
    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function InboundMessageQueue() {
  const { entries,dataEntries, totalCount, currentPage, totalPages } = useLoaderData();
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
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  const entityCodeOptions = [
    { label: "Product", value: "product" },
    { label: "Inventory", value: "inventory_update" },
    { label: "Price Level", value: "price_level" },
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


  const handleRequestDataEntry = (entryId) => {
    // Find the entry in I95DevErpData table by msg_id
    const entry = dataEntries.find(e => e.msgId === entryId);
    setSelectedEntry(entry);
    setShowEntryModal(true);
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

  // Separate company entries for dedicated company grid
  const companyEntries = entries.filter(entry => entry.entityCode === "company");
  const nonCompanyEntries = entries.filter(entry => entry.entityCode !== "company");
  
  // Apply filter to non-company entries
  const filteredNonCompanyEntries = nonCompanyEntries.filter(entry => {
    if (filterType === "all" || filterType === "company") return true;
    return entry.entityCode === filterType;
  });

  const handleSyncData = async (entryId) => {
    try {
      // Call your sync API endpoint with the entryId
      const response = await fetch(`/admin/api/sync-data?entryId=${entryId}`, { method: "POST" });
      const result = await response.json();
      if (result.success) {
        // Optionally show a success message or refresh data
        alert("Data synced successfully!");
      } else {
        alert("Sync failed: " + result.error);
      }
    } catch (error) {
      alert("Sync failed: " + error.message);
    }
  };

  const rows = (filterType === "company" ? [] : (filterType === "all" ? filteredEntries : filteredNonCompanyEntries)).map((entry) => [
    entry.id,
    entry.entityCode.charAt(0).toUpperCase() + entry.entityCode.slice(1),
    formatDate(entry.createdAt),
    formatDate(entry.updatedAt),    
    entry.status,
    entry.targetId,
    entry.counter || 0,
    entry.shopifyId || "",
    <Button disabled={entry.status === "success"} 
      size="slim"
      tone="critical"
      onClick={() => handleRequestDataEntry(entry.id)}
    >
      View
    </Button>,
    <Button disabled={entry.status === "success"}
      size="slim"
      tone="success"
      onClick={() => handleSyncData(entry.id)}
    >
      Sync
    </Button>,
  ]); 

  const headers = [
    "ID",
    "Entity Code",
    "Created Date",
    "Updated Date",
    "Status",
    "ERP ID",
    "Counter",
    "Response",
    "Data",
    "Sync" // Add Sync column header
  ];

  // Company-specific rows and headers
  const companyRows = (filterType === "all" || filterType === "company" ? companyEntries : []).map((entry) => [
    entry.id,
    "Company",
    formatDate(entry.createdAt),
    formatDate(entry.updatedAt),    
    entry.status,
    entry.targetId,
    entry.counter || 0,
    entry.shopifyId || "",
    <Button disabled={entry.status === "success"} 
      size="slim"
      tone="critical"
      onClick={() => handleRequestDataEntry(entry.id)}
    >
      View
    </Button>,
    <Button disabled={entry.status === "success"}
      size="slim"
      tone="success"
      onClick={() => handleSyncData(entry.id)}
    >
      Sync
    </Button>,
  ]);

  const companyHeaders = [
    "ID",
    "Entity Type",
    "Created Date",
    "Updated Date",
    "Status",
    "ERP ID",
    "Counter",
    "Shopify ID",
    "Data",
    "Sync"
  ];

  return (
    <Page
      title="Inbound Message Queue"
      backAction={{ content: "Back", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
             {/* <Text variant="headingMd" as="h2">
                Entities Request Data
              </Text> */}
              <Text variant="bodyMd" as="p" tone="subdued">
                 Total entries: {totalCount} 
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
              
              {/* Company Grid Section */}
              {(filterType === "company") && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      Company Updates ({companyEntries.length})
                    </Text>
                    {companyEntries.length === 0 ? (
                      <EmptyState
                        heading="No company update entries yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>Company updates will appear here when received from ERP.</p>
                      </EmptyState>
                    ) : (
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
                        headings={companyHeaders}
                        rows={companyRows}
                      />
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Other Entities Grid Section */}
              {(filterType !== "company") && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">
                      {filterType === "all" ? "All Updates" : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Updates`} ({filterType === "all" ? filteredEntries.length : filteredNonCompanyEntries.length})
                    </Text>
                    {(filterType === "all" ? filteredEntries.length : filteredNonCompanyEntries.length) === 0 ? (
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
                            "text", // Add for Sync column
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
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        title="Data Entry Details"
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setShowEntryModal(false),
          },
        ]}
      >
        <Modal.Section>
          {selectedEntry ? (
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">Message Id: {selectedEntry.msgId}</Text>
              <Text>{selectedEntry.dataString}</Text>
              
            </BlockStack>
          ) : (
            <Text>No entry selected.</Text>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

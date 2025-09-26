import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";


export const action = async ({ request }) => {
  // Authenticate the request and get a session
  const { admin } = await authenticate.admin(request);


  const url = new URL(request.url);
  const entryId = url.searchParams.get("entryId");


  if (!entryId) {
    return json({ success: false, error: "Missing entryId" }, { status: 400 });
  }


  try {
    // Example: Find the entry and perform sync logic
    const entry = await db.I95DevERPMessage.findFirst({
      where: { id: parseInt(entryId) },
    });


    // Use findFirst or findUnique for a single record
    const dataEntry = await db.I95DevErpData.findFirst({
      where: { msgId: parseInt(entryId) },
    });


    if (!entry || !dataEntry) {
      return json({ success: false, error: "Entry not found" }, { status: 404 });
    }


    // Parse the JSON data from dataEntry
    let updateData = {};
    try {
      updateData = dataEntry.dataString; // Assuming dataString is the field containing JSON
        if (typeof updateData === "string") {
            updateData = JSON.parse(updateData);
        }
    } catch (e) {
      return json({ success: false, error: "Invalid JSON format in dataEntry" }, { status: 400 });
    }


    switch (entry.entityCode) {
    case "product":
      const response = await admin.graphql(`mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          id: `gid://shopify/Product/${updateData.body.sku}`,
          title: updateData.body.title, 
        },
      },
    });
    const data = await response.json();
    
      if (data.data.productUpdate.userErrors.length > 0) {
        return json({
          success: false,
          errors: data.data.productUpdate.userErrors.map(error => error.message),
        }, { status: 400 });
      }


    // TODO: Add your sync logic here (e.g., send to ERP, update status, etc.)
    // For demonstration, we'll just update the status to "synced"
    await db.I95DevERPMessage.update({
      where: { id: entry.id },
      data: { status: "success" , counter: "1" , shopifyId: data.data.productUpdate.product.id,updatedBy: "Laravel" },
    });


    return json({ success: true, product: data.data.productUpdate.product.id });
     break;
     case "price_level":
      // Handle price level updates
      const priceResponse = await admin.graphql(`mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
  discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
    userErrors {
      field
      message
    }
    automaticDiscountNode {
      id
      automaticDiscount {
        ... on DiscountAutomaticBasic {
          title
          startsAt
          endsAt
        }
      }
    }
  }
} `, {
      variables: {
        automaticBasicDiscount: {
          title: "Customer1 Discount 10% Off",
          startsAt: new Date().toISOString(),
          customerGets: {
            value: {
              percentage: updateData.body.discount_percentage / 100,
            },
            items: {
              all: true,
            },  
        },
      },
    }
  });


  const dataPrice = await priceResponse.json();
    
      if (dataPrice.data.discountAutomaticBasicCreate.userErrors.length > 0) {
        return json({
          success: false,
          errors: data.data.discountAutomaticBasicCreate.userErrors.map(error => error.message),
        }, { status: 400 });
      }


    // TODO: Add your sync logic here (e.g., send to ERP, update status, etc.)
    // For demonstration, we'll just update the status to "synced"
    await db.I95DevERPMessage.update({
      where: { id: entry.id },
      data: { status: "success", updatedBy: "Shopify Admin" },
    });


    return json({ success: true, product: dataPrice.data.discountAutomaticBasicCreate.automaticDiscountNode.id });
  break;

  case "company":
    // Handle company updates
    const companyResponse = await admin.graphql(`mutation companyUpdate($companyId: ID!, $input: CompanyInput!) {
      companyUpdate(companyId: $companyId, input: $input) {
        company {
          id
          name
          note
          externalId
        }
        userErrors {
          field
          message
        }
      }
    }`, {
      variables: {
        companyId: `gid://shopify/Company/${updateData.body.externalId || updateData.body.company_id || entry.targetId}`,
        input: {
          name: updateData.body.name || updateData.body.company_name,
          note: updateData.body.note || updateData.body.description || "",
          externalId: updateData.body.externalId || updateData.body.targetId?.toString(),
        },
      },
    });

    const companyData = await companyResponse.json();
    
    if (companyData.data.companyUpdate.userErrors.length > 0) {
      return json({
        success: false,
        errors: companyData.data.companyUpdate.userErrors.map(error => error.message),
      }, { status: 400 });
    }

    // First, check if company already has locations
    const companyLocationsQuery = await admin.graphql(`query getCompanyLocations($companyId: ID!) {
      company(id: $companyId) {
        locations(first: 1) {
          edges {
            node {
              id
              name
              shippingAddress {
                address1
                address2
                city
                zip
              }
            }
          }
        }
      }
    }`, {
      variables: {
        companyId: `gid://shopify/Company/${updateData.body.externalId || updateData.body.company_id || entry.targetId}`,
      },
    });

    const companyLocationsData = await companyLocationsQuery.json();
    const existingLocations = companyLocationsData.data.company.locations.edges;
    
    let locationResponse;
    let locationResult = null;

    if (existingLocations.length > 0) {
      // Update existing location
      const existingLocationId = existingLocations[0].node.id;
      locationResponse = await admin.graphql(`mutation companyLocationUpdate($companyLocationId: ID!, $input: CompanyLocationInput!) {
        companyLocationUpdate(companyLocationId: $companyLocationId, input: $input) {
          companyLocation {
            id
            name
            shippingAddress {
              address1
              address2
              city
              zip
            }
          }
          userErrors {
            field
            message
          }
        }
      }`, {
        variables: {
          companyLocationId: existingLocationId,
          input: {
            name: updateData.body.address1 || "Main Location",
            shippingAddress: {
              address1: updateData.body.address1 || "",
              address2: updateData.body.address2 || "",
              city: updateData.body.city || "",
              countryCode: updateData.body.country || "",
              zip: updateData.body.zipCode || "",
            }
          },
        },
      });

      const locationData = await locationResponse.json();
      if (locationData.data.companyLocationUpdate.userErrors.length === 0) {
        locationResult = locationData.data.companyLocationUpdate.companyLocation;
      }
    } else {
      // Create new location if none exists
      locationResponse = await admin.graphql(`mutation companyLocationCreate($companyId: ID!, $input: CompanyLocationInput!) {
        companyLocationCreate(companyId: $companyId, input: $input) {
          companyLocation {
            id
            name
            shippingAddress {
              address1
              address2
              city
              zip
            }
          }
          userErrors {
            field
            message
          }
        }
      }`, {
        variables: {
          companyId: `gid://shopify/Company/${updateData.body.externalId || updateData.body.company_id || entry.targetId}`,
          input: {
            name: updateData.body.address1 || "Main Location",
            shippingAddress: {
              address1: updateData.body.address1 || "",
              address2: updateData.body.address2 || "",
              city: updateData.body.city || "",
              countryCode: updateData.body.country || "",
              zip: updateData.body.zipCode || "",
            }
          },
        },
      });

      const locationData = await locationResponse.json();
      if (locationData.data.companyLocationCreate.userErrors.length === 0) {
        locationResult = locationData.data.companyLocationCreate.companyLocation;
      }
    }

    // Update the entry status to success
    await db.I95DevERPMessage.update({
      where: { id: entry.id },
      data: { 
        status: "success", 
        counter: "1", 
        shopifyId: companyData.data.companyUpdate.company.id,
        updatedBy: "Laravel" 
      },
    });

    return json({ 
      success: true, 
      company: companyData.data.companyUpdate.company,
      location: locationResult
    });
    break;

    // ... rest of the code ...
    default:
    // Handle unknown entity code
    return json({ success: false, errors: ["Unknown entity code"] });
    }
    // Update product via Admin API (GraphQL is preferred in Remix apps)
    


    


    
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

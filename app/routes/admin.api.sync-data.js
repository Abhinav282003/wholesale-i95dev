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
    let companyId = null;
    let companyData = null;
    const emailFromData = updateData.body.email;
    let isNewCompany = false;

    // First, check if a company exists with this email in the Company Email metafield
    if (emailFromData) {
      const companiesWithEmailQuery = await admin.graphql(`query getCompaniesByEmail($first: Int!, $query: String!) {
        companies(first: $first, query: $query) {
          edges {
            node {
              id
              name
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }`, {
        variables: {
          first: 250,
          query: `metafields.custom.companyEmail:'${emailFromData}'`,
        },
      });

      const companiesWithEmailData = await companiesWithEmailQuery.json();
      const existingCompanyWithEmail = companiesWithEmailData.data.companies.edges.find(edge => {
        return edge.node.metafields.edges.some(metafield => 
          metafield.node.namespace === "custom" && 
          metafield.node.key === "companyEmail" && 
          metafield.node.value === emailFromData
        );
      });

      if (existingCompanyWithEmail) {
        // Company exists with this email, use existing company
        companyId = existingCompanyWithEmail.node.id;
        
        // Update existing company
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
            companyId: companyId,
            input: {
              name: updateData.body.name || updateData.body.company_name,
              note: updateData.body.note || updateData.body.description || "",
              externalId: updateData.body.externalId || updateData.body.targetId?.toString(),
            },
          },
        });

        companyData = await companyResponse.json();
        
        if (companyData.data.companyUpdate.userErrors.length > 0) {
          return json({
            success: false,
            errors: companyData.data.companyUpdate.userErrors.map(error => error.message),
          }, { status: 400 });
        }

        // Set/Update the Target Company ID metafield for the existing company
        if (updateData.body.targetId) {
          const setTargetIdMetafieldResponse = await admin.graphql(`mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                namespace
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }`, {
            variables: {
              metafields: [
                {
                  ownerId: companyId,
                  namespace: "custom",
                  key: "targetCompanyId",
                  value: updateData.body.targetId.toString(),
                  type: "number_integer"
                }
              ]
            },
          });

          const targetIdMetafieldData = await setTargetIdMetafieldResponse.json();
          if (targetIdMetafieldData.data.metafieldsSet.userErrors.length > 0) {
            console.error("Warning: Failed to set target company ID metafield:", targetIdMetafieldData.data.metafieldsSet.userErrors);
          }
        }
      } else {
        // No company exists with this email, create a new company
        isNewCompany = true;
        const createCompanyResponse = await admin.graphql(`mutation companyCreate($input: CompanyCreateInput!) {
          companyCreate(input: $input) {
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
            input: {
              company: {
                name: updateData.body.name || updateData.body.company_name || "New Company",
                note: updateData.body.note || updateData.body.description || "",
                externalId: updateData.body.externalId || updateData.body.targetId?.toString(),
              }
            },
          },
        });

        companyData = await createCompanyResponse.json();
        
        if (companyData.data.companyCreate.userErrors.length > 0) {
          return json({
            success: false,
            errors: companyData.data.companyCreate.userErrors.map(error => error.message),
          }, { status: 400 });
        }

        companyId = companyData.data.companyCreate.company.id;

        // Set the Company Email and Target Company ID metafields for the new company
        const metafieldsToSet = [
          {
            ownerId: companyId,
            namespace: "custom",
            key: "companyEmail",
            value: emailFromData,
            type: "single_line_text_field"
          }
        ];

        // Add Target Company ID metafield if targetId is available
        if (updateData.body.targetId) {
          metafieldsToSet.push({
            ownerId: companyId,
            namespace: "custom",
            key: "targetCompanyId",
            value: updateData.body.targetId.toString(),
            type: "number_integer"
          });
        }

        const setMetafieldsResponse = await admin.graphql(`mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`, {
          variables: {
            metafields: metafieldsToSet
          },
        });

        const metafieldsData = await setMetafieldsResponse.json();
        if (metafieldsData.data.metafieldsSet.userErrors.length > 0) {
          console.error("Warning: Failed to set metafields:", metafieldsData.data.metafieldsSet.userErrors);
        }
      }
    } else {
      // Fallback to original logic if no email provided
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

      companyData = await companyResponse.json();
      
      if (companyData.data.companyUpdate.userErrors.length > 0) {
        return json({
          success: false,
          errors: companyData.data.companyUpdate.userErrors.map(error => error.message),
        }, { status: 400 });
      }

      companyId = `gid://shopify/Company/${updateData.body.externalId || updateData.body.company_id || entry.targetId}`;
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
        companyId: companyId,
      },
    });

    const companyLocationsData = await companyLocationsQuery.json();
    const existingLocations = companyLocationsData.data.company.locations.edges;
    
    let locationResponse;
    let locationResult = null;

    if (existingLocations.length > 0) {
      // Update existing location name first
      const existingLocationId = existingLocations[0].node.id;
      const locationUpdateResponse = await admin.graphql(`mutation companyLocationUpdate($companyLocationId: ID!, $input: CompanyLocationUpdateInput!) {
        companyLocationUpdate(companyLocationId: $companyLocationId, input: $input) {
          companyLocation {
            id
            name
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
          },
        },
      });

      // Update the shipping address using companyLocationAssignAddress
      locationResponse = await admin.graphql(`mutation companyLocationAssignAddress($locationId: ID!, $address: CompanyAddressInput!, $addressTypes: [CompanyAddressType!]!) {
        companyLocationAssignAddress(locationId: $locationId, address: $address, addressTypes: $addressTypes) {
          addresses {
            id
            address1
            address2
            city
            zip
            countryCode
          }
          userErrors {
            field
            message
          }
        }
      }`, {
        variables: {
          locationId: existingLocationId,
          address: {
            address1: updateData.body.address1 || "",
            address2: updateData.body.address2 || "",
            city: updateData.body.city || "",
            countryCode: "IN",
            zip: updateData.body.zipCode || "",
          },
          addressTypes: ["SHIPPING"]
        },
      });

      const locationData = await locationResponse.json();
      if (locationData.data.companyLocationAssignAddress.userErrors.length === 0) {
        locationResult = {
          id: existingLocationId,
          addresses: locationData.data.companyLocationAssignAddress.addresses
        };
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
          companyId: companyId,
          input: {
            name: updateData.body.address1 || "Main Location",
            shippingAddress: {
              address1: updateData.body.address1 || "",
              address2: updateData.body.address2 || "",
              city: updateData.body.city || "",
              countryCode: "IN",
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
    const finalCompany = isNewCompany ? companyData.data.companyCreate.company : companyData.data.companyUpdate.company;
    
    await db.I95DevERPMessage.update({
      where: { id: entry.id },
      data: { 
        status: "success", 
        counter: "1", 
        shopifyId: finalCompany.id,
        updatedBy: "Laravel" 
      },
    });

    return json({ 
      success: true, 
      company: finalCompany,
      location: locationResult,
      isNewCompany: isNewCompany
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

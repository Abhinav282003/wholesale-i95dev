// app/utils/registerQuickOrderScript.ts
/*export async function registerQuickOrderScript(adminClient, appUrl) {
  const scriptSrc = `${appUrl}/quick-order.js`;
  console.log(scriptSrc);
  const checkQuery = `
    query {
      scriptTags(first: 10) {
        edges {
          node {
            id
            src
          }
        }
      }
    }
  `;

  try {
    // ✅ Step 1: Check for existing script tags
    const checkResponse = await adminClient.graphql(checkQuery);

    const existingTags = checkResponse?.body?.data?.scriptTags?.edges ?? [];
    console.log(existingTags);
    existingTags.forEach(tag => {
      console.log(`🧷 ScriptTag ID: ${tag.node.id}, Src: ${tag.node.src}`);
    });
    const alreadyExists = existingTags.some(tag => tag.node.src === scriptSrc);
    if (alreadyExists) {
      console.log("⚠️ ScriptTag already exists:", scriptSrc);
      return null;
    }else{
      console.log("⚠️ ScriptTag not exists:");
      // Step 2: Create new ScriptTag
      const response = await adminClient.graphql(
        `#graphql
        mutation ScriptTagCreate($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag {
              id
              src
              displayScope
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            input: {
              src: scriptSrc,
              displayScope: "ONLINE_STORE",
            },
          },
        },
      );
      const data = await response.json();
      const scriptTag = data.data.scriptTagCreate.scriptTag;

      // Check if the script tag was successfully created
      if (scriptTag) {
        console.log("Script Tag ID:", scriptTag.id);
        console.log("Script Tag URL (content is here):", scriptTag.src);
      } else {
        console.error("Failed to create script tag:", data.data.scriptTagCreate.userErrors);
      }
    }
  } catch (error) {
    const errorText = error?.message ?? "Unknown error";
    console.error("❌ GraphQL error:", errorText);
    return null;
  }
}*/

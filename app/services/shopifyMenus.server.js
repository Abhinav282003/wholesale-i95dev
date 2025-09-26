// app/services/shopifyMenus.server.js
export async function getMainMenu(admin) {
  const response = await admin.graphql(
    `#graphql
      query GetMainMenu {
        menus(first: 10) {
          edges {
            node {
              id
              handle
              title
              items {
                id
                title
                type
                url
                resourceId
              }
            }
          }
        }
      }`
  );

  const data = await response.json();
  return data.data?.menus?.edges?.find(
    edge => edge.node.handle === 'main-menu' || edge.node.title === 'Main menu'
  )?.node;
}

export async function updateMenu(admin, menu, newPage) {
  // Check if the page already exists in the menu
  const alreadyExists = menu.items.some(
    item => item.resourceId === newPage.admin_graphql_api_id
  );

  // Build updated items list
  const updatedItems = alreadyExists
    ? menu.items.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url,
      resourceId: item.resourceId
    }))
    : [
      ...menu.items.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        url: item.url,
        resourceId: item.resourceId
      })),
      {
        title: "Quick Order",
        type: "PAGE",
        resourceId: newPage.admin_graphql_api_id,
        url: `/pages/${newPage.handle}`
      }
    ];

  const response = await admin.graphql(
    `#graphql
      mutation UpdateMenu($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
          menu { id handle items { id title } }
          userErrors { code field message }
        }
      }`,
    {
      variables: {
        id: menu.id,
        title: menu.title,
        handle: menu.handle,
        items: updatedItems
      }
    }
  );

  return response.json();
}

export async function createMainMenu(admin, newPage) {
  const response = await admin.graphql(
    `#graphql
      mutation CreateMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
        menuCreate(title: $title, handle: $handle, items: $items) {
          menu { id handle items { id title } }
          userErrors { code field message }
        }
      }`,
    {
      variables: {
        title: "Main menu",
        handle: "main-menu",
        items: [
          { title: "Home", type: "FRONTPAGE", url: "/" },
          {
            title: "Quick Order",
            type: "PAGE",
            resourceId: newPage.id,
            url: `/pages/${newPage.handle}`
          }
        ]
      }
    }
  );

  return response.json();
}

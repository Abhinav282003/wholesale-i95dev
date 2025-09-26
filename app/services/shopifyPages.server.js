import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

// Get active theme ID
async function getActiveTheme(shop, accessToken) {
  const url = `https://${shop}/admin/api/2025-07/themes.json`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  console.log(data);
  if (!data.themes) throw new Error("Unable to retrieve themes from Shopify");

  const mainTheme = data.themes.find(t => t.role === "main");
  if (!mainTheme) throw new Error("No main theme found");

  return mainTheme.id;
}

function generateQuickOrderTemplate() {
  const templateLiquid = `
{% comment %}
  Quick Order Template - Requires Customer Login
{% endcomment %}

{% if customer %}
  <!-- Customer is logged in, show the quick order form -->
  <div class="quick-order-page page-width">
    <div class="page-header">
      <h1 class="page-title">{{ page.title }}</h1>
      <p class="welcome-message">Welcome back, {{ customer.first_name | default: customer.email }}!</p>
    </div>
    
    {% comment %} Render the quick order list snippet {% endcomment %}
    {% render 'quick-order-list' %}
  </div>
{% else %}
  <!-- Customer is not logged in, show login prompt -->
  <div class="quick-order-login-required page-width">
    <div class="login-prompt">
      <div class="login-card">
        <h1 class="login-title">{{ page.title }}</h1>
        <div class="login-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
          </svg>
        </div>
        <h2 class="login-heading">Login Required</h2>
        <p class="login-description">
          You need to be logged in to access the Quick Order feature. 
          Please log in to your account to continue with bulk ordering.
        </p>
        <div class="login-actions">
          <a href="/account/login?return_url={{ request.path | url_encode }}" class="button button--primary login-button">
            Log In
          </a>
        </div>
        <div class="login-benefits">
          <h3>Quick Order Benefits:</h3>
          <ul>
            <li>✓ Bulk product ordering</li>
            <li>✓ Save time with quantity inputs</li>
            <li>✓ Order history and reordering</li>
            <li>✓ Personalized product recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <style>
    .quick-order-login-required {
      padding: 60px 20px;
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-prompt {
      max-width: 500px;
      width: 100%;
    }

    .login-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid #e1e8ed;
    }

    .login-title {
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 600;
      color: #202223;
    }

    .login-icon {
      margin: 0 0 20px 0;
      color: #008060;
    }

    .login-heading {
      margin: 0 0 15px 0;
      font-size: 24px;
      font-weight: 600;
      color: #202223;
    }

    .login-description {
      margin: 0 0 30px 0;
      font-size: 16px;
      line-height: 1.6;
      color: #6d7175;
    }

    .login-actions {
      display: flex;
      margin-bottom: 30px;
      justify-content: center;
    }

    .login-button {
      padding: 14px 32px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
      display: inline-block;
      background-color: #008060;
      color: white;
      box-shadow: 0 2px 4px rgba(0, 128, 96, 0.2);
    }

    .login-button:hover {
      background-color: #006b52;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 128, 96, 0.3);
      color: white;
      text-decoration: none;
    }

    .login-benefits {
      text-align: left;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }

    .login-benefits h3 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #202223;
      text-align: center;
    }

    .login-benefits ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .login-benefits li {
      padding: 8px 0;
      font-size: 14px;
      color: #008060;
      display: flex;
      align-items: center;
    }

    @media (max-width: 768px) {
      .quick-order-login-required {
        padding: 40px 15px;
      }

      .login-card {
        padding: 30px 20px;
      }

      .login-actions {
        align-items: center;
      }

      .login-button {
        width: 100%;
        max-width: 200px;
      }
    }
  </style>
{% endif %}
`;
  return templateLiquid;
}

// Main function to create Quick Order page
export async function createQuickOrderPage(shop, accessToken) {
  try {
    const themeId = await getActiveTheme(shop, accessToken);
    const template = generateQuickOrderTemplate();
    // 1️⃣ Check if page exists
    let res = await fetch(`https://${shop}/admin/api/2023-10/pages.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    const pagesData = await res.json();
    let page = pagesData.pages.find(p => p.handle === "quick-order");

    if (!page) {
      // Create page
      res = await fetch(`https://${shop}/admin/api/2023-10/pages.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: {
            title: "Quick Order",
            handle: "quick-order",
            body_html: "",
            published: true,
          },
        }),
      });
      const data = await res.json();
      page = data.page;
      console.log("✅ Page created:", page.handle);
    } else {
      console.log("ℹ️ Page already exists:", page.handle);
    }
    const pageId = page.id;

    // 2️⃣ Create Liquid template if not exists
    const response = await fetch(`https://${shop}/admin/api/2023-10/themes/${themeId}/assets.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: {
          key: "templates/page.quick-order-list.liquid",
          value: template
        },
      }),
    });
    // 👇 check the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to create template:", errorText);
      throw new Error(errorText);
    }
    const data = await response.json();
    console.log("✅ Template created/updated:", data);

    // 3 Assign template to page
    await fetch(`https://${shop}/admin/api/2023-10/pages/${pageId}.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page: { id: pageId, template_suffix: "quick-order-list" } }),
    });
    console.log("✅ Page assigned to quick-order template");
    return page;
  } catch (err) {
    console.error("Error creating Quick Order page:", err);
    throw err;
  }
}

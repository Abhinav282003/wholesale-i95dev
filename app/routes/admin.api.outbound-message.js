import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import db from '../db.server';

// GET /admin/api/product-updates
export async function loader({ request }) {
  //const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  try {
    // ...same logic as before...
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const updateType = url.searchParams.get('updateType');
    const productId = url.searchParams.get('shopifyId');
    const shop = url.searchParams.get('shop');
    const entityCode = url.searchParams.get('entityCode');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    const where = {status: { in: ['pending', 'error'] }}; 
    if (updateType) where.updateType = updateType;
    if (productId) where.productId = productId;
    if (shop) where.shop = shop;
    if (entityCode) where.entityCode = entityCode;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const totalCount = await db.I95DevShopifyMessage.count({ where });
    const updates = await db.I95DevShopifyMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });
// Bulk update (all same update)
const updateStatus = await db.I95DevShopifyMessage.updateMany({
  data: { status: "request transferred" },
  where,
});

    return json({
      success: true,
      data: updates,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return json({
      success: false,
      error: 'API Error:' + error.message
    }, { status: 500 });
  }
}

// POST /admin/api/product-updates
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const requiredFields = ['productId', 'productTitle', 'updateType', 'description'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    const updateEntry = await db.productUpdateEntry.create({
      data: {
        shop: body.shop || 'unknown',
        entityCode: body.entityCode || 'default',
        productId: body.productId.toString(),
        productTitle: body.productTitle,
        variantId: body.variantId?.toString(),
        variantTitle: body.variantTitle,
        updateType: body.updateType,
        oldValue: body.oldValue,
        newValue: body.newValue,
        description: body.description,
        status: body.status || 'pending',
        updatedBy: body.updatedBy || 'API',
      },
    });

    return json({
      success: true,
      data: updateEntry,
      message: 'Product update entry created successfully',
    });
  } catch (error) {
    console.error('API Error:', error);
    return json({
      success: false,
      error: 'Failed to create product update entry'
    }, { status: 500 });
  }
}

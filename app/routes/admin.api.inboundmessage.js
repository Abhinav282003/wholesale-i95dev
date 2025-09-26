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
    const totalCount = await db.I95DevERPMessage.count({ where });
    const updates = await db.I95DevERPMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
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
      error: 'Failed to fetch product updates'
    }, { status: 500 });
  }
}

// POST /admin/api/inboundmessage
// Create a new inbound message entry in the database
export async function action({ request }) {
  //const { admin } = await authenticate.admin(request);

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const requiredFields = ['targetId','entityCode'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return json({
          success: false,
          error: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }
    // Create the inbound message entry

    const inboundMessageCreate = await db.I95DevERPMessage.create({
        data: {
          entityCode: body.entityCode,
          targetId: (body.entityCode === 'product') ? body.sku.toString() : 
                   (body.entityCode === 'company') ? (body.externalId || body.company_id || body.companyId || body.targetId).toString() : 
                   body.targetId.toString(),
          erpCode: body.erpCode || 'laravel',
          variantId: body.variantId?.toString() || null,
          variantTitle: body.variantTitle || null,
          counter: "0",
          status: body.status || 'pending',
        }
      }); 
    
	
	const createDataEntry = await db.I95DevErpData.create({
      data: {
        msgId: inboundMessageCreate.id,
        dataString: JSON.stringify({body}),
      }
    });
	

    return json({
      success: true,
      data: createDataEntry,
      message: 'Inbound message entry created successfully',
    });
  } catch (error) {
    console.error('API Error:', error);
    return json({
      success: false,
      error: error.message || 'Failed to create inbound message entry'
    }, { status: 500 });
  }
}

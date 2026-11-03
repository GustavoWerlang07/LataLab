export default async function handler(req: any, res: any) {
  // CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    const can = req.body || {};
    const id = can.id || 'can_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    
    const newCan = {
      id,
      brand: (can.brand || 'Lata Colecionável').trim(),
      product: (can.product || 'Bebida em Lata').trim(),
      variant: (can.variant || '').trim(),
      category: can.category || 'refrigerante',
      volumeMl: Math.max(1, Number(can.volumeMl) || 350),
      predominantColor: can.predominantColor || '#2563eb',
      visualDescription: (can.visualDescription || '').trim(),
      isSpecialEdition: Boolean(can.isSpecialEdition),
      specialEditionDetails: (can.specialEditionDetails || '').trim(),
      quantity: Math.max(1, Number(can.quantity) || 1),
      originCountry: (can.originCountry || 'Brasil').trim(),
      imageUrl: can.imageBase64 || can.imageUrl || '/sample-cans/coca-original.jpg',
      thumbnailUrl: can.imageBase64 || can.thumbnailUrl || '/sample-cans/coca-original.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.status(201).json(newCan);
  }

  if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({ success: true });
}

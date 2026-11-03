import { CanItem } from '../types/can';

const STORAGE_KEY = 'latalab_cans_collection_v1';
const SETTINGS_KEY = 'latalab_settings_v1';

// Read all cans from local storage (instant, reliable, works offline and on Vercel)
export function getLocalCans(): CanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Notice reading local storage cans:', err);
    return [];
  }
}

// Persist cans array to local storage
export function saveLocalCans(cans: CanItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cans));
  } catch (err) {
    console.warn('Notice saving cans to local storage:', err);
    // If quota exceeded (rare, only if many huge uncompressed base64 images), trim image thumbnails
    try {
      const lightweightCans = cans.map((c) => ({
        ...c,
        imageUrl: c.imageUrl?.length > 300000 ? c.thumbnailUrl || '/sample-cans/coca-original.jpg' : c.imageUrl,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightCans));
    } catch {
      // ignore
    }
  }
}

// Create and add a new can locally (guaranteed success, no 404 possible)
export function addLocalCan(canData: Partial<CanItem> & { imageBase64?: string }): CanItem {
  const id = 'can_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  const cleanBrand = (canData.brand || '').trim() || 'Lata Colecionável';
  const cleanVariant = (canData.variant || '').trim();
  let cleanProduct = (canData.product || '').trim();
  if (!cleanProduct) {
    cleanProduct = cleanVariant ? `${cleanBrand} ${cleanVariant}` : `${cleanBrand} Original`;
  }

  const imageUrl = canData.imageBase64 || canData.imageUrl || '/sample-cans/coca-original.jpg';
  const thumbnailUrl = canData.imageBase64 || canData.thumbnailUrl || imageUrl;

  const newCan: CanItem = {
    id,
    brand: cleanBrand,
    product: cleanProduct,
    variant: cleanVariant,
    category: canData.category || 'refrigerante',
    volumeMl: Math.max(1, Number(canData.volumeMl) || 350),
    predominantColor: canData.predominantColor || '#2563eb',
    visualDescription: (canData.visualDescription || '').trim(),
    isSpecialEdition: Boolean(canData.isSpecialEdition),
    specialEditionDetails: (canData.specialEditionDetails || '').trim(),
    quantity: Math.max(1, Number(canData.quantity) || 1),
    originCountry: (canData.originCountry || 'Brasil').trim(),
    imageUrl,
    thumbnailUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existing = getLocalCans();
  const updated = [newCan, ...existing];
  saveLocalCans(updated);
  return newCan;
}

// Update an existing can
export function updateLocalCan(id: string, updates: Partial<CanItem>): CanItem | null {
  const existing = getLocalCans();
  const index = existing.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const updatedCan: CanItem = {
    ...existing[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = updatedCan;
  saveLocalCans(existing);
  return updatedCan;
}

// Update quantity (+1 / -1)
export function updateLocalQuantity(id: string, delta: number): CanItem | null {
  const existing = getLocalCans();
  const index = existing.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const newQty = Math.max(0, (existing[index].quantity || 1) + delta);
  const updatedCan: CanItem = {
    ...existing[index],
    quantity: newQty,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = updatedCan;
  saveLocalCans(existing);
  return updatedCan;
}

// Delete can
export function deleteLocalCan(id: string): boolean {
  const existing = getLocalCans();
  const filtered = existing.filter((c) => c.id !== id);
  saveLocalCans(filtered);
  return filtered.length < existing.length;
}

// Background sync helper: attempts server sync if available, but never blocks or fails user actions
export async function syncCanWithServer(can: CanItem, isNew = false): Promise<void> {
  try {
    const url = isNew ? '/api/cans' : `/api/cans/${can.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...can,
        imageBase64: can.imageUrl?.startsWith('data:') ? can.imageUrl : undefined,
      }),
    });

    if (res.ok) {
      const serverCan = await res.json().catch(() => null);
      if (serverCan && serverCan.id) {
        // If server stored image on disk, update local URL
        if (serverCan.imageUrl && !serverCan.imageUrl.startsWith('data:')) {
          updateLocalCan(can.id, {
            imageUrl: serverCan.imageUrl,
            thumbnailUrl: serverCan.thumbnailUrl,
          });
        }
      }
    }
  } catch {
    // Gracefully ignore server/network issues (client storage is the source of truth)
  }
}

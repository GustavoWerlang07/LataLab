import { CanCategory, CanItem, CollectionStats, BrandSummary, SortOption } from '../types/can';

export const CATEGORY_LABELS: Record<CanCategory, string> = {
  refrigerante: 'Refrigerante',
  energetico: 'Energético',
  cha: 'Chá',
  suco: 'Suco',
  agua_saborizada: 'Água Saborizada',
  cafe_gelado: 'Café Gelado',
  outra_nao_alcoolica: 'Outra Bebida Não Alcoólica',
};

export function calculateStats(cans: CanItem[]): CollectionStats {
  const totalModels = cans.length;
  const totalUnits = cans.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0);
  
  const brandsSet = new Set<string>();
  const categoriesSet = new Set<string>();
  let specialEditionsCount = 0;

  for (const can of cans) {
    if (can.brand?.trim()) {
      brandsSet.add(can.brand.trim().toLowerCase());
    }
    if (can.category) {
      categoriesSet.add(can.category);
    }
    if (can.isSpecialEdition) {
      specialEditionsCount++;
    }
  }

  return {
    totalModels,
    totalUnits,
    totalBrands: brandsSet.size,
    totalCategories: categoriesSet.size,
    specialEditionsCount,
  };
}

export function groupBrands(cans: CanItem[]): BrandSummary[] {
  const map = new Map<string, { brand: string; modelCount: number; unitCount: number; previewImages: string[] }>();

  for (const can of cans) {
    const rawBrand = can.brand?.trim() || 'Outras';
    const key = rawBrand.toLowerCase();
    
    if (!map.has(key)) {
      map.set(key, {
        brand: rawBrand,
        modelCount: 0,
        unitCount: 0,
        previewImages: [],
      });
    }

    const entry = map.get(key)!;
    entry.modelCount += 1;
    entry.unitCount += (Number(can.quantity) || 1);
    if (can.imageUrl && entry.previewImages.length < 4) {
      entry.previewImages.push(can.imageUrl);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.modelCount - a.modelCount);
}

export function filterCans(
  cans: CanItem[],
  query: string,
  brandFilter: string,
  categoryFilter: string,
  volumeFilter: number | null,
  specialOnly: boolean,
  sort: SortOption
): CanItem[] {
  const q = query.trim().toLowerCase();

  let filtered = cans.filter((can) => {
    // Text search
    if (q) {
      const matchBrand = can.brand.toLowerCase().includes(q);
      const matchProduct = can.product.toLowerCase().includes(q);
      const matchVariant = can.variant ? can.variant.toLowerCase().includes(q) : false;
      const matchDesc = can.visualDescription.toLowerCase().includes(q);
      const matchSpecial = can.specialEditionDetails ? can.specialEditionDetails.toLowerCase().includes(q) : false;
      const matchVolume = `${can.volumeMl}`.includes(q);

      if (!matchBrand && !matchProduct && !matchVariant && !matchDesc && !matchSpecial && !matchVolume) {
        return false;
      }
    }

    // Brand filter
    if (brandFilter && brandFilter !== 'all') {
      if (can.brand.toLowerCase() !== brandFilter.toLowerCase()) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      if (can.category !== categoryFilter) {
        return false;
      }
    }

    // Volume filter
    if (volumeFilter !== null && volumeFilter > 0) {
      if (can.volumeMl !== volumeFilter) {
        return false;
      }
    }

    // Special edition filter
    if (specialOnly && !can.isSpecialEdition) {
      return false;
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === 'alphabetical') {
      const nameA = `${a.brand} ${a.product}`.toLowerCase();
      const nameB = `${b.brand} ${b.product}`.toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (sort === 'quantity') {
      return (b.quantity || 1) - (a.quantity || 1);
    }
    return 0;
  });

  return filtered;
}

/**
 * Fast client-side preliminary duplicate / variant heuristic
 * used before or alongside Gemini deep visual inspection.
 */
export function findPotentialDuplicates(
  candidate: Partial<CanItem>,
  collection: CanItem[]
): { item: CanItem; score: number; reason: string }[] {
  if (!collection.length) return [];

  const candidateBrand = (candidate.brand || '').trim().toLowerCase();
  const candidateProduct = (candidate.product || '').trim().toLowerCase();
  const candidateVariant = (candidate.variant || '').trim().toLowerCase();
  const candidateVol = candidate.volumeMl;

  const matches: { item: CanItem; score: number; reason: string }[] = [];

  for (const item of collection) {
    let score = 0;
    const reasons: string[] = [];

    const itemBrand = item.brand.trim().toLowerCase();
    const itemProduct = item.product.trim().toLowerCase();
    const itemVariant = (item.variant || '').trim().toLowerCase();

    // Brand matching
    if (candidateBrand && itemBrand === candidateBrand) {
      score += 40;
      reasons.push('Mesma marca');
    } else if (candidateBrand && (itemBrand.includes(candidateBrand) || candidateBrand.includes(itemBrand))) {
      score += 20;
      reasons.push('Marca parecida');
    }

    // Product matching
    if (candidateProduct && itemProduct === candidateProduct) {
      score += 35;
      reasons.push('Mesmo nome de produto');
    } else if (candidateProduct && (itemProduct.includes(candidateProduct) || candidateProduct.includes(itemProduct))) {
      score += 15;
      reasons.push('Produto similar');
    }

    // Variant matching
    if (candidateVariant && itemVariant && candidateVariant === itemVariant) {
      score += 15;
      reasons.push('Mesmo sabor/variante');
    }

    // Volume matching
    if (candidateVol && item.volumeMl && candidateVol === item.volumeMl) {
      score += 10;
      reasons.push(`${candidateVol} ml idêntico`);
    }

    if (score >= 40) {
      matches.push({
        item,
        score: Math.min(score, 98),
        reason: reasons.join(', '),
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

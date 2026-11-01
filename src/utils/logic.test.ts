import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStats, groupBrands, filterCans, findPotentialDuplicates } from './logic';
import { CanItem } from '../types/can';

const mockCans: CanItem[] = [
  {
    id: 'can-1',
    brand: 'Coca-Cola',
    product: 'Coca-Cola Original',
    variant: 'Tradicional',
    category: 'refrigerante',
    volumeMl: 350,
    visualDescription: 'Lata vermelha clássica com logo em branco curvado',
    isSpecialEdition: false,
    quantity: 2,
    imageUrl: '/uploads/coca.jpg',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'can-2',
    brand: 'Coca-Cola',
    product: 'Coca-Cola Sem Açúcar',
    variant: 'Zero',
    category: 'refrigerante',
    volumeMl: 350,
    visualDescription: 'Lata preta com faixa vermelha e logo branco',
    isSpecialEdition: true,
    specialEditionDetails: 'Copa do Mundo 2022',
    quantity: 1,
    imageUrl: '/uploads/coca-zero.jpg',
    createdAt: '2025-01-05T10:00:00Z',
  },
  {
    id: 'can-3',
    brand: 'Monster Energy',
    product: 'Monster Ultra Paradise',
    variant: 'Kiwi e Lima',
    category: 'energetico',
    volumeMl: 473,
    visualDescription: 'Lata verde texturizada com garras prateadas',
    isSpecialEdition: false,
    quantity: 3,
    imageUrl: '/uploads/monster.jpg',
    createdAt: '2025-01-10T10:00:00Z',
  },
];

test('calculateStats returns correct metrics for models, units, brands and categories', () => {
  const stats = calculateStats(mockCans);
  assert.equal(stats.totalModels, 3);
  assert.equal(stats.totalUnits, 6); // 2 + 1 + 3
  assert.equal(stats.totalBrands, 2); // Coca-Cola and Monster Energy
  assert.equal(stats.totalCategories, 2); // refrigerante, energetico
  assert.equal(stats.specialEditionsCount, 1);
});

test('groupBrands groups models and physical units accurately', () => {
  const brands = groupBrands(mockCans);
  assert.equal(brands.length, 2);
  const coca = brands.find((b) => b.brand.toLowerCase() === 'coca-cola');
  assert.ok(coca);
  assert.equal(coca.modelCount, 2);
  assert.equal(coca.unitCount, 3);

  const monster = brands.find((b) => b.brand.toLowerCase() === 'monster energy');
  assert.ok(monster);
  assert.equal(monster.modelCount, 1);
  assert.equal(monster.unitCount, 3);
});

test('filterCans filters by search query and category', () => {
  const resultsQuery = filterCans(mockCans, 'paradise', 'all', 'all', null, false, 'recent');
  assert.equal(resultsQuery.length, 1);
  assert.equal(resultsQuery[0].id, 'can-3');

  const resultsCategory = filterCans(mockCans, '', 'all', 'energetico', null, false, 'recent');
  assert.equal(resultsCategory.length, 1);
  assert.equal(resultsCategory[0].id, 'can-3');

  const resultsSpecial = filterCans(mockCans, '', 'all', 'all', null, true, 'recent');
  assert.equal(resultsSpecial.length, 1);
  assert.equal(resultsSpecial[0].id, 'can-2');
});

test('findPotentialDuplicates flags matches with same brand and product', () => {
  const candidate = {
    brand: 'Coca-Cola',
    product: 'Coca-Cola Original',
    volumeMl: 350,
  };
  const duplicates = findPotentialDuplicates(candidate, mockCans);
  assert.ok(duplicates.length > 0);
  assert.equal(duplicates[0].item.id, 'can-1');
  assert.ok(duplicates[0].score >= 75);
});

export type CanCategory = 
  | 'refrigerante' 
  | 'energetico' 
  | 'cha' 
  | 'suco' 
  | 'agua_saborizada' 
  | 'cafe_gelado' 
  | 'outra_nao_alcoolica';

export interface CanItem {
  id: string;
  brand: string;                   // ex: Coca-Cola, Red Bull, Monster, Guaraná Antarctica
  product: string;                 // ex: Coca-Cola Original, Monster Ultra
  variant?: string;                // ex: Sem Açúcar, Melancia, Tropical, Zero
  category: CanCategory;
  volumeMl: number;                // ex: 220, 269, 310, 350, 355, 473
  predominantColor?: string;       // ex: #e11d48, #059669
  visualDescription: string;       // Detalhes visuais, arte, grafismo, logotipo
  isSpecialEdition: boolean;       // Edição especial, comemorativa ou promocional
  specialEditionDetails?: string;  // ex: 'Copa do Mundo 2022', 'Rótulo Retrô 1982'
  quantity: number;                // Quantidade de unidades físicas deste modelo
  imageUrl: string;                // URL da foto original/otimizada
  thumbnailUrl?: string;           // URL da miniatura
  createdAt: string;               // ISO Date string
  updatedAt?: string;
  tags?: string[];
  barcode?: string;
  originCountry?: string;          // ex: Brasil, Japão, EUA
}

export interface CollectionStats {
  totalModels: number;       // Modelos únicos
  totalUnits: number;        // Unidades físicas totais
  totalBrands: number;       // Marcas cadastradas
  totalCategories: number;   // Categorias presentes
  specialEditionsCount: number;
}

export interface BrandSummary {
  brand: string;
  modelCount: number;
  unitCount: number;
  previewImages: string[];
}

export interface CanAnalysisResponse {
  success: boolean;
  brand?: string;
  product?: string;
  variant?: string;
  category?: CanCategory;
  volumeMl?: number;
  predominantColor?: string;
  visualDescription?: string;
  isSpecialEdition?: boolean;
  specialEditionDetails?: string;
  confidenceScore?: number;
  notes?: string;
  error?: string;
}

export type DuplicateMatchStatus = 
  | 'PROBABLY_EXISTS'    // Você provavelmente já tem esta latinha
  | 'POSSIBLE_VARIANT'   // Possível versão diferente. Confira os detalhes.
  | 'NOT_FOUND';         // Não encontramos esta latinha na sua coleção.

export interface DuplicateCheckResult {
  status: DuplicateMatchStatus;
  statusMessage: string;
  similarityScore: number;       // 0 - 100%
  matchedCan?: CanItem;
  otherPotentialMatches?: CanItem[];
  visualDifferences: string[];
  explanation: string;
  confidence: 'alta' | 'media' | 'baixa';
  needsManualConfirmation: boolean;
}

export type SortOption = 'recent' | 'oldest' | 'alphabetical' | 'quantity';

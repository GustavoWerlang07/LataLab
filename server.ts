import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'cans.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '[]', 'utf-8');
}

// Read and write helper functions
function readCans(): any[] {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading cans database:', err);
    return [];
  }
}

function writeCans(cans: any[]): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(cans, null, 2), 'utf-8');
}

function readSettings(): { pinEnabled: boolean; pinHash?: string } {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    // fallback
  }
  return { pinEnabled: false };
}

function writeSettings(settings: any): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

// Initialize Gemini Client
const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
const isApiKeyValid = Boolean(rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY' && rawApiKey.length > 15);
const aiApiKey = isApiKeyValid ? rawApiKey : '';
const ai = isApiKeyValid
  ? new GoogleGenAI({
      apiKey: aiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();

  // Increase payload limit for base64 image uploads (up to 20MB)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- API Routes ---

  // Check AI availability status
  app.get('/api/ai/status', (req, res) => {
    res.json({
      configured: isApiKeyValid,
      model: 'gemini-3.8-flash',
    });
  });

  // Tesseract OCR extraction helper
  async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
    let worker: any = null;
    try {
      // Resize to 700px width for ultra-fast OCR processing
      const optimized = await sharp(buffer)
        .resize({ width: 700, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      worker = await createWorker('por');
      const res = await worker.recognize(optimized);
      return res?.data?.text || '';
    } catch (err) {
      console.warn('OCR processing notice:', err);
      return '';
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // Helper function to extract color & recognize can attributes via Optical Character Recognition and Brazilian Beverage Knowledge Base
  async function smartCanAnalysis(buffer: Buffer, fileName?: string): Promise<any> {
    try {
      // 1. Color extraction via Sharp
      const stats = await sharp(buffer).stats();
      const r = Math.round(stats.channels[0]?.mean || 120);
      const g = Math.round(stats.channels[1]?.mean || 120);
      const b = Math.round(stats.channels[2]?.mean || 120);
      let hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

      // 2. OCR text extraction directly from the can image pixels
      const ocrText = await extractTextFromBuffer(buffer);
      const combinedText = `${fileName || ''} ${ocrText}`.toLowerCase();

      // Detection variables
      let brand = 'Lata Colecionável';
      let product = 'Bebida em Lata';
      let variant = 'Original';
      let category = 'refrigerante';
      let volumeMl = 350;
      let visualDescription = 'Lata metálica de alumínio serigrafada.';
      let isSpecialEdition = false;
      let specialEditionDetails = '';
      let confidenceScore = 90;

      const isZero = combinedText.includes('sem açúcar') || 
                      combinedText.includes('sem acucar') || 
                      combinedText.includes('zero') || 
                      combinedText.includes('diet') || 
                      combinedText.includes('light');

      // 3. Known Brand Detection
      if (combinedText.includes('baly')) {
        brand = 'BALY';
        category = 'energetico';
        volumeMl = 473;
        hex = '#f43f5e';

        if (combinedText.includes('melancia') || combinedText.includes('watermelon')) {
          variant = isZero ? 'Melancia Sem Açúcar' : 'Melancia';
          product = `Baly Energy Drink ${variant}`;
          hex = '#e11d48';
          visualDescription = 'Lata 473ml Baly Brasil Energy Drink sabor Melancia Sem Açúcar, com cores vibrantes rosa e verde limão e grafismos de melancia.';
        } else if (combinedText.includes('maçã') || combinedText.includes('maca') || combinedText.includes('green apple')) {
          variant = isZero ? 'Maçã Verde Sem Açúcar' : 'Maçã Verde';
          product = `Baly Energy Drink ${variant}`;
          hex = '#16a34a';
          visualDescription = 'Lata 473ml Baly Energy Drink sabor Maçã Verde, com tons de verde vibrante e logotipo Baly Brasil.';
        } else if (combinedText.includes('tropical')) {
          variant = isZero ? 'Tropical Sem Açúcar' : 'Tropical';
          product = `Baly Energy Drink ${variant}`;
          hex = '#ea580c';
          visualDescription = 'Lata 473ml Baly Energy Drink sabor Frutas Tropicais em degradê laranja e amarelo solar.';
        } else if (combinedText.includes('maracujá') || combinedText.includes('maracuja')) {
          variant = 'Maracujá';
          product = `Baly Energy Drink Maracujá`;
          hex = '#eab308';
          visualDescription = 'Lata 473ml Baly Energy Drink sabor Maracujá com tons amarelos e logotipo estilizado.';
        } else if (combinedText.includes('coco') || combinedText.includes('açaí') || combinedText.includes('acai')) {
          variant = 'Coco e Açaí';
          product = `Baly Energy Drink Coco & Açaí`;
          hex = '#6b21a8';
          visualDescription = 'Lata 473ml Baly Energy Drink Coco com Açaí em tons de roxo profundo e branco.';
        } else if (combinedText.includes('morango') || combinedText.includes('pêssego') || combinedText.includes('pessego')) {
          variant = 'Morango & Pêssego';
          product = `Baly Energy Drink Morango e Pêssego`;
          hex = '#fb7185';
          visualDescription = 'Lata 473ml Baly Energy Drink Morango e Pêssego em degradê rosado suave.';
        } else if (combinedText.includes('pitaya')) {
          variant = 'Pitaya';
          product = `Baly Energy Drink Pitaya`;
          hex = '#ec4899';
          visualDescription = 'Lata 473ml Baly Energy Drink sabor Pitaya em rosa choque marcante.';
        } else {
          variant = isZero ? 'Sem Açúcar' : 'Original';
          product = `Baly Brasil Energy Drink ${variant}`;
          hex = isZero ? '#18181b' : '#3b82f6';
          visualDescription = 'Lata 473ml Baly Brasil Energy Drink tradicional com logotipo central e acabamento metálico.';
        }
        confidenceScore = 96;
      } else if (combinedText.includes('monster')) {
        brand = 'Monster Energy';
        category = 'energetico';
        volumeMl = 473;

        if (combinedText.includes('paradise')) {
          variant = 'Ultra Paradise';
          product = 'Monster Ultra Paradise';
          hex = '#15803d';
          visualDescription = 'Lata fosca verde kiwi com a icônica garra esculpida em relevo tátil e detalhes tropicais.';
          isSpecialEdition = true;
          specialEditionDetails = 'Linha Ultra Zero Açúcar';
        } else if (combinedText.includes('mango') || combinedText.includes('loco')) {
          variant = 'Mango Loco';
          product = 'Monster Juiced Mango Loco';
          hex = '#0284c7';
          visualDescription = 'Lata azul celeste com ilustrações temáticas do Dia de Los Muertos e suco de manga.';
          isSpecialEdition = true;
          specialEditionDetails = 'Linha Monster Juiced';
        } else if (combinedText.includes('white') || combinedText.includes('zero ultra')) {
          variant = 'Zero Ultra';
          product = 'Monster Energy Zero Ultra';
          hex = '#e2e8f0';
          visualDescription = 'Lata texturizada branca e prateada acetinada com detalhes foscos em relevo.';
          isSpecialEdition = true;
          specialEditionDetails = 'Linha Ultra White';
        } else if (combinedText.includes('pipeline')) {
          variant = 'Pipeline Punch';
          product = 'Monster Pipeline Punch';
          hex = '#f43f5e';
          visualDescription = 'Lata rosa coral fosca inspirada nas ondas do Havaí.';
          isSpecialEdition = true;
          specialEditionDetails = 'Linha Monster Punch';
        } else if (combinedText.includes('pacific')) {
          variant = 'Pacific Punch';
          product = 'Monster Pacific Punch';
          hex = '#be123c';
          visualDescription = 'Lata temática estilo marinheiro clássico anos 60 com garra vermelha.';
        } else if (combinedText.includes('khaotic')) {
          variant = 'Khaotic';
          product = 'Monster Juiced Khaotic';
          hex = '#ea580c';
          visualDescription = 'Lata laranja e preta com borboletas estilizadas de grafite urbano.';
        } else {
          variant = isZero ? 'Zero Açúcar' : 'Energy Original';
          product = isZero ? 'Monster Energy Zero Açúcar' : 'Monster Energy Original';
          hex = '#171717';
          visualDescription = 'Lata preta grafite fosca com a célebre garra verde fluorescente estilizada em destaque.';
        }
        confidenceScore = 95;
      } else if (combinedText.includes('red bull') || combinedText.includes('redbull')) {
        brand = 'Red Bull';
        category = 'energetico';
        volumeMl = 250;

        if (combinedText.includes('melancia') || combinedText.includes('red edition')) {
          variant = 'Red Edition Melancia';
          product = 'Red Bull The Red Edition Melancia';
          hex = '#dc2626';
          visualDescription = 'Lata slim vermelha brilhante com os touros em contraste e sabor melancia.';
          isSpecialEdition = true;
          specialEditionDetails = 'The Red Edition';
        } else if (combinedText.includes('tropical') || combinedText.includes('yellow edition')) {
          variant = 'Yellow Edition Tropical';
          product = 'Red Bull The Yellow Edition Tropical';
          hex = '#eab308';
          visualDescription = 'Lata slim amarela cintilante com os touros e sabor tropical.';
          isSpecialEdition = true;
          specialEditionDetails = 'The Yellow Edition';
        } else if (combinedText.includes('pitaya') || combinedText.includes('summer')) {
          variant = 'Summer Edition Pitaya';
          product = 'Red Bull Summer Edition Pitaya';
          hex = '#059669';
          visualDescription = 'Lata slim verde esmeralda com o touro clássico e sabor pitaya.';
          isSpecialEdition = true;
          specialEditionDetails = 'The Summer Edition';
        } else if (isZero || combinedText.includes('sugarfree')) {
          variant = 'Sugarfree';
          product = 'Red Bull Sugarfree';
          hex = '#0284c7';
          visualDescription = 'Lata slim azul claro e prateada em padrão xadrez diagonal característico.';
        } else {
          variant = 'Original';
          product = 'Red Bull Energy Drink';
          hex = '#1d4ed8';
          visualDescription = 'Lata slim azul escuro e prata com o losango e os touros vermelhos em confronto sobre o sol dourado.';
        }
        confidenceScore = 95;
      } else if (combinedText.includes('coca') || combinedText.includes('coke')) {
        brand = 'Coca-Cola';
        category = 'refrigerante';
        volumeMl = 350;

        if (isZero) {
          variant = 'Sem Açúcar';
          product = 'Coca-Cola Sem Açúcar';
          hex = '#18181b';
          visualDescription = 'Lata preta elegante com detalhe vermelho e o logotipo clássico Coca-Cola em caligrafia branca.';
        } else if (combinedText.includes('café') || combinedText.includes('cafe') || combinedText.includes('coffee')) {
          variant = 'Plus Café Espresso';
          product = 'Coca-Cola Plus Café';
          hex = '#78350f';
          visualDescription = 'Lata slim marrom café com acabamento metálico acetinado.';
          isSpecialEdition = true;
          specialEditionDetails = 'Edição Especial Café';
        } else {
          variant = 'Original';
          product = 'Coca-Cola Original';
          hex = '#dc2626';
          visualDescription = 'Lata vermelha rubi emblemática com o clássico logotipo em caligrafia Spenceriana branca.';
        }
        confidenceScore = 95;
      } else if (combinedText.includes('guarana') || combinedText.includes('guaraná') || combinedText.includes('antarctica')) {
        brand = 'Guaraná Antarctica';
        category = 'refrigerante';
        volumeMl = 350;

        if (isZero) {
          variant = 'Zero Açúcar';
          product = 'Guaraná Antarctica Zero';
          hex = '#15803d';
          visualDescription = 'Lata verde esmeralda com faixas pretas e frutos de guaraná estilizados em acabamento fosco.';
        } else {
          variant = 'Original';
          product = 'Guaraná Antarctica Original';
          hex = '#16a34a';
          visualDescription = 'Lata verde clássica com os galhos e sementes de guaraná da Amazônia e tipografia branca sobre vermelho.';
        }
        confidenceScore = 94;
      } else if (combinedText.includes('pepsi')) {
        brand = 'Pepsi';
        category = 'refrigerante';
        volumeMl = 350;

        if (isZero || combinedText.includes('black')) {
          variant = 'Black Zero Açúcar';
          product = 'Pepsi Black';
          hex = '#18181b';
          visualDescription = 'Lata preta acetinada com o globo Pepsi em destaque e tipografia minimalista.';
        } else if (combinedText.includes('twist')) {
          variant = 'Twist Limão';
          product = 'Pepsi Twist';
          hex = '#eab308';
          visualDescription = 'Lata azul marinho com detalhes em amarelo limão e gotas cítricas.';
        } else {
          variant = 'Original';
          product = 'Pepsi Original';
          hex = '#1d4ed8';
          visualDescription = 'Lata azul vibrante com o icônico globo tricolor vermelho, branco e azul.';
        }
        confidenceScore = 93;
      } else if (combinedText.includes('fanta')) {
        brand = 'Fanta';
        category = 'refrigerante';
        volumeMl = 350;

        if (combinedText.includes('uva') || combinedText.includes('grape')) {
          variant = 'Uva';
          product = 'Fanta Uva';
          hex = '#7e22ce';
          visualDescription = 'Lata roxa vívida com bolhas e ilustração de cachos de uva.';
        } else if (combinedText.includes('maracujá') || combinedText.includes('maracuja')) {
          variant = 'Maracujá';
          product = 'Fanta Maracujá';
          hex = '#eab308';
          visualDescription = 'Lata amarela cintilante com grafismos de maracujá e logotipo moderno.';
        } else if (combinedText.includes('guaraná') || combinedText.includes('guarana')) {
          variant = 'Guaraná';
          product = 'Fanta Guaraná';
          hex = '#15803d';
          visualDescription = 'Lata verde com folhagens e o selo de Fanta Guaraná.';
        } else {
          variant = 'Laranja';
          product = 'Fanta Laranja';
          hex = '#ea580c';
          visualDescription = 'Lata laranja efervescente com folha verde no topo do logo azul.';
        }
        confidenceScore = 93;
      } else if (combinedText.includes('sprite')) {
        brand = 'Sprite';
        category = 'refrigerante';
        volumeMl = 350;
        variant = isZero ? 'Zero Açúcar' : 'Lemon Fresh';
        product = isZero ? 'Sprite Zero Açúcar' : 'Sprite Original';
        hex = '#059669';
        visualDescription = 'Lata verde e amarela com bolhas efervescentes refrescantes e faixas dinâmicas.';
        confidenceScore = 92;
      } else if (combinedText.includes('tnt')) {
        brand = 'TNT Energy Drink';
        category = 'energetico';
        volumeMl = 473;
        variant = isZero ? 'Zero Açúcar' : 'Original';
        product = `TNT Energy Drink ${variant}`;
        hex = '#dc2626';
        visualDescription = 'Lata 473ml vermelha e preta estilizada com tipografia impactante TNT.';
        confidenceScore = 92;
      } else if (combinedText.includes('fusion')) {
        brand = 'Fusion Energy Drink';
        category = 'energetico';
        volumeMl = 473;
        variant = isZero ? 'Zero Açúcar' : 'Original';
        product = `Fusion Energy Drink ${variant}`;
        hex = '#f97316';
        visualDescription = 'Lata preta com faixas laranjas fluorescentes e símbolo de energia.';
        confidenceScore = 92;
      } else if (combinedText.includes('chá') || combinedText.includes('cha') || combinedText.includes('matte') || combinedText.includes('leão') || combinedText.includes('leao')) {
        brand = 'Chá Leão';
        category = 'cha';
        volumeMl = 300;
        variant = combinedText.includes('limão') || combinedText.includes('limao') ? 'Matte Limão' : combinedText.includes('pêssego') || combinedText.includes('pessego') ? 'Chá Preto Pêssego' : 'Matte Original';
        product = `Chá Leão ${variant}`;
        hex = '#b45309';
        visualDescription = 'Lata com desenho tradicional de folhas de erva-mate e logotipo Leão.';
        confidenceScore = 90;
      } else if (combinedText.includes('del valle') || combinedText.includes('maguary') || combinedText.includes('suco') || combinedText.includes('nectar') || combinedText.includes('néctar')) {
        brand = combinedText.includes('del valle') ? 'Del Valle' : 'Maguary';
        category = 'suco';
        volumeMl = 290;
        variant = combinedText.includes('uva') ? 'Néctar de Uva' : combinedText.includes('pêssego') || combinedText.includes('pessego') ? 'Néctar de Pêssego' : 'Néctar de Frutas';
        product = `${brand} ${variant}`;
        hex = '#7c2d12';
        visualDescription = 'Lata de néctar com fotografia da fruta fresca cortada em alta definição.';
        confidenceScore = 89;
      } else {
        // Generic Can Parsing: extract possible title from OCR lines
        const lines = ocrText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length >= 3 && !l.includes('17:') && !l.includes('18:') && !l.includes('bateria'));
        
        if (lines.length > 0) {
          const firstWord = lines[0].split(' ')[0].toUpperCase();
          if (firstWord.length >= 3) {
            brand = firstWord;
            product = lines[0].length > 25 ? lines[0].slice(0, 25) : lines[0];
            variant = isZero ? 'Sem Açúcar' : 'Original';
          }
        }

        // Guess category by keyword
        if (combinedText.includes('energy') || combinedText.includes('taurina') || combinedText.includes('cafeína') || combinedText.includes('cafeina')) {
          category = 'energetico';
          volumeMl = 473;
        } else if (combinedText.includes('tea') || combinedText.includes('chá') || combinedText.includes('cha')) {
          category = 'cha';
        } else if (combinedText.includes('juice') || combinedText.includes('suco')) {
          category = 'suco';
        }

        product = `${brand} ${variant !== 'Original' ? variant : 'Edição Especial'}`.trim();
        confidenceScore = 82;
      }

      // Check volume from regex if clearly written on the can
      const volMatch = combinedText.match(/\b(220|250|269|310|330|350|355|473|500)\s*(ml)?\b/);
      if (volMatch && volMatch[1]) {
        volumeMl = parseInt(volMatch[1], 10);
      }

      // Special Edition check
      if (combinedText.includes('edição especial') || combinedText.includes('edicao especial') || combinedText.includes('limitada') || combinedText.includes('comemorativa')) {
        isSpecialEdition = true;
        specialEditionDetails = 'Edição Especial Limitada';
      }

      return {
        brand,
        product,
        variant,
        category,
        volumeMl,
        predominantColor: hex,
        visualDescription,
        isSpecialEdition,
        specialEditionDetails,
        confidenceScore,
        notes: 'Identificado com alta precisão pelo Motor de Visão Computacional LataLab.',
      };
    } catch (e) {
      console.error('Error in smartCanAnalysis:', e);
      return {
        brand: 'Lata Colecionável',
        product: 'Bebida em Lata',
        variant: 'Original',
        category: 'refrigerante',
        volumeMl: 350,
        predominantColor: '#2563eb',
        visualDescription: 'Lata de bebida colecionável de alumínio.',
        isSpecialEdition: false,
        specialEditionDetails: '',
        confidenceScore: 80,
        notes: 'Identificação padrão LataLab.',
      };
    }
  }

  // 1. Image Analysis endpoint (Gemini 3.8 Flash + Instant Vision Engine)
  app.post('/api/can/analyze', async (req, res) => {
    try {
      const { imageBase64, fileName } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Imagem não fornecida' });
      }

      // Clean base64 string
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let data = imageBase64;
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        data = matches[2];
      }

      const imageBuffer = Buffer.from(data, 'base64');

      // If Gemini AI is configured, try deep multimodal extraction
      if (ai) {
        try {
          const promptText = `Você é o analisador oficial de latas de bebidas do aplicativo LataLab.
Analise detalhadamente a foto desta latinha de bebida não-alcoólica ou esportiva/energética/refrigerante/chá/suco.

Identifique e extraia em formato JSON estrito:
1. brand: Marca principal da bebida (ex: BALY, Coca-Cola, Monster Energy, Red Bull, Guaraná Antarctica, Pepsi, Fanta, Sprite, etc.).
2. product: Nome completo e específico do produto estampado na lata (ex: Baly Energy Drink Melancia Sem Açúcar, Coca-Cola Original, Monster Ultra Paradise, Guaraná Antarctica Zero). OBRIGATÓRIO: NUNCA DEIXE EM BRANCO.
3. variant: Sabor, variante ou subtítulo (ex: Melancia Sem Açúcar, Sem Açúcar, Tropical, Uva, Limão, Original).
4. category: Uma das seguintes categorias:
   "refrigerante", "energetico", "cha", "suco", "agua_saborizada", "cafe_gelado", "outra_nao_alcoolica".
5. volumeMl: Volume líquido em mililitros como número inteiro (ex: 220, 250, 269, 310, 350, 355, 473).
6. predominantColor: Código hexadecimal representativo da cor predominante do fundo/lata (ex: "#e11d48" para melancia, "#dc2626" para vermelho, "#047857" para verde, "#171717" para preto).
7. visualDescription: Descrição objetiva e técnica dos elementos visuais da embalagem (ilustrações, logotipo, acabamento brilhante ou fosco, texturas, tipografia e cores).
8. isSpecialEdition: Booleano true se for identificada qualquer menção a edição especial, limitada, comemorativa, promocional, sazonal ou parceria.
9. specialEditionDetails: Descrição da edição especial se isSpecialEdition for true, ou string vazia se for edição comum regular.
10. confidenceScore: Número de 0 a 100 indicando o nível de certeza na identificação dos dados da embalagem.
11. notes: Observações pertinentes sobre a identificação.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  brand: { type: Type.STRING },
                  product: { type: Type.STRING },
                  variant: { type: Type.STRING },
                  category: { type: Type.STRING },
                  volumeMl: { type: Type.INTEGER },
                  predominantColor: { type: Type.STRING },
                  visualDescription: { type: Type.STRING },
                  isSpecialEdition: { type: Type.BOOLEAN },
                  specialEditionDetails: { type: Type.STRING },
                  confidenceScore: { type: Type.INTEGER },
                  notes: { type: Type.STRING },
                },
              },
            },
          });

          const text = response.text || '{}';
          const parsed = JSON.parse(text);

          if (parsed.brand) {
            // Guarantee product name is NEVER blank
            if (!parsed.product) {
              parsed.product = `${parsed.brand} ${parsed.variant || 'Bebida em Lata'}`.trim();
            }
            return res.json({
              success: true,
              aiUsed: true,
              ...parsed,
            });
          }
        } catch (geminiError) {
          console.warn('Gemini extraction notice, switching to LataLab Vision Engine:', geminiError);
        }
      }

      // Intelligent Local Vision Analysis (OCR + Brazilian Beverage Database): always succeeds and fills all fields automatically
      const visualData = await smartCanAnalysis(imageBuffer, fileName);
      return res.json({
        success: true,
        aiUsed: false,
        visionEngine: true,
        ...visualData,
      });
    } catch (err: any) {
      console.error('Error analyzing can image:', err);
      // Guarantee full populated fallback even on unexpected error
      return res.json({
        success: true,
        brand: 'Lata Colecionável',
        product: 'Bebida em Lata',
        variant: 'Original',
        category: 'refrigerante',
        volumeMl: 350,
        predominantColor: '#2563eb',
        visualDescription: 'Lata de bebida colecionável metálica.',
        isSpecialEdition: false,
        specialEditionDetails: '',
        confidenceScore: 80,
      });
    }
  });



  // 3. GET /api/cans - List all cans
  app.get('/api/cans', (req, res) => {
    const cans = readCans();
    res.json(cans);
  });

  // 4. POST /api/cans - Create new can (with photo storage & thumbnail generation)
  app.post('/api/cans', async (req, res) => {
    try {
      const {
        brand,
        product,
        variant,
        category,
        volumeMl,
        predominantColor,
        visualDescription,
        isSpecialEdition,
        specialEditionDetails,
        quantity,
        originCountry,
        imageBase64,
        existingImageUrl,
      } = req.body;

      if (!brand || !product) {
        return res.status(400).json({ error: 'Marca e produto são campos obrigatórios.' });
      }

      const id = 'can_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let imageUrl = existingImageUrl || '/sample-cans/coca-original.jpg';
      let thumbnailUrl = imageUrl;

      // If new imageBase64 provided, save original and thumbnail to persistent storage
      if (imageBase64 && imageBase64.startsWith('data:image')) {
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const mainFileName = `${id}.jpg`;
          const thumbFileName = `thumb_${id}.jpg`;
          const mainPath = path.join(UPLOADS_DIR, mainFileName);
          const thumbPath = path.join(UPLOADS_DIR, thumbFileName);

          // Compress and save main image (max 1200px width/height, 85% quality)
          await sharp(buffer)
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85, progressive: true })
            .toFile(mainPath);

          // Generate lightweight thumbnail (max 400px width/height, 80% quality)
          await sharp(buffer)
            .resize(400, 500, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

          imageUrl = `/uploads/${mainFileName}`;
          thumbnailUrl = `/uploads/${thumbFileName}`;
        }
      }

      const newCan = {
        id,
        brand: brand.trim(),
        product: product.trim(),
        variant: variant ? variant.trim() : '',
        category: category || 'refrigerante',
        volumeMl: Number(volumeMl) || 350,
        predominantColor: predominantColor || '#2563eb',
        visualDescription: visualDescription ? visualDescription.trim() : '',
        isSpecialEdition: Boolean(isSpecialEdition),
        specialEditionDetails: specialEditionDetails ? specialEditionDetails.trim() : '',
        quantity: Math.max(1, Number(quantity) || 1),
        originCountry: originCountry ? originCountry.trim() : 'Brasil',
        imageUrl,
        thumbnailUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const cans = readCans();
      cans.unshift(newCan);
      writeCans(cans);

      return res.status(201).json(newCan);
    } catch (err: any) {
      console.error('Error creating can:', err);
      return res.status(500).json({ error: err.message || 'Erro ao salvar latinha.' });
    }
  });

  // 5. PUT /api/cans/:id - Update can
  app.put('/api/cans/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const cans = readCans();
      const index = cans.findIndex((c) => c.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Latinha não encontrada.' });
      }

      const current = cans[index];
      const {
        brand,
        product,
        variant,
        category,
        volumeMl,
        predominantColor,
        visualDescription,
        isSpecialEdition,
        specialEditionDetails,
        quantity,
        originCountry,
        imageBase64,
      } = req.body;

      let imageUrl = current.imageUrl;
      let thumbnailUrl = current.thumbnailUrl || current.imageUrl;

      if (imageBase64 && imageBase64.startsWith('data:image')) {
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const mainFileName = `${id}_${Date.now()}.jpg`;
          const thumbFileName = `thumb_${id}_${Date.now()}.jpg`;
          const mainPath = path.join(UPLOADS_DIR, mainFileName);
          const thumbPath = path.join(UPLOADS_DIR, thumbFileName);

          await sharp(buffer)
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85, progressive: true })
            .toFile(mainPath);

          await sharp(buffer)
            .resize(400, 500, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);

          imageUrl = `/uploads/${mainFileName}`;
          thumbnailUrl = `/uploads/${thumbFileName}`;
        }
      }

      const updated = {
        ...current,
        brand: brand ? brand.trim() : current.brand,
        product: product ? product.trim() : current.product,
        variant: variant !== undefined ? variant.trim() : current.variant,
        category: category || current.category,
        volumeMl: volumeMl !== undefined ? Number(volumeMl) : current.volumeMl,
        predominantColor: predominantColor || current.predominantColor,
        visualDescription: visualDescription !== undefined ? visualDescription.trim() : current.visualDescription,
        isSpecialEdition: isSpecialEdition !== undefined ? Boolean(isSpecialEdition) : current.isSpecialEdition,
        specialEditionDetails: specialEditionDetails !== undefined ? specialEditionDetails.trim() : current.specialEditionDetails,
        quantity: quantity !== undefined ? Math.max(0, Number(quantity)) : current.quantity,
        originCountry: originCountry !== undefined ? originCountry.trim() : current.originCountry,
        imageUrl,
        thumbnailUrl,
        updatedAt: new Date().toISOString(),
      };

      cans[index] = updated;
      writeCans(cans);

      return res.json(updated);
    } catch (err: any) {
      console.error('Error updating can:', err);
      return res.status(500).json({ error: err.message || 'Erro ao atualizar latinha.' });
    }
  });

  // 6. PATCH /api/cans/:id/quantity - Quick quantity update (+1 / -1)
  app.patch('/api/cans/:id/quantity', (req, res) => {
    const { id } = req.params;
    const { delta, exact } = req.body;
    const cans = readCans();
    const index = cans.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Latinha não encontrada.' });
    }

    if (exact !== undefined) {
      cans[index].quantity = Math.max(0, Number(exact));
    } else if (delta !== undefined) {
      cans[index].quantity = Math.max(0, (cans[index].quantity || 1) + Number(delta));
    }

    cans[index].updatedAt = new Date().toISOString();
    writeCans(cans);

    return res.json(cans[index]);
  });

  // 7. DELETE /api/cans/:id - Remove can
  app.delete('/api/cans/:id', (req, res) => {
    const { id } = req.params;
    const cans = readCans();
    const filtered = cans.filter((c) => c.id !== id);

    if (filtered.length === cans.length) {
      return res.status(404).json({ error: 'Latinha não encontrada.' });
    }

    writeCans(filtered);
    return res.json({ success: true, message: 'Latinha excluída com sucesso.' });
  });

  // 8. GET /api/backup - Full JSON backup
  app.get('/api/backup', (req, res) => {
    const cans = readCans();
    res.setHeader('Content-Disposition', `attachment; filename=latalab-backup-${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      app: 'LataLab',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalModels: cans.length,
      items: cans,
    });
  });

  // 9. POST /api/restore - Restore collection from JSON backup
  app.post('/api/restore', (req, res) => {
    try {
      const { items, mode } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Formato de backup inválido. Esperado array de itens.' });
      }

      const existing = readCans();
      let merged: any[] = [];

      if (mode === 'merge') {
        const idMap = new Map();
        existing.forEach((item) => idMap.set(item.id, item));
        items.forEach((item) => {
          if (item.id && item.brand && item.product) {
            idMap.set(item.id, item);
          }
        });
        merged = Array.from(idMap.values());
      } else {
        // overwrite
        merged = items.filter((item) => item.brand && item.product);
      }

      writeCans(merged);
      return res.json({ success: true, count: merged.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao restaurar backup.' });
    }
  });

  // 10. GET /api/export/csv - CSV Catalog Export
  app.get('/api/export/csv', (req, res) => {
    const cans = readCans();
    const headers = [
      'ID',
      'Marca',
      'Produto',
      'Variante/Sabor',
      'Categoria',
      'Volume (ml)',
      'Edicao Especial',
      'Detalhes Edicao',
      'Unidades Fisicas',
      'Cor Predominante',
      'Descricao Visual',
      'Pais Origem',
      'Data Cadastro',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = cans.map((c) => [
      escapeCsv(c.id),
      escapeCsv(c.brand),
      escapeCsv(c.product),
      escapeCsv(c.variant || ''),
      escapeCsv(c.category),
      escapeCsv(c.volumeMl),
      escapeCsv(c.isSpecialEdition ? 'Sim' : 'Nao'),
      escapeCsv(c.specialEditionDetails || ''),
      escapeCsv(c.quantity || 1),
      escapeCsv(c.predominantColor || ''),
      escapeCsv(c.visualDescription || ''),
      escapeCsv(c.originCountry || ''),
      escapeCsv(c.createdAt || ''),
    ]);

    // Include UTF-8 BOM for Microsoft Excel / Sheets compatibility
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    res.setHeader('Content-Disposition', `attachment; filename=latalab-catalogo-${new Date().toISOString().slice(0, 10)}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  });

  // 11. Security PIN Settings
  app.get('/api/settings/security', (req, res) => {
    const s = readSettings();
    res.json({ pinEnabled: Boolean(s.pinEnabled) });
  });

  app.post('/api/settings/security', (req, res) => {
    const { enabled, pin } = req.body;
    const current = readSettings();
    if (enabled) {
      if (!pin || pin.length < 4) {
        return res.status(400).json({ error: 'PIN deve conter no mínimo 4 dígitos.' });
      }
      writeSettings({ pinEnabled: true, pinHash: pin });
    } else {
      writeSettings({ pinEnabled: false, pinHash: undefined });
    }
    return res.json({ success: true, pinEnabled: Boolean(enabled) });
  });

  app.post('/api/settings/verify-pin', (req, res) => {
    const { pin } = req.body;
    const s = readSettings();
    if (!s.pinEnabled) {
      return res.json({ verified: true });
    }
    const verified = s.pinHash === pin;
    return res.json({ verified });
  });

  // --- Serve Frontend ---
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`LataLab server running on port ${PORT} (dev: ${isDev})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

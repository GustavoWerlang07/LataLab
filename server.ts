import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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
const aiApiKey = process.env.GEMINI_API_KEY || '';
const ai = aiApiKey
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
      configured: Boolean(aiApiKey && aiApiKey !== 'MY_GEMINI_API_KEY'),
      model: 'gemini-3.8-flash',
    });
  });

  // 1. Image Analysis endpoint (Gemini 3.8 Flash)
  app.post('/api/can/analyze', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Imagem não fornecida' });
      }

      if (!ai) {
        return res.status(503).json({
          success: false,
          error: 'Chave do Gemini API não configurada no servidor. É possível realizar o cadastro manual.',
          aiUnavailable: true,
        });
      }

      // Clean base64 string
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let data = imageBase64;
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        data = matches[2];
      }

      const promptText = `Você é o analisador oficial de latas de bebidas do aplicativo LataLab.
Analise detalhadamente a foto desta latinha de bebida não-alcoólica ou esportiva/energética/refrigerante/chá/suco.

Identifique e extraia em formato JSON estrito:
1. brand: Marca principal da bebida (ex: Coca-Cola, Pepsi, Guaraná Antarctica, Red Bull, Monster Energy, Sprite, Fanta, etc.).
2. product: Nome específico do produto estampado na lata (ex: Coca-Cola Original, Monster Ultra Paradise, Guaraná Antarctica Zero).
3. variant: Sabor, variante ou subtítulo (ex: Sem Açúcar, Melancia, Tropical, Uva, Limão, Original).
4. category: Uma das seguintes categorias EXCLUSIVAMENTE não-alcoólicas:
   "refrigerante", "energetico", "cha", "suco", "agua_saborizada", "cafe_gelado", "outra_nao_alcoolica".
   (NUNCA classifique como bebida alcoólica. Se for cerveja ou bebida alcoólica, classifique como "outra_nao_alcoolica" ou ignore).
5. volumeMl: Volume líquido em mililitros como número inteiro (ex: 220, 269, 310, 350, 355, 473). Se não for visível, estime o padrão daquele formato.
6. predominantColor: Código hexadecimal representativo da cor predominante do fundo/lata (ex: "#dc2626" para vermelho, "#047857" para verde, "#171717" para preto).
7. visualDescription: Descrição objetiva e técnica dos elementos visuais da embalagem (ilustrações, logotipo, acabamento brilhante ou fosco, texturas, tipografia e cores).
8. isSpecialEdition: Booleano true se for identificada qualquer menção a edição especial, limitada, comemorativa, promocional, sazonal (Natal, Verão) ou parceria/patrocínio (Copa, Games, Artistas).
9. specialEditionDetails: Descrição da edição especial se isSpecialEdition for true, ou string vazia se for edição comum regular.
10. confidenceScore: Número de 0 a 100 indicando o nível de certeza na identificação dos dados da embalagem.
11. notes: Observações pertinentes ou alertas sobre nitidez da foto.`;

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

      return res.json({
        success: true,
        ...parsed,
      });
    } catch (err: any) {
      console.error('Error analyzing can image with Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Falha ao analisar a imagem da latinha.',
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

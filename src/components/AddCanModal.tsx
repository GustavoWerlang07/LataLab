import React, { useState, useRef, useEffect } from 'react';
import { CanCategory, CanItem } from '../types/can';
import { CATEGORY_LABELS, findPotentialDuplicates } from '../utils/logic';
import { 
  Camera, 
  Image as ImageIcon, 
  X, 
  AlertTriangle, 
  Check, 
  Loader2, 
  Award,
  RefreshCw,
  Plus,
  Minus,
  Tag,
  Layers,
  Droplet,
  Trash2
} from 'lucide-react';

interface AddCanModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCans: CanItem[];
  onSaveNewCan: (canData: any) => Promise<void>;
  onIncrementExistingQuantity: (id: string) => Promise<void>;
  initialPhotoBase64?: string;
  initialAnalysis?: any;
}

const POPULAR_BRANDS = [
  'BALY',
  'Monster',
  'Red Bull',
  'Coca-Cola',
  'Guaraná Antarctica',
  'Pepsi',
  'Fanta',
  'Sprite',
  'Heineken',
  'TNT',
];

const COMMON_VOLUMES = [269, 310, 350, 355, 473, 500];

const COLOR_SWATCHES = [
  { name: 'Vermelho', hex: '#dc2626' },
  { name: 'Melancia / Rosa', hex: '#f43f5e' },
  { name: 'Verde', hex: '#16a34a' },
  { name: 'Verde Escuro', hex: '#14532d' },
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Azul Escuro', hex: '#1e3a8a' },
  { name: 'Preto Grafite', hex: '#18181b' },
  { name: 'Amarelo Ouro', hex: '#eab308' },
  { name: 'Laranja', hex: '#ea580c' },
  { name: 'Roxo Uva', hex: '#9333ea' },
  { name: 'Prata / Alumínio', hex: '#94a3b8' },
  { name: 'Branco Neve', hex: '#f8fafc' },
];

export const AddCanModal: React.FC<AddCanModalProps> = ({
  isOpen,
  onClose,
  existingCans,
  onSaveNewCan,
  onIncrementExistingQuantity,
  initialPhotoBase64,
}) => {
  const [photoBase64, setPhotoBase64] = useState<string>(initialPhotoBase64 || '');
  
  // Form fields (100% direct manual input)
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [variant, setVariant] = useState('');
  const [category, setCategory] = useState<CanCategory>('energetico');
  const [volumeMl, setVolumeMl] = useState<number>(350);
  const [predominantColor, setPredominantColor] = useState('#f43f5e');
  const [visualDescription, setVisualDescription] = useState('');
  const [isSpecialEdition, setIsSpecialEdition] = useState(false);
  const [specialEditionDetails, setSpecialEditionDetails] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [originCountry, setOriginCountry] = useState('Brasil');

  // Duplicate warning states
  const [duplicateWarning, setDuplicateWarning] = useState<CanItem | null>(null);
  const [duplicateScore, setDuplicateScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPhotoBase64) {
      setPhotoBase64(initialPhotoBase64);
    }
  }, [initialPhotoBase64]);

  if (!isOpen) return null;

  // Ultra-safe client-side image compression: converts camera photos to ~100-150KB JPEG
  const compressImageFile = (file: File, maxDim = 1000, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = (e.target?.result as string) || '';
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawResult);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch {
            resolve(rawResult);
          }
        };
        img.onerror = () => resolve(rawResult);
        img.src = rawResult;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveErrorMessage(null);
    try {
      const compressedB64 = await compressImageFile(file, 1000, 0.8);
      if (compressedB64) {
        setPhotoBase64(compressedB64);
      }
    } catch (err) {
      console.warn('Compression notice:', err);
    }
  };

  const handleSelectQuickBrand = (selectedBrand: string) => {
    setBrand(selectedBrand);
    if (!product) {
      setProduct(`${selectedBrand}`);
    }
    // Smart category helper for common brands
    if (/baly|monster|red bull|tnt/i.test(selectedBrand)) {
      setCategory('energetico');
      if (selectedBrand === 'BALY') {
        setVolumeMl(473);
        setPredominantColor('#f43f5e'); // Melancia popular
      } else if (selectedBrand === 'Red Bull') {
        setVolumeMl(250);
        setPredominantColor('#1e3a8a');
      } else if (selectedBrand === 'Monster') {
        setVolumeMl(473);
        setPredominantColor('#18181b');
      }
    } else if (/coca|pepsi|guaran|fanta|sprite/i.test(selectedBrand)) {
      setCategory('refrigerante');
      setVolumeMl(350);
      if (/coca/i.test(selectedBrand)) setPredominantColor('#dc2626');
      if (/guaran/i.test(selectedBrand)) setPredominantColor('#16a34a');
      if (/fanta/i.test(selectedBrand)) setPredominantColor('#ea580c');
      if (/pepsi/i.test(selectedBrand)) setPredominantColor('#2563eb');
    }
  };

  const handleSubmit = async (overrideDuplicateCheck = false) => {
    setSaveErrorMessage(null);
    
    const finalBrand = (brand || '').trim() || 'Lata Colecionável';
    const finalVariant = (variant || '').trim();
    let finalProduct = (product || '').trim();
    if (!finalProduct) {
      finalProduct = finalVariant ? `${finalBrand} ${finalVariant}` : `${finalBrand} Original`;
    }

    // Check duplicate if not explicitly overridden
    if (!overrideDuplicateCheck && !duplicateWarning) {
      const matches = findPotentialDuplicates(
        { brand: finalBrand, product: finalProduct, variant: finalVariant, volumeMl },
        existingCans
      );
      if (matches.length > 0 && matches[0].score >= 70) {
        setDuplicateWarning(matches[0].item);
        setDuplicateScore(matches[0].score);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSaveNewCan({
        brand: finalBrand,
        product: finalProduct,
        variant: finalVariant,
        category,
        volumeMl: Number(volumeMl) || 350,
        predominantColor,
        visualDescription: (visualDescription || '').trim(),
        isSpecialEdition,
        specialEditionDetails: (specialEditionDetails || '').trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        originCountry: (originCountry || 'Brasil').trim(),
        imageBase64: photoBase64,
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar latinha:', err);
      setSaveErrorMessage(
        err?.message || 'Erro ao conectar ao acervo. Verifique os dados e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full transition-colors shadow-sm"
              style={{ backgroundColor: predominantColor }}
            />
            <h2 className="font-extrabold text-base text-white">Cadastrar Latinha</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Direct Manual Form */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* 1. PHOTO SECTION */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Foto da Embalagem
            </label>

            {!photoBase64 ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-slate-800/90 border border-blue-500/30 hover:border-blue-400 flex flex-col items-center justify-center gap-2 text-center group active:scale-98 transition shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/40 group-hover:scale-105 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">Tirar Foto</span>
                    <span className="text-[10px] text-slate-400">Câmera do celular</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 flex flex-col items-center justify-center gap-2 text-center group active:scale-98 transition shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center group-hover:scale-105 transition">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">Galeria</span>
                    <span className="text-[10px] text-slate-400">Escolher imagem</span>
                  </div>
                </button>
              </div>
            ) : (
              <div 
                className="relative rounded-2xl overflow-hidden bg-slate-950 border max-h-56 flex items-center justify-center transition-all shadow-inner"
                style={{ borderColor: predominantColor }}
              >
                <img
                  src={photoBase64}
                  alt="Foto da latinha"
                  className="max-h-56 w-full object-contain bg-slate-950/80"
                />

                {/* Photo Actions Overlay */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 flex items-center gap-1 shadow-lg active:scale-95 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoBase64('')}
                    className="p-1.5 rounded-full bg-rose-600/90 backdrop-blur-md text-white hover:bg-rose-500 shadow-lg active:scale-95 transition"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. MARCA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Marca <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Toque rápido ou digite</span>
            </div>

            {/* Quick Brand Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {POPULAR_BRANDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleSelectQuickBrand(b)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                    brand.toLowerCase() === b.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ex: BALY, Coca-Cola, Monster, Red Bull..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 3. NOME DO PRODUTO & SABOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome do Produto
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="ex: Baly Energy Drink Melancia"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Sabor ou Variante
              </label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="ex: Melancia Sem Açúcar, Original, Tropical..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 4. CATEGORIA */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_LABELS) as CanCategory[]).map((catKey) => {
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-600/25 border-blue-500 text-white shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{CATEGORY_LABELS[catKey]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. VOLUME (ML) & UNIDADES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Volume (ml)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_VOLUMES.map((vol) => (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => setVolumeMl(vol)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                      volumeMl === vol
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    {vol}ml
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10"
                max="2000"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value) || 350)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Unidades Físicas
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-xl text-white min-w-[2.5rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Quantidade de latas físicas iguais que você possui.
              </p>
            </div>
          </div>

          {/* 6. COR PREDOMINANTE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cor Predominante da Lata
              </label>
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                  style={{ backgroundColor: predominantColor }}
                />
                <span className="text-[11px] font-mono text-slate-400">{predominantColor}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setPredominantColor(swatch.hex)}
                  title={swatch.name}
                  className={`w-7 h-7 rounded-full transition-transform active:scale-90 border-2 ${
                    predominantColor.toLowerCase() === swatch.hex.toLowerCase()
                      ? 'scale-125 border-white shadow-lg'
                      : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}

              <label className="w-7 h-7 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center cursor-pointer hover:border-slate-400 relative overflow-hidden" title="Escolher cor personalizada">
                <input
                  type="color"
                  value={predominantColor}
                  onChange={(e) => setPredominantColor(e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <span className="text-[10px] font-bold text-slate-300">+</span>
              </label>
            </div>
          </div>

          {/* 7. EDIÇÃO ESPECIAL */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSpecialEdition}
                onChange={(e) => setIsSpecialEdition(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Edição Especial, Comemorativa ou Parceria
              </span>
            </label>

            {isSpecialEdition && (
              <input
                type="text"
                value={specialEditionDetails}
                onChange={(e) => setSpecialEditionDetails(e.target.value)}
                placeholder="ex: Copa do Mundo, Linha Verão, Collab 100 Anos..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* 8. OBSERVAÇÕES / DETALHES VISUAIS (OPCIONAL) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              rows={2}
              value={visualDescription}
              onChange={(e) => setVisualDescription(e.target.value)}
              placeholder="ex: Lata fosca, comprada no mercado, edição sem açúcar..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* DUPLICATE WARNING MODAL / CARD (if triggered) */}
          {duplicateWarning && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Atenção: Você já tem esta latinha no acervo! ({duplicateScore}% de similaridade)</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nova</span>
                  <p className="text-xs font-bold text-white line-clamp-1">{brand} {product}</p>
                  <p className="text-[10px] text-slate-400">{volumeMl} ml</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-amber-400 uppercase block mb-0.5">
                    No Acervo ({duplicateWarning.quantity} un.)
                  </span>
                  <p className="text-xs font-bold text-white line-clamp-1">{duplicateWarning.brand} {duplicateWarning.product}</p>
                  <p className="text-[10px] text-slate-400">{duplicateWarning.volumeMl} ml</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await onIncrementExistingQuantity(duplicateWarning.id);
                    onClose();
                  }}
                  className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  +1 na existente
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
                >
                  Salvar nova mesmo assim
                </button>
              </div>
            </div>
          )}

          {/* INLINE ERROR MESSAGE (if saving fails) */}
          {saveErrorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white">Não foi possível salvar</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{saveErrorMessage}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSaveErrorMessage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer - Primary Save Action */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/95 sticky bottom-0 z-10 backdrop-blur-md flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 transition active:scale-95"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSubmit(false)}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 font-extrabold text-sm text-white shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 border border-blue-400/30"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando latinha...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                Salvar Latinha no Acervo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

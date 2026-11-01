import React, { useState, useRef, useEffect } from 'react';
import { CanCategory, CanItem } from '../types/can';
import { CATEGORY_LABELS, findPotentialDuplicates } from '../utils/logic';
import { 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  X, 
  AlertTriangle, 
  Check, 
  Loader2, 
  Award,
  RefreshCw,
  Plus,
  Minus
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

export const AddCanModal: React.FC<AddCanModalProps> = ({
  isOpen,
  onClose,
  existingCans,
  onSaveNewCan,
  onIncrementExistingQuantity,
  initialPhotoBase64,
  initialAnalysis,
}) => {
  const [photoBase64, setPhotoBase64] = useState<string>(initialPhotoBase64 || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // Form states
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [variant, setVariant] = useState('');
  const [category, setCategory] = useState<CanCategory>('refrigerante');
  const [volumeMl, setVolumeMl] = useState<number>(350);
  const [predominantColor, setPredominantColor] = useState('#2563eb');
  const [visualDescription, setVisualDescription] = useState('');
  const [isSpecialEdition, setIsSpecialEdition] = useState(false);
  const [specialEditionDetails, setSpecialEditionDetails] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [originCountry, setOriginCountry] = useState('Brasil');

  // Duplicate warning states
  const [duplicateWarning, setDuplicateWarning] = useState<CanItem | null>(null);
  const [duplicateScore, setDuplicateScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPhotoBase64) {
      setPhotoBase64(initialPhotoBase64);
    }
    if (initialAnalysis) {
      populateFields(initialAnalysis);
    }
  }, [initialPhotoBase64, initialAnalysis]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setPhotoBase64(b64);
      analyzePhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const populateFields = (data: any) => {
    if (data.brand) setBrand(data.brand);
    if (data.product) setProduct(data.product);
    if (data.variant) setVariant(data.variant);
    if (data.category && data.category in CATEGORY_LABELS) {
      setCategory(data.category as CanCategory);
    }
    if (data.volumeMl) setVolumeMl(Number(data.volumeMl) || 350);
    if (data.predominantColor) setPredominantColor(data.predominantColor);
    if (data.visualDescription) setVisualDescription(data.visualDescription);
    if (data.isSpecialEdition !== undefined) setIsSpecialEdition(Boolean(data.isSpecialEdition));
    if (data.specialEditionDetails) setSpecialEditionDetails(data.specialEditionDetails);

    // Check potential duplicate immediately
    checkForPotentialDuplicates({
      brand: data.brand,
      product: data.product,
      variant: data.variant,
      volumeMl: data.volumeMl,
    });
  };

  const analyzePhoto = async (base64: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiUnavailable(false);

    try {
      const response = await fetch('/api/can/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.aiUnavailable) {
          setAiUnavailable(true);
        }
        setAnalysisError(data.error || 'Reconhecimento por IA indisponível. Preencha os campos manualmente.');
        return;
      }

      populateFields(data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError('Não foi possível conectar ao serviço de IA. Você pode preencher os dados manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkForPotentialDuplicates = (candidate: Partial<CanItem>) => {
    const matches = findPotentialDuplicates(candidate, existingCans);
    if (matches.length > 0 && matches[0].score >= 60) {
      setDuplicateWarning(matches[0].item);
      setDuplicateScore(matches[0].score);
    } else {
      setDuplicateWarning(null);
      setDuplicateScore(0);
    }
  };

  const handleSubmit = async (overrideDuplicateCheck = false) => {
    if (!brand.trim() || !product.trim()) {
      alert('Por favor, informe a marca e o nome do produto.');
      return;
    }

    // Check duplicate if not explicitly overridden
    if (!overrideDuplicateCheck && !duplicateWarning) {
      const matches = findPotentialDuplicates({ brand, product, variant, volumeMl }, existingCans);
      if (matches.length > 0 && matches[0].score >= 70) {
        setDuplicateWarning(matches[0].item);
        setDuplicateScore(matches[0].score);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSaveNewCan({
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
        imageBase64: photoBase64,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar latinha.');
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h2 className="font-extrabold text-base text-white">Cadastrar Nova Latinha</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Photo Selection / Camera trigger */}
          {!photoBase64 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-medium">
                Escolha como deseja registrar a fotografia da latinha:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-slate-800 border border-blue-500/30 hover:border-blue-400 flex flex-col items-center justify-center gap-2 text-center group active:scale-95 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Tirar foto</span>
                    <span className="text-[11px] text-slate-400">Câmera do celular</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 flex flex-col items-center justify-center gap-2 text-center group active:scale-95 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Galeria</span>
                    <span className="text-[11px] text-slate-400">Escolher arquivo</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-56 flex items-center justify-center group">
              <img
                src={photoBase64}
                alt="Foto da latinha"
                className="max-h-56 w-full object-contain"
              />

              {/* Laser scanning visual animation while AI is running */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-0 animate-bounce"></div>
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                  <p className="font-bold text-xs text-white">Analisando latinha com Gemini IA...</p>
                  <p className="text-[11px] text-cyan-200">Identificando marca, sabor, volume e edições</p>
                </div>
              )}

              {/* Change photo button */}
              {!isAnalyzing && (
                <button
                  onClick={() => {
                    setPhotoBase64('');
                    setDuplicateWarning(null);
                  }}
                  className="absolute bottom-2 right-2 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 flex items-center gap-1 shadow-lg"
                >
                  <RefreshCw className="w-3 h-3" />
                  Trocar foto
                </button>
              )}
            </div>
          )}

          {/* AI Banner / Status */}
          {isAnalyzing && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-xs text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
              <span>O preenchimento automático inteligente está em andamento...</span>
            </div>
          )}

          {analysisError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <p className="font-semibold">{analysisError}</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Você pode preencher e salvar todos os campos manualmente abaixo normalmente.
              </p>
            </div>
          )}

          {/* Duplicate Detected Warning Banner */}
          {duplicateWarning && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Atenção! Você pode já ter esta latinha</span>
              </div>
              <p className="text-xs text-slate-300">
                Encontramos no seu acervo uma embalagem com características muito parecidas ({duplicateScore}% de similaridade estimada):
              </p>

              {/* Side by side comparison */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Nova Foto
                  </span>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-900">
                    <img src={photoBase64} alt="Nova" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] font-bold text-white mt-1 line-clamp-1">{brand} {product}</p>
                  <p className="text-[10px] text-slate-400">{volumeMl} ml</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                    Já na Coleção ({duplicateWarning.quantity} un.)
                  </span>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 border border-amber-500/30">
                    <img
                      src={duplicateWarning.thumbnailUrl || duplicateWarning.imageUrl}
                      alt="Cadastrada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-white mt-1 line-clamp-1">
                    {duplicateWarning.brand} {duplicateWarning.product}
                  </p>
                  <p className="text-[10px] text-slate-400">{duplicateWarning.volumeMl} ml</p>
                </div>
              </div>

              {/* 3 User Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await onIncrementExistingQuantity(duplicateWarning.id);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Atualizar quantidade (+1 na lata existente)
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    className="py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                  >
                    Cadastrar como nova versão
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3.5">
            {/* Marca & Produto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="ex: Coca-Cola, Monster, Guaraná"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="ex: Original, Ultra Paradise, Zero"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sabor / Variante & Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sabor ou Variante
                </label>
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder="ex: Melancia, Sem Açúcar, Uva"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CanCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Volume & Quantidade Física */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Volume (ml)
                </label>
                <input
                  type="number"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(Number(e.target.value))}
                  placeholder="350"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unidades Físicas
                </label>
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center font-bold text-sm text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Edição Especial Toggle */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSpecialEdition}
                  onChange={(e) => setIsSpecialEdition(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Edição Especial, Comemorativa ou Promocional
                </span>
              </label>

              {isSpecialEdition && (
                <input
                  type="text"
                  value={specialEditionDetails}
                  onChange={(e) => setSpecialEditionDetails(e.target.value)}
                  placeholder="ex: Copa do Mundo, 100 Anos, Parceria Especial"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              )}
            </div>

            {/* Descrição Visual */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrição dos Elementos Visuais da Embalagem
              </label>
              <textarea
                rows={2}
                value={visualDescription}
                onChange={(e) => setVisualDescription(e.target.value)}
                placeholder="Logotipos, cores predominantes, acabamento fosco/metálico, ilustrações..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSaving || isAnalyzing}
            onClick={() => handleSubmit(false)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-xs text-white shadow-lg shadow-blue-900/30 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Salvar Latinha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

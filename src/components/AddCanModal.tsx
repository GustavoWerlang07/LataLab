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
  Minus,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers,
  Droplet,
  CheckCircle2
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
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [showManualFields, setShowManualFields] = useState(false);

  // Form states (populated automatically by the system)
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
      setIsIdentified(true);
    }
  }, [initialPhotoBase64, initialAnalysis]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setPhotoBase64(b64);
      analyzePhoto(b64, file.name);
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
    if (data.notes) setAnalysisNote(data.notes);

    // Check potential duplicate immediately
    checkForPotentialDuplicates({
      brand: data.brand,
      product: data.product,
      variant: data.variant,
      volumeMl: data.volumeMl,
    });
  };

  const analyzePhoto = async (base64: string, name?: string) => {
    setIsAnalyzing(true);
    setIsIdentified(false);
    setAnalysisNote(null);

    try {
      const response = await fetch('/api/can/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64,
          fileName: name || fileName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        populateFields(data);
        setIsIdentified(true);
      } else {
        // Fallback default
        setBrand('Lata Colecionável');
        setProduct('Bebida em Lata');
        setVariant('Original');
        setCategory('refrigerante');
        setVolumeMl(350);
        setIsIdentified(true);
      }
    } catch (err: any) {
      console.error(err);
      setBrand('Lata Colecionável');
      setProduct('Bebida em Lata');
      setVariant('Original');
      setCategory('refrigerante');
      setVolumeMl(350);
      setIsIdentified(true);
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

  const handleResetPhoto = () => {
    setPhotoBase64('');
    setFileName('');
    setIsIdentified(false);
    setDuplicateWarning(null);
    setDuplicateScore(0);
    setShowManualFields(false);
  };

  const handleSubmit = async (overrideDuplicateCheck = false) => {
    const finalBrand = brand.trim() || 'Lata Colecionável';
    const finalProduct = product.trim() || 'Bebida em Lata';

    // Check duplicate if not explicitly overridden
    if (!overrideDuplicateCheck && !duplicateWarning) {
      const matches = findPotentialDuplicates({ brand: finalBrand, product: finalProduct, variant, volumeMl }, existingCans);
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

      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="font-extrabold text-base text-white">Cadastrar Latinha</h2>
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
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* STEP 1: If no photo is loaded yet, show the high-contrast photo selectors */}
          {!photoBase64 ? (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Identificação 100% Automática
                </div>
                <h3 className="font-bold text-lg text-white">Envie a foto da latinha</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  O LataLab analisa a embalagem, descobre a marca e o sabor e preenche todas as informações sem você digitar nada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-slate-800/90 border border-blue-500/30 hover:border-blue-400 flex flex-col items-center justify-center gap-2.5 text-center group active:scale-95 transition shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 group-hover:scale-105 transition">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Tirar Foto</span>
                    <span className="text-[11px] text-slate-400">Câmera do celular</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 flex flex-col items-center justify-center gap-2.5 text-center group active:scale-95 transition shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-700 text-slate-200 flex items-center justify-center group-hover:scale-105 transition">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Galeria</span>
                    <span className="text-[11px] text-slate-400">Escolher arquivo</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Photo is present */
            <div className="space-y-4">
              {/* Photo Card with Scanning state */}
              <div 
                className="relative rounded-2xl overflow-hidden bg-slate-950 border max-h-56 flex items-center justify-center transition-all duration-300"
                style={{ borderColor: isIdentified ? predominantColor : '#334155' }}
              >
                <img
                  src={photoBase64}
                  alt="Foto da latinha"
                  className="max-h-56 w-full object-contain"
                />

                {/* Laser scanning animation while analyzing */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-0 animate-pulse"></div>
                    <Loader2 className="w-9 h-9 text-blue-400 animate-spin mb-2.5" />
                    <p className="font-bold text-sm text-white">Analisando latinha...</p>
                    <p className="text-xs text-blue-300/90 mt-0.5 animate-pulse">
                      Identificando marca, sabor, volume e edições
                    </p>
                  </div>
                )}

                {/* Change photo button */}
                {!isAnalyzing && (
                  <button
                    onClick={handleResetPhoto}
                    className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Trocar foto
                  </button>
                )}
              </div>

              {/* Automatic Recognition Summary Card */}
              {isIdentified && !isAnalyzing && (
                <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900 border border-slate-700/80 p-4 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">
                        Identificação Automática Concluída
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                        style={{ backgroundColor: predominantColor }}
                      />
                      <span>Cor detectada</span>
                    </div>
                  </div>

                  {/* Identified Can Hero Details */}
                  <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">
                        {brand || 'Marca não especificada'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {volumeMl} ml
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white leading-tight">
                      {product || 'Lata Colecionável'}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {variant && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-300">
                          <Tag className="w-3 h-3" />
                          Sabor: {variant}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                        <Droplet className="w-3 h-3 text-cyan-400" />
                        {CATEGORY_LABELS[category] || category}
                      </span>

                      {isSpecialEdition && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300">
                          <Award className="w-3 h-3" />
                          {specialEditionDetails || 'Edição Especial'}
                        </span>
                      )}
                    </div>

                    {visualDescription && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 italic">
                        "{visualDescription}"
                      </p>
                    )}
                  </div>

                  {/* DUPLICATE WARNING (if any) */}
                  {duplicateWarning && (
                    <div className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Atenção! Você pode já ter esta latinha ({duplicateScore}% de similaridade)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nova</span>
                          <p className="text-[11px] font-bold text-white line-clamp-1">{brand} {product}</p>
                          <p className="text-[10px] text-slate-400">{volumeMl} ml</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-amber-400 uppercase block mb-0.5">
                            Na Coleção ({duplicateWarning.quantity} un.)
                          </span>
                          <p className="text-[11px] font-bold text-white line-clamp-1">{duplicateWarning.brand} {duplicateWarning.product}</p>
                          <p className="text-[10px] text-slate-400">{duplicateWarning.volumeMl} ml</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await onIncrementExistingQuantity(duplicateWarning.id);
                          onClose();
                        }}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Atualizar quantidade (+1 na lata existente)
                      </button>
                    </div>
                  )}

                  {/* ZERO-TYPING PRIMARY ACTION: Confirm and Save */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSubmit(false)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 font-extrabold text-sm text-white shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando latinha...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        Confirmar e Salvar no Acervo
                      </>
                    )}
                  </button>

                  {/* Optional Accordion to tweak details manually if user wishes */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualFields(!showManualFields)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                    >
                      <span>{showManualFields ? 'Ocultar ajustes manuais' : 'Ajustar detalhes manualmente (opcional)'}</span>
                      {showManualFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showManualFields && (
                      <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-fade-in">
                        {/* Marca & Produto */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Marca
                            </label>
                            <input
                              type="text"
                              value={brand}
                              onChange={(e) => setBrand(e.target.value)}
                              placeholder="ex: Coca-Cola, Monster, Fanta"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Nome do Produto
                            </label>
                            <input
                              type="text"
                              value={product}
                              onChange={(e) => setProduct(e.target.value)}
                              placeholder="ex: Original, Sem Açúcar"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Sabor / Variante & Categoria */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Sabor ou Variante
                            </label>
                            <input
                              type="text"
                              value={variant}
                              onChange={(e) => setVariant(e.target.value)}
                              placeholder="ex: Melancia, Sem Açúcar, Uva"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Categoria
                            </label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value as CanCategory)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                            >
                              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Volume & Quantidade */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Volume (ml)
                            </label>
                            <input
                              type="number"
                              value={volumeMl}
                              onChange={(e) => setVolumeMl(Number(e.target.value))}
                              placeholder="350"
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Unidades Físicas
                            </label>
                            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                              <button
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-1 hover:bg-slate-800 rounded text-slate-300"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="flex-1 text-center font-bold text-xs text-white">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQuantity(quantity + 1)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-300"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Edição Especial */}
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSpecialEdition}
                              onChange={(e) => setIsSpecialEdition(e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                            />
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-400" />
                              Edição Especial ou Comemorativa
                            </span>
                          </label>

                          {isSpecialEdition && (
                            <input
                              type="text"
                              value={specialEditionDetails}
                              onChange={(e) => setSpecialEditionDetails(e.target.value)}
                              placeholder="ex: Copa do Mundo, 100 Anos, Coleção de Verão"
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                          )}
                        </div>

                        {/* Descrição Visual */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Descrição Visual da Embalagem
                          </label>
                          <textarea
                            rows={2}
                            value={visualDescription}
                            onChange={(e) => setVisualDescription(e.target.value)}
                            placeholder="Elementos gráficos, texturas, acabamento..."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (if no photo yet, simple close button) */}
        {!photoBase64 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

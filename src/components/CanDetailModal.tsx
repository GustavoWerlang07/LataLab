import React, { useState } from 'react';
import { CanCategory, CanItem } from '../types/can';
import { CATEGORY_LABELS } from '../utils/logic';
import { 
  X, 
  Award, 
  Trash2, 
  Edit3, 
  Plus, 
  Minus, 
  Calendar, 
  Globe, 
  Maximize2,
  ScanLine,
  Check,
  AlertTriangle
} from 'lucide-react';

interface CanDetailModalProps {
  can: CanItem | null;
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => Promise<void>;
  onEditCan: (can: CanItem) => Promise<void>;
  onDeleteCan: (id: string) => Promise<void>;
  isLocked?: boolean;
}

export const CanDetailModal: React.FC<CanDetailModalProps> = ({
  can,
  onClose,
  onUpdateQuantity,
  onEditCan,
  onDeleteCan,
  isLocked = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Edit states
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [variant, setVariant] = useState('');
  const [category, setCategory] = useState<CanCategory>('refrigerante');
  const [volumeMl, setVolumeMl] = useState<number>(350);
  const [visualDescription, setVisualDescription] = useState('');
  const [isSpecialEdition, setIsSpecialEdition] = useState(false);
  const [specialEditionDetails, setSpecialEditionDetails] = useState('');
  const [originCountry, setOriginCountry] = useState('Brasil');

  if (!can) return null;

  const startEdit = () => {
    setBrand(can.brand);
    setProduct(can.product);
    setVariant(can.variant || '');
    setCategory(can.category);
    setVolumeMl(can.volumeMl);
    setVisualDescription(can.visualDescription || '');
    setIsSpecialEdition(can.isSpecialEdition);
    setSpecialEditionDetails(can.specialEditionDetails || '');
    setOriginCountry(can.originCountry || 'Brasil');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await onEditCan({
      ...can,
      brand,
      product,
      variant,
      category,
      volumeMl,
      visualDescription,
      isSpecialEdition,
      specialEditionDetails,
      originCountry,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
              {can.brand}
            </span>
            <span className="text-xs text-slate-400">Detalhes do Modelo</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Large Photo Section with Zoom Trigger */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 max-h-72 flex items-center justify-center group">
            <img
              src={can.imageUrl}
              alt={`${can.brand} ${can.product}`}
              className="max-h-72 w-full object-contain cursor-zoom-in"
              onClick={() => setShowLightbox(true)}
            />

            <button
              onClick={() => setShowLightbox(true)}
              aria-label="Ampliar foto"
              className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700 hover:text-white flex items-center gap-1 shadow-lg text-xs"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Ampliar</span>
            </button>

            {can.isSpecialEdition && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                Edição Especial
              </span>
            )}
          </div>

          {!isEditing ? (
            /* View Details Mode */
            <div className="space-y-4">
              {/* Titles & Variant */}
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{can.product}</h2>
                {can.variant && (
                  <p className="text-sm font-semibold text-blue-400 mt-0.5">{can.variant}</p>
                )}
                {can.isSpecialEdition && can.specialEditionDetails && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{can.specialEditionDetails}</span>
                  </div>
                )}
              </div>

              {/* Physical Quantity Stepper Widget */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">
                    Unidades Físicas na Coleção
                  </span>
                  <span className="text-lg font-black text-white">
                    {can.quantity} {can.quantity === 1 ? 'lata física' : 'latas físicas'}
                  </span>
                </div>

                {!isLocked && (
                  <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                    <button
                      onClick={() => onUpdateQuantity(can.id, -1)}
                      aria-label="Diminuir unidade"
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center active:scale-95 transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-white">
                      {can.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(can.id, 1)}
                      aria-label="Aumentar unidade"
                      className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center active:scale-95 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Badges Info Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Volume</span>
                  <span className="font-bold text-white text-sm">{can.volumeMl} ml</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5">Categoria</span>
                  <span className="font-bold text-white text-sm">
                    {CATEGORY_LABELS[can.category] || can.category}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    Origem
                  </span>
                  <span className="font-bold text-white text-sm">{can.originCountry || 'Brasil'}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Cadastrada em
                  </span>
                  <span className="font-bold text-white text-sm">
                    {new Date(can.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Visual Packaging Description */}
              {can.visualDescription && (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                  <span className="text-xs font-bold text-slate-300 block">
                    Descrição Visual da Embalagem
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {can.visualDescription}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!isLocked && (
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    onClick={startEdit}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-900/30 flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar Dados
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Produto</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Variante / Sabor</label>
                  <input
                    type="text"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Volume (ml)</label>
                  <input
                    type="number"
                    value={volumeMl}
                    onChange={(e) => setVolumeMl(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CanCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Special Edition */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSpecialEdition}
                    onChange={(e) => setIsSpecialEdition(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-bold text-white flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Edição Especial / Comemorativa
                  </span>
                </label>
                {isSpecialEdition && (
                  <input
                    type="text"
                    value={specialEditionDetails}
                    onChange={(e) => setSpecialEditionDetails(e.target.value)}
                    placeholder="Detalhes da edição especial..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição Visual</label>
                <textarea
                  rows={3}
                  value={visualDescription}
                  onChange={(e) => setVisualDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Confirmar Exclusão</span>
              </div>
              <p className="text-xs text-slate-300">
                Tem certeza que deseja excluir esta latinha (<strong>{can.brand} {can.product}</strong>) da sua coleção? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onDeleteCan(can.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Zoom */}
      {showLightbox && (
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={can.imageUrl}
            alt={can.product}
            className="max-w-full max-h-[92vh] object-contain rounded-xl"
          />
        </div>
      )}
    </div>
  );
};

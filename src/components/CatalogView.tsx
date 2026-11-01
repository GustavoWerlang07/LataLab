import React, { useState } from 'react';
import { CanItem, CanCategory, SortOption } from '../types/can';
import { CATEGORY_LABELS } from '../utils/logic';
import { 
  Search, 
  Filter, 
  X, 
  Award, 
  ArrowUpDown, 
  Plus, 
  Minus,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

interface CatalogViewProps {
  cans: CanItem[];
  allBrands: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  brandFilter: string;
  onBrandFilterChange: (brand: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  volumeFilter: number | null;
  onVolumeFilterChange: (vol: number | null) => void;
  specialOnly: boolean;
  onSpecialOnlyChange: (special: boolean) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  onSelectCan: (can: CanItem) => void;
  onUpdateQuantity: (id: string, delta: number, e: React.MouseEvent) => void;
  onOpenAddCan: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  cans,
  allBrands,
  searchQuery,
  onSearchChange,
  brandFilter,
  onBrandFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  volumeFilter,
  onVolumeFilterChange,
  specialOnly,
  onSpecialOnlyChange,
  sortOption,
  onSortOptionChange,
  onSelectCan,
  onUpdateQuantity,
  onOpenAddCan,
}) => {
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const availableVolumes = [220, 250, 269, 310, 330, 350, 355, 473];

  const hasActiveFilters =
    brandFilter !== 'all' ||
    categoryFilter !== 'all' ||
    volumeFilter !== null ||
    specialOnly;

  const handleClearFilters = () => {
    onBrandFilterChange('all');
    onCategoryFilterChange('all');
    onVolumeFilterChange(null);
    onSpecialOnlyChange(false);
    onSearchChange('');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Title & Search bar */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Catálogo da Coleção</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {cans.length} {cans.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
        </p>
      </div>

      {/* Search Input & Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por marca, sabor, volume ou arte..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          aria-label="Abrir filtros"
          className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
            hasActiveFilters || showFiltersPanel
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Quick horizontal filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar select-none">
        {/* Special editions quick toggle */}
        <button
          onClick={() => onSpecialOnlyChange(!specialOnly)}
          className={`px-3 py-1.5 rounded-full font-semibold shrink-0 flex items-center gap-1 transition ${
            specialOnly
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Edições Especiais</span>
        </button>

        {/* Category Pills */}
        <button
          onClick={() => onCategoryFilterChange('all')}
          className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition ${
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          Todas categorias
        </button>

        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onCategoryFilterChange(key)}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition ${
              categoryFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expandable detailed filters panel */}
      {showFiltersPanel && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">Filtros avançados e ordenação</span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Filter by Brand */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Marca</label>
              <select
                value={brandFilter}
                onChange={(e) => onBrandFilterChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="all">Todas as marcas</option>
                {allBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Volume */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Volume</label>
              <select
                value={volumeFilter ?? ''}
                onChange={(e) => onVolumeFilterChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="">Todos os volumes</option>
                {availableVolumes.map((vol) => (
                  <option key={vol} value={vol}>
                    {vol} ml
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Ordenar por</label>
              <select
                value={sortOption}
                onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="alphabetical">Ordem alfabética (A-Z)</option>
                <option value="quantity">Mais unidades físicas</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Can Grid */}
      {cans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <p className="text-sm font-semibold text-slate-300">Nenhuma latinha encontrada.</p>
          <p className="text-xs text-slate-500">Tente ajustar seus filtros ou busca.</p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              Resetar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {cans.map((can) => (
            <div
              key={can.id}
              onClick={() => onSelectCan(can)}
              className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden hover:border-blue-500/40 transition-all shadow-lg flex flex-col justify-between active:scale-[0.98]"
            >
              {/* Photo Area */}
              <div className="relative aspect-[3/4] bg-gradient-to-b from-slate-950 to-slate-900/90 overflow-hidden flex items-center justify-center p-1.5">
                <img
                  src={can.thumbnailUrl || can.imageUrl}
                  alt={`${can.brand} ${can.product}`}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                  loading="lazy"
                />

                {/* Special Edition Badge */}
                {can.isSpecialEdition && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Award className="w-3 h-3 stroke-[2.5]" />
                    Especial
                  </span>
                )}

                {/* Volume badge */}
                <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700/60">
                  {can.volumeMl} ml
                </span>

                {/* Physical Units Stepper on Card */}
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="absolute bottom-2 right-2 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-full px-1 py-0.5 shadow-lg"
                >
                  <button
                    onClick={(e) => onUpdateQuantity(can.id, -1, e)}
                    aria-label="Diminuir unidade"
                    className="w-5 h-5 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300 active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-extrabold text-white px-1.5 min-w-[20px] text-center">
                    {can.quantity}
                  </span>
                  <button
                    onClick={(e) => onUpdateQuantity(can.id, 1, e)}
                    aria-label="Aumentar unidade"
                    className="w-5 h-5 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-300 active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Can Metadata */}
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  {can.brand}
                </span>
                <h3 className="font-bold text-xs text-white leading-snug line-clamp-1 mt-0.5">
                  {can.product}
                </h3>
                {can.variant && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {can.variant}
                  </p>
                )}
                {can.specialEditionDetails && (
                  <p className="text-[10px] text-amber-300/80 font-medium line-clamp-1 mt-1">
                    ★ {can.specialEditionDetails}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

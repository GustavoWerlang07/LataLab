import React from 'react';
import { CanItem, CollectionStats, BrandSummary } from '../types/can';
import { 
  Sparkles, 
  Layers, 
  Boxes, 
  Tag, 
  Grid, 
  Plus, 
  ScanLine, 
  ChevronRight, 
  Flame, 
  Award,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  stats: CollectionStats;
  brands: BrandSummary[];
  recentCans: CanItem[];
  onOpenAddCan: () => void;
  onSelectCan: (can: CanItem) => void;
  onSelectBrand: (brand: string) => void;
  onViewAllCans: () => void;
  onViewAllBrands: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  brands,
  recentCans,
  onOpenAddCan,
  onSelectCan,
  onSelectBrand,
  onViewAllCans,
  onViewAllBrands,
}) => {
  return (
    <div className="space-y-6 pb-24">
      {/* Hero Greeting */}
      <section className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Painel do Colecionador
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Minha coleção
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie suas embalagens, confira repetidas e expanda seu acervo com IA.
        </p>
      </section>

      {/* 4 Indicators / KPI Grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Modelos Únicos */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Modelos</span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.totalModels}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Versões únicas</p>
        </div>

        {/* Total Unidades Físicas */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Unidades</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.totalUnits}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Latas físicas</p>
        </div>

        {/* Total Marcas */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Marcas</span>
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.totalBrands}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fabricantes</p>
        </div>

        {/* Total Categorias */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Categorias</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Grid className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">{stats.totalCategories}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tipos de bebida</p>
        </div>
      </section>

      {/* Main Action Button */}
      <section>
        {/* Adicionar Latinha Button */}
        <button
          onClick={onOpenAddCan}
          aria-label="Adicionar latinha"
          className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/30 transition-all active:scale-[0.99] border border-blue-400/30 text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-md">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-base leading-tight">Adicionar latinha</p>
              <p className="text-xs text-blue-100/80 mt-0.5">Fotografe ou envie da galeria com identificação por IA</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Special Editions Highlight Card (if any exist) */}
      {stats.specialEditionsCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {stats.specialEditionsCount} {stats.specialEditionsCount === 1 ? 'Edição Especial cadastrada' : 'Edições Especiais cadastradas'}
              </p>
              <p className="text-[11px] text-amber-200/70">Itens comemorativos, promocionais ou parcerias raras</p>
            </div>
          </div>
          <button
            onClick={onViewAllCans}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Ver
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section: Adicionadas recentemente */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Adicionadas recentemente</h2>
          </div>
          <button
            onClick={onViewAllCans}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
          >
            Ver todas ({stats.totalModels})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCans.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-sm text-slate-400">Nenhuma latinha cadastrada ainda.</p>
            <button
              onClick={onOpenAddCan}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
            >
              Cadastrar primeira lata
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentCans.slice(0, 6).map((can) => (
              <div
                key={can.id}
                onClick={() => onSelectCan(can)}
                className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden hover:border-slate-700 transition shadow-lg flex flex-col active:scale-[0.98]"
              >
                {/* Photo container */}
                <div className="relative aspect-[3/4] bg-gradient-to-b from-slate-950 to-slate-900/90 overflow-hidden flex items-center justify-center p-1.5">
                  <img
                    src={can.thumbnailUrl || can.imageUrl}
                    alt={`${can.brand} ${can.product}`}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                    loading="lazy"
                  />
                  
                  {/* Badge Volume */}
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700/60">
                    {can.volumeMl} ml
                  </span>

                  {/* Badge Physical Quantity */}
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600/90 text-white shadow-md">
                    {can.quantity} un.
                  </span>

                  {/* Special edition star badge */}
                  {can.isSpecialEdition && (
                    <span className="absolute top-2 left-2 p-1 rounded-md bg-amber-500/90 text-slate-950 shadow-md">
                      <Award className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      {can.brand}
                    </span>
                    <h3 className="font-bold text-xs text-white leading-snug line-clamp-1 mt-0.5">
                      {can.product}
                    </h3>
                    {can.variant && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {can.variant}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section: Minhas marcas */}
      {brands.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Minhas marcas</h2>
            </div>
            <button
              onClick={onViewAllBrands}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
            >
              Ver todas ({brands.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {brands.slice(0, 6).map((b) => (
              <button
                key={b.brand}
                onClick={() => onSelectBrand(b.brand)}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/40 text-left transition active:scale-[0.98] group flex flex-col justify-between"
              >
                <div>
                  <p className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                    {b.brand}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      <strong className="text-white font-semibold">{b.modelCount}</strong> {b.modelCount === 1 ? 'modelo' : 'modelos'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">
                      <strong className="text-white font-semibold">{b.unitCount}</strong> un.
                    </span>
                  </div>
                </div>

                {/* Mini preview dots or thumbnails */}
                {b.previewImages.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    {b.previewImages.slice(0, 3).map((img, idx) => (
                      <div key={idx} className="w-6 h-8 rounded bg-slate-800 overflow-hidden border border-slate-700/60 shrink-0">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {b.modelCount > 3 && (
                      <span className="text-[10px] text-slate-500 font-bold ml-1">
                        +{b.modelCount - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

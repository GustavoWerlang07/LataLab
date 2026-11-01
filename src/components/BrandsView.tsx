import React from 'react';
import { BrandSummary, CanCategory, CanItem } from '../types/can';
import { CATEGORY_LABELS } from '../utils/logic';
import { Tag, Layers, Boxes, ChevronRight, Grid } from 'lucide-react';

interface BrandsViewProps {
  brands: BrandSummary[];
  allCans: CanItem[];
  onSelectBrand: (brand: string) => void;
  onSelectCategory: (category: CanCategory) => void;
}

export const BrandsView: React.FC<BrandsViewProps> = ({
  brands,
  allCans,
  onSelectBrand,
  onSelectCategory,
}) => {
  // Count models per non-alcoholic category
  const categoryCounts = Object.keys(CATEGORY_LABELS).map((catKey) => {
    const key = catKey as CanCategory;
    const matching = allCans.filter((c) => c.category === key);
    const modelCount = matching.length;
    const unitCount = matching.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0);
    return {
      category: key,
      label: CATEGORY_LABELS[key],
      modelCount,
      unitCount,
      preview: matching[0]?.thumbnailUrl || matching[0]?.imageUrl,
    };
  }).filter((c) => c.modelCount > 0);

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Marcas e Categorias</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Organização automática por fabricante e tipo de bebida não alcoólica.
        </p>
      </div>

      {/* Brands List Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            Marcas Cadastradas ({brands.length})
          </h2>
        </div>

        {brands.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">Nenhuma marca registrada ainda.</p>
            <p className="text-xs text-slate-500">
              As marcas serão agrupadas e organizadas automaticamente assim que você cadastrar suas primeiras latinhas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {brands.map((b) => (
              <button
                key={b.brand}
                onClick={() => onSelectBrand(b.brand)}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 text-left transition active:scale-[0.98] group flex flex-col justify-between shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-purple-300 transition-colors">
                      {b.brand}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <strong className="text-white">{b.modelCount}</strong> {b.modelCount === 1 ? 'modelo' : 'modelos'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                        <strong className="text-white">{b.unitCount}</strong> {b.unitCount === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Preview thumbnails */}
                {b.previewImages.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                    {b.previewImages.map((img, idx) => (
                      <div key={idx} className="w-10 h-14 rounded-lg bg-slate-950 overflow-hidden border border-slate-700/80 shrink-0">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <span className="text-[11px] font-bold text-slate-400 ml-auto">
                      Ver coleção →
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Categories Breakdown Section */}
      {categoryCounts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Categorias de Bebidas</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categoryCounts.map((cat) => (
              <button
                key={cat.category}
                onClick={() => onSelectCategory(cat.category)}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 text-left transition active:scale-[0.98] flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  {cat.preview ? (
                    <div className="w-10 h-12 rounded-lg bg-slate-950 overflow-hidden border border-slate-700 shrink-0">
                      <img src={cat.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <Grid className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                      {cat.label}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cat.modelCount} {cat.modelCount === 1 ? 'modelo' : 'modelos'} ({cat.unitCount} unidades)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

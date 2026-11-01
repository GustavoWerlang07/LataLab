import React from 'react';
import { LayoutDashboard, Layers, Plus, Tag } from 'lucide-react';

export type TabType = 'dashboard' | 'catalog' | 'brands';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAddCan: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddCan,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#090d16]/90 border-t border-slate-800/80 px-4 pt-2 pb-safe select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Início / Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label="Ir para tela inicial"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'dashboard'
              ? 'text-blue-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-1">Início</span>
        </button>

        {/* Coleção / Catálogo */}
        <button
          onClick={() => onSelectTab('catalog')}
          aria-label="Ir para catálogo da coleção"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'catalog'
              ? 'text-blue-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-1">Coleção</span>
        </button>

        {/* Adicionar Prominente (+) */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={onOpenAddCan}
            aria-label="Adicionar nova latinha"
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-95 hover:shadow-cyan-500/40 transition-all border-4 border-[#090d16]"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Marcas & Categorias */}
        <button
          onClick={() => onSelectTab('brands')}
          aria-label="Ir para marcas da coleção"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'brands'
              ? 'text-blue-400 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-1">Marcas</span>
        </button>
      </div>
    </nav>
  );
};

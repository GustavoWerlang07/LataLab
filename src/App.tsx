/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CanItem, CollectionStats, BrandSummary, SortOption, CanCategory } from './types/can';
import { calculateStats, groupBrands, filterCans } from './utils/logic';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { BrandsView } from './components/BrandsView';
import { AddCanModal } from './components/AddCanModal';
import { CanDetailModal } from './components/CanDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { Loader2, WifiOff } from 'lucide-react';
import {
  getLocalCans,
  saveLocalCans,
  addLocalCan,
  updateLocalCan,
  updateLocalQuantity,
  deleteLocalCan,
  syncCanWithServer,
} from './utils/storage';

export default function App() {
  const [cans, setCans] = useState<CanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // Catalog Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [volumeFilter, setVolumeFilter] = useState<number | null>(null);
  const [specialOnly, setSpecialOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedCan, setSelectedCan] = useState<CanItem | null>(null);

  // Security state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Network status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load from local storage first (instant, guaranteed to work everywhere)
    const local = getLocalCans();
    if (local && local.length > 0) {
      setCans(local);
    }

    fetchCans();
    fetchSecuritySettings();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchCans = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cans');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCans(data);
          saveLocalCans(data);
        }
      }
    } catch (err) {
      console.warn('Notice loading cans from server (local cache used):', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const res = await fetch('/api/settings/security');
      if (res.ok) {
        const data = await res.json();
        setPinEnabled(Boolean(data.pinEnabled));
        if (data.pinEnabled) {
          setIsLocked(true);
        }
      }
    } catch {
      // ignore
    }
  };

  // Memoized stats & grouped brands
  const stats: CollectionStats = useMemo(() => calculateStats(cans), [cans]);
  const brandsSummary: BrandSummary[] = useMemo(() => groupBrands(cans), [cans]);
  const allBrandNames = useMemo(() => Array.from(new Set(cans.map((c) => c.brand).filter(Boolean))), [cans]);

  // Filtered & sorted cans for Catalog
  const filteredCans = useMemo(() => {
    return filterCans(
      cans,
      searchQuery,
      brandFilter,
      categoryFilter,
      volumeFilter,
      specialOnly,
      sortOption
    );
  }, [cans, searchQuery, brandFilter, categoryFilter, volumeFilter, specialOnly, sortOption]);

  // Handlers for can actions (Client-First: Instant local persist + background sync)
  const handleSaveNewCan = async (canData: any) => {
    try {
      // 1. Immediately save to persistent local storage (guarantees 0% failure, works on Vercel and offline)
      const saved = addLocalCan(canData);
      setCans((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)]);

      // 2. Sync with backend in background (gracefully ignores 404 on static hosts)
      syncCanWithServer(saved, true).catch(() => {});
    } catch (err: any) {
      console.error('Erro ao salvar latinha:', err);
      throw err;
    }
  };

  const handleEditCan = async (updatedCan: CanItem) => {
    updateLocalCan(updatedCan.id, updatedCan);
    setCans((prev) => prev.map((c) => (c.id === updatedCan.id ? updatedCan : c)));
    if (selectedCan?.id === updatedCan.id) {
      setSelectedCan(updatedCan);
    }
    syncCanWithServer(updatedCan, false).catch(() => {});
  };

  const handleUpdateQuantity = async (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const updated = updateLocalQuantity(id, delta);
    if (updated) {
      setCans((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (selectedCan?.id === id) {
        setSelectedCan(updated);
      }
      // Background server sync
      fetch(`/api/cans/${id}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      }).catch(() => {});
    }
  };

  const handleDeleteCan = async (id: string) => {
    deleteLocalCan(id);
    setCans((prev) => prev.filter((c) => c.id !== id));
    if (selectedCan?.id === id) {
      setSelectedCan(null);
    }
    fetch(`/api/cans/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Quick navigation helpers
  const handleSelectBrandFilter = (brand: string) => {
    setBrandFilter(brand);
    setCurrentTab('catalog');
  };

  const handleSelectCategoryFilter = (cat: CanCategory) => {
    setCategoryFilter(cat);
    setCurrentTab('catalog');
  };

  const handleUpdateSecuritySettings = async (enabled: boolean, pin?: string) => {
    const res = await fetch('/api/settings/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, pin }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar PIN.');
    setPinEnabled(enabled);
    setIsLocked(enabled);
  };

  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    const res = await fetch('/api/settings/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.verified);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500/90 text-slate-950 font-bold text-xs py-1.5 px-4 text-center flex items-center justify-center gap-1.5 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline — exibindo dados salvos localmente.</span>
        </div>
      )}

      {/* iOS Translucent Header */}
      <Header
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isLocked={isLocked}
        pinEnabled={pinEnabled}
        onToggleLock={() => {
          if (isLocked) {
            setIsSettingsModalOpen(true);
          } else {
            setIsLocked(true);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-4 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Carregando acervo do LataLab...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                brands={brandsSummary}
                recentCans={cans}
                onOpenAddCan={() => setIsAddModalOpen(true)}
                onSelectCan={(can) => setSelectedCan(can)}
                onSelectBrand={handleSelectBrandFilter}
                onViewAllCans={() => {
                  setBrandFilter('all');
                  setCategoryFilter('all');
                  setSpecialOnly(false);
                  setCurrentTab('catalog');
                }}
                onViewAllBrands={() => setCurrentTab('brands')}
              />
            )}

            {currentTab === 'catalog' && (
              <CatalogView
                cans={filteredCans}
                allBrands={allBrandNames}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                brandFilter={brandFilter}
                onBrandFilterChange={setBrandFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                volumeFilter={volumeFilter}
                onVolumeFilterChange={setVolumeFilter}
                specialOnly={specialOnly}
                onSpecialOnlyChange={setSpecialOnly}
                sortOption={sortOption}
                onSortOptionChange={setSortOption}
                onSelectCan={(can) => setSelectedCan(can)}
                onUpdateQuantity={handleUpdateQuantity}
                onOpenAddCan={() => setIsAddModalOpen(true)}
              />
            )}

            {currentTab === 'brands' && (
              <BrandsView
                brands={brandsSummary}
                allCans={cans}
                onSelectBrand={handleSelectBrandFilter}
                onSelectCategory={handleSelectCategoryFilter}
              />
            )}
          </>
        )}
      </main>

      {/* iOS Style Frosted Bottom Dock */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddCan={() => setIsAddModalOpen(true)}
      />

      {/* Modal: Smart Add Can */}
      <AddCanModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingCans={cans}
        onSaveNewCan={handleSaveNewCan}
        onIncrementExistingQuantity={async (id) => {
          await handleUpdateQuantity(id, 1);
        }}
      />

      {/* Modal: Can Details */}
      <CanDetailModal
        can={selectedCan}
        onClose={() => setSelectedCan(null)}
        onUpdateQuantity={(id, delta) => handleUpdateQuantity(id, delta)}
        onEditCan={handleEditCan}
        onDeleteCan={handleDeleteCan}
        isLocked={isLocked}
      />

      {/* Modal: Settings & Export & Deploy guide */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        pinEnabled={pinEnabled}
        isLocked={isLocked}
        onUpdateSecuritySettings={handleUpdateSecuritySettings}
        onVerifyPin={handleVerifyPin}
        onUnlock={() => setIsLocked(false)}
        onLock={() => setIsLocked(true)}
        totalModels={cans.length}
        onRefreshCollection={fetchCans}
      />
    </div>
  );
}

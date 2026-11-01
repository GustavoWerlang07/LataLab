import React from 'react';
import { Settings, Lock, Unlock } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenSettings: () => void;
  isLocked: boolean;
  pinEnabled: boolean;
  onToggleLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isLocked,
  pinEnabled,
  onToggleLock,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#090d16]/85 border-b border-slate-800/80 px-4 py-3 transition-colors">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-0.5 shadow-md shadow-blue-900/30 flex items-center justify-center shrink-0">
            <img src="/icon.svg" alt="LataLab" className="w-full h-full rounded-[10px] object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">LataLab</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">Minha Coleção</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Security Lock if PIN enabled */}
          {pinEnabled && (
            <button
              onClick={onToggleLock}
              aria-label={isLocked ? 'Coleção bloqueada' : 'Coleção desbloqueada'}
              className={`p-2 rounded-full border transition active:scale-95 ${
                isLocked
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          {/* Settings & Export Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Configurações e exportação"
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 transition active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

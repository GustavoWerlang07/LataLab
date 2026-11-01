import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed on iOS or Android/Desktop)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback for browsers without beforeinstallprompt
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Instalar aplicativo na tela de início"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition shadow-sm active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-blue-400" />
        <span>Instalar App</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              aria-label="Fechar guia de instalação"
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-lg">
                <img src="/pwa-192x192.png" alt="LataLab" className="w-10 h-10 rounded-lg object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Instalar o LataLab</h3>
                <p className="text-xs text-slate-400">Funciona como app nativo no iPhone</p>
              </div>
            </div>

            <div className="space-y-3.5 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">1. Toque em Compartilhar</p>
                  <p className="text-xs text-slate-400 mt-0.5">No menu inferior do Safari do iPhone, toque no botão de compartilhar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-white text-xs">2. Adicionar à Tela de Início</p>
                  <p className="text-xs text-slate-400 mt-0.5">Role as opções para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white text-sm transition shadow-lg shadow-blue-900/30 active:scale-98"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

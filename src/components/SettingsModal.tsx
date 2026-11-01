import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Lock, 
  Unlock, 
  Server, 
  Check, 
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinEnabled: boolean;
  isLocked: boolean;
  onUpdateSecuritySettings: (enabled: boolean, pin?: string) => Promise<void>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onUnlock: () => void;
  onLock: () => void;
  totalModels: number;
  onRefreshCollection: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  pinEnabled,
  isLocked,
  onUpdateSecuritySettings,
  onVerifyPin,
  onUnlock,
  onLock,
  totalModels,
  onRefreshCollection,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'security' | 'deploy'>('backup');
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    window.location.href = '/api/backup';
  };

  const handleExportCsv = () => {
    window.location.href = '/api/export/csv';
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsRestoring(true);
        setErrorMessage(null);
        setStatusMessage(null);

        const parsed = JSON.parse(reader.result as string);
        const items = parsed.items || (Array.isArray(parsed) ? parsed : null);

        if (!items || !Array.isArray(items)) {
          throw new Error('Arquivo JSON inválido. Não contém lista de latinhas.');
        }

        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, mode: 'merge' }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao restaurar');

        await onRefreshCollection();
        setStatusMessage(`Backup restaurado com sucesso! ${data.count} itens sincronizados.`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao importar backup');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const handleTogglePin = async (enable: boolean) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      if (enable) {
        if (!newPin || newPin.length < 4) {
          setErrorMessage('Digite um PIN com pelo menos 4 dígitos numéricos.');
          return;
        }
        await onUpdateSecuritySettings(true, newPin);
        setNewPin('');
        setStatusMessage('PIN de proteção ativado com sucesso!');
      } else {
        await onUpdateSecuritySettings(false);
        setStatusMessage('Proteção por PIN desativada.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao atualizar segurança.');
    }
  };

  const handleUnlockCollection = async () => {
    const verified = await onVerifyPin(pinInput);
    if (verified) {
      onUnlock();
      setPinInput('');
      setStatusMessage('Coleção desbloqueada para edição!');
    } else {
      setErrorMessage('PIN incorreto. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Hidden file input for JSON import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        onChange={handleImportJson}
        className="hidden"
      />

      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="font-extrabold text-base text-white">Configurações & Backup</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 px-5 pt-2 bg-slate-900 select-none">
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Exportar & Backup
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Segurança & PIN
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'deploy'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guia Vercel / Supabase
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm block">Exportar Coleção</span>
                <p className="text-slate-400">
                  Gere cópias seguras do seu acervo para restaurar em caso de troca de aparelho ou novo deploy.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={handleExportJson}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2 font-bold text-white transition active:scale-95"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Backup Completo (JSON)</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2 font-bold text-white transition active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Catálogo (CSV / Excel)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm block">Restaurar Backup</span>
                <p className="text-slate-400">
                  Selecione um arquivo JSON de backup do LataLab para importar suas latinhas.
                </p>

                <button
                  disabled={isRestoring}
                  onClick={() => importFileRef.current?.click()}
                  className="w-full p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isRestoring ? 'Restaurando...' : 'Carregar arquivo JSON'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Bloqueio por PIN</span>
                    <p className="text-slate-400 mt-0.5">
                      Evita que terceiros ou convidados adicionem, alterem ou excluam itens da sua coleção.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                </div>

                {pinEnabled ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Lock className="w-4 h-4" />
                        <span>PIN Pessoal Ativo</span>
                      </div>
                      <button
                        onClick={() => handleTogglePin(false)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700 font-semibold"
                      >
                        Desativar PIN
                      </button>
                    </div>

                    {isLocked ? (
                      <div className="p-3 rounded-xl bg-slate-800 space-y-2">
                        <span className="font-semibold text-white block">Desbloquear para Edição</span>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="Digite seu PIN"
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                          />
                          <button
                            onClick={handleUnlockCollection}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white"
                          >
                            Desbloquear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={onLock}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700"
                      >
                        Bloquear Coleção Agora
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <label className="block text-slate-300 font-semibold">Defina um PIN pessoal (4 a 6 dígitos):</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="ex: 1234"
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                      />
                      <button
                        onClick={() => handleTogglePin(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shrink-0"
                      >
                        Ativar PIN
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <span className="font-bold text-white text-sm block">Instruções de Hospedagem (Vercel & Supabase)</span>
                <p>
                  O <strong>LataLab</strong> foi projetado para rodar com zero atrito tanto em contêiner/Node quanto com serviços em nuvem como Vercel e Supabase.
                </p>

                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-blue-400">1. Variáveis de Ambiente Necessárias:</h4>
                  <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                    {`# Chave do Gemini para reconhecimento por IA
GEMINI_API_KEY="sua_chave_gemini"

# (Opcional) Supabase para banco de dados relacional e storage em nuvem
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_KEY="sua_chave_anon_ou_service"`}
                  </pre>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-blue-400">2. Publicação na Vercel:</h4>
                  <p className="text-slate-400">
                    Conecte seu repositório no dashboard da Vercel. Adicione a variável <code>GEMINI_API_KEY</code> nas configurações de Environment Variables. O build do Vite e o runtime Express/Serverless estão pré-configurados.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="font-bold text-blue-400">3. Persistência de Dados:</h4>
                  <p className="text-slate-400">
                    Todas as fotografias são salvas e otimizadas em miniaturas no armazenamento persistente. Utilize sempre a aba <strong>"Exportar & Backup"</strong> para baixar o arquivo JSON completo e garantir a integridade da sua coleção antes de grandes migrações.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

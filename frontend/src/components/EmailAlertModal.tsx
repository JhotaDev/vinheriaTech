import React, { useState } from 'react';
import { Mail, Check, AlertCircle, Send, X, ShieldAlert, Sparkles } from 'lucide-react';

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  severity: string;
  temp: number;
  status: 'ENVIADO' | 'PENDENTE' | 'ERRO';
}

interface EmailAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  onUpdateRecipientEmail: (email: string) => void;
  emailLogs: EmailLogEntry[];
  onTriggerTestEmail: () => void;
}

export const EmailAlertModal: React.FC<EmailAlertModalProps> = ({
  isOpen,
  onClose,
  recipientEmail,
  onUpdateRecipientEmail,
  emailLogs,
  onTriggerTestEmail
}) => {
  const [emailInput, setEmailInput] = useState(recipientEmail);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRecipientEmail(emailInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#140810] border border-rose-900/40 rounded-2xl p-6 shadow-2xl overflow-hidden text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                NOTIFICAÇÕES DE EMERGÊNCIA POR E-MAIL
                <span className="text-[10px] font-mono font-bold bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800/40">
                  ALERTA EXTREMO
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Disparo automatizado de e-mails críticos para o enólogo e equipe de manutenção.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-5 overflow-y-auto pr-1">
          {/* Automatic Dispatch Switch */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Disparo Automático em Alerta Extremo</div>
                <div className="text-[11px] text-zinc-400">
                  Envia um e-mail de alta prioridade imediatamente quando a temperatura &gt; 20°C ou &lt; 10°C, ou umidade &gt; 85%.
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmailEnabled}
                onChange={e => setAutoEmailEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          {/* Email Recipient Form */}
          <form onSubmit={handleSaveEmail} className="space-y-3 bg-black/40 border border-white/5 rounded-xl p-4">
            <label className="block text-xs font-bold text-zinc-300">
              E-mail do Enólogo / Responsável Técnico pela Adega:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="ex: enologo.chefe@vinheriaprisma.com.br"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <SaveIcon />}
                {savedSuccess ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </form>

          {/* Test Dispatch Button */}
          <div className="flex items-center justify-between bg-gradient-to-r from-rose-950/40 to-black border border-rose-900/30 rounded-xl p-4">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Validar Envio de Notificação
              </div>
              <div className="text-[11px] text-zinc-400">
                Dispara um e-mail de teste para verificar a entrega para {recipientEmail}.
              </div>
            </div>
            <button
              onClick={onTriggerTestEmail}
              className="px-3.5 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950"
            >
              <Send className="w-3.5 h-3.5" />
              Disparar Teste
            </button>
          </div>

          {/* Email Template Preview */}
          <div className="border border-white/10 rounded-xl p-3 bg-zinc-950 text-xs">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Preview do Template HTML Enviado</span>
              <span className="font-mono text-[10px] text-zinc-500">HTML 5 / Responsivo</span>
            </div>
            <div className="p-3 bg-[#1e0e18] border border-rose-900/40 rounded-lg space-y-2 text-[11px]">
              <div className="font-bold text-red-400 text-xs flex items-center gap-1.5">
                🚨 [ALERTA EXTREMO] Anomalia Crítica na Adega - VinheriaTech
              </div>
              <div className="text-zinc-300">
                Olá, <b>Enólogo Responsável</b>. Foi detectada uma violação extrema de temperatura na Adega Principal.
              </div>
              <div className="bg-black/60 p-2.5 rounded font-mono text-[10px] space-y-1 text-zinc-200 border border-white/5">
                <div>• Temperatura Medida: <span className="text-red-400 font-bold">24.5 °C (Máx tolerado: 20.0 °C)</span></div>
                <div>• Buzzer do ESP32: <span className="text-amber-400 font-bold">Som Constante Ativo</span></div>
                <div>• LED Azul: <span className="text-blue-400 font-bold">Aceso Contínuo</span></div>
                <div>• Ação Requerida: Passe o Cartão RFID Master (01:02:03:04) para silenciar o alarme.</div>
              </div>
            </div>
          </div>

          {/* Historical Log of Emails Sent */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-300">Histórico de Disparos Recentes:</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {emailLogs.length === 0 ? (
                <div className="text-xs text-zinc-500 p-2 text-center bg-black/20 rounded">
                  Nenhum e-mail de alerta disparado ainda.
                </div>
              ) : (
                emailLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between bg-black/30 border border-white/5 p-2 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-mono text-[10px] text-zinc-400">{log.timestamp}</span>
                      <span className="font-semibold text-white truncate max-w-[200px]">{log.recipient}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const SaveIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);


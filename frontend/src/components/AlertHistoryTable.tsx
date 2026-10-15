import React from 'react';
import { AlertCircle, History, ShieldCheck, Clock } from 'lucide-react';

export interface AlertRecord {
  id: string;
  data_hora: string;
  tipo: string;
  severidade: string;
  valor: string;
  atendimento: string;
}

export interface AuditRecord {
  id: string;
  horario: string;
  uid: string;
  operador: string;
  status: string;
}

interface AlertHistoryTableProps {
  alerts: AlertRecord[];
  audits: AuditRecord[];
}

export const AlertHistoryTable: React.FC<AlertHistoryTableProps> = ({ alerts, audits }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Histórico Oficial de Ocorrências de Alerta */}
      <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-red-400" />
            <h4 className="font-bold text-white text-xs tracking-wider uppercase">
              HISTÓRICO DE OCORRÊNCIAS DE ALERTA (DATA & HORÁRIO)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            Audit Trail
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-semibold text-[11px]">
                <th className="pb-2">Data/Hora</th>
                <th className="pb-2">Anomalia</th>
                <th className="pb-2">Severidade</th>
                <th className="pb-2">Medição</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500 font-sans">
                    Nenhuma anomalia registrada. Adega em perfeito equilíbrio.
                  </td>
                </tr>
              ) : (
                alerts.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 text-zinc-300 font-bold flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {item.data_hora}
                    </td>
                    <td className="py-2.5 text-zinc-200">{item.tipo}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded font-sans text-[10px] font-bold ${
                        item.severidade.includes('EXTREMO')
                          ? 'bg-red-950 text-red-300 border border-red-800/50'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                      }`}>
                        {item.severidade}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-white">{item.valor}</td>
                    <td className="py-2.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-fit ${
                        item.atendimento.includes('Reconhecido')
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.atendimento.includes('Reconhecido') ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                        )}
                        {item.atendimento}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Auditoria de Reconhecimento RFID MFRC522 */}
      <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white text-xs tracking-wider uppercase">
              AUDITORIA DE RECONHECIMENTO RFID (MFRC522)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            Master 01:02:03:04
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-semibold text-[11px]">
                <th className="pb-2">Horário</th>
                <th className="pb-2">UID Tag</th>
                <th className="pb-2">Operador Responsável</th>
                <th className="pb-2">Ação Registrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-zinc-500 font-sans">
                    Nenhum acesso de auditoria registrado no turno atual.
                  </td>
                </tr>
              ) : (
                audits.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 text-zinc-300 font-bold">{item.horario}</td>
                    <td className="py-2.5 text-cyan-300 font-bold">{item.uid}</td>
                    <td className="py-2.5 text-white font-sans">{item.operador}</td>
                    <td className="py-2.5 font-sans">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 text-[10px] font-semibold">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Cpu, Plus, X, Server, Check } from 'lucide-react';

export interface DeviceEntry {
  device_id: string;
  entity_name: string;
  entity_type: string;
  location: string;
  transport: string;
  status: string;
}

interface DeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceEntry[];
  onAddDevice: (dev: DeviceEntry) => void;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  isOpen,
  onClose,
  devices,
  onAddDevice
}) => {
  const [devId, setDevId] = useState('wine002');
  const [entName, setEntName] = useState('urn:ngsi-ld:WineCellar:002');
  const [entType, setEntType] = useState('WineCellar');
  const [location, setLocation] = useState('Cave Subterrânea 2 - Setor Nobre');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDevice({
      device_id: devId,
      entity_name: entName,
      entity_type: entType,
      location,
      transport: 'MQTT / UltraLight 2.0',
      status: 'PROVISIONADO ONLINE'
    });
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#140810] border border-rose-900/40 rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">GERENCIAMENTO DE IOT DEVICES</h3>
              <p className="text-xs text-zinc-400">FIWARE IoT Agent MQTT (Porta 4041) & Orion Context Broker</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Current Provisioned Devices Table */}
          <div>
            <div className="text-xs font-bold text-zinc-300 mb-2">Dispositivos Ativos no Ecossistema:</div>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 font-semibold text-[11px] border-b border-white/10">
                    <th className="p-2.5">Device ID</th>
                    <th className="p-2.5">Entidade URN</th>
                    <th className="p-2.5">Localização</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {devices.map(d => (
                    <tr key={d.device_id} className="hover:bg-white/5 transition">
                      <td className="p-2.5 font-bold text-white">{d.device_id}</td>
                      <td className="p-2.5 text-zinc-300">{d.entity_name}</td>
                      <td className="p-2.5 text-zinc-400 font-sans">{d.location}</td>
                      <td className="p-2.5 font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 text-[10px] font-bold">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form to provision new device */}
          <form onSubmit={handleSubmit} className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Provisionar Nova Cave / Adega no FIWARE
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Device ID:</label>
                <input
                  type="text"
                  required
                  value={devId}
                  onChange={e => setDevId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Tipo da Entidade:</label>
                <input
                  type="text"
                  required
                  value={entType}
                  onChange={e => setEntType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">Nome da Entidade (NGSI-LD URN):</label>
                <input
                  type="text"
                  required
                  value={entName}
                  onChange={e => setEntName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">Localização / Setor da Vinheria:</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950'
              }`}
            >
              {isSuccess ? <Check className="w-4 h-4" /> : <Server className="w-4 h-4" />}
              {isSuccess ? 'Dispositivo Provisionado com Sucesso!' : 'Provisionar no IoT Agent (POST /iot/devices)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


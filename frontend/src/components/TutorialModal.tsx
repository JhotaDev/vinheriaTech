import React, { useState } from 'react';
import { BookOpen, X, ChevronRight, ChevronLeft, Check, Sparkles, AlertTriangle, ShieldCheck, CreditCard, Mail, Sliders } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Bem-vindo ao Sistema VinheriaTech!',
      subtitle: 'Supervisão Inteligente & Gêmeo Digital de Adegas (Equipe Prisma)',
      icon: <Sparkles className="w-6 h-6 text-rose-500" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <p>
            O <b>VinheriaTech</b> é uma solução completa de IoT e Cloud desenvolvida para monitorar e proteger vinhos nobres em tempo real.
          </p>
          <div className="bg-black/40 border border-white/5 p-3 rounded-xl space-y-1.5 text-zinc-300">
            <div>🍷 <b>Conservação de Precisão:</b> Variações térmicas ou excesso de luz degradam irreversivelmente safras premiadas.</div>
            <div>⚡ <b>Comunicação Bidirecional:</b> O ESP32 envia telemetria e recebe comandos através do protocolo UltraLight 2.0 / MQTT.</div>
            <div>🛡️ <b>Auditoria Física & Digital:</b> O sistema rastreia quem detectou, atendeu e normalizou cada incidente.</div>
          </div>
        </div>
      )
    },
    {
      title: 'Leitura dos Sensores & Faixas Ideais',
      subtitle: 'Entenda os parâmetros de ouro para conservação de vinhos',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-lg flex items-start gap-2.5">
              <span className="text-base">🌡️</span>
              <div>
                <b className="text-rose-300">Temperatura (12°C a 16°C):</b>
                <div>Valores &gt; 16°C aceleram o envelhecimento; &lt; 12°C podem precipitar ácido tartárico e ressecar a rolha.</div>
              </div>
            </div>

            <div className="bg-cyan-950/30 border border-cyan-900/40 p-2.5 rounded-lg flex items-start gap-2.5">
              <span className="text-base">💧</span>
              <div>
                <b className="text-cyan-300">Umidade Relativa (60% a 75%):</b>
                <div>Evita ressecamento de rolhas de cortiça (&lt; 60%) e previne mofo nos rótulos de colecionador (&gt; 75%).</div>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-lg flex items-start gap-2.5">
              <span className="text-base">☀️</span>
              <div>
                <b className="text-amber-300">Luminosidade (&lt; 30%):</b>
                <div>A luz direta e raios UV causam o defeito "goût de lumière", oxidando os aromas do vinho.</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Alertas Sonoros & Visuais Graduados',
      subtitle: 'Diferença crucial entre Alerta Crítico e Alerta Extremo',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <div className="space-y-2">
            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl">
              <div className="font-bold text-amber-300 text-xs mb-1 flex items-center gap-1.5">
                ⚠️ ALERTA CRÍTICO (Oscilação de Tolerância)
              </div>
              <p className="text-[11px] text-zinc-300">
                • <b>Buzzer:</b> Bips ultrarrápidos e frenéticos (50ms de som / 40ms de pausa).
                <br />
                • <b>LED Azul:</b> Pisca em perfeita sincronia 1:1 com os disparos sonoros.
                <br />
                • <b>OLED / Display:</b> Exibe <code className="text-amber-300">! CRITICO !</code>.
              </p>
            </div>

            <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl">
              <div className="font-bold text-red-400 text-xs mb-1 flex items-center gap-1.5">
                🚨 ALERTA EXTREMO (Risco Imediato de Perda Total)
              </div>
              <p className="text-[11px] text-zinc-300">
                • <b>Buzzer:</b> Som <b>100% CONSTANTE</b> (sem parar / ininterrupto via PWM de hardware).
                <br />
                • <b>LED Azul:</b> Fica <b>ACESO CONTÍNUO</b> fixo.
                <br />
                • <b>Ação Automática:</b> O site envia um <b>E-mail de Emergência</b> na hora para o enólogo!
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Silenciamento com Cartão RFID Master',
      subtitle: 'Auditoria técnica de reconhecimento de incidentes',
      icon: <CreditCard className="w-6 h-6 text-cyan-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <p>
            Em sistemas industriais de missão crítica, alarmes não podem simplesmente parar sozinhos: é necessário comprovar que um profissional esteve no local.
          </p>
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Aproxime a Tag RFID Master (UID: <code className="text-cyan-300 font-bold">01:02:03:04</code>) do Leitor MFRC522.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
              <span>O Buzzer <b>cessa imediatamente</b> (silêncio total!).</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
              <span>O display físico muda para <code className="text-cyan-300">ACK: HH:MM:SS MASTER</code> e o LED entra em modo ronda suave.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px]">4</span>
              <span>A ocorrência é gravada na tabela de Auditoria com o nome do Enólogo Chefe.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Disparo Automático de E-mails',
      subtitle: 'Notificação instantânea em caso de risco extremo',
      icon: <Mail className="w-6 h-6 text-rose-400" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <p>
            Você pode configurar o endereço de e-mail do sommelier ou enólogo através do botão <b>"📧 E-mail de Alerta"</b> na barra superior.
          </p>
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl space-y-2 text-[11px]">
            <div>• Sempre que o sensor detectar temperatura &gt; 20°C ou &lt; 10°C, o sistema monta e envia um e-mail HTML formal.</div>
            <div>• O e-mail contém o horário exato da violação, as medições instantâneas de cada sensor e a orientação de atendimento técnico.</div>
            <div>• Você pode testar o disparo a qualquer momento clicando em <b>"Disparar Teste"</b> dentro do modal de e-mail.</div>
          </div>
        </div>
      )
    },
    {
      title: 'Comandos Remotos & Calibração',
      subtitle: 'Assuma o controle total da adega através da nuvem',
      icon: <Sliders className="w-6 h-6 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
          <p>
            O painel permite interação bidirecional em tempo real:
          </p>
          <div className="space-y-2">
            <div className="p-2.5 bg-zinc-900 border border-white/5 rounded-lg">
              <b className="text-white">Sliders de Triggers:</b> Mova os seletores de temperatura, umidade e luz e clique em <b>"Salvar & Sincronizar"</b>. O ESP32 recebe a nova calibração imediatamente via MQTT!
            </div>
            <div className="p-2.5 bg-zinc-900 border border-white/5 rounded-lg">
              <b className="text-white">Gêmeo Digital 3D:</b> Gire a garrafa interativa em 360° com o mouse. Ela reage com brilhos, partículas e cores conforme a temperatura da adega varia!
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#140810] border border-rose-900/40 rounded-2xl p-6 shadow-2xl text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              {steps[currentStep].icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{steps[currentStep].title}</h3>
              <p className="text-[11px] text-zinc-400">{steps[currentStep].subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {steps[currentStep].content}
        </div>

        {/* Stepper Dots & Navigation */}
        <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep ? 'bg-rose-500 w-6' : 'bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1 transition cursor-pointer shadow-md shadow-rose-950"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1 transition cursor-pointer shadow-md shadow-emerald-950"
              >
                <Check className="w-4 h-4" />
                Concluir Tutorial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


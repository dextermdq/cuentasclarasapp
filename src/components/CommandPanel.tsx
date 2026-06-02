import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Sparkles, Send, RefreshCw, AlertCircle, CreditCard, Wallet } from "lucide-react";

interface CommandPanelProps {
  onProcessSuccess: (updatedState: any, transcription: string, explanation: string) => void;
  onProcessError?: (errorMsg: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function CommandPanel({ onProcessSuccess, onProcessError, isLoading, setIsLoading }: CommandPanelProps) {
  const [commandText, setCommandText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ transcription: string, explanation: string } | null>(null);

  // Payment channel explicit overrides
  const [paymentDestType, setPaymentDestType] = useState<"auto" | "tarjeta" | "consolidado">("auto");
  const [selectedCard, setSelectedCard] = useState<string>("naranja");
  const [selectedAccount, setSelectedAccount] = useState<string>("mercado_pago");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getPaymentHint = () => {
    if (paymentDestType === "auto") return undefined;
    if (paymentDestType === "tarjeta") {
      const labels: Record<string, string> = {
        naranja: "Tarjeta Naranja",
        naranja_visa: "Tarjeta Naranja Visa",
        visa_bco_provincia: "Tarjeta Visa Bco Provincia",
        mercadolibre: "Tarjeta Mercadolibre"
      };
      return labels[selectedCard] || selectedCard;
    } else {
      const labels: Record<string, string> = {
        publicos_cuenta_dni: "Públicos / Cuenta DNI",
        huailen: "Huailen",
        schweitzer: "Schweitzer",
        naranja_x: "Naranja X",
        mercado_pago: "Mercado Pago"
      };
      return labels[selectedAccount] || selectedAccount;
    }
  };

  const startRecording = async () => {
    setErrorText(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detección dinámica de formato para compatibilidad total en móviles
      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        } else {
          options = { mimeType: "" };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        stream.getTracks().forEach(track => track.stop());
        await uploadAudio(audioBlob, actualType);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("No se pudo iniciar el grabador", err);
      setErrorText("Error de micrófono: Asegúrate de habilitar los permisos en el navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async (blob: Blob, mimeType: string) => {
    setIsLoading(true);
    setErrorText(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result?.toString().split(",")[1];
        if (!base64Data) {
          throw new Error("No se pudo codificar el audio.");
        }

        const hint = getPaymentHint();
        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64Data,
            mimeType: mimeType,
            paymentMethodHint: hint
          })
        });

        const data = await res.json();
        if (!res.ok) {
          const errText = data.error || "Fallo en el servidor al parsear audio.";
          if (onProcessError) onProcessError(errText);
          throw new Error(errText);
        }

        onProcessSuccess(data.state, data.transcription, data.explanation);
        setLastAction({
          transcription: data.transcription,
          explanation: data.explanation
        });
      };
    } catch (err: any) {
      setErrorText(err.message || "Error al procesar el audio.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    setIsLoading(true);
    setErrorText(null);
    try {
      const hint = getPaymentHint();

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: commandText,
          paymentMethodHint: hint
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errText = data.error || data.details || "Fallo en la comunicación con el servidor.";
        if (onProcessError) onProcessError(errText);
        throw new Error(errText);
      }

      onProcessSuccess(data.state, data.transcription, data.explanation);
      setLastAction({
        transcription: data.transcription,
        explanation: data.explanation
      });
      setCommandText("");
    } catch (err: any) {
      setErrorText(err.message || "Ocurrió un error.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="command_panel_container">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        Procesar Comando de Voz o Texto
      </h2>

      <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 mb-6 flex flex-col items-center justify-center gap-4 transition-all hover:border-slate-700">
        {recording ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center animate-ping absolute" />
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/50 relative transition-transform hover:scale-105"
              title="Detener Grabación"
              type="button"
            >
              <Square className="w-6 h-6 fill-white text-white" />
            </button>
            <div className="text-center mt-2">
              <span className="text-red-400 font-mono text-sm font-semibold tracking-wider">
                GRABANDO {formatDuration(recordDuration)}
              </span>
              <p className="text-slate-400 text-xxs mt-1">El procesador transcribirá tu voz y adaptará las cuentas</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              disabled={isLoading}
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-900/50 transition-all disabled:opacity-50 hover:scale-105"
              title="Grabar Voz"
              type="button"
            >
              <Mic className="w-6 h-6" />
            </button>
            <div className="text-center">
              <span className="text-slate-200 font-semibold text-sm">Comando por Voz</span>
              <p className="text-slate-500 text-xxs mt-0.5">Haz clic para hablar (ej. "Gaste 850 pesos de Mercado Pago")</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">
            ¿Por dónde se realiza la compra?
          </label>
          <span className="text-[9px] text-indigo-400 font-semibold">• Configura tu consulta</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPaymentDestType("auto")}
            className={`py-1.5 px-2 rounded-lg text-xxs font-medium border text-center transition-all ${
              paymentDestType === "auto"
                ? "bg-indigo-600/20 border-indigo-500/80 text-indigo-300"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            Detectar Auto
          </button>
          <button
            type="button"
            onClick={() => setPaymentDestType("tarjeta")}
            className={`py-1.5 px-2 rounded-lg text-xxs font-medium border text-center transition-all flex items-center justify-center gap-1 ${
              paymentDestType === "tarjeta"
                ? "bg-pink-600/20 border-pink-500/80 text-pink-300"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Por Tarjeta
          </button>
          <button
            type="button"
            onClick={() => setPaymentDestType("consolidado")}
            className={`py-1.5 px-2 rounded-lg text-xxs font-medium border text-center transition-all flex items-center justify-center gap-1 ${
              paymentDestType === "consolidado"
                ? "bg-cyan-600/20 border-cyan-500/80 text-cyan-300"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <Wallet className="w-3 h-3" />
            Consolidado
          </button>
        </div>

        {paymentDestType === "tarjeta" && (
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-medium font-sans">Seleccionar Tarjeta destino:</span>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg py-1 px-2 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none focus:border-pink-500 font-sans"
            >
              <option value="naranja">Naranja</option>
              <option value="naranja_visa">Naranja Visa</option>
              <option value="visa_bco_provincia">Visa Bco Provincia</option>
              <option value="mercadolibre">Mercadolibre</option>
            </select>
          </div>
        )}

        {paymentDestType === "consolidado" && (
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-medium font-sans">Seleccionar Cuenta para debitar:</span>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-lg py-1 px-2 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none focus:border-cyan-500 font-sans"
            >
              <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
              <option value="huailen">Huailen</option>
              <option value="schweitzer">Schweitzer</option>
              <option value="naranja_x">Naranja X</option>
              <option value="mercado_pago">Mercado Pago</option>
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleSendText} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            disabled={isLoading || recording}
            placeholder='Escribe un comando... (ej. "Pagué personal con Naranja X")'
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 text-sm border border-slate-800 rounded-xl px-4 py-3.5 pr-24 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={isLoading || recording || !commandText.trim()}
            className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Ejecutar
              </>
            )}
          </button>
        </div>
      </form>

      {errorText && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex gap-2.5 items-start">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            <span className="font-semibold block">Error de procesamiento</span>
            {errorText}
          </div>
        </div>
      )}

      {lastAction && (
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <span className="text-slate-500 text-xxs font-bold tracking-wider uppercase block mb-2">
            ÚLTIMO PARSEO REALIZADO
          </span>
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-indigo-400 font-bold block text-xxs tracking-wide uppercase">TRANSCIPCIÓN / COMANDO</span>
              <p className="text-slate-300 text-xs italic">"{lastAction.transcription}"</p>
            </div>
            <div>
              <span className="text-emerald-400 font-bold block text-xxs tracking-wide uppercase">ACCIÓN DEL NODO</span>
              <p className="text-emerald-300 text-xs leading-relaxed">{lastAction.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
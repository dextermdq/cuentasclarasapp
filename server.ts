import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// 🎯 MARCA DE CONTROL ÚNICA
console.log("🚀 LEYENDO VERSIÓN INMUNE - ELIMINADOS TODOS LOS TOSTRING DEL ARCHIVO");

const app = express();
const PORT = 3000;

// Inicialización del cliente oficial de Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware para procesar JSON con límites altos para las grabaciones de voz
app.use(express.json({ limit: "50mb" }));

// Estado de respaldo absoluto por si las tablas relacionales de Supabase están vacías
const INITIAL_STATE = {
  disponible: {
    publicos_cuenta_dni: 152342.50,
    huailen: 84500.00,
    schweitzer: 120650.15,
    naranja_x: 45120.40,
    mercado_pago: 98750.80
  },
  tarjetas: {
    naranja: { name: "Naranja", total: 15000.00, cuotas: "2/3", paid: false, limite: 250000.00, resumenAnterior: 11200.00, proximoResumenBase: 15000.00, cargos: [], movimientosAnteriores: [], movimientosActuales: [] },
    naranja_visa: { name: "Naranja Visa", total: 23400.50, cuotas: "1/6", paid: false, limite: 300000.00, resumenAnterior: 15400.00, proximoResumenBase: 18400.50, cargos: [], movimientosAnteriores: [], movimientosActuales: [] },
    visa_bco_provincia: { name: "Visa Bco Provincia", total: 45800.00, cuotas: "4/12", paid: false, limite: 500000.00, resumenAnterior: 39000.00, proximoResumenBase: 42000.00, cargos: [], movimientosAnteriores: [], movimientosActuales: [] },
    mercadolibre: { name: "Mercadolibre", total: 12500.00, cuotas: "1/3", paid: true, limite: 150000.00, resumenAnterior: 10500.00, proximoResumenBase: 11000.00, cargos: [], movimientosAnteriores: [], movimientosActuales: [] }
  },
  gastos_fijos: {
    personal: { name: "Personal (Internet/Móvil)", key: "personal", total: 8550.00, medio: "NARANJA X", paid: false, historyPrice: 7200.00 },
    hpc: { name: "HPC", key: "hpc", total: 14500.00, medio: "MERCADO PAGO", paid: false, historyPrice: 14500.00 },
    racing_club: { name: "Racing Club", key: "racing_club", total: 9500.00, medio: "MERCADO PAGO", paid: false, historyPrice: 9500.00 },
    gym: { name: "Gym", key: "gym", total: 7000.00, medio: "MERCADO PAGO", paid: false, historyPrice: 6500.00 },
    hipotecario: { name: "Hipotecario", key: "hipotecario", total: 55000.00, medio: "PÚBLICOS / CUENTA DNI", paid: false, historyPrice: 55000.00 },
    prestamo_bco_provincia: { name: "Préstamo Bco Provincia (Vence Enero 2027)", key: "prestamo_bco_provincia", total: 32000.00, medio: "PÚBLICOS / CUENTA DNI", paid: false, historyPrice: 32000.00 },
    impuestos_casa: { name: "Impuestos Casa", key: "impuestos_casa", total: 12400.00, medio: "HUAILEN", paid: false, historyPrice: 11200.00 },
    impacto: { name: "Impacto (IA con primo)", key: "impacto", total: 25000.00, medio: "SCHWEITZER", paid: false, historyPrice: 25000.00 }
  },
  ahorro_acumulado: 350000.00,
  ahorros_apartados: {
    "Compra de Dólares": 25000.00,
    "Vacaciones": 50000.00,
    "Fondo de Emergencia": 100000.00
  },
  ultimo_movimiento: "Inicialización del sistema de node de procesamiento financiero.",
  historial_movimientos: []
};

// Función para armar el JSON estructurado leyendo de las tablas relacionales de Supabase
async function readState() {
  try {
    const [
      { data: cuentas },
      { data: tarjetas },
      { data: gastosFijos },
      { data: ahorros },
      { data: historial },
      { data: general }
    ] = await Promise.all([
      supabase.from("cuentas").select("*"),
      supabase.from("tarjetas").select("*"),
      supabase.from("gastos_fijos").select("*"),
      supabase.from("ahorros").select("*"),
      supabase.from("historial_movimientos").select("*").order("fecha", { ascending: false }),
      supabase.from("estado_general").select("*").single()
    ]);

    if (!cuentas || cuentas.length === 0) {
      return INITIAL_STATE;
    }

    const disponible: Record<string, number> = {};
    cuentas.forEach(c => { disponible[c.id] = Number(c.saldo); });

    const tarjetasMap: Record<string, any> = {};
    tarjetas?.forEach(t => {
      tarjetasMap[t.id] = {
        name: t.nombre,
        total: Number(t.total),
        cuotas: t.cuotas,
        paid: t.paid,
        limite: Number(t.limite),
        resumenAnterior: Number(t.resumen_anterior),
        proximoResumenBase: Number(t.proximo_resumen_base),
        cargos: t.cargos || [],
        movimientosAnteriores: t.movimientos_anteriores || [],
        movimientosActuales: t.movimientos_actuales || []
      };
    });

    const gastosFijosMap: Record<string, any> = {};
    gastosFijos?.forEach(g => {
      gastosFijosMap[g.id] = {
        name: g.nombre,
        key: g.id,
        total: Number(g.total),
        medio: g.medio,
        paid: g.paid,
        historyPrice: Number(g.history_price)
      };
    });

    const totalAhorro = ahorros?.find(a => a.tipo === "total")?.monto || 0;
    const ahorrosApartados: Record<string, number> = {};
    ahorros?.filter(a => a.tipo === "apartado").forEach(a => {
      ahorrosApartados[a.id] = Number(a.monto);
    });

    return {
      disponible,
      tarjetas: tarjetasMap,
      gastos_fijos: gastosFijosMap,
      ahorro_acumulado: Number(totalAhorro),
      ahorros_apartados: ahorrosApartados,
      ultimo_movimiento: general?.ultimo_movimiento || "Sin movimientos registrados.",
      historial_movimientos: historial?.map(h => ({
        id: h.id,
        date: h.fecha,
        description: h.descripcion,
        amount: Number(h.monto),
        type: h.tipo,
        sourceAccount: h.source_account || undefined,
        destAccount: h.dest_account || undefined
      })) || []
    };
  } catch (error) {
    console.error("Error leyendo desde las tablas relacionales de Supabase:", error);
    return INITIAL_STATE;
  }
}

// Función para desarmar el objeto mutado y actualizar cada tabla relacional por separado
async function writeState(state: any) {
  try {
    if (!state.disponible || Object.keys(state.disponible).length < 3) {
      console.log("⚠️ [ESCUDO] Objeto disponible incompleto. Escritura omitida.");
      return;
    }

    const cuentasUpsert = Object.entries(state.disponible).map(([id, saldo]) => {
      const tipo = ["naranja_x", "mercado_pago"].includes(id) ? "billetera" : "caja_ahorro";
      const names: Record<string, string> = {
        publicos_cuenta_dni: "Públicos / Cuenta DNI",
        huailen: "Huailen",
        schweitzer: "Schweitzer",
        naranja_x: "Naranja X",
        mercado_pago: "Mercado Pago"
      };
      return { id, nombre: names[id] || id, tipo, saldo };
    });
    await supabase.from("cuentas").upsert(cuentasUpsert);

    const tarjetasUpsert = Object.entries(state.tarjetas || {}).map(([id, t]: [string, any]) => ({
      id,
      nombre: t.name,
      total: t.total,
      cuotas: t.cuotas,
      paid: t.paid,
      limite: t.limite,
      resumen_anterior: t.resumenAnterior || 0,
      proximo_resumen_base: t.proximoResumenBase || 0,
      cargos: t.cargos || [],
      movimientos_anteriores: t.movimientosAnteriores || [],
      movimientos_actuales: t.movimientosActuales || []
    }));
    await supabase.from("tarjetas").upsert(tarjetasUpsert);

    const gastosUpsert = Object.entries(state.gastos_fijos || {}).map(([id, g]: [string, any]) => ({
      id,
      nombre: g.name,
      total: g.total,
      medio: g.medio,
      paid: g.paid,
      history_price: g.historyPrice || 0
    }));
    await supabase.from("gastos_fijos").upsert(gastosUpsert);

    const ahorrosUpsert = [
      { id: "total", monto: String(state.ahorro_acumulado ?? 0), tipo: "total" },
      ...Object.entries(state.ahorros_apartados || {}).map(([id, monto]: [string, any]) => ({
        id,
        monto: String(monto ?? 0),
        tipo: "apartado"
      }))
    ];
    await supabase.from("ahorros").upsert(ahorrosUpsert);

    if (state.historial_movimientos && state.historial_movimientos.length > 0) {
      const historialUpsert = state.historial_movimientos.map((h: any) => {
        const finalAmount = h.amount ?? h.monto ?? 0;
        const randomId = String(Math.floor(Math.random() * 1000000));
        return {
          id: h.id || `mov_${Date.now()}_${randomId}`,
          fecha: h.date || h.fecha || new Date().toISOString(),
          descripcion: h.description || h.descripcion || "Movimiento financiero",
          monto: String(finalAmount),
          tipo: h.type || h.tipo || "otros",
          source_account: h.sourceAccount || h.source_account || null,
          dest_account: h.destAccount || h.dest_account || null
        };
      });
      await supabase.from("historial_movimientos").upsert(historialUpsert);
    }

    await supabase.from("estado_general").upsert({
      id: 1,
      ultimo_movimiento: state.ultimo_movimiento || "Actualización realizada."
    });

  } catch (error) {
    console.error("Error writing to Supabase tables:", error);
    throw error;
  }
}

app.get("/api/state", async (req, res) => {
  try {
    const state = await readState();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read financial state", details: err.message });
  }
});

app.post("/api/state", async (req, res) => {
  try {
    const newState = req.body;
    await writeState(newState);
    res.json({ success: true, state: newState });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update financial state", details: err.message });
  }
});

app.post("/api/reset", async (req, res) => {
  try {
    await writeState(INITIAL_STATE);
    res.json({ success: true, state: INITIAL_STATE });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset state", details: err.message });
  }
});

app.post("/api/process", async (req, res) => {
  console.log("📌 [PASO 1] Entró una petición al endpoint /api/process");
  try {
    const { command, audio, mimeType, paymentMethodHint } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("🔴 [ERROR] Falta la API Key en las variables de entorno (.env)");
      return res.status(500).json({ error: "Falta la API Key de Gemini en el entorno." });
    }

    const currentState = await readState();
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const systemPrompt = `
Eres un nodo de procesamiento financiero de ultra alta precisión para el usuario lucasmauromdq@gmail.com.
Tu tarea es interpretar los comandos de texto o las grabaciones de voz del usuario, realizar la operación matemática correspondiente y actualizar el estado financiero EXACTO.

### REGLAS DE NEGOCIO OBLIGATORIAS:
1. PRECISION EXACTA DE CENTAVOS: Trabajas con centavos exactos. NO redondees jamás los montos recibidos ni los saldos calculados.
2. CONSERVACIÓN DE CUENTAS: Es obligatorio que preserves siempre todas las cuentas del objeto disponible, tarjetas y gastos fijos, clonando sus montos anteriores intactos si el comando no los modifica de forma directa.
3. DISPONIBLE (Saldos de cuentas):
   - 'PÚBLICOS' y 'CUENTA DNI' comparten saldo espejo en el campo 'publicos_cuenta_dni'. Si el usuario opera con Cuenta DNI o Públicos, impacta ahí.
   - 'HUAILEN' se mapea con 'huailen'.
   - 'SCHWEITZER' se mapea con 'schweitzer'.
   - 'NARANJA X' se mapea con 'naranja_x'.
   - 'MERCADO PAGO' se mapea con 'mercado_pago'.
4. REGLA CRÍTICA PARA GASTOS FIJOS (gastos_fijos):
   - Cuando el usuario indique el pago o procesamiento de un gasto fijo (ej. "marcar pago", "pagado personal", "tildar hpc"), únicamente debes cambiar el estado de ese gasto fijo a 'paid': true y actualizar su 'total' mensual si indica un nuevo precio.
   - NO DEBES DEBITAR, NI RESTAR, NI DESCONTAR el dinero de ninguna billetera virtual ni caja de ahorro automáticamente. El saldo disponible debe permanecer INTACTO para gastos fijos ya que el débito físico se realizará de forma manual.
   - Alerta en 'alertIncrement': Si el nuevo total es superior al 'historyPrice', escribe en 'alertIncrement' un mensaje del estilo "¡Alerta de incremento! El mes anterior pagaba $historyPrice y este mes pagó $total (incremento de $diff)". Si es igual o menor, ponlo como null o vacío.
   - Mantén siempre congelado 'historyPrice' con el monto base asignado para permitirle al usuario corroborar variaciones o aumentos de precio manuales.
5. INGRESOS Y TRASPASOS TOTALMENTE LIBRES:
   - Las cuentas 'schweitzer' y 'huailen' están 100% habilitadas para recibir ingresos directos y hacer traspasos libres entre sí y hacia 'publicos_cuenta_dni'.
   - Si el usuario indica un traspaso desde Schweitzer o Huailen hacia Públicos/Cuenta DNI, debes restar exactamente el monto del campo origen ('schweitzer' o 'huailen') y sumarlo en 'publicos_cuenta_dni'.
6. TARJETAS DE CRÉDITO (tarjetas):
   - Son: 'naranja', 'naranja_visa', 'visa_bco_provincia', 'mercadolibre'.
   - Si el comando paga una tarjeta, marca como pagada ('paid': true) y deduce el total de la cuenta de disponible especificada. Si no la especifica, asúmela de 'mercado_pago'.
7. NUEVOS MOVIMIENTOS: Añade un elemento con id único al array 'historial_movimientos' y actualiza 'ultimo_movimiento'.
8. PREVENCIÓN DE SALDOS NEGATIVOS: Si causa saldo menor a cero, devuelve el estado sin cambios y empieza 'explanation' con "🔴 Error: Saldo insuficiente".
`;

    let contextText = "";
    if (paymentMethodHint) {
      contextText = ` [Nota del sistema: Cuenta seleccionada en la interfaz: "${paymentMethodHint}"].`;
    }

    const contents: any[] = [];
    if (audio) {
      console.log("📌 [PASO 6] Limpiando cabeceras base64 y códecs del audio para Google...");
      const base64Data = audio.includes("base64,") ? audio.split("base64,")[1] : audio;
      const cleanMimeType = mimeType ? mimeType.split(";")[0] : "audio/webm";

      contents.push({
        parts: [
          { inlineData: { data: base64Data, mimeType: cleanMimeType } },
          { text: `Procesa esta grabación de audio de comando financiero.${contextText} Basándote en el siguiente estado financiero actual: ${JSON.stringify(currentState)}.` }
        ]
      });
    } else {
      contents.push({
        parts: [
          { text: `Procesa el comando de texto: "${command}".${contextText} Basándote en el siguiente estado financiero actual: ${JSON.stringify(currentState)}.` }
        ]
      });
    }

    const modelConfig = {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          explanation: { type: Type.STRING },
          updatedState: {
            type: Type.OBJECT,
            properties: {
              disponible: {
                type: Type.OBJECT,
                properties: {
                  publicos_cuenta_dni: { type: Type.NUMBER },
                  huailen: { type: Type.NUMBER },
                  schweitzer: { type: Type.NUMBER },
                  naranja_x: { type: Type.NUMBER },
                  mercado_pago: { type: Type.NUMBER }
                },
                required: ["publicos_cuenta_dni", "huailen", "schweitzer", "naranja_x", "mercado_pago"]
              },
              tarjetas: { type: Type.OBJECT },
              gastos_fijos: { type: Type.OBJECT },
              ahorro_acumulado: { type: Type.NUMBER },
              ahorros_apartados: { type: Type.OBJECT },
              ultimo_movimiento: { type: Type.STRING },
              historial_movimientos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    date: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    type: { type: Type.STRING },
                    sourceAccount: { type: Type.STRING },
                    destAccount: { type: Type.STRING }
                  },
                  required: ["id", "date", "description", "amount", "type"]
                }
              }
            },
            required: ["disponible", "tarjetas", "gastos_fijos", "ahorro_acumulado", "ultimo_movimiento", "historial_movimientos"]
          }
        },
        required: ["transcription", "explanation", "updatedState"]
      }
    };

    let response;
    try {
      console.log("📌 [PASO 7] Intentando procesar con el modelo Gemini 2.5-flash...");
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: modelConfig
      });
    } catch (err) {
      console.log("⚠️ [FALLBACK] El modelo 2.5-flash falló. Saltando de inmediato a Gemini 2.0-flash...");
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
        config: modelConfig
      });
    }

    console.log("📌 [PASO 8] API de Gemini respondió con éxito.");
    const resultText = response.text;
    if (!resultText) throw new Error("La respuesta recibida de Gemini vino vacía.");

    const parsedResult = JSON.parse(resultText.trim());

    if (parsedResult.updatedState) {
      const updatedState = parsedResult.updatedState;

      if (parsedResult.explanation && parsedResult.explanation.includes("🔴 Error:")) {
        console.log("⚠️ [ALERTA] La IA rechazó la transacción por regla de negocio.");
        return res.status(400).json({
          error: parsedResult.explanation,
          explanation: parsedResult.explanation,
          transcription: parsedResult.transcription
        });
      }

      console.log("📌 [PASO 10] Guardando cambios en Supabase...");
      await writeState(updatedState);
      
      console.log("🎉 [ÉXITO] Operación de voz completada.");
      res.json({
        success: true,
        transcription: parsedResult.transcription,
        explanation: parsedResult.explanation,
        state: updatedState
      });
    } else {
      throw new Error("El formato devuelto por la IA no contiene el objeto updatedState.");
    }
  } catch (err: any) {
    console.error("🔴 [ERROR CRÍTICO DETECTADO EN EL PROCESAMIENTO]:", err);
    res.status(500).json({
      error: "Error interno del servidor",
      details: err.message
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  CreditCard as CardIcon, 
  PiggyBank, 
  AlertTriangle, 
  CheckCircle, 
  Circle, 
  RefreshCw, 
  Wifi, 
  Database,
  ArrowRightLeft,
  Coins,
  History,
  TrendingUp,
  User,
  Check,
  Edit2,
  TrendingDown,
  Info,
  X,
  Download
} from "lucide-react";
import CommandPanel from "./components/CommandPanel";
import { FinancialState, FixedExpense, CreditCard } from "./types";

export default function App() {
  const [state, setState] = useState<FinancialState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [isEditingBalance, setIsEditingBalance] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // States for interactive credit card panel, incomes, and expenses
  const [selectedCardDetail, setSelectedCardDetail] = useState<string | null>(null);
  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeConcept, setIncomeConcept] = useState<string>("");
  const [incomeAccount, setIncomeAccount] = useState<string>("publicos_cuenta_dni");
  const [chargeName, setChargeName] = useState<string>("");
  const [chargeAmount, setChargeAmount] = useState<string>("");

  // States for improved manual data loading (Registro de Gastos/Ingresos/Traspasos)
  const [activeFormTab, setActiveFormTab] = useState<"gasto" | "ingreso" | "transferencia">("gasto");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseConcept, setExpenseConcept] = useState<string>("");
  const [expenseOption, setExpenseOption] = useState<string>("otro");
  const [expensePaymentSource, setExpensePaymentSource] = useState<string>("mercado_pago");
  const [expenseInstallments, setExpenseInstallments] = useState<string>("1");

  // States for internal transfers between accounts (savings boxes / virtual wallets)
  const [transferOrigin, setTransferOrigin] = useState<string>("mercado_pago");
  const [transferDestination, setTransferDestination] = useState<string>("publicos_cuenta_dni");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferConcept, setTransferConcept] = useState<string>("Traspaso de sueldo");

  // States for custom savings goals (apartados)
  const [newApartadoName, setNewApartadoName] = useState<string>("");
  const [showCreateApartado, setShowCreateApartado] = useState<boolean>(false);
  const [fundingApartadoKey, setFundingApartadoKey] = useState<string | null>(null);
  const [fundingActionType, setFundingActionType] = useState<"depositar" | "retirar" | null>(null);
  const [savingsSourceAccount, setSavingsSourceAccount] = useState<string>("mercado_pago");
  const [savingsActionAmount, setSavingsActionAmount] = useState<string>("");

  // States for card limits
  const [editingCardLimitKey, setEditingCardLimitKey] = useState<string | null>(null);
  const [editCardLimitValue, setEditCardLimitValue] = useState<string>("");

  // Deeply integrated premium custom notification modal overlay state
  const [modalNotification, setModalNotification] = useState<{
    type: "error" | "success" | "warning";
    title: string;
    message: string;
  } | null>(null);

  const showError = (title: string, message: string) => {
    setModalNotification({
      type: "error",
      title: title,
      message: message
    });
  };

  const showSuccess = (title: string, message: string) => {
    setModalNotification({
      type: "success",
      title: title,
      message: message
    });
  };

  const handleDownloadReport = () => {
    if (!state) return;

    // Build Cards HTML
    let cardsHtml = "";
    Object.entries(state.tarjetas).forEach(([key, cardVal]) => {
      const card = cardVal as CreditCard;
      
      const limitsArr: Record<string, number> = {
        naranja: 250000.00,
        naranja_visa: 300000.00,
        visa_bco_provincia: 500000.00,
        mercadolibre: 150000.00
      };
      const cardLimit = card.limite || limitsArr[key] || 100000;
      
      let prevMovsHtml = "";
      if (card.movimientosAnteriores && card.movimientosAnteriores.length > 0) {
        card.movimientosAnteriores.forEach(m => {
          prevMovsHtml += `
            <div class="mov-item">
              <span class="mov-concept">&#8226; ${m.name}</span>
              <span class="mov-amount">${formatPesos(m.amount)}</span>
            </div>
          `;
        });
      } else {
        prevMovsHtml = `<p class="empty-text">Sin movimientos anteriores registrados</p>`;
      }

      let currMovsHtml = "";
      if (card.movimientosActuales && card.movimientosActuales.length > 0) {
        card.movimientosActuales.forEach(m => {
          currMovsHtml += `
            <div class="mov-item actual">
              <span class="mov-concept">&#8226; ${m.name}</span>
              <span class="mov-amount font-bold color-egreso">${formatPesos(m.amount)}</span>
            </div>
          `;
        });
      } else {
        currMovsHtml = `<p class="empty-text">Sin nuevos cargos o movimientos actuales</p>`;
      }

      cardsHtml += `
        <div class="card-block" style="background-color: #0c111d; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <div class="card-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 class="card-title" style="font-size: 15px; font-weight: 700; color: #fff; margin: 0;">${card.name}</h3>
            <span class="card-badge ${card.paid ? 'badge-paid' : 'badge-pending'}">
              ${card.paid ? 'Liquidada / Pagada' : 'Pendiente / Por Pagar'}
            </span>
          </div>
          <p style="margin: -10px 0 15px 0; font-size: 11px; color: #9ca3af;">Límite Total asignado: ${formatPesos(cardLimit)} | Cuotas: ${card.cuotas || 'N/A'}</p>
          
          <div class="summary-boxes" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div class="sum-box" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 12px 15px;">
              <div class="sum-box-title" style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px;">Total Resumen Anterior</div>
              <div class="sum-box-val" style="font-size: 16px; font-weight: 800; font-family: monospace; color: #fff;">${formatPesos(card.resumenAnterior || 0)}</div>
              <div class="sum-box-desc" style="font-size: 9px; color: #4b5563; margin-top: 4px;">Saldo cerrado en el período previo</div>
            </div>
            <div class="sum-box actual" style="background-color: rgba(244, 63, 94, 0.05); border: 1px solid rgba(244, 63, 94, 0.15); border-radius: 10px; padding: 12px 15px;">
              <div class="sum-box-title" style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #fb7185; margin-bottom: 4px;">Total Resumen Actual</div>
              <div class="sum-box-val color-egreso" style="font-size: 16px; font-weight: 900; font-family: monospace; color: #f43f5e;">${formatPesos(card.total)}</div>
              <div class="sum-box-desc" style="font-size: 9px; color: #4b5563; margin-top: 4px;">Saldo consolidado del ciclo por abonar</div>
            </div>
          </div>

          <div class="movements-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="movements-col">
              <h4 style="margin: 0 0 10px 0; font-size: 9.5px; color: #9ca3af; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">📄 Movimientos Resumen Anterior</h4>
              <div class="mov-list" style="display: flex; flex-direction: column; gap: 6px;">${prevMovsHtml}</div>
            </div>
            <div class="movements-col">
              <h4 style="margin: 0 0 10px 0; font-size: 9.5px; color: #9ca3af; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">⚡ Movimientos del Ciclo Actual</h4>
              <div class="mov-list" style="display: flex; flex-direction: column; gap: 6px;">${currMovsHtml}</div>
            </div>
          </div>
        </div>
      `;
    });

    const walletMovs = state.historial_movimientos.filter(m => {
      if (!m.sourceAccount) return false;
      const accountUpper = m.sourceAccount.toUpperCase();
      return accountUpper.includes("NARANJA") || accountUpper.includes("MERCADO");
    });

    let walletMovsHtml = "";
    if (walletMovs.length > 0) {
      walletMovs.forEach(m => {
        const isIngreso = m.type === "ingreso" || (m.type === "transferencia" && m.amount > 0);
        walletMovsHtml += `
          <tr>
            <td class="font-mono">${new Date(m.date).toLocaleDateString("es-AR")} ${new Date(m.date).toLocaleTimeString("es-AR", {hour: '2-digit', minute:'2-digit'})}hs</td>
            <td><strong>${m.sourceAccount}</strong></td>
            <td>${m.description}</td>
            <td class="font-mono text-right ${isIngreso ? 'color-ingreso' : 'color-egreso'}">
              ${isIngreso ? '+' : '-'}${formatPesos(m.amount)}
            </td>
          </tr>
        `;
      });
    } else {
      walletMovsHtml = `
        <tr>
          <td colspan="4" class="empty-text" style="text-align: center; padding: 25px;">No se registraron movimientos recientes en Mercado Pago o Naranja X.</td>
        </tr>
      `;
    }

    const incomeMovs = state.historial_movimientos.filter(m => m.type === "ingreso");
    let incomesHtml = "";
    if (incomeMovs.length > 0) {
      incomeMovs.forEach(m => {
        incomesHtml += `
          <tr>
            <td class="font-mono">${new Date(m.date).toLocaleDateString("es-AR")} ${new Date(m.date).toLocaleTimeString("es-AR", {hour: '2-digit', minute:'2-digit'})}hs</td>
            <td><strong>${m.sourceAccount || 'Disponible'}</strong></td>
            <td>${m.description}</td>
            <td class="font-mono text-right color-ingreso">+${formatPesos(m.amount)}</td>
          </tr>
        `;
      });
    } else {
      incomesHtml = `
        <tr>
          <td colspan="4" class="empty-text" style="text-align: center; padding: 25px;">No se registraron ingresos manuales en el historial.</td>
        </tr>
      `;
    }

    const transferMovs = state.historial_movimientos.filter(m => m.type === "transferencia");
    let transfersHtml = "";
    if (transferMovs.length > 0) {
      transferMovs.forEach(m => {
        transfersHtml += `
          <tr>
            <td class="font-mono">${new Date(m.date).toLocaleDateString("es-AR")} ${new Date(m.date).toLocaleTimeString("es-AR", {hour: '2-digit', minute:'2-digit'})}hs</td>
            <td><strong>${m.sourceAccount || 'Origen'} ➜ ${m.destAccount || 'Destino'}</strong></td>
            <td>${m.description}</td>
            <td class="font-mono text-right" style="color: #f59e0b;">⇄ ${formatPesos(m.amount)}</td>
          </tr>
        `;
      });
    } else {
      transfersHtml = `
        <tr>
          <td colspan="4" class="empty-text" style="text-align: center; padding: 25px;">No se registraron traspasos de fondos en el historial.</td>
        </tr>
      `;
    }

    const totalDisp = (Object.values(state.disponible) as number[]).reduce((acc: number, curr: number) => acc + curr, 0);

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte Financiero Completo - Cuentas Claras</title>
<style>
  body { background-color: #0b0f19; color: #f1f5f9; font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 30px; }
  .report-container { max-width: 900px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 35px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
  .header { border-bottom: 2px solid #1f2937; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 24px; font-weight: 800; margin: 0; color: #fff; text-transform: uppercase; }
  .header p { margin: 5px 0 0 0; font-size: 11px; color: #9ca3af; }
  .timestamp-badge { background-color: #1f2937; border: 1px solid #374151; color: #cbd5e1; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; }
  .financial-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .fin-card { background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px; }
  .fin-card h3 { margin: 0 0 10px 0; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #38bdf8; }
  .fin-card .amount { font-size: 28px; font-weight: 900; font-family: monospace; color: #fff; margin: 0; }
  .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #f472b6; border-bottom: 2px solid #1f2937; padding-bottom: 8px; margin-top: 40px; margin-bottom: 18px; }
  .section-title.wallet { color: #f59e0b; }
  .section-title.income { color: #10b981; }
  .card-block { background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
  .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .card-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
  .card-badge { padding: 4px 8px; border-radius: 6px; font-size: 8.5px; font-weight: bold; text-transform: uppercase; }
  .badge-paid { background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
  .badge-pending { background-color: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
  .summary-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
  .sum-box { background-color: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 12px 15px; }
  .sum-box.actual { background-color: rgba(244, 63, 94, 0.05); border-color: rgba(244, 63, 94, 0.15); }
  .sum-box-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #9cb3c9; margin-bottom: 4px; }
  .sum-box-val { font-size: 16px; font-weight: 800; font-family: monospace; color: #fff; }
  .movements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .mov-list { display: flex; flex-direction: column; gap: 6px; }
  .mov-item { background-color: #111827; border: 1px solid #1f2937; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; font-size: 10.5px; font-family: monospace; }
  .table-card { background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; color: #e2e8f0; }
  th, td { padding: 10px 15px; text-align: left; border-bottom: 1px solid #1f2937; }
  th { background-color: #111827; color: #9ca3af; text-transform: uppercase; font-size: 9px; }
  .text-right { text-align: right; }
  .font-mono { font-family: monospace; }
  .color-ingreso { color: #34d399; }
  .color-egreso { color: #f43f5e; }
  .empty-text { font-size: 10.5px; color: #4b5563; font-style: italic; }
  .btn-print { text-align: center; margin-top: 40px; border-top: 1px solid #1f2937; padding-top: 25px; }
  .btn-action { background-color: #3b82f6; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; cursor: pointer; }
  @media print {
    body { background-color: #fff !important; color: #111827 !important; padding: 0; }
    .report-container { border: none !important; box-shadow: none !important; padding: 0 !important; background-color: #fff !important; }
    .header h1, .card-title { color: #111827 !important; }
    .fin-card, .sum-box, .mov-item, th, .card-block, .table-card { background-color: #f9fafb !important; border-color: #cbd5e1 !important; color: #111827 !important; }
    .btn-print { display: none; }
  }
</style>
</head>
<body>
<div class="report-container">
  <div class="header">
    <div>
      <h1>Cuentas Claras</h1>
      <p>Reporte Consolidado de Finanzas Personales</p>
    </div>
    <div class="timestamp-badge">
      <strong>Fecha:</strong> ${new Date().toLocaleDateString("es-AR")}<br>
      <strong>Hora:</strong> ${new Date().toLocaleTimeString("es-AR", {hour: '2-digit', minute:'2-digit'})}hs
    </div>
  </div>

  <div class="financial-grid">
    <div class="fin-card">
      <h3>Disponible Consolidado</h3>
      <p class="amount">${formatPesos(totalDisp)}</p>
    </div>
    <div class="fin-card">
      <h3>Ahorro Acumulado</h3>
      <p class="amount" style="color: #f472b6;">${formatPesos(state.ahorro_acumulado as number)}</p>
    </div>
  </div>

  <div class="section-title">💳 Reporte Detallado de Tarjetas de Crédito</div>
  ${cardsHtml}

  <div class="section-title wallet">📱 Movimientos Recientes de Billeteras Virtuales</div>
  <div class="table-card">
    <table>
      <thead>
        <tr><th>Fecha y Hora</th><th>Billetera</th><th>Detalle / Concepto</th><th class="text-right">Monto</th></tr>
      </thead>
      <tbody>${walletMovsHtml}</tbody>
    </table>
  </div>

  <div class="section-title income">💵 Registro de Ingresos Totales</div>
  <div class="table-card">
    <table>
      <thead>
        <tr><th>Fecha y Hora</th><th>Cuenta Destino</th><th>Detalle / Concepto</th><th class="text-right">Monto</th></tr>
      </thead>
      <tbody>${incomesHtml}</tbody>
    </table>
  </div>

  <div class="section-title" style="border-left: 4px solid #f59e0b !important; color: #f59e0b !important;">🔄 Registro de Traspasos entre Cuentas</div>
  <div class="table-card">
    <table>
      <thead>
        <tr><th>Fecha y Hora</th><th>Cuentas (Origen ➜ Destino)</th><th>Detalle / Concepto</th><th class="text-right">Monto</th></tr>
      </thead>
      <tbody>${transfersHtml}</tbody>
    </table>
  </div>

  <div class="btn-print">
    <button class="btn-action" onclick="window.print()">🖨️ Guardar como PDF / Imprimir Reporte</button>
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_cuentas_claras_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAccountLabel = (key: string): string => {
    const labels: Record<string, string> = {
      publicos_cuenta_dni: "Públicos / Cuenta DNI",
      huailen: "Huailen",
      schweitzer: "Schweitzer",
      naranja_x: "Naranja X",
      mercado_pago: "Mercado Pago"
    };
    return labels[key] || key;
  };

  const handleExpenseOptionChange = (val: string) => {
    setExpenseOption(val);
    if (!state) return;
    if (val.startsWith("gasto_fijo:")) {
      const key = val.replace("gasto_fijo:", "");
      const fixedExpense = state.gastos_fijos[key as keyof typeof state.gastos_fijos];
      if (fixedExpense) {
        setExpenseAmount(fixedExpense.total.toString());
        setExpenseConcept(fixedExpense.name);
        const mappedSource = getMedioKeyForGastoFijo(fixedExpense);
        setExpensePaymentSource(mappedSource);
      }
    } else {
      setExpenseAmount("");
      setExpenseConcept("");
    }
  };

  const getMedioKeyForGastoFijo = (fixedExpense: FixedExpense) => {
    if (!fixedExpense) return "mercado_pago";
    const mapped = mapMedioToAccountKey(fixedExpense.medio);
    if (mapped) return mapped;
    const m = fixedExpense.medio.toUpperCase();
    if (m.includes("NARANJA VISA")) return "tarjeta:naranja_visa";
    if (m.includes("NARANJA")) return "tarjeta:naranja";
    if (m.includes("BCO PROVINCIA") || m.includes("PROVINCIA")) return "tarjeta:visa_bco_provincia";
    if (m.includes("MERCADOLIBRE") || m.includes("ML")) return "tarjeta:mercadolibre";
    return "mercado_pago";
  };

  const handleRegisterExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto inválido", "Por favor ingrese un monto de gasto válido mayor a cero.");
      return;
    }

    let concept = expenseConcept.trim();
    let isFixedExpense = false;
    let fixedExpenseKey = "";

    if (expenseOption.startsWith("gasto_fijo:")) {
      isFixedExpense = true;
      fixedExpenseKey = expenseOption.replace("gasto_fijo:", "");
      const fixedExpense = state.gastos_fijos[fixedExpenseKey as keyof typeof state.gastos_fijos];
      if (!concept) {
        concept = fixedExpense ? fixedExpense.name : fixedExpenseKey.toUpperCase();
      }
    }

    if (!concept) {
      showError("Detalle faltante", "Por favor ingrese un concepto o detalle descriptivo para la compra.");
      return;
    }

    const updatedState = { ...state };
    const isCreditCard = expensePaymentSource.startsWith("tarjeta:");
    let paymentLabel = "";
    let finalAmount = amount;
    let originalConcept = concept;

    if (isCreditCard) {
      const cardKey = expensePaymentSource.replace("tarjeta:", "");
      const card = updatedState.tarjetas[cardKey as keyof typeof state.tarjetas];
      if (card) {
        if (!card.cargos) card.cargos = [];
        if (!card.movimientosActuales) card.movimientosActuales = [];
        
        const instCount = parseInt(expenseInstallments) || 1;
        if (instCount > 1) {
          finalAmount = Number((amount / instCount).toFixed(2));
          concept = `${concept} (Cuota 1/${instCount} - Total: ${formatPesos(amount)})`;
        }

        const limitValue = card.limite || 200000.00;
        const totalAfter = Number((card.total + finalAmount).toFixed(2));
        if (totalAfter > limitValue) {
          showError(
            "Límite de crédito superado",
            `El cargo excede el límite de crédito establecido para la tarjeta de crédito ${card.name}.\n\nLímite establecido: ${formatPesos(limitValue)}\nConsumo acumulador actual: ${formatPesos(card.total)}\nMonto libre para cargos: ${formatPesos(limitValue - card.total)}\nCargo que se intentó registrar: ${formatPesos(finalAmount)}`
          );
          return;
        }

        const newGasto = { id: `manual_gasto_cc_${Date.now()}`, name: concept, amount: finalAmount };
        card.cargos.push(newGasto);
        card.movimientosActuales.push(newGasto);
        card.total = Number((card.total + finalAmount).toFixed(2));
        paymentLabel = card.name;
        
        if (instCount > 1) {
          updatedState.ultimo_movimiento = `Compra en ${card.name}: ${concept} [Cuota de ${formatPesos(finalAmount)}]`;
        } else {
          updatedState.ultimo_movimiento = `Compra cargada en tarjeta ${card.name}: ${concept} ($${amount.toFixed(2)})`;
        }
      } else {
        showError("Tarjeta no encontrada", "La tarjeta seleccionada no se encuentra registrada en el sistema.");
        return;
      }
    } else {
      const accountKey = expensePaymentSource;
      const accountBalance = updatedState.disponible[accountKey as keyof typeof state.disponible];
      if (accountBalance !== undefined) {
        if (accountBalance < amount) {
          showError(
            "Saldo insuficiente",
            `No posees saldo disponible suficiente en la cuenta ${getAccountLabel(accountKey)}.\n\nFondo actual en cuenta: ${formatPesos(accountBalance)}\nValor del gasto que intentaste debitar: ${formatPesos(amount)}\nFaltan: ${formatPesos(amount - accountBalance)}`
          );
          return;
        }
        updatedState.disponible[accountKey as keyof typeof state.disponible] = Number((accountBalance - amount).toFixed(2));
        paymentLabel = getAccountLabel(accountKey);
        updatedState.ultimo_movimiento = `Compra debitada de ${paymentLabel}: ${concept} ($${amount.toFixed(2)})`;
      } else {
        showError("Cuenta no encontrada", "La cuenta de pago seleccionada no se encuentra registrada.");
        return;
      }
    }

    if (isFixedExpense) {
      const fixedExpense = updatedState.gastos_fijos[fixedExpenseKey as keyof typeof state.gastos_fijos];
      if (fixedExpense) {
        fixedExpense.paid = true;
        fixedExpense.total = amount; 
        fixedExpense.medio = isCreditCard ? expensePaymentSource.replace("tarjeta:", "").toUpperCase() : getAccountLabel(expensePaymentSource);
      }
    }

    updatedState.historial_movimientos = [
      {
        id: `manual_egreso_${Date.now()}`,
        date: new Date().toISOString(),
        description: isCreditCard && (parseInt(expenseInstallments) || 1) > 1 
          ? `Gasto Tarjeta (1/${expenseInstallments}): ${originalConcept}` 
          : `Gasto: ${concept}`,
        amount: finalAmount,
        type: "egreso",
        sourceAccount: paymentLabel
      },
      ...updatedState.historial_movimientos
    ];

    setExpenseAmount("");
    setExpenseConcept("");
    setExpenseOption("otro");
    setExpenseInstallments("1");
    
    await handleSyncState(updatedState);
  };

  const handleRegisterIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto inválido", "Por favor ingrese un monto de ingreso válido mayor a cero.");
      return;
    }
    if (!incomeConcept.trim()) {
      showError("Concepto faltante", "Por favor ingrese un concepto descriptivo para el ingreso.");
      return;
    }

    const updatedState = { ...state };
    const accountLabel = getAccountLabel(incomeAccount);

    if (updatedState.disponible[incomeAccount as keyof typeof state.disponible] !== undefined) {
      const prev = updatedState.disponible[incomeAccount as keyof typeof state.disponible];
      updatedState.disponible[incomeAccount as keyof typeof state.disponible] = Number((prev + amount).toFixed(2));
      updatedState.ultimo_movimiento = `Ingreso registrado: ${incomeConcept} por $${amount.toFixed(2)} en ${accountLabel}`;

      updatedState.historial_movimientos = [
        {
          id: `income_${Date.now()}`,
          date: new Date().toISOString(),
          description: `Ingreso manual: ${incomeConcept} en ${accountLabel}`,
          amount: amount,
          type: "ingreso",
          sourceAccount: accountLabel
        },
        ...updatedState.historial_movimientos
      ];

      setIncomeAmount("");
      setIncomeConcept("");
      await handleSyncState(updatedState);
    }
  };

  const handleRegisterTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto inválido", "Por favor ingrese un monto de transferencia válido mayor a cero.");
      return;
    }

    if (transferOrigin === transferDestination) {
      showError("Cuentas idénticas", "La cuenta de origen y la de destino no pueden ser la misma.");
      return;
    }

    const updatedState = { ...state };
    const balanceOrig = updatedState.disponible[transferOrigin as keyof typeof state.disponible];
    const balanceDest = updatedState.disponible[transferDestination as keyof typeof state.disponible];

    if (balanceOrig === undefined || balanceDest === undefined) {
      showError("Cuenta no encontrada", "Alguna de las cuentas seleccionadas no fue encontrada en el sistema.");
      return;
    }

    if (balanceOrig < amount) {
      showError(
        "Saldo insuficiente",
        `La cuenta de origen (${getAccountLabel(transferOrigin)}) posee un saldo disponible de ${formatPesos(balanceOrig)}, pero intentaste traspasar ${formatPesos(amount)}.`
      );
      return;
    }

    updatedState.disponible[transferOrigin as keyof typeof state.disponible] = Number((balanceOrig - amount).toFixed(2));
    updatedState.disponible[transferDestination as keyof typeof state.disponible] = Number((balanceDest + amount).toFixed(2));

    const originLabel = getAccountLabel(transferOrigin);
    const destLabel = getAccountLabel(transferDestination);
    const concept = transferConcept.trim() || `Traspaso de fondos`;

    updatedState.ultimo_movimiento = `Traspaso: de ${originLabel} a ${destLabel} por $${amount.toFixed(2)}`;

    updatedState.historial_movimientos = [
      {
        id: `transfer_${Date.now()}`,
        date: new Date().toISOString(),
        description: `Traspaso: ${concept}`,
        amount: amount,
        type: "transferencia",
        sourceAccount: originLabel,
        destAccount: destLabel
      },
      ...updatedState.historial_movimientos
    ];

    setTransferAmount("");
    setTransferConcept("Traspaso de sueldo");
    await handleSyncState(updatedState);
  };

  const handleCreateApartado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;
    const name = newApartadoName.trim();
    if (!name) {
      showError("Información incompleta", "Por favor ingrese un nombre adecuado para el apartado.");
      return;
    }
    
    const updatedState = { ...state };
    if (!updatedState.ahorros_apartados) {
      updatedState.ahorros_apartados = {};
    }
    
    const exists = Object.keys(updatedState.ahorros_apartados).some(
      k => k.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      showError("Apartado duplicado", "Ya tienes un apartado de ahorro con ese nombre.");
      return;
    }
    
    updatedState.ahorros_apartados[name] = 0;
    updatedState.ultimo_movimiento = `Nuevo apartado de ahorro creado: "${name}"`;
    
    setNewApartadoName("");
    setShowCreateApartado(false);
    await handleSyncState(updatedState);
  };

  const handleDeleteApartado = async (key: string) => {
    if (!state) return;
    const updatedState = { ...state };
    if (!updatedState.ahorros_apartados) return;
    
    const val = updatedState.ahorros_apartados[key] || 0;
    const confirmMessage = val > 0 
      ? `¿Estás seguro de eliminar el apartado "${key}"? Al hacerlo, sus fondos de ${formatPesos(val)} pasarán a ser General (Sin Asignar).`
      : `¿Estás seguro de eliminar el apartado de ahorro "${key}"?`;
      
    if (!window.confirm(confirmMessage)) return;
    
    delete updatedState.ahorros_apartados[key];
    updatedState.ultimo_movimiento = `Apartado de ahorro eliminado: "${key}"`;
    await handleSyncState(updatedState);
  };

  const handleSavingsAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !fundingApartadoKey || !fundingActionType) return;
    
    const amount = parseFloat(savingsActionAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto inválido", "Por favor ingrese un monto de ahorro válido mayor a cero.");
      return;
    }
    
    const updatedState = { ...state };
    if (!updatedState.ahorros_apartados) updatedState.ahorros_apartados = {};
    
    const currentGoalBalance = updatedState.ahorros_apartados[fundingApartadoKey] || 0;
    const sourceLabel = getAccountLabel(savingsSourceAccount);
    
    if (fundingActionType === "depositar") {
      const balanceOrig = updatedState.disponible[savingsSourceAccount as keyof typeof state.disponible];
      if (balanceOrig === undefined) return;
      
      if (balanceOrig < amount) {
        showError(
          "Saldo insuficiente",
          `La cuenta de origen (${sourceLabel}) posee un saldo de ${formatPesos(balanceOrig)}, el cual es inferior al monto que intentaste separar (${formatPesos(amount)}).`
        );
        return;
      }
      
      updatedState.disponible[savingsSourceAccount as keyof typeof state.disponible] = Number((balanceOrig - amount).toFixed(2));
      updatedState.ahorros_apartados[fundingApartadoKey] = Number((currentGoalBalance + amount).toFixed(2));
      updatedState.ahorro_acumulado = Number((updatedState.ahorro_acumulado + amount).toFixed(2));
      updatedState.ultimo_movimiento = `Ahorro apartado: se extrajeron ${formatPesos(amount)} de ${sourceLabel} para "${fundingApartadoKey}"`;
      
      updatedState.historial_movimientos = [
        {
          id: `ahorro_dep_${Date.now()}`,
          date: new Date().toISOString(),
          description: `Aporte a apartado "${fundingApartadoKey}" desde ${sourceLabel}`,
          amount: amount,
          type: "ahorro",
          sourceAccount: sourceLabel
        },
        ...updatedState.historial_movimientos
      ];
    } else if (fundingActionType === "retirar") {
      if (currentGoalBalance < amount) {
        showError(
          "Ahorros insuficientes",
          `No posees la cantidad especificada en el apartado de ahorro "${fundingApartadoKey}".\n\nFondos acumulados aquí: ${formatPesos(currentGoalBalance)}\nMonto solicitado: ${formatPesos(amount)}`
        );
        return;
      }
      
      const balanceDest = updatedState.disponible[savingsSourceAccount as keyof typeof state.disponible];
      if (balanceDest === undefined) return;
      
      updatedState.disponible[savingsSourceAccount as keyof typeof state.disponible] = Number((balanceDest + amount).toFixed(2));
      updatedState.ahorros_apartados[fundingApartadoKey] = Number((currentGoalBalance - amount).toFixed(2));
      updatedState.ahorro_acumulado = Number((updatedState.ahorro_acumulado - amount).toFixed(2));
      updatedState.ultimo_movimiento = `Retiro de ahorro: se extrajeron ${formatPesos(amount)} del apartado "${fundingApartadoKey}" hacia ${sourceLabel}`;
      
      updatedState.historial_movimientos = [
        {
          id: `ahorro_ret_${Date.now()}`,
          date: new Date().toISOString(),
          description: `Retiro de apartado "${fundingApartadoKey}" hacia ${sourceLabel}`,
          amount: amount,
          type: "egreso",
          sourceAccount: sourceLabel
        },
        ...updatedState.historial_movimientos
      ];
    }
    
    setSavingsActionAmount("");
    setFundingApartadoKey(null);
    setFundingActionType(null);
    await handleSyncState(updatedState);
  };

  const handleAddCardCharge = async (cardKey: string) => {
    if (!state) return;
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Monto inválido", "Por favor ingrese un monto de cargo válido mayor a cero.");
      return;
    }
    if (!chargeName.trim()) {
      showError("Detalle faltante", "Por favor ingrese el nombre u origen del cargo a agregar.");
      return;
    }

    const updatedState = { ...state };
    const card = updatedState.tarjetas[cardKey as keyof typeof state.tarjetas];
    if (card) {
      if (!card.cargos) card.cargos = [];
      if (!card.movimientosActuales) card.movimientosActuales = [];

      const limitValue = card.limite || 200000.00;
      const totalAfter = Number((card.total + amount).toFixed(2));
      if (totalAfter > limitValue) {
        showError(
          "Límite de crédito superado",
          `El cargo que intentas registrar en la tarjeta ${card.name} supera el límite fijado.\n\nLímite de crédito: ${formatPesos(limitValue)}\nConsumo acumulador actual: ${formatPesos(card.total)}\nMonto restante para compras: ${formatPesos(limitValue - card.total)}\nValor del cargo pretendido: ${formatPesos(amount)}`
        );
        return;
      }

      const newCharge = { id: `charge_${Date.now()}`, name: chargeName, amount: amount };
      card.cargos.push(newCharge);
      card.movimientosActuales.push(newCharge);
      card.total = Number((card.total + amount).toFixed(2));
      updatedState.ultimo_movimiento = `Cargo registrado en ${card.name}: ${chargeName} ($${amount.toFixed(2)})`;

      updatedState.historial_movimientos = [
        {
          id: `charge_add_${Date.now()}`,
          date: new Date().toISOString(),
          description: `Cargo adicionado en ${card.name}: ${chargeName}`,
          amount: amount,
          type: "egreso"
        },
        ...updatedState.historial_movimientos
      ];

      setChargeName("");
      setChargeAmount("");
      await handleSyncState(updatedState);
    }
  };

  const handleUpdateCardLimit = async (cardKey: string, newLimitString: string) => {
    if (!state) return;
    const amount = parseFloat(newLimitString);
    if (isNaN(amount) || amount < 0) {
      showError("Límite de crédito inválido", "Por favor ingrese un límite de crédito válido mayor o igual a cero.");
      return;
    }
    const updatedState = { ...state };
    const card = updatedState.tarjetas[cardKey as keyof typeof state.tarjetas];
    if (card) {
      const oldLimit = card.limite || 200000.00;
      card.limite = Number(amount.toFixed(2));
      updatedState.ultimo_movimiento = `Límite de tarjeta ${card.name} modificado de ${formatPesos(oldLimit)} a ${formatPesos(card.limite)}`;
      
      setEditingCardLimitKey(null);
      setEditCardLimitValue("");
      await handleSyncState(updatedState);
    }
  };

  const payCardWithSpecificAccount = async (cardKey: string, accountKey: string) => {
    if (!state) return;
    const updatedState = { ...state };
    const card = updatedState.tarjetas[cardKey as keyof typeof state.tarjetas];
    
    if (card) {
      const balance = updatedState.disponible[accountKey as keyof typeof state.disponible];
      const debitAmount = card.total;
      
      if (balance === undefined) return;
      if (balance < debitAmount) {
        showError(
          "Saldo insuficiente",
          `No posees saldo suficiente en la cuenta de débito ${getAccountLabel(accountKey)} para liquidar la tarjeta ${card.name}.\n\nSaldo disponible: ${formatPesos(balance)}\nTotal requerido por la tarjeta: ${formatPesos(debitAmount)}\nFaltan: ${formatPesos(debitAmount - balance)}`
        );
        return;
      }

      updatedState.disponible[accountKey as keyof typeof state.disponible] = Number((balance - debitAmount).toFixed(2));
      card.paid = true;
      updatedState.ultimo_movimiento = `Tarjeta ${card.name} liquidada con Disponible de ${getAccountLabel(accountKey)} por un total de $${debitAmount.toFixed(2)}`;

      updatedState.historial_movimientos = [
        {
          id: `pay_cc_${Date.now()}`,
          date: new Date().toISOString(),
          description: `Pago total de tarjeta ${card.name} debitada de ${getAccountLabel(accountKey)}`,
          amount: debitAmount,
          type: "pago_tarjeta",
          sourceAccount: getAccountLabel(accountKey)
        },
        ...updatedState.historial_movimientos
      ];

      setSelectedCardDetail(null);
      await handleSyncState(updatedState);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Fallo al consultar el servidor.");
      const data = await res.json();
      setState(data);
      setSyncStatus("synced");
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncState = async (updatedState: FinancialState) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedState)
      });
      if (!res.ok) throw new Error("Fallo al guardar estado.");
      const data = await res.json();
      setState(data.state);
      setSyncStatus("synced");
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("¿Seguro que deseas reiniciar el estado financiero a los valores iniciales? Se borrarán los cambios recientes.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      setState(data.state);
      setSyncStatus("synced");
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
     } finally {
      setLoading(false);
    }
  };

  const toggleGastoFijoPaid = async (key: string) => {
    if (!state) return;
    const updatedState = { ...state };
    const expense = updatedState.gastos_fijos[key as keyof typeof state.gastos_fijos];
    if (expense) {
      expense.paid = !expense.paid;
      updatedState.ultimo_movimiento = `${expense.paid ? "Marcado como pagado" : "Marcado como no pagado"}: ${expense.name} por un valor de $${expense.total.toFixed(2)}`;
      
      updatedState.historial_movimientos = [
        {
          id: `manual_gf_${Date.now()}`,
          date: new Date().toISOString(),
          description: expense.paid ? `Control visual: ${expense.name} Pagado` : `Control visual: ${expense.name} Pendiente`,
          amount: expense.total,
          type: "pago_gasto_fijo",
          sourceAccount: expense.medio
        },
        ...updatedState.historial_movimientos
      ];

      await handleSyncState(updatedState);
    }
  };

  const toggleTarjetaPaid = async (key: string) => {
    if (!state) return;
    const updatedState = { ...state };
    const card = updatedState.tarjetas[key as keyof typeof state.tarjetas];
    if (card) {
      const originalPaid = card.paid;
      const refundSource = "mercado_pago";

      if (!originalPaid) {
        if (!window.confirm(`¿Confirmas que pagaste el total de ${card.name} (${formatPesos(card.total)}) con fondos de Mercado Pago?`)) {
          return; 
        }
        updatedState.disponible[refundSource] = Number((updatedState.disponible[refundSource] - card.total).toFixed(2));
      } else {
        if (!window.confirm(`¿Deseas revertir el pago de ${card.name}? Se reintegrarán ${formatPesos(card.total)} a Mercado Pago.`)) {
          return;
        }
        updatedState.disponible[refundSource] = Number((updatedState.disponible[refundSource] + card.total).toFixed(2));
      }

      card.paid = !originalPaid;
      updatedState.ultimo_movimiento = `${card.paid ? "PAGADA" : "PENDIENTE"}: Tarjeta ${card.name} por valor de $${card.total.toFixed(2)}`;
      
      updatedState.historial_movimientos = [
        {
          id: `manual_tj_${Date.now()}`,
          date: new Date().toISOString(),
          description: card.paid ? `Liquidación tarjeta ${card.name} con Mercado Pago` : `Restablecimiento de saldo de tarjeta ${card.name}`,
          amount: card.total,
          type: "pago_tarjeta",
          sourceAccount: "MERCADO PAGO"
        },
        ...updatedState.historial_movimientos
      ];

      await handleSyncState(updatedState);
    }
  };

  const mapMedioToAccountKey = (medio: string): string | null => {
    const m = medio.toUpperCase();
    if (m.includes("PÚBLICOS") || m.includes("CUENTA DNI") || m.includes("DNI")) return "publicos_cuenta_dni";
    if (m.includes("HUAILEN")) return "huailen";
    if (m.includes("SCHWEITZER")) return "schweitzer";
    if (m.includes("NARANJA X") || m.includes("NARANJA_X")) return "naranja_x";
    if (m.includes("MERCADO PAGO") || m.includes("MERCADO_PAGO") || m.includes("MP")) return "mercado_pago";
    return null;
  };

  const startEditBalance = (key: string, value: number) => {
    setIsEditingBalance(key);
    setEditValue(value.toString());
  };

  const saveEditedBalance = async (key: string) => {
    if (!state) return;
    const num = parseFloat(editValue);
    if (isNaN(num)) {
      showError("Monto inválido", "Por favor ingrese un número flotante válido.");
      return;
    }

    const updatedState = { ...state };
    const isDisponible = key in updatedState.disponible;
    
    if (isDisponible) {
      const prev = updatedState.disponible[key as keyof typeof state.disponible];
      updatedState.disponible[key as keyof typeof state.disponible] = num;
      updatedState.ultimo_movimiento = `Ajuste manual del saldo de ${key.toUpperCase()} de $${prev} a $${num}`;
    } else if (key === "ahorro_acumulado") {
      const prev = updatedState.ahorro_acumulado;
      updatedState.ahorro_acumulado = num;
      updatedState.ultimo_movimiento = `Ajuste manual del Ahorro Acumulado de $${prev} a $${num}`;
    }

    updatedState.historial_movimientos = [
      {
        id: `manual_edit_${Date.now()}`,
        date: new Date().toISOString(),
        description: `Conversión manual de saldo para ${key}`,
        amount: Math.abs(num),
        type: "transferencia"
      },
      ...updatedState.historial_movimientos
    ];

    setIsEditingBalance(null);
    await handleSyncState(updatedState);
  };

  const handleProcessSuccess = (updatedState: any, transcription: string, explanation: string) => {
    setState(updatedState);
    setSyncStatus("synced");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4" id="loading_state">
        <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
        <div className="text-center">
          <p className="font-mono text-xs text-cyan-400 tracking-wider">AG-FIN-NODO INITIALIZING</p>
          <p className="text-slate-400 text-sm mt-1">Leyendo base de saldos financieros...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4" id="error_state">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-slate-200 font-semibold">Error al conectar con la base de datos financiera</p>
        <button onClick={fetchState} className="bg-slate-900 border border-slate-700 hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold" type="button">
          Reintentar Carga
        </button>
      </div>
    );
  }

  const formatPesos = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const totalDisponible = (Object.values(state.disponible) as number[]).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-4 md:p-6 lg:p-8 flex flex-col gap-6" id="financial_app_root">
      
      {/* HEADER NODE */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden" id="node_header">
        <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500" />
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CUENTAS CLARAS</h1>
          <p className="text-slate-400 text-xxs mt-0.5 font-medium">Control de pesos y centavos exactos</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
            {syncStatus === "synced" && (
              <span className="text-xxs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Conectado
              </span>
            )}
            {syncStatus === "syncing" && (
              <span className="text-xxs font-semibold text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>Guardando
              </span>
            )}
            {syncStatus === "error" && (
              <span className="text-xxs font-semibold text-red-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>Sin conexión
              </span>
            )}
            <button onClick={fetchState} disabled={processing} className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-200 transition-colors" type="button">
              <RefreshCw className={`w-3 h-3 ${processing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <button onClick={handleDownloadReport} className="p-2 bg-pink-600/20 hover:bg-pink-600 hover:shadow-lg text-pink-300 hover:text-white rounded-xl border border-pink-500/20 transition-all text-xxs font-bold flex items-center gap-1.5 uppercase tracking-wider" type="button">
            <Download className="w-3.5 h-3.5 text-pink-400 hover:text-white transition-colors animate-pulse" />
            <span>Descargar Reporte</span>
          </button>

          <button onClick={handleReset} className="p-2 bg-slate-900 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-800 transition-all hover:border-red-900/30 text-xxs font-semibold flex items-center gap-1.5" type="button">
            <Database className="w-3.5 h-3.5 text-slate-500 hover:text-red-400 transition-colors" />
            <span>Restablecer</span>
          </button>
        </div>
      </header>

      {/* THREE MODULE MAIN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="main_bento_grid">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 💰 DISPONIBLE PANEL */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-md" id="disponible_container">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
              <div className="border-b border-slate-800/60 pb-2.5 mb-4 flex justify-between items-start">
                <h2 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>💰 Disponible Consolidado
                </h2>
                <Coins className="w-5 h-5 text-cyan-400/80" />
              </div>

              <div className="py-2.5">
                <p className="text-4xl font-black text-white font-mono tracking-tight">{formatPesos(totalDisponible)}</p>
              </div>

              <div className="space-y-4 mt-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-cyan-950/20 py-1 px-2.5 rounded-lg border border-cyan-500/10">
                    <span className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase">🏦 Cajas de Ahorro</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {["publicos_cuenta_dni", "huailen", "schweitzer"].map((key) => {
                      const value = state.disponible[key as keyof typeof state.disponible];
                      if (value === undefined) return null;
                      return (
                        <div key={key} className={`flex justify-between items-center py-2 px-3 rounded-lg border transition-all ${isEditingBalance === key ? "bg-slate-950 border-cyan-800" : "bg-cyan-950/10 border-cyan-900/15 text-cyan-200 hover:bg-cyan-900/10 hover:border-cyan-800/30"}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <div>
                              <span className="text-xs font-semibold block">{getAccountLabel(key)}</span>
                              {key === "publicos_cuenta_dni" && <span className="text-[9px] text-cyan-400/60 block">Espejo con Cuenta DNI</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingBalance === key ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-slate-400">$</span>
                               <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs px-1 py-0.5 rounded focus:outline-none" autoFocus />
                                <button onClick={() => saveEditedBalance(key)} className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xxs transition-all" type="button"><Check className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <>
                                <span className="font-mono font-bold text-cyan-100 text-xs">{formatPesos(value)}</span>
                                <button onClick={() => startEditBalance(key, value)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors" type="button"><Edit2 className="w-2.5 h-2.5" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-amber-950/20 py-1 px-2.5 rounded-lg border border-amber-500/10">
                    <span className="text-[9px] font-bold text-amber-500 tracking-wider uppercase">📱 Billeteras Virtuales</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {["naranja_x", "mercado_pago"].map((key) => {
                      const value = state.disponible[key as keyof typeof state.disponible];
                      if (value === undefined) return null;
                      return (
                        <div key={key} className={`flex justify-between items-center py-2 px-3 rounded-lg border transition-all ${isEditingBalance === key ? "bg-slate-950 border-amber-800" : "bg-amber-950/10 border-amber-900/15 text-amber-200 hover:bg-amber-900/10 hover:border-amber-800/30"}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-xs font-semibold block">{getAccountLabel(key)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingBalance === key ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-slate-400">$</span>
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs px-1 py-0.5 rounded focus:outline-none" autoFocus />
                                <button onClick={() => saveEditedBalance(key)} className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xxs transition-all" type="button"><Check className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <>
                                <span className="font-mono font-bold text-amber-100 text-xs">{formatPesos(value)}</span>
                                <button onClick={() => startEditBalance(key, value)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors" type="button"><Edit2 className="w-2.5 h-2.5" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 🐷 AHORRO ACUMULADO */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden font-sans" id="ahorros_container">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl" />
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-slate-800/60 pb-2.5">
                  <h2 className="text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse"></span>🐷 Ahorro Acumulado
                  </h2>
                  <PiggyBank className="w-5 h-5 text-pink-400/80" />
                </div>

                <div className="py-1.5 flex items-center justify-between">
                  {isEditingBalance === "ahorro_acumulado" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-lg text-pink-400">$</span>
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-36 bg-slate-950 border border-slate-700 text-slate-100 font-mono text-lg px-2 py-0.5 rounded focus:outline-none" autoFocus />
                      <button onClick={() => saveEditedBalance("ahorro_acumulado")} className="p-1 px-2 bg-pink-600 hover:bg-pink-500 text-white rounded text-xs font-semibold transition-all" type="button">OK</button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-black text-white font-mono tracking-tight">{formatPesos(state.ahorro_acumulado)}</p>
                      <button onClick={() => startEditBalance("ahorro_acumulado", state.ahorro_acumulado)} className="p-1 text-slate-500 hover:text-slate-300 transition-colors" type="button"><Edit2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>

                {(() => {
                  const apartados: Record<string, number> = (state.ahorros_apartados as Record<string, number>) || {};
                  const totalApartados = Object.values(apartados).reduce((sum: number, val: number) => sum + (val || 0), 0);
                  const generalAhorro = Math.max(0, state.ahorro_acumulado - totalApartados);

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xxs font-sans font-medium">
                        <div className="bg-pink-950/20 border border-pink-900/30 p-2 rounded-xl">
                          <span className="text-slate-400 block mb-0.5">💰 General (Sin Asignar)</span>
                          <span className="text-pink-100 font-mono font-bold text-xs">{formatPesos(generalAhorro)}</span>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800 p-2 rounded-xl">
                          <span className="text-slate-400 block mb-0.5">🎯 Fondos Específicos</span>
                          <span className="text-white font-mono font-bold text-xs">{formatPesos(totalApartados)}</span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                        {state.ahorro_acumulado > 0 && (
                          <>
                            <div style={{ width: `${(generalAhorro / state.ahorro_acumulado) * 100}%` }} className="h-full bg-pink-500 transition-all duration-500" />
                            <div style={{ width: `${(totalApartados / state.ahorro_acumulado) * 100}%` }} className="h-full bg-indigo-500 transition-all duration-500" />
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-950/25 py-1.5 px-2.5 rounded-lg border border-slate-850">
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">🎯 Fines Específicos (Apartados)</span>
                          <button type="button" onClick={() => setShowCreateApartado(!showCreateApartado)} className="text-[9px] font-bold text-pink-400 hover:text-pink-300 transition-colors">
                            {showCreateApartado ? "✕ Cancelar" : "➕ Nuevo"}
                          </button>
                        </div>

                        {showCreateApartado && (
                          <form onSubmit={handleCreateApartado} className="p-2 border border-pink-900/30 bg-pink-950/10 rounded-xl space-y-2 animate-fadeIn">
                            <input type="text" value={newApartadoName} onChange={(e) => setNewApartadoName(e.target.value)} placeholder="Ej: Vacaciones, Moto..." className="w-full bg-slate-950 text-slate-200 py-1.5 px-2 border border-slate-800 rounded text-xs focus:border-pink-500 focus:outline-none" required />
                            <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-[9px] uppercase tracking-wider py-1.5 rounded transition-colors cursor-pointer">Confirmar Registro</button>
                          </form>
                        )}

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {Object.keys(apartados).length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic text-center py-2">No registraste apartados específicos aún.</p>
                          ) : (
                            Object.entries(apartados).map(([key, val]) => (
                              <div key={key} className="bg-slate-950/40 hover:bg-slate-950/80 border border-slate-850 p-2 rounded-xl flex flex-col gap-2 transition-all">
                                <div className="flex justify-between items-center">
                                  <div><span className="text-xs font-bold text-slate-200 block">{key}</span></div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-extrabold text-pink-300">{formatPesos(val as number || 0)}</span>
                                    <button type="button" onClick={() => handleDeleteApartado(key)} className="text-slate-500 hover:text-red-400 p-0.5 transition-colors font-extrabold">✕</button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => { setFundingApartadoKey(key); setFundingActionType("depositar"); }} className="px-2 py-0.5 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-emerald-500/15 rounded text-[9.5px] font-bold tracking-tight transition-colors cursor-pointer">📥 Separar</button>
                                  <button type="button" onClick={() => { setFundingApartadoKey(key); setFundingActionType("retirar"); }} className="px-2 py-0.5 bg-amber-600/10 hover:bg-amber-600 hover:text-white text-amber-400 border border-amber-500/15 rounded text-[9.5px] font-bold tracking-tight transition-colors cursor-pointer">📤 Extraer</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {fundingApartadoKey && fundingActionType && (
                          <form onSubmit={handleSavingsAction} className="mt-3 p-3 border border-indigo-900 bg-indigo-950/20 rounded-xl space-y-3 animate-fadeIn">
                            <div className="flex justify-between items-center border-b border-indigo-900 pb-1.5 mb-1.5">
                              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">{fundingActionType === "depositar" ? "📥 Guardar Ahorro en:" : "📤 Extraer Ahorro de:"} <br /><span className="text-white text-xs lowercase first-letter:uppercase">"{fundingApartadoKey}"</span></span>
                              <button type="button" onClick={() => { setFundingApartadoKey(null); setFundingActionType(null); }} className="text-slate-400 hover:text-white text-xxs font-extrabold">✕ Cancelar</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <select value={savingsSourceAccount} onChange={(e) => setSavingsSourceAccount(e.target.value)} className="w-full bg-slate-300 text-slate-800 text-xxs border border-slate-800 rounded-lg p-1.5 font-semibold focus:outline-none">
                                  <optgroup label="🏦 Cajas de Ahorro">
                                    <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                                    <option value="huailen">Huailen</option>
                                    <option value="schweitzer">Schweitzer</option>
                                  </optgroup>
                                  <optgroup label="📱 Billeteras Virtuales">
                                    <option value="naranja_x">Naranja X</option>
                                    <option value="mercado_pago">Market Pago</option>
                                  </optgroup>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <input type="text" value={savingsActionAmount} onChange={(e) => setSavingsActionAmount(e.target.value)} placeholder="Monto" className="w-full bg-slate-950 text-slate-300 text-xxs border border-slate-800 rounded-lg p-1.5 focus:outline-none font-mono" required />
                              </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all text-white rounded py-2 text-xxs font-extrabold tracking-wider uppercase cursor-pointer">Confirmar Acción</button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Último Movimiento Registrado</p>
                <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/40">
                  <p className="text-xs text-emerald-400 font-medium italic leading-relaxed">⚡ "{state.ultimo_movimiento || 'Ninguno registrado'}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* 📝 CARGA DE DATOS */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md" id="cargar_movimientos_panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>📝 Carga de Cuentas & Movimientos
                </h2>
              </div>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 self-start sm:self-center gap-1">
                <button type="button" onClick={() => setActiveFormTab("gasto")} className={`px-3 py-1 text-xxs font-bold uppercase tracking-wider rounded-md transition-all ${activeFormTab === "gasto" ? "bg-rose-600/20 text-rose-300 border border-rose-500/20" : "text-slate-400 hover:text-slate-200"}`}>💸 Registrar Gasto</button>
                <button type="button" onClick={() => setActiveFormTab("ingreso")} className={`px-3 py-1 text-xxs font-bold uppercase tracking-wider rounded-md transition-all ${activeFormTab === "ingreso" ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/20" : "text-slate-400 hover:text-slate-200"}`}>💵 Registrar Ingreso</button>
                <button type="button" onClick={() => setActiveFormTab("transferencia")} className={`px-3 py-1 text-xxs font-bold uppercase tracking-wider rounded-md transition-all ${activeFormTab === "transferencia" ? "bg-amber-600/25 text-amber-300 border border-amber-500/20" : "text-slate-400 hover:text-slate-200"}`}>🔄 Traspasar</button>
              </div>
            </div>

            {activeFormTab === "gasto" && (
              <form onSubmit={handleRegisterExpense} className="space-y-4 font-sans animate-fadeIn">
                <div className={`grid grid-cols-1 ${expensePaymentSource.startsWith("tarjeta:") ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">¿Qué se gastó?</label>
                    <select value={expenseOption} onChange={(e) => handleExpenseOptionChange(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none">
                      <option value="otro">Gasto Extra (Personalizado)</option>
                      <optgroup label="📌 Gasto Fijo">
                        {Object.values(state.gastos_fijos).map((g: FixedExpense) => (
                          <option key={g.key} value={`gasto_fijo:${g.key}`}>{g.name} (${formatPesos(g.total)})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Concepto / Detalle:</label>
                    <input type="text" required value={expenseConcept} onChange={(e) => setExpenseConcept(e.target.value)} placeholder="Supermercado, Nafta, etc." className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Monto total ($):</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">$</span>
                      <input type="number" step="0.01" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 font-mono text-slate-100 text-xs border border-slate-800 rounded-lg pl-6 pr-2 py-2 focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Canal de Pago:</label>
                    <select value={expensePaymentSource} onChange={(e) => setExpensePaymentSource(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2 py-2 focus:outline-none">
                      <optgroup label="🏦 Disponible (Débito)">
                        <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                        <option value="huailen">Huailen</option>
                        <option value="schweitzer">Schweitzer</option>
                        <option value="naranja_x">Naranja X</option>
                        <option value="mercado_pago">Mercado Pago</option>
                      </optgroup>
                      <optgroup label="💳 Tarjetas de Crédito">
                        <option value="tarjeta:naranja">Tarjeta Naranja</option>
                        <option value="tarjeta:naranja_visa">Tarjeta Naranja Visa</option>
                        <option value="tarjeta:visa_bco_provincia">Tarjeta Visa Bco Provincia</option>
                        <option value="tarjeta:mercadolibre">Tarjeta Mercadolibre</option>
                      </optgroup>
                    </select>
                  </div>
                  {expensePaymentSource.startsWith("tarjeta:") && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Cuotas:</label>
                      <select value={expenseInstallments} onChange={(e) => setExpenseInstallments(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2 py-2 focus:outline-none font-mono">
                        <option value="1">1 pago</option>
                        <option value="3">3 cuotas</option>
                        <option value="6">6 cuotas</option>
                        <option value="12">12 cuotas</option>
                      </select>
                    </div>
                  )}
                </div>
                <button type="submit" className="w-full bg-rose-600/20 hover:bg-rose-600 transition-all text-rose-300 hover:text-white border border-rose-500/30 rounded-lg py-1.5 text-xxs font-bold tracking-wider uppercase">Registrar Egreso Manual</button>
              </form>
            )}

            {activeFormTab === "ingreso" && (
              <form onSubmit={handleRegisterIncome} className="space-y-4 font-sans animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">$</span>
                      <input type="number" step="0.01" required value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 font-mono text-slate-100 text-xs border border-slate-800 rounded-lg pl-6 pr-2 py-2 focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <input type="text" required value={incomeConcept} onChange={(e) => setIncomeConcept(e.target.value)} placeholder="Sueldo, Cobro, etc." className="w-full bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <select value={incomeAccount} onChange={(e) => setIncomeAccount(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2 py-2 focus:outline-none">
                      <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                      <option value="huailen">Huailen</option>
                      <option value="schweitzer">Schweitzer</option>
                      <option value="naranja_x">Naranja X</option>
                      <option value="mercado_pago">Mercado Pago</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-600/20 hover:bg-emerald-600 transition-all text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg py-1.5 text-xxs font-bold tracking-wider uppercase">Registrar Ingreso Manual</button>
              </form>
            )}

            {activeFormTab === "transferencia" && (
              <form onSubmit={handleRegisterTransfer} className="space-y-4 font-sans animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <input type="number" step="0.01" required value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 font-mono text-slate-100 text-xs border border-slate-800 rounded-lg py-2 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <input type="text" required value={transferConcept} onChange={(e) => setTransferConcept(e.target.value)} placeholder="Concepto" className="w-full bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <select value={transferOrigin} onChange={(e) => setTransferOrigin(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none">
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="naranja_x">Naranja X</option>
                      <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                      <option value="huailen">Huailen</option>
                      <option value="schweitzer">Schweitzer</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <select value={transferDestination} onChange={(e) => setTransferDestination(e.target.value)} className="w-full bg-slate-950 text-slate-300 text-xs border border-slate-800 rounded-lg px-2.5 py-2 focus:outline-none">
                      <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                      <option value="huailen">Huailen</option>
                      <option value="schweitzer">Schweitzer</option>
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="naranja_x">Naranja X</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-amber-600/25 hover:bg-amber-600 transition-all text-amber-300 hover:text-white border border-amber-500/30 rounded-lg py-1.5 text-xxs font-bold tracking-wider uppercase flex items-center justify-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5" /><span>Confirmar Traspaso</span>
                </button>
              </form>
            )}
          </div>

          {/* 📌 GASTOS FIJOS PANEL */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md" id="gastos_fijos_container">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-2.5">
              <h2 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>📌 Gastos Fijos & Alertas
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(state.gastos_fijos).map((expense: FixedExpense) => {
                const hasAlert = !!expense.alertIncrement;
                return (
                  <div key={expense.key} onClick={() => toggleGastoFijoPaid(expense.key)} className={`cursor-pointer transition-all rounded-xl p-3.5 flex flex-col gap-1.5 border hover:scale-[1.01] ${expense.paid ? "bg-emerald-950/20 border-emerald-500/20 text-slate-300" : hasAlert ? "bg-red-950/10 border-red-500/20 text-slate-200" : "bg-slate-950/40 border-slate-800 text-slate-200"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2">
                        {expense.paid ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 shrink-0" />}
                        <div>
                          <span className="text-xs font-bold block">{expense.name}</span>
                          <span className="text-[9px] text-slate-500 uppercase">Medio: {expense.medio}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-slate-100 block">{formatPesos(expense.total)}</span>
                        <span className="text-[9px] text-slate-500 block">Mes Ant: {formatPesos(expense.historyPrice)}</span>
                      </div>
                    </div>
                    {hasAlert && !expense.paid && (
                      <div className="bg-red-950/40 border border-red-900/40 p-2 rounded-lg flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-red-300 font-medium">{expense.alertIncrement}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 💳 CREDIT CARDS */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md" id="tarjetas_container">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-2.5">
              <h2 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>💳 Tarjetas de Crédito
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(state.tarjetas).map(([key, card]: [string, CreditCard]) => {
                const limitsArr: Record<string, number> = { naranja: 250000.00, naranja_visa: 300000.00, visa_bco_provincia: 500000.00, mercadolibre: 150000.00 };
                const cardLimit = card.limite || limitsArr[key] || 100000;
                const progressPercentage = Math.min(100, (card.total / cardLimit) * 100);
                const isSelected = selectedCardDetail === key;

                return (
                  <div key={key} className="col-span-1 md:col-span-2 lg:col-span-1 flex flex-col">
                    <div onClick={() => setSelectedCardDetail(key)} className={`cursor-pointer transition-all border rounded-xl p-4 flex flex-col gap-2 relative group ${card.paid ? "bg-emerald-950/15 border-emerald-500/10" : isSelected ? "bg-slate-900 border-pink-500/40" : "bg-slate-950/40 border-slate-800/80"}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-start">
                          <div onClick={(e) => { e.stopPropagation(); toggleTarjetaPaid(key); }}>
                            {card.paid ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 shrink-0" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold block text-slate-100 group-hover:text-pink-400 transition-colors">{card.name}</span>
                            <span className="text-[10px] text-slate-500 block">Cuotas: <strong className="text-slate-300 font-mono">{card.cuotas}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-slate-100 block">{formatPesos(card.total)}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedCardDetail(key); setEditingCardLimitKey(key); setEditCardLimitValue((card.limite || cardLimit).toString()); }} className="text-[9.5px] text-zinc-400 hover:text-pink-400 block ml-auto underline decoration-dotted">Límite: {formatPesos(cardLimit)} ✏️</button>
                        </div>
                      </div>
                      <div className="mt-1">
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${card.paid ? "bg-emerald-500/40" : "bg-pink-500"}`} style={{ width: `${progressPercentage}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VENTANA MODAL DE DETALLES DE TARJETA */}
          {selectedCardDetail && state.tarjetas[selectedCardDetail as keyof typeof state.tarjetas] && (() => {
            const cardKey = selectedCardDetail;
            const card = state.tarjetas[cardKey as keyof typeof state.tarjetas];
            const limitsArr: Record<string, number> = { naranja: 250000.00, naranja_visa: 300000.00, visa_bco_provincia: 500000.00, mercadolibre: 150000.00 };
            const cardLimit = card.limite || limitsArr[cardKey] || 100000;

            return (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setSelectedCardDetail(null)}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden cursor-default transition-all flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500" />
                  <div className="flex justify-between items-center p-5 border-b border-slate-800/80 bg-slate-950/20">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><CardIcon className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{card.name}</h3>
                        <p className="text-[10px] text-slate-500">Resumen y opciones de liquidación</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCardDetail(null)} className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg" type="button"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="p-6 space-y-5 overflow-y-auto max-h-[85vh]">
                    <div className="bg-slate-950/45 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60">
                        <div className="p-4 flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Resumen Anterior</span>
                          <span className="font-mono text-base font-bold text-slate-100">{formatPesos(card.resumenAnterior || 0)}</span>
                        </div>
                        <div className="p-4 flex flex-col gap-1 bg-pink-950/5">
                          <span className="text-[10px] text-pink-400 font-bold uppercase">Total Resumen Actual</span>
                          <span className="font-mono text-base font-black text-pink-400">{formatPesos(card.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                        <h4 className="text-[9.5px] text-slate-300 font-bold mb-3 uppercase">📄 Resumen Anterior</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {card.movimientosAnteriores && card.movimientosAnteriores.length > 0 ? (
                            card.movimientosAnteriores.map((mov) => (
                              <div key={mov.id} className="flex justify-between items-center text-[10.5px] font-mono text-slate-300 bg-slate-900 py-1.5 px-2 rounded-lg border border-slate-800">
                                <span className="truncate max-w-[120px]">{mov.name}</span><span>{formatPesos(mov.amount)}</span>
                              </div>
                            ))
                          ) : (<p className="text-[10px] text-slate-500 italic py-3 text-center">Sin movimientos.</p>)}
                        </div>
                      </div>

                      <div className="bg-pink-950/5 border border-pink-500/10 p-4 rounded-xl">
                        <h4 className="text-[9.5px] text-pink-400 font-bold mb-3 uppercase">⚡ Resumen Actual</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {card.movimientosActuales && card.movimientosActuales.length > 0 ? (
                            card.movimientosActuales.map((mov) => (
                              <div key={mov.id} className="flex justify-between items-center text-[10.5px] font-mono text-slate-100 bg-slate-950/60 py-1.5 px-2 rounded-lg border border-slate-800">
                                <span className="truncate max-w-[120px]">• {mov.name}</span><span className="text-pink-400">{formatPesos(mov.amount)}</span>
                              </div>
                            ))
                          ) : (<p className="text-[10px] text-slate-500 italic py-3 text-center">Sin cargos.</p>)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Límite establecido:</span>
                        <span className="font-mono text-xs font-extrabold text-pink-400 bg-pink-950/25 border border-pink-500/10 px-2 py-0.5 rounded">{formatPesos(cardLimit)}</span>
                      </div>
                      {editingCardLimitKey === cardKey ? (
                        <div className="flex gap-2">
                          <input type="number" step="1000" value={editCardLimitValue} onChange={(e) => setEditCardLimitValue(e.target.value)} className="font-mono bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-3 py-1.5 flex-1" />
                          <button onClick={() => handleUpdateCardLimit(cardKey, editCardLimitValue)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] rounded-lg px-3.5 py-1.5" type="button">Guardar</button>
                          <button onClick={() => setEditingCardLimitKey(null)} className="bg-slate-800 text-slate-300 font-bold text-[10.5px] rounded-lg px-3.5 py-1.5" type="button">Cerrar</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setEditingCardLimitKey(cardKey); setEditCardLimitValue((card.limite || cardLimit).toString()); }} className="text-pink-400 hover:text-pink-300 font-bold uppercase tracking-wider text-[9.5px] block ml-auto">✏️ Modificar Límite</button>
                      )}
                    </div>

                    <div className="bg-slate-950/20 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">💳 Sumar Cargo Manual:</span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input type="text" placeholder="Concepto" value={chargeName} onChange={(e) => setChargeName(e.target.value)} className="bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-3 py-1.5 flex-1" />
                        <input type="number" step="0.01" placeholder="0.00" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} className="font-mono bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-3 py-1.5 sm:w-28" />
                        <button onClick={() => handleAddCardCharge(cardKey)} className="bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10.5px] rounded-lg px-4 py-1.5 uppercase" type="button">Sumar</button>
                      </div>
                    </div>

                    <div className="bg-indigo-950/10 border border-indigo-900/30 p-4 rounded-xl space-y-3">
                      <span className="text-[9.5px] text-indigo-300 font-bold uppercase block">Liquidar Tarjeta con Disponible</span>
                      {!card.paid ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <select id="pay_source_selector_modal" className="bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-lg px-3 py-2 font-sans font-medium" defaultValue="mercado_pago">
                            <optgroup label="🏦 Disponible">
                              <option value="mercado_pago">Mercado Pago</option>
                              <option value="publicos_cuenta_dni">Públicos / Cuenta DNI</option>
                              <option value="naranja_x">Naranja X</option>
                              <option value="huailen">Huailen</option>
                              <option value="schweitzer">Schweitzer</option>
                            </optgroup>
                          </select>
                          <button onClick={() => { const selector = document.getElementById("pay_source_selector_modal") as HTMLSelectElement; if (selector) payCardWithSpecificAccount(cardKey, selector.value); }} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 font-bold text-xxs uppercase tracking-wider" type="button">Pagar Resumen</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center"><p className="text-xxs text-emerald-400 italic">✓ Liquidada con éxito.</p>
                          <button onClick={async () => { const updatedState = { ...state }; const targetCard = updatedState.tarjetas[cardKey as keyof typeof state.tarjetas]; if (targetCard) { targetCard.paid = false; updatedState.ultimo_movimiento = `Tarjeta ${card.name} restablecida.`; await handleSyncState(updatedState); } }} className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg text-xxs uppercase font-bold">Revertir Pago</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT MODULE: VOICE / TEXT PROCESSING NODE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <CommandPanel onProcessSuccess={handleProcessSuccess} onProcessError={(errText) => showError("Error de Validación AI", errText)} isLoading={processing} setIsLoading={setProcessing} />
        </div>
      </div>

      <footer className="mt-4 bg-slate-900/20 border border-slate-900/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xxs text-slate-500">
        <p>© 2026 Antigravity Financial Group S.A. Buenos Aires, Argentina.</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-600 bg-slate-950 px-2 py-1 border border-slate-800 rounded">Processor v3.1.2-Stable</span>
        </div>
      </footer>

      {/* Premium custom alert modal */}
      {modalNotification && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setModalNotification(null)}>
          <div className={`w-full max-w-md rounded-2xl border p-6 bg-slate-900 shadow-2xl transition-all ${modalNotification.type === "error" ? "border-red-500/40 shadow-red-950/30" : "border-emerald-500/40 shadow-emerald-950/30"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase">{modalNotification.title}</h3>
                <p className="text-[9px] text-slate-500 font-mono">Alerta del Sistema</p>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl mb-5">
              <p className="text-xs text-slate-300 font-sans whitespace-pre-line leading-relaxed">{modalNotification.message}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModalNotification(null)} className="font-semibold text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-5 py-2.5 uppercase font-mono">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
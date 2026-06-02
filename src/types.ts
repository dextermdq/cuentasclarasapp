export interface AccountBalances {
  publicos_cuenta_dni: number; // Comparten saldo espejo
  huailen: number;
  schweitzer: number;
  naranja_x: number;
  mercado_pago: number;
}

export interface CardCharge {
  id: string;
  name: string;
  amount: number;
}

export interface CreditCard {
  name: string;
  total: number;
  cuotas: string; // e.g., "3/6" or "1/1"
  paid: boolean;
  resumenAnterior?: number;
  proximoResumenBase?: number;
  cargos?: CardCharge[];
  movimientosAnteriores?: CardCharge[];
  movimientosActuales?: CardCharge[];
  limite?: number; // Límite de crédito establecido
}

export interface FixedExpense {
  name: string;
  key: string;
  total: number;
  medio: string; // Account or payment method
  paid: boolean;
  historyPrice: number; // For comparison
  alertIncrement?: string; // Alert message if incremented
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'ingreso' | 'egreso' | 'pago_tarjeta' | 'pago_gasto_fijo' | 'transferencia' | 'ahorro';
  sourceAccount?: string;
  destAccount?: string;
}

export interface FinancialState {
  disponible: AccountBalances;
  tarjetas: {
    naranja: CreditCard;
    naranja_visa: CreditCard;
    visa_bco_provincia: CreditCard;
    mercadolibre: CreditCard;
  };
  gastos_fijos: {
    personal: FixedExpense;
    hpc: FixedExpense;
    racing_club: FixedExpense;
    gym: FixedExpense;
    hipotecario: FixedExpense;
    prestamo_bco_provincia: FixedExpense; // Vence Enero 2027
    impuestos_casa: FixedExpense;
    impacto: FixedExpense;
  };
  ahorro_acumulado: number;
  ultimo_movimiento: string;
  historial_movimientos: Transaction[];
  ahorros_apartados?: Record<string, number>;
}

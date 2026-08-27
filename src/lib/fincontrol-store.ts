import { create } from 'zustand';

export type CategoryKey = 'mayores' | 'menores' | 'inversiones';
export type ViewType = 'generales' | CategoryKey;

export interface Concepto {
  id: number;
  cat: CategoryKey;
  nombre: string;
  pct: number;
  activo: boolean;
}

export interface CategoriaConfig {
  nombre: string;
  pctTotal: number;
  color: string;
  paleta: string[];
}

export interface ConceptoCalculado extends Concepto {
  monto: number;
  pctFinal: number;
  color: string;
}

export interface CategoriaCalculada {
  nombre: string;
  monto: number;
  montoBase: number;
  redistribuido: number;
  conceptos: ConceptoCalculado[];
}

export interface CalculatedData {
  categorias: Record<CategoryKey, CategoriaCalculada>;
  sinAsignar: number;
  tieneRedistribucion: boolean;
}

export interface ProjectionRow {
  mes: number;
  aporte: number;
  rendimiento: number;
  acumulado: number;
}

export const CATEGORIAS: Record<CategoryKey, CategoriaConfig> = {
  mayores: {
    nombre: 'Gastos Mayores',
    pctTotal: 50,
    color: '#ef4444',
    paleta: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  },
  menores: {
    nombre: 'Gastos Menores',
    pctTotal: 20,
    color: '#f59e0b',
    paleta: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
  },
  inversiones: {
    nombre: 'Inversiones',
    pctTotal: 30,
    color: '#10b981',
    paleta: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  },
};

const INITIAL_CONCEPTOS: Concepto[] = [
  { id: 1, cat: 'mayores', nombre: 'Vivienda / Arriendo', pct: 35, activo: true },
  { id: 2, cat: 'mayores', nombre: 'Deudas / Préstamos', pct: 20, activo: true },
  { id: 3, cat: 'mayores', nombre: 'Transporte', pct: 10, activo: true },
  { id: 4, cat: 'mayores', nombre: 'Servicios Básicos', pct: 5, activo: true },
  { id: 5, cat: 'menores', nombre: 'Ofrendas / Diezmos', pct: 8, activo: true },
  { id: 6, cat: 'menores', nombre: 'Ocio / Entretenimiento', pct: 3, activo: true },
  { id: 7, cat: 'menores', nombre: 'Vestimenta', pct: 2, activo: true },
  { id: 8, cat: 'menores', nombre: 'Imprevistos', pct: 2, activo: true },
  { id: 9, cat: 'inversiones', nombre: 'Cuenta de Ahorro', pct: 5, activo: true },
  { id: 10, cat: 'inversiones', nombre: 'APV Reg. A (Póliza Unit Linked)', pct: 5, activo: true },
  { id: 11, cat: 'inversiones', nombre: 'ETF / Acciones', pct: 2.5, activo: true },
  { id: 12, cat: 'inversiones', nombre: 'DPF Art. 54 Bis', pct: 2.5, activo: true },
];

function loadDisabledIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('fc_tachados') || '[]');
  } catch {
    return [];
  }
}

function saveDisabledIds(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fc_tachados', JSON.stringify(ids));
  } catch {
    // ignore
  }
}

// Cuándo una categoría queda en $0, el dinero se redistribuye:
// 50% → Gastos Menores, 50% → Inversiones
export function calcularTodo(conceptos: Concepto[], ingreso: number): CalculatedData {
  const data: CalculatedData = { categorias: {} as Record<CategoryKey, CategoriaCalculada>, sinAsignar: 0, tieneRedistribucion: false };
  const keys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
  let sinAsignar = 0;

  // Fase 1: calcular montos base por categoría
  for (const key of keys) {
    const cat = CATEGORIAS[key];
    const lista = conceptos.filter(c => c.cat === key);
    const activos = lista.filter(c => c.activo);
    const sumaBase = activos.reduce((s, c) => s + c.pct, 0);
    const totalMonto = ingreso * cat.pctTotal / 100;
    const montoCategoria = activos.length > 0 ? totalMonto : 0;

    data.categorias[key] = {
      nombre: cat.nombre,
      monto: montoCategoria,
      montoBase: montoCategoria,
      redistribuido: 0,
      conceptos: lista.map((c, i) => {
        const monto = (c.activo && sumaBase > 0) ? totalMonto * (c.pct / sumaBase) : 0;
        const pctFinal = (c.activo && sumaBase > 0) ? (c.pct / sumaBase) * cat.pctTotal : 0;
        return { ...c, monto, pctFinal, color: cat.paleta[i % cat.paleta.length] };
      }),
    };

    if (activos.length === 0) sinAsignar += totalMonto;
  }

  // Fase 2: redistribuir el dinero no asignado a Menores (30%) e Inversiones (70%)
  if (sinAsignar > 0) {
    const menoresTieneActivos = data.categorias.menores.conceptos.some(c => c.activo);
    const invTieneActivos = data.categorias.inversiones.conceptos.some(c => c.activo);

    let aMenores = 0;
    let aInversiones = 0;

    if (menoresTieneActivos && invTieneActivos) {
      aMenores = sinAsignar * 0.5;
      aInversiones = sinAsignar * 0.5;
    } else if (invTieneActivos) {
      aInversiones = sinAsignar;
    } else if (menoresTieneActivos) {
      aMenores = sinAsignar;
    } else {
      data.sinAsignar = sinAsignar;
      return data;
    }

    // Aplicar a Menores
    if (aMenores > 0) {
      const catKey: CategoryKey = 'menores';
      const cat = CATEGORIAS[catKey];
      const activos = data.categorias[catKey].conceptos.filter(c => c.activo);
      const sumaBase = activos.reduce((s, c) => s + c.pct, 0);
      data.categorias[catKey].monto += aMenores;
      data.categorias[catKey].redistribuido = aMenores;
      data.categorias[catKey].conceptos = data.categorias[catKey].conceptos.map((c, i) => {
        if (!c.activo) return c;
        const monto = data.categorias[catKey].montoBase * (c.pct / sumaBase) + aMenores * (c.pct / sumaBase);
        return { ...c, monto, color: cat.paleta[i % cat.paleta.length] };
      });
    }

    // Aplicar a Inversiones
    if (aInversiones > 0) {
      const catKey: CategoryKey = 'inversiones';
      const cat = CATEGORIAS[catKey];
      const activos = data.categorias[catKey].conceptos.filter(c => c.activo);
      const sumaBase = activos.reduce((s, c) => s + c.pct, 0);
      data.categorias[catKey].monto += aInversiones;
      data.categorias[catKey].redistribuido = aInversiones;
      data.categorias[catKey].conceptos = data.categorias[catKey].conceptos.map((c, i) => {
        if (!c.activo) return c;
        const monto = data.categorias[catKey].montoBase * (c.pct / sumaBase) + aInversiones * (c.pct / sumaBase);
        return { ...c, monto, color: cat.paleta[i % cat.paleta.length] };
      });
    }

    data.tieneRedistribucion = true;
  }

  return data;
}

export function calcularProyeccion(data: CalculatedData): ProjectionRow[] {
  const aporte = data.categorias.inversiones.monto;
  const rows: ProjectionRow[] = [];
  let acumulado = 0;
  const tasaMensual = Math.pow(1.08, 1 / 12) - 1;

  for (let i = 1; i <= 12; i++) {
    const rendimiento = acumulado * tasaMensual;
    acumulado = acumulado + aporte + rendimiento;
    rows.push({
      mes: i,
      aporte: Math.round(aporte),
      rendimiento: Math.round(rendimiento),
      acumulado: Math.round(acumulado),
    });
  }

  return rows;
}

export function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

interface FinControlState {
  ingreso: number;
  conceptos: Concepto[];
  vistaActual: ViewType;
  setIngreso: (v: number) => void;
  toggleConcepto: (id: number) => void;
  restablecerConceptos: () => void;
  setVistaActual: (v: ViewType) => void;
}

export const useFinControlStore = create<FinControlState>((set) => {
  const disabledIds = loadDisabledIds();
  const conceptos = INITIAL_CONCEPTOS.map(c => ({
    ...c,
    activo: !disabledIds.includes(c.id),
  }));

  return {
    ingreso: 1000000,
    conceptos,
    vistaActual: 'generales',
    setIngreso: (v) => set({ ingreso: v }),
    toggleConcepto: (id) =>
      set((state) => {
        const newConceptos = state.conceptos.map((c) =>
          c.id === id ? { ...c, activo: !c.activo } : c
        );
        saveDisabledIds(newConceptos.filter((c) => !c.activo).map((c) => c.id));
        return { conceptos: newConceptos };
      }),
    restablecerConceptos: () => {
      saveDisabledIds([]);
      set({ conceptos: INITIAL_CONCEPTOS.map((c) => ({ ...c, activo: true })) });
    },
    setVistaActual: (v) => set({ vistaActual: v }),
  };
});

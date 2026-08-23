'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  SlidersHorizontal,
  RotateCcw,
  ArrowLeft,
  FileText,
  Presentation,
  Printer,
  CheckCircle2,
  XCircle,
  ListChecks,
  DollarSign,
  ArrowDownRight,
  PiggyBank,
  ChevronDown,
  Download,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip as ShTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  useFinControlStore,
  CATEGORIAS,
  calcularTodo,
  calcularProyeccion,
  formatCLP,
  type CategoryKey,
  type ViewType,
  type ConceptoCalculado,
} from '@/lib/fincontrol-store';

// ===== Custom Recharts Tooltip =====
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-slate-300">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono font-medium text-white">{formatCLP(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ===== KPI Card =====
function KPICard({
  title,
  value,
  color,
  subtext,
  redistribuido,
  onClick,
}: {
  title: string;
  value: string;
  color: string;
  subtext: string;
  redistribuido?: number;
  onClick: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
      <Card
        className="cursor-pointer border-l-4 bg-slate-800/80 border border-slate-700/50 hover:shadow-lg hover:shadow-black/30 transition-shadow"
        style={{ borderLeftColor: color }}
        onClick={onClick}
      >
        <CardContent className="p-4 pl-5">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{title}</p>
          <h2 className="text-2xl font-bold mt-1" style={{ color }}>{value}</h2>
          {redistribuido && redistribuido > 0 ? (
            <p className="text-[11px] mt-1 text-emerald-400 font-medium">
              +{formatCLP(redistribuido)} redistribuido
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ===== Concept Item =====
function ConceptoItem({
  concepto,
  catColor,
  onToggle,
}: {
  concepto: ConceptoCalculado;
  catColor: string;
  onToggle: () => void;
}) {
  return (
    <motion.div
      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        concepto.activo
          ? 'bg-slate-900/50 hover:bg-slate-700/60'
          : 'opacity-40 bg-slate-900/30 hover:bg-slate-800/30'
      }`}
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {concepto.activo ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: catColor }} />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <span
          className={`text-sm truncate ${!concepto.activo ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {concepto.nombre}
        </span>
      </div>
      <div className="text-right shrink-0">
        <span className="block text-[11px] text-slate-500">
          {concepto.activo ? `${concepto.pctFinal.toFixed(1)}%` : 'tachado'}
        </span>
        <span className="text-sm font-bold text-slate-300">
          {concepto.activo ? formatCLP(concepto.monto) : '—'}
        </span>
      </div>
    </motion.div>
  );
}

// ===== Category Section =====
function CategorySection({
  catKey,
  data,
}: {
  catKey: CategoryKey;
  data: { nombre: string; monto: number; redistribuido?: number; conceptos: ConceptoCalculado[] };
}) {
  const toggleConcepto = useFinControlStore((s) => s.toggleConcepto);
  const cat = CATEGORIAS[catKey];

  return (
    <div>
      <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: cat.color }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
        {data.nombre}
        <span className="text-sm font-normal text-slate-400">— {formatCLP(data.monto)}</span>
        {data.redistribuido && data.redistribuido > 0 && (
          <span className="ml-1 text-[11px] font-medium text-emerald-400">
            (+{formatCLP(data.redistribuido)} redis.)
          </span>
        )}
      </h4>
      <div className="space-y-1">
        {data.conceptos.map((c) => (
          <ConceptoItem
            key={c.id}
            concepto={c}
            catColor={cat.color}
            onToggle={() => toggleConcepto(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ===== Donut Chart =====
function DonutChartSection({ data, vistaActual, onSectorClick }: {
  data: ReturnType<typeof calcularTodo>;
  vistaActual: ViewType;
  onSectorClick: (key: string) => void;
}) {
  const { labels, values, colors, title } = useMemo(() => {
    if (vistaActual === 'generales') {
      const keys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
      const lbls = keys.map(k => {
        const cat = data.categorias[k];
        const extra = cat.redistribuido > 0 ? ` (+${formatCLP(cat.redistribuido)})` : '';
        return `${CATEGORIAS[k].nombre}${extra}`;
      });
      const vals = keys.map(k => data.categorias[k].monto);
      const cols = keys.map(k => CATEGORIAS[k].color);
      return { labels: lbls, values: vals, colors: cols, title: 'Distribución del Ingreso' };
    }
    const cat = CATEGORIAS[vistaActual as CategoryKey];
    const activos = data.categorias[vistaActual as CategoryKey].conceptos.filter(c => c.activo);
    return {
      labels: activos.map(c => c.nombre),
      values: activos.map(c => c.monto),
      colors: activos.map(c => c.color),
      title: `Desglose: ${cat.nombre}`,
    };
  }, [data, vistaActual]);

  const chartData = labels.map((name, i) => ({ name, value: values[i], fill: colors[i] }));

  return (
    <Card className="bg-slate-800/80 border border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                cursor="pointer"
                onClick={(_, index) => {
                  if (vistaActual === 'generales') {
                    const keys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
                    if (index < keys.length) onSectorClick(keys[index]);
                  }
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Bar Chart =====
function BarChartSection({ data, vistaActual }: {
  data: ReturnType<typeof calcularTodo>;
  vistaActual: ViewType;
}) {
  const { chartData, title } = useMemo(() => {
    if (vistaActual === 'generales') {
      const keys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
      return {
        chartData: keys.map(k => ({
          name: CATEGORIAS[k].nombre,
          monto: data.categorias[k].monto,
          fill: CATEGORIAS[k].color,
        })),
        title: 'Resumen General',
      };
    }
    const cat = CATEGORIAS[vistaActual as CategoryKey];
    const activos = data.categorias[vistaActual as CategoryKey].conceptos.filter(c => c.activo);
    return {
      chartData: activos.map(c => ({
        name: c.nombre,
        monto: c.monto,
        fill: c.color,
      })),
      title: `Detalle ${cat.nombre}`,
    };
  }, [data, vistaActual]);

  return (
    <Card className="bg-slate-800/80 border border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="monto" name="Monto" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Projection Section =====
function ProjectionSection({ data }: { data: ReturnType<typeof calcularTodo> }) {
  const proyeccion = useMemo(() => calcularProyeccion(data), [data]);
  const chartData = useMemo(
    () => proyeccion.map(r => ({ name: `Mes ${r.mes}`, acumulado: r.acumulado })),
    [proyeccion]
  );

  return (
    <Card className="bg-slate-800/80 border border-slate-700/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Proyección de Patrimonio Personal a 12 Meses
        </CardTitle>
        <p className="text-sm text-slate-400">
          Simulación basada en el monto total de inversiones activas, con rendimiento anual estimado del 8%.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-700/50">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Mes</TableHead>
                <TableHead className="text-slate-400">Aporte Mensual</TableHead>
                <TableHead className="text-slate-400">Rendimiento</TableHead>
                <TableHead className="text-slate-400">Total Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyeccion.map((row) => (
                <TableRow key={row.mes} className="border-slate-700/50 hover:bg-slate-700/30">
                  <TableCell className="text-slate-300">{row.mes}</TableCell>
                  <TableCell className="text-slate-300">{formatCLP(row.aporte)}</TableCell>
                  <TableCell className="text-emerald-400">{formatCLP(row.rendimiento)}</TableCell>
                  <TableCell className="font-bold text-slate-100">{formatCLP(row.acumulado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="acumulado"
                name="Patrimonio Acumulado"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Main Page =====
export default function FinControlPage() {
  const ingreso = useFinControlStore((s) => s.ingreso);
  const conceptos = useFinControlStore((s) => s.conceptos);
  const vistaActual = useFinControlStore((s) => s.vistaActual);
  const setIngreso = useFinControlStore((s) => s.setIngreso);
  const setVistaActual = useFinControlStore((s) => s.setVistaActual);
  const restablecerConceptos = useFinControlStore((s) => s.restablecerConceptos);
  const [exporting, setExporting] = useState<'docx' | 'pptx' | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => calcularTodo(conceptos, ingreso), [conceptos, ingreso]);
  const proyeccion = useMemo(() => calcularProyeccion(data), [data]);

  const handleDrillDown = useCallback(
    (key: ViewType) => {
      setVistaActual(key);
    },
    [setVistaActual]
  );

  const exportDOCX = useCallback(async () => {
    setExporting('docx');
    try {
      const catKeys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
      const categoriasData: Record<string, unknown> = {};
      for (const key of catKeys) {
        const catData = data.categorias[key];
        categoriasData[key] = {
          nombre: catData.nombre,
          monto: catData.monto,
          montoFmt: formatCLP(catData.monto),
          conceptos: catData.conceptos.map(c => ({
            ...c,
            montoFmt: formatCLP(c.monto),
          })),
        };
      }

      const res = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingreso,
          fmt: formatCLP(ingreso),
          categorias: categoriasData,
          proyeccion: proyeccion.map(r => ({
            ...r,
            aporteFmt: formatCLP(r.aporte),
            rendimientoFmt: formatCLP(r.rendimiento),
            acumuladoFmt: formatCLP(r.acumulado),
          })),
        }),
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FinControl_Informe.doc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Documento DOCX descargado exitosamente');
    } catch {
      toast.error('Error al exportar el documento DOCX');
    } finally {
      setExporting(null);
    }
  }, [data, proyeccion, ingreso]);

  const exportPPTX = useCallback(async () => {
    setExporting('pptx');
    try {
      const catKeys: CategoryKey[] = ['mayores', 'menores', 'inversiones'];
      const categoriasData: Record<string, unknown> = {};
      for (const key of catKeys) {
        const catData = data.categorias[key];
        categoriasData[key] = {
          nombre: catData.nombre,
          monto: catData.monto,
          montoFmt: formatCLP(catData.monto),
          conceptos: catData.conceptos.map(c => ({
            ...c,
            montoFmt: formatCLP(c.monto),
          })),
        };
      }

      const totalActivos = conceptos.filter(c => c.activo).length;

      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingresoFmt: formatCLP(ingreso),
          categorias: categoriasData,
          proyeccion,
          totalActivos,
          totalConceptos: conceptos.length,
        }),
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FinControl_Dashboard.pptx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Presentación PPTX descargada exitosamente');
    } catch {
      toast.error('Error al exportar la presentación PPTX');
    } finally {
      setExporting(null);
    }
  }, [data, proyeccion, ingreso, conceptos]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100" ref={printRef}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-center mb-6 no-print">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold tracking-tight">
                FinControl <span className="text-emerald-400">Pro</span>
              </h1>
              <p className="text-slate-400 text-sm">Dashboard Gerencial y Proyección Personal</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 cursor-pointer"
                onClick={exportDOCX}
                disabled={exporting === 'docx'}
              >
                {exporting === 'docx' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                .DOCX
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 cursor-pointer"
                onClick={exportPPTX}
                disabled={exporting === 'pptx'}
              >
                {exporting === 'pptx' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Presentation className="h-4 w-4 mr-2" />
                )}
                .PPTX
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 hover:border-slate-700 cursor-pointer"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir / PDF
              </Button>
            </div>
          </header>

          {/* Simulator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 no-print"
          >
            <Card className="bg-slate-800/50 border-emerald-900/50 border border-slate-700/50">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-3 shrink-0">
                    <SlidersHorizontal className="h-6 w-6 text-emerald-400" />
                    <h2 className="text-lg font-bold">Simulador de Montos</h2>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">
                      Ingresa tu sueldo mensual
                    </label>
                    <Input
                      type="number"
                      value={ingreso || ''}
                      onChange={(e) => setIngreso(parseFloat(e.target.value) || 0)}
                      className="bg-slate-900 border-slate-600 text-white text-right text-lg font-bold focus:border-emerald-500 focus:ring-emerald-500/20 h-11"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div className="text-center md:text-right mt-1 md:mt-4 shrink-0">
                    <p className="text-xs text-slate-400">Distribución base</p>
                    <p className="font-bold text-slate-300 text-sm">
                      70% Mayores | 15% Menores | 15% Inv.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <KPICard
              title="Ingreso Mensual"
              value={formatCLP(ingreso)}
              color="#3b82f6"
              subtext="Volver a vista general"
              onClick={() => handleDrillDown('generales')}
            />
            <KPICard
              title="Gastos Mayores (70%)"
              value={formatCLP(data.categorias.mayores.monto)}
              color="#ef4444"
              subtext="Toca para desglosar"
              redistribuido={data.categorias.mayores.redistribuido}
              onClick={() => handleDrillDown('mayores')}
            />
            <KPICard
              title="Gastos Menores (15%)"
              value={formatCLP(data.categorias.menores.monto)}
              color="#f59e0b"
              subtext="Toca para desglosar"
              redistribuido={data.categorias.menores.redistribuido}
              onClick={() => handleDrillDown('menores')}
            />
            <KPICard
              title="Inversiones (15%)"
              value={formatCLP(data.categorias.inversiones.monto)}
              color="#10b981"
              subtext="Toca para desglosar"
              redistribuido={data.categorias.inversiones.redistribuido}
              onClick={() => handleDrillDown('inversiones')}
            />
          </motion.div>

          {/* Back Button (when in drill-down) */}
          <AnimatePresence>
            {vistaActual !== 'generales' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="mb-4 no-print"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 cursor-pointer"
                  onClick={() => handleDrillDown('generales')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a vista general
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Concept Management */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card className="bg-slate-800/80 border border-slate-700/50">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                      <ListChecks className="h-5 w-5 text-emerald-400" />
                      Gestión de Conceptos
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Toca un concepto para{' '}
                      <strong className="text-slate-300">tacharlo</strong> si no aplica a tu situación.
                      El dinero se redistribuye entre los conceptos activos de la misma categoría.
                      Si una categoría queda en $0, ese dinero se redistribuye:{' '}
                      <strong className="text-emerald-400">30% a Gastos Menores</strong> y{' '}
                      <strong className="text-emerald-400">70% a Inversiones</strong>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 cursor-pointer no-print shrink-0"
                    onClick={() => {
                      restablecerConceptos();
                      toast.success('Todos los conceptos han sido restablecidos');
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restablecer todos
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(['mayores', 'menores', 'inversiones'] as CategoryKey[]).map((key) => (
                    <CategorySection key={key} catKey={key} data={data.categorias[key]} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            <DonutChartSection
              data={data}
              vistaActual={vistaActual}
              onSectorClick={(key) => handleDrillDown(key as ViewType)}
            />
            <BarChartSection data={data} vistaActual={vistaActual} />
          </motion.div>

          {/* Projection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProjectionSection data={data} />
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-4 px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-slate-500">
            <p>FinControl Pro — Dashboard Gerencial y Proyección Personal</p>
            <p className="text-xs">Todos los cálculos son simulaciones basadas en los datos ingresados</p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

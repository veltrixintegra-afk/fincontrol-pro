import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingresoFmt, categorias, proyeccion, totalActivos, totalConceptos } = body;

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Slide 1: Cover
    const s1 = pptx.addSlide();
    s1.background = { color: '0f172a' };
    s1.addText('FinControl Pro', {
      x: 1, y: 1.5, w: 11, h: 1.2, fontSize: 44, bold: true, color: '10b981',
    });
    s1.addText('Dashboard Ejecutivo y Proyección Financiera', {
      x: 1, y: 2.8, w: 11, h: 0.8, fontSize: 24, color: 'FFFFFF',
    });
    s1.addText(`Ingreso: ${ingresoFmt} | 50% Mayores | 20% Menores | 30% Inversiones`, {
      x: 1, y: 3.7, w: 11, h: 0.5, fontSize: 14, color: '94a3b8',
    });
    s1.addText(`Conceptos activos en el plan: ${totalActivos} de ${totalConceptos}`, {
      x: 1, y: 4.3, w: 11, h: 0.5, fontSize: 14, color: '94a3b8',
    });

    // Slide 2: General distribution
    const s2 = pptx.addSlide();
    s2.background = { color: '1e293b' };
    s2.addText('Distribución General del Ingreso', {
      x: 0.5, y: 0.2, w: 12, h: 0.8, fontSize: 24, bold: true, color: 'FFFFFF',
    });

    const catKeys = ['mayores', 'menores', 'inversiones'] as const;
    const genLabels: string[] = [];
    const genValues: number[] = [];
    for (const key of catKeys) {
      const cat = categorias[key];
      genLabels.push(cat.nombre);
      genValues.push(Math.round(cat.monto));
    }

    s2.addChart(
      pptx.charts.PIE,
      [{ name: 'Distribución', labels: genLabels, values: genValues }],
      { x: 0.5, y: 1.2, w: 5.5, h: 5, showValue: true, showTitle: false, dataLabelColor: 'FFFFFF' }
    );
    s2.addChart(
      pptx.charts.BAR,
      [{ name: 'Montos', labels: genLabels, values: genValues }],
      {
        x: 6.5, y: 1.2, w: 6.5, h: 5, showValue: true, showTitle: false,
        catAxisLabelColor: 'FFFFFF', valAxisLabelColor: 'FFFFFF', dataLabelColor: 'FFFFFF',
      }
    );

    // Slides 3-5: Category breakdown
    for (const key of catKeys) {
      const slide = pptx.addSlide();
      slide.background = { color: '1e293b' };
      const cat = categorias[key];
      slide.addText(`Desglose: ${cat.nombre} — ${cat.montoFmt}`, {
        x: 0.5, y: 0.2, w: 12, h: 0.8, fontSize: 24, bold: true, color: 'FFFFFF',
      });
      const activos = cat.conceptos.filter((c: { activo: boolean }) => c.activo);
      if (activos.length === 0) {
        slide.addText('Sin conceptos activos en esta categoría.', {
          x: 1, y: 3, w: 11, h: 1, fontSize: 18, color: '94a3b8', italic: true,
        });
      } else {
        slide.addChart(
          pptx.charts.PIE,
          [{
            name: cat.nombre,
            labels: activos.map((c: { nombre: string }) => c.nombre),
            values: activos.map((c: { monto: number }) => Math.round(c.monto)),
          }],
          { x: 0.5, y: 1.2, w: 6, h: 5, showValue: true, showTitle: false, dataLabelColor: 'FFFFFF' }
        );
        slide.addText(
          activos
            .map((c: { nombre: string; pctFinal: number; montoFmt: string }) => `${c.nombre}: ${c.pctFinal.toFixed(1)}% — ${c.montoFmt}`)
            .join('\n'),
          { x: 7, y: 1.5, w: 5.5, h: 4.5, fontSize: 13, color: 'E2E8F0', lineSpacing: 28 }
        );
      }
    }

    // Slide 6: Projection
    const s6 = pptx.addSlide();
    s6.background = { color: '1e293b' };
    s6.addText('Proyección de Patrimonio a 12 Meses (8% anual)', {
      x: 0.5, y: 0.2, w: 12, h: 0.8, fontSize: 24, bold: true, color: 'FFFFFF',
    });
    s6.addChart(
      pptx.charts.LINE,
      [{
        name: 'Acumulado',
        labels: proyeccion.map((r: { mes: number }) => `Mes ${r.mes}`),
        values: proyeccion.map((r: { acumulado: number }) => r.acumulado),
      }],
      {
        x: 0.5, y: 1.2, w: 12, h: 5, lineSmooth: true, showTitle: false,
        lineDataSymbol: 'circle', catAxisLabelColor: 'FFFFFF', valAxisLabelColor: 'FFFFFF',
      }
    );

    const buffer = await pptx.write({ outputType: 'nodebuffer' });

    return new NextResponse(buffer as Buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="FinControl_Dashboard.pptx"',
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return NextResponse.json({ error: 'Failed to generate PPTX' }, { status: 500 });
  }
}

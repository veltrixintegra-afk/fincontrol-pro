import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingreso, categorias, proyeccion, fmt } = body;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>FinControl</title><style>table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background-color:#f1f5f9;text-align:left}body{font-family:Arial,sans-serif;padding:40px}</style></head><body>`;
    const footer = '</body></html>';

    let content = `<h1 style="color:#10b981">FinControl Pro — Informe Ejecutivo</h1>
      <p>Ingreso Simulado: <strong>${fmt}</strong></p>
      <ul>
        <li><strong>Gastos Mayores:</strong> ${categorias.mayores.montoFmt}</li>
        <li><strong>Gastos Menores:</strong> ${categorias.menores.montoFmt}</li>
        <li><strong>Inversiones:</strong> ${categorias.inversiones.montoFmt}</li>
      </ul>`;

    const catKeys = ['mayores', 'menores', 'inversiones'] as const;
    for (const key of catKeys) {
      const cat = categorias[key];
      const activos = cat.conceptos.filter((c: { activo: boolean }) => c.activo);
      content += `<h2>${cat.nombre} — ${cat.montoFmt}</h2>`;
      if (activos.length === 0) {
        content += '<p><em>Sin conceptos activos en esta categoría.</em></p>';
      } else {
        content += `<table><tr><th>Concepto</th><th>% Final</th><th>Monto</th></tr>`;
        activos.forEach((c: { nombre: string; pctFinal: number; montoFmt: string }) => {
          content += `<tr><td>${c.nombre}</td><td>${c.pctFinal.toFixed(1)}%</td><td>${c.montoFmt}</td></tr>`;
        });
        content += '</table>';
      }
    }

    content += `<h2>Proyección a 12 Meses (8% anual)</h2>
      <table><tr><th>Mes</th><th>Aporte</th><th>Rendimiento</th><th>Acumulado</th></tr>
      ${proyeccion
        .map(
          (r: { mes: number; aporteFmt: string; rendimientoFmt: string; acumuladoFmt: string }) =>
            `<tr><td>${r.mes}</td><td>${r.aporteFmt}</td><td>${r.rendimientoFmt}</td><td><strong>${r.acumuladoFmt}</strong></td></tr>`
        )
        .join('')}
      </table>`;

    const html = header + content + footer;
    const buffer = Buffer.from('\ufeff' + html, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': 'attachment; filename="FinControl_Informe.doc"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate DOCX' }, { status: 500 });
  }
}

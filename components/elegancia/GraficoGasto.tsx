"use client";

/**
 * Lo que entra y lo que sale por día (últimas 6 semanas).
 * La curva es el gasto en Facebook; los días con venta llevan un punto verde.
 * Al pasar el cursor: el día con "Ganado +$" (ventas) y "Gastado −$" (Facebook).
 */
import { useRef, useState } from "react";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function fecha(k: string): string {
  const d = new Date(`${k}T12:00:00Z`);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
function fechaLarga(k: string): string {
  const d = new Date(`${k}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
const usd = (v: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

/** Curva suave (monótona) que pasa por todos los puntos sin pasarse de los valores. */
function curva(p: Array<[number, number]>): string {
  if (p.length < 2) return "";
  const n = p.length;
  const m: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1]![1] - p[i]![1]) / (p[i + 1]![0] - p[i]![0]));
  m.push(d[0]!);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2);
  m.push(d[n - 2]!);
  let s = `M${p[0]![0].toFixed(1)} ${p[0]![1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i]!;
    const [x1, y1] = p[i + 1]!;
    const h = (x1 - x0) / 3;
    s += ` C${(x0 + h).toFixed(1)} ${(y0 + m[i]! * h).toFixed(1)} ${(x1 - h).toFixed(1)} ${(y1 - m[i + 1]! * h).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return s;
}

export function GraficoGasto({ dias }: { dias: Array<[string, number, number]> }) {
  const W = 640;
  const H = 280;
  const ABAJO = 26;
  const ARRIBA = 16;
  const tope = Math.max(0, ...dias.map(([, g]) => g));
  const max = Math.max(4, Math.ceil(tope / 2) * 2);
  const bw = W / dias.length;
  const x = (i: number) => i * bw + bw / 2;
  const y = (v: number) => H - ABAJO - (v / max) * (H - ABAJO - ARRIBA);
  const puntos = dias.map(([, g], i) => [x(i), y(g)] as [number, number]);
  const linea = curva(puntos);
  const gastoTotal = dias.reduce((a, [, g]) => a + g, 0);
  const ganadoTotal = dias.reduce((a, [, , v]) => a + v, 0);

  const svgRef = useRef<SVGSVGElement>(null);
  const [idx, setIdx] = useState<number | null>(null);

  const mover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    setIdx(Math.min(dias.length - 1, Math.max(0, Math.floor(px / bw))));
  };

  const activo = idx !== null ? dias[idx] : null;
  const ax = idx !== null ? x(idx) : 0;
  const ay = activo ? y(activo[1]) : 0;
  const izquierda = Math.min(84, Math.max(12, (ax / W) * 100));
  const arriba = (ay / H) * 100;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="eleg-ley" /> Gastado en Facebook
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="eleg-ley eleg-ley-ganado" /> Ganado (ventas)
        </span>
        <span className="ml-auto">últimas 6 semanas</span>
      </div>
      <div className="eleg-grafico-caja" onMouseLeave={() => setIdx(null)}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="eleg-grafico"
          style={{ width: "100%", marginTop: 8, touchAction: "pan-y" }}
          onMouseMove={(e) => mover(e.clientX)}
          onTouchStart={(e) => e.touches[0] && mover(e.touches[0].clientX)}
          onTouchMove={(e) => e.touches[0] && mover(e.touches[0].clientX)}
          onTouchEnd={() => setIdx(null)}
          role="img"
          aria-label={`Últimas 6 semanas: gastado ${usd(gastoTotal)} en Facebook, ganado ${usd(ganadoTotal)} en ventas`}
        >
          <defs>
            <linearGradient id="eleg-area-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="eleg-area-tope" />
              <stop offset="1" className="eleg-area-base" />
            </linearGradient>
          </defs>
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={34} x2={W} y1={y(v)} y2={y(v)} className="eleg-rejilla" strokeDasharray="3 5" />
              <text x={0} y={y(v) + 4}>${v}</text>
            </g>
          ))}
          <path d={`${linea} L${x(dias.length - 1)} ${H - ABAJO} L${x(0)} ${H - ABAJO}Z`} className="eleg-area eleg-area-anim" />
          {activo && <line x1={ax} x2={ax} y1={ARRIBA - 6} y2={H - ABAJO} className="eleg-guia" />}
          <path d={linea} className="eleg-linea eleg-linea-anim" fill="none" strokeWidth={2.6} strokeLinecap="round" pathLength={1} />
          {dias.map(([k, , v], i) =>
            v > 0 ? <circle key={k} cx={x(i)} cy={H - ABAJO} r={4} className="eleg-venta" /> : null,
          )}
          {dias
            .filter((_, i) => i % 7 === 0)
            .map(([k], j) => (
              <text key={k} x={x(j * 7)} y={H - 4} className={idx !== null && Math.floor(idx / 7) === j ? "eleg-eje-on" : ""}>
                {fecha(k)}
              </text>
            ))}
          {activo && (
            <g>
              <circle cx={ax} cy={ay} r={10} className="eleg-halo" />
              <circle cx={ax} cy={ay} r={5} className="eleg-punto-dia" />
            </g>
          )}
          <rect x={0} y={0} width={W} height={H} fill="transparent" />
        </svg>
        {activo && (
          <div className="eleg-burbuja" style={{ left: `${izquierda}%`, top: `${arriba}%` }}>
            <div className="eleg-burbuja-fecha">{fechaLarga(activo[0])}</div>
            <div className="eleg-burbuja-fila">
              <span className="eleg-ley eleg-ley-ganado" />
              Ganado
              <b className="eleg-bueno">+{usd(activo[2])}</b>
            </div>
            <div className="eleg-burbuja-fila">
              <span className="eleg-ley" />
              Gastado
              <b className="eleg-malo">−{usd(activo[1])}</b>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[13px] text-text-muted">
        <span>
          Ganado <b className="eleg-bueno">+{usd(ganadoTotal)}</b> · Gastado <b className="eleg-malo">−{usd(gastoTotal)}</b>
        </span>
      </div>
    </>
  );
}

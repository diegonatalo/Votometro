"use client";

import { interpolateZoom } from "d3-interpolate";
import { select } from "d3-selection";
import { pointer } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent} from "react";
import type { Topology } from "topojson-specification";
import { colorForPctLula, NEUTRAL_FILL } from "@/lib/colors";
import { fmtInt, fmtPct } from "@/lib/format";
import { BASE, buildMuniShapes, buildStateShapes, GridIndex, makeProjection, featuresOf, type MuniShape } from "@/lib/mapGeo";
import { pctValidos } from "@/lib/stats";
import { tallyFromTuple, type Estado, type Municipio, type MunicipiosFile, type SourceMeta, type Tally } from "@/lib/types";
import type { Candidato } from "@/lib/types";
import { SourceNote } from "../SourceNote";
import { Legend, useThemeName } from "./Legend";
import { MapPanel, type PanelEntity } from "./MapPanel";
import { MunicipalitySearch } from "./MunicipalitySearch";
import { Tooltip, type TooltipInfo } from "./Tooltip";

type LoadStatus = "idle" | "loading" | "ready" | "error";
interface Sel { uf: string | null; ibge: string | null }
interface Hover { kind: "uf" | "mun"; id: string; x: number; y: number }

interface MuniBundle {
  shapes: MuniShape[];
  index: GridIndex;
  list: Municipio[];
  byIbge: Map<string, Municipio>;
  byUf: Map<string, Municipio[]>;
  shapeIdx: Map<string, number>;
  meta: SourceMeta;
}

interface Props {
  estados: Estado[];
  topo: Topology;
  nacional: Tally;
  meta: SourceMeta;
  candidatos: Candidato[];
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function BrazilMap({ estados, topo, nacional, meta, candidatos }: Props) {
  const theme = useThemeName();
  const [sel, setSel] = useState<Sel>({ uf: null, ibge: null });
  const [hover, setHover] = useState<Hover | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [byUf, setByUf] = useState<Record<string, MuniBundle>>({});
  const [searchList, setSearchList] = useState<Municipio[] | null>(null);
  const [size, setSize] = useState({ w: 800, h: 800 });
  const [announce, setAnnounce] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const tRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rafDraw = useRef(0);
  const rafAnim = useRef(0);
  const interacting = useRef(false);
  const interactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWheel = useRef(false);
  const colorsRef = useRef<string[]>([]);
  /** Instantâneo do último desenho completo, reaproveitado durante pan/zoom para manter 60 fps. */
  const snap = useRef<{ cv: HTMLCanvasElement; t: ZoomTransform; key: string; w: number; h: number } | null>(null);
  const bundle: MuniBundle | null = sel.uf ? byUf[sel.uf] ?? null : null;
  const byUfRef = useRef(byUf);
  byUfRef.current = byUf;
  const inflight = useRef(new Map<string, Promise<MuniBundle | null>>());
  const live = useRef({ sel, hover, theme, bundle });
  live.current = { sel, hover, theme, bundle };
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // ---------- geometria dos estados ----------
  const projection = useMemo(() => makeProjection(featuresOf(topo, "estados")), [topo]);
  const stateShapes = useMemo(() => buildStateShapes(topo, projection), [topo, projection]);
  const estadoByUf = useMemo(() => new Map(estados.map((e) => [e.uf, e])), [estados]);

  // ---------- carga dos municípios (sob demanda) ----------
  /** Carrega geometria e resultados dos municípios de uma UF. */
  const loadMunis = useCallback(
    (target: string): Promise<MuniBundle | null> => {
      const have = byUfRef.current[target];
      if (have) return Promise.resolve(have);
      const running = inflight.current.get(target);
      if (running) return running;
      setStatus("loading");
      const suffix = `-${target}`;
      const p = (async () => {
        try {
          const [topoRes, dataRes] = await Promise.all([fetch(`/data/geo/municipios${suffix}.topo.json`), fetch(`/data/municipios${suffix}.json`)]);
          if (!topoRes.ok || !dataRes.ok) throw new Error("HTTP");
          const [mtopo, mfile] = (await Promise.all([topoRes.json(), dataRes.json()])) as [Topology, MunicipiosFile];
          await new Promise((r) => setTimeout(r, 0));
          const shapes = buildMuniShapes(mtopo, projection);
          const list = mfile.rows.map(tallyFromTuple);
          const byIbge = new Map(list.map((m) => [m.ibge, m]));
          const byUf = new Map<string, Municipio[]>();
          for (const m of list) (byUf.get(m.uf) ?? byUf.set(m.uf, []).get(m.uf)!).push(m);
          const shapeIdx = new Map(shapes.map((sh, i) => [sh.ibge, i]));
          const nb: MuniBundle = { shapes, index: new GridIndex(shapes), list, byIbge, byUf, shapeIdx, meta: mfile.meta };
          setByUf((prev) => ({ ...prev, [target]: nb }));
          setStatus("ready");
          return nb;
        } catch {
          setStatus("error");
          return null;
        } finally {
          inflight.current.delete(target);
        }
      })();
      inflight.current.set(target, p);
      return p;
    },
    [projection],
  );

  /** Nomes de todos os municípios para a busca (arquivo leve, sem geometria). */
  const loadSearchList = useCallback(async () => {
    if (searchList) return;
    try {
      const res = await fetch("/data/municipios.json");
      if (!res.ok) return;
      const f = (await res.json()) as MunicipiosFile;
      setSearchList(f.rows.map(tallyFromTuple));
    } catch {
      /* a busca segue vazia */
    }
  }, [searchList]);

  // cores dos municípios por tema
  useEffect(() => {
    if (!bundle) return;
    snap.current = null;
    colorsRef.current = bundle.shapes.map((s) => {
      const m = bundle.byIbge.get(s.ibge);
      return m && m.lula + m.flavio > 0 ? colorForPctLula(pctValidos(m).lula, theme) : NEUTRAL_FILL[theme];
    });
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, theme]);

  // ---------- desenho do canvas ----------
  const draw = useCallback(() => {
    rafDraw.current = 0;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    if (c.width !== cw || c.height !== ch) {
      c.width = cw;
      c.height = ch;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const L = live.current;
    const b = L.bundle;
    if (!b || !L.sel.uf) { snap.current = null; return; }
    const key = `${L.sel.uf}|${L.theme}|${cw}x${ch}`;
    const sn = snap.current;
    if (interacting.current && sn && sn.key === key) {
      const sc = Math.min(w, h) / BASE;
      const T0 = sn.t, T1 = tRef.current;
      const r = T1.k / T0.k;
      const fx0 = (w - BASE * sc) / 2, fy0 = (h - BASE * sc) / 2;
      ctx.setTransform(r, 0, 0, r, dpr * (fx0 * (1 - r) + sc * (T1.x - r * T0.x)), dpr * (fy0 * (1 - r) + sc * (T1.y - r * T0.y)));
      ctx.drawImage(sn.cv, 0, 0);
      return;
    }

    const s = Math.min(w, h) / BASE;
    const fx = (w - BASE * s) / 2;
    const fy = (h - BASE * s) / 2;
    const T = tRef.current;
    const k = s * T.k;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (fx + s * T.x), dpr * (fy + s * T.y));
    const x0 = -T.x / T.k, y0 = -T.y / T.k, x1 = (BASE - T.x) / T.k, y1 = (BASE - T.y) / T.k;
    const selUf = L.sel.uf;
    const onlySel = !!selUf;
    const strokeOn = !interacting.current && T.k > 1.5;
    ctx.lineJoin = "round";
    ctx.lineWidth = (T.k < 4 ? 0.5 : 0.8) / k;
    ctx.strokeStyle = L.theme === "dark" ? "rgba(17,17,19,0.6)" : "rgba(251,250,246,0.75)";
    let alpha = 1;
    const colors = colorsRef.current;
    const shapes = b.shapes;
    for (let i = 0; i < shapes.length; i++) {
      const sh = shapes[i] as MuniShape;
      if (onlySel && sh.uf !== selUf) continue;
      const bb = sh.bounds;
      if (bb[1][0] < x0 || bb[0][0] > x1 || bb[1][1] < y0 || bb[0][1] > y1) continue;
      const a = selUf && sh.uf !== selUf ? 0.25 : 1;
      if (a !== alpha) { ctx.globalAlpha = a; alpha = a; }
      ctx.fillStyle = colors[i] ?? "#888";
      ctx.fill(sh.path);
      if (strokeOn) ctx.stroke(sh.path);
    }
    ctx.globalAlpha = 1;
    if (!interacting.current) {
      const cv = sn?.cv ?? document.createElement("canvas");
      if (cv.width !== c.width || cv.height !== c.height) { cv.width = c.width; cv.height = c.height; }
      const cx2 = cv.getContext("2d");
      if (cx2) {
        cx2.setTransform(1, 0, 0, 1, 0, 0);
        cx2.clearRect(0, 0, cv.width, cv.height);
        cx2.drawImage(c, 0, 0);
        snap.current = { cv, t: T, key, w, h };
      }
    }
    ctx.strokeStyle = L.theme === "dark" ? "#f4f1ea" : "#1c1b17";
    for (const id of [L.hover?.kind === "mun" ? L.hover.id : null, L.sel.ibge]) {
      const idx = id ? b.shapeIdx.get(id) : undefined;
      if (idx === undefined) continue;
      ctx.lineWidth = (id === L.sel.ibge ? 2.4 : 1.6) / k;
      ctx.stroke((shapes[idx] as MuniShape).path);
    }
  }, []);

  const scheduleDraw = useCallback(() => {
    if (!rafDraw.current) rafDraw.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(scheduleDraw, [sel, hover, bundle, size, theme, scheduleDraw]);

  // ---------- zoom / pan ----------
  const applyTransform = useCallback(() => {
    const T = tRef.current;
    gRef.current?.setAttribute("transform", `translate(${T.x} ${T.y}) scale(${T.k})`);
    if (svgRef.current) svgRef.current.style.touchAction = T.k > 1 ? "none" : "pan-y";
    scheduleDraw();
  }, [scheduleDraw]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 80])
      .extent([[0, 0], [BASE, BASE]])
      .translateExtent([[0, 0], [BASE, BASE]])
      .filter((ev: Event) => {
        if (ev.type === "wheel") return (ev as WheelEvent).ctrlKey || (ev as WheelEvent).metaKey || activeWheel.current;
        if (ev.type === "dblclick") return true;
        const te = ev as TouchEvent;
        if (te.touches) return te.touches.length >= 2 || tRef.current.k > 1;
        return !(ev as MouseEvent).button;
      })
      .on("start", () => {
        interacting.current = true;
        setHover(null);
      })
      .on("zoom", (ev: { transform: ZoomTransform }) => {
        tRef.current = ev.transform;
        applyTransform();
      })
      .on("end", () => {
        if (interactTimer.current) clearTimeout(interactTimer.current);
        interactTimer.current = setTimeout(() => {
          interacting.current = false;
          scheduleDraw();
        }, 140);
      });
    zoomRef.current = z;
    select(svg).call(z).on("dblclick.zoom", null);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, [applyTransform, scheduleDraw]);

  const animateTo = useCallback(
    (target: { k: number; x: number; y: number }) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;
      cancelAnimationFrame(rafAnim.current);
      const sel0 = select(svg);
      const to = zoomIdentity.translate(target.x, target.y).scale(target.k);
      if (reducedMotion()) {
        sel0.call(z.transform, to);
        return;
      }
      const f = tRef.current;
      const a: [number, number, number] = [(BASE / 2 - f.x) / f.k, (BASE / 2 - f.y) / f.k, BASE / f.k];
      const bv: [number, number, number] = [(BASE / 2 - target.x) / target.k, (BASE / 2 - target.y) / target.k, BASE / target.k];
      const i = interpolateZoom(a, bv);
      const dur = clamp(i.duration * 0.55, 350, 900);
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = clamp((now - t0) / dur, 0, 1);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const [cx, cy, w] = i(e);
        const kk = BASE / w;
        sel0.call(z.transform, zoomIdentity.translate(BASE / 2 - cx * kk, BASE / 2 - cy * kk).scale(kk));
        if (p < 1) rafAnim.current = requestAnimationFrame(tick);
      };
      rafAnim.current = requestAnimationFrame(tick);
    },
    [],
  );

  const fitBounds = (b: [[number, number], [number, number]], fill: number) => {
    const dx = b[1][0] - b[0][0];
    const dy = b[1][1] - b[0][1];
    const k = clamp((fill * BASE) / Math.max(dx, dy, 1), 1, 70);
    return { k, x: BASE / 2 - (k * (b[0][0] + b[1][0])) / 2, y: BASE / 2 - (k * (b[0][1] + b[1][1])) / 2 };
  };

  const zoomBy = (factor: number) => {
    const T = tRef.current;
    const k = clamp(T.k * factor, 1, 80);
    const cx = (BASE / 2 - T.x) / T.k;
    const cy = (BASE / 2 - T.y) / T.k;
    animateTo({ k, x: BASE / 2 - cx * k, y: BASE / 2 - cy * k });
  };

  // ---------- seleção ----------
  const selectUf = useCallback(
    (uf: string) => {
      const shape = stateShapes.find((s) => s.uf === uf);
      if (!shape) return;
      setSel({ uf, ibge: null });
      setHover(null);
      animateTo(fitBounds(shape.bounds, 0.88));
      void loadMunis(uf);
      setAnnounce(`${estadoByUf.get(uf)?.nome ?? uf} selecionado.`);
    },
    [animateTo, estadoByUf, loadMunis, stateShapes],
  );

  const selectMuni = useCallback(
    (m: Municipio) => {
      setSel({ uf: m.uf, ibge: m.ibge });
      setHover(null);
      const us = stateShapes.find((x) => x.uf === m.uf);
      if (us) animateTo(fitBounds(us.bounds, 0.88));
      void loadMunis(m.uf).then((b) => {
        const idx = b?.shapeIdx.get(m.ibge);
        const shape = idx !== undefined ? b?.shapes[idx] : undefined;
        if (shape && live.current.sel.ibge === m.ibge) animateTo(fitBounds(shape.bounds, 0.22));
      });
      setAnnounce(`${m.nome}, ${m.uf} selecionado.`);
    },
    [animateTo, loadMunis, stateShapes],
  );

  const reset = useCallback(() => {
    setSel({ uf: null, ibge: null });
    setHover(null);
    animateTo({ k: 1, x: 0, y: 0 });
    setAnnounce("Mostrando o Brasil.");
  }, [animateTo]);

  const backToUf = useCallback(() => {
    const uf = live.current.sel.uf;
    if (uf) selectUf(uf);
  }, [selectUf]);

  // ---------- tamanho ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setSize({ w: Math.max(1, e.contentRect.width), h: Math.max(1, e.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- ponteiro ----------
  const munisActive = !!bundle && !!sel.uf;

  const pickAt = (e: RPointerEvent<SVGSVGElement>): Hover | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const L = live.current;
    if (L.bundle && svgRef.current && L.sel.uf) {
      const [px, py] = pointer(e.nativeEvent, svgRef.current);
      const T = tRef.current;
      const onlyUf = L.sel.uf;
      const i = L.bundle.index.find((px - T.x) / T.k, (py - T.y) / T.k, (s) => !onlyUf || s.uf === onlyUf);
      const s = i >= 0 ? L.bundle.shapes[i] : undefined;
      if (s) return { kind: "mun", id: s.ibge, x, y };
    }
    const el = (e.target as Element).closest?.("[data-uf]");
    const uf = el?.getAttribute("data-uf");
    return uf ? { kind: "uf", id: uf, x, y } : null;
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" || interacting.current) return;
    const h = pickAt(e);
    setHover((prev) => (!h ? (prev ? null : prev) : prev && prev.id === h.id && prev.kind === h.kind && Math.abs(prev.x - h.x) + Math.abs(prev.y - h.y) < 2 ? prev : h));
  };

  const onClick = (e: RPointerEvent<SVGSVGElement>) => {
    const h = pickAt(e as RPointerEvent<SVGSVGElement>);
    if (!h) return;
    if (h.kind === "uf") selectUf(h.id);
    else {
      const m = live.current.bundle?.byIbge.get(h.id);
      if (m) selectMuni(m);
    }
  };

  const onStateKey = (e: KeyboardEvent<SVGPathElement>, uf: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectUf(uf);
      return;
    }
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dir[e.key];
    if (!d) return;
    e.preventDefault();
    const cur = stateShapes.find((s) => s.uf === uf);
    if (!cur) return;
    let best: { uf: string; score: number } | null = null;
    for (const s of stateShapes) {
      if (s.uf === uf) continue;
      const vx = s.centroid[0] - cur.centroid[0];
      const vy = s.centroid[1] - cur.centroid[1];
      const along = vx * d[0] + vy * d[1];
      if (along <= 0) continue;
      const across = Math.abs(vx * d[1] - vy * d[0]);
      const score = along + across * 1.6;
      if (!best || score < best.score) best = { uf: s.uf, score };
    }
    if (best) svgRef.current?.querySelector<SVGPathElement>(`[data-uf="${best.uf}"]`)?.focus();
  };

  // ---------- derivados ----------
  const entity: PanelEntity = useMemo(() => {
    if (sel.ibge && bundle?.byIbge.get(sel.ibge)) {
      const m = bundle.byIbge.get(sel.ibge) as Municipio;
      return { kind: "mun", nome: m.nome, subtitulo: estadoByUf.get(m.uf)?.nome, tally: m };
    }
    if (sel.uf && estadoByUf.get(sel.uf)) {
      const e = estadoByUf.get(sel.uf) as Estado;
      return { kind: "uf", nome: e.nome, subtitulo: `Região ${({ N: "Norte", NE: "Nordeste", CO: "Centro-Oeste", SE: "Sudeste", S: "Sul" } as const)[e.regiao]}`, tally: e };
    }
    return { kind: "br", nome: "Brasil", subtitulo: "Todo o país, com o exterior", tally: nacional };
  }, [sel, bundle, estadoByUf, nacional]);

  const tip: TooltipInfo | null = useMemo(() => {
    if (!hover) return null;
    if (hover.kind === "mun") {
      const m = bundle?.byIbge.get(hover.id);
      return m ? { nome: m.nome, detalhe: estadoByUf.get(m.uf)?.nome, tally: m, x: hover.x, y: hover.y } : null;
    }
    const e = estadoByUf.get(hover.id);
    return e ? { nome: e.nome, detalhe: "Estado", tally: e, x: hover.x, y: hover.y } : null;
  }, [hover, bundle, estadoByUf]);

  const loadingMunis = !bundle && status !== "error" && !!sel.uf;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MunicipalitySearch municipios={searchList} onWake={() => void loadSearchList()} onPick={selectMuni} />
        <a href="#tabela" className="ml-auto rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">Ver como tabela</a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {(
            <>
              <div
                ref={containerRef}
                className="relative mx-auto aspect-square w-full max-w-[860px] card overflow-hidden"
                onPointerLeave={() => { activeWheel.current = false; setHover(null); }}
                onPointerDown={() => { activeWheel.current = true; }}
                onKeyDown={(e) => { if (e.key === "Escape") reset(); }}
              >
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${BASE} ${BASE}`}
                  className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
                  style={{ touchAction: "pan-y" }}
                  role="group"
                  aria-label="Mapa do Brasil com o resultado do 2º turno. Use Tab e as setas para percorrer os estados e Enter para abrir."
                  onPointerMove={onPointerMove}
                  onClick={onClick}
                >
                  <g ref={gRef}>
                    {stateShapes.map((s) => {
                      const e = estadoByUf.get(s.uf);
                      const p = e ? pctValidos(e) : { lula: 50, flavio: 50 };
                      const selected = sel.uf === s.uf;
                      const hideFill = selected && munisActive;
                      const dim = !!sel.uf && !selected;
                      return (
                        <path
                          key={s.uf}
                          d={s.d}
                          data-uf={s.uf}
                          className="map-state outline-offset-0"
                          tabIndex={0}
                          role="button"
                          aria-label={e ? `${e.nome}: Lula ${fmtPct(p.lula)}, Flávio Bolsonaro ${fmtPct(p.flavio)}` : s.uf}
                          onKeyDown={(ev) => onStateKey(ev, s.uf)}
                          onFocus={() => {
                            const c = containerRef.current?.getBoundingClientRect();
                            const sv = svgRef.current?.getBoundingClientRect();
                            if (c && sv && !sel.uf) {
                              const sc = Math.min(sv.width, sv.height) / BASE;
                              const T = tRef.current;
                              setHover({ kind: "uf", id: s.uf, x: (s.centroid[0] * T.k + T.x) * sc + (sv.width - BASE * sc) / 2, y: (s.centroid[1] * T.k + T.y) * sc });
                            }
                          }}
                          onBlur={() => setHover(null)}
                          fill={hideFill ? "none" : colorForPctLula(p.lula, theme)}
                          fillOpacity={dim ? 0.32 : 1}
                          stroke="var(--surface)"
                                          strokeWidth={1.2}
                          vectorEffect="non-scaling-stroke"
                          pointerEvents={hideFill ? "none" : "all"}
                          style={{ cursor: "pointer" }}
                        />
                      );
                    })}
                  </g>
                </svg>
                <Tooltip info={tip} width={size.w} height={size.h} />

                {loadingMunis ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70" role="status">
                    <div className="skeleton h-2 w-40" />
                    <span className="sr-only">Carregando municípios…</span>
                  </div>
                ) : null}
                {status === "error" ? (
                  <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-ink bg-surface p-3 text-sm" role="alert">
                    <span>Não foi possível carregar os municípios.</span>
                    <button type="button" onClick={() => { setStatus("idle"); if (sel.uf) void loadMunis(sel.uf); }} className="border border-ink px-2.5 py-1 font-medium hover:bg-ink hover:text-bg">
                      Tentar de novo
                    </button>
                  </div>
                ) : null}

                <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow)]">
                  <button type="button" aria-label="Aproximar" onClick={() => zoomBy(1.7)} className="h-9 w-9 text-lg hover:bg-surface-2">+</button>
                  <button type="button" aria-label="Afastar" onClick={() => zoomBy(1 / 1.7)} className="h-9 w-9 border-t border-line text-lg hover:bg-surface-2">−</button>
                  <button type="button" aria-label="Voltar ao Brasil" onClick={reset} className="h-9 w-9 border-t border-line text-sm hover:bg-surface-2">⌂</button>
                </div>
              </div>
              <div className="mx-auto mt-3 flex max-w-[860px] flex-wrap items-end justify-between gap-4">
                <Legend />
                <p className="max-w-xs text-xs text-ink-3">Arraste para mover; use + e − ou Ctrl + rolagem para ampliar.</p>
              </div>
              <p className="sr-only" aria-live="polite">{announce}</p>
            </>
          )}
          <SourceNote meta={meta} extra={bundle ? `${fmtInt(bundle.list.length)} municípios com resultado; ${fmtInt(bundle.shapes.length)} desenhados no mapa` : "municípios sob demanda"} />
        </div>

        <MapPanel
          entity={entity}
          candidatos={candidatos}
          municipios={sel.uf ? bundle?.byUf.get(sel.uf) ?? null : null}
          munisLoading={!bundle && status !== "error"}
          selectedIbge={sel.ibge ?? undefined}
          onBack={reset}
          onBackToUf={sel.uf ? backToUf : undefined}
          onPickMuni={selectMuni}
        />
      </div>
    </div>
  );
}

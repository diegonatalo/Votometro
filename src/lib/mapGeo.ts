import { geoConicEqualArea, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

/** Tamanho do sistema de coordenadas base do mapa (viewBox). */
export const BASE = 800;

export interface StateShape {
  uf: string;
  d: string;
  bounds: [[number, number], [number, number]];
  centroid: [number, number];
}

export interface MuniShape {
  ibge: string;
  uf: string;
  path: Path2D;
  bounds: [[number, number], [number, number]];
}

type Props = { id: string; uf?: string };

export function featuresOf(topo: Topology, name: string): Feature<Geometry, Props>[] {
  const obj = topo.objects[name] as GeometryCollection;
  return (feature(topo, obj) as unknown as FeatureCollection<Geometry, Props>).features;
}

export function makeProjection(states: Feature<Geometry, Props>[]): GeoProjection {
  const fc: FeatureCollection<Geometry, Props> = { type: "FeatureCollection", features: states };
  return geoConicEqualArea()
    .rotate([54, 0])
    .parallels([-6, -22])
    .fitExtent(
      [
        [12, 12],
        [BASE - 12, BASE - 12],
      ],
      fc,
    );
}

export function buildStateShapes(topo: Topology, projection: GeoProjection): StateShape[] {
  const gen = geoPath(projection).digits(1);
  return featuresOf(topo, "estados").map((f) => ({
    uf: f.properties.id,
    d: gen(f) ?? "",
    bounds: gen.bounds(f),
    centroid: gen.centroid(f),
  }));
}

export function buildMuniShapes(topo: Topology, projection: GeoProjection): MuniShape[] {
  const gen = geoPath(projection).digits(1);
  return featuresOf(topo, "municipios").map((f) => ({
    ibge: f.properties.id,
    uf: f.properties.uf ?? "",
    path: new Path2D(gen(f) ?? ""),
    bounds: gen.bounds(f),
  }));
}

/** Índice em grade para localizar municípios sob o ponteiro. */
export class GridIndex {
  private cell = 8;
  private n = Math.ceil(BASE / this.cell);
  private cells: number[][] = Array.from({ length: this.n * this.n }, () => []);
  private probe: CanvasRenderingContext2D;

  constructor(private shapes: MuniShape[]) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    this.probe = c.getContext("2d") as CanvasRenderingContext2D;
    shapes.forEach((s, i) => {
      const x0 = Math.max(0, Math.floor(s.bounds[0][0] / this.cell));
      const x1 = Math.min(this.n - 1, Math.floor(s.bounds[1][0] / this.cell));
      const y0 = Math.max(0, Math.floor(s.bounds[0][1] / this.cell));
      const y1 = Math.min(this.n - 1, Math.floor(s.bounds[1][1] / this.cell));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.cells[y * this.n + x]?.push(i);
    });
  }

  /** Índice (em shapes) do município que contém o ponto base (x, y), se houver. */
  find(x: number, y: number, accept: (s: MuniShape) => boolean): number {
    if (x < 0 || y < 0 || x >= BASE || y >= BASE) return -1;
    const list = this.cells[Math.floor(y / this.cell) * this.n + Math.floor(x / this.cell)] ?? [];
    for (const i of list) {
      const s = this.shapes[i];
      if (!s || !accept(s)) continue;
      if (x < s.bounds[0][0] || x > s.bounds[1][0] || y < s.bounds[0][1] || y > s.bounds[1][1]) continue;
      if (this.probe.isPointInPath(s.path, x, y)) return i;
    }
    return -1;
  }
}

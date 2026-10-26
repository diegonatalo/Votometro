import { writeFile } from "node:fs/promises";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { feature, quantize } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import { UFS } from "../src/lib/meta";

const IBGE = "https://servicodados.ibge.gov.br/api/v3/malhas";

async function fetchTopo(q: string): Promise<Topology> {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${IBGE}/${q}`);
    if (res.ok) return (await res.json()) as Topology;
    await new Promise((r) => setTimeout(r, 800 * 2 ** i));
  }
  throw new Error(`Falha ao baixar malha IBGE: ${q}`);
}

function toFeatures(topo: Topology): FeatureCollection<Geometry, { codarea: string }> {
  const obj = Object.values(topo.objects)[0] as GeometryCollection;
  return feature(topo, obj) as unknown as FeatureCollection<Geometry, { codarea: string }>;
}

function rebuild(fc: FeatureCollection<Geometry, { id: string; uf?: string }>, name: string, quant: number, keep: number): Topology {
  let t = topology({ [name]: fc }, quant) as Topology;
  t = presimplify(t as never) as unknown as Topology;
  t = simplify(t as never, quantile(t as never, keep)) as unknown as Topology;
  return quantize(t as never, quant) as unknown as Topology;
}

/** Gera as malhas e devolve os códigos IBGE dos municípios presentes. */
export async function buildGeo(): Promise<Set<string>> {
  const byCod = new Map(UFS.map((u) => [u.cod, u.uf]));

  console.log("Malha IBGE: estados…");
  const states = toFeatures(await fetchTopo("paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=UF"));
  const stateFc: FeatureCollection<Geometry, { id: string }> = {
    type: "FeatureCollection",
    features: states.features.map((f) => ({ ...f, id: byCod.get(f.properties.codarea) ?? f.properties.codarea, properties: { id: byCod.get(f.properties.codarea) ?? f.properties.codarea } })),
  };
  const stTopo = rebuild(stateFc, "estados", 1e5, 0.35);
  await writeFile("public/data/geo/estados.topo.json", JSON.stringify(stTopo));

  console.log("Malha IBGE: municípios…");
  const munis = toFeatures(await fetchTopo("paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=municipio"));
  const muniFc: FeatureCollection<Geometry, { id: string; uf: string }> = {
    type: "FeatureCollection",
    features: munis.features.map((f) => ({
      ...f,
      id: f.properties.codarea,
      properties: { id: f.properties.codarea, uf: byCod.get(f.properties.codarea.slice(0, 2)) ?? "" },
    })),
  };
  // Simplifica uma vez para todo o Brasil e divide por UF (o mapa só carrega o estado selecionado).
  const muTopo = rebuild(muniFc, "municipios", 1e5, 0.5);
  muniFc.features = (feature(muTopo as never, muTopo.objects.municipios as never) as unknown as FeatureCollection<Geometry, { id: string; uf: string }>).features;
  // Um arquivo por UF, para o mapa carregar só o estado selecionado.
  let total = 0;
  for (const u of UFS) {
    const fc: FeatureCollection<Geometry, { id: string; uf: string }> = { type: "FeatureCollection", features: muniFc.features.filter((f) => f.properties.uf === u.uf) };
    const t = topology({ municipios: fc }, 1e5) as Topology;
    const out = JSON.stringify(t);
    total += out.length;
    await writeFile(`public/data/geo/municipios-${u.uf}.topo.json`, out);
  }
  console.log(`Geometrias por UF: ${(total / 1e6).toFixed(2)} MB no total`);
  return new Set(muniFc.features.map((f) => f.properties.id));
}

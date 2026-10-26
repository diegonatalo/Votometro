import { readFileSync } from "node:fs";
import path from "node:path";
import type { Topology } from "topojson-specification";
import type { NationalFile, OvertimeFile, StatesFile } from "./types";

function read<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "public", "data", ...parts), "utf8")) as T;
}

export const loadNational = () => read<NationalFile>("national.json");
export const loadStates = () => read<StatesFile>("states.json");
export const loadOvertime = () => read<OvertimeFile>("overtime.json");
export const loadStatesTopo = () => read<Topology>("geo", "estados.topo.json");

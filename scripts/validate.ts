import { readFile } from "node:fs/promises";
import { validateAll } from "../src/lib/validation";
import type { MunicipiosFile, NationalFile, StatesFile } from "../src/lib/types";

const read = async <T>(f: string): Promise<T> => JSON.parse(await readFile(`public/data/${f}`, "utf8")) as T;

export async function runValidation(): Promise<boolean> {
  const [national, states, munis] = await Promise.all([
    read<NationalFile>("national.json"),
    read<StatesFile>("states.json"),
    read<MunicipiosFile>("municipios.json"),
  ]);
  const checks = validateAll(national, states, munis);
  for (const c of checks) {
    const tag = c.nivel === "ok" ? "  OK  " : c.nivel === "erro" ? " ERRO " : " info ";
    console.log(`[${tag}] ${c.texto}`);
  }
  const erros = checks.filter((c) => c.nivel === "erro").length;
  console.log(erros === 0 ? "\nValidação concluída: todos os totais conferem." : `\nValidação FALHOU: ${erros} divergência(s).`);
  return erros === 0;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/validate.ts")) {
  runValidation().then((ok) => process.exit(ok ? 0 : 1));
}

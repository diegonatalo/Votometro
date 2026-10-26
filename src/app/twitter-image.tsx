import { renderOg } from "@/lib/og";

export const dynamic = "force-static";
export const alt = "Votômetro: resultado do 2º turno da eleição presidencial de 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOg();
}

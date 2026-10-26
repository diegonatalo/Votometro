import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0d13" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M10 42A22 22 0 0 1 32 20" fill="none" stroke="#ff8576" strokeWidth="8" />
          <path d="M32 20A22 22 0 0 1 54 42" fill="none" stroke="#7fb0ff" strokeWidth="8" />
          <path d="M32 42V27" stroke="#eef1f6" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="32" cy="42" r="4.5" fill="#eef1f6" />
          <circle cx="32" cy="54" r="3" fill="#6ee7a8" />
        </svg>
      </div>
    ),
    size,
  );
}

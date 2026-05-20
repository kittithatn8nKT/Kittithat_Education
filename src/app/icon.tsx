import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
        color: "white",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        letterSpacing: -1,
      }}
    >
      K
    </div>,
    size
  );
}

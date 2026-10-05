import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export const size = {
  width: 96,
  height: 96,
};

export const contentType = "image/png";

export default async function Icon() {
  const imagePath = path.join(
    process.cwd(),
    "public/images/E46A9831-DB98-40B0-9EBB-7027F45DF80F.png"
  );
  const image = await readFile(imagePath);
  const imageData = `data:image/png;base64,${image.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <img
          src={imageData}
          alt="Salmaan Mukhtaar Xaashi"
          width={96}
          height={96}
          style={{
            width: "96px",
            height: "96px",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
    ),
    size
  );
}

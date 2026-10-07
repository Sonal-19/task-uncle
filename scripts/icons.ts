// Renders the PWA / touch icons from public/logo.svg: `bun run icons`.
import { Resvg } from "@resvg/resvg-js";

const pub = new URL("../apps/web/public/", import.meta.url);
const svg = await Bun.file(new URL("logo.svg", pub)).text();

const sizes = {
  "pwa-192.png": 192,
  "pwa-512.png": 512,
  "apple-touch-icon.png": 180,
};

for (const [name, size] of Object.entries(sizes)) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  await Bun.write(new URL(name, pub), png);
  console.info(`wrote ${name} (${size}px)`);
}

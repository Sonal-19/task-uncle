// Renders the PWA / touch icons from public/logo.svg: `bun run icons`.
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

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

// iOS launch screens (`apple-touch-startup-image` in index.html): the same
// picture the app's HTML splash paints first, so one fades into the other.
// JPEG: the full-screen gradient makes a PNG ~600 KB, this ~50 KB.
// Portrait only; [width, height, pixel ratio] in CSS points.
const devices: [number, number, number][] = [
  [440, 956, 3],
  [430, 932, 3],
  [420, 912, 3],
  [402, 874, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [414, 736, 3],
  [375, 667, 2],
  [320, 568, 2],
  [1024, 1366, 2],
  [834, 1194, 2],
  [820, 1180, 2],
  [810, 1080, 2],
  [768, 1024, 2],
  [744, 1133, 2],
];

// The bell without its rounded square, on the splash gradient.
const mark = svg
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace(/<rect[^>]*\/>/, "");

const dir = new URL("splash/", pub);
for (const [w, h, r] of devices) {
  const W = w * r;
  const H = h * r;
  const S = Math.min(0.38 * w, 168) * r;
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="sp-bg" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1"
      gradientTransform="translate(${W / 2} ${0.38 * H}) scale(${1.2 * W} ${0.75 * H})">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset=".52" stop-color="#4338ca"/>
      <stop offset="1" stop-color="#1e1b4b"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sp-bg)"/>
  <svg x="${(W - S) / 2}" y="${0.42 * H - S / 2}" width="${S}" height="${S}" viewBox="0 0 512 512">${mark}</svg>
</svg>`;
  const png = new Resvg(splash).render().asPng();
  const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await Bun.write(new URL(`${W}x${H}.jpg`, dir), jpg);
  console.info(`wrote splash/${W}x${H}.jpg`);
}

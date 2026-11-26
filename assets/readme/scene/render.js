// Renders scene.html in this folder to ../banner.png (1280x400) with Playwright.
// Usage, from this folder: NODE_PATH=<a node_modules that holds playwright> node render.js
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = __dirname;
const OUT = path.join(ROOT, "..", "banner.png");
const W = 1280, H = 400;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png" };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => { console.error(e); process.exitCode = 1; });
  page.on("console", (m) => console.log("[page]", m.text().slice(0, 1500)));
  await page.goto(`http://127.0.0.1:${port}/scene.html`);
  await page.waitForSelector("body[data-ready]", { timeout: 60000 });
  await page.screenshot({ path: OUT, type: "png" });
  await browser.close();
  server.close();
  console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
});

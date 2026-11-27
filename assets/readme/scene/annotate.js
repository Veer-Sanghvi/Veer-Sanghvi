// Drawing-style overlay helpers shared by the banner scenes: mono leader
// labels, dimension lines with arrowheads, and a shared studio rig.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const LIME = 0xC6F432;
export const W = 1280, H = 400;

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

// warm key with a soft shadow, cool rim, low fill, room reflections
export function makeStudio(renderer, scene, scale = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(4 * scale, 7 * scale, 5 * scale);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 8;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0003;
  Object.assign(key.shadow.camera, { left: -6 * scale, right: 6 * scale, top: 6 * scale, bottom: -6 * scale, near: 0.5 * scale, far: 30 * scale });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd0ff, 1.5);
  rim.position.set(-6 * scale, 4 * scale, -5 * scale);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-3 * scale, -2 * scale, 6 * scale);
  scene.add(fill);
}

export function radialTexture(inner, outer, size = 512, hold = 0.2) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner); if (hold > 0) grad.addColorStop(hold, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// fading dark floor at y = 0 with a faint grid (cell = one unit of `cell`)
export function makeFloor(scene, radius, cell, gridExtent) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 72), new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.96, metalness: 0, transparent: true, alphaMap: radialTexture("#ffffff", "#000000", 512, 0.18), envMapIntensity: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pts = [];
  for (let v = -gridExtent; v <= gridExtent + 1e-6; v += cell) pts.push(v, 0.002, -gridExtent, v, 0.002, gridExtent, -gridExtent, 0.002, v, gridExtent, 0.002, v);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 })));
  return floor;
}

// procedural grain for brushed and cast finishes
export function grainTexture(seed = 7, repeat = 6, lo = 150, span = 105) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"), img = g.createImageData(512, 512);
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < img.data.length; i += 4) { const v = lo + rnd() * span; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); return t;
}

export function project(v, camera) {
  const p = v.clone().project(camera);
  return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H];
}

// ---- overlay ----
const svgNS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const e = document.createElementNS(svgNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}

// a mono tag with a leader to the anchor. side "right": tag's left edge at (tx, ty);
// "left": its right edge; "above"/"below": tag centred on tx with a vertical leader
export function leader(svg, tagsHost, anchor, tx, ty, html, side = "right") {
  const tag = document.createElement("div");
  tag.className = "tag"; tag.innerHTML = html;
  tagsHost.appendChild(tag);
  const r = tag.getBoundingClientRect();
  let left = tx, top = ty - r.height / 2, x1, y1 = ty;
  if (side === "left") left = tx - r.width;
  if (side === "left" || side === "right") x1 = anchor[0] > left + r.width / 2 ? left + r.width + 5 : left - 5;   // leave from the edge that faces the anchor
  else { left = tx - r.width / 2; top = side === "above" ? ty - r.height : ty; x1 = tx; y1 = side === "above" ? ty + 5 : ty - 5; }
  tag.style.left = left + "px"; tag.style.top = top + "px";
  el("line", { x1, y1, x2: anchor[0], y2: anchor[1], class: "leader" }, svg);
  el("circle", { cx: anchor[0], cy: anchor[1], r: 3.2, class: "dot" }, svg);
  return tag;
}

// one column of side tags: each at its anchor's height, pushed apart to `gap`
// px and kept inside [lo, hi]; sorted by height so the leaders never cross
export function column(svg, tagsHost, items, tx, side, gap = 32, lo = 40, hi = 320) {
  items = items.slice().sort((u, v) => u[0][1] - v[0][1]);
  const ys = items.map(([a]) => a[1]);
  for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + gap : lo);
  for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i < ys.length - 1 ? ys[i + 1] - gap : hi);
  return items.map(([a, html], i) => leader(svg, tagsHost, a, tx, ys[i], html, side));
}

// a linear dimension between screen points a and b, offset `off` px along the
// normal, with extension lines, filled arrowheads and the text on a dark pill
export function dimension(svg, tagsHost, a, b, off, text) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L, ux = dx / L, uy = dy / L;
  const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
  const gap = 4, over = 8, s = Math.sign(off) || 1;
  el("line", { x1: a[0] + nx * gap * s, y1: a[1] + ny * gap * s, x2: A[0] + nx * over * s, y2: A[1] + ny * over * s, class: "ext" }, svg);
  el("line", { x1: b[0] + nx * gap * s, y1: b[1] + ny * gap * s, x2: B[0] + nx * over * s, y2: B[1] + ny * over * s, class: "ext" }, svg);
  el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], class: "dim" }, svg);
  const ah = 9, aw = 2.6;
  const head = (P, dir) => el("polygon", { points: `${P[0]},${P[1]} ${P[0] + dir * ux * ah + nx * aw},${P[1] + dir * uy * ah + ny * aw} ${P[0] + dir * ux * ah - nx * aw},${P[1] + dir * uy * ah - ny * aw}`, class: "arrow" }, svg);
  head(A, 1); head(B, -1);
  const tag = document.createElement("div");
  tag.className = "dimtext"; tag.textContent = text;
  tagsHost.appendChild(tag);
  const r = tag.getBoundingClientRect();
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  tag.style.left = (mx - r.width / 2) + "px"; tag.style.top = (my - r.height / 2) + "px";
  return tag;
}

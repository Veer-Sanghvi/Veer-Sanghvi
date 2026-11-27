// Material and mesh helpers from the portfolio showpiece runtime
// (veer-sanghvi.github.io assets/hero-3d/studio.js, lines 12 to 80), copied
// without the orbit and room imports so the banner scene needs no extra addons.
import * as THREE from "three";

export const LIME = 0xC6F432;

// matte, machined, shop-floor materials; nothing glossy
export const mat = {
  paint:    (color = 0x2A2A2D) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.15 }),
  steel:    () => new THREE.MeshStandardMaterial({ color: 0x8E9196, roughness: 0.48, metalness: 0.85 }),
  darkSteel:() => new THREE.MeshStandardMaterial({ color: 0x3B3D42, roughness: 0.5, metalness: 0.8 }),
  alu:      () => new THREE.MeshStandardMaterial({ color: 0xB9BCC2, roughness: 0.58, metalness: 0.7 }),
  castAlu:  () => new THREE.MeshStandardMaterial({ color: 0x9A9DA3, roughness: 0.9, metalness: 0.45 }),
  // sand-cast aluminium as it comes out of the mould: light grey, matte, grainy
  cast:     () => { const g = grainTexture(5, 5, 120, 120); g.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ color: 0xBFC1C5, map: g, roughness: 1.0, metalness: 0.25, bumpMap: g, bumpScale: 0.08, envMapIntensity: 0.45 }); },
  // the same casting where it has been faced on the mill: brighter, smoother, fine brushed lines
  machined: () => { const b = grainTexture(11, 1, 170, 85); b.repeat.set(1, 24); return new THREE.MeshStandardMaterial({ color: 0xC9CBCF, roughness: 0.42, metalness: 0.8, roughnessMap: b, envMapIntensity: 0.9 }); },
  chrome:   () => new THREE.MeshStandardMaterial({ color: 0xD9DBDF, roughness: 0.3, metalness: 0.9 }),
  brass:    () => new THREE.MeshStandardMaterial({ color: 0xC9A646, roughness: 0.42, metalness: 0.9 }),
  rubber:   () => new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.95, metalness: 0 }),
  pcbBlue:  () => new THREE.MeshStandardMaterial({ color: 0x1E4C8F, roughness: 0.7, metalness: 0.1 }),
  pcbRed:   () => new THREE.MeshStandardMaterial({ color: 0x8C1E1E, roughness: 0.7, metalness: 0.1 }),
  plastic:  (color = 0x202124) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }),
  lime:     () => new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.55, roughness: 0.6 }),
};

export function radialTexture(inner, outer, size = 256, hold = 0) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  if (hold > 0) grad.addColorStop(hold, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// procedural grain for cast and brushed finishes (grey noise, lo..lo+span)
export function grainTexture(seed = 7, repeat = 6, lo = 150, span = 105) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d"), img = g.createImageData(512, 512);
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < img.data.length; i += 4) { const v = lo + rnd() * span; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); return t;
}

// helpers the models share
export function box(w, h, d, material, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}
export function cyl(r, len, material, seg = 32, rTop = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, len, seg), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// hex head plus washer, axis along +Y
export function hexBolt(r, h, material = mat.darkSteel()) {
  const g = new THREE.Group();
  const head = cyl(r, h, material, 6);
  head.position.y = h / 2;
  const washer = cyl(r * 1.35, h * 0.25, mat.steel(), 24);
  washer.position.y = h * 0.125;
  g.add(head, washer);
  return g;
}

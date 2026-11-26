// Procedural cast-iron 4-into-1 exhaust manifold with a heat gradient, the
// same model as the HEFP og card: ports hot (yellow-orange), collector dull
// red, outlet flange cool grey. Pure illustration; no dimension is real.
import * as THREE from "three";
import { grainTexture } from "./annotate.js";

export const RAMP = [
  [0.00, 0x2a2d33], [0.25, 0x3a3538], [0.45, 0x6a1e10], [0.65, 0xc23a12], [0.82, 0xff8a1f], [1.00, 0xffe27a],
];

export function buildManifold() {
  const manifold = new THREE.Group();
  const grain = grainTexture(7, 6, 150, 105);
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2c2f, roughness: 0.78, metalness: 0.5, envMapIntensity: 0.9, side: THREE.DoubleSide, roughnessMap: grain, bumpMap: grain, bumpScale: 0.012 });
  iron.onBeforeCompile = (s) => {
    s.uniforms.rampC = { value: RAMP.map((r) => new THREE.Color(r[1])) };
    s.uniforms.rampT = { value: RAMP.map((r) => r[0]) };
    s.uniforms.glow = { value: 1.15 };
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float heat; varying float vHeat;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHeat = heat;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vHeat; uniform vec3 rampC[6]; uniform float rampT[6]; uniform float glow;\nvec3 heatColor(float t){ vec3 c = rampC[0]; for (int i = 0; i < 5; i++) { c = mix(c, rampC[i + 1], smoothstep(rampT[i], rampT[i + 1], t)); } return c; }")
      .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 hc = heatColor(vHeat);\ndiffuseColor.rgb = mix(diffuseColor.rgb, hc, smoothstep(0.15, 0.6, vHeat) * 0.55);")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.45, vHeat);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance = hc * glow * pow(smoothstep(0.22, 1.0, vHeat), 2.2);");
  };

  function withHeat(geo, fn) {
    const n = geo.attributes.position.count, a = new Float32Array(n);
    const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) { p.fromBufferAttribute(geo.attributes.position, i); a[i] = fn(i, p); }
    geo.setAttribute("heat", new THREE.BufferAttribute(a, 1));
    return geo;
  }
  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function hole(x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }
  const mesh = (g) => { const m = new THREE.Mesh(g, iron); m.castShadow = m.receiveShadow = true; manifold.add(m); return m; };

  const PORTS = [-1.5, -0.5, 0.5, 1.5];
  const R = 0.2;
  const MERGE = new THREE.Vector3(0.1, -1.55, 1.45);

  {
    const shape = roundedRect(4.5, 0.95, 0.18);
    PORTS.forEach((x) => shape.holes.push(hole(x, 0, R + 0.02)));
    [-2.05, -1, 0, 1, 2.05].forEach((x) => shape.holes.push(hole(x, 0, 0.065)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 32 });
    g.translate(0, 0, -0.16);
    withHeat(g, (i, p) => { const d = Math.min(...PORTS.map((x) => Math.hypot(p.x - x, p.y))); return 0.62 - Math.min(0.3, Math.max(0, d - 0.25) * 0.5); });
    mesh(g);
  }
  PORTS.forEach((x, k) => {
    const inner = k === 1 || k === 2;
    const end = MERGE.clone().add(new THREE.Vector3(x < 0 ? -0.2 : 0.2, 0.05, inner ? 0.2 : -0.2));
    const sx = x * 0.72;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, -0.1),
      new THREE.Vector3(x, 0.02, 0.55 + (inner ? 0.1 : 0)),
      new THREE.Vector3(sx, -0.45, 1.25 + (inner ? 0.25 : 0.05)),
      new THREE.Vector3(x * 0.32 + 0.05, -1.05, 1.6 + (inner ? 0.15 : -0.05)),
      end,
      end.clone().add(new THREE.Vector3(0, -0.15, 0)),
    ], false, "catmullrom", 0.35);
    const segs = 96, rad = 24;
    const g = new THREE.TubeGeometry(curve, segs, R, rad, false);
    withHeat(g, (i) => { const t = Math.floor(i / (rad + 1)) / segs; return 1 - t * 0.68; });
    mesh(g);
    const c = new THREE.CylinderGeometry(R + 0.06, R + 0.03, 0.14, 32);
    c.rotateX(Math.PI / 2); c.translate(x, 0, 0.07);
    withHeat(c, () => 0.92);
    mesh(c);
  });
  {
    const cone = new THREE.CylinderGeometry(0.6, 0.3, 0.75, 40, 1, false);
    cone.translate(MERGE.x, MERGE.y - 0.28, MERGE.z);
    withHeat(cone, (i, p) => 0.34 - (MERGE.y - 0.28 + 0.375 - p.y) * 0.25);
    mesh(cone);
    const start = new THREE.Vector3(MERGE.x, MERGE.y - 0.63, MERGE.z);
    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().add(new THREE.Vector3(0.05, -0.4, 0.05)),
      start.clone().add(new THREE.Vector3(0.4, -0.8, 0.3)),
      start.clone().add(new THREE.Vector3(1.05, -1.0, 0.55)),
    ], false, "catmullrom", 0.4);
    const segs = 64, rad = 32;
    const g = new THREE.TubeGeometry(curve, segs, 0.3, rad, false);
    withHeat(g, (i) => { const t = Math.floor(i / (rad + 1)) / segs; return 0.25 - t * 0.22; });
    mesh(g);
    const shape = roundedRect(1.05, 1.05, 0.45);
    shape.holes.push(hole(0, 0, 0.3));
    for (let j = 0; j < 3; j++) { const a = j * Math.PI * 2 / 3 + Math.PI / 6; shape.holes.push(hole(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.055)); }
    const fg = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 40 });
    withHeat(fg, () => 0.03);
    const fm = mesh(fg);
    const endP = curve.getPoint(1), tan = curve.getTangent(1).normalize();
    fm.position.copy(endP).addScaledVector(tan, -0.12);
    fm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
  }
  return {
    group: manifold,
    anchors: { port: new THREE.Vector3(-1.5, 0.2, 0.1), collector: new THREE.Vector3(MERGE.x - 0.5, MERGE.y - 0.3, MERGE.z), outlet: new THREE.Vector3(MERGE.x + 1.3, MERGE.y - 1.7, MERGE.z + 0.6) },
  };
}

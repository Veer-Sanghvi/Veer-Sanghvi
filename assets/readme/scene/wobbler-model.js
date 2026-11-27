// High-Speed Wobbler Engine, laid out as the engine is built: a flat sand-cast
// 6061 base with a raised border and cast pads; the cylinder plate (the port
// bar) lying along the base on a raised pad with its long axis horizontal; the
// 6061 cylinder flat beside the plate, rocking on a spring-preloaded trunnion
// stud that passes horizontally through the plate; a brass piston rod running
// parallel to the base to the crank pin; the crankshaft through the plate near
// one end, crank disk on the cylinder side, flywheel on the far side
// overhanging the base edge. Proportions follow the as-built engine but the
// part drawings are course material, so nothing here is published as a
// dimension; the pivot-to-crank distance is schematic.
//
// The mechanism is modelled in a plate-local frame (crank axis z, pivot along
// +y from the crank) and that frame is laid down on the base by rotating it a
// quarter turn about z, so the kinematics stay a planar crank-and-rocker.
import * as THREE from "three";
import { mat, box, cyl, hexBolt, LIME } from "./studio-parts.js";

export const RPM_BENCH = 2340, PLAYBACK = 1 / 40;
const C = new THREE.Vector3(0, 1.7, 0);            // crankshaft centre (plate frame)
const PIVOT_D = 1.3;                               // trunnion beyond the crank along the plate
const P = new THREE.Vector3(0, C.y + PIVOT_D, 0);  // trunnion pivot
const THROW = 0.30, ROD = 1.9, PORT_R = 0.875, PORT_HALF = Math.asin(0.09375 / PORT_R);
const FACE = 0.1875;                               // plate cylinder-side face z
const PLATE_W = 1.45, PLATE_Y = [1.1, 4.0];        // plate height, plate extent along its length
const BASE_L = 4.4, BASE_W = 3.0, BASE_T = 0.5, PAD_H = 0.28;
const PLATE_Z = -1.1;                              // plate stands toward the back edge of the base
// plate frame to world: rotation +90 deg about z (plate +y becomes world -x, plate +x becomes world +y)
const MECH = new THREE.Vector3(2.5, BASE_T + PAD_H + PLATE_W / 2, PLATE_Z);

export function buildWobbler() {
  const group = new THREE.Group();
  const parts = [];
  const anchors = {};
  const mech = new THREE.Group();
  mech.rotation.z = Math.PI / 2;
  mech.position.copy(MECH);
  group.add(mech);
  const add = (obj, ex = [0, 0, 0], parent = mech) => { parent.add(obj); parts.push({ obj, ex: new THREE.Vector3(...ex), home: obj.position.clone() }); return obj; };
  const mark = (name, obj, local = [0, 0, 0]) => { const m = new THREE.Object3D(); m.position.set(...local); obj.add(m); anchors[name] = m; };
  const steel = mat.steel(), brass = mat.brass(), alu = mat.alu();

  // ---- base plate, sand cast: the recessed field keeps its grainy as-cast skin; the border, the pads and
  // the four edges were faced on the mill, so they are brighter and smoother ----
  const base = new THREE.Group();
  const castA = mat.cast(), faced = mat.machined();
  const slab = box(BASE_L, BASE_T, BASE_W, [faced, faced, castA, castA, faced, faced]); slab.position.y = BASE_T / 2; base.add(slab);
  const RIM = 0.18, RIM_H = 0.07;
  [[0, BASE_W / 2 - RIM / 2, BASE_L, RIM], [0, -BASE_W / 2 + RIM / 2, BASE_L, RIM], [BASE_L / 2 - RIM / 2, 0, RIM, BASE_W], [-BASE_L / 2 + RIM / 2, 0, RIM, BASE_W]]
    .forEach(([x, z, l, w]) => { const r = box(l, RIM_H, w, faced); r.position.set(x, BASE_T + RIM_H / 2, z); base.add(r); });
  const pad = (l, h, w, x, z) => { const p = box(l, h, w, faced); p.position.set(x, BASE_T + h / 2, z); base.add(p); return p; };
  pad(3.3, PAD_H, 0.62, MECH.x - (PLATE_Y[0] + PLATE_Y[1]) / 2, PLATE_Z);   // the plate sits on this
  pad(0.42, RIM_H, 1.9, 0.1, -0.3);                                           // long pad
  [-0.9, -0.1, 0.7].forEach((x) => pad(0.56, RIM_H, 0.5, x, 0.55));          // three small pads
  add(base, [0, -0.9, 0], group);
  mark("base", base, [BASE_L / 2 - 0.35, BASE_T / 2, BASE_W / 2 - 0.25]);

  // ---- cylinder plate (the port bar): the two air ports and the crank bearing ----
  const plate = new THREE.Group();
  const slabP = box(PLATE_W, PLATE_Y[1] - PLATE_Y[0], 2 * FACE, alu); slabP.position.y = (PLATE_Y[0] + PLATE_Y[1]) / 2; plate.add(slabP);
  const bearing = cyl(0.32, 0.12, steel, 28); bearing.rotation.x = Math.PI / 2; bearing.position.set(C.x, C.y, FACE + 0.06); plate.add(bearing);
  const bearingRing = cyl(0.16, 0.14, mat.darkSteel(), 20); bearingRing.rotation.x = Math.PI / 2; bearingRing.position.copy(bearing.position); plate.add(bearingRing);
  const ports = [1, -1].map((s) => {
    const m = cyl(0.047, 0.03, mat.lime(), 14);
    m.material.emissiveIntensity = 0;
    m.material.color.set(0x0a0a0a);
    m.rotation.x = Math.PI / 2;
    m.position.set(-s * PORT_R * Math.sin(PORT_HALF), P.y + PORT_R * Math.cos(PORT_HALF), FACE + 0.01);
    plate.add(m); return m;
  });
  add(plate);
  mark("ports", ports[1], [0, 0, 0]);
  mark("bearing", bearing, [0.32, 0, 0]);
  // air inlet fitting on the far side of the plate behind the intake port, supply line dropping off the back of the base
  const fitting = new THREE.Group();
  const hex = cyl(0.12, 0.22, brass, 6); hex.rotation.x = Math.PI / 2; fitting.add(hex);
  const barb = cyl(0.07, 0.3, brass, 12); barb.rotation.x = Math.PI / 2; barb.position.z = -0.25; fitting.add(barb);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.35), new THREE.Vector3(-0.15, 0.1, -0.8), new THREE.Vector3(-0.8, 0.5, -1.4), new THREE.Vector3(-1.42, 1.1, -2.4)]), 16, 0.075, 7), mat.plastic(0x2B2B2E)); fitting.add(hose);
  fitting.position.set(ports[0].position.x, ports[0].position.y, -FACE - 0.11);
  add(fitting, [0, 0, -0.7]);

  // ---- crankshaft, crank disk, crank pin ----
  const shaft = cyl(0.125, 1.5, steel, 20); shaft.rotation.x = Math.PI / 2; shaft.position.set(C.x, C.y, -0.2); add(shaft, [0, 0, 0.5]);
  const crank = new THREE.Group();
  const disk = cyl(0.475, 0.22, alu, 40); disk.rotation.x = Math.PI / 2; crank.add(disk);
  const pin = cyl(0.062, 0.5, steel, 14); pin.rotation.x = Math.PI / 2; pin.position.set(0, THROW, 0.36); crank.add(pin);
  const setScrew = hexBolt(0.05, 0.06); setScrew.position.set(0, 0.475, 0); crank.add(setScrew);
  const crankG = new THREE.Group(); crankG.add(crank);
  crankG.position.set(C.x, C.y, FACE + 0.06 + 0.11 + 0.08);
  add(crankG, [0, 0, 1.0]);
  mark("crank", crankG, [-0.475 * 0.7, -0.475 * 0.7, 0]);
  mark("pin", pin, [0, 0, 0.25]);
  mark("crankC", crankG, [0, 0, 0.5]);

  // ---- flywheel on the far side, overhanging the base edge ----
  const fly = new THREE.Group();
  const rim = cyl(0.975, 0.45, steel, 56); rim.rotation.x = Math.PI / 2; fly.add(rim);
  const groove = cyl(0.84, 0.47, mat.darkSteel(), 56); groove.rotation.x = Math.PI / 2; fly.add(groove);
  const web = cyl(0.78, 0.2, steel, 56); web.rotation.x = Math.PI / 2; fly.add(web);
  const hub = cyl(0.3, 0.62, steel, 24); hub.rotation.x = Math.PI / 2; fly.add(hub);
  for (let i = 0; i < 5; i++) { const h = cyl(0.14, 0.24, mat.plastic(0x0b0b0c), 16); h.rotation.x = Math.PI / 2; const a = (i / 5) * Math.PI * 2; h.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0); fly.add(h); }
  const grub = hexBolt(0.05, 0.08); grub.position.set(0, 0.3, 0); fly.add(grub);
  const flyG = new THREE.Group(); flyG.add(fly);
  flyG.position.set(C.x, C.y, -FACE - 0.1 - 0.225);
  add(flyG, [0, 0, -1.2]);
  mark("flywheel", flyG, [0.975 * Math.cos(-0.6), 0.975 * Math.sin(-0.6), 0]);

  // ---- cylinder: a bar with a real bore, extruded from a 2D section so the cutaway shows the wall ----
  const cylG = new THREE.Group();
  const sec = new THREE.Shape();
  sec.moveTo(-0.375, -0.31); sec.lineTo(0.375, -0.31); sec.lineTo(0.375, 0.31); sec.lineTo(-0.375, 0.31); sec.closePath();
  const bore = new THREE.Path(); bore.absarc(0, 0, 0.1255, 0, Math.PI * 2, true); sec.holes.push(bore);
  const cylMat = mat.alu(); cylMat.side = THREE.DoubleSide;
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), PLATE_Z + FACE + 0.31);   // world space: keeps the plate-side half when enabled
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(sec, { depth: 1.25, bevelEnabled: false, curveSegments: 24 }), cylMat);
  wall.rotation.x = -Math.PI / 2; wall.position.y = -0.25;   // bore runs from the open end (-0.25) up 1.25 in
  wall.castShadow = true; wall.receiveShadow = true;
  const cap = box(0.75, 0.55, 0.62, cylMat); cap.position.y = 1.0 + 0.275;      // closed end, 0.55 in of wall above the bore
  cap.castShadow = true;
  const port = cyl(0.047, 0.2, mat.lime(), 12); port.rotation.x = Math.PI / 2; port.position.set(0, PORT_R, -0.22);
  cylG.add(wall, cap, port);
  cylG.position.set(P.x, P.y, FACE + 0.31);
  add(cylG, [0, 0.4, 1.5]);
  mark("cylinder", cylG, [0.375, 1.1, 0.1]);
  mark("port", port, [0, 0, -0.1]);
  // trunnion stud through the cylinder and the plate, spring preload and nut on the far side
  const stud = cyl(0.095, 1.3, steel, 14); stud.rotation.x = Math.PI / 2; stud.position.set(P.x, P.y, -0.15); add(stud, [0, 0, -2.3]);
  const spring = new THREE.Group();
  const helix = []; for (let i = 0; i <= 48; i++) { const t = i / 48; helix.push(new THREE.Vector3(Math.cos(t * Math.PI * 12) * 0.15, Math.sin(t * Math.PI * 12) * 0.15, -t * 0.26)); }
  spring.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 96, 0.022, 5), steel));
  const nut = hexBolt(0.14, 0.1); nut.rotation.x = -Math.PI / 2; nut.position.z = -0.3; spring.add(nut);
  spring.position.set(P.x, P.y, -FACE - 0.05);
  add(spring, [0, 0, -2.4]);
  mark("trunnion", spring, [0, 0.14, -0.3]);

  // ---- brass piston rod, from the crank pin into the bore ----
  const rodG = new THREE.Group();
  const rod = cyl(0.125, ROD, brass, 20); rod.position.y = ROD / 2; rodG.add(rod);
  const eye = cyl(0.2, 0.2, brass, 20); eye.rotation.x = Math.PI / 2; rodG.add(eye);
  add(rodG, [0.7, 0, 1.6]);
  mark("rod", rod, [0.125, -0.2, 0]);
  mark("rodA", rod, [0, -ROD / 2, 0]);
  mark("rodB", rod, [0, ROD / 2, 0]);

  const state = { phi: 0.6, explode: 0, explodeTarget: 0, cut: false };
  const omega = (RPM_BENCH * PLAYBACK * Math.PI * 2) / 60;
  const d = new THREE.Vector3();

  function pose(phi) {
    const pinW = new THREE.Vector3(C.x + THROW * Math.sin(phi), C.y + THROW * Math.cos(phi), 0);
    crank.rotation.z = -phi;
    fly.rotation.z = -phi;
    d.copy(pinW).sub(P); const dist = d.length(); d.normalize();
    const beta = Math.atan2(d.x, -d.y);
    cylG.rotation.z = beta;
    rodG.rotation.z = beta;
    rodG.position.set(pinW.x, pinW.y, FACE + 0.31);
    // port overlap: each plate port lights as the cylinder port sweeps across it
    const open = [1, -1].map((s) => Math.max(0, 1 - Math.abs(beta - s * PORT_HALF) / PORT_HALF));
    ports.forEach((m, k) => { m.material.emissiveIntensity = open[k] * 0.9; m.material.color.setHex(open[k] > 0.05 ? LIME : 0x0a0a0a); });
    const stateName = beta < -0.006 ? "exhaust open" : beta > 0.006 ? "intake open" : "both sealed";
    return { beta, dist, stateName, extension: ROD - dist };
  }

  const model = {
    group,
    anchor(name) { return anchors[name].getWorldPosition(new THREE.Vector3()); },
    setExploded(on) { state.explodeTarget = on ? 1 : 0; },
    setCutaway(on) { state.cut = on; cylMat.clippingPlanes = on ? [cutPlane] : null; cylMat.needsUpdate = true; },
    onReadout: null,
    tick(dt, t, animate, snap) {
      let busy = false;
      if (animate) { state.phi = (state.phi + omega * dt) % (Math.PI * 2); busy = true; }
      const k = snap ? 1 : 1 - Math.pow(0.02, dt);
      if (Math.abs(state.explode - state.explodeTarget) > 0.002) { state.explode += (state.explodeTarget - state.explode) * k; busy = true; } else state.explode = state.explodeTarget;
      const info = pose(state.phi);
      const e = state.explode < 0.5 ? 2 * state.explode * state.explode : 1 - Math.pow(-2 * state.explode + 2, 2) / 2;
      parts.forEach((p) => { if (p.obj !== rodG) p.obj.position.copy(p.home); p.obj.position.addScaledVector(p.ex, e); });
      cutPlane.constant = PLATE_Z + cylG.position.z;   // the cut follows the cylinder out in the exploded view
      if (model.onReadout) model.onReadout(state.phi, info);
      return busy;
    },
  };
  return model;
}

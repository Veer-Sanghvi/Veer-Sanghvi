// Procedural wobbler engine, modelled in inches from the dimensions in the
// machining reports (README): flywheel OD 1.9561 with a 1.0012 hub, crank disk
// 0.95 OD x 0.22 thick, cylinder 1.526 long with a 0.2510 bore, cylinder plate
// 2.8127 long, brass piston with a 0.136 cross hole, 1/4-28 UNF air coupling.
// Everything else (web thickness, boss sizes, crank throw) is a visual guess
// and is not called out anywhere. Not a copy of the course drawings.
import * as THREE from "three";
import { grainTexture } from "./annotate.js";

export function buildWobbler(crankDeg = 62) {
  const g = new THREE.Group();
  const brushed = grainTexture(11, 1, 170, 85); brushed.repeat.set(1, 24);
  const castGrain = grainTexture(5, 4, 120, 135);
  const alu = new THREE.MeshStandardMaterial({ color: 0xb8b9bc, metalness: 0.92, roughness: 0.38, roughnessMap: brushed, envMapIntensity: 1.0 });
  const aluFlat = new THREE.MeshStandardMaterial({ color: 0xa9aaad, metalness: 0.9, roughness: 0.44, envMapIntensity: 0.9 });
  const cast = new THREE.MeshStandardMaterial({ color: 0x55565a, metalness: 0.3, roughness: 0.9, bumpMap: castGrain, bumpScale: 0.02, roughnessMap: castGrain, envMapIntensity: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd2a84c, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3b3c40, metalness: 0.9, roughness: 0.38, envMapIntensity: 0.9 });
  const tube = new THREE.MeshPhysicalMaterial({ color: 0x23262b, metalness: 0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });

  const add = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const shcs = (d, headH, len, pos, rot) => {
    // socket head cap screw along local +y: head at y 0..headH, shank below
    const s = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(d, d, headH, 32), steel);
    head.position.y = headH / 2;
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.5, d * 0.5, headH * 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.7, metalness: 0.5 }));
    sock.position.y = headH * 0.78;
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.55, d * 0.55, len, 16), steel);
    shank.position.y = -len / 2;
    [head, sock, shank].forEach((m) => { m.castShadow = m.receiveShadow = true; s.add(m); });
    s.position.set(...pos); if (rot) s.rotation.set(...rot);
    g.add(s);
    return s;
  };

  // ---- base: sand-cast slab, face milled top and bottom ----
  const BASE_L = 5.927, BASE_W = 2.9625, BASE_T = 0.5;
  add(new THREE.BoxGeometry(BASE_L, BASE_T, BASE_W), cast, [0, BASE_T / 2, 0]);
  // milled top face: a thin brighter skin so the machined faces read as machined
  const milled = new THREE.MeshStandardMaterial({ color: 0x85868a, metalness: 0.5, roughness: 0.56, roughnessMap: brushed, envMapIntensity: 0.45 });
  add(new THREE.BoxGeometry(BASE_L - 0.02, 0.012, BASE_W - 0.02), milled, [0, BASE_T + 0.006, 0]);

  // ---- cylinder plate: upright, 2.8127 long, carries the pivot and the crank bearing ----
  const PL_H = 2.8127, PL_W = 1.45, PL_T = 0.25, PL_Z = 0;
  const plateY0 = BASE_T + 0.012;
  add(new THREE.BoxGeometry(PL_W, PL_H, PL_T), alu, [0, plateY0 + PL_H / 2, PL_Z]);
  // two 1/4-20 UNC screws through a foot angle into the base
  add(new THREE.BoxGeometry(PL_W, 0.25, 0.6), alu, [0, plateY0 + 0.125, PL_Z + PL_T / 2 + 0.3]);
  shcs(0.19, 0.25, 0.4, [-0.45, plateY0 + 0.25, PL_Z + PL_T / 2 + 0.38]);
  shcs(0.19, 0.25, 0.4, [0.45, plateY0 + 0.25, PL_Z + PL_T / 2 + 0.38]);

  const pivotY = plateY0 + 2.25, crankY = plateY0 + 0.85;
  const FRONT = PL_Z + PL_T / 2;
  // inlet and exhaust ports on the plate face, on the arc the cylinder port sweeps
  [-0.2, 0.2].forEach((dx) => add(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 }), [dx, pivotY - 0.72, FRONT + 0.012], [Math.PI / 2, 0, 0]));
  // crank bearing boss on the plate front
  add(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 40), alu, [0, crankY, FRONT + 0.06], [Math.PI / 2, 0, 0]);

  // ---- crankshaft, crank disk, crank pin ----
  const DISK_R = 0.95 / 2, DISK_T = 0.22, THROW = 0.4;
  add(new THREE.CylinderGeometry(0.125, 0.125, 2.0, 24), aluFlat, [0, crankY, FRONT + 0.3 - 1.0 + 0.1], [Math.PI / 2, 0, 0]);
  const diskZ = FRONT + 0.12 + 0.06 + DISK_T / 2;
  add(new THREE.CylinderGeometry(DISK_R, DISK_R, DISK_T, 48), alu, [0, crankY, diskZ], [Math.PI / 2, 0, 0]);
  // 0.75 face step on the disk
  add(new THREE.CylinderGeometry(0.375, 0.375, 0.02, 48), aluFlat, [0, crankY, diskZ + DISK_T / 2 + 0.01], [Math.PI / 2, 0, 0]);
  const phi = (crankDeg * Math.PI) / 180;
  const pin = new THREE.Vector3(THROW * Math.cos(phi), crankY + THROW * Math.sin(phi), diskZ + DISK_T / 2);
  add(new THREE.CylinderGeometry(0.062, 0.062, 0.6, 20), steel, [pin.x, pin.y, pin.z + 0.25], [Math.PI / 2, 0, 0]);

  // ---- cylinder: trunnion-pivoted block, bore on its axis, swings about the pivot ----
  const CYL_L = 1.526, CYL_W = 0.6, CYL_D = 0.5;
  const cylZ = pin.z + 0.28;
  const pivot = new THREE.Vector3(0, pivotY, cylZ);
  const axis = new THREE.Vector3(pin.x - pivot.x, pin.y - pivot.y, 0);
  const dPin = axis.length(); axis.normalize();
  const theta = Math.atan2(axis.x, -axis.y); // tilt from straight down
  const cyl = new THREE.Group();
  cyl.position.copy(pivot);
  cyl.rotation.z = -theta;
  g.add(cyl);
  const ca = (geo, mat, y, z = 0, x = 0, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; cyl.add(m); return m; };
  const TOP = 0.42; // cylinder extends 0.42 above the pivot, the rest below
  ca(new THREE.BoxGeometry(CYL_W, CYL_L, CYL_D), alu, TOP - CYL_L / 2);
  // bore mouth at the bottom face
  ca(new THREE.CylinderGeometry(0.1255, 0.1255, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 }), TOP - CYL_L - 0.005);
  // trunnion pin through the plate, spring and nut on the back
  ca(new THREE.CylinderGeometry(0.1245, 0.1245, cylZ + 0.9, 24), aluFlat, 0, -(cylZ + 0.9) / 2 + CYL_D / 2, 0, [Math.PI / 2, 0, 0]);
  const springPts = [];
  for (let i = 0; i <= 160; i++) { const t = i / 160; springPts.push(new THREE.Vector3(0.16 * Math.cos(t * Math.PI * 14), 0.16 * Math.sin(t * Math.PI * 14), -PL_Z - PL_T / 2 - 0.05 - t * 0.45 - cylZ)); }
  ca(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 400, 0.022, 10, false), steel, 0, 0);
  ca(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 6), steel, 0, -PL_T / 2 - 0.58 - cylZ, 0, [Math.PI / 2, 0, 0]);
  // brass piston: rides in the bore, bottom end carries the 0.136 cross hole on the crank pin
  const PISTON_L = 1.55;
  ca(new THREE.CylinderGeometry(0.125, 0.125, PISTON_L, 32), brass, -dPin + PISTON_L / 2);
  ca(new THREE.CylinderGeometry(0.068, 0.068, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 }), -dPin, 0, 0, [Math.PI / 2, 0, 0]);

  // ---- flywheel on the back of the plate: rim, web, hub, set screw ----
  const FW_R = 1.9561 / 2, HUB_R = 1.0012 / 2;
  const prof = [
    new THREE.Vector2(0.1255, 0), new THREE.Vector2(HUB_R, 0), new THREE.Vector2(HUB_R, 0.42),
    new THREE.Vector2(HUB_R - 0.08, 0.42), new THREE.Vector2(FW_R - 0.3, 0.42), new THREE.Vector2(FW_R - 0.3, 0.58),
    new THREE.Vector2(FW_R - 0.03, 0.58), new THREE.Vector2(FW_R, 0.55), new THREE.Vector2(FW_R, 0.03), new THREE.Vector2(FW_R - 0.03, 0),
    new THREE.Vector2(FW_R - 0.3, 0), new THREE.Vector2(FW_R - 0.3, 0.16), new THREE.Vector2(HUB_R + 0.0, 0.16), new THREE.Vector2(HUB_R, 0.0),
  ];
  const fwZ = PL_Z - PL_T / 2 - 0.12;
  const fw = add(new THREE.LatheGeometry(prof, 72), alu, [0, crankY, fwZ], [Math.PI / 2, 0, 0]);
  fw.rotation.set(-Math.PI / 2, 0, 0); // profile y runs toward -z
  // the brushed grain follows the turning marks
  const spacer = add(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32), aluFlat, [0, crankY, fwZ + 0.06], [Math.PI / 2, 0, 0]);
  shcs(0.07, 0.08, 0.12, [0, crankY + HUB_R, fwZ - 0.3], [0, 0, 0]);

  // ---- 1/4-28 UNF air coupling on the back of the plate, with the plastic supply tube ----
  const cpl = new THREE.Vector3(-0.2, pivotY - 0.72, PL_Z - PL_T / 2);
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 6), alu, [cpl.x, cpl.y, cpl.z - 0.09], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24), aluFlat, [cpl.x, cpl.y, cpl.z - 0.3], [Math.PI / 2, 0, 0]);
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cpl.x, cpl.y, cpl.z - 0.4),
    new THREE.Vector3(cpl.x + 0.3, cpl.y - 0.2, cpl.z - 0.8),
    new THREE.Vector3(cpl.x + 1.3, cpl.y - 1.2, cpl.z - 1.0),
    new THREE.Vector3(cpl.x + 2.6, cpl.y - 2.5, cpl.z - 1.1),
  ]);
  add(new THREE.TubeGeometry(tubeCurve, 80, 0.075, 16, false), tube);

  // world-space anchors for the overlay (all in inches, group space = world)
  const pinW = pin.clone();
  const cylMid = new THREE.Vector3(0, TOP - CYL_L / 2 + 0.2, 0).applyEuler(cyl.rotation).add(pivot).add(new THREE.Vector3(-CYL_W / 2 * Math.cos(theta), 0, 0));
  const pistonPt = new THREE.Vector3(0.125, -dPin + 0.55, 0).applyEuler(cyl.rotation).add(pivot);
  return {
    group: g,
    anchors: {
      flywheel: new THREE.Vector3(-FW_R * 0.72, crankY + FW_R * 0.62, fwZ - 0.58),
      hub: new THREE.Vector3(0, crankY + HUB_R, fwZ - 0.42),
      crank: new THREE.Vector3(-DISK_R * 0.6, crankY - DISK_R * 0.5, diskZ + DISK_T / 2),
      pin: pinW.clone().add(new THREE.Vector3(0.062, 0, 0.5)),
      cylinder: cylMid,
      piston: pistonPt,
      pivot: new THREE.Vector3(0, pivotY, cylZ + CYL_D / 2),
      plate: new THREE.Vector3(PL_W / 2, plateY0 + PL_H - 0.35, PL_Z),
      base: new THREE.Vector3(BASE_L / 2 - 0.3, BASE_T / 2, BASE_W / 2),
      coupling: new THREE.Vector3(cpl.x, cpl.y, cpl.z - 0.3),
      screw: new THREE.Vector3(0.45, plateY0 + 0.5, PL_Z + PL_T / 2 + 0.38),
    },
    dims: {
      flywheelOD: [new THREE.Vector3(0, crankY + FW_R, fwZ - 0.58), new THREE.Vector3(0, crankY - FW_R, fwZ - 0.58)],
      plateLen: [new THREE.Vector3(PL_W / 2, plateY0, PL_Z + PL_T / 2), new THREE.Vector3(PL_W / 2, plateY0 + PL_H, PL_Z + PL_T / 2)],
      cylLen: [new THREE.Vector3(CYL_W / 2, TOP, CYL_D / 2).applyEuler(cyl.rotation).add(pivot), new THREE.Vector3(CYL_W / 2, TOP - CYL_L, CYL_D / 2).applyEuler(cyl.rotation).add(pivot)],
    },
    crankY, pivotY, fwZ,
  };
}

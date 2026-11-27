// Procedural wobbler engine, modelled in inches from the dimensions in the
// machining reports (README): flywheel OD 1.9561 with a 1.0012 hub, crank disk
// 0.95 OD x 0.22 thick, cylinder 1.526 long with a 0.2510 bore, cylinder plate
// 2.8127 long, brass piston with a 0.136 cross hole, 1/4-28 UNF air coupling.
// Everything else (base, pads, boss sizes, crank throw) is a visual guess and
// is not called out anywhere. Not a copy of the course drawings.
//
// Layout follows the engine as built: the cylinder plate lies along the base
// with its long axis horizontal, the cylinder flat beside it, the crankshaft
// and trunnion stud through the plate horizontally, spring and flywheel on the
// far side overhanging the base edge. The mechanism is modelled in a plate
// frame (crank axis z, pivot along +y from the crank) and laid down with a
// quarter turn about z.
import * as THREE from "three";
import { grainTexture } from "./annotate.js";

export function buildWobbler(crankDeg = 62) {
  const g = new THREE.Group();
  const brushed = grainTexture(11, 1, 170, 85); brushed.repeat.set(1, 24);
  const castGrain = grainTexture(5, 5, 120, 120); castGrain.colorSpace = THREE.SRGBColorSpace;
  const alu = new THREE.MeshStandardMaterial({ color: 0xb8b9bc, metalness: 0.92, roughness: 0.38, roughnessMap: brushed, envMapIntensity: 1.0 });
  const aluFlat = new THREE.MeshStandardMaterial({ color: 0xa9aaad, metalness: 0.9, roughness: 0.44, envMapIntensity: 0.9 });
  const aluBright = new THREE.MeshStandardMaterial({ color: 0xd4d5d8, metalness: 0.9, roughness: 0.3, roughnessMap: brushed, envMapIntensity: 1.1 });   // freshly milled cylinder, lighter than the plate
  // sand-cast 6061 as it left the mould: light grey, matte, grainy; the faced border, pads and edges are brighter and smoother
  const cast = new THREE.MeshStandardMaterial({ color: 0xbfc1c5, map: castGrain, metalness: 0.25, roughness: 1.0, bumpMap: castGrain, bumpScale: 0.08, envMapIntensity: 0.45 });
  const milled = new THREE.MeshStandardMaterial({ color: 0xc9cbcf, metalness: 0.8, roughness: 0.42, roughnessMap: brushed, envMapIntensity: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd2a84c, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3b3c40, metalness: 0.9, roughness: 0.38, envMapIntensity: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 });
  const tube = new THREE.MeshPhysicalMaterial({ color: 0x23262b, metalness: 0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });

  const mesh = (parent, geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ---- base: sand-cast slab, raised border, three small pads, one long pad, a milled pad under the plate ----
  const BASE_L = 4.4, BASE_W = 3.0, BASE_T = 0.5, RIM = 0.18, RIM_H = 0.07, PAD_H = 0.28, PLATE_Z = -1.1;
  mesh(g, new THREE.BoxGeometry(BASE_L, BASE_T, BASE_W), [milled, milled, cast, cast, milled, milled], [0, BASE_T / 2, 0]);
  [[0, BASE_W / 2 - RIM / 2, BASE_L, RIM], [0, -BASE_W / 2 + RIM / 2, BASE_L, RIM], [BASE_L / 2 - RIM / 2, 0, RIM, BASE_W], [-BASE_L / 2 + RIM / 2, 0, RIM, BASE_W]]
    .forEach(([x, z, l, w]) => mesh(g, new THREE.BoxGeometry(l, RIM_H, w), milled, [x, BASE_T + RIM_H / 2, z]));
  const pad = (l, h, w, x, z, mat = milled) => mesh(g, new THREE.BoxGeometry(l, h, w), mat, [x, BASE_T + h / 2, z]);
  pad(0.42, RIM_H, 1.9, 0.1, -0.3);
  [-0.9, -0.1, 0.7].forEach((x) => pad(0.56, RIM_H, 0.5, x, 0.55));

  // ---- plate frame: crank at the origin height, pivot 1.3 along +y, laid on the base with a quarter turn ----
  const PL_L = 2.8127, PL_H = 1.45, PL_T = 0.25, FRONT = PL_T / 2;
  const crankY = 0.35, pivotY = crankY + 1.3;            // plate-frame positions along the plate
  const plateMid = PL_L / 2 - 0.2;                        // plate runs from -0.2 (beyond the crank) to PL_L - 0.2
  const mech = new THREE.Group();
  mech.rotation.z = Math.PI / 2;
  mech.position.set(plateMid - 0.05, BASE_T + PAD_H + PL_H / 2, PLATE_Z);
  g.add(mech);
  pad(PL_L + 0.4, PAD_H, 0.6, mech.position.x - plateMid, PLATE_Z, milled);   // the plate sits on this
  mesh(mech, new THREE.BoxGeometry(PL_H, PL_L, PL_T), alu, [0, plateMid, 0]);
  // inlet and exhaust ports on the plate face, on the arc the cylinder port sweeps
  [-0.2, 0.2].forEach((dx) => mesh(mech, new THREE.CylinderGeometry(0.047, 0.047, 0.03, 20), dark, [dx, pivotY + 0.72, FRONT + 0.012], [Math.PI / 2, 0, 0]));
  // crank bearing boss on the cylinder side of the plate
  mesh(mech, new THREE.CylinderGeometry(0.32, 0.32, 0.12, 40), alu, [0, crankY, FRONT + 0.06], [Math.PI / 2, 0, 0]);

  // ---- crankshaft, crank disk, crank pin ----
  const DISK_R = 0.95 / 2, DISK_T = 0.22, THROW = 0.4;
  mesh(mech, new THREE.CylinderGeometry(0.125, 0.125, 2.0, 24), aluFlat, [0, crankY, FRONT + 0.3 - 1.0 + 0.1], [Math.PI / 2, 0, 0]);
  const diskZ = FRONT + 0.12 + 0.06 + DISK_T / 2;
  mesh(mech, new THREE.CylinderGeometry(DISK_R, DISK_R, DISK_T, 48), alu, [0, crankY, diskZ], [Math.PI / 2, 0, 0]);
  mesh(mech, new THREE.CylinderGeometry(0.375, 0.375, 0.02, 48), aluFlat, [0, crankY, diskZ + DISK_T / 2 + 0.01], [Math.PI / 2, 0, 0]);
  const phi = (crankDeg * Math.PI) / 180;
  const pin = new THREE.Vector3(THROW * Math.cos(phi), crankY + THROW * Math.sin(phi), diskZ + DISK_T / 2);
  mesh(mech, new THREE.CylinderGeometry(0.062, 0.062, 0.6, 20), steel, [pin.x, pin.y, pin.z + 0.25], [Math.PI / 2, 0, 0]);

  // ---- cylinder: trunnion-pivoted block, bore on its axis, open end toward the crank ----
  const CYL_L = 1.526, CYL_W = 0.8, CYL_D = 0.62;
  const cylZ = pin.z + 0.34;
  const pivot = new THREE.Vector3(0, pivotY, cylZ);
  const axis = new THREE.Vector3(pin.x - pivot.x, pin.y - pivot.y, 0);
  const dPin = axis.length(); axis.normalize();
  const theta = Math.atan2(axis.x, -axis.y); // tilt from the plate line
  const cyl = new THREE.Group();
  cyl.position.copy(pivot);
  cyl.rotation.z = -theta;
  mech.add(cyl);
  const TOP = 0.95; // cylinder extends 0.95 beyond the pivot (the port end), the rest toward the crank
  mesh(cyl, new THREE.BoxGeometry(CYL_W, CYL_L, CYL_D), aluBright, [0, TOP - CYL_L / 2, 0]);
  mesh(cyl, new THREE.CylinderGeometry(0.1255, 0.1255, 0.02, 32), dark, [0, TOP - CYL_L - 0.005, 0]);
  // trunnion stud through the cylinder and the plate, spring and hex nut on the far side
  const studL = cylZ + 0.95;
  mesh(cyl, new THREE.CylinderGeometry(0.1245, 0.1245, studL, 24), aluFlat, [0, 0, CYL_D / 2 - studL / 2], [Math.PI / 2, 0, 0]);
  const springPts = [];
  for (let i = 0; i <= 160; i++) { const t = i / 160; springPts.push(new THREE.Vector3(0.16 * Math.cos(t * Math.PI * 14), 0.16 * Math.sin(t * Math.PI * 14), -FRONT - 0.05 - t * 0.45 - cylZ)); }
  mesh(cyl, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 400, 0.022, 10, false), steel);
  mesh(cyl, new THREE.CylinderGeometry(0.19, 0.19, 0.12, 6), steel, [0, 0, -FRONT - 0.58 - cylZ], [Math.PI / 2, 0, 0]);
  // brass piston: rides in the bore, open-end carries the 0.136 cross hole on the crank pin
  const PISTON_L = 1.55;
  mesh(cyl, new THREE.CylinderGeometry(0.125, 0.125, PISTON_L, 32), brass, [0, -dPin + PISTON_L / 2, 0]);
  mesh(cyl, new THREE.CylinderGeometry(0.068, 0.068, 0.3, 20), dark, [0, -dPin, 0], [Math.PI / 2, 0, 0]);

  // ---- flywheel on the far side of the plate: rim, web, hub, set screw ----
  const FW_R = 1.9561 / 2, HUB_R = 1.0012 / 2;
  const prof = [
    new THREE.Vector2(0.1255, 0), new THREE.Vector2(HUB_R, 0), new THREE.Vector2(HUB_R, 0.42),
    new THREE.Vector2(HUB_R - 0.08, 0.42), new THREE.Vector2(FW_R - 0.3, 0.42), new THREE.Vector2(FW_R - 0.3, 0.58),
    new THREE.Vector2(FW_R - 0.03, 0.58), new THREE.Vector2(FW_R, 0.55), new THREE.Vector2(FW_R, 0.03), new THREE.Vector2(FW_R - 0.03, 0),
    new THREE.Vector2(FW_R - 0.3, 0), new THREE.Vector2(FW_R - 0.3, 0.16), new THREE.Vector2(HUB_R + 0.0, 0.16), new THREE.Vector2(HUB_R, 0.0),
  ];
  const fwZ = -FRONT - 0.12;
  mesh(mech, new THREE.LatheGeometry(prof, 72), alu, [0, crankY, fwZ], [-Math.PI / 2, 0, 0]); // profile y runs toward -z
  mesh(mech, new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32), aluFlat, [0, crankY, fwZ + 0.06], [Math.PI / 2, 0, 0]);
  // hub set screw, radial
  const ss = new THREE.Group();
  mesh(ss, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 32), steel, [0, 0.04, 0]);
  mesh(ss, new THREE.CylinderGeometry(0.035, 0.035, 0.04, 6), dark, [0, 0.062, 0]);
  ss.position.set(0, crankY + HUB_R, fwZ - 0.3); mech.add(ss);

  // ---- 1/4-28 UNF air coupling on the far side of the plate, plastic supply tube off the back of the base ----
  const cpl = new THREE.Vector3(-0.2, pivotY + 0.72, -FRONT);
  mesh(mech, new THREE.CylinderGeometry(0.16, 0.16, 0.18, 6), alu, [cpl.x, cpl.y, cpl.z - 0.09], [Math.PI / 2, 0, 0]);
  mesh(mech, new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24), aluFlat, [cpl.x, cpl.y, cpl.z - 0.3], [Math.PI / 2, 0, 0]);
  // plate-frame -x is world down, +y is world toward the pivot end of the base
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cpl.x, cpl.y, cpl.z - 0.4),
    new THREE.Vector3(cpl.x - 0.2, cpl.y + 0.1, cpl.z - 0.9),
    new THREE.Vector3(cpl.x - 0.9, cpl.y + 0.5, cpl.z - 1.4),
    new THREE.Vector3(cpl.x - 1.25, cpl.y + 1.3, cpl.z - 2.6),
  ]);
  mesh(mech, new THREE.TubeGeometry(tubeCurve, 80, 0.075, 16, false), tube);

  // world-space anchors for the overlay (group space = world), converted out of the plate frame
  mech.updateMatrix();
  const W = (v) => v.applyMatrix4(mech.matrix);
  const inCyl = (x, y, z) => new THREE.Vector3(x, y, z).applyEuler(cyl.rotation).add(pivot);
  const crankC = W(new THREE.Vector3(0, crankY, fwZ));
  return {
    group: g,
    anchors: {
      flywheel: W(new THREE.Vector3(FW_R * 0.6, crankY - FW_R * 0.75, fwZ - 0.58)),
      hub: W(new THREE.Vector3(HUB_R, crankY, fwZ - 0.42)),
      crank: W(new THREE.Vector3(-DISK_R * 0.6, crankY - DISK_R * 0.5, diskZ + DISK_T / 2)),
      pin: W(pin.clone().add(new THREE.Vector3(0.062, 0, 0.5))),
      cylinder: W(inCyl(-0.22, TOP - CYL_L + 0.2, CYL_D / 2)),   // front face, low, near the open end: clear of the crank and piston leaders
      piston: W(inCyl(0.125, -dPin + 0.55, 0)),
      pivot: W(new THREE.Vector3(0, pivotY, -FRONT - 0.58 - 0.06)),
      plate: W(new THREE.Vector3(PL_H / 2, PL_L - 0.55, 0)),
      base: new THREE.Vector3(BASE_L / 2 - 0.3, BASE_T / 2, BASE_W / 2),
      coupling: W(new THREE.Vector3(cpl.x, cpl.y, cpl.z - 0.3)),
    },
    crankC, fwZ: crankC.z, crankY: crankC.y,
  };
}

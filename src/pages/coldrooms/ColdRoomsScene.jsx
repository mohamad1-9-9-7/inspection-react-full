// src/pages/coldrooms/ColdRoomsScene.jsx
//
// 🧊 The real-3D cold store (three.js): eight insulated-panel rooms, four
// facing four across an epoxy corridor. Each room has a stainless door, a
// digital temperature display above it, a status beacon, a condensing unit on
// the roof and a floating name/temperature label that always faces the camera.
//
// The scene is built once; data changes (rooms, readings, calibration,
// selection, language) only repaint the canvases and recolour materials.
//
// Props
//   rooms   [8] normalised rooms (coldRoomsConfig.js)
//   live    [8] { value, … } | null
//   cals    [8] { state } | null           calibration status per room
//   pick    selected index | null
//   onPick  (index | null) => void
//   lang    "ar" | "en"
//   t       text dictionary (for "No reading" / "Not linked")
//   viewCmd { kind: "reset" | "top", n }    a new n triggers the move
//   walkCmd { kind: "exit" | "auto", n }     drives the walk mode
//   walkInput  ref { fwd, back, left, right } held by the on-screen buttons
//   onWalk     ({ on, auto, near, inside, open }) => void   walk mode changed
//   stock      { [roomIndex]: { items } }     drawn as cartons on the racks
//   onPick(i, { door })                      door = the click was on the door
//   walkCmd also takes { kind: "door" } to open / close the door he stands at
//
// Walk mode: a person stands at the entrance of the corridor. Clicking him
// puts the camera at his eye height and he starts walking down the corridor;
// W/S or ↑/↓ walk, A/D or ←/→ turn, dragging looks around.

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { kindOf, verdict } from "./coldRoomsConfig";

/* ══════════════════════════════════════ Dimensions (metres) */
const RW = 6;       // room width (along the corridor)
const RD = 10;      // room depth (from the corridor outwards)
const RH = 3.6;     // room height
const WT = 0.14;    // wall thickness (insulated panel)
const GAP = 0.35;   // between two rooms
const CORR = 4.4;   // corridor width
const DW = 2.6;     // door width — a wide sliding door
const DH = 2.9;     // door height
// The door sits right of centre: it slides open to the LEFT (as seen from
// the corridor) over the wall beside it, which must be at least as wide.
const DOOR_X = RW / 2 - DW / 2 - 0.35;

const STATUS_COLOR = { ok: "#16a34a", warn: "#f59e0b", out: "#dc2626", none: "#94a3b8" };
const FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

/* The corridor runs away from the viewer (along z). Rooms 1-4 stand on the
   RIGHT, 5-8 on the LEFT, doors facing each other; 1 and 5 are nearest the
   entrance (positive z), 4 and 8 at the far end. */
const slotZ = (n) => (1.5 - n) * (RW + GAP);

/* The entrance of the corridor, where the walker waits. */
const ENTRY_Z = slotZ(0) + RW / 2 + 2.4;
const WALK = {
  eye: 1.65,
  speed: 1.5, // m/s — a calm walk
  turn: 1.6,  // rad/s
  xMax: CORR / 2 - 0.45,
  zMin: slotZ(3) - RW / 2 - 0.6,
  zMax: ENTRY_Z + 1.5,
};

/* Racks inside a room: one along each side wall, one double rack in the middle. */
const RACK_X = RW / 2 - WT - 0.38;
const MID_RACK = 0.34;
const MID_Z0 = -2.4;

/** Room-local point → world, for a placement. */
const localToWorld = (p, lx, lz) => {
  const c = Math.cos(p.rotY);
  const sn = Math.sin(p.rotY);
  return { x: p.x + lx * c + lz * sn, z: p.z - lx * sn + lz * c };
};

/** Room i → where its group sits and which way its door faces. */
function placement(i) {
  const right = i < 4;
  const rotY = right ? -Math.PI / 2 : Math.PI / 2; // door (local +z) → towards the corridor
  return {
    x: right ? CORR / 2 : -CORR / 2,
    z: slotZ(i % 4),
    rotY,
    face: new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)),
  };
}

/* ══════════════════════════════════════ Textures */

/** White insulated sandwich panel: vertical seams every ~1.1 m. */
function panelTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 256, 0);
  grd.addColorStop(0, "#f1f5f9");
  grd.addColorStop(0.5, "#ffffff");
  grd.addColorStop(1, "#eef2f7");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#d5dce4";
  g.fillRect(0, 0, 2, 256);
  g.fillStyle = "rgba(148,163,184,.10)";
  for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 256, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function floorTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#e6ebf1";
  g.fillRect(0, 0, 512, 512);
  // faint speckle of an epoxy floor
  for (let k = 0; k < 2200; k += 1) {
    g.fillStyle = `rgba(100,116,139,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  g.strokeStyle = "rgba(148,163,184,.35)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function canvasTex(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { c, tex };
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** The digital display above the door. */
function paintScreen(slot, { value, status, kindEmoji }) {
  const { c, tex } = slot;
  const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height);
  roundRect(g, 4, 4, c.width - 8, c.height - 8, 22);
  g.fillStyle = "#0f172a";
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = STATUS_COLOR[status];
  g.stroke();
  g.fillStyle = STATUS_COLOR[status] === STATUS_COLOR.none ? "#cbd5e1" : status === "ok" ? "#4ade80" : status === "warn" ? "#fbbf24" : "#f87171";
  g.font = `900 120px ${FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.direction = "ltr";
  g.fillText(value == null ? "--.-" : `${Number(value).toFixed(1)}°C`, c.width / 2 + 30, c.height / 2 + 6);
  g.font = `64px ${FONT}`;
  g.fillText(kindEmoji, 70, c.height / 2 + 4);
  tex.needsUpdate = true;
}

/** The floating label that faces the camera. */
function paintLabel(slot, { num, name, kind, value, status, cal, lang, t, linked, selected }) {
  const { c, tex } = slot;
  const g = c.getContext("2d");
  const W = c.width;
  const H = c.height;
  g.clearRect(0, 0, W, H);
  // card
  g.save();
  g.shadowColor = "rgba(15,23,42,.25)";
  g.shadowBlur = 24;
  g.shadowOffsetY = 8;
  roundRect(g, 18, 14, W - 36, H - 46, 34);
  g.fillStyle = "rgba(255,255,255,.97)";
  g.fill();
  g.restore();
  g.lineWidth = selected ? 10 : 5;
  g.strokeStyle = selected ? "#0ea5e9" : STATUS_COLOR[status];
  roundRect(g, 18, 14, W - 36, H - 46, 34);
  g.stroke();
  // pointer
  g.beginPath();
  g.moveTo(W / 2 - 26, H - 34);
  g.lineTo(W / 2, H - 4);
  g.lineTo(W / 2 + 26, H - 34);
  g.fillStyle = selected ? "#0ea5e9" : STATUS_COLOR[status];
  g.fill();

  const ar = lang === "ar";
  g.direction = ar ? "rtl" : "ltr";
  // number badge
  const bx = ar ? W - 84 : 84;
  g.beginPath();
  g.arc(bx, 92, 46, 0, Math.PI * 2);
  g.fillStyle = kind.color;
  g.fill();
  g.fillStyle = "#fff";
  g.font = `900 52px ${FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(num), bx, 94);

  // name + kind
  g.textAlign = ar ? "right" : "left";
  const tx = ar ? W - 150 : 150;
  g.fillStyle = "#0f172a";
  g.font = `800 50px ${FONT}`;
  let label = name;
  while (g.measureText(label).width > W - 200 && label.length > 3) label = label.slice(0, -2);
  if (label !== name) label += "…";
  g.fillText(label, tx, 70);
  g.fillStyle = kind.color;
  g.font = `700 40px ${FONT}`;
  g.fillText(`${kind.emoji} ${ar ? kind.ar : kind.en}`, tx, 122);

  // temperature
  g.textAlign = "center";
  g.direction = "ltr";
  g.fillStyle = STATUS_COLOR[status] === STATUS_COLOR.none ? "#64748b" : STATUS_COLOR[status];
  g.font = `900 104px ${FONT}`;
  g.fillText(value == null ? "—" : `${Number(value).toFixed(1)}°C`, W / 2, 222);
  g.font = `800 38px ${FONT}`;
  g.direction = ar ? "rtl" : "ltr";
  g.fillStyle = "#64748b";
  const sub = !linked ? `🔗 ${t.unlinked}` : value == null ? t.none : cal === "expired" ? `⛔ ${t.calibExpired}` : cal === "soon" ? `⏳ ${t.calib}` : cal === "ok" ? `🎯 ${t.calib} ✓` : "";
  if (sub) g.fillText(sub, W / 2, 292);
  tex.needsUpdate = true;
}

/* ══════════════════════════════════════ Building one room
   Modern cold-room look: matt white panels, anthracite plinth and fascia
   with an LED line in the room's colour, aluminium corner trims, a flush
   sliding door with a vertical status light, and inside: polished floor,
   linear LED ceiling lights, anthracite racks with lit stainless shelves. */

const SHELF_Y = [0.15, 0.85, 1.55, 2.25];
const RACK_H = 2.55;

function buildRoom(mats, panelTex) {
  const group = new THREE.Group();
  const pick = []; // meshes that select the room when clicked
  const box = (w, h, d, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const wall = (w, h, d, x, y, z, repeatX) => {
    const tex = panelTex.clone();
    tex.repeat.set(Math.max(1, repeatX), 1);
    tex.needsUpdate = true;
    const m = box(w, h, d, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 }), x, y, z);
    pick.push(m);
    return m;
  };

  // back + sides
  wall(RW, RH, WT, 0, RH / 2, -RD + WT / 2, RW / 0.9);
  wall(WT, RH, RD, -RW / 2 + WT / 2, RH / 2, -RD / 2, RD / 0.9);
  wall(WT, RH, RD, RW / 2 - WT / 2, RH / 2, -RD / 2, RD / 0.9);
  // front, around the door opening
  const leftW = RW / 2 + DOOR_X - DW / 2;
  const rightW = RW / 2 - DOOR_X - DW / 2;
  wall(leftW, RH, WT, -RW / 2 + leftW / 2, RH / 2, -WT / 2, leftW / 0.9);
  wall(rightW, RH, WT, RW / 2 - rightW / 2, RH / 2, -WT / 2, Math.max(1, rightW / 0.9));
  wall(DW, RH - DH, WT, DOOR_X, DH + (RH - DH) / 2, -WT / 2, 2);

  // anthracite plinth (front pieces leave the door opening free) and side plinths
  const PL = 0.28;
  box(leftW, PL, 0.04, mats.anthracite, -RW / 2 + leftW / 2, PL / 2, 0.02);
  box(rightW, PL, 0.04, mats.anthracite, RW / 2 - rightW / 2, PL / 2, 0.02);
  [-1, 1].forEach((sx) => box(0.04, PL, RD, mats.anthracite, sx * (RW / 2 + 0.02), PL / 2, -RD / 2));
  box(RW, PL, 0.04, mats.anthracite, 0, PL / 2, -RD - 0.02);

  // fascia: anthracite band + LED line in the room's colour (front and sides)
  const accent = new THREE.MeshStandardMaterial({ color: "#2563eb", emissive: "#2563eb", emissiveIntensity: 0.9, roughness: 0.3 });
  const FH = 0.34;
  box(RW + 0.08, FH, 0.06, mats.anthracite, 0, RH - FH / 2, 0.03);
  box(RW + 0.08, 0.035, 0.07, accent, 0, RH - FH - 0.02, 0.035);
  [-1, 1].forEach((sx) => {
    box(0.06, FH, RD + 0.06, mats.anthracite, sx * (RW / 2 + 0.03), RH - FH / 2, -RD / 2);
    box(0.07, 0.035, RD + 0.06, accent, sx * (RW / 2 + 0.035), RH - FH - 0.02, -RD / 2);
  });
  // aluminium corner trims
  [[-1, 0], [1, 0], [-1, -RD], [1, -RD]].forEach(([sx, z]) => box(0.09, RH, 0.09, mats.alu, sx * (RW / 2), RH / 2, z));

  // roof
  const roof = box(RW + 0.1, 0.1, RD + 0.1, mats.roof, 0, RH + 0.05, -RD / 2);
  pick.push(roof);

  // door portal: deep anthracite frame
  box(DW + 0.32, 0.16, 0.16, mats.anthracite, DOOR_X, DH + 0.08, 0.05);
  [-1, 1].forEach((sx) => box(0.16, DH, 0.16, mats.anthracite, DOOR_X + sx * (DW / 2 + 0.08), DH / 2, 0.05));

  // vertical status light beside the door
  const beaconMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", emissive: "#94a3b8", emissiveIntensity: 1, roughness: 0.2 });
  box(0.06, DH - 0.3, 0.04, beaconMat, DOOR_X + DW / 2 + 0.3, DH / 2 + 0.1, 0.03);

  // flush sliding door on a concealed rail: slides LEFT over the wall
  box(DW * 2 + 0.4, 0.14, 0.12, mats.anthracite, DOOR_X - DW / 2 + 0.05, DH + 0.24, 0.22);
  const slider = new THREE.Group();
  slider.position.set(DOOR_X, 0, 0.16);
  group.add(slider);
  const doorParts = [];
  const onDoor = (w, h, d, mat, x, y, z) => {
    const m = box(w, h, d, mat, x, y, z, slider);
    doorParts.push(m);
    return m;
  };
  onDoor(DW + 0.12, DH + 0.06, 0.12, mats.steel, 0, DH / 2, 0);
  onDoor(DW + 0.1, 0.3, 0.02, mats.kick, 0, 0.2, 0.07);                      // kick plate
  onDoor(DW - 0.5, 0.16, 0.02, mats.glassDark, 0, 1.7, 0.07);                 // long glazing strip
  onDoor(0.05, DH - 0.6, 0.06, mats.anthracite, DW / 2 - 0.16, DH / 2 + 0.05, 0.1); // full-height pull bar
  doorParts.forEach((m) => { m.userData.door = true; pick.push(m); });

  /* ── inside the room ── */
  const inner = new THREE.Group();
  group.add(inner);
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(RW - 2 * WT, RD - 2 * WT), mats.innerFloor);
  inFloor.rotation.x = -Math.PI / 2;
  inFloor.position.set(0, 0.012, -RD / 2);
  inFloor.receiveShadow = true;
  inner.add(inFloor);
  // linear LED lights over both aisles
  [-1.4, 1.4].forEach((x) => {
    box(0.12, 0.04, RD - 1.4, mats.led, x, RH - 0.04, -RD / 2, inner).castShadow = false;
  });
  // evaporator: rounded white unit, three fans
  box(2.6, 0.55, 0.6, mats.unitWhite, 0, RH - 0.5, -RD + WT + 0.34, inner);
  [-0.8, 0, 0.8].forEach((x) => {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), mats.anthracite);
    fan.position.set(x, RH - 0.5, -RD + WT + 0.65);
    inner.add(fan);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), mats.alu);
    hub.position.set(x, RH - 0.5, -RD + WT + 0.66);
    inner.add(hub);
  });
  // racks: anthracite uprights, stainless shelves with an LED strip under the front edge
  const RACK_Z0 = -1.3;
  const RACK_Z1 = -RD + 0.5;
  const RACK_XS = [-RACK_X, -MID_RACK, MID_RACK, RACK_X];
  RACK_XS.forEach((x) => {
    const z0 = Math.abs(x) === MID_RACK ? MID_Z0 : RACK_Z0;
    const len = z0 - RACK_Z1;
    const zc = (z0 + RACK_Z1) / 2;
    const aisleSide = Math.abs(x) === MID_RACK ? Math.sign(x) : -Math.sign(x); // the side that faces an aisle
    SHELF_Y.forEach((y) => {
      box(0.6, 0.03, len, mats.shelf, x, y, zc, inner);
      box(0.6, 0.06, 0.02, mats.anthracite, x, y - 0.015, z0 + 0.01, inner);
      const led = box(0.015, 0.012, len - 0.1, mats.led, x + aisleSide * 0.29, y - 0.03, zc, inner);
      led.castShadow = false;
    });
    for (let k = 0; k <= 4; k += 1) {
      const z = z0 - (len * k) / 4;
      [-0.28, 0.28].forEach((dx) => box(0.06, RACK_H, 0.06, mats.anthracite, x + dx, RACK_H / 2, z, inner));
    }
  });
  // the cartons — rebuilt from the room's stock
  const cartons = new THREE.Group();
  inner.add(cartons);
  const slots = [];
  RACK_XS.forEach((x) => SHELF_Y.forEach((y) => {
    const z0 = Math.abs(x) === MID_RACK ? MID_Z0 : RACK_Z0;
    for (let z = z0 - 0.3; z >= RACK_Z1 + 0.2; z -= 0.56) slots.push(new THREE.Vector3(x, y + 0.2, z));
  }));
  // goods fill from the door backwards, across every rack, eye-level shelves first
  const LEVEL = { 0.85: 0, 1.55: 1, 0.15: 2, 2.25: 3 };
  slots.sort((p, q) => q.z - p.z || LEVEL[(p.y - 0.2).toFixed(2) * 1] - LEVEL[(q.y - 0.2).toFixed(2) * 1]);

  // digital display in the fascia above the door
  const screen = canvasTex(640, 220);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.45), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  scr.position.set(DOOR_X, DH + (RH - FH - DH) / 2 + 0.05, 0.03);
  group.add(scr);
  pick.push(scr);

  // condensing unit on the roof: rounded anthracite housing, two fans
  const cu = new THREE.Group();
  const housing = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.7, 1.0, 4, 0.08), mats.anthraciteSoft);
  housing.position.y = 0.35;
  housing.castShadow = true;
  cu.add(housing);
  [-0.45, 0.45].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 10, 40), mats.alu);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.71, 0);
    cu.add(ring);
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.31, 32), mats.grille);
    grille.rotation.x = -Math.PI / 2;
    grille.position.set(x, 0.705, 0);
    cu.add(grille);
  });
  cu.position.set(-0.8, RH + 0.1, -RD + 1.3);
  group.add(cu);

  // floating label
  const label = canvasTex(720, 330);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label.tex, depthTest: false, toneMapped: false }));
  sprite.renderOrder = 10;
  sprite.scale.set(4.2, 4.2 * (330 / 720), 1);
  sprite.position.set(0, RH + 2.3, -RD / 2 + 0.4);
  group.add(sprite);
  pick.push(sprite);

  // selection outline
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(RW + 0.3, RH + 0.4, RD + 0.3)),
    new THREE.LineBasicMaterial({ color: "#0ea5e9", linewidth: 2 })
  );
  outline.position.set(0, (RH + 0.4) / 2 - 0.02, -RD / 2);
  outline.visible = false;
  group.add(outline);

  // the coloured glow on the floor in front of the door
  const glowMat = new THREE.MeshBasicMaterial({ color: "#94a3b8", transparent: true, opacity: 0.22, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.6, 1.3), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(DOOR_X, 0.012, 0.75);
  group.add(glow);

  return { group, pick, accent, beaconMat, glowMat, screen, label, sprite, outline, slider, cartons, slots, doorOpen: 0, doorTarget: 0 };
}

/* ══════════════════════════════════════ Cartons on the racks */

/** Kraft carton face with a white product label and a barcode. */
let cartonTex = null;
function cartonTexture() {
  if (cartonTex) return cartonTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 96);
  g.fillStyle = "rgba(0,0,0,.06)";
  g.fillRect(0, 44, 128, 6); // tape
  g.fillStyle = "#ffffff";
  g.fillRect(18, 58, 92, 30);
  g.fillStyle = "#1f2937";
  for (let x = 24; x < 104; x += 3) g.fillRect(x, 64, Math.random() > 0.5 ? 2 : 1, 16);
  cartonTex = new THREE.CanvasTexture(c);
  cartonTex.colorSpace = THREE.SRGBColorSpace;
  return cartonTex;
}

const CARTON_GEO = new THREE.BoxGeometry(0.5, 0.36, 0.48);
const cartonMats = new Map();
function cartonMat(code) {
  let h = 0;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const key = h % 10;
  if (!cartonMats.has(key)) {
    // kraft browns plus a few printed-brand colours, so product lines read as groups
    const tones = ["#c8a27a", "#bf9568", "#d1ad85", "#b8895c", "#c49a6c", "#e5e7eb", "#93c5fd", "#c7d2fe", "#d6c3a5", "#a3b18a"];
    cartonMats.set(key, new THREE.MeshStandardMaterial({ map: cartonTexture(), color: tones[key], roughness: 0.8 }));
  }
  return cartonMats.get(key);
}

/** One to six cartons per product (by quantity), shelf slot after slot. */
function fillCartons(r, items) {
  while (r.cartons.children.length) r.cartons.remove(r.cartons.children[0]);
  let slot = 0;
  (items || []).forEach((it) => {
    const n = Math.max(1, Math.min(6, Math.ceil(Math.log2((Number(it.qty) || 0) + 1))));
    for (let k = 0; k < n && slot < r.slots.length; k += 1, slot += 1) {
      const c = new THREE.Mesh(CARTON_GEO, cartonMat(it.code || it.product));
      c.position.copy(r.slots[slot]);
      c.rotation.y = Math.PI / 2 + ((slot * 37) % 7 - 3) * 0.012; // label towards the aisle
      c.castShadow = true;
      r.cartons.add(c);
    }
  });
}

/* ══════════════════════════════════════ The walker */

function buildPerson() {
  const g = new THREE.Group();
  const body = new THREE.Group(); // everything that breathes / turns
  g.add(body);
  const m = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
  const coat = m("#f8fafc", { roughness: 0.8 });
  const trousers = m("#1e3a8a");
  const boots = m("#ffffff", { roughness: 0.4 });
  const skin = m("#d9a066");
  const hair = m("#2b1d14");
  const net = m("#93c5fd", { roughness: 0.9 });
  const dark = m("#0f172a");
  const add = (parent, geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const cap = (rad, len) => new THREE.CapsuleGeometry(rad, len, 6, 14);

  // legs + white boots
  [-0.1, 0.1].forEach((x) => {
    add(body, cap(0.075, 0.62), trousers, x, 0.5, 0);
    const b = add(body, cap(0.065, 0.12), boots, x, 0.08, 0.04);
    b.rotation.x = Math.PI / 2;
  });
  // white coat: body + skirt to the knee, buttons, pocket, ID badge
  add(body, cap(0.19, 0.42), coat, 0, 1.22, 0).scale.set(1, 1, 0.75);
  add(body, new THREE.CylinderGeometry(0.2, 0.25, 0.45, 20, 1, true), coat, 0, 0.82, 0).scale.set(1, 1, 0.75);
  [1.36, 1.22, 1.08, 0.94].forEach((y) => add(body, new THREE.SphereGeometry(0.014, 8, 6), dark, 0, y, 0.152));
  add(body, new THREE.BoxGeometry(0.1, 0.08, 0.01), m("#e2e8f0"), -0.09, 1.3, 0.145);
  add(body, new THREE.BoxGeometry(0.06, 0.085, 0.01), m("#0284c7"), 0.1, 1.3, 0.148);
  // arms: upper + fore arm in the coat, hands; the right one holds a clipboard
  const arm = (sx, bend) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.25, 1.43, 0);
    body.add(shoulder);
    const upper = add(shoulder, cap(0.06, 0.26), coat, 0, -0.17, 0);
    upper.rotation.z = sx * 0.12;
    const elbow = new THREE.Group();
    elbow.position.set(sx * 0.035, -0.34, 0);
    elbow.rotation.x = -bend;
    shoulder.add(elbow);
    add(elbow, cap(0.052, 0.24), coat, 0, -0.15, 0);
    add(elbow, new THREE.SphereGeometry(0.052, 12, 10), skin, 0, -0.32, 0);
    return elbow;
  };
  arm(-1, 0.15);
  const holding = arm(1, 1.2);
  const board = add(holding, new THREE.BoxGeometry(0.22, 0.3, 0.015), m("#8b5a2b"), -0.02, -0.33, 0.1);
  board.rotation.x = 0.35;
  add(board, new THREE.BoxGeometry(0.19, 0.25, 0.005), m("#ffffff"), 0, -0.01, 0.01).castShadow = false;
  add(board, new THREE.BoxGeometry(0.08, 0.03, 0.02), m("#94a3b8"), 0, 0.14, 0.01);
  // neck, head, face, hair under a blue hair net
  add(body, new THREE.CylinderGeometry(0.055, 0.06, 0.09, 12), skin, 0, 1.6, 0);
  const head = new THREE.Group();
  head.position.set(0, 1.74, 0);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.115, 24, 18), skin, 0, 0, 0).scale.set(0.92, 1.08, 1);
  [-0.04, 0.04].forEach((x) => add(head, new THREE.SphereGeometry(0.014, 8, 6), dark, x, 0.015, 0.103));
  add(head, new THREE.SphereGeometry(0.018, 8, 6), skin, 0, -0.015, 0.112);
  [-1, 1].forEach((sx) => add(head, new THREE.SphereGeometry(0.025, 8, 6), skin, sx * 0.105, 0, 0).scale.set(0.5, 1, 0.8));
  add(head, new THREE.SphereGeometry(0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), hair, 0, 0.02, -0.01);
  add(head, new THREE.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), net, 0, 0.035, -0.012);

  g.userData.parts = { body, head };
  // a pulsing ring on the floor that says "click me"
  const ringMat = new THREE.MeshBasicMaterial({ color: "#0ea5e9", transparent: true, opacity: 0.6, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  g.add(ring);

  // a tall invisible box makes him easy to hit
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 1;
  g.add(hit);

  const label = canvasTex(560, 150);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label.tex, depthTest: false, toneMapped: false }));
  sprite.renderOrder = 11;
  sprite.scale.set(2.4, 2.4 * (150 / 560), 1);
  sprite.position.y = 2.35;
  g.add(sprite);

  g.traverse((o) => { o.userData.person = true; });
  return { group: g, pick: [hit, sprite], ring, ringMat, label, body, head };
}

function paintPersonLabel(slot, text, ar) {
  const { c, tex } = slot;
  const g = c.getContext("2d");
  g.clearRect(0, 0, c.width, c.height);
  roundRect(g, 10, 10, c.width - 20, c.height - 20, 60);
  g.fillStyle = "#0284c7";
  g.fill();
  g.fillStyle = "#fff";
  g.font = `800 54px ${FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.direction = ar ? "rtl" : "ltr";
  g.fillText(`🚶 ${text}`, c.width / 2, c.height / 2 + 2);
  tex.needsUpdate = true;
}

/* ══════════════════════════════════════ Component */

export default function ColdRoomsScene({ rooms, live, cals, pick, onPick, lang, t, viewCmd, walkCmd, walkInput, onWalk, stock }) {
  const hostRef = useRef(null);
  const ctxRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onWalkRef = useRef(onWalk);
  onWalkRef.current = onWalk;
  const inputRef = useRef(walkInput);
  inputRef.current = walkInput;

  /* build the scene once */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8f3fb");
    scene.fog = new THREE.Fog("#e8f3fb", 55, 110);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    // standing at the entrance, looking down the corridor
    const HOME = { pos: new THREE.Vector3(0, 26, 34), target: new THREE.Vector3(0, 0, -3) };
    camera.position.copy(HOME.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 6;
    controls.maxDistance = 60;
    controls.screenSpacePanning = false;
    controls.update();

    // light
    scene.add(new THREE.HemisphereLight("#ffffff", "#cbd5e1", 1.1));
    const sun = new THREE.DirectionalLight("#ffffff", 1.6);
    sun.position.set(12, 22, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#dbeafe", 0.55);
    fill.position.set(-14, 10, -12);
    scene.add(fill);

    // floor
    const fTex = floorTexture();
    fTex.repeat.set(14, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 80), new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.75 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // corridor: lighter epoxy strip + yellow safety lines + arrows
    const corrLen = 4 * RW + 3 * GAP + 3;
    const corr = new THREE.Mesh(new THREE.PlaneGeometry(CORR - 0.4, corrLen), new THREE.MeshStandardMaterial({ color: "#cfd8e1", roughness: 0.22, metalness: 0.08 }));
    corr.rotation.x = -Math.PI / 2;
    corr.position.y = 0.004;
    corr.receiveShadow = true;
    scene.add(corr);
    const lineMat = new THREE.MeshBasicMaterial({ color: "#22c55e" });
    [-1, 1].forEach((s) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, corrLen), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(s * (CORR / 2 - 0.3), 0.008, 0);
      scene.add(l);
    });
    const endTex = panelTexture();
    endTex.repeat.set(4, 1);
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(CORR + 0.3, RH, WT), new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.55 }));
    endWall.position.set(0, RH / 2, WALK.zMin - 0.7);
    endWall.castShadow = true;
    endWall.receiveShadow = true;
    scene.add(endWall);
    const arrowMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 });
    for (let k = -2; k <= 2; k += 1) {
      const a = new THREE.Mesh(new THREE.CircleGeometry(0.42, 3), arrowMat);
      a.rotation.x = -Math.PI / 2;
      a.rotation.z = Math.PI / 2; // points into the store, away from the entrance
      a.position.set(0, 0.009, k * 3.4);
      scene.add(a);
    }

    // shared materials
    const mats = {
      roof: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.6 }),
      steel: new THREE.MeshStandardMaterial({ color: "#eef2f6", metalness: 0.35, roughness: 0.32 }),
      kick: new THREE.MeshStandardMaterial({ color: "#e5e9ee", metalness: 0.95, roughness: 0.18 }),
      dark: new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.4, roughness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: "#9cc7e6", metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.75 }),
      unit: new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.3, roughness: 0.45 }),
      grille: new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.5, roughness: 0.4 }),
      copper: new THREE.MeshStandardMaterial({ color: "#b87333", metalness: 0.8, roughness: 0.35 }),
      innerFloor: new THREE.MeshStandardMaterial({ color: "#e9eef3", roughness: 0.25, metalness: 0.05 }),
      led: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      shelf: new THREE.MeshStandardMaterial({ color: "#e8edf2", metalness: 0.35, roughness: 0.3 }),
      anthracite: new THREE.MeshStandardMaterial({ color: "#5b6573", metalness: 0.15, roughness: 0.5 }),
      anthraciteSoft: new THREE.MeshStandardMaterial({ color: "#6b7480", metalness: 0.1, roughness: 0.55 }),
      alu: new THREE.MeshStandardMaterial({ color: "#d5dbe2", metalness: 0.45, roughness: 0.3 }),
      glassDark: new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.6, roughness: 0.1 }),
      unitWhite: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 }),
    };
    const panelTex = panelTexture();

    const roomObjs = Array.from({ length: 8 }, (_, i) => {
      const r = buildRoom(mats, panelTex);
      const p = placement(i);
      r.group.position.set(p.x, 0, p.z);
      r.group.rotation.y = p.rotY;
      r.pick.forEach((m) => { m.userData.room = i; });
      r.index = i;
      r.place = placement(i);
      scene.add(r.group);
      return r;
    });

    // a light that switches on inside the room whose door is open
    const roomLight = new THREE.PointLight("#ffffff", 0, 12, 1.3);
    scene.add(roomLight);

    // the walker, waiting at the entrance and facing into the store
    const person = buildPerson();
    person.group.position.set(0, 0, ENTRY_Z);
    person.group.rotation.y = Math.PI;
    scene.add(person.group);

    /* walk mode state */
    const W = { on: false, pending: false, auto: false, pos: new THREE.Vector3(), yaw: 0, pitch: -0.04, dist: 0, turning: 0, near: null, inside: null, path: [], faceYaw: null };
    const keys = new Set();
    const emitWalk = () => {
      const near = W.near != null ? roomObjs[W.near] : null;
      onWalkRef.current?.({ on: W.on || W.pending, auto: W.auto, near: W.near, inside: W.inside, open: !!(near && near.doorTarget) });
    };

    /* where he may stand: the corridor, plus the doorway and inside of any open room */
    const toLocal = (r, x, z) => {
      const dx = x - r.place.x;
      const dz = z - r.place.z;
      const c = Math.cos(r.place.rotY);
      const sn = Math.sin(r.place.rotY);
      // inverse of the group's rotation about y
      return { x: dx * c - dz * sn, z: dx * sn + dz * c };
    };
    const canStand = (x, z) => {
      if (Math.abs(x) <= WALK.xMax && z >= WALK.zMin && z <= WALK.zMax) return true;
      return roomObjs.some((r) => {
        if (r.doorOpen < 0.6) return false; // only through a door that is open
        const l = toLocal(r, x, z);
        const doorway = Math.abs(l.x - DOOR_X) <= DW / 2 - 0.3 && l.z <= 0.9 && l.z >= -0.6;
        const room = l.z <= -0.35 && l.z >= -RD + WT + 0.45;
        // keep him off the racks: the two aisles, and the front strip before the middle rack
        const ax = Math.abs(l.x);
        const aisle = room && ax <= RACK_X - 0.55 && (ax >= MID_RACK + 0.55 || l.z > MID_Z0 + 0.4);
        return doorway || aisle;
      });
    };
    const whereIs = (x, z) => {
      let near = null;
      let best = Infinity;
      let inside = null;
      const fx = -Math.sin(W.yaw);
      const fz = -Math.cos(W.yaw);
      roomObjs.forEach((r, i) => {
        const l = toLocal(r, x, z);
        if (l.z < -0.4 && Math.abs(l.x) < RW / 2 && l.z > -RD) inside = i;
        const d = Math.hypot(l.x - DOOR_X, Math.max(0, l.z));
        if (l.z <= -0.6 || d >= 2.8) return;
        // two doors face each other: the one he looks at wins
        const dw = localToWorld(r.place, DOOR_X, 0);
        const vx = dw.x - x;
        const vz = dw.z - z;
        const facing = (vx * fx + vz * fz) / (Math.hypot(vx, vz) || 1);
        const score = d - facing * 1.5;
        if (score < best) { best = score; near = i; }
      });
      return { near: inside != null ? inside : near, inside };
    };
    /* room-local point → world */
    const toWorld = (rm, lx, lz) => localToWorld(rm.place, lx, lz);
    const yawTo = (dx, dz) => Math.atan2(-dx, -dz);
    const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

    /* walk on his own to the front of room i's door and face it */
    const walkTo = (i) => {
      const rm = roomObjs[i];
      if (!W.on || !rm || W.inside === i) return;
      const path = [];
      // inside another room: out through its door first
      if (W.inside != null) {
        const out = roomObjs[W.inside];
        path.push(toWorld(out, DOOR_X, -1.2), toWorld(out, DOOR_X, 1.0));
      }
      // the middle of the corridor, square to the door: the whole door and
      // its display in view
      const stand = toWorld(rm, DOOR_X, CORR / 2);
      stand.x = Math.max(-WALK.xMax, Math.min(WALK.xMax, stand.x));
      path.push(stand);
      W.path = path;
      W.faceYaw = yawTo(-rm.place.face.x, -rm.place.face.z);
      W.auto = false;
      W.turning = 0;
      emitWalk();
    };

    const setDoor = (i, open) => {
      const r = roomObjs[i];
      if (!r) return;
      r.doorTarget = open ? 1 : 0;
      emitWalk();
    };
    const lookDir = () => new THREE.Vector3(-Math.sin(W.yaw) * Math.cos(W.pitch), Math.sin(W.pitch), -Math.cos(W.yaw) * Math.cos(W.pitch));

    // picking
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickables = [...roomObjs.flatMap((r) => r.pick), ...person.pick];
    const hitAt = (ev) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables.filter((o) => o.visible !== false && (!o.userData.person || person.group.visible)), false)[0];
      if (!hit) return null;
      if (hit.object.userData.person) return "person";
      return { room: hit.object.userData.room, door: !!hit.object.userData.door };
    };
    let down = null;
    let hover = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY }; };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const h = hitAt(e);
      if (h === "person") { startWalk(); return; }
      // walking: a click on the door he stands at opens / closes it
      if (W.on && h && h.door && W.near === h.room && W.inside == null && !W.path.length) {
        setDoor(h.room, !roomObjs[h.room].doorTarget);
        return;
      }
      // walking: a click on any other room takes him there
      if (W.on && h) walkTo(h.room);
      onPickRef.current?.(h ? h.room : null, { door: !!(h && h.door) });
    };
    let hoverQueued = false;
    const onMove = (e) => {
      if (down && W.on) {
        // look around while walking
        W.yaw -= (e.clientX - down.lx) * 0.004;
        W.pitch = Math.max(-0.9, Math.min(0.9, W.pitch - (e.clientY - down.ly) * 0.004));
        down.lx = e.clientX;
        down.ly = e.clientY;
        return;
      }
      if (hoverQueued || down) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        const hh = hitAt(e);
        const h = hh && typeof hh === "object" ? hh.room : hh;
        if (h !== hover) {
          hover = h;
          renderer.domElement.style.cursor = h == null ? "grab" : "pointer";
        }
      });
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.style.cursor = "grab";

    const WALK_KEYS = ["w", "a", "s", "d", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    const onKey = (e) => {
      if (!W.on) return;
      const k = String(e.key || "").toLowerCase();
      if (!WALK_KEYS.includes(k)) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      if (e.type === "keydown" && k === "e") {
        if (!e.repeat && W.near != null) setDoor(W.near, !roomObjs[W.near].doorTarget);
        return;
      }
      if (e.type === "keydown") {
        keys.add(k);
        // any key of his own takes over from the automatic or guided walk
        W.path = [];
        W.faceYaw = null;
        if (W.auto) { W.auto = false; emitWalk(); }
      } else keys.delete(k);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    // size
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      // a narrow screen backs the camera off so all eight rooms stay in view
      camera.fov = w / h < 1 ? 58 : w / h < 1.4 ? 48 : 42;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // camera fly-to
    const fly = { pos: null, target: null };
    const flyTo = (pos, target) => { fly.pos = pos.clone(); fly.target = target.clone(); };

    function startWalk() {
      if (W.on || W.pending) return;
      W.pos.set(0, 0, ENTRY_Z);
      W.yaw = 0;
      W.pitch = -0.04;
      W.dist = 0;
      W.turning = 0;
      W.pending = true;
      W.auto = true;
      // he becomes the camera: hide him (and his label) as the camera flies in
      person.group.visible = false;
      keys.clear();
      // the orbit limits would stop the camera short of his eyes
      controls.minDistance = 0.1;
      controls.maxPolarAngle = Math.PI;
      const eye = new THREE.Vector3(0, WALK.eye, ENTRY_Z);
      flyTo(eye, eye.clone().add(lookDir().multiplyScalar(6)));
      onPickRef.current?.(null);
      emitWalk();
    }
    function exitWalk() {
      if (!W.on && !W.pending) return;
      W.on = false;
      W.pending = false;
      W.auto = false;
      W.near = null;
      W.inside = null;
      W.path = [];
      W.faceYaw = null;
      roomObjs.forEach((o) => { o.doorTarget = 0; });
      keys.clear();
      person.group.visible = true;
      controls.enabled = true;
      controls.minDistance = 6;
      controls.maxPolarAngle = Math.PI / 2.08;
      controls.target.copy(camera.position).add(lookDir().multiplyScalar(6));
      flyTo(HOME.pos, HOME.target);
      emitWalk();
    }

    // loop (paused while the tab is hidden)
    let raf = 0;
    const clock = new THREE.Clock();
    let last = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      const time = clock.getElapsedTime();
      if (fly.pos) {
        const k = W.pending ? 0.1 : 0.08;
        camera.position.lerp(fly.pos, k);
        controls.target.lerp(fly.target, k);
        if (camera.position.distanceTo(fly.pos) < 0.05 && controls.target.distanceTo(fly.target) < 0.05) {
          fly.pos = null;
          fly.target = null;
          if (W.pending) {
            // arrived at his eyes: he is the camera now
            W.pending = false;
            W.on = true;
            controls.enabled = false;
            emitWalk();
          }
        }
      }

      if (W.on) {
        const inp = inputRef.current?.current || {};
        const fwd = W.auto || keys.has("w") || keys.has("arrowup") || inp.fwd;
        const back = keys.has("s") || keys.has("arrowdown") || inp.back;
        const left = keys.has("a") || keys.has("arrowleft") || inp.left;
        const right = keys.has("d") || keys.has("arrowright") || inp.right;
        if (inp.fwd || inp.back || inp.left || inp.right) { W.path = []; W.faceYaw = null; }
        let guided = 0;
        if (W.path.length) {
          // guided: head for the next point, turning on the way
          const wp = W.path[0];
          const dx = wp.x - W.pos.x;
          const dz = wp.z - W.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.12) W.path.shift();
          else {
            const diff = angDiff(yawTo(dx, dz), W.yaw);
            W.yaw += Math.sign(diff) * Math.min(Math.abs(diff), WALK.turn * 2 * dt);
            // slow down while the turn is still large
            guided = Math.min(dist, WALK.speed * 1.25 * dt) * (Math.abs(diff) > 0.8 ? 0.25 : 1);
          }
        } else if (W.faceYaw != null) {
          // arrived: turn to the door, then hand back control
          const diff = angDiff(W.faceYaw, W.yaw);
          W.yaw += Math.sign(diff) * Math.min(Math.abs(diff), WALK.turn * 2 * dt);
          W.pitch += (0.12 - W.pitch) * Math.min(1, dt * 4); // look up a little, to the display
          if (Math.abs(diff) < 0.01) {
            W.faceYaw = null;
            const where = whereIs(W.pos.x, W.pos.z);
            W.near = where.near;
            W.inside = where.inside;
            emitWalk();
          }
        }
        if (left) W.yaw += WALK.turn * dt;
        if (right) W.yaw -= WALK.turn * dt;
        if ((left || right) && !fwd && !back) {
          const where = whereIs(W.pos.x, W.pos.z);
          if (where.near !== W.near) { W.near = where.near; emitWalk(); }
        }
        if (W.turning > 0) {
          // turning round at the end of the corridor
          const d = Math.min(W.turning, WALK.turn * 1.2 * dt);
          W.yaw += d;
          W.turning -= d;
        }
        const step = guided || ((fwd ? 1 : 0) - (back ? 1 : 0)) * WALK.speed * dt;
        if (step) {
          const nx = W.pos.x - Math.sin(W.yaw) * step;
          const nz = W.pos.z - Math.cos(W.yaw) * step;
          // slide along walls instead of stopping dead
          if (canStand(nx, nz)) { W.pos.x = nx; W.pos.z = nz; }
          else if (canStand(nx, W.pos.z)) W.pos.x = nx;
          else if (canStand(W.pos.x, nz)) W.pos.z = nz;
          W.dist += Math.abs(step);
          const where = whereIs(W.pos.x, W.pos.z);
          if (where.near !== W.near || where.inside !== W.inside) {
            W.near = where.near;
            W.inside = where.inside;
            emitWalk();
          }
          // the automatic walk turns round at the far wall and stops back at the entrance
          if (W.auto && W.pos.z <= WALK.zMin + 0.05) { W.auto = false; W.turning = Math.PI; emitWalk(); }
          else if (W.auto && W.pos.z >= WALK.zMax - 0.05 && Math.cos(W.yaw) < 0) { W.auto = false; emitWalk(); }
        }
        const bob = step ? Math.sin(W.dist * 7) * 0.035 : 0;
        camera.position.set(W.pos.x, WALK.eye + bob, W.pos.z);
        camera.lookAt(camera.position.clone().add(lookDir()));
      } else if (person.group.visible) {
        // waiting: a slow look around and a pulsing ring
        person.head.rotation.y = Math.sin(time * 0.7) * 0.45;
        person.body.scale.y = 1 + Math.sin(time * 1.6) * 0.006;
        const p = 1 + Math.abs(Math.sin(time * 2)) * 0.35;
        person.ring.scale.set(p, p, p);
        person.ringMat.opacity = 0.75 - (p - 1) * 1.4;
      }
      const anySel = roomObjs.some((o) => o.group.userData.selected);
      let lit = null;
      roomObjs.forEach((r) => {
        r.doorOpen += (r.doorTarget - r.doorOpen) * Math.min(1, dt * 3.5);
        // slides to the left as seen from the corridor (local -x)
        r.slider.position.x = DOOR_X - r.doorOpen * (DW - 0.1);
        if (r.doorTarget && lit == null) lit = r;
        // a door left open closes by itself once he is far from it
        if (r.doorTarget && W.on && W.inside !== r.index) {
          const l = toLocal(r, W.pos.x, W.pos.z);
          if (Math.hypot(l.x - DOOR_X, l.z) > 8) r.doorTarget = 0;
        }
      });
      if (W.inside != null) lit = roomObjs[W.inside];
      if (lit) {
        const c = new THREE.Vector3(0, RH - 0.4, -RD / 2).applyMatrix4(lit.group.matrixWorld);
        roomLight.position.copy(c);
        roomLight.color.set(lit.isFreezer ? "#cfe8ff" : "#fff7ed");
        roomLight.intensity = Math.min(1, lit.doorOpen) * 11 + (W.inside != null ? 5 : 0);
      } else roomLight.intensity = 0;
      roomObjs.forEach((r, i) => {
        const alarm = r.group.userData.alarm;
        r.beaconMat.emissiveIntensity = alarm ? 0.6 + Math.abs(Math.sin(time * 4)) * 2.4 : 1.1;
        r.glowMat.opacity = alarm ? 0.18 + Math.abs(Math.sin(time * 4)) * 0.3 : 0.22;
        r.outline.visible = r.group.userData.selected;
        r.sprite.material.opacity = 1;
        // a selected room stands alone; inside a room the others would show through the walls
        r.sprite.visible = W.inside == null && (!anySel || r.group.userData.selected || W.on);
        // gentle bob on the label of the selected room
        // walking: smaller labels just above the doors, so they stay in sight
        const sc = W.on ? 2.2 : 4.2;
        r.sprite.scale.set(sc, sc * (330 / 720), 1);
        r.sprite.position.y = (W.on ? RH + 0.85 : RH + 2.3) + (r.group.userData.selected ? Math.sin(time * 2.5) * 0.08 : 0) + (i === hover ? 0.12 : 0);
        r.sprite.position.z = W.on ? 0.3 : -RD / 2 + 0.4;
      });
      if (!W.on) controls.update();
      renderer.render(scene, camera);
    };
    tick();

    ctxRef.current = {
      roomObjs, flyTo, HOME, camera, controls, person,
      walking: () => W.on || W.pending,
      exitWalk,
      setAuto: (v) => { if (W.on) { W.auto = v; emitWalk(); } },
      walkTo,
      toggleNearDoor: () => { if (W.on && W.near != null) setDoor(W.near, !roomObjs[W.near].doorTarget); },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      fTex.dispose();
      panelTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      ctxRef.current = null;
    };
  }, []);

  /* repaint on data */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !rooms) return;
    ctx.roomObjs.forEach((r, i) => {
      const room = rooms[i];
      if (!room) return;
      const k = kindOf(room.kind);
      const value = live?.[i]?.value ?? null;
      const status = value != null ? verdict(room, value) : "none";
      r.accent.color.set(k.color);
      r.accent.emissive.set(k.color);
      r.beaconMat.color.set(STATUS_COLOR[status]);
      r.beaconMat.emissive.set(STATUS_COLOR[status]);
      r.glowMat.color.set(STATUS_COLOR[status]);
      r.group.userData.alarm = status === "out";
      r.isFreezer = room.kind === "freezer";
      r.group.userData.selected = pick === i;
      paintScreen(r.screen, { value, status, kindEmoji: k.emoji });
      paintLabel(r.label, {
        num: i + 1, name: room.name, kind: k, value, status, cal: cals?.[i]?.state || "", lang, t,
        linked: !!room.link, selected: pick === i,
      });
    });
    paintPersonLabel(ctx.person.label, t.walk, lang === "ar");
  }, [rooms, live, cals, pick, lang, t]);

  /* fly to the picked room */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || pick == null) return;
    if (ctx.walking()) { ctx.walkTo(pick); return; }
    const p = placement(pick);
    // stand across the corridor, above the opposite roof, a little towards
    // the entrance — the door, its display and the label all in view
    const dw = localToWorld(p, DOOR_X, 0);
    const door = new THREE.Vector3(dw.x, 0, dw.z);
    const target = door.clone().addScaledVector(p.face, -1.2).add(new THREE.Vector3(0, 2.2, 0));
    const pos = door.clone().addScaledVector(p.face, CORR + 3.5).add(new THREE.Vector3(0, 7.5, 5));
    // the card opens on the left: shift the view so the door sits in the right half
    const fwd = target.clone().sub(pos).setY(0).normalize();
    const left = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const shift = ctx.camera.aspect > 1.2 ? 2.6 : 0;
    ctx.flyTo(pos.addScaledVector(left, shift), target.addScaledVector(left, shift));
  }, [pick]);

  /* view buttons */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !viewCmd) return;
    ctx.exitWalk();
    if (viewCmd.kind === "top") ctx.flyTo(new THREE.Vector3(0, 32, 0.6), new THREE.Vector3(0, 0, 0));
    else ctx.flyTo(ctx.HOME.pos, ctx.HOME.target);
  }, [viewCmd]);

  /* stock → cartons on the racks */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.roomObjs.forEach((r, i) => fillCartons(r, stock?.[String(i)]?.items || []));
  }, [stock]);

  /* walk HUD commands */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !walkCmd) return;
    if (walkCmd.kind === "exit") ctx.exitWalk();
    else if (walkCmd.kind === "auto") ctx.setAuto(!!walkCmd.value);
    else if (walkCmd.kind === "door") ctx.toggleNearDoor();
  }, [walkCmd]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

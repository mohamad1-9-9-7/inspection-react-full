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
//   stock      { [roomIndex]: { items } }     drawn as cartons on the racks;
//                                             the count shows on each label
//   onPick(i, { door })                      door = the click was on the door
//
// Home view = a tidy view from above with all eight labels. Picking a room
// flies to it and slides its door open (its light comes on inside).
// The walking worker and walk mode were removed (user, 18 Oct 2026).

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

/* The wall that closes the far end of the corridor. */
const END_Z = slotZ(3) - RW / 2 - 1.3;

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
function paintLabel(slot, { num, name, kind, value, status, cal, lang, t, linked, selected, count = 0 }) {
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
  const state = !linked ? `🔗 ${t.unlinked}` : value == null ? t.none : cal === "expired" ? `⛔ ${t.calibExpired}` : cal === "soon" ? `⏳ ${t.calib}` : cal === "ok" ? `🎯 ${t.calib} ✓` : "";
  const sub = [count ? `📦 ${count}` : "", state].filter(Boolean).join("  ·  ");
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

/* ══════════════════════════════════════ Component */

export default function ColdRoomsScene({ rooms, live, cals, pick, onPick, lang, t, viewCmd, stock }) {
  const hostRef = useRef(null);
  const ctxRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

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
    scene.fog = new THREE.Fog("#e8f3fb", 70, 130);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    // HOME = a tidy view from above: all eight rooms and their labels at once
    const HOME = { pos: new THREE.Vector3(0, 46, 16), target: new THREE.Vector3(0, 0, -1) };
    camera.position.copy(HOME.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.screenSpacePanning = false;
    controls.update();

    // light
    scene.add(new THREE.HemisphereLight("#ffffff", "#cbd5e1", 1.15));
    const sun = new THREE.DirectionalLight("#ffffff", 1.5);
    sun.position.set(12, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
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
    // corridor: lighter epoxy strip + green safety lines + arrows
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
    endWall.position.set(0, RH / 2, END_Z);
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
      r.place = p;
      scene.add(r.group);
      return r;
    });

    // a light that switches on inside the room whose door is open
    const roomLight = new THREE.PointLight("#ffffff", 0, 12, 1.3);
    scene.add(roomLight);

    // picking
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickables = roomObjs.flatMap((r) => r.pick);
    const hitAt = (ev) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables.filter((o) => o.visible !== false), false)[0];
      return hit ? { room: hit.object.userData.room, door: !!hit.object.userData.door } : null;
    };
    let down = null;
    let hover = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down) return;
      const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
      down = null;
      if (moved > 6) return; // a drag turned the view, not a click
      const h = hitAt(e);
      onPickRef.current?.(h ? h.room : null, { door: !!(h && h.door) });
    };
    let hoverQueued = false;
    const onMove = (e) => {
      if (hoverQueued || down) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        const h = hitAt(e)?.room ?? null;
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

    // size: a narrow (phone) screen widens the lens so all eight rooms stay in view
    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 66 : w / h < 1.2 ? 54 : w / h < 1.6 ? 46 : 40;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // camera fly-to
    const fly = { pos: null, target: null };
    const flyTo = (pos, target) => { fly.pos = pos.clone(); fly.target = target.clone(); };

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
        camera.position.lerp(fly.pos, 0.08);
        controls.target.lerp(fly.target, 0.08);
        if (camera.position.distanceTo(fly.pos) < 0.05 && controls.target.distanceTo(fly.target) < 0.05) {
          fly.pos = null;
          fly.target = null;
        }
      }
      const anySel = roomObjs.some((o) => o.group.userData.selected);
      let lit = null;
      roomObjs.forEach((r, i) => {
        // the selected room's door slides open (to the left as seen from the corridor)
        r.doorTarget = r.group.userData.selected ? 1 : 0;
        r.doorOpen += (r.doorTarget - r.doorOpen) * Math.min(1, dt * 3.5);
        r.slider.position.x = DOOR_X - r.doorOpen * (DW - 0.1);
        if (r.doorTarget) lit = r;
        const alarm = r.group.userData.alarm;
        r.beaconMat.emissiveIntensity = alarm ? 0.6 + Math.abs(Math.sin(time * 4)) * 2.4 : 1.1;
        r.glowMat.opacity = alarm ? 0.18 + Math.abs(Math.sin(time * 4)) * 0.3 : 0.22;
        r.outline.visible = r.group.userData.selected;
        // a selected room stands alone; the others' labels step back
        r.sprite.visible = !anySel || r.group.userData.selected;
        r.sprite.scale.set(5, 5 * (330 / 720), 1);
        r.sprite.position.y = RH + 2.6 + (r.group.userData.selected ? Math.sin(time * 2.5) * 0.08 : 0) + (i === hover ? 0.15 : 0);
        r.sprite.position.z = -RD / 2 + 0.4;
      });
      if (lit) {
        const c = new THREE.Vector3(0, RH - 0.4, -RD / 2).applyMatrix4(lit.group.matrixWorld);
        roomLight.position.copy(c);
        roomLight.color.set(lit.isFreezer ? "#cfe8ff" : "#fff7ed");
        roomLight.intensity = Math.min(1, lit.doorOpen) * 11;
      } else roomLight.intensity = 0;
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    ctxRef.current = { roomObjs, flyTo, HOME, camera };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
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
        linked: !!room.link, selected: pick === i, count: stock?.[String(i)]?.items?.length || 0,
      });
    });
  }, [rooms, live, cals, pick, lang, t, stock]);

  /* fly to the picked room */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || pick == null) return;
    const p = placement(pick);
    // stand across the corridor, above the opposite roof, a little towards
    // the entrance — the open door, its display and the label all in view
    const dw = localToWorld(p, DOOR_X, 0);
    const door = new THREE.Vector3(dw.x, 0, dw.z);
    const target = door.clone().addScaledVector(p.face, -1.2).add(new THREE.Vector3(0, 2.2, 0));
    const pos = door.clone().addScaledVector(p.face, CORR + 3.5).add(new THREE.Vector3(0, 7.5, 5));
    // a wide screen: the panel opens on the left, so keep the door in the right half
    const fwd = target.clone().sub(pos).setY(0).normalize();
    const left = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const shift = ctx.camera.aspect > 1.2 ? 2.6 : 0;
    ctx.flyTo(pos.addScaledVector(left, shift), target.addScaledVector(left, shift));
  }, [pick]);

  /* view buttons */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !viewCmd) return;
    if (viewCmd.kind === "top") ctx.flyTo(new THREE.Vector3(0, 52, 0.6), new THREE.Vector3(0, 0, 0));
    else ctx.flyTo(ctx.HOME.pos, ctx.HOME.target);
  }, [viewCmd]);

  /* stock → cartons on the racks */
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.roomObjs.forEach((r, i) => fillCartons(r, stock?.[String(i)]?.items || []));
  }, [stock]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

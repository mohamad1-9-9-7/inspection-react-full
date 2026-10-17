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
import { kindOf, verdict } from "./coldRoomsConfig";

/* ══════════════════════════════════════ Dimensions (metres) */
const RW = 4.2;     // room width (along the corridor)
const RD = 10;      // room depth (from the corridor outwards)
const RH = 3.2;     // room height
const WT = 0.14;    // wall thickness (insulated panel)
const GAP = 0.35;   // between two rooms
const CORR = 4.4;   // corridor width
const DW = 1.6;     // door width
const DH = 2.45;    // door height

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
  g.fillStyle = "#cbd5e1";
  g.fillRect(0, 0, 3, 256);
  g.fillStyle = "rgba(148,163,184,.25)";
  for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 256, 1);
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

/* ══════════════════════════════════════ Building one room */

function buildRoom(mats, panelTex) {
  const group = new THREE.Group();
  const pick = []; // meshes that select the room when clicked

  const wall = (w, h, d, x, y, z, repeatX) => {
    const tex = panelTex.clone();
    tex.repeat.set(Math.max(1, repeatX), 1);
    tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    pick.push(m);
    return m;
  };

  // back + sides
  wall(RW, RH, WT, 0, RH / 2, -RD + WT / 2, RW / 1.1);
  wall(WT, RH, RD, -RW / 2 + WT / 2, RH / 2, -RD / 2, RD / 1.1);
  wall(WT, RH, RD, RW / 2 - WT / 2, RH / 2, -RD / 2, RD / 1.1);
  // front, around the door opening
  const sideW = (RW - DW) / 2;
  wall(sideW, RH, WT, -(DW / 2 + sideW / 2), RH / 2, -WT / 2, sideW / 1.1);
  wall(sideW, RH, WT, DW / 2 + sideW / 2, RH / 2, -WT / 2, sideW / 1.1);
  wall(DW, RH - DH, WT, 0, DH + (RH - DH) / 2, -WT / 2, 1.5);

  // roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(RW + 0.06, 0.12, RD + 0.06), mats.roof);
  roof.position.set(0, RH + 0.06, -RD / 2);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  pick.push(roof);

  // coloured kind band around the top of the front wall + roof edge
  const accent = new THREE.MeshStandardMaterial({ color: "#2563eb", roughness: 0.4, metalness: 0.1, emissive: "#000000" });
  const band = new THREE.Mesh(new THREE.BoxGeometry(RW + 0.08, 0.22, 0.05), accent);
  band.position.set(0, RH - 0.14, 0.03);
  group.add(band);
  const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, RD), accent);
  bandL.position.set(-RW / 2 - 0.02, RH - 0.14, -RD / 2);
  group.add(bandL);
  const bandR = bandL.clone();
  bandR.position.x = RW / 2 + 0.02;
  group.add(bandR);
  // door frame in the kind colour
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(DW + 0.2, 0.1, 0.08), accent);
  frameTop.position.set(0, DH + 0.05, 0.02);
  group.add(frameTop);
  [-1, 1].forEach((s) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, DH, 0.08), accent);
    f.position.set(s * (DW / 2 + 0.05), DH / 2, 0.02);
    group.add(f);
  });

  // stainless door on its hinges (left edge) — swings out into the corridor
  const hinge = new THREE.Group();
  hinge.position.set(-DW / 2 + 0.02, 0, 0.02);
  group.add(hinge);
  const doorParts = [];
  const onDoor = (mesh, x, y, z) => {
    mesh.position.set(x + DW / 2 - 0.02, y, z);
    hinge.add(mesh);
    doorParts.push(mesh);
    return mesh;
  };
  const door = onDoor(new THREE.Mesh(new THREE.BoxGeometry(DW - 0.04, DH - 0.03, 0.1), mats.steel), 0, DH / 2, 0);
  door.castShadow = true;
  onDoor(new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, 0.38, 0.02), mats.kick), 0, 0.22, 0.06);
  onDoor(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mats.dark), DW / 2 - 0.22, 1.15, 0.1);
  [0.5, DH - 0.5].forEach((y) => onDoor(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.06), mats.dark), -DW / 2 + 0.06, y, 0.08));
  // viewing window
  onDoor(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.02), mats.glass), 0, 1.65, 0.06);
  doorParts.forEach((m) => { m.userData.door = true; pick.push(m); });

  /* ── inside the room ── */
  const inner = new THREE.Group();
  group.add(inner);
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(RW - 2 * WT, RD - 2 * WT), mats.innerFloor);
  inFloor.rotation.x = -Math.PI / 2;
  inFloor.position.set(0, 0.012, -RD / 2);
  inFloor.receiveShadow = true;
  inner.add(inFloor);
  // ceiling light panel
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.35), mats.lamp);
  lamp.position.set(0, RH - 0.05, -RD / 2);
  inner.add(lamp);
  // evaporator on the back wall
  const evap = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.55), mats.unit);
  evap.position.set(0, RH - 0.45, -RD + WT + 0.32);
  inner.add(evap);
  [-0.5, 0.5].forEach((x) => {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.19, 28), mats.grille);
    fan.position.set(x, RH - 0.45, -RD + WT + 0.6);
    inner.add(fan);
  });
  // racks along both side walls: uprights + three shelves
  const RACK_X = RW / 2 - WT - 0.38;
  const RACK_Z0 = -1.3;
  const RACK_Z1 = -RD + 0.5;
  const RACK_LEN = RACK_Z0 - RACK_Z1;
  const SHELF_Y = [0.12, 0.92, 1.72];
  [-1, 1].forEach((sx) => {
    SHELF_Y.forEach((y) => {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, RACK_LEN), mats.rack);
      sh.position.set(sx * RACK_X, y, (RACK_Z0 + RACK_Z1) / 2);
      sh.receiveShadow = true;
      inner.add(sh);
    });
    for (let z = RACK_Z0; z >= RACK_Z1 - 0.01; z -= RACK_LEN / 4) {
      [-0.29, 0.29].forEach((dx) => {
        const up = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.3, 0.05), mats.upright);
        up.position.set(sx * RACK_X + dx, 1.15, z);
        inner.add(up);
      });
    }
  });
  // the cartons — rebuilt from the room's stock
  const cartons = new THREE.Group();
  inner.add(cartons);
  const slots = [];
  [-1, 1].forEach((sx) => SHELF_Y.forEach((y) => {
    for (let z = RACK_Z0 - 0.3; z >= RACK_Z1 + 0.2; z -= 0.56) slots.push(new THREE.Vector3(sx * RACK_X, y + 0.2, z));
  }));

  // digital display above the door
  const screen = canvasTex(640, 220);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.5), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  scr.position.set(0, DH + 0.42, 0.03);
  group.add(scr);
  pick.push(scr);

  // status beacon on the roof edge above the door
  const beaconMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", emissive: "#94a3b8", emissiveIntensity: 0.6, roughness: 0.3 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.24, 24), beaconMat);
  beacon.position.set(DW / 2 + 0.55, RH + 0.24, -0.15);
  group.add(beacon);
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24), mats.dark);
  beaconBase.position.set(DW / 2 + 0.55, RH + 0.12, -0.15);
  group.add(beaconBase);

  // condensing unit on the roof
  const cu = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.95), mats.unit);
  body.position.y = 0.35;
  body.castShadow = true;
  cu.add(body);
  [-0.42, 0.42].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 32), mats.dark);
    ring.position.set(x, 0.72, 0);
    cu.add(ring);
    const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), mats.grille);
    grille.position.set(x, 0.74, 0);
    cu.add(grille);
  });
  cu.position.set(-0.6, RH + 0.12, -RD + 1.1);
  group.add(cu);
  // pipe from the unit down into the room
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12), mats.copper);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0.4, RH + 0.2, -RD + 2.0);
  group.add(pipe);

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
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.9, 1.3), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.012, 0.75);
  group.add(glow);

  return { group, pick, accent, beaconMat, glowMat, screen, label, sprite, outline, hinge, cartons, slots, doorAngle: 0, doorTarget: 0 };
}

/* ══════════════════════════════════════ Cartons on the racks */

const CARTON_GEO = new THREE.BoxGeometry(0.5, 0.36, 0.48);
const cartonMats = new Map();
function cartonMat(code) {
  let h = 0;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const key = h % 12;
  if (!cartonMats.has(key)) {
    // cardboard browns, a slightly different shade per product so lines read as groups
    cartonMats.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((24 + (key % 6) * 4) / 360, 0.42 + (key % 4) * 0.05, 0.5 + (key % 3) * 0.06), roughness: 0.85 }));
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
      c.rotation.y = ((slot * 37) % 7 - 3) * 0.015;
      c.castShadow = true;
      r.cartons.add(c);
    }
  });
}

/* ══════════════════════════════════════ The walker */

function buildPerson() {
  const g = new THREE.Group();
  const m = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const navy = m("#1e3a5f");
  const vest = m("#facc15", { emissive: "#7c5e00", emissiveIntensity: 0.15 });
  const strip = m("#f1f5f9", { metalness: 0.3, roughness: 0.25 });
  const skin = m("#e0ac69");
  const hat = m("#ffffff", { roughness: 0.3 });
  const boot = m("#111827");
  const add = (geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  [-0.1, 0.1].forEach((x) => {
    add(new THREE.BoxGeometry(0.15, 0.82, 0.17), navy, x, 0.47, 0);
    add(new THREE.BoxGeometry(0.16, 0.1, 0.26), boot, x, 0.05, 0.04);
  });
  add(new THREE.CylinderGeometry(0.21, 0.19, 0.62, 20), vest, 0, 1.19, 0);
  add(new THREE.CylinderGeometry(0.215, 0.205, 0.05, 20), strip, 0, 1.06, 0);
  add(new THREE.CylinderGeometry(0.215, 0.21, 0.05, 20), strip, 0, 1.3, 0);
  [-1, 1].forEach((sx) => {
    const arm = add(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 12), navy, sx * 0.28, 1.17, 0);
    arm.rotation.z = sx * 0.08;
    add(new THREE.SphereGeometry(0.06, 12, 10), skin, sx * 0.3, 0.84, 0);
  });
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12), skin, 0, 1.53, 0);
  add(new THREE.SphereGeometry(0.13, 20, 16), skin, 0, 1.66, 0);
  const dome = add(new THREE.SphereGeometry(0.145, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 1.7, 0);
  dome.castShadow = true;
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 20), hat, 0, 1.7, 0.02);

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
  sprite.position.y = 2.45;
  g.add(sprite);

  g.traverse((o) => { o.userData.person = true; });
  return { group: g, pick: [hit, sprite], ring, ringMat, label };
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
    scene.fog = new THREE.Fog("#e8f3fb", 40, 85);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    // standing at the entrance, looking down the corridor
    const HOME = { pos: new THREE.Vector3(0, 21, 27), target: new THREE.Vector3(0, 0, -2.5) };
    camera.position.copy(HOME.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 6;
    controls.maxDistance = 48;
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
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
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
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.75 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // corridor: lighter epoxy strip + yellow safety lines + arrows
    const corrLen = 4 * RW + 3 * GAP + 3;
    const corr = new THREE.Mesh(new THREE.PlaneGeometry(CORR - 0.4, corrLen), new THREE.MeshStandardMaterial({ color: "#d6e4f0", roughness: 0.35, metalness: 0.05 }));
    corr.rotation.x = -Math.PI / 2;
    corr.position.y = 0.004;
    corr.receiveShadow = true;
    scene.add(corr);
    const lineMat = new THREE.MeshBasicMaterial({ color: "#facc15" });
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
      steel: new THREE.MeshStandardMaterial({ color: "#dfe6ee", metalness: 0.55, roughness: 0.32 }),
      kick: new THREE.MeshStandardMaterial({ color: "#e5e9ee", metalness: 0.95, roughness: 0.18 }),
      dark: new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.4, roughness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: "#9cc7e6", metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.75 }),
      unit: new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.3, roughness: 0.45 }),
      grille: new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.5, roughness: 0.4 }),
      copper: new THREE.MeshStandardMaterial({ color: "#b87333", metalness: 0.8, roughness: 0.35 }),
      innerFloor: new THREE.MeshStandardMaterial({ color: "#eef2f6", roughness: 0.5 }),
      lamp: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      rack: new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.6, roughness: 0.35 }),
      upright: new THREE.MeshStandardMaterial({ color: "#2563eb", metalness: 0.4, roughness: 0.45 }),
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
    const roomLight = new THREE.PointLight("#ffffff", 0, 9, 1.4);
    scene.add(roomLight);

    // the walker, waiting at the entrance and facing into the store
    const person = buildPerson();
    person.group.position.set(0, 0, ENTRY_Z);
    person.group.rotation.y = Math.PI;
    scene.add(person.group);

    /* walk mode state */
    const W = { on: false, pending: false, auto: false, pos: new THREE.Vector3(), yaw: 0, pitch: -0.04, dist: 0, turning: 0, near: null, inside: null };
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
    const IN_X = RW / 2 - WT - 0.35;
    const canStand = (x, z) => {
      if (Math.abs(x) <= WALK.xMax && z >= WALK.zMin && z <= WALK.zMax) return true;
      return roomObjs.some((r) => {
        if (r.doorAngle > -0.9) return false; // only through a door that is open
        const l = toLocal(r, x, z);
        const doorway = Math.abs(l.x) <= DW / 2 - 0.25 && l.z <= 0.9 && l.z >= -0.6;
        const room = Math.abs(l.x) <= IN_X - 0.25 && l.z <= -0.35 && l.z >= -RD + WT + 0.45;
        // keep him off the racks: the middle aisle only
        const aisle = room && Math.abs(l.x) <= IN_X - 0.75;
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
        const d = Math.hypot(l.x, Math.max(0, l.z));
        if (l.z <= -0.6 || d >= 2.6) return;
        // two doors face each other: the one he looks at wins
        const vx = r.place.x - x;
        const vz = r.place.z - z;
        const facing = (vx * fx + vz * fz) / (Math.hypot(vx, vz) || 1);
        const score = d - facing * 1.5;
        if (score < best) { best = score; near = i; }
      });
      return { near: inside != null ? inside : near, inside };
    };
    const setDoor = (i, open) => {
      const r = roomObjs[i];
      if (!r) return;
      r.doorTarget = open ? -1.55 : 0;
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
      if (W.on && h && h.door && W.near === h.room && W.inside == null) {
        setDoor(h.room, !roomObjs[h.room].doorTarget);
        return;
      }
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
        // any key of his own takes over from the automatic walk
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
        const step = ((fwd ? 1 : 0) - (back ? 1 : 0)) * WALK.speed * dt;
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
        person.group.rotation.y = Math.PI + Math.sin(time * 0.8) * 0.25;
        const p = 1 + Math.abs(Math.sin(time * 2)) * 0.35;
        person.ring.scale.set(p, p, p);
        person.ringMat.opacity = 0.75 - (p - 1) * 1.4;
      }
      const anySel = roomObjs.some((o) => o.group.userData.selected);
      let lit = null;
      roomObjs.forEach((r) => {
        r.doorAngle += (r.doorTarget - r.doorAngle) * Math.min(1, dt * 5);
        r.hinge.rotation.y = r.doorAngle;
        if (r.doorTarget && lit == null) lit = r;
        // a door left open closes by itself once he is far from it
        if (r.doorTarget && W.on && W.inside !== r.index) {
          const l = toLocal(r, W.pos.x, W.pos.z);
          if (Math.hypot(l.x, l.z) > 7) r.doorTarget = 0;
        }
      });
      if (W.inside != null) lit = roomObjs[W.inside];
      if (lit) {
        const c = new THREE.Vector3(0, RH - 0.4, -RD / 2).applyMatrix4(lit.group.matrixWorld);
        roomLight.position.copy(c);
        roomLight.color.set(lit.isFreezer ? "#cfe8ff" : "#fff7ed");
        roomLight.intensity = Math.min(1, -lit.doorAngle / 1.55) * 9 + (W.inside != null ? 4 : 0);
      } else roomLight.intensity = 0;
      roomObjs.forEach((r, i) => {
        const alarm = r.group.userData.alarm;
        r.beaconMat.emissiveIntensity = alarm ? 0.8 + Math.abs(Math.sin(time * 4)) * 2.2 : 0.7;
        r.glowMat.opacity = alarm ? 0.18 + Math.abs(Math.sin(time * 4)) * 0.3 : 0.22;
        r.outline.visible = r.group.userData.selected;
        r.sprite.material.opacity = anySel && !r.group.userData.selected ? 0.3 : 1;
        // inside a room the labels of the others would show through the walls
        r.sprite.visible = W.inside == null;
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
    if (!ctx || pick == null || ctx.walking()) return;
    const p = placement(pick);
    // stand across the corridor, above the opposite roof, a little towards
    // the entrance — the door, its display and the label all in view
    const door = new THREE.Vector3(p.x, 0, p.z);
    const target = door.clone().addScaledVector(p.face, -1.2).add(new THREE.Vector3(0, 2.2, 0));
    const pos = door.clone().addScaledVector(p.face, CORR + 3.5).add(new THREE.Vector3(0, 7.5, 5));
    ctx.flyTo(pos, target);
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

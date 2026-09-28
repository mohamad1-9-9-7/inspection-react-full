// src/pages/industry-kit/log/DailyLog.jsx
// Entry point of the log-sheet engine for the company-app shell.
//
// The shell renders report pages without props, so a template asks for a
// ready-made component per schema: inputFor(schema) / viewFor(schema).
// Both first check that the schema belongs to the company the session is in
// (kitType.assertOwnType) — a mis-wired template shows a clear message and
// never touches the server.

import React from "react";
import { assertOwnType } from "../kitType";
import LogBrowser from "./LogBrowser";
import LogForm from "./LogForm";
import { S } from "./styles";

function Guard({ schema, children }) {
  try {
    assertOwnType(schema.type);
  } catch (e) {
    return <div style={{ ...S.card, margin: 20, background: "#fef2f2", color: "#b91c1c", fontWeight: 800 }}>⛔ {e.message}</div>;
  }
  return children;
}

const cache = new Map();
function make(kind, schema) {
  const key = `${kind}:${schema.type}`;
  if (!cache.has(key)) {
    const Comp = kind === "input"
      ? function KitLogInput() { return <Guard schema={schema}><LogForm schema={schema} /></Guard>; }
      : function KitLogView() { return <Guard schema={schema}><LogBrowser schema={schema} /></Guard>; };
    cache.set(key, Comp);
  }
  return cache.get(key);
}

export const inputFor = (schema) => make("input", schema);
export const viewFor = (schema) => make("view", schema);

// src/pages/monitor/branches/qcs/QcsCoolerQuick.jsx
//
// 📱 QCS cooler quick entry — the phone screen behind the QR sticker on each
// QCS storage unit.
//
//   /monitor/qcs/coolers/quick            hub (late readings, QR printing)
//   /monitor/qcs/coolers/quick/:unit      one unit (cooler-0 … cooler-7, loading-area)
//
// The screen itself is the shared _shared/QuickTempPage; this file is only
// the QCS adapter: the eight units + loading area from coolerDefs, the 2-hour
// slots, and the save through POST /api/reports/qcs-coolers/reading.

import React from "react";
import { useParams } from "react-router-dom";
import QuickTempPage from "../_shared/QuickTempPage";
import {
  defaultLoadingDef,
  emojiOf,
  fetchCoolerConfig,
  inRange,
  loadDefsCache,
  makeDefaultCoolerDefs,
  rangeLabel,
} from "./coolerDefs";
import {
  COOLER_TIMES,
  QUICK_HUB_PATH,
  SLOT_HOURS,
  UNIT_KEYS,
  fetchDay,
  quickUrl,
  saveQuickReading,
  slotForNow,
  unitBlock,
  unitDef,
} from "./coolerQuick";
import { canReport } from "../../../../utils/reportPerms";

const QCS_ADAPTER = {
  label: "QCS",
  type: "qcs-coolers",
  printTitle: "QCS",
  hubPath: QUICK_HUB_PATH,
  sheetPath: "/monitor/qcs?tab=coolers",
  allowed: () => canReport("QCS", "coolers", "input"),
  slots: COOLER_TIMES.map((s, i) => ({ key: s, label: s, short: s.replace(":00 ", "").toLowerCase(), hour: SLOT_HOURS[i] })),
  slotForNow: (now) => slotForNow(now),
  async load(date) {
    const [cfg, day] = await Promise.all([fetchCoolerConfig(), fetchDay(date)]);
    const defs = cfg || loadDefsCache() || { coolerDefs: makeDefaultCoolerDefs(), loadingDef: defaultLoadingDef() };
    return {
      payload: day,
      units: UNIT_KEYS.map((key) => ({ key, def: unitDef(key, defs.coolerDefs, defs.loadingDef) })),
      extra: defs,
    };
  },
  readingsOf: (payload, key) => unitBlock(payload, key)?.temps || {},
  remarksOf: (payload, key) => unitBlock(payload, key)?.remarks || "",
  sameUnit: (a, b) => a === b,
  inRange,
  emoji: emojiOf,
  rangeLabel,
  qrUrl: quickUrl,
  // The limits in force travel with the record, as the full sheet does.
  save: (common, data) =>
    saveQuickReading({ ...common, coolerDefs: data?.extra?.coolerDefs, loadingDef: data?.extra?.loadingDef }),
};

export default function QcsCoolerQuick() {
  const { unit } = useParams();
  return <QuickTempPage A={QCS_ADAPTER} unit={unit} />;
}

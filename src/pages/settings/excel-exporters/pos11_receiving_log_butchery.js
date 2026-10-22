// POS 11 receiving log — the branch's own column order (POS11ReceivingLogView):
// it records a weight and a firmness check, and has no DM vehicle approval
// number, so the shared FTR columns dropped the weight.
import { makeFtrReceivingBuilder } from "./_ftr_receiving";

const COLS = [
  { key: "supplier",        label: "Name of the Supplier", width: 22, align: "left" },
  { key: "itemCode",        label: "Item Code",            width: 12, align: "left" },
  { key: "foodItem",        label: "Food Item",            width: 20, align: "left" },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)",    width: 12 },
  { key: "foodTemp",        label: "Food Temp (°C)",       width: 12 },
  { key: "weightKg",        label: "Weight (kg)",          width: 12 },
  { key: "vehicleClean",    label: "Vehicle clean",        width: 12 },
  { key: "handlerHygiene",  label: "Food handler hygiene", width: 13 },
  { key: "appearanceOK",    label: "Appearance",           width: 12 },
  { key: "firmnessOK",      label: "Firmness",             width: 11 },
  { key: "smellOK",         label: "Smell",                width: 10 },
  { key: "packagingGood",   label: "Packaging of food is good and undamaged, clean and no signs of pest infestation", width: 24 },
  { key: "countryOfOrigin", label: "Country of origin",    width: 14 },
  { key: "productionDate",  label: "Production Date",      width: 13 },
  { key: "expiryDate",      label: "Expiry Date",          width: 13 },
  { key: "remarks",         label: "Remarks (if any)",     width: 22, align: "left" },
];

export default makeFtrReceivingBuilder("POS 11", { cols: COLS });

// POS 10 receiving log — the branch's own sheet, in the viewer's column order.
// It shares the FTR builder but not the FTR column list: POS 10 records a
// Quantity and a Firmness check and has no DM approval number, so reusing the
// FTR columns printed one empty column and dropped two filled ones.
import { makeFtrReceivingBuilder } from "./_ftr_receiving";

const COLS = [
  { key: "itemCode",        label: "Item Code",         width: 13, align: "left" },
  { key: "foodItem",        label: "Food Item",         width: 22, align: "left" },
  { key: "supplier",        label: "Name of the Supplier", width: 24, align: "left" },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)", width: 12 },
  { key: "foodTemp",        label: "Food Temp (°C)",    width: 12 },
  { key: "quantity",        label: "Quantity KG / PCS", width: 15 },
  { key: "vehicleClean",    label: "Vehicle clean",     width: 12 },
  { key: "handlerHygiene",  label: "Food handler hygiene", width: 14 },
  { key: "appearanceOK",    label: "Appearance",        width: 12 },
  { key: "firmnessOK",      label: "Firmness",          width: 11 },
  { key: "smellOK",         label: "Bad Smell",         width: 11 },
  { key: "packagingGood",   label: "Packaging of food is good and undamaged, clean and no signs of pest infestation", width: 24 },
  { key: "countryOfOrigin", label: "Country of origin", width: 15 },
  { key: "productionDate",  label: "Production Date",   width: 14 },
  { key: "expiryDate",      label: "Expiry Date",       width: 14 },
  { key: "remarks",         label: "Remarks (if any)",  width: 24, align: "left" },
];

export default makeFtrReceivingBuilder("POS 10", {
  cols: COLS,
  documentNo: (p) => p.formRef || "FSMS/BR/F01A",
});

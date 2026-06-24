import React from "react";
import VegSanitationInput from "../pos19/pos19_inputs/VegSanitationInput";

const DOC_META = {
  area: "PRODUCTION",
  title: "SANITATION RECORD (CCP) - PRODUCTION",
  controllingOfficer: "Production Officer",
};

export default function PRDVegSanitationInput() {
  return (
    <VegSanitationInput
      reportType="prod_veg_sanitation_ccp"
      branch="PRODUCTION"
      formRef="TELT/PRD/QA/SR/1"
      reporter="production"
      docMeta={DOC_META}
      areaLabel="Production"
      showEntryDateTime={false}
      initialRowCount={1}
      allowRowDelete
    />
  );
}

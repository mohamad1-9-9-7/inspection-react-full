import React from "react";
import VegSanitationView from "../pos19/view pos 19/VegSanitationView";

export default function PRDVegSanitationView() {
  return (
    <VegSanitationView
      reportType="prod_veg_sanitation_ccp"
      branch="PRODUCTION"
      formRef="TELT/PRD/QA/SR/1"
      reporter="production"
      exportPrefix="PRODUCTION_VegSanitation"
      branchLabel="PRODUCTION"
      areaLabel="Production"
      showEntryDateTime={false}
    />
  );
}

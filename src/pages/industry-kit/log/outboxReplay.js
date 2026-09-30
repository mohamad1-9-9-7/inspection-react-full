// src/pages/industry-kit/log/outboxReplay.js
// Start-up hook for kit saves kept offline: log sheets (./api.js saveSheet)
// and OHC cards (../health-cards/ohcOutbox.js). External certificates use the
// shared "report" kind of utils/reportOutbox, registered there.
//
// App.jsx imports this tiny file so the outbox knows how to send a waiting
// "kit-sheet" entry from the first second — while the kit code itself (every
// industry's schemas) is only downloaded when such an entry actually exists,
// so Al Mawashi's start-up bundle does not grow.

import { registerOutboxHandler } from "../../../utils/offlineOutbox";

registerOutboxHandler("kit-sheet", async (spec) => (await import("./api")).replaySheet(spec));
// OHC cards: the replay re-checks the employee number before sending.
registerOutboxHandler("kit-ohc", async (spec) => (await import("../health-cards/ohcOutbox")).replayOhc(spec));

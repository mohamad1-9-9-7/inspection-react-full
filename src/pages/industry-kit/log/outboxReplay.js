// src/pages/industry-kit/log/outboxReplay.js
// Start-up hook for kit log sheets kept offline (see ./api.js saveSheet).
//
// App.jsx imports this tiny file so the outbox knows how to send a waiting
// "kit-sheet" entry from the first second — while the kit code itself (every
// industry's schemas) is only downloaded when such an entry actually exists,
// so Al Mawashi's start-up bundle does not grow.

import { registerOutboxHandler } from "../../../utils/offlineOutbox";

registerOutboxHandler("kit-sheet", async (spec) => (await import("./api")).replaySheet(spec));

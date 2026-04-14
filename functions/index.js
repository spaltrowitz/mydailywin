/**
 * MyDailyWin Cloud Functions
 *
 * Placeholder — no cloud functions currently in use.
 */

const {setGlobalOptions} = require("firebase-functions");

// Cost control - limit concurrent instances
setGlobalOptions({maxInstances: 10});

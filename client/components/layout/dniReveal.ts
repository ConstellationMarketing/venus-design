import {
  refreshWhatConvertsDni,
  scheduleRefreshSeries,
} from "@site/lib/whatconvertsRefresh";
import {
  startUniversalPhoneSync,
  syncPhoneNumbersNow,
} from "@site/lib/syncDniPhone";

/**
 * Call this after revealing hidden content (e.g. FAQ toggle, accordion
 * expand) so newly-visible phone numbers get swapped by WhatConverts.
 */
export function triggerDniRefreshAfterReveal(): void {
  try {
    setTimeout(() => {
      refreshWhatConvertsDni("content-reveal", { force: true });
      syncPhoneNumbersNow();
      startUniversalPhoneSync();
      scheduleRefreshSeries("content-reveal", startUniversalPhoneSync);
    }, 100);
  } catch {
    // Silent
  }
}

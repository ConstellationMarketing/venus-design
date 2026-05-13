// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resetUniversalPhoneSyncState,
  syncPhoneNumbersNow,
} from "./syncDniPhone";

describe("syncDniPhone", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    resetUniversalPhoneSyncState();
  });

  afterEach(() => {
    resetUniversalPhoneSyncState();
  });

  it("updates a single swapped tel link using visible text as the original source", () => {
    document.body.innerHTML = `
      <a id="call" href="tel:4045559999"><span>404-555-1234</span></a>
      <p id="copy">Call 404-555-1234 today</p>
    `;

    const changed = syncPhoneNumbersNow();
    const callLink = document.getElementById("call") as HTMLAnchorElement;
    const copy = document.getElementById("copy");

    expect(changed).toBe(true);
    expect(callLink.getAttribute("href")).toBe("tel:4045559999");
    expect(callLink.textContent).toContain("404-555-9999");
    expect(copy?.textContent).toContain("404-555-9999");
  });

  it("propagates the swapped number across mixed tel links", () => {
    document.body.innerHTML = `
      <a id="original" href="tel:4045551234">404-555-1234</a>
      <a id="swapped" href="tel:4045559999">404-555-9999</a>
    `;

    const changed = syncPhoneNumbersNow();
    const original = document.getElementById("original") as HTMLAnchorElement;
    const swapped = document.getElementById("swapped") as HTMLAnchorElement;

    expect(changed).toBe(true);
    expect(original.getAttribute("href")).toBe("tel:4045559999");
    expect(original.textContent).toBe("404-555-9999");
    expect(swapped.getAttribute("href")).toBe("tel:4045559999");
  });

  it("keeps text and href aligned when all tel links are already swapped", () => {
    document.body.innerHTML = `
      <a href="tel:4045551234">404-555-1234</a>
      <a href="tel:4045559999">404-555-9999</a>
    `;
    syncPhoneNumbersNow();

    document.body.innerHTML = `
      <a id="uniform" href="tel:4045559999">Call 404-555-1234 now</a>
      <div id="copy">Questions? Dial 404-555-1234.</div>
    `;

    const changed = syncPhoneNumbersNow();
    const uniform = document.getElementById("uniform") as HTMLAnchorElement;
    const copy = document.getElementById("copy");

    expect(changed).toBe(true);
    expect(uniform.getAttribute("href")).toBe("tel:4045559999");
    expect(uniform.textContent).toContain("404-555-9999");
    expect(copy?.textContent).toContain("404-555-9999");
  });

  it("preserves nested anchor markup while updating phone text", () => {
    document.body.innerHTML = `
      <a id="nested" href="tel:4045551234">
        <div>
          <strong>Call us</strong>
          <span>404-555-1234</span>
        </div>
      </a>
      <a href="tel:4045559999">404-555-9999</a>
    `;

    const changed = syncPhoneNumbersNow();
    const nested = document.getElementById("nested") as HTMLAnchorElement;

    expect(changed).toBe(true);
    expect(nested.querySelector("strong")?.textContent).toBe("Call us");
    expect(nested.querySelector("span")?.textContent).toBe("404-555-9999");
    expect(nested.getAttribute("href")).toBe("tel:4045559999");
  });

  it("returns false when no reliable swap can be detected", () => {
    document.body.innerHTML = `
      <a href="tel:4045551234">404-555-1234</a>
    `;

    expect(syncPhoneNumbersNow()).toBe(false);
    expect(document.body.textContent).toContain("404-555-1234");
  });
});

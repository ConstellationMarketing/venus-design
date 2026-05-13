// netlify/functions/_shared.js

const DEFAULT_EXCLUDE = [/^https?:\/\//i, /^\/\//];

function requireAdmin(event) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return {
      ok: false,
      statusCode: 500,
      body: "Missing ADMIN_PASSWORD env var",
    };
  }

  const headerPw =
    event.headers["x-admin-password"] || event.headers["X-Admin-Password"];

  if (!headerPw || String(headerPw).trim() !== String(pw).trim()) {
    return { ok: false, statusCode: 401, body: "Unauthorized" };
  }

  return { ok: true };
}

async function fetchAllEntries({ model, apiKey }) {
  const limit = 100;
  let offset = 0;
  const all = [];

  while (true) {
    const url =
      `https://cdn.builder.io/api/v3/content/${encodeURIComponent(model)}` +
      `?apiKey=${encodeURIComponent(apiKey)}&limit=${limit}&offset=${offset}`;

    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Content API failed for ${model}: ${res.status}`);
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    all.push(...results);
    if (results.length < limit) break;
    offset += limit;
  }

  return all;
}

function shouldSkipString(str) {
  if (typeof str !== "string") return true;
  if (!str) return true;
  return DEFAULT_EXCLUDE.some((re) => re.test(str));
}

function buildMatcher({ find, caseSensitive, regex }) {
  if (!find || typeof find !== "string")
    throw new Error("find must be a string");
  if (regex) {
    const flags = caseSensitive ? "g" : "gi";
    return { type: "regex", re: new RegExp(find, flags) };
  }
  const needle = caseSensitive ? find : find.toLowerCase();
  return { type: "text", needle, caseSensitive };
}

function findMatchesInJson({ obj, matcher, maxPreview = 140 }) {
  const matches = [];

  function walk(node, path) {
    if (node == null) return;

    if (typeof node === "string") {
      if (shouldSkipString(node)) return;

      let hit = false;
      if (matcher.type === "regex") {
        hit = matcher.re.test(node);
        matcher.re.lastIndex = 0;
      } else {
        const hay = matcher.caseSensitive ? node : node.toLowerCase();
        hit = hay.includes(matcher.needle);
      }

      if (hit) {
        matches.push({
          path,
          before:
            node.length > maxPreview ? node.slice(0, maxPreview) + "…" : node,
        });
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`));
      return;
    }

    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        const nextPath = path ? `${path}.${k}` : k;
        walk(v, nextPath);
      }
    }
  }

  walk(obj, "");
  return matches;
}

function setByPath(root, path, newValue) {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
    if (cur == null) return false;
  }
  const last = parts[parts.length - 1];
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    cur[last] = newValue;
    return true;
  }
  return false;
}

function replaceInString(str, matcher, replace) {
  if (matcher.type === "regex") return str.replace(matcher.re, replace);

  if (matcher.caseSensitive) {
    return str.split(matcher.needle).join(replace);
  }

  const escaped = matcher.needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  return str.replace(re, replace);
}

async function patchBuilderEntry({ model, entryId, privateKey, dataPatch }) {
  const url = `https://builder.io/api/v1/write/${encodeURIComponent(model)}/${encodeURIComponent(entryId)}?triggerWebhooks=false`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${privateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dataPatch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Write API PATCH failed: ${res.status} ${text}`);
  }

  return res.json();
}

module.exports = {
  requireAdmin,
  fetchAllEntries,
  buildMatcher,
  findMatchesInJson,
  setByPath,
  replaceInString,
  patchBuilderEntry,
};

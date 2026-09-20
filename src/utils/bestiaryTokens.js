const TOKEN_ARCHIVE_URL = "https://cdn.creativeclaw.co/u/e2d59740/zips/184366eb-bd7d-4af3-8922-89c16254d243.zip";
const FFLATE_URL = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js";

const tokenUrls = new Map();
let archiveFilesPromise = null;
let fflatePromise = null;

function normalizeId(value) {
  return String(value || "").trim();
}

function loadFflate() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser runtime required"));
  if (window.fflate?.unzip) return Promise.resolve(window.fflate);
  if (fflatePromise) return fflatePromise;

  fflatePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-pip-fflate="${FFLATE_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => window.fflate?.unzip ? resolve(window.fflate) : reject(new Error("fflate unavailable")), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load token decoder")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = FFLATE_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.pipFflate = FFLATE_URL;
    script.onload = () => window.fflate?.unzip ? resolve(window.fflate) : reject(new Error("fflate unavailable"));
    script.onerror = () => reject(new Error("Could not load token decoder"));
    document.head.appendChild(script);
  }).catch((error) => {
    fflatePromise = null;
    throw error;
  });

  return fflatePromise;
}

async function loadArchiveFiles() {
  if (archiveFilesPromise) return archiveFilesPromise;

  archiveFilesPromise = (async () => {
    const [fflate, response] = await Promise.all([
      loadFflate(),
      fetch(TOKEN_ARCHIVE_URL, { cache: "force-cache" }),
    ]);
    if (!response.ok) throw new Error(`Token archive HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return new Promise((resolve, reject) => {
      fflate.unzip(bytes, (error, files) => error ? reject(error) : resolve(files || {}));
    });
  })().catch((error) => {
    archiveFilesPromise = null;
    throw error;
  });

  return archiveFilesPromise;
}

export async function getBestiaryTokenUrl(id) {
  const key = normalizeId(id);
  if (!key) return "";
  if (tokenUrls.has(key)) return tokenUrls.get(key);

  const files = await loadArchiveFiles();
  const bytes = files[`webp/${key}.webp`];
  if (!bytes) return "";

  const url = URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
  tokenUrls.set(key, url);
  return url;
}

export function warmBestiaryToken(id) {
  return getBestiaryTokenUrl(id).catch(() => "");
}

export { TOKEN_ARCHIVE_URL };

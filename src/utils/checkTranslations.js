function flattenObject(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value, nextKey));
    } else {
      result[nextKey] = value;
    }
  }

  return result;
}

function reportMissingKeys(base, target, targetName) {
  const baseFlat = flattenObject(base);
  const targetFlat = flattenObject(target);

  const missing = Object.keys(baseFlat).filter((key) => !(key in targetFlat));
  const extra = Object.keys(targetFlat).filter((key) => !(key in baseFlat));

  if (missing.length) {
    console.group(`[i18n] Missing keys in ${targetName}`);
    missing.forEach((key) => console.warn(key));
    console.groupEnd();
  }

  if (extra.length) {
    console.group(`[i18n] Extra keys in ${targetName}`);
    extra.forEach((key) => console.warn(key));
    console.groupEnd();
  }

  if (!missing.length && !extra.length) {
    console.info(`[i18n] ${targetName} is in sync with en`);
  }
}

export function checkTranslations({ en, ru, uk, pl }) {
  reportMissingKeys(en, ru, "ru");
  reportMissingKeys(en, uk, "uk");
  reportMissingKeys(en, pl, "pl");
}
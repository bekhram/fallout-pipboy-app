export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const rowData = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((header, index) => {
      // Убираем возможные кавычки вокруг значений
      let val = rowData[index] || "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      obj[header] = val;
    });
    results.push(obj);
  }
  return results;
}

function parseCsvLine(text) {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
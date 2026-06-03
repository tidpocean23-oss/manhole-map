import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(projectRoot, "index.html");

const explicitCsvPath = process.argv[2];
const csvPath = await findCsvPath(explicitCsvPath);

const csvText = await readCsvText(csvPath);
const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
if (rows.length < 2) {
  throw new Error(`CSV has no data rows: ${csvPath}`);
}

const [headers, ...dataRows] = rows;
const headerIndex = new Map(headers.map((name, index) => [name.trim(), index]));
const records = [];
let minLat = Infinity;
let minLng = Infinity;
let maxLat = -Infinity;
let maxLng = -Infinity;

for (const row of dataRows) {
  if (!row.some((value) => value.trim() !== "")) continue;

  const x = Number(cell(row, headerIndex, "X坐標"));
  const y = Number(cell(row, headerIndex, "Y坐標"));
  if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

  const [latRaw, lngRaw] = twd97ToWgs84(x, y);
  minLat = Math.min(minLat, latRaw);
  minLng = Math.min(minLng, lngRaw);
  maxLat = Math.max(maxLat, latRaw);
  maxLng = Math.max(maxLng, lngRaw);

  const length = clean(cell(row, headerIndex, "人孔尺寸長度"));
  const width = clean(cell(row, headerIndex, "人孔尺寸寬度"));

  records.push({
    id: clean(cell(row, headerIndex, "人孔編號")),
    sheet: clean(cell(row, headerIndex, "圖幅編號")),
    lat: round(latRaw, 7),
    lng: round(lngRaw, 7),
    district: clean(cell(row, headerIndex, "行政區")),
    village: clean(cell(row, headerIndex, "行政里")),
    road: clean(cell(row, headerIndex, "道路名稱")),
    basin: clean(cell(row, headerIndex, "主集水區名稱")),
    cover: clean(cell(row, headerIndex, "人孔蓋型式")),
    kind: clean(cell(row, headerIndex, "人孔種類")),
    box: clean(cell(row, headerIndex, "箱涵屬性")),
    usage: clean(cell(row, headerIndex, "使用狀態")),
    dataStatus: clean(cell(row, headerIndex, "資料狀態")),
    depth: clean(cell(row, headerIndex, "人孔深度")),
    size: `${length} x ${width}`,
    top: clean(cell(row, headerIndex, "人孔頂標高")),
    ground: clean(cell(row, headerIndex, "地盤標高")),
  });
}

if (!records.length) {
  throw new Error("No valid records with X/Y coordinates were found.");
}

const payload = {
  records,
  districts: countBy(records, "district"),
  kinds: countBy(records, "kind"),
  bounds: [
    [minLat, minLng],
    [maxLat, maxLng],
  ],
};

const totalText = records.length.toLocaleString("zh-TW");
const districtText = payload.districts.length.toLocaleString("zh-TW");
const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");

let html = await fs.readFile(indexPath, "utf8");
html = html.replace(
  /<script id="map-data" type="application\/json">[\s\S]*?<\/script>/,
  `<script id="map-data" type="application/json">${dataJson}</script>`,
);
html = html.replace(
  /<div class="stat"><strong>[\d,]+<\/strong><span>總筆數<\/span><\/div>/,
  `<div class="stat"><strong>${totalText}</strong><span>總筆數</span></div>`,
);
html = html.replace(
  /<div class="stat"><strong>[\d,]+<\/strong><span>行政區<\/span><\/div>/,
  `<div class="stat"><strong>${districtText}</strong><span>行政區</span></div>`,
);

await fs.writeFile(indexPath, html, "utf8");

console.log(`Rebuilt ${path.relative(projectRoot, indexPath)} from ${csvPath}`);
console.log(`${totalText} records, ${districtText} districts, ${payload.kinds.length.toLocaleString("zh-TW")} kinds`);

async function findCsvPath(explicitPath) {
  const candidates = explicitPath
    ? [explicitPath]
    : [
        path.join(os.homedir(), "OneDrive", "桌面", "人孔圖資清單OK.csv"),
        path.join(os.homedir(), "Desktop", "人孔圖資清單OK.csv"),
        path.join(projectRoot, "人孔圖資清單OK.csv"),
      ];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      // Try the next common location.
    }
  }

  throw new Error(`CSV not found. Pass the CSV path as the first argument.\nTried:\n${candidates.join("\n")}`);
}

async function readCsvText(filePath) {
  const bytes = await fs.readFile(filePath);
  const candidates = [
    new TextDecoder("utf-8", { fatal: false }).decode(bytes),
    new TextDecoder("big5", { fatal: false }).decode(bytes),
  ];

  const expectedHeaders = ["圖幅編號", "人孔編號", "X坐標", "Y坐標", "行政區", "人孔種類"];
  const best = candidates
    .map((text) => ({
      text,
      score: expectedHeaders.filter((header) => text.slice(0, 300).includes(header)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < expectedHeaders.length) {
    throw new Error("Could not decode CSV headers as UTF-8 or Big5.");
  }

  return best.text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function cell(row, headerIndex, header) {
  const index = headerIndex.get(header);
  return index === undefined ? "" : (row[index] ?? "");
}

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/^'(.*)'$/, "$1");
}

function countBy(records, key) {
  const counts = new Map();
  for (const record of records) {
    const value = record[key] || "未分類";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hant"));
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

function twd97ToWgs84(x, y) {
  const a = 6378137.0;
  const b = 6356752.314245;
  const lng0 = (121 * Math.PI) / 180;
  const k0 = 0.9999;
  const dx = 250000;
  const e = Math.sqrt(1 - (b * b) / (a * a));
  const e2 = (e * e) / (1 - e * e);

  const adjustedX = x - dx;
  const m = y / k0;
  const mu = m / (a * (1 - (e ** 2) / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256));
  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2));

  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);
  const c1 = e2 * cosFp ** 2;
  const t1 = tanFp ** 2;
  const n1 = a / Math.sqrt(1 - e ** 2 * sinFp ** 2);
  const r1 = (a * (1 - e ** 2)) / (1 - e ** 2 * sinFp ** 2) ** 1.5;
  const d = adjustedX / (n1 * k0);

  const q1 = (n1 * tanFp) / r1;
  const q2 = d ** 2 / 2;
  const q3 = ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e2) * d ** 4) / 24;
  const q4 = ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * e2 - 3 * c1 ** 2) * d ** 6) / 720;
  const lat = fp - q1 * (q2 - q3 + q4);

  const q5 = d;
  const q6 = ((1 + 2 * t1 + c1) * d ** 3) / 6;
  const q7 = ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e2 + 24 * t1 ** 2) * d ** 5) / 120;
  const lng = lng0 + (q5 - q6 + q7) / cosFp;

  return [(lat * 180) / Math.PI, (lng * 180) / Math.PI];
}

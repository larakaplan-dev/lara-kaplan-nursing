import fs from "fs";
import path from "path";
import pdfParse = require("pdf-parse");

interface VaccineEntry {
  name: string;
  icd10_code: string;
  nappi_code: string;
  price_rands: number;
  price_cents: number;
}

async function extractVaccinePrices(pdfPath: string): Promise<VaccineEntry[]> {
  const buffer = fs.readFileSync(pdfPath);
  const { text } = await pdfParse(buffer);

  const vaccines: VaccineEntry[] = [];

  // Each vaccine row contains tariff code 88454 followed by name, ICD-10, NAPPI, price
  // pdf-parse flattens columns — we match lines that start with or contain "88454"
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Pattern: captures name (may have spaces), ICD-10 (Z\d+\.\d+), NAPPI (digits), price (R\d+\.\d+)
  const rowPattern =
    /88454\s+(.+?)\s+(Z[\d.]+)\s+(\d{7,10})\s+R([\d,]+\.\d{2})/;

  for (const line of lines) {
    const match = line.match(rowPattern);
    if (!match) continue;

    const [, rawName, icd10_code, nappi_code, priceStr] = match;
    const name = rawName.trim();
    const price_rands = parseFloat(priceStr.replace(",", ""));
    const price_cents = Math.round(price_rands * 100);

    vaccines.push({ name, icd10_code, nappi_code, price_rands, price_cents });
  }

  return vaccines;
}

async function main() {
  const pdfPath = path.resolve(
    __dirname,
    "../../temp/Vaccine Template with prices.pdf"
  );

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Reading: ${pdfPath}\n`);
  const vaccines = await extractVaccinePrices(pdfPath);

  if (vaccines.length === 0) {
    console.error(
      "No vaccine rows found — the PDF layout may have changed. Check the raw text below:"
    );
    const buffer = fs.readFileSync(pdfPath);
    const { text } = await pdfParse(buffer);
    console.log(text);
    process.exit(1);
  }

  console.log(`Found ${vaccines.length} vaccines:\n`);
  console.table(
    vaccines.map((v) => ({
      name: v.name,
      icd10: v.icd10_code,
      nappi: v.nappi_code,
      price: `R${v.price_rands.toFixed(2)}`,
      cents: v.price_cents,
    }))
  );

  const outPath = path.resolve(__dirname, "../../temp/vaccine-prices.json");
  fs.writeFileSync(outPath, JSON.stringify(vaccines, null, 2));
  console.log(`\nSaved to: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

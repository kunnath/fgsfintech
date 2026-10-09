/**
 * FGSBot Excel Exporter (Pure JavaScript using exceljs)
 * Updates finanzplanung.xlsx with user's financial plan data and returns binary buffer or saves to disk.
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'finanzplanung.xlsx');
const DEFAULT_OUTPUT_PATH = path.join(__dirname, 'public', 'Finanzplanung_FGSBot_Export.xlsx');

async function exportPlanToBuffer(customData) {
  const inv = customData.investitionen || {};
  const bk = customData.betriebskosten || {};
  const up = customData.umsatzplanung || {};

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  // 1. Sheet 1: Investitionen
  const sheet1 = workbook.getWorksheet('1.Investitionen');
  if (sheet1) {
    const bga = Number(inv.bga) || 2300;
    sheet1.getCell('B21').value = bga * 0.65;
    sheet1.getCell('B22').value = bga * 0.35;
    sheet1.getCell('B30').value = Number(inv.gwg_unter_800) || 500;
    sheet1.getCell('B40').value = Number(inv.gwg_800_1000) || 700;
    sheet1.getCell('B51').value = Number(inv.maschinen) || 0;
  }

  // 2. Sheet 2: Betriebskosten monatl.
  const sheet2 = workbook.getWorksheet('2.Betriebskosten monatl.');
  if (sheet2) {
    const cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    cols.forEach(col => {
      sheet2.getCell(`${col}7`).value = Number(bk.buero_coworking) || 250;
      sheet2.getCell(`${col}10`).value = Number(bk.bueromaterial) || 30;
      sheet2.getCell(`${col}11`).value = Number(bk.telefon_internet) || 60;
      sheet2.getCell(`${col}13`).value = Number(bk.server_cloud) || 250;
      sheet2.getCell(`${col}14`).value = Number(bk.marketing_werbung) || 300;
      sheet2.getCell(`${col}16`).value = Number(bk.versicherungen) || 50;
      sheet2.getCell(`${col}17`).value = Number(bk.buchhaltung_steuer) || 150;
      sheet2.getCell(`${col}23`).value = Number(bk.software_lizenzen) || 150;
      sheet2.getCell(`${col}25`).value = Number(bk.kontofuehrung) || 20;
      sheet2.getCell(`${col}26`).value = Number(bk.weiterbildung) || 50;
      sheet2.getCell(`${col}27`).value = Number(bk.sonstiger_aufwand) || 100;
    });
    sheet2.getCell('B31').value = Number(bk.gruendungskosten) || 1500;
    sheet2.getCell('B32').value = Number(bk.mietkaution) || 300;
    sheet2.getCell('B33').value = Number(bk.launch_reserve) || 4700;
  }

  // 3. Sheet 5: 4.Aufw.- Ertr-pl. monatl.
  const sheet5 = workbook.getWorksheet('4.Aufw.- Ertr-pl. monatl.');
  if (sheet5) {
    const cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const revs = (up.monatsumsaetze_j1 && up.monatsumsaetze_j1.length === 12)
      ? up.monatsumsaetze_j1
      : [8000, 9000, 10000, 11000, 12000, 12500, 13000, 13500, 14000, 14500, 15000, 22010];
    
    cols.forEach((col, idx) => {
      sheet5.getCell(`${col}9`).value = Number(revs[idx]) || 0;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function exportPlanToFile(customData, outputPath = DEFAULT_OUTPUT_PATH) {
  const buffer = await exportPlanToBuffer(customData);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = {
  exportPlanToBuffer,
  exportPlanToFile,
  TEMPLATE_PATH,
  DEFAULT_OUTPUT_PATH
};

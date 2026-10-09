#!/usr/bin/env node
/**
 * FGSBot Terminal CLI Interface
 * Run with: node cli.js
 */

const readline = require('readline');
const { FGSBotSession } = require('./botLogic.js');
const { formatEuro } = require('./validator.js');

const bot = new FGSBotSession();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.clear();
console.log("==================================================================");
console.log("🤖 FGSBot - Finanzplanungs-Chatbot für Existenzgründung & Businessplan");
console.log("   (Modell: PrimeDiet Care 100k NettoProfit / 8 Anlagen)");
console.log("==================================================================\n");

const greeting = bot.getGreeting();
console.log(greeting.text);
console.log("\n------------------------------------------------------------------");

function askNext() {
  const curQ = bot.getCurrentQuestion();
  const promptText = curQ ? `\n[${curQ.sheet} - Frage ${curQ.index}/${curQ.total}] > ` : "\nFGSBot > ";

  rl.question(promptText, (input) => {
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log("\n👋 Auf Wiedersehen! Viel Erfolg mit deiner Finanzplanung!");
      rl.close();
      process.exit(0);
    }

    const response = bot.processMessage(trimmed);
    console.log("\n" + response.text);

    if (response.calculation && (response.type === 'status' || response.type === 'plan_completed' || response.type === 'preset_loaded')) {
      const s = response.calculation.summary;
      console.log("\n--------------------------------------------------");
      console.log(`📈 KPI ÜBERSICHT:`);
      console.log(`- Gesamt-Investitionen:   ${formatEuro(s.gesamt_investitionen)}`);
      console.log(`- Monatl. Betriebskosten: ${formatEuro(s.monatliche_betriebskosten)} / Mtl.`);
      console.log(`- Mindest-Unternehmerlohn:${formatEuro(s.unternehmerlohn_monatlich)} / Mtl.`);
      console.log(`- Jahresumsatz Jahr 1:    ${formatEuro(s.jahresumsatz_j1)}`);
      console.log(`- Gewinn vor Steuern:     ${formatEuro(s.ebt_j1)}`);
      console.log(`- Gewinn nach Steuern:    ${formatEuro(s.netto_gewinn_j1)} (Ziel: ${formatEuro(response.calculation.anlage6.gewinnziel_netto)})`);
      console.log(`- Gesamtfinanzbedarf:     ${formatEuro(s.gesamt_finanzbedarf_netto)} (Finanzierung: ${formatEuro(s.summe_finanzierung)})`);
      console.log("--------------------------------------------------");
    }

    askNext();
  });
}

askNext();

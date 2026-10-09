/**
 * ConnectoryFinAssistant Conversational State Machine & Chat Controller - Bilingual (DE / EN)
 */

const { calculateFinancialPlan, BLANK_FINANZPLAN_DATA, PRIMEDIET_BENCHMARK_DATA, DEFAULT_FINANZPLAN_DATA, applyNetProfitTarget, solveRevenueForNetProfit } = require('./financialEngine.js');
const { QUESTION_DEFINITIONS, ORDERED_QUESTION_KEYS, formatEuro, parseNumericInput } = require('./validator.js');

class ConnectoryFinAssistantSession {
  constructor(lang = 'de') {
    this.lang = lang;
    this.reset();
  }

  setLanguage(lang) {
    this.lang = lang === 'en' ? 'en' : 'de';
  }

  reset() {
    this.currentQuestionIndex = 0;
    this.userAnswers = {};
    this.customPlanData = JSON.parse(JSON.stringify(BLANK_FINANZPLAN_DATA));
    this.history = [];
    this.isCompleted = false;
  }

  toJSON() {
    return {
      lang: this.lang,
      currentQuestionIndex: this.currentQuestionIndex,
      userAnswers: this.userAnswers,
      customPlanData: this.customPlanData,
      isCompleted: this.isCompleted
    };
  }

  fromJSON(json) {
    if (!json) return;
    if (json.lang) this.lang = json.lang;
    if (json.currentQuestionIndex !== undefined) this.currentQuestionIndex = json.currentQuestionIndex;
    if (json.userAnswers) this.userAnswers = json.userAnswers;
    if (json.customPlanData) this.customPlanData = json.customPlanData;
    if (json.isCompleted !== undefined) this.isCompleted = json.isCompleted;
  }

  setNetProfitTarget(targetAmount, autoScaleRevenue = true) {
    const isEn = this.lang === 'en';
    const num = typeof targetAmount === 'number' ? targetAmount : parseNumericInput(targetAmount);
    if (isNaN(num) || num <= 0) {
      return {
        success: false,
        text: isEn ? "Please specify a positive net profit target (e.g. 100000 or 80k)." : "Bitte gib ein positives Netto-Gewinnziel an (z.B. 100.000 € oder 80k)."
      };
    }

    if (autoScaleRevenue) {
      const res = applyNetProfitTarget(num, this.customPlanData);
      this.customPlanData = res.customData;
      const s = res.solved;
      const plan = res.calculation;

      const text = isEn ?
        `🎯 **Year 1 Net Profit Target set to ${formatEuro(num, 'en')}!**\n\n⚡ **Goal-Seek Auto-Calculation:**\n- **Required Pre-Tax Profit (EBT):** ${formatEuro(s.requiredEBT, 'en')} (at ${s.taxRatePercent.toFixed(2)}% tax)\n- **Required Year 1 Net Revenue:** **${formatEuro(s.requiredAnnualRevenue, 'en')}** (covers ${formatEuro(s.annualOpEx, 'en')} OpEx)\n- **Monthly Ramp:** Starts at **${formatEuro(s.month1Revenue, 'en')}** (Month 1) ➔ scales to **${formatEuro(s.month12Revenue, 'en')}** (Month 12)\n- **Net Profit Result:** 🎯 **${formatEuro(plan.summary.netto_gewinn_j1, 'en')}** (Exact match!)\n- **Follow-up Years:** Year 2: ${formatEuro(s.year2Total, 'en')} | Year 3: ${formatEuro(s.year3Total, 'en')}` :
        `🎯 **Netto-Gewinnziel für Jahr 1 auf ${formatEuro(num, 'de')} gesetzt!**\n\n⚡ **Automatische Zielwertsuche (Goal-Seek):**\n- **Benötigter Gewinn vor Steuern (EBT):** ${formatEuro(s.requiredEBT, 'de')} (bei ${s.taxRatePercent.toFixed(2)}% Steuern)\n- **Benötigter Jahresumsatz Jahr 1:** **${formatEuro(s.requiredAnnualRevenue, 'de')}** (deckt ${formatEuro(s.annualOpEx, 'de')} Betriebskosten)\n- **Monatlicher Wachstumsverlauf:** Startet bei **${formatEuro(s.month1Revenue, 'de')}** (Monat 1) ➔ wächst auf **${formatEuro(s.month12Revenue, 'de')}** (Monat 12)\n- **Errechneter Netto-Gewinn:** 🎯 **${formatEuro(plan.summary.netto_gewinn_j1, 'de')}** (Punktlandung!)\n- **Folgejahre:** 2. Jahr: ${formatEuro(s.year2Total, 'de')} | 3. Jahr: ${formatEuro(s.year3Total, 'de')}`;

      return {
        success: true,
        type: 'net_profit_target_set',
        text,
        targetNetProfit: num,
        calculation: plan,
        solved: s,
        currentQuestion: this.getCurrentQuestion()
      };
    } else {
      this.customPlanData.steuer.gewinnziel_netto = num;
      const plan = calculateFinancialPlan(this.customPlanData);
      return {
        success: true,
        type: 'net_profit_target_set',
        text: isEn ?
          `🎯 Net profit target updated to **${formatEuro(num, 'en')}**.` :
          `🎯 Netto-Gewinnziel auf **${formatEuro(num, 'de')}** aktualisiert.`,
        targetNetProfit: num,
        calculation: plan,
        currentQuestion: this.getCurrentQuestion()
      };
    }
  }

  getCurrentQuestionKey() {
    if (this.currentQuestionIndex < 0) {
      this.currentQuestionIndex = 0;
    }
    if (this.currentQuestionIndex >= ORDERED_QUESTION_KEYS.length) {
      return null;
    }
    return ORDERED_QUESTION_KEYS[this.currentQuestionIndex];
  }

  getCurrentQuestion() {
    const key = this.getCurrentQuestionKey();
    const isEn = this.lang === 'en';
    if (!key) {
      return {
        key: null,
        index: ORDERED_QUESTION_KEYS.length,
        total: ORDERED_QUESTION_KEYS.length,
        isCompleted: true,
        sheet: isEn ? "Completed" : "Fertiggestellt",
        label: isEn ? "Financial plan completed" : "Finanzplanung vollständig",
        defaultValue: null
      };
    }
    const def = QUESTION_DEFINITIONS[key];
    return {
      key,
      index: this.currentQuestionIndex + 1,
      total: ORDERED_QUESTION_KEYS.length,
      sheet: isEn ? def.sheet_en : def.sheet_de,
      label: isEn ? def.label_en : def.label_de,
      question: isEn ? def.question_en : def.question_de,
      sheetNum: def.sheetNum,
      category: def.category,
      targetField: def.targetField,
      defaultValue: def.defaultValue,
      quickPresets: def.quickPresets
    };
  }

  getGreeting() {
    const q = this.getCurrentQuestion();
    const isEn = this.lang === 'en';

    if (!q || q.isCompleted) {
      const plan = calculateFinancialPlan(this.customPlanData);
      return {
        sender: "ConnectoryFinAssistant",
        text: isEn ?
          `👋 **Hello! Welcome back to ConnectoryFinAssistant.** Your financial plan is currently complete.\nTarget Net Profit: **${formatEuro(plan.summary.netto_gewinn_j1, 'en')}**.\nYou can modify values, reload the benchmark preset, or export the Excel file!` :
          `👋 **Hallo! Willkommen zurück bei ConnectoryFinAssistant.** Deine Finanzplanung ist aktuell vollständig erfasst.\nGewinn nach Steuern: **${formatEuro(plan.summary.netto_gewinn_j1, 'de')}**.\nDu kannst beliebige Werte anpassen, die Benchmark-Vorlage neu laden oder die Excel-Datei exportieren!`,
        question: q,
        calculation: plan
      };
    }

    if (isEn) {
      return {
        sender: "ConnectoryFinAssistant",
        text: `👋 **Hello! Welcome to ConnectoryFinAssistant** – your smart Financial Planning Assistant for startups & business planning!

I will guide you step-by-step through all 8 schedules of your customized financial plan:

📑 **Overview of the 8 Schedules:**
1️⃣ **Schedule 1:** Investments *(CapEx, laptops, office, equipment)*
2️⃣ **Schedule 2:** Operating Expenses *(Rent, cloud, marketing, legal setup)*
3️⃣ **Schedule 3:** Owner's Living Expenses *(Housing, living costs, health insurance)*
4️⃣ **Schedule 4:** Revenue & Profit Plan *(Offering, growth curve, COGS)*
5️⃣ **Schedule 5:** Financing Plan *(Startup capital, founder equity, loans)*
6️⃣ **Schedule 6:** Profitability Forecast *(EBT, taxes, net profit target)*
7️⃣ **Schedule 7:** Cash Flow & Liquidity *(Quarterly liquidity & cash reserve)*
8️⃣ **Schedule 8:** VAT Calculation *(19% sales tax & input tax balance)*

💡 **Tip:** You can enter your own numbers step by step, set a net profit target (e.g. *"Set net profit to 80k"*), or click **"Load Benchmark Preset"** to see a full 100k reference model!

---
🚀 **Question 1 on ${q.sheet} (${q.label}):**
${q.question}`,
        question: q,
        suggestedInput: String(q.defaultValue)
      };
    }

    return {
      sender: "ConnectoryFinAssistant",
      text: `👋 **Hallo! Willkommen bei ConnectoryFinAssistant** – deinem Finanzplanungs-Assistenten für deine Existenzgründung & Businessplanung!

Ich führe dich Schritt für Schritt durch alle 8 Anlagen deiner individuellen Finanzplanung:

📑 **Die 8 Anlagen im Überblick:**
1️⃣ **Anlage 1:** Investitionen *(Laptops, Büro, Ausstattung, Branding)*
2️⃣ **Anlage 2:** Betriebskosten *(Miete, Server, Marketing, Gründung)*
3️⃣ **Anlage 3:** Privater Unternehmerlohn *(Miete, Lebenshaltung, KV)*
4️⃣ **Anlage 4:** Umsatz- & Ertragsplanung *(Geschäftsfelder, Wachstum)*
5️⃣ **Anlage 5:** Finanzbedarf & Finanzierung *(Eigenkapital, Kredite)*
6️⃣ **Anlage 6:** Rentabilitätsvorschau *(Gewinn vor/nach Steuern, Gewinnziel)*
7️⃣ **Anlage 7:** Liquiditätsplanung *(Quartals-Cashflow & Puffer)*
8️⃣ **Anlage 8:** MwSt-Ermittlung *(Umsatzsteuer & Vorsteuer)*

💡 **Tipp:** Du kannst deine eigenen Werte Schritt für Schritt eingeben, dein Gewinnziel setzen (z.B. *"Setze Gewinnziel auf 80k"*), oder mit **"100k Musterplan laden"** eine fertige Referenz-Vorlage ansehen!

---
🚀 **Frage 1 zu ${q.sheet} (${q.label}):**
${q.question}`,
      question: q,
      suggestedInput: String(q.defaultValue)
    };
  }

  stepBack() {
    const isEn = this.lang === 'en';
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.isCompleted = false;
      const q = this.getCurrentQuestion();
      return {
        success: true,
        type: 'step_back',
        text: isEn ?
          `⬅ **One step back:**\n\n📌 **Question ${q.index} of ${q.total} [${q.sheet}]:**\n${q.question}` :
          `⬅ **Einen Schritt zurück:**\n\n📌 **Frage ${q.index} von ${q.total} [${q.sheet}]:**\n${q.question}`,
        question: q,
        calculation: calculateFinancialPlan(this.customPlanData)
      };
    } else {
      const q = this.getCurrentQuestion();
      return {
        success: true,
        type: 'step_back',
        text: isEn ?
          `You are already at the first question!\n\n📌 **${q.sheet}:**\n${q.question}` :
          `Du bist bereits bei der ersten Frage!\n\n📌 **${q.sheet}:**\n${q.question}`,
        question: q,
        calculation: calculateFinancialPlan(this.customPlanData)
      };
    }
  }

  jumpToSheet(sheetNum) {
    const isEn = this.lang === 'en';
    const sNum = parseInt(sheetNum, 10);
    const targetIdx = ORDERED_QUESTION_KEYS.findIndex(k => QUESTION_DEFINITIONS[k].sheetNum === sNum);
    if (targetIdx !== -1) {
      this.currentQuestionIndex = targetIdx;
      this.isCompleted = false;
      const q = this.getCurrentQuestion();
      return {
        success: true,
        type: 'jumped',
        text: isEn ?
          `⏩ Jumped directly to **Schedule ${sNum} (${q.sheet})**!\n\n📌 **Question ${q.index} of ${q.total}:**\n${q.question}` :
          `⏩ Direkt zu **Anlage ${sNum} (${q.sheet})** gesprungen!\n\n📌 **Frage ${q.index} von ${q.total}:**\n${q.question}`,
        question: q,
        calculation: calculateFinancialPlan(this.customPlanData)
      };
    }
    return {
      success: false,
      text: isEn ? `Schedule ${sheetNum} not found (valid: 1 to 8).` : `Anlage ${sheetNum} nicht gefunden (gültig: 1 bis 8).`
    };
  }

  applyAnswerToModel(key, value) {
    const def = QUESTION_DEFINITIONS[key];
    if (!def) return;

    if (key === 'profit_target') {
      applyNetProfitTarget(value, this.customPlanData);
    } else if (key === 'revenue_month_1') {
      const m1 = value;
      const m12 = this.userAnswers['revenue_month_12'] || 22010;
      this.interpolateRevenue(m1, m12);
    } else if (key === 'revenue_month_12') {
      const m1 = this.userAnswers['revenue_month_1'] || 8000;
      const m12 = value;
      this.interpolateRevenue(m1, m12);
    } else if (key === 'revenue_year_2') {
      const q = Math.round(value / 4);
      this.customPlanData.umsatzplanung.jahr2_quartale = [
        Math.round(q * 0.9), Math.round(q * 0.96), Math.round(q * 1.04), Math.round(q * 1.1)
      ];
    } else if (key === 'revenue_year_3') {
      const q = Math.round(value / 4);
      this.customPlanData.umsatzplanung.jahr3_quartale = [
        Math.round(q * 0.92), Math.round(q * 0.98), Math.round(q * 1.02), Math.round(q * 1.08)
      ];
    } else if (key === 'opex_startup_once') {
      this.customPlanData.betriebskosten.gruendungskosten = Math.round(value * 0.23);
      this.customPlanData.betriebskosten.mietkaution = Math.round(value * 0.05);
      this.customPlanData.betriebskosten.launch_reserve = value - this.customPlanData.betriebskosten.gruendungskosten - this.customPlanData.betriebskosten.mietkaution;
    } else if (key === 'opex_insurance_comms') {
      this.customPlanData.betriebskosten.versicherungen = Math.round(value * 0.38);
      this.customPlanData.betriebskosten.telefon_internet = Math.round(value * 0.46);
      this.customPlanData.betriebskosten.kontofuehrung = value - this.customPlanData.betriebskosten.versicherungen - this.customPlanData.betriebskosten.telefon_internet;
    } else if (key === 'priv_insurance_health') {
      this.customPlanData.privataufwand.krankenversicherung = Math.round(value * 0.69);
      this.customPlanData.privataufwand.rentenversicherung = value - this.customPlanData.privataufwand.krankenversicherung;
    } else {
      if (this.customPlanData[def.category] && def.targetField) {
        this.customPlanData[def.category][def.targetField] = value;
      }
    }
  }

  interpolateRevenue(m1, m12) {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const val = Math.round(m1 + ((m12 - m1) * (i / 11)));
      list.push(val);
    }
    this.customPlanData.umsatzplanung.monatsumsaetze_j1 = list;
  }

  processMessage(rawInput) {
    const isEn = this.lang === 'en';
    const trimmed = String(rawInput || '').trim();
    const lower = trimmed.toLowerCase();

    // 1. Navigation & meta commands
    if (lower === 'hilfe' || lower === 'help' || lower === '?') {
      return {
        success: true,
        type: 'help',
        text: isEn ?
          `💡 **Available Commands:**
- **next** or **skip**: Accepts recommended benchmark for current question.
- **back**: Returns to previous question.
- **net profit 100k** / **set net profit to 80,000 €**: Sets Year 1 Net Profit target & auto-calculates revenue ramp.
- **status** or **kpi**: Shows current KPI dashboard (investments, profit, cashflow).
- **preset** or **demo**: Loads full PrimeDiet Care 100k Net Profit dataset.
- **sheet 1** to **sheet 8**: Jumps directly to that schedule.
- **reset** or **new**: Restarts financial plan from beginning.
- **excel**: Generates populated Excel workbook for download.` :
          `💡 **Verfügbare Befehle:**
- **weiter** oder **skip**: Übernimmt den empfohlenen Richtwert für die aktuelle Frage.
- **zurück** oder **back**: Geht zur vorherigen Frage zurück.
- **gewinnziel 100k** / **setze gewinnziel 80.000 €**: Setzt das Netto-Gewinnziel für Jahr 1 & berechnet den nötigen Umsatz per Goal-Seek.
- **status** oder **kpi**: Zeigt die aktuellen Kennzahlen (Investitionen, Gewinn, Liquidität).
- **vorlage** oder **demo**: Lädt sofort die kompletten PrimeDiet Care 100k-Planungsdaten.
- **sheet 1** bis **sheet 8**: Springt direkt zu einem bestimmten Sheet.
- **reset** oder **neu**: Startet den Finanzplan von vorne.
- **excel**: Berechnet und generiert die Excel-Datei zum Herunterladen.`
      };
    }

    // Direct Year 1 Net Profit Target command (Goal-Seek)
    const netProfitMatch = lower.match(/(?:setze\s+|set\s+)?(?:gewinnziel|zielgewinn|nettogewinn|netto-gewinn|ziel-gewinn|gewinn\s+nach\s+steuern|net\s*profit(?:\s*target)?|target\s*net\s*profit|profit\s*target|target\s*profit|goal\s*seek|zielwertsuche)\s*(?:auf|von|to|for|in|für\s+jahr\s+1|im\s+1\.\s+jahr|for\s+year\s+1)?\s*[:=]?\s*([0-9.,]+(?:\s*k)?)/i);
    if (netProfitMatch) {
      const parsedVal = parseNumericInput(netProfitMatch[1]);
      if (!isNaN(parsedVal) && parsedVal > 0) {
        return this.setNetProfitTarget(parsedVal, true);
      }
    }

    if (lower === 'zurück' || lower === 'back' || lower === 'vorherige' || lower === 'pre' || lower === 'previous') {
      return this.stepBack();
    }

    if (lower === 'vorlage' || lower === 'demo' || lower === 'preset') {
      this.customPlanData = JSON.parse(JSON.stringify(DEFAULT_FINANZPLAN_DATA));
      this.userAnswers = {};
      ORDERED_QUESTION_KEYS.forEach(k => {
        const def = QUESTION_DEFINITIONS[k];
        this.userAnswers[k] = def.defaultValue;
      });
      this.currentQuestionIndex = ORDERED_QUESTION_KEYS.length;
      this.isCompleted = true;
      const plan = calculateFinancialPlan(this.customPlanData);
      return {
        success: true,
        type: 'preset_loaded',
        text: isEn ?
          `✨ **PrimeDiet Care (100k Net Profit) preset loaded successfully!**

📊 **Calculated Results:**
- **Total Investments (App. 1):** ${formatEuro(plan.summary.gesamt_investitionen, 'en')}
- **Operating Expenses (App. 2):** ${formatEuro(plan.summary.monatliche_betriebskosten, 'en')} / month (${formatEuro(plan.summary.jaehrliche_betriebskosten_j1, 'en')} / year)
- **Owner's Living Draw (App. 3):** ${formatEuro(plan.summary.unternehmerlohn_monatlich, 'en')} / month
- **Year 1 Net Revenue (App. 4):** ${formatEuro(plan.summary.jahresumsatz_j1, 'en')}
- **Pre-Tax Profit / EBT (App. 6):** ${formatEuro(plan.summary.ebt_j1, 'en')}
- **Net Profit After Tax:** 🎯 **${formatEuro(plan.summary.netto_gewinn_j1, 'en')}** (Target Achieved!)
- **Year-End Cash Reserve (App. 7):** ${formatEuro(plan.anlage7.quartale[3].kumulativ, 'en')}
- **Total Startup Capital (App. 5):** ${formatEuro(plan.summary.gesamt_finanzbedarf_netto, 'en')} (Fully Covered)

You can modify any value or download the populated Excel workbook!` :
          `✨ **PrimeDiet Care (100k NettoProfit) Vorlage erfolgreich geladen!**

📊 **Berechnetes Ergebnis:**
- **Gesamt-Investitionen (Anlage 1):** ${formatEuro(plan.summary.gesamt_investitionen, 'de')}
- **Laufende Betriebskosten (Anlage 2):** ${formatEuro(plan.summary.monatliche_betriebskosten, 'de')} / Monat (${formatEuro(plan.summary.jaehrliche_betriebskosten_j1, 'de')} / Jahr)
- **Privater Unternehmerlohn (Anlage 3):** ${formatEuro(plan.summary.unternehmerlohn_monatlich, 'de')} / Monat
- **Jahresumsatz Jahr 1 (Anlage 4):** ${formatEuro(plan.summary.jahresumsatz_j1, 'de')}
- **Gewinn vor Steuern / EBT (Anlage 6):** ${formatEuro(plan.summary.ebt_j1, 'de')}
- **Gewinn nach Steuern (NettoProfit):** 🎯 **${formatEuro(plan.summary.netto_gewinn_j1, 'de')}** (Ziel erreicht!)
- **Liquidität am Jahresende (Anlage 7):** ${formatEuro(plan.anlage7.quartale[3].kumulativ, 'de')}
- **Gesamtfinanzbedarf (Anlage 5):** ${formatEuro(plan.summary.gesamt_finanzbedarf_netto, 'de')} (gedeckt)

Du kannst jederzeit einzelne Werte ändern oder die fertige Excel-Datei herunterladen!`,
        calculation: plan
      };
    }

    if (lower === 'status' || lower === 'kpi' || lower === 'übersicht' || lower === 'summary') {
      const plan = calculateFinancialPlan(this.customPlanData);
      return {
        success: true,
        type: 'status',
        text: isEn ?
          `📊 **Current Financial Plan Status:**
- **Investments (App. 1):** ${formatEuro(plan.summary.gesamt_investitionen, 'en')}
- **Operating Expenses (App. 2):** ${formatEuro(plan.summary.monatliche_betriebskosten, 'en')} / month
- **Owner's Living Draw (App. 3):** ${formatEuro(plan.summary.unternehmerlohn_monatlich, 'en')} / month
- **Revenue Year 1 (App. 4):** ${formatEuro(plan.summary.jahresumsatz_j1, 'en')}
- **Pre-Tax Profit (EBT):** ${formatEuro(plan.summary.ebt_j1, 'en')}
- **Net Profit (Plan):** ${formatEuro(plan.summary.netto_gewinn_j1, 'en')} ${plan.summary.target_reached ? '🎯 (Target Met)' : '⚠️ (Below Target)'}
- **Capital Needed:** ${formatEuro(plan.summary.gesamt_finanzbedarf_netto, 'en')} (Financed: ${formatEuro(plan.summary.summe_finanzierung, 'en')})

Progress: Question ${Math.min(this.currentQuestionIndex + 1, ORDERED_QUESTION_KEYS.length)} of ${ORDERED_QUESTION_KEYS.length}.` :
          `📊 **Aktueller Zwischenstand deiner Finanzplanung:**
- **Investitionen (Anlage 1):** ${formatEuro(plan.summary.gesamt_investitionen, 'de')}
- **Betriebskosten (Anlage 2):** ${formatEuro(plan.summary.monatliche_betriebskosten, 'de')} / Monat
- **Unternehmerlohn (Anlage 3):** ${formatEuro(plan.summary.unternehmerlohn_monatlich, 'de')} / Monat
- **Umsatz Jahr 1 (Anlage 4):** ${formatEuro(plan.summary.jahresumsatz_j1, 'de')}
- **Gewinn vor Steuern:** ${formatEuro(plan.summary.ebt_j1, 'de')}
- **Gewinn nach Steuern (Plan):** ${formatEuro(plan.summary.netto_gewinn_j1, 'de')} ${plan.summary.target_reached ? '🎯 (Ziel erreicht)' : '⚠️ (unter Ziel)'}
- **Finanzbedarf:** ${formatEuro(plan.summary.gesamt_finanzbedarf_netto, 'de')} (Finanzierung: ${formatEuro(plan.summary.summe_finanzierung, 'de')})

Fortschritt: Frage ${Math.min(this.currentQuestionIndex + 1, ORDERED_QUESTION_KEYS.length)} von ${ORDERED_QUESTION_KEYS.length}.`,
        calculation: plan
      };
    }

    if (lower === 'reset' || lower === 'neu' || lower === 'restart' || lower === 'new') {
      this.reset();
      const q = this.getCurrentQuestion();
      return {
        success: true,
        type: 'reset',
        text: isEn ?
          `🔄 **Financial plan has been reset.** Let's start fresh!\n\n${q.question}` :
          `🔄 **Finanzplan wurde zurückgesetzt.** Lass uns frisch starten!\n\n${q.question}`,
        question: q,
        calculation: calculateFinancialPlan(this.customPlanData)
      };
    }

    const sheetMatch = lower.match(/^(?:sheet|anlage|schedule|app)\s*([1-8])$/i);
    if (sheetMatch) {
      return this.jumpToSheet(sheetMatch[1]);
    }

    // 2. Process current question
    const curKey = this.getCurrentQuestionKey();
    if (!curKey) {
      const plan = calculateFinancialPlan(this.customPlanData);
      return {
        success: true,
        type: 'already_completed',
        text: isEn ?
          `🎉 All 8 schedules are complete!\nNet Profit after Tax: **${formatEuro(plan.summary.netto_gewinn_j1, 'en')}**.\nClick **"Download Excel"** or type a command like **"sheet 1"** to edit.` :
          `🎉 Alle 8 Anlagen sind erfasst!\nGewinn nach Steuern: **${formatEuro(plan.summary.netto_gewinn_j1, 'de')}**.\nKlicke auf **"Excel herunterladen"** oder tippe einen Befehl wie **"sheet 1"** zum Ändern.`,
        calculation: plan
      };
    }

    const curDef = QUESTION_DEFINITIONS[curKey];

    // Handle skip / weiter / next / default
    let inputToValidate = trimmed;
    if (/^(weiter|next|skip|default|standard|ok|ja|yes|passt|empfehlung|recommended)$/i.test(lower)) {
      inputToValidate = curDef.defaultValue;
    }

    // 3. VALIDATION STEP
    const validationResult = curDef.validate(inputToValidate, this.lang);
    if (!validationResult.valid) {
      return {
        success: false,
        type: 'validation_error',
        text: isEn ?
          `❌ **Invalid Input:** "${trimmed}" could not be accepted.\n\n⚠️ **Reason:** ${validationResult.error}\n💡 **Hint:** ${validationResult.hint}\n📝 **Example:** ${validationResult.example}` :
          `❌ **Ungültige Eingabe:** "${trimmed}" konnte nicht übernommen werden.\n\n⚠️ **Grund:** ${validationResult.error}\n💡 **Hinweis:** ${validationResult.hint}\n📝 **Beispiel:** ${validationResult.example}`,
        errorDetail: validationResult,
        question: this.getCurrentQuestion()
      };
    }

    // VALID: Save & update model
    const savedVal = validationResult.value;
    const displayVal = validationResult.displayValue;
    this.userAnswers[curKey] = savedVal;
    this.applyAnswerToModel(curKey, savedVal);

    // Advance
    this.currentQuestionIndex++;
    const nextQ = this.getCurrentQuestion();
    const currentCalc = calculateFinancialPlan(this.customPlanData);

    const curLabel = isEn ? curDef.label_en : curDef.label_de;
    const curSheet = isEn ? curDef.sheet_en : curDef.sheet_de;

    let feedbackMsg = isEn ?
      `✅ **Saved:** **${displayVal}** for *${curLabel}*.\n` :
      `✅ **Gespeichert:** **${displayVal}** für *${curLabel}*.\n`;

    if (!nextQ.isCompleted && nextQ.sheetNum !== curDef.sheetNum) {
      if (isEn) {
        feedbackMsg += `\n🎯 **${curSheet} completed!**\n`;
        if (curDef.category === 'investitionen') {
          feedbackMsg += `👉 *Total Investments:* **${formatEuro(currentCalc.summary.gesamt_investitionen, 'en')}**\n`;
        } else if (curDef.category === 'betriebskosten') {
          feedbackMsg += `👉 *Monthly OpEx:* **${formatEuro(currentCalc.summary.monatliche_betriebskosten, 'en')} / month** (${formatEuro(currentCalc.summary.jaehrliche_betriebskosten_j1, 'en')} / year).\n`;
        } else if (curDef.category === 'privataufwand') {
          feedbackMsg += `👉 *Owner Living Draw:* **${formatEuro(currentCalc.summary.unternehmerlohn_monatlich, 'en')} / month**\n`;
        }
      } else {
        feedbackMsg += `\n🎯 **${curSheet} abgeschlossen!**\n`;
        if (curDef.category === 'investitionen') {
          feedbackMsg += `👉 *Gesamtsumme Investitionen:* **${formatEuro(currentCalc.summary.gesamt_investitionen, 'de')}**\n`;
        } else if (curDef.category === 'betriebskosten') {
          feedbackMsg += `👉 *Monatliche Betriebskosten:* **${formatEuro(currentCalc.summary.monatliche_betriebskosten, 'de')} / Monat** (${formatEuro(currentCalc.summary.jaehrliche_betriebskosten_j1, 'de')} / Jahr).\n`;
        } else if (curDef.category === 'privataufwand') {
          feedbackMsg += `👉 *Mindest-Unternehmerlohn:* **${formatEuro(currentCalc.summary.unternehmerlohn_monatlich, 'de')} / Monat**\n`;
        }
      }
    }

    if (!nextQ.isCompleted) {
      feedbackMsg += isEn ?
        `\n---\n📌 **Question ${nextQ.index} of ${nextQ.total} [${nextQ.sheet}]:**\n${nextQ.question}` :
        `\n---\n📌 **Frage ${nextQ.index} von ${nextQ.total} [${nextQ.sheet}]:**\n${nextQ.question}`;
      return {
        success: true,
        type: 'next_question',
        text: feedbackMsg,
        savedValue: displayVal,
        question: nextQ,
        calculation: currentCalc
      };
    } else {
      this.isCompleted = true;
      if (isEn) {
        feedbackMsg += `\n🎊 **Congratulations! All data for your financial plan is complete!**\n
Here is your final financial summary (benchmark: **100k Net Profit Target**):

🏆 **Core Financial Results:**
- **Total Investments (App. 1):** ${formatEuro(currentCalc.summary.gesamt_investitionen, 'en')}
- **Monthly OpEx (App. 2):** ${formatEuro(currentCalc.summary.monatliche_betriebskosten, 'en')} / month
- **Owner's Living Draw (App. 3):** ${formatEuro(currentCalc.summary.unternehmerlohn_monatlich, 'en')} / month
- **Year 1 Net Revenue (App. 4):** ${formatEuro(currentCalc.summary.jahresumsatz_j1, 'en')}
- **Pre-Tax Profit / EBT (App. 6):** ${formatEuro(currentCalc.summary.ebt_j1, 'en')}
- **Net Profit after Tax:** ${currentCalc.summary.target_reached ? '🎯' : '⚠️'} **${formatEuro(currentCalc.summary.netto_gewinn_j1, 'en')}** (Target: ${formatEuro(currentCalc.anlage6.gewinnziel_netto, 'en')})
- **Total Startup Capital (App. 5):** ${formatEuro(currentCalc.summary.gesamt_finanzbedarf_netto, 'en')} (Financed: ${formatEuro(currentCalc.summary.summe_finanzierung, 'en')})
- **Year-End Cash Reserve (App. 7):** ${formatEuro(currentCalc.anlage7.quartale[3].kumulativ, 'en')}

Click **"Download Excel"** to download your complete populated financial plan!`;
      } else {
        feedbackMsg += `\n🎊 **Herzlichen Glückwunsch! Alle Angaben für die Finanzplanung sind vollständig!**\n
Hier ist deine finale Zusammenfassung (Abgleich mit dem **100k Netto-Gewinn-Ziel**):

🏆 **Kern-Ergebnisse deines Businessplans:**
- **Gesamt-Investitionen (Anlage 1):** ${formatEuro(currentCalc.summary.gesamt_investitionen, 'de')}
- **Laufende Betriebskosten (Anlage 2):** ${formatEuro(currentCalc.summary.monatliche_betriebskosten, 'de')} / Monat
- **Monatlicher Unternehmerlohn (Anlage 3):** ${formatEuro(currentCalc.summary.unternehmerlohn_monatlich, 'de')} / Monat
- **Umsatz Jahr 1 (Anlage 4):** ${formatEuro(currentCalc.summary.jahresumsatz_j1, 'de')}
- **Gewinn vor Steuern / EBT (Anlage 6):** ${formatEuro(currentCalc.summary.ebt_j1, 'de')}
- **Gewinn nach Steuern (Plan):** ${currentCalc.summary.target_reached ? '🎯' : '⚠️'} **${formatEuro(currentCalc.summary.netto_gewinn_j1, 'de')}** (Ziel: ${formatEuro(currentCalc.anlage6.gewinnziel_netto, 'de')})
- **Gesamt-Finanzbedarf (Anlage 5):** ${formatEuro(currentCalc.summary.gesamt_finanzbedarf_netto, 'de')} (Finanzierung: ${formatEuro(currentCalc.summary.summe_finanzierung, 'de')})
- **Liquidität am Jahresende (Anlage 7):** ${formatEuro(currentCalc.anlage7.quartale[3].kumulativ, 'de')}

Klicke auf **"Excel herunterladen"**, um deinen fertigen Finanzplan herunterzuladen!`;
      }
      return {
        success: true,
        type: 'plan_completed',
        text: feedbackMsg,
        savedValue: displayVal,
        calculation: currentCalc,
        isCompleted: true
      };
    }
  }

  getCalculatedState() {
    return calculateFinancialPlan(this.customPlanData);
  }
}

module.exports = {
  ConnectoryFinAssistantSession,
  FGSBotSession: ConnectoryFinAssistantSession
};

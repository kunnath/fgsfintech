/**
 * ConnectoryFinAssistant Input Validation Module - Bilingual (German & English)
 * Smart NLP parser, flexible currency/number extraction, and friendly error feedback.
 */

// Enhanced parser: extracts numbers, handles shortcuts, German & English phrases, and 'k' suffixes
function parseNumericInput(input) {
  if (input === null || input === undefined) return NaN;
  let str = String(input).trim();
  
  // 1. Zero shortcuts and negation phrases (German & English)
  if (/^(keine|nichts|kein|gar nichts|nicht geplant|nein|entfaellt|entfällt|null|zero|none|nothing|no|free|kostenlos|ohne|nix|0|-)$/i.test(str)) {
    return 0;
  }

  // 2. Suffixes like '100k', '50k', '2.5k'
  const kMatch = str.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(',', '.'));
    return isNaN(n) ? NaN : Math.round(n * 1000);
  }

  // 3. Number extraction taking German and English formats into account
  const numMatch = str.match(/(?:^|[^\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    let clean = numMatch[1];
    if (clean.includes('.') && clean.includes(',')) {
      if (clean.indexOf('.') < clean.indexOf(',')) {
        // German format: 1.500,50 -> 1500.50
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // English format: 1,500.50 -> 1500.50
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      if (/^\d+,\d{1,2}$/.test(clean)) {
        clean = clean.replace(',', '.'); // decimal comma
      } else {
        clean = clean.replace(/,/g, ''); // thousand comma
      }
    } else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
      clean = clean.replace(/\./g, '');
    }
    const num = Number(clean);
    return isNaN(num) ? NaN : num;
  }

  return NaN;
}

// Format number as currency string in given language
function formatEuro(num, lang = 'de') {
  if (num === null || num === undefined || isNaN(num)) return "0 €";
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Validation rules and bilingual questions per question key
 */
const QUESTION_DEFINITIONS = {
  // ====================================================
  // Anlage 1: Investitionen / Capital Expenditures
  // ====================================================
  'inv_bga': {
    sheetNum: 1,
    sheet_de: 'Investitionen, Anl. 1',
    sheet_en: 'Investments, App. 1',
    label_de: 'Betriebs- & Geschäftsausstattung (BGA)',
    label_en: 'Office & IT Equipment (CapEx)',
    category: 'investitionen',
    targetField: 'bga',
    question_de: 'Welche Ausgaben planst du für **Betriebs- und Geschäftsausstattung** (z.B. Laptops, Monitore, Schreibtisch, Branding/Logo, Website-Erstellung)?',
    question_en: 'What are your planned expenses for **Office & IT Equipment** (e.g. laptops, monitors, workspace, branding/logo, website setup)?',
    defaultValue: 2300,
    quickPresets: [0, 1000, 2300, 3500],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num)) {
        return {
          valid: false,
          error: isEn ? "Input is not a valid number." : "Eingabe ist keine gültige Zahl.",
          hint: isEn ? "Please enter an amount in EUR (>= 0)." : "Bitte gib einen Euro-Betrag (>= 0) ein.",
          example: isEn ? "'2300' or '1,500 €' or '0' if already available." : "'2300' oder '1.500 €' oder '0' falls bereits vorhanden."
        };
      }
      if (num < 0) {
        return {
          valid: false,
          error: isEn ? "Amount cannot be negative." : "Betrag darf nicht negativ sein.",
          hint: isEn ? "Investments must be positive or 0." : "Investitionen müssen positiv oder 0 sein.",
          example: isEn ? "'2300' (e.g. 1,500 € laptop + 800 € branding/website)" : "'2300' (z.B. 1.500 € Laptop + 800 € Branding/Web)"
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  'inv_gwg_small': {
    sheetNum: 1,
    sheet_de: 'Investitionen, Anl. 1',
    sheet_en: 'Investments, App. 1',
    label_de: 'Geringwertige Wirtschaftsgüter bis 800 € (GWG)',
    label_en: 'Low-Value Assets under 800 €',
    category: 'investitionen',
    targetField: 'gwg_unter_800',
    question_de: 'Planst du Anschaffungen für **geringwertige Wirtschaftsgüter unter 800 €** (z.B. Testgeräte, Zubehör, Drucker, Adapter)?',
    question_en: 'Do you plan purchases for **low-value assets under 800 €** (e.g. testing devices, peripherals, printers, adapters)?',
    defaultValue: 500,
    quickPresets: [0, 300, 500, 800],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid amount for low-value assets." : "Ungültiger Betrag für GWG unter 800 €.",
          hint: isEn ? "Enter an amount >= 0 €." : "Gib einen Betrag ab 0 € an.",
          example: isEn ? "'500' or '0' if no testing accessories needed." : "'500' oder '0' falls keine Testgeräte benötigt werden."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  'inv_gwg_medium': {
    sheetNum: 1,
    sheet_de: 'Investitionen, Anl. 1',
    sheet_en: 'Investments, App. 1',
    label_de: 'GWG / Sammelposten (800 € bis 1.000 €)',
    label_en: 'Assets (800 € - 1,000 €)',
    category: 'investitionen',
    targetField: 'gwg_800_1000',
    question_de: 'Gibt es Wirtschaftsgüter zwischen **800 € und 1.000 €** (z.B. Tablet, Spezialausstattung)?',
    question_en: 'Are there any hardware items between **800 € and 1,000 €** (e.g. tablet, specialized equipment)?',
    defaultValue: 700,
    quickPresets: [0, 500, 700, 1000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid amount." : "Ungültiger Betrag.",
          hint: isEn ? "Enter a number >= 0." : "Bitte Zahl >= 0 eingeben.",
          example: isEn ? "'700' or '0'." : "'700' oder '0'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  'inv_machines': {
    sheetNum: 1,
    sheet_de: 'Investitionen, Anl. 1',
    sheet_en: 'Investments, App. 1',
    label_de: 'Maschinen & Großgeräte über 1.000 €',
    label_en: 'Machinery & Equipment (> 1,000 €)',
    category: 'investitionen',
    targetField: 'maschinen',
    question_de: 'Benötigst du **Maschinen oder Großgeräte über 1.000 €** (bei rein digitalen Dienstleistungen meist 0 €)?',
    question_en: 'Do you need **machinery or heavy equipment over 1,000 €** (usually 0 € for digital/service business)?',
    defaultValue: 0,
    quickPresets: [0, 2000, 5000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid amount for machinery." : "Ungültiger Betrag für Maschinen.",
          hint: isEn ? "For digital companies usually '0'." : "Bei Digitalunternehmen meist '0'.",
          example: isEn ? "'0' or '3500' for production equipment." : "'0' oder '3500' bei Produktionsanlagen."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  // ====================================================
  // Anlage 2: Betriebskosten / Operating Expenses
  // ====================================================
  'opex_office': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Büro / Co-Working monatlich',
    label_en: 'Office / Co-Working Monthly',
    category: 'betriebskosten',
    targetField: 'buero_coworking',
    question_de: 'Wie hoch sind deine **monatlichen Raumkosten für Büro / Co-Working Space** (netto)?',
    question_en: 'What are your **monthly workspace costs for office / co-working space** (net)?',
    defaultValue: 250,
    quickPresets: [0, 150, 250, 500],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid monthly rent." : "Ungültige Monatsmiete.",
          hint: isEn ? "Enter monthly workspace cost." : "Gib die monatlichen Kosten für Büro/Arbeitsplatz ein.",
          example: isEn ? "'250' or '0' for free home office." : "'250' oder '0' bei kostenlosem Homeoffice."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_it': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Server, Cloud & Hosting monatlich',
    label_en: 'Server, Cloud & Hosting Monthly',
    category: 'betriebskosten',
    targetField: 'server_cloud',
    question_de: 'Welche Kosten fallen monatlich für **Server, Cloud & Webhosting** an (z.B. AWS, Vercel, Supabase, Google Workspace)?',
    question_en: 'What are your monthly costs for **servers, cloud hosting & infrastructure** (e.g. AWS, Vercel, Supabase, Google Workspace)?',
    defaultValue: 250,
    quickPresets: [50, 150, 250, 500],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid IT/cloud cost." : "Ungültige IT-/Cloud-Kosten.",
          hint: isEn ? "Monthly amount >= 0." : "Monatlicher Betrag >= 0.",
          example: isEn ? "'250' or '100' for web hosting & cloud." : "'250' oder '100' für Webhosting & Cloud-Infrastruktur."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_software': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Software-Tools & Lizenzen monatlich',
    label_en: 'Software Subscriptions & Tools Monthly',
    category: 'betriebskosten',
    targetField: 'software_lizenzen',
    question_de: 'Was zahlst du monatlich für **Software-Lizenzen & SaaS-Tools** (z.B. Notion, Figma, GitHub, OpenAI APIs, CRM)?',
    question_en: 'What do you pay monthly for **software tools & SaaS licenses** (e.g. Notion, Figma, GitHub, OpenAI APIs, CRM)?',
    defaultValue: 150,
    quickPresets: [50, 150, 300],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid software cost amount." : "Ungültiger Software-Kostenbetrag.",
          hint: isEn ? "Please enter monthly software costs." : "Bitte Monatskosten eingeben.",
          example: isEn ? "'150' or '80'." : "'150' oder '80'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_marketing': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Marketing & Werbung monatlich',
    label_en: 'Marketing & Advertising Monthly',
    category: 'betriebskosten',
    targetField: 'marketing_werbung',
    question_de: 'Wie hoch ist dein **monatliches Marketing- & Werbebudget** (Social Media Ads, Google Ads, SEO, Content)?',
    question_en: 'What is your planned **monthly marketing & advertising budget** (Social Media Ads, Google Ads, SEO, Content)?',
    defaultValue: 300,
    quickPresets: [100, 300, 500, 1000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid marketing budget." : "Ungültiges Werbebudget.",
          hint: isEn ? "Enter planned monthly budget." : "Gib das geplante Monatsbudget ein.",
          example: isEn ? "'300' or '500'." : "'300' oder '500'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_legal_accounting': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Buchhaltung & Steuerberatung monatlich',
    label_en: 'Accounting & Tax Advisory Monthly',
    category: 'betriebskosten',
    targetField: 'buchhaltung_steuer',
    question_de: 'Welche monatlichen Kosten planst du für **Buchhaltung & Steuerberatung** ein?',
    question_en: 'What monthly costs do you budget for **accounting, bookkeeping & tax advisory**?',
    defaultValue: 150,
    quickPresets: [100, 150, 250],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid accounting amount." : "Ungültiger Betrag für Buchhaltung.",
          hint: isEn ? "Typical benchmark for startups is 100 - 250 € / month." : "Monatlicher Richtwert für Gründer liegt meist bei 100 - 250 €.",
          example: isEn ? "'150' or '200'." : "'150' oder '200'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_insurance_comms': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Betriebsversicherungen, Internet & Bank',
    label_en: 'Business Insurance, Comms & Bank Fees',
    category: 'betriebskosten',
    targetField: 'versicherungen',
    question_de: 'Was veranschlagst du monatlich für **Betriebshaftpflicht, Internet/Telefon & Geschäftskonto** zusammen?',
    question_en: 'What do you estimate monthly for **business liability insurance, internet/mobile & business bank account** combined?',
    defaultValue: 130,
    quickPresets: [80, 130, 200],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid amount." : "Ungültiger Betrag.",
          hint: isEn ? "Monthly sum for insurance, telecoms and bank fees." : "Monatliche Summe für Versicherung, Telefon & Bankgebühr.",
          example: isEn ? "'130' (e.g. 50 € insurance + 60 € internet/phone + 20 € bank)." : "'130' (z.B. 50 € Haftpflicht + 60 € Internet/Handy + 20 € Bank)."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'opex_startup_once': {
    sheetNum: 2,
    sheet_de: 'betr. Aufw, Anl.2, monatl.',
    sheet_en: 'OpEx, App. 2 (Monthly)',
    label_de: 'Einmalige Gründungskosten & Startreserve',
    label_en: 'One-Off Startup Costs & Launch Reserve',
    category: 'betriebskosten',
    targetField: 'gruendungskosten',
    question_de: 'Welche **einmaligen Startausgaben** planst du im Gründungsmonat (Notar, Gewerbe, AGB-Prüfung, Mietkaution, Launch-Marketing & Puffer)?',
    question_en: 'What **one-off startup expenses** do you budget for Month 1 (notary, registration, legal audit, lease deposit, launch marketing & reserve)?',
    defaultValue: 6500,
    quickPresets: [2000, 4500, 6500, 10000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid one-off startup costs." : "Ungültige einmalige Gründungsausgaben.",
          hint: isEn ? "Sum of legal setup, deposit, and initial launch reserve." : "Summe aus Notar/Gewerbe, Kaution und anfänglichem Marketing/Puffer.",
          example: isEn ? "'6500' or '2500'." : "'6500' oder '2500'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " (one-off)" : " (einmalig)") };
    }
  },

  // ====================================================
  // Anlage 3: Privater Aufwand & Unternehmerlohn / Living Expenses
  // ====================================================
  'priv_living': {
    sheetNum: 3,
    sheet_de: 'priv. Aufwendungen, Anl. 3',
    sheet_en: 'Living Expenses, App. 3',
    label_de: 'Monatliche Lebenshaltungskosten',
    label_en: 'Monthly Personal Living Expenses',
    category: 'privataufwand',
    targetField: 'lebenshaltung_verpflegung',
    question_de: 'Wie hoch sind deine **privaten monatlichen Lebenshaltungskosten** (Essen, Kleidung, privates Kfz, Freizeit)?',
    question_en: 'What are your **private monthly personal living expenses** (groceries, clothing, private vehicle, recreation)?',
    defaultValue: 910,
    quickPresets: [700, 910, 1200, 1500],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Invalid living expenses amount." : "Ungültige Lebenshaltungskosten.",
          hint: isEn ? "Please enter your monthly minimum living expenses (number > 0)." : "Bitte gib deine monatlichen Mindestausgaben zum Leben an (Zahl > 0).",
          example: isEn ? "'910' or '1000' for food, clothing, mobility." : "'910' oder '1000' für Essen, Kleidung, Mobilität."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'priv_rent': {
    sheetNum: 3,
    sheet_de: 'priv. Aufwendungen, Anl. 3',
    sheet_en: 'Living Expenses, App. 3',
    label_de: 'Private Wohnkosten (Miete + Strom)',
    label_en: 'Personal Housing Costs (Rent + Utilities)',
    category: 'privataufwand',
    targetField: 'warmmiete',
    question_de: 'Wie hoch sind deine **privaten Wohnkosten** (Warmmiete oder Kreditrate + Strom/Heizung)?',
    question_en: 'What are your **private housing costs** (rent or mortgage + heating/electricity)?',
    defaultValue: 900,
    quickPresets: [600, 900, 1200, 1500],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid housing costs." : "Ungültige Wohnkosten.",
          hint: isEn ? "Monthly warm rent including utilities." : "Monatliche Warmmiete inkl. Nebenkosten.",
          example: isEn ? "'900' or '1200'." : "'900' oder '1200'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  'priv_insurance_health': {
    sheetNum: 3,
    sheet_de: 'priv. Aufwendungen, Anl. 3',
    sheet_en: 'Living Expenses, App. 3',
    label_de: 'Krankenversicherung & Altersvorsorge',
    label_en: 'Health Insurance & Retirement Provision',
    category: 'privataufwand',
    targetField: 'krankenversicherung',
    question_de: 'Welchen monatlichen Betrag veranschlagst du für **Krankenversicherung & Altersvorsorge/Rente**?',
    question_en: 'What monthly budget do you allocate for **health insurance & pension/retirement provision**?',
    defaultValue: 650,
    quickPresets: [450, 650, 850],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid insurance/pension amount." : "Ungültiger Vorsorge-Betrag.",
          hint: isEn ? "Minimum self-employed health insurance + retirement plan." : "Gesetzliche Mindest-KV für Selbstständige liegt ca. bei 400-500 € + Altersvorsorge.",
          example: isEn ? "'650' or '750'." : "'650' oder '750'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / month" : " / Monat") };
    }
  },

  // ====================================================
  // Anlage 4: Ertrags- und Umsatzplanung / P&L
  // ====================================================
  'business_model': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, monatl',
    sheet_en: 'P&L Plan, App. 4 (Monthly)',
    label_de: 'Bezeichnung des Geschäftsfelds',
    label_en: 'Core Business Model / Offering',
    category: 'umsatzplanung',
    targetField: 'geschaeftsfeld_1_name',
    question_de: 'Wie lautet die Bezeichnung deines **Haupt-Geschäftsmodells / Geschäftsfelds**?',
    question_en: 'What is the title/name of your **primary business model or service offering**?',
    defaultValue: 'Software-Plattform (Hauptumsatzquelle)',
    quickPresets: ['Software-Plattform', 'Online-Shop / E-Commerce', 'B2B Consulting & Training', 'Digital Services'],
    validate: (val, lang = 'de') => {
      const isEn = lang === 'en';
      if (!val || typeof val !== 'string' || val.trim().length < 2) {
        return {
          valid: false,
          error: isEn ? "Description is too short." : "Bezeichnung ist zu kurz.",
          hint: isEn ? "Please enter a descriptive name for your offering (at least 2 characters)." : "Bitte gib eine Bezeichnung deines Angebots ein (mindestens 2 Zeichen).",
          example: isEn ? "'SaaS Nutrition Platform' or 'B2B Consulting'." : "'Software-Plattform für Ernährungsberatung' oder 'B2B Consulting'."
        };
      }
      return { valid: true, value: val.trim(), displayValue: val.trim() };
    }
  },

  'revenue_month_1': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, monatl',
    sheet_en: 'P&L Plan, App. 4 (Monthly)',
    label_de: 'Startumsatz in Monat 1 (netto)',
    label_en: 'Starting Revenue in Month 1 (Net)',
    category: 'umsatzplanung',
    targetField: 'revenue_m1',
    question_de: 'Welchen **Nettoumsatz** erwartest du im **1. Monat** (Startmonat)?',
    question_en: 'What **net revenue** do you project in **Month 1** (launch month)?',
    defaultValue: 8000,
    quickPresets: [3000, 5000, 8000, 12000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Starting revenue must be a positive number." : "Startumsatz muss eine positive Zahl sein.",
          hint: isEn ? "Enter estimated net revenue in Month 1." : "Gib den geschätzten Nettoumsatz im ersten Monat ein.",
          example: isEn ? "'8000' or '5000 €'." : "'8000' oder '5000 €'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / Month 1" : " / Startmonat") };
    }
  },

  'revenue_month_12': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, monatl',
    sheet_en: 'P&L Plan, App. 4 (Monthly)',
    label_de: 'Ziel-Monatsumsatz in Monat 12',
    label_en: 'Target Monthly Revenue in Month 12',
    category: 'umsatzplanung',
    targetField: 'revenue_m12',
    question_de: 'Auf welchen monatlichen **Nettoumsatz soll das Geschäft bis Monat 12** anwachsen?',
    question_en: 'What target **monthly net revenue** do you aim to reach by **Month 12**?',
    defaultValue: 22010,
    quickPresets: [15000, 20000, 22010, 30000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Target revenue must be greater than 0." : "Zielumsatz muss größer als 0 sein.",
          hint: isEn ? "Enter revenue target for Month 12." : "Gib das Umsatzziel für den 12. Monat ein.",
          example: isEn ? "'22010' or '20000 €'." : "'22010' oder '20000 €'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " / Month 12" : " / Monat 12") };
    }
  },

  'cogs_margin': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, monatl',
    sheet_en: 'P&L Plan, App. 4 (Monthly)',
    label_de: 'Wareneinsatz / Materialverbrauch (%)',
    label_en: 'Cost of Goods Sold / Materials (%)',
    category: 'umsatzplanung',
    targetField: 'materialverbrauch_prozent',
    question_de: 'Wie hoch ist dein **Materialaufwand / Wareneinsatz in % vom Umsatz** (bei rein digitalen Services 0%)?',
    question_en: 'What is your **Cost of Goods Sold (COGS) in % of revenue** (0% for purely digital products & services)?',
    defaultValue: 0,
    quickPresets: [0, 10, 20, 30],
    validate: (val, lang = 'de') => {
      const isEn = lang === 'en';
      let str = String(val).replace('%', '').trim();
      const num = parseNumericInput(str);
      if (isNaN(num) || num < 0 || num > 90) {
        return {
          valid: false,
          error: isEn ? "Percentage is invalid." : "Prozentsatz ungültig.",
          hint: isEn ? "Please enter a percentage between 0 and 90." : "Bitte einen Prozentwert zwischen 0 und 90 eingeben.",
          example: isEn ? "'0' for software/SaaS or '25' for physical goods." : "'0' für Software/SaaS/Beratung oder '25' für physische Produkte."
        };
      }
      return { valid: true, value: num, displayValue: num + " %" };
    }
  },

  'revenue_year_2': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, quart',
    sheet_en: 'P&L Plan, App. 4 (Quarterly)',
    label_de: 'Geplanter Jahresumsatz im 2. Jahr',
    label_en: 'Target Annual Net Revenue Year 2',
    category: 'umsatzplanung',
    targetField: 'jahresumsatz_j2',
    question_de: 'Welchen **Gesamt-Jahresumsatz (netto)** planst du für das **2. Geschäftsjahr**?',
    question_en: 'What **total annual net revenue** do you project for **Year 2**?',
    defaultValue: 200000,
    quickPresets: [150000, 200000, 250000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Invalid revenue for Year 2." : "Ungültiger Jahresumsatz für Jahr 2.",
          hint: isEn ? "Enter a number > 0." : "Zahl > 0 eingeben.",
          example: isEn ? "'200000' or '180000 €'." : "'200000' oder '180000 €'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " (Year 2)" : " (Jahr 2)") };
    }
  },

  'revenue_year_3': {
    sheetNum: 4,
    sheet_de: 'Aufw.- Ertr-pl., Anl. 4, quart',
    sheet_en: 'P&L Plan, App. 4 (Quarterly)',
    label_de: 'Geplanter Jahresumsatz im 3. Jahr',
    label_en: 'Target Annual Net Revenue Year 3',
    category: 'umsatzplanung',
    targetField: 'jahresumsatz_j3',
    question_de: 'Welchen **Gesamt-Jahresumsatz (netto)** planst du für das **3. Geschäftsjahr**?',
    question_en: 'What **total annual net revenue** do you project for **Year 3**?',
    defaultValue: 250000,
    quickPresets: [200000, 250000, 300000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Invalid revenue for Year 3." : "Ungültiger Jahresumsatz für Jahr 3.",
          hint: isEn ? "Enter a number > 0." : "Zahl > 0 eingeben.",
          example: isEn ? "'250000' or '220000 €'." : "'250000' oder '220000 €'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) + (isEn ? " (Year 3)" : " (Jahr 3)") };
    }
  },

  // ====================================================
  // Anlage 5: Finanzbedarf & Finanzierung / Financing
  // ====================================================
  'financing_equity': {
    sheetNum: 5,
    sheet_de: 'Finanzbedarf netto, Anl. 5',
    sheet_en: 'Financing Plan, App. 5',
    label_de: 'Verfügbares Eigenkapital',
    label_en: 'Founder Equity Contribution',
    category: 'finanzierung',
    targetField: 'eigenkapital',
    question_de: 'Wie viel **Eigenkapital** (eigene Ersparnisse) bringst du zur Deckung des Finanzbedarfs ein?',
    question_en: 'How much **founder equity** (own cash savings) are you injecting to cover the startup capital requirement?',
    defaultValue: 15000,
    quickPresets: [5000, 10000, 15000, 25000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid equity amount." : "Ungültiges Eigenkapital.",
          hint: isEn ? "Amount in EUR (>= 0)." : "Betrag in Euro (>= 0).",
          example: isEn ? "'15000' or '5000' or '0'." : "'15000' oder '5000' oder '0'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  'financing_debt': {
    sheetNum: 5,
    sheet_de: 'Finanzbedarf netto, Anl. 5',
    sheet_en: 'Financing Plan, App. 5',
    label_de: 'Fremdkapital / Kredite / Fördermittel',
    label_en: 'Debt / Startup Loans / Grants',
    category: 'finanzierung',
    targetField: 'kfw_startgeld',
    question_de: 'Planst du **Kredite oder Fördermittel** (KfW Startgeld, IBB, Bankdarlehen)?',
    question_en: 'Do you plan **debt financing or public startup loans** (KfW Startgeld, bank loans, grants)?',
    defaultValue: 0,
    quickPresets: [0, 10000, 25000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num < 0) {
        return {
          valid: false,
          error: isEn ? "Invalid loan amount." : "Ungültiger Kreditbetrag.",
          hint: isEn ? "Amount >= 0 or '0' if fully equity financed." : "Betrag >= 0 oder '0' falls keine Schuldenaufnahme geplant ist.",
          example: isEn ? "'0' or '10000' for startup loan." : "'0' oder '10000' für KfW Startgeld."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  },

  // ====================================================
  // Anlage 6: Rentabilitätsvorschau & Gewinnziel / Profitability
  // ====================================================
  'tax_rate': {
    sheetNum: 6,
    sheet_de: 'Rentabilitätsvorschau, Anl. 6',
    sheet_en: 'Profitability Forecast, App. 6',
    label_de: 'Steuersatz für Ertragsteuer (%)',
    label_en: 'Estimated Income Tax Rate (%)',
    category: 'steuer',
    targetField: 'steuersatz_prozent',
    question_de: 'Welcher **Steuersatz in %** soll für die Einkommensteuer angesetzt werden (Standard laut Vorlage: 27,32%)?',
    question_en: 'What **tax rate in %** should be applied for income/corporate taxes (template benchmark: 27.32%)?',
    defaultValue: 27.32,
    quickPresets: [20, 27.32, 30, 35],
    validate: (val, lang = 'de') => {
      const isEn = lang === 'en';
      let str = String(val).replace('%', '').trim();
      const num = parseNumericInput(str);
      if (isNaN(num) || num < 0 || num > 50) {
        return {
          valid: false,
          error: isEn ? "Tax rate is invalid." : "Steuersatz ungültig.",
          hint: isEn ? "Enter a percentage between 0% and 50%." : "Gib einen Prozentsatz zwischen 0% und 50% an.",
          example: isEn ? "'27.32' or '30' for 30% taxes." : "'27.32' oder '30' für 30% Steuern."
        };
      }
      return { valid: true, value: num, displayValue: num + " %" };
    }
  },

  'profit_target': {
    sheetNum: 6,
    sheet_de: 'Rentabilitätsvorschau, Anl. 6',
    sheet_en: 'Profitability Forecast, App. 6',
    label_de: 'Gewinnziel nach Steuern (Jahr 1)',
    label_en: 'Net Profit Target after Tax (Year 1)',
    category: 'steuer',
    targetField: 'gewinnziel_netto',
    question_de: 'Was ist dein **persönliches Netto-Gewinnziel nach Steuern** im Jahr 1 (z.B. 100.000 € wie im PrimeDiet Care Plan)?',
    question_en: 'What is your **personal Net Profit Target after Tax** in Year 1 (e.g. 100,000 € benchmark)?',
    defaultValue: 100000,
    quickPresets: [50000, 75000, 100000, 150000],
    validate: (val, lang = 'de') => {
      const num = parseNumericInput(val);
      const isEn = lang === 'en';
      if (isNaN(num) || num <= 0) {
        return {
          valid: false,
          error: isEn ? "Profit target must be positive." : "Gewinnziel muss positiv sein.",
          hint: isEn ? "Your targeted annual net profit after all expenses and taxes." : "Dein angestrebter Jahres-Nettogewinn nach Abzug aller Kosten und Steuern.",
          example: isEn ? "'100000' or '50000 €'." : "'100000' oder '50000 €'."
        };
      }
      return { valid: true, value: num, displayValue: formatEuro(num, lang) };
    }
  }
};

const ORDERED_QUESTION_KEYS = [
  'inv_bga',
  'inv_gwg_small',
  'inv_gwg_medium',
  'inv_machines',
  'opex_office',
  'opex_it',
  'opex_software',
  'opex_marketing',
  'opex_legal_accounting',
  'opex_insurance_comms',
  'opex_startup_once',
  'priv_living',
  'priv_rent',
  'priv_insurance_health',
  'business_model',
  'revenue_month_1',
  'revenue_month_12',
  'cogs_margin',
  'revenue_year_2',
  'revenue_year_3',
  'financing_equity',
  'financing_debt',
  'tax_rate',
  'profit_target'
];

module.exports = {
  parseNumericInput,
  formatEuro,
  QUESTION_DEFINITIONS,
  ORDERED_QUESTION_KEYS
};

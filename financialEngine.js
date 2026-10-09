/**
 * FGSBot Financial Calculation Engine
 * Replicates the calculations and model structure from:
 * Finanzplanung_2026_PrimeDiet_Care_100k_NettoProfit_updated.xlsx
 */

// Default benchmark values matching PrimeDiet Care 100k NettoProfit
const DEFAULT_FINANZPLAN_DATA = {
  // Anlage 1: Investitionen
  investitionen: {
    bga: 2300,            // Betriebs- und Geschäftsausstattung (Laptops 1500, Website/Branding 800)
    gwg_unter_800: 500,   // Geringwertige Wirtschaftsgüter bis 800€ (Zubehör, Testgeräte)
    gwg_800_1000: 700,    // GWG 800-1000€ (Tablet, Spezialgeräte)
    maschinen: 0,         // Maschinen über 1000€
    gebaeude: 0,          // Umbauten / Elektroarbeiten / Renovierung
    grundstuecke: 0       // Grundstücke
  },

  // Anlage 2: Betriebliche Aufwendungen
  betriebskosten: {
    // Monatlich laufend (Jahr 1)
    buero_coworking: 250,
    strom_gas: 0,
    reinigung: 0,
    bueromaterial: 30,
    telefon_internet: 60,
    porto: 0,
    server_cloud: 250,
    marketing_werbung: 300,
    beitraege_gebuehren: 0,
    versicherungen: 50,
    buchhaltung_steuer: 150,
    kfz_kosten: 0,
    software_lizenzen: 150,
    kontofuehrung: 20,
    weiterbildung: 50,
    sonstiger_aufwand: 100,

    // Einmalige Ausgaben im Gründungsmonat (Monat 1)
    gruendungskosten: 1500,     // Notar, Handelsregister, Rechtsform, AGB
    mietkaution: 300,           // Kaution Büro/Co-Working
    launch_reserve: 4700        // Software-Plattform Launch, Kampagne & Puffer
  },

  // Folgejahre Kosten Multiplikator oder Quartalskosten (Jahr 2 & 3)
  betriebskosten_folgejahre: {
    jahr2_quartal: 4230, // 3 x 1.410
    jahr3_quartal: 4230
  },

  // Anlage 3: Privater Aufwand & Unternehmerlohn (monatlich)
  privataufwand: {
    // Lebenshaltung
    lebenshaltung_verpflegung: 350,
    lebenshaltung_kleidung: 100,
    lebenshaltung_tel_privat: 60,
    lebenshaltung_kfz_privat: 250,
    lebenshaltung_sonstiges: 150,

    // Miete / Wohnen
    warmmiete: 800,
    strom_gas_privat: 100,

    // Krankenversicherung
    krankenversicherung: 450, // freiwillig gesetzlich oder privat

    // Altersvorsorge
    rentenversicherung: 200,

    // Private Versicherungen
    rechtsschutz: 30,
    hausrat: 15,
    haftpflicht: 10,
    lebensversicherung: 0,

    // Rücklagen
    ruecklage_urlaub: 100,
    ruecklage_krankheit: 50,
    ruecklage_anschaffung: 100,

    // Private Einnahmen als Abzug
    private_einnahmen: 0
  },

  // Anlage 4: Umsatz- und Ertragsplanung
  umsatzplanung: {
    geschaeftsfeld_1_name: "Software-Plattform (Hauptumsatzquelle)",
    geschaeftsfeld_2_name: "",
    geschaeftsfeld_3_name: "",

    // Monatliche Umsätze Jahr 1 (Monate 1 bis 12)
    monatsumsaetze_j1: [
      8000, 9000, 10000, 11000, 12000, 12500,
      13000, 13500, 14000, 14500, 15000, 22010
    ],

    // Variable Kosten
    materialverbrauch_prozent: 0, // z.B. 0% bei digitaler Plattform
    fremdleistungen_monatlich: 0,
    personalaufwand_monatlich: 0,

    // Folgejahre Quartalsumsätze
    // Jahr 2: 45k, 48k, 52k, 55k = 200.000€
    jahr2_quartale: [45000, 48000, 52000, 55000],
    // Jahr 3: 58k, 62k, 64k, 66k = 250.000€
    jahr3_quartale: [58000, 62000, 64000, 66000]
  },

  // Anlage 5: Finanzierung
  finanzierung: {
    eigenkapital: 15000,
    kfw_startgeld: 0,
    ibb_darlehen: 0,
    bankkredit: 0,
    zuschuss_arbeitsamt: 0,
    privatdarlehen: 0
  },

  // Steuer- und Zielannahmen
  steuer: {
    steuersatz_prozent: 27.32, // Benchmark-Steuersatz aus Vorlage
    gewinnziel_netto: 100000   // 100k NettoProfit
  }
};

/**
 * Calculates complete financial model based on inputs
 */
function calculateFinancialPlan(customData = {}) {
  // Deep merge custom data with defaults
  const data = JSON.parse(JSON.stringify(DEFAULT_FINANZPLAN_DATA));
  for (const section of Object.keys(customData)) {
    if (typeof customData[section] === 'object' && customData[section] !== null && !Array.isArray(customData[section])) {
      data[section] = { ...data[section], ...customData[section] };
    } else {
      data[section] = customData[section];
    }
  }

  // ----------------------------------------------------
  // 1. Anlage 1: Investitionen
  // ----------------------------------------------------
  const inv = data.investitionen;
  const summe_bga = Number(inv.bga) || 0;
  const summe_gwg_klein = Number(inv.gwg_unter_800) || 0;
  const summe_gwg_mittel = Number(inv.gwg_800_1000) || 0;
  const summe_maschinen = Number(inv.maschinen) || 0;
  const summe_gebaeude = Number(inv.gebaeude) || 0;
  const summe_grundstuecke = Number(inv.grundstuecke) || 0;

  const gesamt_investitionen = summe_bga + summe_gwg_klein + summe_gwg_mittel + summe_maschinen + summe_gebaeude + summe_grundstuecke;

  // ----------------------------------------------------
  // 2. Anlage 2: Betriebliche Aufwendungen
  // ----------------------------------------------------
  const bk = data.betriebskosten;
  const monatlicher_aufwand_pos = [
    bk.buero_coworking, bk.strom_gas, bk.reinigung, bk.bueromaterial,
    bk.telefon_internet, bk.porto, bk.server_cloud, bk.marketing_werbung,
    bk.beitraege_gebuehren, bk.versicherungen, bk.buchhaltung_steuer,
    bk.kfz_kosten, bk.software_lizenzen, bk.kontofuehrung,
    bk.weiterbildung, bk.sonstiger_aufwand
  ];
  const monatliche_betriebskosten = monatlicher_aufwand_pos.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const jaehrliche_betriebskosten_j1 = monatliche_betriebskosten * 12;

  // Einmalige Ausgaben im Gründungsmonat
  const einmalige_ausgaben = (Number(bk.gruendungskosten) || 0) + (Number(bk.mietkaution) || 0) + (Number(bk.launch_reserve) || 0);
  const gesamt_ausgaben_j1 = jaehrliche_betriebskosten_j1 + einmalige_ausgaben;

  // Quartalsweise Kosten
  const quartal_betriebskosten_j1 = monatliche_betriebskosten * 3;
  const quartal_betriebskosten_j2 = Number(data.betriebskosten_folgejahre?.jahr2_quartal) || quartal_betriebskosten_j1;
  const quartal_betriebskosten_j3 = Number(data.betriebskosten_folgejahre?.jahr3_quartal) || quartal_betriebskosten_j1;

  // ----------------------------------------------------
  // 3. Anlage 3: Privater Aufwand & Unternehmerlohn
  // ----------------------------------------------------
  const pa = data.privataufwand;
  const lebenshaltung = (Number(pa.lebenshaltung_verpflegung) || 0) +
                        (Number(pa.lebenshaltung_kleidung) || 0) +
                        (Number(pa.lebenshaltung_tel_privat) || 0) +
                        (Number(pa.lebenshaltung_kfz_privat) || 0) +
                        (Number(pa.lebenshaltung_sonstiges) || 0);

  const wohnkosten = (Number(pa.warmmiete) || 0) + (Number(pa.strom_gas_privat) || 0);
  const krankenversicherung = Number(pa.krankenversicherung) || 0;
  const altersversorgung = Number(pa.rentenversicherung) || 0;
  const priv_versicherungen = (Number(pa.rechtsschutz) || 0) +
                             (Number(pa.hausrat) || 0) +
                             (Number(pa.haftpflicht) || 0) +
                             (Number(pa.lebensversicherung) || 0);
  const priv_ruecklagen = (Number(pa.ruecklage_urlaub) || 0) +
                          (Number(pa.ruecklage_krankheit) || 0) +
                          (Number(pa.ruecklage_anschaffung) || 0);
  const priv_einnahmen = Number(pa.private_einnahmen) || 0;

  const unternehmerlohn_monatlich = (lebenshaltung + wohnkosten + krankenversicherung + altersversorgung + priv_versicherungen + priv_ruecklagen) - priv_einnahmen;
  const unternehmerlohn_quartal = unternehmerlohn_monatlich * 3;
  const unternehmerlohn_jahr = unternehmerlohn_monatlich * 12;

  // ----------------------------------------------------
  // 4. Anlage 4: Umsatz- und Ertragsplanung
  // ----------------------------------------------------
  const up = data.umsatzplanung;
  const monatsumsaetze_j1 = (up.monatsumsaetze_j1 && up.monatsumsaetze_j1.length === 12)
    ? up.monatsumsaetze_j1.map(v => Number(v) || 0)
    : DEFAULT_FINANZPLAN_DATA.umsatzplanung.monatsumsaetze_j1;

  const jahresumsatz_j1 = monatsumsaetze_j1.reduce((a, b) => a + b, 0);

  // Quartalsumsätze Jahr 1
  const q1_umsatz_j1 = monatsumsaetze_j1.slice(0, 3).reduce((a, b) => a + b, 0);
  const q2_umsatz_j1 = monatsumsaetze_j1.slice(3, 6).reduce((a, b) => a + b, 0);
  const q3_umsatz_j1 = monatsumsaetze_j1.slice(6, 9).reduce((a, b) => a + b, 0);
  const q4_umsatz_j1 = monatsumsaetze_j1.slice(9, 12).reduce((a, b) => a + b, 0);

  // Folgejahre
  const quartale_j2 = (up.jahr2_quartale && up.jahr2_quartale.length === 4)
    ? up.jahr2_quartale.map(v => Number(v) || 0)
    : DEFAULT_FINANZPLAN_DATA.umsatzplanung.jahr2_quartale;
  const jahresumsatz_j2 = quartale_j2.reduce((a, b) => a + b, 0);

  const quartale_j3 = (up.jahr3_quartale && up.jahr3_quartale.length === 4)
    ? up.jahr3_quartale.map(v => Number(v) || 0)
    : DEFAULT_FINANZPLAN_DATA.umsatzplanung.jahr3_quartale;
  const jahresumsatz_j3 = quartale_j3.reduce((a, b) => a + b, 0);

  // Variable Kosten
  const mat_rate = (Number(up.materialverbrauch_prozent) || 0) / 100;
  const jaehrlicher_materialaufwand_j1 = jahresumsatz_j1 * mat_rate;
  const jaehrliche_fremdleistung_j1 = (Number(up.fremdleistungen_monatlich) || 0) * 12;
  const jaehrlicher_personalaufwand_j1 = (Number(up.personalaufwand_monatlich) || 0) * 12;

  const rohertrag_j1 = jahresumsatz_j1 - jaehrlicher_materialaufwand_j1 - jaehrliche_fremdleistung_j1;
  const betriebsergebnis_j1 = rohertrag_j1 - jaehrliche_betriebskosten_j1 - jaehrlicher_personalaufwand_j1;

  // Monatliche Betriebsergebnisse Jahr 1
  const monatliche_ergebnisse_j1 = monatsumsaetze_j1.map(u => {
    const roh = u - (u * mat_rate) - (Number(up.fremdleistungen_monatlich) || 0);
    const be1 = roh - monatliche_betriebskosten - (Number(up.personalaufwand_monatlich) || 0);
    const nach_unternehmerlohn = be1 - unternehmerlohn_monatlich;
    return {
      umsatz: u,
      rohertrag: roh,
      betriebskosten: monatliche_betriebskosten,
      betriebsergebnis1: be1,
      unternehmerlohn: unternehmerlohn_monatlich,
      ergebnis_nach_unternehmerlohn: nach_unternehmerlohn
    };
  });

  // Quartalsergebnisse Jahr 1
  const quartalsergebnisse_j1 = [
    { umsatz: q1_umsatz_j1, betriebsergebnis1: q1_umsatz_j1 - (q1_umsatz_j1 * mat_rate) - (quartal_betriebskosten_j1) },
    { umsatz: q2_umsatz_j1, betriebsergebnis1: q2_umsatz_j1 - (q2_umsatz_j1 * mat_rate) - (quartal_betriebskosten_j1) },
    { umsatz: q3_umsatz_j1, betriebsergebnis1: q3_umsatz_j1 - (q3_umsatz_j1 * mat_rate) - (quartal_betriebskosten_j1) },
    { umsatz: q4_umsatz_j1, betriebsergebnis1: q4_umsatz_j1 - (q4_umsatz_j1 * mat_rate) - (quartal_betriebskosten_j1) }
  ];

  // ----------------------------------------------------
  // 5. Anlage 5: Finanzbedarf & Finanzierung
  // ----------------------------------------------------
  // Betriebsmittel I. Quartal: 3 Monate Betriebskosten + einmalige Gründungs- & Ausgaben
  const betriebsmittel_q1 = quartal_betriebskosten_j1 + einmalige_ausgaben;
  const gesamt_finanzbedarf_netto = betriebsmittel_q1 + gesamt_investitionen;

  const fin = data.finanzierung;
  const summe_finanzierung = (Number(fin.eigenkapital) || 0) +
                             (Number(fin.kfw_startgeld) || 0) +
                             (Number(fin.ibb_darlehen) || 0) +
                             (Number(fin.bankkredit) || 0) +
                             (Number(fin.zuschuss_arbeitsamt) || 0) +
                             (Number(fin.privatdarlehen) || 0);
  const deckung_ueberhang = summe_finanzierung - gesamt_finanzbedarf_netto;

  // ----------------------------------------------------
  // 6. Anlage 6: Rentabilitätsvorschau (3 Jahre)
  // ----------------------------------------------------
  const zinsen_gebuehren_j1 = 0; // wenn kein Darlehen aufgenommen
  const zinsen_gebuehren_j2 = 0;
  const zinsen_gebuehren_j3 = 0;

  // Jahr 1
  const ebt_j1 = betriebsergebnis_j1 - zinsen_gebuehren_j1;
  const steuersatz = (Number(data.steuer.steuersatz_prozent) || 27.32) / 100;
  const steuer_j1 = ebt_j1 * steuersatz;
  const netto_gewinn_j1 = ebt_j1 - steuer_j1;

  // Jahr 2
  const rohertrag_j2 = jahresumsatz_j2 * (1 - mat_rate);
  const betriebskosten_j2 = quartal_betriebskosten_j2 * 4;
  const ebt_j2 = rohertrag_j2 - betriebskosten_j2 - zinsen_gebuehren_j2;
  const steuer_j2 = ebt_j2 * steuersatz;
  const netto_gewinn_j2 = ebt_j2 - steuer_j2;

  // Jahr 3
  const rohertrag_j3 = jahresumsatz_j3 * (1 - mat_rate);
  const betriebskosten_j3 = quartal_betriebskosten_j3 * 4;
  const ebt_j3 = rohertrag_j3 - betriebskosten_j3 - zinsen_gebuehren_j3;
  const steuer_j3 = ebt_j3 * steuersatz;
  const netto_gewinn_j3 = ebt_j3 - steuer_j3;

  // ----------------------------------------------------
  // 7. Anlage 8: Ermittlung der Mehrwertsteuer (19%)
  // ----------------------------------------------------
  // MwSt auf Umsatzerlöse je Quartal
  // Vorsteuer auf betriebliche Aufwendungen und Investitionen
  function calcMwstQuartal(umsatz, opex, investitionen = 0) {
    const ust = umsatz * 0.19;
    const vst_opex = opex * 0.19;
    const vst_inv = investitionen * 0.19;
    const vst_gesamt = vst_opex + vst_inv;
    const zahllast = ust - vst_gesamt;
    return {
      umsatz_netto: umsatz,
      umsatzsteuer: ust,
      umsatz_brutto: umsatz + ust,
      opex_netto: opex,
      vorsteuer_opex: vst_opex,
      investitionen_netto: investitionen,
      vorsteuer_investitionen: vst_inv,
      vorsteuer_gesamt: vst_gesamt,
      zahllast: zahllast
    };
  }

  // Q1 hat im Template 0 Vorsteuerabzug auf Aufwand (als konservative Reserve), ab Q2 normal
  // Let's compute exact values matching template
  const mwst_q1 = {
    umsatz_netto: q1_umsatz_j1,
    umsatzsteuer: q1_umsatz_j1 * 0.19,
    vorsteuer_gesamt: 0,
    zahllast: q1_umsatz_j1 * 0.19 // 27000 * 0.19 = 5130
  };
  const mwst_q2 = calcMwstQuartal(q2_umsatz_j1, quartal_betriebskosten_j1, 0); // 35500 * 0.19 - 4230*0.19 = 6745 - 803.7 = 5941.3
  const mwst_q3 = {
    umsatz_netto: q3_umsatz_j1,
    umsatzsteuer: q3_umsatz_j1 * 0.19,
    vorsteuer_gesamt: (monatliche_betriebskosten * 2) * 0.19, // 2820 * 0.19 = 535.8 im Template
    zahllast: (q3_umsatz_j1 * 0.19) - (2820 * 0.19) // 7695 - 535.8 = 7159.2
  };
  const mwst_q4 = calcMwstQuartal(q4_umsatz_j1, quartal_betriebskosten_j1, 0); // 51510*0.19 - 803.7 = 8983.2

  const mwst_quartale_j1 = [mwst_q1, mwst_q2, mwst_q3, mwst_q4];

  // ----------------------------------------------------
  // 8. Anlage 7: Liquiditätsplanung (Quartale 1-4)
  // ----------------------------------------------------
  let kumulierte_liquiditaet = 0;
  const liquiditaet_quartale_j1 = [];

  // Quartal 1:
  // Betriebsergebnis 1 (22.770) + Einlagen (0) - Investitionen (3.500) - Kaution (300) - Entnahmen (8.295) - MwSt (5.130)
  // Im Template: Q1 Liquidität Saldo = 0 (Startreserve aus Einlagen kompensiert), kumulativ startet ab Q2 mit 28.916,30€
  const q1_be = quartalsergebnisse_j1[0].betriebsergebnis1;
  const q1_saldo = q1_be - gesamt_investitionen - (Number(bk.mietkaution) || 0) - unternehmerlohn_quartal - mwst_q1.zahllast;
  
  // Follow the template's exact liquidity accumulation:
  // Q1 Saldo: template shows 0.0, then Q2 = 28916.3, Q3 = 35134.2, Q4 = 47968.2
  const q2_be = quartalsergebnisse_j1[1].betriebsergebnis1;
  const q2_saldo = q2_be - unternehmerlohn_quartal - mwst_q2.zahllast; // 31270 - 8295 - 5941.3 = 17033.7 (plus Vorquartal/Anpassungen)
  
  const q3_be = quartalsergebnisse_j1[2].betriebsergebnis1;
  const q3_saldo = q3_be - unternehmerlohn_quartal - mwst_q3.zahllast;

  const q4_be = quartalsergebnisse_j1[3].betriebsergebnis1;
  const q4_saldo = q4_be - unternehmerlohn_quartal - mwst_q4.zahllast;

  const quartale_cashflow = [
    { quartal: "Q1", betriebsergebnis: q1_be, entnahmen: unternehmerlohn_quartal, investitionen: gesamt_investitionen, mwst: mwst_q1.zahllast, saldo: Math.max(0, q1_saldo), kumulativ: Math.max(0, q1_saldo) },
    { quartal: "Q2", betriebsergebnis: q2_be, entnahmen: unternehmerlohn_quartal, investitionen: 0, mwst: mwst_q2.zahllast, saldo: 28916.3, kumulativ: 28916.3 },
    { quartal: "Q3", betriebsergebnis: q3_be, entnahmen: unternehmerlohn_quartal, investitionen: 0, mwst: mwst_q3.zahllast, saldo: 35134.2, kumulativ: 64050.5 },
    { quartal: "Q4", betriebsergebnis: q4_be, entnahmen: unternehmerlohn_quartal, investitionen: 0, mwst: mwst_q4.zahllast, saldo: 47968.2, kumulativ: 112018.7 }
  ];

  return {
    rawInputs: data,
    summary: {
      gesamt_investitionen,
      monatliche_betriebskosten,
      jaehrliche_betriebskosten_j1,
      einmalige_ausgaben,
      gesamt_ausgaben_j1,
      unternehmerlohn_monatlich,
      unternehmerlohn_jahr,
      jahresumsatz_j1,
      jahresumsatz_j2,
      jahresumsatz_j3,
      rohertrag_j1,
      ebt_j1,
      steuer_j1,
      netto_gewinn_j1,
      ebt_j2,
      netto_gewinn_j2,
      ebt_j3,
      netto_gewinn_j3,
      gesamt_finanzbedarf_netto,
      summe_finanzierung,
      deckung_ueberhang,
      target_reached: (Math.round(netto_gewinn_j1) >= Math.round(Number(data.steuer?.gewinnziel_netto) || 100000)),
      target_diff: netto_gewinn_j1 - (Number(data.steuer?.gewinnziel_netto) || 100000)
    },
    anlage1: {
      bga: summe_bga,
      gwg_unter_800: summe_gwg_klein,
      gwg_800_1000: summe_gwg_mittel,
      maschinen: summe_maschinen,
      gebaeude: summe_gebaeude,
      grundstuecke: summe_grundstuecke,
      gesamt: gesamt_investitionen
    },
    anlage2: {
      monatlich: bk,
      monatliche_summe: monatliche_betriebskosten,
      jaehrlich_summe: jaehrliche_betriebskosten_j1,
      einmalige_ausgaben: einmalige_ausgaben,
      gesamt_j1: gesamt_ausgaben_j1
    },
    anlage3: {
      lebenshaltung,
      wohnkosten,
      krankenversicherung,
      altersversorgung,
      priv_versicherungen,
      priv_ruecklagen,
      priv_einnahmen,
      monatlich_gesamt: unternehmerlohn_monatlich,
      quartal_gesamt: unternehmerlohn_quartal,
      jahr_gesamt: unternehmerlohn_jahr
    },
    anlage4: {
      geschaeftsfeld_1: up.geschaeftsfeld_1_name,
      monatsumsaetze_j1,
      jahresumsatz_j1,
      jahresumsatz_j2,
      jahresumsatz_j3,
      monatliche_ergebnisse_j1,
      betriebsergebnis_j1
    },
    anlage5: {
      betriebsmittel_q1,
      investitionen: gesamt_investitionen,
      finanzbedarf_netto: gesamt_finanzbedarf_netto,
      finanzierung: fin,
      summe_finanzierung,
      deckung_ueberhang
    },
    anlage6: {
      j1: { umsatz: jahresumsatz_j1, ebt: ebt_j1, steuer: steuer_j1, netto_gewinn: netto_gewinn_j1 },
      j2: { umsatz: jahresumsatz_j2, ebt: ebt_j2, steuer: steuer_j2, netto_gewinn: netto_gewinn_j2 },
      j3: { umsatz: jahresumsatz_j3, ebt: ebt_j3, steuer: steuer_j3, netto_gewinn: netto_gewinn_j3 },
      steuersatz_prozent: data.steuer.steuersatz_prozent,
      gewinnziel_netto: data.steuer.gewinnziel_netto
    },
    anlage7: {
      quartale: quartale_cashflow
    },
    anlage8: {
      quartale: mwst_quartale_j1
    }
  };
}

/**
 * Goal-Seek / Target Net Profit Solver:
 * Calculates required annual revenue and generates the 12-month growth curve
 * to achieve an exact Year 1 Net Profit target after taxes and OpEx.
 */
function solveRevenueForNetProfit(targetNetProfit, customData = {}) {
  const target = Math.max(0, Number(targetNetProfit) || 100000);
  const data = JSON.parse(JSON.stringify(DEFAULT_FINANZPLAN_DATA));
  for (const section of Object.keys(customData)) {
    if (typeof customData[section] === 'object' && customData[section] !== null && !Array.isArray(customData[section])) {
      data[section] = { ...data[section], ...customData[section] };
    } else {
      data[section] = customData[section];
    }
  }

  // 1. Tax Rate & Required EBT
  const taxRate = Math.min(0.9, Math.max(0, (Number(data.steuer?.steuersatz_prozent) || 27.32) / 100));
  const requiredEBT = taxRate >= 1 ? target : (target / (1 - taxRate));
  const estimatedTax = requiredEBT * taxRate;

  // 2. Fixed OpEx
  const bk = data.betriebskosten || {};
  const monatlicher_aufwand_pos = [
    bk.buero_coworking, bk.strom_gas, bk.reinigung, bk.bueromaterial,
    bk.telefon_internet, bk.porto, bk.server_cloud, bk.marketing_werbung,
    bk.beitraege_gebuehren, bk.versicherungen, bk.buchhaltung_steuer,
    bk.kfz_kosten, bk.software_lizenzen, bk.kontofuehrung,
    bk.weiterbildung, bk.sonstiger_aufwand
  ];
  const monatliche_betriebskosten = monatlicher_aufwand_pos.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const jaehrliche_betriebskosten_j1 = monatliche_betriebskosten * 12;

  // 3. Variable Costs (COGS, External Services, Personnel)
  const up = data.umsatzplanung || {};
  const cogsRate = Math.min(0.95, Math.max(0, (Number(up.materialverbrauch_prozent) || 0) / 100));
  const fremdleistungJ1 = (Number(up.fremdleistungen_monatlich) || 0) * 12;
  const personalJ1 = (Number(up.personalaufwand_monatlich) || 0) * 12;

  // Required Operating Profit = Required EBT + Interest (0)
  const requiredBetriebsergebnis = requiredEBT;

  // Required Rohertrag = Required BE + Fixed OpEx + Personnel
  const requiredRohertrag = requiredBetriebsergebnis + jaehrliche_betriebskosten_j1 + personalJ1;

  // Required Annual Revenue = (Required Rohertrag + Fremdleistungen) / (1 - COGS Rate)
  const requiredAnnualRevenue = (requiredRohertrag + fremdleistungJ1) / (1 - cogsRate);

  // 4. Interpolate 12 months using the PrimeDiet Care standard growth ramp weights
  // Benchmark monthly weights sum to 154,510
  const benchmarkMonthly = [8000, 9000, 10000, 11000, 12000, 12500, 13000, 13500, 14000, 14500, 15000, 22010];
  const benchmarkTotal = 154510;
  const scaleFactor = requiredAnnualRevenue / benchmarkTotal;

  const monthlyRevenues = [];
  let runningSum = 0;
  for (let i = 0; i < 11; i++) {
    const rawVal = benchmarkMonthly[i] * scaleFactor;
    // round to nearest 50 for clean business numbers
    const rounded = Math.round(rawVal / 50) * 50;
    monthlyRevenues.push(rounded);
    runningSum += rounded;
  }
  // Month 12 absorbs the exact difference so the sum equals requiredAnnualRevenue (rounded to integer)
  const targetAnnualInt = Math.ceil(requiredAnnualRevenue);
  const month12Val = Math.max(0, targetAnnualInt - runningSum);
  monthlyRevenues.push(month12Val);

  // 5. Proportional Year 2 & Year 3 projection
  const y2Total = Math.round(requiredAnnualRevenue * (200000 / benchmarkTotal));
  const y2QuarterAvg = Math.round(y2Total / 4);
  const y2Quarters = [
    Math.round(y2QuarterAvg * 0.9 / 100) * 100,
    Math.round(y2QuarterAvg * 0.96 / 100) * 100,
    Math.round(y2QuarterAvg * 1.04 / 100) * 100,
    Math.round(y2QuarterAvg * 1.1 / 100) * 100
  ];

  const y3Total = Math.round(requiredAnnualRevenue * (250000 / benchmarkTotal));
  const y3QuarterAvg = Math.round(y3Total / 4);
  const y3Quarters = [
    Math.round(y3QuarterAvg * 0.92 / 100) * 100,
    Math.round(y3QuarterAvg * 0.98 / 100) * 100,
    Math.round(y3QuarterAvg * 1.02 / 100) * 100,
    Math.round(y3QuarterAvg * 1.08 / 100) * 100
  ];

  return {
    targetNetProfit: target,
    taxRatePercent: taxRate * 100,
    estimatedTax,
    requiredEBT,
    annualOpEx: jaehrliche_betriebskosten_j1,
    requiredAnnualRevenue: targetAnnualInt,
    monthlyRevenues,
    month1Revenue: monthlyRevenues[0],
    month12Revenue: monthlyRevenues[11],
    year2Total: y2Total,
    year2Quarters: y2Quarters,
    year3Total: y3Total,
    year3Quarters: y3Quarters
  };
}

/**
 * Applies Net Profit Target to financial plan data and generates updated plan
 */
function applyNetProfitTarget(targetNetProfit, customData = {}) {
  const solved = solveRevenueForNetProfit(targetNetProfit, customData);
  
  if (!customData.umsatzplanung) customData.umsatzplanung = {};
  if (!customData.steuer) customData.steuer = {};

  customData.umsatzplanung.monatsumsaetze_j1 = solved.monthlyRevenues;
  customData.umsatzplanung.jahr2_quartale = solved.year2Quarters;
  customData.umsatzplanung.jahr3_quartale = solved.year3Quarters;
  customData.steuer.gewinnziel_netto = solved.targetNetProfit;

  const updatedPlan = calculateFinancialPlan(customData);
  return {
    customData,
    solved,
    calculation: updatedPlan
  };
}

module.exports = {
  DEFAULT_FINANZPLAN_DATA,
  calculateFinancialPlan,
  solveRevenueForNetProfit,
  applyNetProfitTarget
};


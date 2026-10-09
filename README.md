# FGSBot • Financial Planning Bot / Finanzplanungs-Chatbot

**FGSBot** is a smart, interactive financial planning assistant built for founders, startups, and businesses to create bank-ready financial plans.

It is 100% modeled after the German master financial plan structure: **`Finanzplanung_2026_PrimeDiet_Care_100k_NettoProfit_updated.xlsx`** and includes all **8 schedules / Anlagen** with live formula calculation and benchmark validation.

---

## 🌍 Bilingual Support / Zweisprachig (🇩🇪 Deutsch & 🇬🇧 English)

FGSBot provides complete bilingual support:
- **Instant Language Toggle:** Switch anytime between German (`🇩🇪 DE`) and English (`🇬🇧 EN`) in the header.
- **Bilingual Bot Conversation:** Greetings, milestone summaries, help commands, error corrections, and examples in both languages.
- **Bilingual Financial Dashboard:** All 8 schedules, KPI metrics, table headers, and line items translate seamlessly.

---

## 📑 The 8 Financial Schedules / Die 8 Anlagen

| # | German (Anlage) | English (Schedule) | Core Business Inputs & Calculations |
| :---: | :--- | :--- | :--- |
| **1** | **Investitionen** | **Capital Expenditures (CapEx)** | Office & IT equipment (laptops, branding, website), low-value assets, machinery -> **Total Investments**. |
| **2** | **Betriebskosten** | **Operating Expenses (OpEx)** | Office rent, cloud hosting, marketing, accounting/tax, insurance + one-off launch costs (notary, deposit, reserve). |
| **3** | **Privater Aufwand** | **Owner's Living Draw** | Personal living costs, housing, health insurance, retirement provision -> **Minimum Owner Draw**. |
| **4** | **Ertragsplanung** | **Revenue & Profit Plan (P&L)** | Core offering, Month 1 launch revenue, Month 12 target, COGS %, Year 2 & 3 revenue -> **Operating Profit (EBITDA)**. |
| **5** | **Finanzbedarf** | **Capital Requirements & Financing** | Working capital Q1 + Investments = **Total Capital Needed**, founder equity, bank loans, grants. |
| **6** | **Rentabilitätsvorschau** | **Profitability Forecast (3 Years)** | Revenue, OpEx, pre-tax profit (EBT), 27.32% income tax -> **Benchmark: 100,000 € Net Profit Target**. |
| **7** | **Liquiditätsplanung** | **Cash Flow & Liquidity Plan** | Quarterly cash flow (Q1 to Q4): Operating profit ./. investments ./. owner draw ./. VAT = **Cumulative Cash Reserve**. |
| **8** | **MwSt-Ermittlung** | **VAT & Sales Tax Balance** | 19% Output VAT on revenue ./. 19% Input VAT on expenses/CapEx -> **Quarterly VAT Payable**. |

---

## 🌟 Key Features / Hauptfunktionen

1. **Ultra-Visible Persistent Input Dock:**
   - Fixed at the bottom of the chat panel with a bright blue 3px accent line and glowing shadow.
   - Large input field with `€` prefix, 16px high-contrast text, and a prominent **"Send / Senden ➔"** button.
   - One-click quick presets: `[ ⭐ Accept: 2,300 € ]`, `[ 0 € (None) ]`, `[ - 500 € ]`, `[ + 500 € ]`, `[ ⬅ Back ]`, `[ ⏩ Next ]`.

2. **Smart Natural Language Input & Number Extraction:**
   - Understands sentences like `"I need about 2,500 EUR for laptops"`, `"ca. 2000"`, `"100k"`, `"50k"`, `"none"`, `"keine"`.

3. **Validation with Helpful Errors & Concrete Examples:**
   - If an input is invalid, FGSBot explains the reason and provides an exact working example.

4. **1-Click Populated Excel Export (`.xlsx`):**
   - Updates the original template with your exact numbers and downloads the finished Excel spreadsheet.

---

## 🚀 Quickstart / Schnellstart

```bash
cd /Users/kunnath/projects/zgsbot
node server.js
```

Open your browser at:
👉 **http://localhost:3000**

### Terminal CLI Mode:
```bash
node cli.js
```
# fgsfintech

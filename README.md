# FGSBot • Financial Planning Bot / Finanzplanungs-Chatbot

**FGSBot** is a smart, interactive financial planning assistant built for founders, startups, and businesses to create bank-ready financial plans.

It is 100% modeled after the German master financial plan structure: **`Finanzplanung_2026_PrimeDiet_Care_100k_NettoProfit_updated.xlsx`** and includes all **8 schedules / Anlagen** with live formula calculation, Goal-Seek target net profit solving, pure JavaScript Excel generation, and **MongoDB (`zgs`) persistence**.

---

## 🌍 Bilingual Support / Zweisprachig (🇩🇪 Deutsch & 🇬🇧 English)

FGSBot provides complete bilingual support:
- **Instant Language Toggle:** Switch anytime between German (`🇩🇪 DE`) and English (`🇬🇧 EN`) in the header.
- **Bilingual Bot Conversation:** Greetings, milestone summaries, help commands, error corrections, and examples in both languages.
- **Bilingual Financial Dashboard:** All 8 schedules, KPI metrics, table headers, and line items translate seamlessly.

---

## 🎯 Year 1 Net Profit Target & Goal-Seek (Ziel-Nettogewinn)

- Set any target net profit for Year 1 (e.g. `100k €`, `80k €`, `120k €`, `150k €`).
- The system automatically reverse-engineers the required revenue and generates the 12-month growth curve to reach the exact target profit after taxes and operating expenses.

---

## 🍃 MongoDB Database Integration (`zgs`)

- **Session Persistence:** Saves all user financial inputs, current questionnaire state, and calculations across browser reloads and device switches into the `sessions` collection in MongoDB (`zgs`).
- **Chat Logs:** Automatically records user prompts, goal-seek adjustments, and bot responses into the `chat_logs` collection in MongoDB (`zgs`).

---

## ☁️ Netlify Deployment Guide

This project is configured for 1-click deployment on Netlify using Netlify Functions (Serverless API) and Netlify Static Hosting.

### 1. Configuration Files
- **`netlify.toml`**: Configures the publish directory (`public`), serverless functions directory (`netlify/functions`), build settings, and API redirects (`/api/*` -> `/.netlify/functions/api/:splat`).
- **`netlify/functions/api.js`**: Complete serverless API handler with MongoDB `zgs` connection, session persistence, and pure JS Excel generation.

### 2. Environment Variables in Netlify
In your Netlify Site Dashboard:
1. Go to **Site Configuration** ➔ **Environment variables**.
2. Add the variable:
   - **`MONGO_URI`**: `mongodb+srv://<username>:<password>@cluster0.9gysv6t.mongodb.net/zgs?retryWrites=true&w=majority`

### 3. Deploy to Netlify
- Push this repository to GitHub/GitLab/Bitbucket and connect it to Netlify, or run:
  ```bash
  netlify deploy --prod
  ```

---

## 🚀 Local Development / Schnellstart

```bash
# Install dependencies
npm install

# Start local server with MongoDB
node server.js
```

Open your browser at:
👉 **http://localhost:3000**

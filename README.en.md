[🇪🇸 Español](README.md)

<div align="center">
  <br/>

# Fumito

**履歴 · Your résumé, built from your GitHub repositories. Nothing leaves your browser.**

<br/>

[![Open Fumito](https://img.shields.io/badge/open-chidaruma696.github.io%2FFumito-8839ef?style=for-the-badge&logo=github&logoColor=white)](https://chidaruma696.github.io/Fumito/)
![No server](https://img.shields.io/badge/server-none-1b150d?style=for-the-badge)
![No AI](https://img.shields.io/badge/AI-none-1b150d?style=for-the-badge)
![MIT License](https://img.shields.io/badge/license-MIT-1b150d?style=for-the-badge)

<br/>

*type your username · pick your repos · answer five things · out comes the PDF*

</div>

---

> [!NOTE]
> Fumito is a single static page. It talks directly to GitHub's public API from your browser, keeps what you type in your `localStorage`, and produces the PDF through the print dialog. There is no backend, no account, no artificial intelligence: just rules. The interface is currently in Spanish.

<br/>

## 📄 What it is

Technical résumés come out badly for one reason: they force you to summarize, from memory, projects that are already explained in detail in their repositories. Fumito turns that around:

| 🔍 Reads | 🧠 Infers | ✍️ Asks |
| --- | --- | --- |
| Your repos, languages, topics, stars, licenses and dates, through the GitHub API | What each project is, from the first useful paragraph of its README | What GitHub does not know: name, job title, email, phone, city, LinkedIn, website, photo |
| The README of every repo you check | Your real stack, weighting code bytes across all selected repos | Experience with achievements, education, skills with levels, languages, certifications, interests |
| Your public profile and avatar, to prefill whatever it can | A draft summary built from your languages and topics, which you edit or delete | Template, color, language and which sections to show |

It drops forks, archived repos and repos with no activity in two years by default; you get the final say on what goes in.

<br/>

## 🧪 How to use it

1. Open [chidaruma696.github.io/Fumito](https://chidaruma696.github.io/Fumito/) and type your GitHub username.
2. Check the repos that count. Each one costs two API requests; without a token GitHub allows 60 per hour, more than enough for a résumé.
3. Press **Analizar** (Analyze): Fumito fetches the languages and README of each repo and assembles the résumé on the right.
4. Fix the project descriptions, add achievements and reorder them. Fill in contact details, photo (your GitHub avatar or a picture of your own), summary, experience with key achievements, education, skills with levels, languages, certifications and additional information.
5. Pick a template (classic single column, modern with a band and sidebar, or sidebar with a dark bar), color, language (Spanish or English) and **Guardar PDF** (Save PDF). You can also copy the résumé as Markdown or download your data as JSON to pick it up again in another browser.

### Optional token

If you have many repos or want to include private ones, paste a [read-only token](https://github.com/settings/tokens?type=beta) into the dropdown in step 1. It raises the limit to 5,000 requests per hour and also lists your private repos. It is stored only in your browser and is erased with "Olvidar" (Forget).

<br/>

## 🔧 How it works

```
Fumito/
├── index.html   the page: four steps and the A4 sheet
├── app.js       GitHub API, description extraction, résumé model, templates and export
├── styles.css   app interface (Catppuccin Latte by day, Mocha by night)
└── cv.css       the three résumé templates, with an accent color of your choice
```

- **Description of each project**: the README is cleaned up (badges, images, code, HTML, links, emphasis) and the first paragraph over 60 characters that is actual prose is taken, trimmed to two sentences. If there is no README, the repo description is used.
- **Skills**: sum of bytes per language across the selected repos, as a percentage and as a bar relative to the main language; those above 2% are shown, plus any you add by hand with their level.
- **Period**: creation year through the last *push*; "current" if there was activity in the last six months.
- **Stack per project**: the three main languages plus up to three repo topics that do not duplicate a language.
- **Automatic summary**: a template built from your main languages, frequent topics and stars. It is regenerated if you leave it untouched and switch languages; if you edit it, your version is kept.

No dependencies, no *build* step, no bundler: it is served as is from GitHub Pages.

<br/>

## 🔬 Development

```bash
git clone https://github.com/Chidaruma696/Fumito.git
cd Fumito
python -m http.server 8080     # any static server will do
```

Open `http://localhost:8080`. Under `file://` the browser blocks the API requests, hence the server.

<br/>

## ⚖️ License

[MIT](LICENSE).

<br/>

<div align="center">

*Your repos already say it all.*

履歴 · りれき

</div>

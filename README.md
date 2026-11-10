![QualityView banner](assets/banner.png)

# QualityView

[![CI](https://github.com/DiogoS7/QualityView/actions/workflows/ci.yml/badge.svg)](https://github.com/DiogoS7/QualityView/actions/workflows/ci.yml)

*Release quality in one glass pane.*

QualityView is a release-quality command centre for a QA lead or delivery consultant. It brings together the four things a client asks about before go-live: how much has been tested, what is still broken, whether every requirement is covered, and whether the release meets the go/no-go criteria.

The data is a fictional release (**R4.2 · SEPA Instant Payments** for the made-up *Meridian Bank*). It is modelled on the work I do as a QA consultant in the banking sector. Every person, defect and requirement is synthetic.

**Live demo:** https://diogos7.github.io/QualityView/

## Views

![Overview: the whole release at a glance](assets/screenshots/overview.webp)

![Test runs: every test case and its latest result](assets/screenshots/runs.webp)

![Defects: every defect traced to a requirement](assets/screenshots/defects.webp)

![Traceability: requirement to test to result](assets/screenshots/traceability.webp)

![Mobile: built for the phone too](assets/screenshots/mobile.webp)

### Highlights

| | |
|---|---|
| ![Test execution chart](assets/screenshots/highlight-chart.webp) | ![Go / No-Go card](assets/screenshots/highlight-gonogo.webp) |
| ![Defect detail panel](assets/screenshots/highlight-defect.webp) | ![QA Agent](assets/screenshots/highlight-agent.webp) |

## What it shows

- **Reporting period.** Pick any sprint (with its dates and pass rate) or the release to date. Every card and the execution chart follow the selection, and changes are compared with the period before.
- **Go/No-Go gates.** Four automatic gates (execution ≥ 90%, pass rate ≥ 90%, no open Critical defects, every Must-have verified) are calculated from the data. Two manual gates come from the client (UAT sign-off, CAB-approved rollback). An open Critical defect makes the release **No-Go**. Any other failed gate makes it **Conditional**.
- **Requirement status.** A requirement is *Verified* when every linked test passes. It is *Failing* if any test fails, *In progress* if a test is blocked or not run, and *No tests* when nothing is linked.
- **Honest deltas.** Change badges are green when the change is good news, not just when the number goes up. Fewer open defects is green.
- **Connected views.** Click a test's requirement to open it in the traceability matrix. Click a test chip there to open that test in Test runs. A defect's detail panel links to the requirement it blocks.
- **Search.** Ctrl+K (⌘K on Mac) searches defects, requirements and test cases, with arrow-key navigation.
- **Header menus.** Notifications list the open Critical and High defects, and each one opens that defect. Messages can be marked as read. The profile menu links to the source code, GitHub, LinkedIn and my portfolio.
- **Export.** Each view exports what you're looking at to CSV: execution by day, test runs, the filtered defect log or the traceability matrix.
- **Shareable views.** The current view is kept in the URL (`#runs`, `#defects`, `#traceability`).

## QA Agent

The chat button in the bottom-right corner opens the **QA Agent**, a chat assistant for the release.

- **Built-in mode (default).** It answers from the dashboard's own data: go/no-go readiness and blockers, any `DEF-`, `REQ-` or `TC-` id, sprint or release figures, coverage gaps, who owns what, today's agenda, client and release details, and QA terms such as RTM, blocked, UAT, SCA and VoP. Answers include buttons that open the defect, requirement, test or period they mention. No network calls, no cost, and it works on GitHub Pages. The logic is in `src/lib/assistant.js` and is covered by unit tests.
- **Claude mode (optional).** Click the key icon and paste an Anthropic API key, and Claude (`claude-haiku-4-5`) answers open questions, using a snapshot of the release data as context. QualityView has no server, so the key is never in the code or the build. It's kept in that browser tab's `sessionStorage` only and sent straight to Anthropic. If Claude can't be reached, the agent falls back to its built-in answers.

## Tech stack

| | |
|---|---|
| UI | React 19, Tailwind CSS v4 (custom `glass` utility), Framer Motion |
| Icons | Lucide, via `react-icons/lu` |
| Build | Vite 7 |
| Tests | Vitest unit tests for the metrics, search, export and QA Agent logic (`src/lib/*.test.js`) |
| CI/CD | GitHub Actions runs the tests and the build on every push and PR, then deploys `main` to GitHub Pages |

The glass look is made of a frosted card (`backdrop-filter: blur() saturate()`), a soft top highlight and a deep drop shadow, laid over a deep-navy CSS backdrop with a soft cobalt light and a faint grid. No images are used.

## Getting started

You need Node.js 20 or later.

```bat
git clone https://github.com/DiogoS7/QualityView.git
cd QualityView
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Re-run tests on save |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Project structure

```
src/
├── App.jsx              # Layout, view switching, scope toggle, CSV export
├── components/          # GlassCard, StatsCard, ExecutionChart, ReadinessCard, ...
├── views/               # Overview, TestRuns, Defects, Traceability
├── data/release.js      # Synthetic release data (swap in a real source here)
└── lib/
    ├── metrics.js       # Pass rate, coverage, gates, verdict, deltas, axis maths
    ├── metrics.test.js
    ├── assistant.js     # QA Agent built-in answer engine
    ├── claude.js        # Optional Claude connection for the QA Agent
    ├── search.js        # Ctrl+K search across defects, requirements and tests
    ├── search.test.js
    ├── csv.js           # CSV export
    └── csv.test.js
```

All numbers come from pure functions in `lib/metrics.js`, so the logic is tested without rendering anything. Connecting a real source such as Jira, Azure DevOps or Xray only means replacing `data/release.js`.

## Why I built it

As a QA consultant I spend a lot of each release answering the same questions in different spreadsheets. *Are we on track? What's blocking go-live? Is REQ-104 covered?* QualityView puts those answers in one place, framed the way a client steering meeting asks them. It's also a chance to show front-end work alongside my Salesforce ([Launchpad](https://github.com/DiogoS7/Launchpad)) and Power Platform ([Houston](https://github.com/DiogoS7/Houston)) projects.

## License

[MIT](LICENSE) © Diogo Santos

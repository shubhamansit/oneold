# ONE Old Panel — Process Documentation

> **CONFIDENTIAL — Internal use only.** This document contains live login
> credentials (they are also hard-coded in `app/page.tsx`). Do not share
> outside the project team.

Last updated: 21 Oct 2026

---

## 1. Project Overview

| Item | Detail |
|---|---|
| Project | ONE Old Panel (`oneold`) — multi-client SWM (Solid Waste Management) reporting panel |
| Stack | Next.js 15 (App Router), React, Tailwind, shadcn/ui components |
| Data model | **Static JSON files in the repo** — no database. Every report reads pre-generated JSON. |
| Auth | Email/password checked on the client login page (`app/page.tsx`); a JWT is stored in the `isAuthenticated` cookie; `middleware.ts` + `lib/authUsers.ts` restrict each user to their own routes. |
| Deployment | Git push → Vercel auto-deploy. Excel files and `data/backups/` are git-ignored and must **never** be committed. |
| Build locally | `$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build` (large JSON files need the extra memory) |

### How a user request flows

```
Login (app/page.tsx) → JWT cookie → middleware (canAccessRoute)
  → user-specific route → page loads static JSON via data/dataLoader.ts
  → shared table/filter/export components render the report
```

---

## 2. All Users, Backgrounds & Views

Credentials live in `app/page.tsx`; route mapping lives in `lib/authUsers.ts`.

| # | Username | Password | Client / Background | Lands on | Allowed views |
|---|---|---|---|---|---|
| 1 | `bhavnagar@gmail.com` | `Bhadresh@1234` | **BMC — Bhavnagar Municipal Corporation** (main operator). West/East/General zones + Brigrajsinh town. | `/jobsummary` | Job Summary, Job Detail Summary, Work Hour Summary, Swipper Summary, Summary |
| 2 | `bmcswippr@gmail.com` | `Ans@1234` | **BMC sweeper-machine operations** (same Bhavnagar dataset, summary-focused). | `/worksummary` | Work Hour Summary → Summary (`/summary`) |
| 3 | `osc@swm.com` | `98765432` | **OSC — operator/supervisor view** of the same Bhavnagar BMC data. | `/summary` | Job Summary, Job Details Summary, Present Summary |
| 4 | `nasikwaste123@gmail.com` | `Nasik@1212` | **NMC — Nashik waste operations.** Day-wise vehicle distance tracking. | `/daywisedistance` | Daywise Distance only |
| 5 | `nmc123@gmail.com` | `Nmc1234@` | **NMC — Nashik Municipal Corporation** (second Nashik login, same view). | `/daywisedistance` | Daywise Distance only |
| 6 | `hmc@gmail.com` | `Corporation@hisar2025` | **HMC — Hisar Municipal Corporation.** Route Detail Summary with ward filters & column settings. | `/welcome` | Welcome → Route Detail Summary (`/jobdetails`, `/jobdetails/[jobId]`) |
| 7 | `mmcshreeji@gmail.com` | `Ans@123` | **MMC — Morbi Municipal Corporation (Shreeji).** Route Detail Summary with multi-day Excel export (one sheet per day). | `/morbi` | Reports → Route Detail Summary (`/morbi/reports`) |
| 8 | `karni.bardoli@ansitindia.com` | `Karnibardoli@123` | **Karni Corporation — Bardoli Taluka Panchayat** (added Oct 2026). 24 routes, POI/missed-POI tracking, Mar–Sep 2026. | `/bardoli/jobsummary` (direct, like Bhavnagar) | Job Summary (`/bardoli/jobsummary`) only |

### Access isolation rules (`lib/authUsers.ts` → `canAccessRoute`)

- Daywise users can open **only** `/daywisedistance`.
- HMC user can open **only** `/welcome` + `/jobdetails/*`.
- Morbi user can open **only** `/morbi/*`.
- Bardoli user can open **only** `/bardoli/*`.
- The three Bhavnagar-family users (1–3) share the general Bhavnagar routes.
- Anyone hitting a route outside their area is redirected to their own home
  route by `middleware.ts`. **Adding a user never affects existing users.**

### Data source per user

| User group | JSON data source | Loader |
|---|---|---|
| Bhavnagar (1–3) | `data/wastZone.json`, `data/eastZone.json`, `data/general.json`, `data/brigrajsinh.json` | `data/dataLoader.ts` (`getWastZone`, `getEastZone`, `getGeneral`, `getBRIGRAJSINH`) |
| Nashik (4–5) | `data/daywiseDistance_2026_04.json`, `data/daywiseDistance_2026_05.json`, `data/daywiseDistance_2026_04_13.json` | Static imports in `app/daywisedistance/page.tsx` |
| HMC (6) | `public/data/hmc/index.json`, `public/data/hmc/<march|april|may>/<YYYY-MM-DD>/summary.json` + `details/<jobId>.json` | `lib/hmcJobData.ts` (fetch, `no-store`) |
| Morbi (7) | `data/morbi/routeDetailSummary.json` | Static import in `app/morbi/reports/page.tsx` |
| Bardoli (8) | `data/bardoli.json` (24 jobs × daily `more_details`) | `getBardoli()` in `data/dataLoader.ts` |

> Bardoli and Bhavnagar **consume the same UI** (`ExpandableTable`,
> `ExportExcel`, filters layout, Sidebar) but through **separate routes and
> separate data files** — data can never mix between clients.

---

## 3. Golden Rules for Every Data Upload

1. **Never edit zone JSON by hand.** Always go Excel → generator script →
   monthly JSON → append script → zone JSON.
2. **Never delete earlier days.** Always keep previous monthly data and merge
   only the new day range (see §4). Deleting days is the #1 cause of "data
   not showing".
3. **Always verify after appending** (counts per day, orphans = 0 — see §8).
4. **Excel files and `data/backups/` are git-ignored.** They stay on the
   local machine only; only JSON + scripts + code are committed.
5. **Local update ≠ live.** Data appears on the deployed site only after
   `git commit` + `git push` (Vercel redeploys automatically).
6. A backup of every zone file is auto-written to `data/backups/` on each
   append — use it to roll back a bad update.

---

## 4. Process A — Bhavnagar (BMC) Monthly Data Upload

**Frequency:** whenever a new `BMC Data <DD> <MMM>.xlsx` arrives.
**Current coverage:** September 2026 complete (1–30); October 2026 through
**17 Oct 2026**.

### 4.1 Expected Excel format (single sheet)

| Col | Content |
|---|---|
| A | Sr no |
| B (`RUTE`) | Route code, e.g. `01-01-0086`, `10-16-6866` |
| C (`VEHICLE`) | Vehicle id, e.g. `GJ04GB0086`, `C-6866` |
| D (`T-POI`) | Planned checkpoints per day |
| E… | One column per day of month (header = day number); cell = **missed checkpoints** for that vehicle/day |
| Last | `TOTAL` |

### 4.2 Step-by-step (example: adding Oct 13–17)

Run in PowerShell from the repo root (`d:\CODING\oneold`):

```powershell
# 1) Keep the current monthly file aside
Copy-Item -Force monthlyData_2026_10.json monthlyData_2026_10.keep.json

# 2) Generate a fresh monthly file from the new Excel (regenerates ALL days in it)
node excelToMonthlyData.js "BMC Data 17 OCT.xlsx" 2026 10
Copy-Item -Force monthlyData_2026_10.json monthlyData_2026_10.new.json

# 3) Merge: keep days < 13 from old file, take days 13-17 from new file
node scripts/mergeMonthDays.js monthlyData_2026_10.json monthlyData_2026_10.keep.json monthlyData_2026_10.new.json 13 17 2026-10

# 4) Append the merged month into the 4 zone JSON files
node appendOctober2026Data.js

# 5) Clean up temp files
Remove-Item -Force monthlyData_2026_10.keep.json, monthlyData_2026_10.new.json
```

**Why the merge step matters:** `excelToMonthlyData.js` rewrites the monthly
file from scratch. Merging guarantees days already live (1–12) are preserved
byte-for-byte and only the new range (13–17) is taken from the new Excel.

### 4.3 First upload of a NEW month

```powershell
# 1) Create the append script from the previous month's script
(Get-Content appendSeptember2026Data.js -Raw) -replace 'September','October' -replace 'sept','oct' -replace '2026_09','2026_10' -replace '2026-09','2026-10' | Set-Content -NoNewline appendOctober2026Data.js

# 2) Generate + append (no merge needed — file is new)
node excelToMonthlyData.js "BMC Data 02 OCT.xlsx" 2026 10
node appendOctober2026Data.js
```

### 4.4 New vehicle onboarding (e.g. `C-6866`, route `10-16-6866`)

A vehicle with no template in `vehicleTemplates.json` is skipped with
`Could not auto-create template`. To onboard it:

1. Add a template entry to `vehicleTemplates.json` (copy a similar route's
   template, set `Vehicle: "C-6866 RUT 10-16-6866"`, `Planned Checkpoints`
   = its T-POI, `Assigned`/`Present` = the vehicle id twice). GJ-plate and
   `C-XXXX` ids are both supported by `excelToMonthlyData.js`.
2. Add a job to the correct zone file (copy the neighbouring route's job,
   set `"Job Name": "10-16-6866 D TO D"`, empty `more_details: []`).
   Route `10-xx` belongs to **eastZone**.
3. Re-run the monthly generation + merge for the vehicle's first day range
   (e.g. Sept 20–30 from the September Excel, then Oct 1 onwards), then the
   append scripts. For October, append **only the new vehicle's rows** into
   `monthlyData_2026_10.json` if other vehicles are already live, to avoid
   regenerating existing days.
4. Verify the job shows the expected date range in the zone file (§8).

### 4.5 Expected verification numbers (Bhavnagar)

- Monthly rows = `149 vehicles × days` (148 GJ vehicles + `C-6866`).
- Per-day rows in zones: wastZone **54**, eastZone **84**, general **2**,
  brigrajsinh **17** → mappings **157**, orphans **0**.
- Last Excel day with data must equal the requested day (e.g. `17`).

---

## 5. Process B — Bardoli (Karni Corporation) Data Upload

**Frequency:** when a new SWM POI Report workbook arrives.
**Current coverage:** **7 Mar – 30 Sep 2026** (24 routes, 4,992 daily
records). October is pending — the current workbook has no October sheet.

### 5.1 Expected Excel format (multi-sheet workbook)

| Sheet | Content |
|---|---|
| `Summary` | Per-month: days, vehicles, planned / missed / covered POI |
| `March`…`September` | One sheet per month: `Sr no \| ROUTE \| VEHICLE \| T-POI / Daily Checkpoints \| <day cols> \| TOTAL MISSED POI`. Cells = **missed POI**. March starts day 7. |
| `Validation` | Expected route count (24), T-POI total (254), monthly missed totals (40–50) |
| `Route T-POI Source` | Source of truth for route → vehicle → T-POI |
| `Instructions` | Business rules for the workbook |

Note: vehicle `GJ27TF6726` serves both ROUTE 17 and ROUTE 18 — routes, not
vehicles, are the job key.

### 5.2 Step-by-step

1. Save the workbook in the repo root (do not commit it).
2. (First time / sanity) Inspect sheets and confirm: 24 routes,
   T-POI sum = 254, each month's missed total matches `Summary`/`Validation`.
3. Rebuild the dataset (the generator validates everything and fails loudly
   on any mismatch):

   ```powershell
   node scripts/buildBardoliData.js "March_7_to_September_30_2026_Correct_SWM_POI_Report (1).xlsx"
   ```

   Output: `data/bardoli.json`. Expected log: monthly missed
   `Mar 43, Apr 47, May 41, Jun 49, Jul 45, Aug 42, Sep 48`, all `OK`.
4. Verify totals: planned **52,832**, missed **315**, covered **52,517**;
   records per month: Mar 600, Apr 720, May 744, Jun 720, Jul 744,
   Aug 744, Sep 720.
5. Build + commit + push (§8, §9). The Bardoli user then sees it at
   `/bardoli/jobsummary`.

### 5.3 Adding October (future)

1. Add an `October` sheet in the same format to the workbook (or a new
   workbook with the same monthly sheets).
2. Add `{ sheet: "October", month: 10 }` to the `MONTHS` list in
   `scripts/buildBardoliData.js`.
3. Re-run step 3 above — it rebuilds the full range including October.
4. **Never hand-append** to `data/bardoli.json`; always rebuild from Excel.

---

## 6. Process C — Morbi (MMC) Data Upload

**Data file:** `data/morbi/routeDetailSummary.json` (one record per
route-day; Report Date is derived from the record's date fields).

### Step-by-step (single-day Excel)

```powershell
# 1) Import one day's Route Detail Summary Excel into the JSON
node scripts/importMorbiDayXlsx.js "path\to\Morbi_RouteDetailSummary_2026-07-11.xlsx"

# 2) Verify coverage / correctness
node scripts/verifyMorbiJuneData.js
node scripts/verifyMorbiAllFiles.js
```

For whole-month workbooks use `scripts/convertMorbiMonthXlsx.js` /
`scripts/convertMorbiJuneXlsx.js` / `scripts/convertMorbiCsv.js` as
appropriate. Key checks: row-level totals (not sheet header KPIs) are the
source of truth; spillover days (previous-day routes finishing after
midnight) belong to their canonical Report Date.

---

## 7. Process D & E — HMC (Hisar) and Nashik Uploads

### 7.1 HMC — Hisar (`hmc@gmail.com`)

- Extract per-date data from the HMC Excels with
  `scripts/extractHmcJobDetails.js` (or `scripts/extractHmcMarchOneByOne.js`
  for March). Output goes to
  `public/data/hmc/<month>/<YYYY-MM-DD>/summary.json` + `details/<jobId>.json`,
  and `public/data/hmc/index.json` lists available dates.
- If a **new month** is added: extend `HmcMonthKey` / `HMC_MONTHS` in
  `lib/hmcJobData.ts` and create the `public/data/hmc/<newmonth>/` folder.
- ⚠️ Never delete `public/data/hmc/march` — badge/count differences vs
  Excel usually mean stale regenerated dates, not lost data.

### 7.2 Nashik — Daywise Distance (`nasikwaste123@gmail.com`, `nmc123@gmail.com`)

- Monthly Excels (`Daywise_Distance_<DD-MM-YYYY>.xlsx`, sheet
  `Daywise Distance`) are converted with
  `scripts/extractDaywiseDistanceData.js` /
  `scripts/createAprilDaywiseDistanceData.js` /
  `scripts/createMayDaywiseDistanceData.js` →
  `data/daywiseDistance_YYYY_MM.json`.
- For a new month: generate the JSON, then add its static import in
  `app/daywisedistance/page.tsx`. Blue/red cell colour flags from the Excel
  are preserved in the JSON rows.

---

## 8. Verification Checklist (every upload)

- [ ] Generator log shows the expected **last day with data**.
- [ ] Monthly counts: every day has the full vehicle count, no missing days
      in the range.
- [ ] Append summary: **orphans = 0**; mappings match expectation.
- [ ] Zone files contain the new dates (spot-check first/last date of the
      target job/route).
- [ ] Numbers reconcile with the source Excel (monthly missed totals,
      planned = visited + missed, status % = visited/planned).
- [ ] `$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build` passes.
- [ ] Login as the affected user and confirm the new dates render, search
      works (Bardoli search is exact: `ROUTE 1` matches only Route 1).

## 9. Deployment Checklist

```powershell
git status            # Excel files & data/backups must NOT appear (git-ignored)
git add data/ monthlyData_*.json append*2026Data.js scripts/ <code files>
git commit -m "data: <client> through <DD Mon YYYY>"
git push              # triggers Vercel deploy
```

Then re-check the live site logged in as the client user. "Data updated
locally but not showing" almost always means **not committed/pushed yet**.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| New dates not showing (local) | Merge kept only old days, or append not run | Re-run §4.2 steps 3–4; verify zone date range (§8) |
| New dates not showing (live) | Not committed/pushed | §9 |
| Vehicle missing entirely | No template / no zone job (orphan or skipped row) | §4.4 onboarding; check append log `orphans` |
| `Could not auto-create template` | Non-GJ id or unknown pattern in Excel | Add template manually (§4.4 step 1) |
| Build OOM (`heap out of memory`) | Huge JSON files in type-check/build | Build with `NODE_OPTIONS=--max-old-space-size=8192`; full-project `tsc` is expected to OOM — rely on `next build` |
| User redirected to login / wrong page | Route outside their allowed area | Check `canAccessRoute` in `lib/authUsers.ts`; each user is locked to their section by design |
| Counts differ from Excel header KPI | Excel header KPI ≠ sum of rows | Row-level data is the source of truth (see Morbi §6) |

## 11. Adding a New Client/User (pattern)

1. Add credentials in `app/page.tsx` (`isValidLogin` chain).
2. Add the user + routes in `lib/authUsers.ts` (`<CLIENT>_USERS`,
   home route, `getLoginRedirectForEmail`, `canAccessRoute`).
3. Add `/<client>` + `/<client>/:path*` to `middleware.ts` matcher.
4. Create the client's page(s) under `app/<client>/`, reusing shared
   components (`ExpandableTable`, `ExportExcel`, Sidebar) with a **separate
   data file + loader** (never reuse another client's JSON).
5. Add the Sidebar menu entry for that user (see `components/Sidebar.tsx`).
6. Add a generator script under `scripts/` and document the process here.
7. Build, verify as that user, commit, push.

## 12. Known Notes

- Passwords and the JWT secret (`SUPERSECRET`) are hard-coded — this is the
  panel's existing pattern for all clients. Treat repo access as sensitive;
  move secrets to environment variables before any public exposure.
- Bhavnagar/Bardoli detail fields that don't exist in source Excels
  (actual start/end times, distance, halt time) use the same standard
  template defaults as the existing Bhavnagar-generated data. All POI /
  missed / completion figures are exact from source files.
- Bardoli October 2026 data is awaited; current file ends 30 Sep 2026.

# School Results & Grade Management Portal

A complete Next.js (App Router, TypeScript) web app with **Firebase as the backend**:
Authentication, Cloud Firestore (with security rules), Cloud Storage, optional Cloud Functions and FCM.
Tenant-isolated (multi-school), role-based, mobile-first, with a full results workflow:

`Setup → Enrol → Allocate → Enter scores → Submit → Review/Approve (or Return) → Compute & rank → Publish → View/Print → Lock`

## Roles and what they get

| Role | Area | Highlights |
|---|---|---|
| Platform admin | `/platform` | Schools, plans, feature flags, suspend/reactivate tenants |
| School admin / Exam officer | `/admin` | Dashboard + setup checklist, school branding, sessions/terms, classes, subjects, grading, assessment structure, users (CSV import), students (CSV import, promote/move), guardians, teacher allocation, **submission tracker**, **computation**, **broadsheet** (CSV/Excel/print), report-card settings, **publish centre** (publish / schedule / unpublish), parent queries, unlock requests, audit log, settings |
| Principal / HOD | `/review` | Review queue with ageing, sheet review with automatic flags (repeated totals, unusual averages, jumps vs last term, missing scores), approve / return with mandatory reason + per-student comments, bulk approve, principal remarks with quick-picks, analytics (class, subject, teacher comparison, top/bottom students) |
| Teacher | `/teacher` | Dashboard with deadline, **score-entry grid** (live totals/grades, validation, keyboard navigation, paste from Excel, autosave with optimistic concurrency, absent/excused, CSV import/export), submit summary, returned-sheet feedback, subject analysis, unlock requests. **Class teacher:** overview + position preview, attendance, conduct/skills ratings, comments |
| Parent / Guardian | `/parent` | Child cards, published results only, report card view + print/PDF with QR, progress trends, result queries (threaded) |
| Student | `/student` | Dashboard, results, report card, insights & next-grade targets |
| Anyone | `/verify/[code]` | Public QR check that a printed report card is genuine |

## Architecture

```
Browser (Next.js, client-side data via Firestore SDK)
   │  Firebase Auth (ID token)           ┌──────────────────────────────┐
   ├────────────────────────────────────►│ Firestore + Security Rules   │  tenant isolation, roles,
   │  onSnapshot / transactions / batch  │  /schools/{id}/…             │  workflow-state enforcement
   ├────────────────────────────────────►│ Storage (logos, signatures)  │
   └──► Cloud Functions (optional): resetUserPassword
```

* **All authorisation is enforced by `firestore.rules`** (the UI guards are only for experience).
* Result sheets **snapshot** the grading scale and assessment structure at creation, so later config edits never change historic results.
* Score saves use **Firestore transactions with a per-row `version`** (two editors can't silently overwrite each other) and write **audit entries** with before/after values.
* Report cards are denormalised (`reports/{termId_studentId}`) with the subject lines, bands and guardian uids, so a parent reads **one document**, and rules can restrict it to `published == true` + linked guardians.
* Accounts without a mailbox (students, phone-only parents) sign in with **school code + ID**; the app maps that to a synthetic email (`id@code.login.portal`).
* Admin-created accounts use a short-lived secondary Firebase app instance so the admin stays signed in; users must change their temporary password on first login.

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in your Firebase web-app config
npm run dev                       # http://localhost:3000
```

### Firebase setup
1. Create a Firebase project; enable **Authentication → Email/Password**, **Firestore**, **Storage**.
2. `firebase login && firebase use <project-id>` (edit `.firebaserc`).
3. Deploy rules + indexes: `npm run deploy:rules`.
4. Open `/register` to create your first school (creates the school, its admin and sensible defaults: A–F scale, 15/15/70 structure, conduct traits, comment phrases).
5. Then follow the dashboard's **Setup progress** list: sessions & terms → classes → subjects → users → students → allocations.

### Local emulators
```bash
npm run emulators                       # Auth 9099, Firestore 8080, Storage 9199, Functions 5001, UI 4000
NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

### Platform (super) admin
Create a user in the Auth console, then:
```bash
cd functions && npm install
GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/make-platform-admin.js you@example.com
```

### Optional Cloud Function (needs Blaze plan)
`resetUserPassword` lets admins set a new temporary password for accounts that have no email (students / phone-only parents). Without it, those resets show a helpful error; everything else works on the free Spark plan.
```bash
npm run deploy:functions
```

### Deploy the web app
Firebase **App Hosting** (`apphosting.yaml`) or any Node host (`npm run build && npm start`).

## Project layout

```
src/
  app/
    (public)/      login, register, forgot-password, verify/[code], forbidden
    (onboarding)/  first-login (forced password change + terms)
    (app)/         authenticated shell
      admin/ teacher/ review/ parent/ student/ platform/
      notifications/ profile/ results/[reportId] (deep-link redirect)
  components/
    ui/            Button, Field, Modal, Tabs, DataTable, Toasts, Badges…
    layout/        AppShell (sidebar/topbar/role switcher/offline banner), NotificationBell, RequireRole
    results/       ScoreGrid, WorkflowTimeline, SubjectAnalysis, useClassData
    portal/        Report view, results list, trends, parent queries
    shared/        CrudManager, ReportCard (print-ready), ImportWizard, pickers, dialogs
  lib/
    firebase/      client, hooks (useCollection/useDoc), batch Writer, messaging
    results/       sheets (workflow + concurrency), compute (totals/positions/cumulative), publish
    grading.ts     grade lookup, ranking with ties, band validation
    auth/ school/  providers
  config/          navigation, routes, env
firestore.rules  firestore.indexes.json  storage.rules  firebase.json  apphosting.yaml
functions/       resetUserPassword + platform-admin script
tests/           grading & statistics tests (npm test)
```

## Honest notes & limits

* **Rules were not run against the emulator in my build environment.** I verified type-checking (`npm run typecheck`), the production build, and the grading/ranking logic (`npm test`). Before going live, run the Emulator Suite and write rules tests for your own policies.
* **Scheduled publishing** runs the next time an admin opens the Publish centre after the chosen time (no server scheduler on the free tier). For true scheduling add a Cloud Scheduler + Function.
* **Push notifications:** the device-token registration and service worker are included (`public/firebase-messaging-sw.js` — put your config in it). *Sending* pushes needs a Cloud Function that watches `notifications`. In-app notifications work out of the box.
* **PDF report cards** use the browser's print dialog (“Save as PDF”) with a print stylesheet — no server rendering.
* **Open school registration:** `/register` lets anyone create a tenant. Remove that route (and the self-registration branch in `users` / `schools` rules) if schools should be onboarded only by the platform admin.
* **HOD scope:** HODs currently review all subjects; restrict by department if needed.
* **Not in this version** (kept out of v1, as in the blueprint): public PIN result checker, fee-gating, announcements, impersonation, support tickets, student self-login UX for primary pupils beyond the optional login.
* Large schools: the broadsheet/computation read every sheet of a class client-side — fine for typical class sizes; for thousands of students per class move computation into a Cloud Function.
* Seeded defaults and wording (grades, phrases) are examples — review them for your curriculum.

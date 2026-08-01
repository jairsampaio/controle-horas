# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run the CRA dev server (localhost:3000).
- `npm run build` — production build (output to `build/`).
- `npm test` — run tests via `react-scripts test` (Jest + Testing Library, watch mode). Pass `-- --watchAll=false` for a single non-interactive run, or `-- <pattern>` to filter by test file/name.
- No lint script is defined; ESLint runs implicitly through `react-scripts` (config: `eslintConfig` in `package.json`, extends `react-app`).

There is no backend dev server to run separately: `api/enviar-email.js` is a Vercel serverless function invoked at `/api/enviar-email` — it only runs when deployed on Vercel (or via `vercel dev`), not under `npm start`. `backend-email/` is a standalone Express app (with its own `package.json`/`node_modules`) that duplicates the email-sending logic; it is not wired into the CRA app or into deployment — treat it as legacy/unused unless told otherwise.

## Architecture

This is a single-tenant-per-login, multi-tenant-by-data SaaS for freelancers/consultancies to track billable hours (`servicos_prestados`), clients, and generate invoicable reports. Frontend is a Create React App (React 19) + Tailwind app talking directly to **Supabase** (Postgres + Auth) from the browser; there is no custom backend API except the email-sending function.

### State ownership: `App.js` is the hub

`src/App.js` (~2500 lines) owns essentially all cross-cutting state (session, user role, loaded services/clients/channels/demands, filters, form data, modals) and all Supabase read/write calls (`carregarDados`, `salvarServico`, `salvarCliente`, etc.). Components under `src/components/` are largely presentational/controlled — they receive data and callbacks as props rather than fetching their own data. When adding a feature, the data-loading and mutation logic usually belongs in `App.js`, not in the component.

### Multi-tenancy & roles

- Every business row (services, clients, channels, demands) is scoped by `consultoria_id` (the tenant/"consultoria"). Data loads always filter `.eq('consultoria_id', meuId)` where `meuId = profileData.consultoria_id`.
- Row Level Security (RLS) in Supabase is the real access boundary; client-side role checks in `App.js`/`Sidebar.js` control which UI/tabs are shown but are not the security layer.
- Role resolution (see `carregarDados` in `App.js` and the equivalent logic in `Sidebar.js`) reads `profiles.role`/`profiles.cargo` and normalizes to one of: `super_admin`, `admin`, `dono`, `gp`, `consultor`. Roles `admin`/`dono`/`super_admin` are treated as `isAdmin`; `gp` is a limited operational-management role that can see team-wide services but has financial fields (`valor_hora`, `valor_total`) stripped from the query result before it reaches state (`servicosSeguros` in `carregarDados`) — this is a deliberate server-response scrub, not just a UI hide.
- `canViewFinancial` (admin/dono/super_admin/consultor) gates whether monetary fields are shown/editable/exported; `isSuperAdmin` gates the platform-admin tabs (`admin-tenants`, `admin-finance`, `admin-plans`) used to manage tenants/billing across the whole platform.
- Blocked-access states (`usuario_bloqueado`, `consultoria_bloqueada`) short-circuit rendering to `AccessDenied` before the main app renders.

### Reports & email flow

- `src/utils/gerarRelatorioPDF.js` and `gerarRelatorioExcel.js` build client-side PDF (jsPDF/autotable) and Excel (SheetJS) exports from filtered service data; the "sem valores" (no-financial-values) variant is enforced whenever `canViewFinancial` is false.
- Emailing a report (`handleEnviarEmail` in `App.js`) resolves each service's `solicitante` to a `solicitantes` record, routes to the solicitante's `coordenador_id` (manager) as primary recipient with the solicitante CC'd if both have emails, groups services per resulting recipient, generates one PDF per group, base64-encodes it client-side, and POSTs to `/api/enviar-email` (Vercel function using `nodemailer` + Gmail, credentials from `EMAIL_USER`/`EMAIL_PASS` env vars).

### Persisted UI state

Active tab and filters persist to `localStorage` (`lastActiveTab`, `filtrosConsultFlow`) and are restored on load. Modal open/close and tab navigation are also mirrored into `window.history` (`pushState`/`popstate`) so the mobile/browser back button closes modals or returns to the dashboard instead of leaving the app.

### Environment variables

`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY` (CRA client-side, embedded in the build), `EMAIL_USER`, `EMAIL_PASS` (server-side only, used by `api/enviar-email.js`).

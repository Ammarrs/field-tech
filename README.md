# متابعة الشغل

Field technician dashboard for tracking printer installations, branch switch locations,
transport and tool expenses, and weekly/monthly payments. Arabic RTL, light and dark mode,
responsive from phones to desktops.

## Run it

    npm install
    npm run dev

Build for production:

    npm run build
    npm run preview

## Screens

- Dashboard: weekly earnings, received amount, remaining for the month, monthly expenses,
  payment status badge, recent visits.
- Installations: log printers per day per branch, auto total, weekly and period summaries.
- Expenses: date, governorate, branch, place, transport, tools (name and price), filters and totals.
- Branches: name, governorate, floor, room, rack, install date, status. Search and governorate filter.
- Payments: weekly 50% advance per week with a paid toggle, month-end balance toggle, monthly totals.
- History: chronological timeline of visits grouped by month.
- Settings: daily printer rate (default 200 EGP), weekly payment percentage (default 50%),
  theme, and data reset.

## Business rules

- A week runs Saturday to Friday, identified by its Saturday start date.
- Each installation stores the rate it was logged at, so changing the rate in Settings
  does not rewrite past entries.
- Weekly advance = week earnings x payment percentage, rounded. The rest is the weekly balance.
- A month's totals are the weeks that start in that month.
- Remaining = month earnings minus what has been received (paid advances, plus the month-end
  balance once it is marked received).

## Storage

All data is saved in the browser's localStorage under the key `fieldtech-dashboard-v1`.
Replace the store in `src/store.jsx` with an API call when you add a backend.

## Structure

    src/
      App.jsx              shell: sidebar, mobile drawer, routing by state
      store.jsx            global state, localStorage persistence, actions
      lib/format.js        dates, weeks, money formatting
      lib/calc.js          earnings, payments, visit timeline calculations
      components/ui.jsx    shared component set (cards, KPIs, badges, tables, modal, switch, period selector)
      pages/*.jsx          one file per screen
      styles.css           tokens for light and dark themes, responsive rules

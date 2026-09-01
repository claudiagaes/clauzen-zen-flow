# Clauzen: Your Money Zen

Build a personal expense tracking dashboard called Clauzen — tagline: "Calm over your money."

Target user: MBA students and young professionals who want to track expenses without stress.

Brand personality: Zen, minimal, clean, calming but smart. Like if Headspace and a finance app had a baby.

Tech stack: React + TypeScript + Tailwind CSS + shadcn/ui + Supabase

Design language:

- Soft, calming color palette: sage green, warm beige, soft cream, muted lavender, with dark charcoal text

- NO harsh whites or aggressive blues

- Rounded corners everywhere — cards, buttons, inputs

- Generous whitespace — breathable layouts

- Soft shadows, no hard borders

- Typography: clean sans-serif, calm and readable (Inter or DM Sans)

- Subtle animations (fade ins, soft transitions)

- Light mode primarily, with a clean soft dark mode option

- Use 🧘 as the brand emoji/icon

- Category chips with soft pastel colors

Supabase tables already exist:

- expenses (id, date, description, total_amount, currency, category, paid_by, is_shared, event_tag, splitwise_expense_id, splitwise_group_id, notes, receipt_image_url, created_at)

- expense_splits (id, expense_id, person_name, amount_owed, is_paid)

- expense_items (id, expense_id, item_name, amount, assigned_to)

Dashboard pages/sections:

1. Overview (Home)

- Warm greeting at top: "Hey Claudia, here's your money zen 🧘"

- Month picker (soft, minimal design)

- Total spent this month — big calm number

- Spending by category — soft pastel donut chart

- Recent expenses (clean card list)

2. Expenses

- Filter by: month, date range, category, event tag, currency

- Clean table/card list: date, description, amount, category, event tag

- Expandable rows to see items + splits

3. People & Balances

- Soft cards per person

- Green = they owe you, soft red/pink = you owe them

- Calm, non-stressful visual (no alarming colors)

4. Trips & Events

- Beautiful card grid of all event tags

- Each card: event name, total spent, date range, top category

- Click to drill down — full trip breakdown

5. Analytics

- Monthly trend line chart (soft curves, not sharp)

- Category breakdown bar chart

- Calm insights: "You spent most on 🍽️ Food this month"

Categories with soft pastel chips:

🍽️ Food & Dining, 🍺 Drinks, 🛒 Groceries, 🛍️ Shopping, 🚗 Transport, ✈️ Travel, 🏠 Rent, 💡 Bills, 🎬 Entertainment, 💊 Health, 🎓 Education, 🐾 Pets, 🧹 Home, 🎁 Gifts, 📦 Other

Logo/header: "Clauzen 🧘" in soft charcoal, elegant font. Tagline below: "Calm over your money."

Important: Read-only dashboard — data is written by an external AI agent. No expense entry forms needed.

---

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://clauzen-zen-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c50100db-4fab-4f57-96be-6eb2b575caa3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

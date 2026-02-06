This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

````bash
# TRACCAR

Next.js app scaffolded from create-next-app and using the shadcn UI template with Tailwind CSS.

## Key libraries & conventions
- UI/template: shadcn (components + Radix primitives)
- Styling: Tailwind CSS
- Tables: react-tanstack (React Table / TanStack Table)
- Icons: Iconify (https://icon-sets.iconify.design/) or lucide-chart
- Date formatting: date-fns

## Requirements
- Node.js v16+ (recommended)
- npm, yarn, pnpm, or bun
- Git (optional)

## Quick start (development)
Install dependencies and run the dev server:

```bash
# install (choose one)
npm install
# or
yarn
# or
pnpm install
# or
bun install

# run dev server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
````

Open http://localhost:3000 in your browser.

## Important scripts

- Build for production:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

- Run built app:

```bash
npm start
# or
yarn start
# or
pnpm start
```

- Lint & format:

```bash
npm run lint
npm run format
```

## Project structure (overview)

- app/ — Next.js App Router routes, layouts, pages
- components/ — shared UI components (shadcn-based)
- lib/ or utils/ — helpers, API clients, date utilities
- public/ — static assets
- styles/ — Tailwind/global CSS
- package.json — scripts and dependencies

Notes:

- Tables use react-tanstack — check components/tables for examples and column definitions.
- Icons can be used via Iconify or lucide-chart; import as needed in components.
- Use date-fns for formatting dates (see utils/date.js).

Example date-fns usage:

```js
import { format } from "date-fns";
format(new Date(), "yyyy-MM-dd");
```

## Environment variables

Keep sensitive values in `.env.local` (do not commit). Example:

```
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Deployment

Vercel is recommended for the best Next.js integration. You can also deploy to any Node.js-compatible provider (Docker, Netlify, Fly, etc.). See Next.js docs for deployment details: https://nextjs.org/docs/deployment

## Learn more

- Next.js docs: https://nextjs.org/docs
- shadcn UI: https://ui.shadcn.com
- TanStack Table: https://tanstack.com/table
- Iconify icon sets: https://icon-sets.iconify.design/
- date-fns: https://date-fns.org

## Contributing

Fork the repo, create a feature branch, and open a PR with a clear description and reproduction steps.

If you want a more detailed README (CI setup, example env, component docs, or API contract), tell me what to include.

# or

yarn dev

# or

pnpm dev

# or

bun dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
```

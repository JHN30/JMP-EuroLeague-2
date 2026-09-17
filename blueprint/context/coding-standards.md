# Coding Standards

The backend is Node.js, Express, and strict TypeScript. The frontend is Vite,
React, and JavaScript. PostgreSQL access uses Drizzle ORM and `pg`; frontend
server state uses TanStack Query and HTTP requests use Axios. Follow the
existing small project structure until a feature needs more folders.

Both apps use npm with separate `package-lock.json` files. Run package
commands from the corresponding `backend` or `frontend` directory.

## Backend: Node.js and TypeScript

- Keep backend code under `backend/src` and use `.ts` files.
- Preserve `strict` TypeScript. Prefer inferred types where clear and explicit
  types at module, request, and database boundaries. Use `unknown` and narrow
  it instead of using `any`.
- Use the existing Node16/CommonJS compilation settings unless a separate
  change deliberately updates the module system.
- Read environment values through `backend/src/config/env.ts`. Validate
  required values at startup before using them for a connection or server.
- Keep Express route handlers focused on HTTP concerns. Put reusable business
  and database logic outside handlers when it is needed by more than one route.
- Validate request body, query, and path values before using them. No runtime
  validation library is installed, so do not assume Zod or another package.
- Return appropriate HTTP status codes and a consistent JSON error shape for
  API failures. Do not expose stack traces, connection strings, or secrets.

## Database: Drizzle ORM and PostgreSQL

- Use Drizzle ORM with the installed `pg` driver for application database
  access. Keep schema definitions and database queries on the backend.
- When schema and Drizzle Kit configuration are added, use versioned migrations:
  `drizzle-kit generate` to create them and `drizzle-kit migrate` to apply
  them. Commit generated SQL and migration metadata with schema changes.
- Do not use schema push as a substitute for reviewed migrations once the
  project starts tracking migrations.
- Parameterize values through Drizzle or the driver. If authentication and
  user-owned data are added, scope reads and writes to the authenticated user
  on the server.
- There is no schema, `drizzle.config.ts`, or migration script yet. Add and
  document the actual commands when database work begins.

## Frontend: React and JavaScript

- Use `.jsx` for React components and `.js` for plain modules under
  `frontend/src`. Use functional components and hooks.
- Keep components focused. Extract a component or custom hook when behavior is
  reused or a screen becomes difficult to read.
- Use React Router for client-side navigation as routes are added.
- Use local React state for UI state and TanStack Query for remote server state.
  Avoid copying query data into local state without a specific need.
- Use the shared Axios client in `frontend/src/lib/axios.js` for backend
  requests. Keep endpoint calls separate from presentation components when
  they are reused.
- Give each query a stable array key that includes every parameter affecting
  its result. Use mutations for writes and update or invalidate affected query
  data after success.
- Handle loading, empty, and error states in screens that request data.

## File Organization and Naming

- Keep backend entry and configuration code in `backend/src`; add route,
  service, and database modules only as their responsibilities appear.
- Keep frontend entry code in `frontend/src/main.jsx`, screens and components
  in `frontend/src`, and shared clients or helpers in `frontend/src/lib`.
  Add feature folders when they make navigation easier.
- Name React components in PascalCase (`MatchCard.jsx`), functions and
  variables in camelCase, constants in SCREAMING_SNAKE_CASE, and TypeScript
  types or interfaces in PascalCase.

## Styling and Accessibility

- Use Tailwind CSS v4 utilities and DaisyUI components for shared UI patterns.
  The CSS-first setup lives in `frontend/src/index.css`; do not add a
  `tailwind.config.js` without a concrete need.
- Keep the custom `light-euroleague` and `dark-euroleague` DaisyUI themes
  in the CSS theme plugin blocks. Use theme tokens rather than hard-coded
  colors in components.
- Use CSS for reusable or complex styling. Avoid inline styles unless a value
  genuinely depends on runtime data.
- Support keyboard navigation, visible focus, semantic labels, readable color
  contrast, and responsive layouts in both themes.

## Testing

Neither package currently has a test script or test runner. Testing is opt-in
through a planned setup task or `/tests`. Choose a runner compatible with the
Node.js/TypeScript backend and Vite/JavaScript frontend, add a small meaningful
test, and record the exact commands in `AGENTS.md`.

When `AGENTS.md` declares a `Verify` command, treat it as the umbrella automated
gate. It combines only the checks this project actually has, in this order when
available: typecheck, tests, then build. The command does not enable an absent
test runner or replace focused evidence. It gives local work and optional CI one
exact command to run. `/ci` owns Verify and CI setup. `/tests` adds the real test
command to Verify when it already exists, but never creates CI only because
testing was configured.

**The opt-in switch is one signal: a `test` command in the Commands section of
`AGENTS.md`.** Declare one and **tests become a gate for logic-bearing steps**,
not an optional extra; leave it out and the loop verifies logic with the evidence
it already uses (run it, a screenshot, the build). Adding the runner is itself a
deliberate step, never a silent mid-step install. This is the single definition
of the switch; the skills and `ai-interaction.md` only point back here.

- **What to test (the scope rule):** logic with assertable inputs and outputs,
  such as parsers, formatters, request validation, data transforms, and domain
  rules. Include real edge cases (empty, missing, malformed).
- **What not to test with unit tests:** visual styling, browser navigation,
  database integration, or live HTTP behavior. Verify these with an appropriate
  browser, API, integration, or build check instead of brittle unit tests.
- **The gate (when a runner is configured):** a build step that adds in-scope logic
  must ship a passing test in the same reviewable diff. The project's test command
  must be green before the step is approved, before any checkpoint commit, and
  before `/complete` merges. UI and integration-only steps use browser, API,
  and build evidence appropriate to the change.
- **When it's named:** the `/feature` spec's Testing section predicts the coverage,
  `/implement` writes the test with the step, and if a step surfaces logic the spec
  didn't foresee, add a focused test then.
- An empty suite should fail, not pass, so "no tests ran" never looks like "passed".
- Test files live next to source files (for example `feature.test.ts` on the
  backend and `feature.test.js` on the frontend).
- Run them via the project's test command (see Commands in `AGENTS.md`), not a
  hardcoded tool name.

Do not assume a specific runner, mock API, or browser harness until the
corresponding setup is installed and documented.

## Browser Verification

For UI and integration behavior, prefer real browser evidence over reading the
code and assuming it works.

- Browser automation is separately opt-in through `/tests browser`. That setup
  reuses a compatible runner or prefers Playwright for supported projects, then
  documents the exact command as `Browser tests` in `AGENTS.md`.
- When `Browser tests` is declared, add focused coverage for stable behavioral
  done-whens when it is proportionate, and run the documented command during
  `/check`. Do not assume it proves visual fidelity, real authenticated-profile
  behavior, browser chrome, or another claim the test does not observe.
- If no Browser tests command is declared, do not add a runner silently in the
  middle of an unrelated feature. Use the available dev server, browser
  screenshots, build output, API output, or manual evidence instead.
- Browser tests are not part of the default Verify command or CI unless the user
  separately chooses that slower gate.
- Browser evidence is especially important for flows that click, type, submit,
  navigate, download files, render complex layouts, or depend on client-side
  state.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.

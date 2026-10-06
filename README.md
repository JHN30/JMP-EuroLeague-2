# JMP EuroLeague

**JMP EuroLeague** is a data-driven web application for exploring EuroLeague basketball seasons. It brings standings, games, teams, players, leaders, comparisons, and the postseason bracket together in one interactive interface.

**Live App:** https://www.jmpeuroleague.com/

---

## Motivation

My main goal was to create a clear and fun way to follow a EuroLeague season.

Basketball produces a huge amount of data, but a table full of numbers rarely tells you who is actually playing well. Unless you already love statistics, it is hard to see what is going on.

I wanted to present that data in a clear, concise, and understandable way, so that even someone who is not crazy about statistics can look at a page and see what is going on, who is good, and who is bad.

I also wanted the statistics to be easy to read for everyone, even the advanced ones. A number should come with enough context (a league rank, a clear visual, a plain explanation) that you can tell at a glance whether it is good, average, or bad.

JMP EuroLeague puts the results, the statistics, and the context around them in one place. The goal is to give both myself and other fans an intuitive understanding of a season, from a single game to the road to the title, without needing to dig through endless data.

---

## Quick Start

### Use the Live App
1. Open https://www.jmpeuroleague.com/
2. Explore the pages.

Use the season selector at the top to switch between seasons.

Navigate to Compare to start from the games of the coming round, or to Postseason to see the bracket.

---

## Usage

### Core Features

- **Home**  
  Standings, recent results, upcoming games, and statistical leaders at a glance.

- **Standings**  
  Track official rankings, records, form, and advanced views by phase.

- **Games**  
  Browse results and fixtures by round, with full box scores, shot charts, and play-by-play.

- **Teams**  
  Explore a club's snapshot, statistics, roster, shooting, advanced numbers, and games.

- **Players**  
  Explore a player's overview, career, statistics, advanced numbers, shooting, and games.

- **Leaders**  
  Rank players, teams, and advanced metrics, with filters and a view of who is hot right now.

- **Compare**  
  Compare any two teams or players, or start from a coming game.

- **Postseason**  
  Follow the Play-In, Playoffs, and Final Four bracket, or see how it would look from the current standings.

---

### Data

Every number comes from a curated data pipeline that publishes to a PostgreSQL database. The app reads those tables as published instead of recomputing them.

Key concepts:
- Four seasons, 2023-24 to 2026-27
- Qualified players (a minimum of games) for rankings and leaders
- Advanced statistics (PER, Win Shares, RAPM, on/off) shown with their sample size

JMP Rating, win probabilities, and a Predictor are planned for a later phase:  
https://github.com/JHN30/JMP-Rating

---

### Tech Stack

**Frontend**
- React
- Vite
- React Router
- TanStack Query
- TailwindCSS + DaisyUI
- Chart.js
- Motion

**Backend**
- Node.js
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL

**Testing**
- Playwright

**Infrastructure**
- Neon (database)
- Render (deployment)
- Cloudflare (domain)

---

## Contributing

Contributions are welcome, but there are a few things to keep in mind.

This project relies on:
- A private database (seasons, games, players, ratings, etc.)
- A data pipeline that fills it
- A deployed domain (Cloudflare)

Because of this, running the full application locally requires additional setup and access that is not included in the public repository.

### What you *can* do

You can still:
- Explore and improve the frontend (UI/UX, components, styling)
- Review and suggest improvements to the pages and the statistics shown
- Suggest optimizations and improvements in general
- Open issues for bugs or feature ideas

### Running locally (limited mode)

You can run the project locally with your own configuration:
- Provide your own PostgreSQL instance
- Replace the connection string in `.env`
- Mock or seed your own data for testing (the tables the API reads are described in `DATA_DICTIONARY.md`)

### Contributing workflow

```bash
# Clone the repository
git clone https://github.com/JHN30/JMP-EuroLeague-2.git
cd JMP-EuroLeague-2

# Install dependencies (each app has its own package.json)
cd backend
npm install
cd ../frontend
npm install
cd ..

# Start backend (from root directory)
cd backend
npm run dev

# Start frontend (from root directory and in separate terminal)
cd frontend
npm run dev

# Or, from the root directory, run both apps with one command
npm run dev          # both dev servers
npm run build        # build both apps
npm start            # run both built apps (API plus frontend preview)

# Check the frontend (from frontend directory)
npm run lint
npm run build

# Run the browser tests (from frontend directory)
npm run test:browser

# Check the backend (from backend directory)
npm run build
```

If you'd like to contribute:
- Fork the repository
- Create a feature branch
- Open a pull request to `main`

---

If you're interested in deeper collaboration or need access to certain parts of the system, feel free to reach out.

### Environment Variables

Create a `.env` file in the `backend` directory (`.env.example` shows the format):

```bash
PORT=3000
NODE_ENV=development

DB_URL=your_postgres_connection_string

FRONTEND_URL=http://localhost:5173
```

The frontend reads one optional variable, `VITE_API_URL` (default `http://localhost:3000/api`). It is public, so it must never hold a secret.

---

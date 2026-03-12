# Blog Aggregator (Gator)

A command-line RSS feed aggregator built with TypeScript and PostgreSQL. Add RSS feeds, scrape them on a schedule, and browse the latest posts — all from your terminal.

---

## What You'll Need

Before running the program, make sure you have the following installed:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** — comes bundled with Node.js
- **PostgreSQL** — a running Postgres instance, either locally or hosted (e.g. [Railway](https://railway.app), [Supabase](https://supabase.com))
- **Git** — to clone the repository

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/blog-aggregator.git
cd blog-aggregator
npm install
```

---

## Configuration

The program reads its settings from a config file in your home directory. Create the file at `~/.gatorconfig.json` with your PostgreSQL connection string:

```json
{
  "db_url": "postgres://your_user:your_password@localhost:5432/gator"
}
```

Replace `your_user`, `your_password`, and `gator` with your actual database credentials and database name.

---

## Database Setup

Run the migrations to create all the required tables:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Running the Program

All commands follow this pattern:

```bash
npm run start <command> [arguments]
```

### 1. Create a user

Before doing anything else, register a user. This also sets them as the "current" user:

```bash
npm run start register alice
```

To switch between users later:

```bash
npm run start login alice
```

### 2. Add RSS feeds

Add a feed by giving it a name and a URL. You'll automatically follow it:

```bash
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
npm run start addfeed "Boot.dev Blog" "https://www.boot.dev/blog/index.xml"
npm run start addfeed "TechCrunch" "https://techcrunch.com/feed/"
```

### 3. Scrape feeds

Start the aggregator loop. It fetches feeds on the interval you specify and saves new posts to the database. Press `Ctrl+C` to stop:

```bash
npm run start agg 30s   # scrape every 30 seconds
npm run start agg 1m    # scrape every minute
npm run start agg 1h    # scrape every hour
```

### 4. Browse posts

In a separate terminal, browse the latest posts from the feeds you follow:

```bash
npm run start browse      # shows the 2 most recent posts
npm run start browse 10   # shows the 10 most recent posts
```

### 5. Manage follows

```bash
npm run start following                               # list feeds you follow
npm run start follow "https://techcrunch.com/feed/"   # follow a feed by URL
npm run start unfollow "https://techcrunch.com/feed/" # unfollow a feed
npm run start feeds                                   # list all feeds in the system
```

---

## All Commands

| Command | Description |
|---|---|
| `register <name>` | Create a new user |
| `login <name>` | Switch to an existing user |
| `users` | List all users |
| `reset` | Reset the database |
| `addfeed <name> <url>` | Add a feed and follow it |
| `feeds` | List all feeds |
| `follow <url>` | Follow a feed by URL |
| `unfollow <url>` | Unfollow a feed by URL |
| `following` | List feeds you follow |
| `agg <interval>` | Start the scraper loop |
| `browse [limit]` | Browse latest posts (default: 2) |

---
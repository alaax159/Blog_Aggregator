# Blog Aggregator (Gator)

A command-line RSS feed aggregator built with TypeScript, Node.js, PostgreSQL, and Drizzle ORM. Follow RSS feeds, scrape them on a schedule, and browse the latest posts — all from your terminal.

---

## Features

- Register and manage multiple users
- Add RSS feeds and automatically follow them
- Follow or unfollow any feed by URL
- Continuously scrape feeds in the background on a configurable interval
- Browse the latest posts from feeds you follow
- Many-to-many user/feed relationships via a `feed_follows` joining table
- Duplicate-safe post storage (re-scraping never creates duplicates)

---

## Tech Stack

- **Runtime**: Node.js + TypeScript (`tsx`)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **RSS Parsing**: `fast-xml-parser`

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a remote connection string)
- A `~/.gatorconfig.json` config file (see setup below)

---

## Installation

```bash
git clone https://github.com/your-username/blog-aggregator.git
cd blog-aggregator
npm install
```

### Config file

Create `~/.gatorconfig.json` with your database connection string:

```json
{
  "db_url": "postgres://user:password@localhost:5432/gator"
}
```

### Run migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Usage

All commands are run via:

```bash
npm run start <command> [args]
```

### User commands

| Command | Description |
|---|---|
| `register <name>` | Create a new user and set them as current |
| `login <name>` | Switch to an existing user |
| `users` | List all users |
| `reset` | Delete all users and reset the database |

### Feed commands

| Command | Description |
|---|---|
| `addfeed <name> <url>` | Add a new feed and automatically follow it |
| `feeds` | List all feeds and their creators |
| `follow <url>` | Follow an existing feed by URL |
| `unfollow <url>` | Unfollow a feed by URL |
| `following` | List all feeds the current user follows |

### Aggregator commands

| Command | Description |
|---|---|
| `agg <interval>` | Start the feed scraper loop (e.g. `10s`, `1m`, `1h`) |
| `browse [limit]` | Show the latest posts from followed feeds (default: 2) |

---

## Example Workflow

```bash
# Set up a user
npm run start register alice

# Add some feeds (automatically followed)
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
npm run start addfeed "Boot.dev Blog" "https://www.boot.dev/blog/index.xml"

# Follow a feed added by another user
npm run start follow "https://techcrunch.com/feed/"

# Start scraping in the background (Ctrl+C to stop)
npm run start agg 30s

# In another terminal, browse the latest posts
npm run start browse 10
```

---

## Database Schema

```
users
  id, created_at, updated_at, name (unique)

feeds
  id, created_at, updated_at, name, url (unique), user_id, last_fetched_at

feed_follows
  id, created_at, updated_at, user_id, feed_id
  UNIQUE(user_id, feed_id)

posts
  id, created_at, updated_at, title, url (unique), description, published_at, feed_id
```

---

## Project Structure

```
src/
├── index.ts                     # Entry point, command registration
├── commands.ts                  # All command handlers + middleware
├── config.ts                    # Config file read/write
├── rss.ts                       # RSS feed fetcher and parser
└── lib/
    └── db/
        ├── index.ts             # Drizzle DB connection
        ├── schema.ts            # Table definitions
        └── queries/
            ├── users.ts
            ├── feeds.ts
            ├── feed_follows.ts
            └── posts.ts
```

---

## License

MIT

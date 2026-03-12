import { readConfig, setUser } from "./config.js";
import { fetchFeed } from "./rss.js";

import { createUser, deleteAllUsers, getUserByName, getUsers } from "./lib/db/queries/users.js";
import { createFeed, getFeedsWithUsers, getFeedByUrl, markFeedFetched, getNextFeedToFetch } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./lib/db/queries/feed_follows.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import type { User } from "./lib/db/schema.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = {
  [cmdName: string]: CommandHandler;
};

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) throw new Error(`unknown command: ${cmdName}`);
  await handler(cmdName, ...args);
}

// ---------------- middleware ----------------

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const cfg = readConfig();
    if (!cfg.currentUserName) throw new Error("no current user set");
    const user = await getUserByName(cfg.currentUserName);
    if (!user) throw new Error(`user ${cfg.currentUserName} not found`);
    await handler(cmdName, user, ...args);
  };
}

// ---------------- helpers ----------------

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);
  if (!match) throw new Error(`invalid duration: "${durationStr}" (examples: 1s, 30s, 1m, 1h)`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "ms": return value;
    case "s":  return value * 1000;
    case "m":  return value * 60 * 1000;
    case "h":  return value * 60 * 60 * 1000;
    default:   throw new Error(`unknown unit: ${unit}`);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h${m}m${s}s`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function parsePublishedAt(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  // Try multiple common RSS date formats
  const formats = [
    dateStr,                                         // ISO 8601 or RFC 2822 direct parse
    dateStr.replace(/(\+\d{4})$/, " $1"),            // fix missing space before tz offset
  ];
  for (const str of formats) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function handleError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`error: ${msg}`);
}

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("no feeds to fetch");
    return;
  }

  console.log(`Fetching feed: ${feed.name} (${feed.url})`);
  await markFeedFetched(feed.id);

  try {
    const rssFeed = await fetchFeed(feed.url);
    let saved = 0;

    for (const item of rssFeed.channel.item) {
      const post = await createPost({
        title: item.title,
        url: item.link,
        description: item.description ?? null,
        publishedAt: parsePublishedAt(item.pubDate),
        feedId: feed.id,
      });
      if (post) saved++;
    }

    console.log(`  Saved ${saved} new posts from "${feed.name}"`);
  } catch (err) {
    handleError(err);
  }
}

// ---------------- handlers ----------------

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) throw new Error("username is required");
  const username = args[0];
  const user = await getUserByName(username);
  if (!user) throw new Error("user does not exist");
  setUser(username);
  console.log(`current user set to "${username}"`);
}

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) throw new Error("name is required");
  const name = args[0];
  const existing = await getUserByName(name);
  if (existing) throw new Error("user already exists");
  const user = await createUser(name);
  setUser(name);
  console.log(`user "${name}" created`);
  console.log(user);
}

export async function handlerReset(cmdName: string, ...args: string[]): Promise<void> {
  await deleteAllUsers();
  console.log("database reset");
}

export async function handlerUsers(cmdName: string, ...args: string[]): Promise<void> {
  const cfg = readConfig();
  const current = cfg.currentUserName;
  const all = await getUsers();
  for (const u of all) {
    const suffix = current && u.name === current ? " (current)" : "";
    console.log(`* ${u.name}${suffix}`);
  }
}

export async function handlerAgg(cmdName: string, ...args: string[]): Promise<void> {
  if (args.length < 1) throw new Error("time_between_reqs is required (e.g. 1s, 1m, 1h)");
  const timeBetweenRequests = parseDuration(args[0]);

  console.log(`Collecting feeds every ${formatDuration(timeBetweenRequests)}`);

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) throw new Error("name and url are required");
  const [name, url] = args;
  const feed = await createFeed(name, url, user.id);
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(`Feed: ${follow.feedName}`);
  console.log(`User: ${follow.userName}`);
}

export async function handlerFeeds(cmdName: string, ...args: string[]): Promise<void> {
  const rows = await getFeedsWithUsers();
  for (const r of rows) {
    console.log(`* ${r.feedName}`);
    console.log(`  ${r.feedUrl}`);
    console.log(`  added by ${r.userName}`);
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) throw new Error("url is required");
  const [url] = args;
  const feed = await getFeedByUrl(url);
  if (!feed) throw new Error(`no feed found with url: ${url}`);
  const follow = await createFeedFollow(user.id, feed.id);
  console.log(`Feed: ${follow.feedName}`);
  console.log(`User: ${follow.userName}`);
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);
  if (follows.length === 0) {
    console.log("not following any feeds");
    return;
  }
  for (const f of follows) {
    console.log(`* ${f.feedName}`);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) throw new Error("url is required");
  const [url] = args;
  await deleteFeedFollow(user.id, url);
  console.log(`unfollowed ${url}`);
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const limit = args.length > 0 ? parseInt(args[0], 10) : 2;
  if (isNaN(limit) || limit < 1) throw new Error("limit must be a positive number");

  const userPosts = await getPostsForUser(user.id, limit);
  if (userPosts.length === 0) {
    console.log("no posts found - try running `agg` first");
    return;
  }

  for (const post of userPosts) {
    console.log(`----------------------------------------`);
    console.log(`Title:       ${post.title}`);
    console.log(`URL:         ${post.url}`);
    console.log(`Published:   ${post.publishedAt?.toISOString() ?? "unknown"}`);
    if (post.description) {
      const snippet = post.description.slice(0, 120).replace(/\s+/g, " ").trim();
      console.log(`Description: ${snippet}${post.description.length > 120 ? "..." : ""}`);
    }
  }
  console.log(`----------------------------------------`);
}
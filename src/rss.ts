import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSChannel = {
  title: string;
  link: string;
  description: string;
  item: RSSItem[];
};

export type RSSFeed = {
  channel: RSSChannel;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const res = await fetch(feedURL, {
    headers: { "User-Agent": "gator" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch feed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed: any = parser.parse(xml);

  const channel = parsed?.rss?.channel;
  if (!channel || typeof channel !== "object") {
    throw new Error("feed missing channel");
  }

  const title = channel.title;
  const link = channel.link;
  const description = channel.description;

  if (!isNonEmptyString(title) || !isNonEmptyString(link) || !isNonEmptyString(description)) {
    throw new Error("feed channel missing required fields");
  }

  const rawItems = channel.item;
  let itemsArr: any[] = [];
  if (Array.isArray(rawItems)) itemsArr = rawItems;
  else if (rawItems && typeof rawItems === "object") itemsArr = [rawItems];

  const items: RSSItem[] = [];
  for (const it of itemsArr) {
    const itTitle = it?.title;
    const itLink = it?.link;
    const itDesc = it?.description;
    const itPub = it?.pubDate;

    if (
      !isNonEmptyString(itTitle) ||
      !isNonEmptyString(itLink) ||
      !isNonEmptyString(itDesc) ||
      !isNonEmptyString(itPub)
    ) {
      continue;
    }

    items.push({
      title: itTitle,
      link: itLink,
      description: itDesc,
      pubDate: itPub,
    });
  }

  return {
    channel: { title, link, description, item: items },
  };
}
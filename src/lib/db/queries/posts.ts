import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { posts, feedFollows } from "../schema.js";

export type CreatePostParams = {
  title: string;
  url: string;
  description?: string | null;
  publishedAt?: Date | null;
  feedId: string;
};

export async function createPost(params: CreatePostParams) {
  const [post] = await db
    .insert(posts)
    .values({
      title: params.title,
      url: params.url,
      description: params.description ?? null,
      publishedAt: params.publishedAt ?? null,
      feedId: params.feedId,
    })
    .onConflictDoNothing()
    .returning();
  return post ?? null;
}

export async function getPostsForUser(userId: string, limit: number = 2) {
  // Get feed IDs the user follows
  const follows = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  if (follows.length === 0) return [];

  const feedIds = follows.map((f) => f.feedId);

  return db
    .select()
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}
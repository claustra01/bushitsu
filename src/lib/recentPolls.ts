import type { PollDto } from "./schema";

const RECENT_POLLS_KEY = "bushitsu:recent-polls:v1";
const MAX_RECENT_POLLS = 10;

export type RecentPoll = {
  slug: string;
  title: string;
  description: string | null;
  isClosed: boolean;
  updatedAt?: string;
  lastAccessedAt: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isRecentPoll(value: unknown): value is RecentPoll {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    (typeof item.description === "string" || item.description === null) &&
    typeof item.isClosed === "boolean" &&
    typeof item.lastAccessedAt === "string" &&
    (item.updatedAt === undefined || typeof item.updatedAt === "string")
  );
}

export function readRecentPolls(storage: StorageLike = window.localStorage): RecentPoll[] {
  try {
    const raw = storage.getItem(RECENT_POLLS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecentPoll).slice(0, MAX_RECENT_POLLS);
  } catch {
    return [];
  }
}

export function saveRecentPoll(
  poll: PollDto,
  storage: StorageLike = window.localStorage,
  now = new Date()
): RecentPoll[] {
  const nextItem: RecentPoll = {
    slug: poll.slug,
    title: poll.title,
    description: poll.description,
    isClosed: poll.isClosed,
    updatedAt: poll.updatedAt,
    lastAccessedAt: now.toISOString()
  };

  const nextItems = [
    nextItem,
    ...readRecentPolls(storage).filter((item) => item.slug !== poll.slug)
  ].slice(0, MAX_RECENT_POLLS);

  try {
    storage.setItem(RECENT_POLLS_KEY, JSON.stringify(nextItems));
  } catch {
    return nextItems;
  }

  return nextItems;
}

export function removeRecentPoll(slug: string, storage: StorageLike = window.localStorage): RecentPoll[] {
  const nextItems = readRecentPolls(storage).filter((item) => item.slug !== slug);

  try {
    storage.setItem(RECENT_POLLS_KEY, JSON.stringify(nextItems));
  } catch {
    return nextItems;
  }

  return nextItems;
}

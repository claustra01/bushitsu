import { describe, expect, it } from "vitest";
import { readRecentPolls, saveRecentPoll } from "../src/lib/recentPolls";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("recent polls", () => {
  it("stores the latest poll first", () => {
    const storage = new MemoryStorage();

    saveRecentPoll(
      {
        slug: "old",
        title: "古い予定",
        description: null,
        isClosed: false
      },
      storage,
      new Date("2026-05-01T00:00:00.000Z")
    );
    saveRecentPoll(
      {
        slug: "new",
        title: "新しい予定",
        description: null,
        isClosed: false
      },
      storage,
      new Date("2026-05-02T00:00:00.000Z")
    );

    expect(readRecentPolls(storage).map((item) => item.slug)).toEqual(["new", "old"]);
  });

  it("deduplicates by slug", () => {
    const storage = new MemoryStorage();

    saveRecentPoll(
      {
        slug: "same",
        title: "最初のタイトル",
        description: null,
        isClosed: false
      },
      storage,
      new Date("2026-05-01T00:00:00.000Z")
    );
    saveRecentPoll(
      {
        slug: "same",
        title: "更新後タイトル",
        description: "説明",
        isClosed: true
      },
      storage,
      new Date("2026-05-02T00:00:00.000Z")
    );

    expect(readRecentPolls(storage)).toEqual([
      {
        slug: "same",
        title: "更新後タイトル",
        description: "説明",
        isClosed: true,
        lastAccessedAt: "2026-05-02T00:00:00.000Z"
      }
    ]);
  });

  it("keeps at most ten items", () => {
    const storage = new MemoryStorage();

    for (let index = 0; index < 12; index += 1) {
      saveRecentPoll(
        {
          slug: `poll-${index}`,
          title: `予定 ${index}`,
          description: null,
          isClosed: false
        },
        storage,
        new Date(Date.UTC(2026, 4, index + 1))
      );
    }

    const recent = readRecentPolls(storage);
    expect(recent).toHaveLength(10);
    expect(recent[0]?.slug).toBe("poll-11");
    expect(recent.at(-1)?.slug).toBe("poll-2");
  });
});

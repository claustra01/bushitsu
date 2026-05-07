import { describe, expect, it } from "vitest";
import { cleanupExpiredPolls } from "../functions/_shared/store";
import { createDefaultPollConfig } from "../src/lib/schema";
import type { D1Database, D1PreparedStatement, D1Result } from "../functions/_shared/types";

class MockStatement implements D1PreparedStatement {
  readonly query: string;
  readonly values: unknown[] = [];
  private readonly pollRows: unknown[];

  constructor(query: string, pollRows: unknown[]) {
    this.query = query;
    this.pollRows = pollRows;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this.values.push(...values);
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return { success: true, results: this.pollRows as T[] };
  }

  async run(): Promise<D1Result> {
    return { success: true };
  }
}

describe("cleanupExpiredPolls", () => {
  it("deletes polls whose calendar end date is at least fourteen days old", async () => {
    const pollRows = [
      {
        slug: "old",
        config_json: JSON.stringify(
          createDefaultPollConfig({
            startDate: "2026-05-01",
            endDate: "2026-05-07"
          })
        )
      },
      {
        slug: "fresh",
        config_json: JSON.stringify(
          createDefaultPollConfig({
            startDate: "2026-05-08",
            endDate: "2026-05-08"
          })
        )
      }
    ];
    const preparedStatements: MockStatement[] = [];
    const batchedStatements: D1PreparedStatement[] = [];
    const db: D1Database = {
      prepare(query: string): D1PreparedStatement {
        const statement = new MockStatement(query, pollRows);
        preparedStatements.push(statement);
        return statement;
      },
      async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
        batchedStatements.push(...statements);
        return statements.map(() => ({ success: true }) as D1Result<T>);
      }
    };

    await cleanupExpiredPolls(db, new Date("2026-05-21T00:00:00+09:00"));

    expect(preparedStatements).toHaveLength(3);
    expect(preparedStatements[0]?.query).toContain("SELECT slug, config_json");
    expect(batchedStatements).toEqual(preparedStatements.slice(1));
    expect(preparedStatements[1]?.query).toContain("DELETE FROM responses");
    expect(preparedStatements[2]?.query).toContain("DELETE FROM polls");
    expect(preparedStatements[1]?.values).toEqual(["old"]);
    expect(preparedStatements[2]?.values).toEqual(["old"]);
  });
});

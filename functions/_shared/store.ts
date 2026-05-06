import { hashToken } from "../../src/lib/ids";
import {
  getEnabledSlotIds,
  makeResponseAnswersJson,
  type AnswersMap,
  type PollConfig,
  type PollDto,
  type ResponseDto
} from "../../src/lib/schema";
import { computeSummary } from "../../src/lib/summary";
import { validatePollConfig, validateResponseAnswersJson } from "../../src/lib/validation";
import { ApiError, assertApi, requireTokenPepper } from "./http";
import type { D1Database, Env } from "./types";

export type PollRow = {
  slug: string;
  title: string;
  description: string | null;
  config_json: string;
  admin_token_hash: string;
  is_closed: number;
  updated_at: string;
};

export type ResponseRow = {
  id: string;
  name: string;
  comment: string | null;
  answers_json: string;
  version: number;
  updated_at: string;
};

export async function findPoll(db: D1Database, slug: string): Promise<PollRow | null> {
  return db
    .prepare(
      `SELECT slug, title, description, config_json, admin_token_hash, is_closed, updated_at
       FROM polls
       WHERE slug = ?`
    )
    .bind(slug)
    .first<PollRow>();
}

export async function requirePoll(db: D1Database, slug: string): Promise<PollRow> {
  const poll = await findPoll(db, slug);
  assertApi(poll, 404, "POLL_NOT_FOUND", "指定された予定調整は見つかりません");
  return poll;
}

export async function findResponse(
  db: D1Database,
  slug: string,
  responseId: string
): Promise<ResponseRow | null> {
  return db
    .prepare(
      `SELECT id, name, comment, answers_json, version, updated_at
       FROM responses
       WHERE poll_slug = ?
         AND id = ?`
    )
    .bind(slug, responseId)
    .first<ResponseRow>();
}

export async function listResponses(db: D1Database, slug: string): Promise<ResponseRow[]> {
  const result = await db
    .prepare(
      `SELECT id, name, comment, answers_json, version, updated_at
       FROM responses
       WHERE poll_slug = ?
       ORDER BY updated_at DESC`
    )
    .bind(slug)
    .all<ResponseRow>();

  return result.results ?? [];
}

export function parsePollConfig(configJson: string): PollConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson) as unknown;
  } catch {
    throw new ApiError(500, "INTERNAL_ERROR", "保存済み設定の形式が正しくありません");
  }

  const config = validatePollConfig(parsed);
  if (!config.ok) {
    throw new ApiError(500, "INTERNAL_ERROR", "保存済み設定の形式が正しくありません");
  }

  return config.value;
}

export function parseStoredAnswers(answersJson: string, enabledSlotIds: readonly string[]): AnswersMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answersJson) as unknown;
  } catch {
    return {};
  }

  const result = validateResponseAnswersJson(parsed, enabledSlotIds);
  return result.ok ? result.value.answers : {};
}

export function toPollDto(poll: PollRow): PollDto {
  return {
    slug: poll.slug,
    title: poll.title,
    description: poll.description,
    isClosed: poll.is_closed === 1,
    updatedAt: poll.updated_at
  };
}

export function toResponseDto(
  response: Pick<ResponseRow, "id" | "name" | "comment" | "version" | "updated_at">,
  answers: AnswersMap
): ResponseDto {
  return {
    id: response.id,
    name: response.name,
    comment: response.comment,
    answers,
    version: response.version,
    updatedAt: response.updated_at
  };
}

export async function buildPollPayload(db: D1Database, slug: string) {
  const poll = await requirePoll(db, slug);
  const config = parsePollConfig(poll.config_json);
  const slotIds = getEnabledSlotIds(config);
  const responseRows = await listResponses(db, slug);
  const responses = responseRows.map((row) => toResponseDto(row, parseStoredAnswers(row.answers_json, slotIds)));
  const summary = computeSummary(slotIds, responses);

  return {
    poll: toPollDto(poll),
    config,
    responses,
    summary
  };
}

export async function touchPoll(db: D1Database, slug: string): Promise<void> {
  await db
    .prepare(
      `UPDATE polls
       SET updated_at = CURRENT_TIMESTAMP
       WHERE slug = ?`
    )
    .bind(slug)
    .run();
}

export async function assertAdminToken(env: Env, poll: Pick<PollRow, "admin_token_hash">, rawToken: string): Promise<void> {
  assertApi(rawToken.length > 0, 403, "INVALID_TOKEN", "管理トークンが正しくありません");
  const tokenHash = await hashToken(rawToken, requireTokenPepper(env));
  assertApi(tokenHash === poll.admin_token_hash, 403, "INVALID_TOKEN", "管理トークンが正しくありません");
}

export function makeAnswersJsonString(answers: AnswersMap): string {
  return JSON.stringify(makeResponseAnswersJson(answers));
}

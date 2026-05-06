import type { PollConfig, PollDto, ResponseDto, AnswersMap } from "./schema";
import type { Summary } from "./summary";

export type ErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "POLL_NOT_FOUND"
  | "RESPONSE_NOT_FOUND"
  | "INVALID_TOKEN"
  | "POLL_CLOSED"
  | "VERSION_CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export type PollReadPayload = {
  poll: PollDto;
  config: PollConfig;
  responses: ResponseDto[];
  summary: Summary;
};

export type CreatePollPayload = {
  poll: PollDto;
  publicPath: string;
  adminPath: string;
};

export type CreateResponsePayload = {
  response: ResponseDto;
};

export type UpdateResponsePayload = {
  response: ResponseDto;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as T | ApiErrorBody;
  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiClientError(
      response.status,
      errorBody.error?.code ?? "INTERNAL_ERROR",
      errorBody.error?.message ?? "エラーが発生しました"
    );
  }

  return body as T;
}

export function createPoll(input: { title: string; description: string }): Promise<CreatePollPayload> {
  return requestJson<CreatePollPayload>("/api/polls", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getPoll(slug: string): Promise<PollReadPayload> {
  return requestJson<PollReadPayload>(`/api/polls/${encodeURIComponent(slug)}`);
}

export function createResponse(
  slug: string,
  input: { name: string; comment: string; answers: AnswersMap }
): Promise<CreateResponsePayload> {
  return requestJson<CreateResponsePayload>(`/api/polls/${encodeURIComponent(slug)}/responses`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateResponse(
  slug: string,
  responseId: string,
  input: { name: string; comment: string; answers: AnswersMap; version: number }
): Promise<UpdateResponsePayload> {
  return requestJson<UpdateResponsePayload>(
    `/api/polls/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}`,
    {
      method: "PUT",
      body: JSON.stringify(input)
    }
  );
}

export function deleteResponse(slug: string, responseId: string): Promise<void> {
  return requestJson<void>(
    `/api/polls/${encodeURIComponent(slug)}/responses/${encodeURIComponent(responseId)}`,
    {
      method: "DELETE"
    }
  );
}

export function closePoll(slug: string, token: string, isClosed: boolean): Promise<{ poll: PollDto }> {
  const params = new URLSearchParams({ token });
  return requestJson<{ poll: PollDto }>(`/api/polls/${encodeURIComponent(slug)}/close?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({ isClosed })
  });
}

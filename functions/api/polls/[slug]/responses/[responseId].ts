import { getEnabledSlotIds } from "../../../../../src/lib/schema";
import { LIMITS, validateResponseUpdateInput } from "../../../../../src/lib/validation";
import {
  ApiError,
  assertApi,
  assertValidation,
  emptyResponse,
  getParam,
  handleApi,
  jsonResponse,
  readJsonBody
} from "../../../../_shared/http";
import {
  findResponse,
  makeAnswersJsonString,
  parsePollConfig,
  requirePoll,
  toResponseDto,
  touchPoll
} from "../../../../_shared/store";
import type { RequestContext } from "../../../../_shared/types";

export const onRequestPut = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const slug = getParam(context, "slug");
    const responseId = getParam(context, "responseId");
    const poll = await requirePoll(context.env.DB, slug);
    assertApi(poll.is_closed !== 1, 403, "POLL_CLOSED", "この予定は締め切られています");

    const response = await findResponse(context.env.DB, slug, responseId);
    assertApi(response, 404, "RESPONSE_NOT_FOUND", "指定された回答は見つかりません");

    const config = parsePollConfig(poll.config_json);
    const slotIds = getEnabledSlotIds(config);
    const body = await readJsonBody(context.request, LIMITS.requestBodyBytes);
    const input = assertValidation(validateResponseUpdateInput(body, slotIds));

    if (response.version !== input.version) {
      throw new ApiError(409, "VERSION_CONFLICT", "回答がほかの場所で更新されています");
    }

    const result = await context.env.DB.prepare(
      `UPDATE responses
       SET name = ?,
           comment = ?,
           answers_json = json(?),
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND poll_slug = ?
         AND version = ?`
    )
      .bind(
        input.name,
        input.comment,
        makeAnswersJsonString(input.answers),
        responseId,
        slug,
        input.version
      )
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      throw new ApiError(409, "VERSION_CONFLICT", "回答がほかの場所で更新されています");
    }

    await touchPoll(context.env.DB, slug);

    return jsonResponse({
      response: toResponseDto(
        {
          id: responseId,
          name: input.name,
          comment: input.comment,
          version: input.version + 1,
          updated_at: new Date().toISOString()
        },
        input.answers
      )
    });
  });

export const onRequestDelete = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const slug = getParam(context, "slug");
    const responseId = getParam(context, "responseId");
    const poll = await requirePoll(context.env.DB, slug);
    assertApi(poll.is_closed !== 1, 403, "POLL_CLOSED", "この予定は締め切られています");

    const response = await findResponse(context.env.DB, slug, responseId);
    assertApi(response, 404, "RESPONSE_NOT_FOUND", "指定された回答は見つかりません");

    await context.env.DB.prepare(
      `DELETE FROM responses
       WHERE id = ?
         AND poll_slug = ?`
    )
      .bind(responseId, slug)
      .run();
    await touchPoll(context.env.DB, slug);

    return emptyResponse();
  });

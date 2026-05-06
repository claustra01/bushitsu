import { generateResponseId, generateToken, hashToken } from "../../../../../src/lib/ids";
import { getEnabledSlotIds } from "../../../../../src/lib/schema";
import { LIMITS, validateResponseCreateInput } from "../../../../../src/lib/validation";
import {
  assertApi,
  assertValidation,
  handleApi,
  jsonResponse,
  readJsonBody,
  requireTokenPepper,
  getParam
} from "../../../../_shared/http";
import {
  makeAnswersJsonString,
  parsePollConfig,
  requirePoll,
  toResponseDto,
  touchPoll
} from "../../../../_shared/store";
import type { RequestContext } from "../../../../_shared/types";

export const onRequestPost = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const slug = getParam(context, "slug");
    const poll = await requirePoll(context.env.DB, slug);
    assertApi(poll.is_closed !== 1, 403, "POLL_CLOSED", "この予定調整は締め切られています");

    const config = parsePollConfig(poll.config_json);
    const slotIds = getEnabledSlotIds(config);
    const body = await readJsonBody(context.request, LIMITS.requestBodyBytes);
    const input = assertValidation(validateResponseCreateInput(body, slotIds));

    const responseId = generateResponseId();
    const internalEditTokenHash = await hashToken(generateToken(), requireTokenPepper(context.env));
    const answersJson = makeAnswersJsonString(input.answers);

    await context.env.DB.prepare(
      `INSERT INTO responses (id, poll_slug, name, comment, answers_json, edit_token_hash)
       VALUES (?, ?, ?, ?, json(?), ?)`
    )
      .bind(responseId, slug, input.name, input.comment, answersJson, internalEditTokenHash)
      .run();
    await touchPoll(context.env.DB, slug);

    return jsonResponse(
      {
        response: toResponseDto(
          {
            id: responseId,
            name: input.name,
            comment: input.comment,
            version: 1,
            updated_at: new Date().toISOString()
          },
          input.answers
        )
      },
      201
    );
  });

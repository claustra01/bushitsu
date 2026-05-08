import { emptyResponse, getParam, getTokenFromQuery, handleApi, jsonResponse } from "../../_shared/http";
import { assertAdminToken, buildPollPayload, requirePoll } from "../../_shared/store";
import type { RequestContext } from "../../_shared/types";

export const onRequestGet = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const slug = getParam(context, "slug");
    const payload = await buildPollPayload(context.env.DB, slug);
    return jsonResponse(payload);
  });

export const onRequestDelete = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const slug = getParam(context, "slug");
    const poll = await requirePoll(context.env.DB, slug);
    await assertAdminToken(context.env, poll, getTokenFromQuery(context.request));

    await context.env.DB.batch([
      context.env.DB.prepare(
        `DELETE FROM responses
         WHERE poll_slug = ?`
      ).bind(slug),
      context.env.DB.prepare(
        `DELETE FROM polls
         WHERE slug = ?`
      ).bind(slug)
    ]);

    return emptyResponse();
  });

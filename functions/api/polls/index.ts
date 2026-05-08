import { generatePollSlug, generateToken, hashToken } from "../../../src/lib/ids";
import { createDefaultPollConfig } from "../../../src/lib/schema";
import { LIMITS, validatePollCreateInput, validatePollConfig } from "../../../src/lib/validation";
import { assertValidation, handleApi, jsonResponse, readJsonBody, requireTokenPepper } from "../../_shared/http";
import { cleanupExpiredPolls, toPollDto } from "../../_shared/store";
import type { RequestContext } from "../../_shared/types";

export const onRequestPost = async (context: RequestContext): Promise<Response> =>
  handleApi(async () => {
    const body = await readJsonBody(context.request, LIMITS.requestBodyBytes);
    const input = assertValidation(validatePollCreateInput(body));
    await cleanupExpiredPolls(context.env.DB);

    const config = createDefaultPollConfig({
      timezone: input.timezone,
      startDate: input.startDate,
      endDate: input.endDate,
      startPeriod: input.startPeriod,
      endPeriod: input.endPeriod
    });
    assertValidation(validatePollConfig(config));

    const slug = generatePollSlug();
    const adminToken = generateToken();
    const adminTokenHash = await hashToken(adminToken, requireTokenPepper(context.env));
    const configJson = JSON.stringify(config);

    await context.env.DB.prepare(
      `INSERT INTO polls (slug, title, description, config_json, admin_token_hash)
       VALUES (?, ?, ?, json(?), ?)`
    )
      .bind(slug, input.title, input.description, configJson, adminTokenHash)
      .run();

    const poll = {
      slug,
      title: input.title,
      description: input.description,
      config_json: configJson,
      admin_token_hash: adminTokenHash,
      is_closed: 0,
      updated_at: new Date().toISOString()
    };

    return jsonResponse(
      {
        poll: toPollDto(poll),
        publicPath: `/p/${slug}`,
        adminPath: `/p/${slug}/admin?token=${encodeURIComponent(adminToken)}`
      },
      201
    );
  });

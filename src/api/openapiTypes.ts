import type { paths } from './generated/openapi';

type JsonMediaType<Content> = Content extends { 'application/json': infer Response }
  ? Response
  : Content extends { 'application/json;charset=UTF-8': infer Response }
    ? Response
    : Content extends { 'application/json; charset=UTF-8': infer Response }
      ? Response
      : Content extends { '*/*': infer Response }
        ? Response
        : never;

export type OpenApiResponseBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number = 200,
> = paths[Path][Method] extends { responses: infer Responses }
  ? Status extends keyof Responses
    ? Responses[Status] extends { content: infer Content }
      ? JsonMediaType<Content>
      : never
    : never
  : never;

export type OpenApiRequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends { requestBody?: infer RequestBody }
  ? NonNullable<RequestBody> extends { content: { 'application/json': infer Body } }
    ? Body
    : never
  : never;

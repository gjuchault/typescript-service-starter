import type { Endpoint } from "./endpoint";

export function generate({
  endpoints,
  interfaces,
}: {
  endpoints: Endpoint[];
  interfaces: string[];
}) {
  const methods = endpoints.map((endpoint) => generateMethod(endpoint));

  return [
    // still required as fetch is experimental
    `/// <reference lib="dom" />`,
    `import { z } from "zod";`,
    "",
    ...interfaces,
    "type HttpResult<T> = { success: true; data: T } | { success: false; data: unknown }",
    "",
    generateWrapper(
      [methods.join("\n\n"), generateReturnMethods(endpoints)].join("\n")
    ),
    "",
    generateTraceBuilder(),
  ].join("\n");
}

function generateMethod(endpoint: Endpoint) {
  const parameters = generateParameters(endpoint);
  const { bodyType } = endpoint;

  return [
    `async function ${endpoint.name}(`,
    parameters ? `  parameters: ${parameters},` : undefined,
    bodyType ? `  body: ${bodyType},` : undefined,
    `  fetchOverrides: RequestInit = {}`,
    `): Promise<${generateMethodReturnType(endpoint)}> {`,
    `  const url = new URL(${generateUrlPath(endpoint)}, baseUrl);`,
    `  ${generateQueryParameters(endpoint)}`,
    "  const { headers, ...fetchOverridesWithoutHeaders } = fetchOverrides;",
    "  const { headers: globalHeaders, ...globalFetchOverridesWithoutHeaders } = globalFetchOverrides;",
    "",
    "  const response = await fetch(url.toString(), {",
    `    method: "${endpoint.method}",`,
    "    headers: {",
    `      "Accept": "application/json",`,
    `      "Content-Type": "application/json",`,
    "      ...globalHeaders,",
    "      ...headers,",
    "    },",
    bodyType ? `    body: jsonStringifier(body),` : undefined,
    "  ...globalFetchOverridesWithoutHeaders,",
    "  ...fetchOverridesWithoutHeaders",
    "  });",
    "",
    "  if (!response.ok) {",
    "    return { success: false, data: await response.json() }",
    "  }",
    "",
    generateSuccessfulReturn(endpoint),
    "}",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function generateMethodReturnType(endpoint: Endpoint) {
  if (endpoint.responseType === undefined) {
    return "HttpResult<void>";
  }

  return `HttpResult<z.infer<typeof ${endpoint.responseType}>>`;
}

function generateParameters(endpoint: Endpoint) {
  if (endpoint.parameters === undefined) {
    return undefined;
  }

  return [
    "{",
    endpoint.parameters
      .map((parameter) => {
        return `${parameter.name}: string`;
      })
      .join(",\n"),
    "}",
  ].join("\n");
}

function generateUrlPath(endpoint: Endpoint) {
  let result = `"${endpoint.path}"`;

  for (const parameter of endpoint.parameters ?? []) {
    if (parameter.in === "query") {
      continue;
    }

    result += `.replace("{${parameter.name}}", parameters["${parameter.name}"])`;
  }

  return result;
}

function generateQueryParameters(endpoint: Endpoint) {
  if (endpoint.parameters === undefined) {
    return "";
  }

  const result: string[] = [];

  for (const parameter of endpoint.parameters ?? []) {
    if (parameter.in === "path") {
      continue;
    }

    result.push(
      `url.searchParams.append("${parameter.name}", parameters["${parameter.name}"]);`
    );
  }

  return result.join("\n");
}

function generateSuccessfulReturn(endpoint: Endpoint) {
  if (!endpoint.responseType) {
    return "return { success: true, data: undefined }";
  }

  return [
    "const data = await response.json();",
    "",
    `return { success: true, data: ${endpoint.responseType}.parse(data) }`,
  ].join("\n");
}

function generateWrapper(content: string) {
  return [
    "export function createClient(",
    "  baseUrl: string,",
    "  globalFetchOverrides: RequestInit = {},",
    "  jsonStringifier = JSON.stringify",
    ") {",
    content,
    "}",
  ].join("\n");
}

function generateReturnMethods(endpoints: Endpoint[]) {
  return ["return {", endpoints.map(({ name }) => name).join(","), "};"].join(
    "\n"
  );
}

function generateTraceBuilder() {
  return [
    "export function createTraceHeader({",
    "  traceId,",
    "  parentSpanId,",
    "  version",
    "}: {",
    "  traceId: string;",
    "  parentSpanId: string;",
    "  version?: string",
    "}) {",
    "  return {",
    "    traceparent: [",
    `      version ?? "00",`,
    "      traceId,",
    "      parentSpanId,",
    `      "01"`,
    `    ].join("-")`,
    "  };",
    "}",
  ].join("\n");
}

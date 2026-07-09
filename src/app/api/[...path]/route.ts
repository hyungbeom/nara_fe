import { NextRequest, NextResponse } from "next/server";

/** Tomcat ROOT.war 배포: http://211.192.191.42:9000 → /api/... */
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://211.192.191.42:9000").replace(/\/$/, "");

/** rewrite 프록시 기본 30초 제한을 피하기 위해 Route Handler 로 백엔드에 직접 프록시 */
export const maxDuration = 300;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailers",
  "upgrade",
  "host",
]);

function rewriteSetCookieHeader(value: string): string {
  return value
    .replace(/;\s*Path=\/[^;]*/gi, "; Path=/")
    .replace(/;\s*Domain=[^;]*/gi, "");
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const targetUrl = `${BACKEND_URL}/api/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await backendResponse.text();
      console.error(`API proxy HTML response: ${method} ${targetUrl} status=${backendResponse.status}`);
      return NextResponse.json(
        {
          success: false,
          message:
            `백엔드 경로를 찾을 수 없습니다 (HTTP ${backendResponse.status}). ` +
            `Tomcat에 WAR가 ROOT.war로 배포됐는지, BACKEND_URL(${BACKEND_URL})이 맞는지 확인해 주세요.`,
          data: null,
        },
        { status: backendResponse.status >= 400 ? backendResponse.status : 502 }
      );
    }

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) {
        return;
      }
      if (key.toLowerCase() === "set-cookie") {
        responseHeaders.append(key, rewriteSetCookieHeader(value));
        return;
      }
      responseHeaders.set(key, value);
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "백엔드 연결 실패";
    console.error(`API proxy failed: ${method} ${targetUrl}`, error);
    return NextResponse.json(
      {
        success: false,
        message: `백엔드(${BACKEND_URL})에 연결할 수 없습니다: ${message}`,
        data: null,
      },
      { status: 502 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

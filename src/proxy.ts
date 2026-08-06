import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Constante duplicada de src/lib/session.ts de propósito — esse arquivo
// não pode importar de lá, porque session.ts usa `cookies()` de
// next/headers, que não está disponível no contexto do proxy.
const NOME_COOKIE = "primebox_session";

const chaveCodificada = new TextEncoder().encode(process.env.SESSION_SECRET);

const ROTAS_PUBLICAS = ["/login"];

async function temSessaoValida(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(NOME_COOKIE)?.value;
  if (!cookie) return false;
  try {
    await jwtVerify(cookie, chaveCodificada, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));
  const autenticado = await temSessaoValida(request);

  if (!rotaPublica && !autenticado) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (rotaPublica && autenticado) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

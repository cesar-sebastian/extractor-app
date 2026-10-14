import { clearSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

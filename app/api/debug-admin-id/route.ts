import { NextResponse } from "next/server";

export async function GET() {
  const id = process.env.ADMIN_USER_ID ?? "";
  return NextResponse.json({ length: id.length, id });
}

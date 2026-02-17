import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stackPath = path.join(process.cwd(), "traefik", "traefik-stack.yml");
    const yaml = fs.readFileSync(stackPath, "utf-8");
    return NextResponse.json({ yaml });
  } catch {
    return NextResponse.json(
      { error: "Traefik stack file not found", yaml: "" },
      { status: 200 }
    );
  }
}

import fs from "node:fs";
import { NextResponse } from "next/server";
import { resolveDataFile } from "@/lib/data";

// The catalogue ships pre-gzipped (1.9 MB instead of 12 MB of JSON) and is handed
// to the browser with Content-Encoding: gzip, which fetch() decodes transparently.
// Nothing is re-serialised per request.
export const dynamic = "force-dynamic";

export async function GET() {
  const file = resolveDataFile("catalogue.json.gz");
  if (!file) {
    return NextResponse.json({ error: "catalogue not found" }, { status: 500 });
  }
  const buf = fs.readFileSync(file);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/auth";

export const runtime = "nodejs";

/**
 * Mints a short-lived token so the browser can upload straight to Blob. Serverless functions
 * cap request bodies at ~4.5 MB, which is smaller than the art people actually make, so large
 * files must never travel through one.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Not an admin" }, { status: 401 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"],
        addRandomSuffix: true,
        maximumSizeInBytes: 50 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

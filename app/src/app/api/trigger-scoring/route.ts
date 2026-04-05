import { NextResponse } from "next/server";

export async function POST() {
  const hookUrl = process.env.RENDER_DEPLOY_HOOK;

  if (!hookUrl) {
    return NextResponse.json(
      { error: "RENDER_DEPLOY_HOOK not configured. Set it in your Vercel environment variables." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(hookUrl, { method: "POST" });
    if (res.ok) {
      return NextResponse.json({
        message: "Pipeline triggered on Render. Predictions will update in a few minutes.",
      });
    } else {
      return NextResponse.json(
        { error: `Render responded with status ${res.status}` },
        { status: 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to reach Render: ${e.message}` },
      { status: 502 }
    );
  }
}

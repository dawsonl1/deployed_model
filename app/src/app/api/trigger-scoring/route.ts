import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_PAT not configured. Set it in your Vercel environment variables." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/dawsonl1/deployed_model/actions/workflows/inference.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (res.status === 204) {
      return NextResponse.json({
        message: "Pipeline triggered on GitHub Actions. Predictions will update in a few minutes.",
      });
    } else {
      const body = await res.text();
      return NextResponse.json(
        { error: `GitHub responded with status ${res.status}: ${body}` },
        { status: 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to reach GitHub: ${e.message}` },
      { status: 502 }
    );
  }
}

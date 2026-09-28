import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const resend = resendKey ? new Resend(resendKey) : null;

export async function POST(request: Request) {
  if (!resend) {
    return NextResponse.json(
      { error: "Resend API key is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: `Reparto Control <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message || error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error("Server error sending email:", err);
    const errorObj = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: errorObj.message }, { status: 500 });
  }
}

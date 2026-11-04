import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const contactLead = {
      id: "lead_" + Math.random().toString(36).substring(2, 10),
      name: body.name || "Client",
      email: body.email || "",
      phone: body.phone || "",
      subject: body.subject || "SellSync AI Inquiry",
      message: body.message || "",
      created_at: new Date().toISOString(),
    };

    // Forward form data to ksvisualsagency@gmail.com via formsubmit
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      await fetch("https://formsubmit.co/ajax/ksvisualsagency@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: contactLead.name,
          email: contactLead.email,
          phone: contactLead.phone,
          subject: contactLead.subject,
          message: contactLead.message,
          _subject: `New SellSync AI Inquiry: ${contactLead.subject} from ${contactLead.name}`,
          _template: "table",
        }),
      }).finally(() => clearTimeout(timeout));
    } catch (e) {
      console.warn("Contact forward to ksvisualsagency@gmail.com notice:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Inquiry received and dispatched to ksvisualsagency@gmail.com",
      lead: contactLead,
    });
  } catch (err: any) {
    console.error("Contact API catch error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process inquiry" },
      { status: 500 }
    );
  }
}


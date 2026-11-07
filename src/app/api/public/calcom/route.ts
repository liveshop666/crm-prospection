import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { findProspect, logActivity, upsertProspect } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/public/calcom — webhook Cal.com (prise de RDV sur ton site).
 * Cal.com > Settings > Developer > Webhooks :
 *   URL = https://<ton-crm>/api/public/calcom
 *   Secret = la valeur de CALCOM_WEBHOOK_SECRET
 *   Événements : Booking Created, Booking Rescheduled, Booking Cancelled
 * Le lien de RDV peut contenir ?metadata[ref]=<ref du prospect> pour le relier à sa fiche.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "CALCOM_WEBHOOK_SECRET non configurée" }, { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get("x-cal-signature-256") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  try {
    const body = JSON.parse(raw);
    const event: string = body.triggerEvent ?? "";
    if (event === "PING") return NextResponse.json({ ok: true });

    const p = body.payload ?? {};
    const attendee = p.attendees?.[0] ?? {};
    const answers = p.responses ?? {};
    const val = (k: string) => {
      const v = answers[k]?.value ?? answers[k];
      return typeof v === "string" ? v : null;
    };
    const email: string | null = attendee.email ?? val("email");
    const name: string | null = attendee.name ?? val("name");
    const phone: string | null = val("attendeePhoneNumber") ?? val("phone") ?? attendee.phoneNumber ?? null;
    const ref: string | undefined = p.metadata?.ref ?? undefined;
    // uniquement le message laissé par le client (pas la description du type de RDV)
    const notes: string | null = val("notes") ?? (typeof p.additionalNotes === "string" && p.additionalNotes.trim() ? p.additionalNotes : null);

    const start = p.startTime ? new Date(p.startTime) : null;
    const when = start
      ? start.toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
      : "date inconnue";

    const db = createAdminClient();
    let prospect = await findProspect(db, { ref, email, phone });
    if (!prospect) {
      if (!email && !phone) return NextResponse.json({ error: "Pas d'email ni de téléphone dans la réservation" }, { status: 400 });
      ({ prospect } = await upsertProspect(db, {
        company_name: val("company") ?? name ?? email ?? phone, contact_name: name, email, phone, source: "rdv_site",
      }));
    }

    // « Appel découverte, 15 min between Nolla and Client » → « Appel découverte, 15 min »
    const title: string | null = p.eventTitle ?? (typeof p.title === "string" ? p.title.split(/ between | entre /)[0] : null);
    const metadata = { uid: p.uid, event, start: p.startTime, end: p.endTime, title: p.title, location: p.location ?? null };

    if (event === "BOOKING_CANCELLED") {
      await logActivity(db, {
        prospect, type: "note", created_by: "site", metadata,
        content: `❌ RDV annulé (${when})${p.cancellationReason ? ` — ${p.cancellationReason}` : ""}`,
      });
      await db.from("prospects").update({ is_unread: true }).eq("id", prospect.id);
    } else if (event === "BOOKING_CREATED" || event === "BOOKING_RESCHEDULED") {
      await logActivity(db, {
        prospect, type: "rdv", created_by: "site", metadata,
        content: `${event === "BOOKING_RESCHEDULED" ? "RDV déplacé au" : "RDV le"} ${when}${title ? ` — ${title}` : ""}${notes ? `\n${notes}` : ""}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[calcom]", e);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

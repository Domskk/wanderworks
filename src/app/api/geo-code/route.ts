import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lat, lon } = await req.json();

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "Missing lat/lon" },
        { status: 400 }
      );
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "wander-ai-travel-app",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

    const data = await res.json();

    return NextResponse.json({
      country: data.address?.country ?? null,
      country_code: data.address?.country_code?.toUpperCase() ?? null,
      display_name: data.display_name ?? null,
    });
  } catch (error) {
    console.error("Geo API ERROR:", error);
    return NextResponse.json(
      { error: "Reverse geocoding failed" },
      { status: 500 }
    );
  }
}

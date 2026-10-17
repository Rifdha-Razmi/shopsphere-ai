import { NextResponse, type NextRequest } from "next/server";
import products from "@/mocks/dummyjson/products.json";
import users from "@/mocks/dummyjson/users.json";

/**
 * Offline DummyJSON stand-in (dev + E2E). Implements the subset of DummyJSON
 * endpoints the app uses, backed by a bundled snapshot of DummyJSON's own
 * data. Enable with NEXT_PUBLIC_PRODUCT_API_URL=/api/mock.
 *
 * Images are swapped for locally generated SVG artwork so the storefront is
 * fully usable without network access to the DummyJSON CDN.
 */

type RawProduct = (typeof products)[number] & Record<string, unknown>;
type RawUser = (typeof users)[number] & Record<string, unknown>;

const CATEGORY_HUES: Record<string, number> = {};
const hue = (category: string) => (CATEGORY_HUES[category] ??= [...category].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));

function withLocalImages(p: RawProduct): RawProduct {
  return { ...p, thumbnail: `/api/mock/image/${p.id}/0`, images: p.images.map((_, i) => `/api/mock/image/${p.id}/${i}`) };
}

function select(p: Record<string, unknown>, fields: string | null) {
  if (!fields) return p;
  const keys = ["id", ...fields.split(",").map((f) => f.trim())];
  return Object.fromEntries(keys.filter((k) => k in p).map((k) => [k, p[k]]));
}

function list(items: RawProduct[], params: URLSearchParams) {
  let out = [...items];
  const sortBy = params.get("sortBy");
  if (sortBy) {
    const dir = params.get("order") === "desc" ? -1 : 1;
    out.sort((a, b) => ((a[sortBy] as number) > (b[sortBy] as number) ? dir : -dir));
  }
  const total = out.length;
  const skip = Number(params.get("skip") ?? 0);
  const limitParam = Number(params.get("limit") ?? 30);
  const limit = limitParam === 0 ? total : limitParam;
  out = out.slice(skip, skip + limit);
  return { products: out.map(withLocalImages).map((p) => select(p, params.get("select"))), total, skip, limit: out.length };
}

function categoryName(slug: string) {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function svg(id: number, index: number): string {
  const p = (products as RawProduct[]).find((x) => x.id === id);
  const h = hue(p?.category ?? "x");
  const title = (p?.title ?? "Product").replace(/[<&>"]/g, "");
  const initials = title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const words = title.split(/\s+/);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 18) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const text = lines.slice(0, 3).map((l, i) => `<text x="300" y="${470 + i * 34}" font-size="28" text-anchor="middle" fill="hsl(${h} 35% 25%)" font-family="system-ui,sans-serif" font-weight="600">${l}</text>`).join("");
  const angle = (index * 40) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="hsl(${h} 70% 92%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360} 70% 82%)"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>
<circle cx="300" cy="260" r="${130 - index * 8}" fill="hsl(${h} 60% 55%)" opacity=".9"/>
<text x="300" y="290" font-size="96" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-weight="700">${initials}</text>
${text}
<text x="300" y="575" font-size="16" text-anchor="middle" fill="hsl(${h} 30% 40%)" font-family="system-ui,sans-serif">mock image ${index + 1}</text>
</svg>`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const search = request.nextUrl.searchParams;
  const all = products as RawProduct[];
  const [root, a, b] = path;

  if (root === "image" && a) {
    return new NextResponse(svg(Number(a), Number(b ?? 0)), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
  }

  if (root === "products") {
    if (!a) return NextResponse.json(list(all, search));
    if (a === "search") {
      const q = (search.get("q") ?? "").toLowerCase().trim();
      const matches = q ? all.filter((p) => `${p.title} ${p.description} ${p.brand ?? ""} ${p.category} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(q)) : [];
      return NextResponse.json(list(matches, search));
    }
    if (a === "categories") {
      const slugs = Array.from(new Set(all.map((p) => p.category)));
      return NextResponse.json(slugs.map((slug) => ({ slug, name: categoryName(slug), url: `/products/category/${slug}` })));
    }
    if (a === "category-list") return NextResponse.json(Array.from(new Set(all.map((p) => p.category))));
    if (a === "category" && b) return NextResponse.json(list(all.filter((p) => p.category === b), search));
    const product = all.find((p) => p.id === Number(a));
    return product ? NextResponse.json(select(withLocalImages(product), search.get("select"))) : NextResponse.json({ message: `Product with id '${a}' not found` }, { status: 404 });
  }

  if (root === "users") {
    const u = users as RawUser[];
    const skip = Number(search.get("skip") ?? 0);
    const limit = Number(search.get("limit") ?? 30) || u.length;
    const page = u.slice(skip, skip + limit).map(({ password: _pw, ...rest }) => rest);
    return NextResponse.json({ users: page, total: u.length, skip, limit: page.length });
  }

  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.join("/") === "auth/login") {
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
    const user = (users as RawUser[]).find((u) => u.username === body.username && u.password === body.password);
    if (!user) return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
    const { password: _pw, ...rest } = user;
    return NextResponse.json({ ...rest, accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
  }
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}

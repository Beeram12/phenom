import Link from "next/link";
import { RESTAURANT } from "@/data/restaurant";

export function Footer() {
  return (
    <footer className="border-line/70 bg-sand/60 mt-20 border-t">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">{RESTAURANT.name}</p>
          <p className="text-muted mt-2 max-w-xs text-sm">{RESTAURANT.tagline}</p>
        </div>
        <div>
          <h2 className="text-ink font-sans text-sm font-semibold tracking-wide uppercase">
            Visit
          </h2>
          <address className="text-muted mt-2 text-sm leading-relaxed not-italic">
            {RESTAURANT.address}
            <br />
            <a href={`tel:${RESTAURANT.phone.replace(/\s/g, "")}`} className="hover:text-ink">
              {RESTAURANT.phone}
            </a>
          </address>
        </div>
        <div>
          <h2 className="text-ink font-sans text-sm font-semibold tracking-wide uppercase">
            Hours
          </h2>
          <ul className="text-muted mt-2 space-y-1 text-sm">
            {RESTAURANT.hours.map((h) => (
              <li key={h.days}>
                <span className="text-ink">{h.days}</span> · {h.time}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-line/70 border-t">
        <div className="container-page text-muted flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {RESTAURANT.name}. Demo storefront.
          </p>
          <nav aria-label="Footer">
            <ul className="flex gap-4">
              <li>
                <Link href="/menu" className="hover:text-ink">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-ink">
                  Cart
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

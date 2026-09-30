import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Leaf, Truck } from "lucide-react";
import { ItemCard } from "@/components/ItemCard";
import { FEATURED_ITEMS } from "@/data/menu";
import { RESTAURANT } from "@/data/restaurant";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=75";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="container-page grid items-center gap-10 pt-10 pb-16 sm:pt-16 lg:grid-cols-2 lg:gap-16 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-olive-50 px-3 py-1 text-sm font-medium text-olive-700">
            <Leaf className="size-4" aria-hidden /> Cooked fresh, every order
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
            {RESTAURANT.name}
          </h1>
          <p className="text-muted mt-4 max-w-md text-lg leading-relaxed sm:text-xl">
            {RESTAURANT.tagline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/menu" className="btn-primary h-12 px-6 text-base">
              View Menu <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#about" className="btn-ghost h-12 px-5 text-base">
              Our story
            </a>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="text-terracotta-600 size-5" aria-hidden />
              <dt className="sr-only">Delivery time</dt>
              <dd>
                Delivery in <strong>{RESTAURANT.deliveryEta}</strong>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-terracotta-600 size-5" aria-hidden />
              <dt className="sr-only">Hours</dt>
              <dd>Open daily from 11 am</dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="bg-terracotta-100/70 absolute -inset-3 -z-10 rotate-2 rounded-[28px]"
          />
          <div className="bg-sand shadow-lift relative aspect-[5/4] overflow-hidden rounded-[24px]">
            <Image
              src={HERO_IMAGE}
              alt="A table spread with colourful, freshly plated dishes"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section aria-labelledby="featured-heading" className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-terracotta-700 text-sm font-semibold tracking-wide uppercase">
              Guest favourites
            </p>
            <h2 id="featured-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">
              Featured dishes
            </h2>
          </div>
          <Link href="/menu" className="btn-ghost -mr-3">
            See full menu <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_ITEMS.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} source="home" />
            </li>
          ))}
        </ul>
      </section>

      {/* About + hours */}
      <section
        id="about"
        aria-labelledby="about-heading"
        className="container-page scroll-mt-24 py-12"
      >
        <div className="card grid gap-10 p-8 sm:p-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 id="about-heading" className="text-3xl font-semibold">
              A small kitchen with a big heart
            </h2>
            <p className="text-muted mt-4 max-w-prose leading-relaxed">{RESTAURANT.about}</p>
            <p className="text-muted mt-4 text-sm">{RESTAURANT.address}</p>
          </div>
          <div className="lg:col-span-2">
            <h3 className="text-xl font-semibold">Opening hours</h3>
            <ul className="divide-line mt-4 divide-y">
              {RESTAURANT.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="font-medium">{h.days}</span>
                  <span className="text-muted">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

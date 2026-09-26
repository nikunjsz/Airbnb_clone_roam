"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Header } from "./header";
import { ListingCard } from "./listing-card";
import { FilterModal, type FilterValues } from "./filter-modal";
import { categories } from "@/lib/listings";
import { getListings } from "@/lib/api";
import type { Listing } from "@/lib/api/types";
import type { ExploreView, SearchValues } from "./header";
import { useToast } from "./toast";

const InteractiveMap = dynamic(() => import("./interactive-map").then((mod) => mod.InteractiveMap), {
  ssr: false,
  loading: () => <div className="map-loading-skeleton">Loading interactive map...</div>,
});


const experienceCards = [
  ["Goan food trail with a local chef", "From ₹2,500 / guest", "/images/listings/goa-palms.jpg"],
  ["Sunset sailing in Mumbai harbour", "From ₹3,200 / guest", "/images/listings/mumbai-apartment.jpg"],
  ["Old Jaipur photography walk", "From ₹1,800 / guest", "/images/listings/jaipur-haveli.jpg"],
  ["Tea tasting in the Munnar hills", "From ₹1,500 / guest", "/images/listings/munnar-bungalow.jpg"],
  ["Backwater canoe trip", "From ₹2,100 / guest", "/images/listings/alappuzha-cottage.jpg"],
  ["Stargazing beneath the Himalayas", "From ₹2,800 / guest", "/images/listings/leh-lodge.jpg"],
];

const serviceCards = [
  ["Private chef for your stay", "From ₹3,500 / service", "/images/listings/interior-living.jpg"],
  ["In-home massage and wellness", "From ₹2,200 / service", "/images/listings/interior-bedroom.jpg"],
  ["Professional trip photography", "From ₹4,000 / service", "/images/listings/gokarna-cottage.jpg"],
  ["Prepared meals for the week", "From ₹5,500 / service", "/images/listings/delhi-penthouse.jpg"],
  ["Personal fitness session", "From ₹1,800 / service", "/images/listings/alibag-home.jpg"],
  ["Hair and makeup at your stay", "From ₹2,500 / service", "/images/listings/bengaluru-loft.jpg"],
];

function LifestyleCard({ name, price, image }: { name: string; price: string; image: string }) {
  const [saved, setSaved] = useState(false);
  return <article className="lifestyle-card"><div><Image src={image} alt={name} fill sizes="(max-width: 740px) 75vw, 25vw" /><button className={saved ? "saved" : ""} type="button" aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${name}`} onClick={() => setSaved((value) => !value)}>{saved ? "♥" : "♡"}</button></div><h2>{name}</h2><p>{price} · ★ 4.9</p></article>;
}

function LifestyleCards({ title, cards }: { title: string; cards: string[][] }) {
  return <section className="lifestyle-section"><div className="rail-heading"><h1>{title}</h1></div><div className="lifestyle-grid">{cards.map(([name, price, image]) => <LifestyleCard name={name} price={price} image={image} key={name} />)}</div></section>;
}

function ListingRail({ title, listings }: { title: string; listings: Listing[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  return <section className="discovery-rail"><div className="rail-heading"><h2>{title}</h2><button type="button" aria-label={`Scroll ${title}`} onClick={() => railRef.current?.scrollBy({ left: Math.max((railRef.current?.clientWidth || 0) * .8, 400), behavior: "smooth" })}>›</button></div><div className="listing-rail" ref={railRef}>{listings.map((listing) => <ListingCard listing={listing} key={`${title}-${listing.id}`} />)}</div></section>;
}

function CategoryIcon({ name }: { name: (typeof categories)[number]["icon"] }) {
  const paths = {
    heart: <><path d="M16 27S5 20.1 5 11.8C5 7.9 7.8 5 11.4 5c2 0 3.7.9 4.6 2.4C16.9 5.9 18.6 5 20.6 5 24.2 5 27 7.9 27 11.8 27 20.1 16 27 16 27Z" /><path d="m11.7 15 2.7 2.7 6-6" /></>,
    view: <><path d="M3 25 12 11l5 7 3-4 9 11" /><circle cx="23.5" cy="7.5" r="3.5" /></>,
    pool: <><path d="M3 21c3-2 5 2 8 0s5 2 8 0 5 2 10 0M3 26c3-2 5 2 8 0s5 2 8 0 5 2 10 0M8 20V8a4 4 0 0 1 8 0M16 13H8" /></>,
    room: <><path d="M4 28V5h24v23M4 23h24M10 23V11h12v12" /><circle cx="19" cy="17" r="1" /></>,
    beach: <><path d="M16 27V15M5 15c2-8 20-8 22 0-3-2-6-2-8 0-2-2-4-2-6 0-2-2-5-2-8 0ZM3 27h26" /></>,
    cabin: <><path d="m4 15 12-9 12 9v13H4ZM10 28v-8h12v8M7 13h18" /></>,
    mansion: <><path d="M3 28h26M6 28V12l10-7 10 7v16M11 16v4M21 16v4M13 28v-5h6v5" /></>,
    country: <><path d="M5 28V13h22v15M3 13h26L25 7H7ZM11 28v-8h10v8" /><path d="M16 7V3" /></>,
    design: <><path d="m16 3 3.2 9.8L29 16l-9.8 3.2L16 29l-3.2-9.8L3 16l9.8-3.2Z" /></>,
    tropical: <><circle cx="23" cy="8" r="4" /><path d="M4 27c5-9 13-10 24-5M16 23c-1-8-6-11-11-10 2 5 6 7 11 6M16 20c2-7 7-9 12-8-2 4-6 6-11 6" /></>,
  };
  return <svg viewBox="0 0 32 32" aria-hidden="true">{paths[name]}</svg>;
}

const PAGE_SIZE = 16;

/**
 * Main Explore screen for discovery.
 * Connects directly to FastAPI endpoint GET /api/v1/listings.
 * Supports pagination, infinite loading, Leaflet map mode, and toast notifications.
 */
export function Explore() {
  const [view, setView] = useState<ExploreView>("all");
  const [category, setCategory] = useState<string>("Guest favourites");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [search, setSearch] = useState<SearchValues>({ location: "", guests: 0, checkIn: "", checkOut: "" });
  const [filters, setFilters] = useState<FilterValues>({ propertyType: "", minPrice: "", maxPrice: "", bedrooms: 0, beds: 0, bathrooms: 0, amenities: [], guestFavorite: false });

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalListings, setTotalListings] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Map view toggle
  const [showMap, setShowMap] = useState<boolean>(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  const requestSeqRef = useRef<number>(0);
  const toast = useToast();

  const handleCategorySelect = (selected: string) => {
    setCategory(selected);
    setPage(1);
    setListings([]);
    setError(null);
    setLoading(true);
  };

  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();
    const currentSeq = ++requestSeqRef.current;

    const selectedCategory = view === "homes" ? categories.find((item) => item.label === category) : undefined;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setPage(1);

    getListings({
      category: selectedCategory?.category,
      location: search.location || undefined,
      guests: search.guests || undefined,
      page: 1,
      page_size: PAGE_SIZE,
      check_in: search.checkIn || undefined,
      check_out: search.checkOut || undefined,
      property_type: (selectedCategory?.propertyType ?? filters.propertyType) || undefined,
      min_price_minor: filters.minPrice ? Number(filters.minPrice) * 100 : undefined,
      max_price_minor: filters.maxPrice ? Number(filters.maxPrice) * 100 : undefined,
      bedrooms: filters.bedrooms || undefined,
      beds: filters.beds || undefined,
      bathrooms: filters.bathrooms || undefined,
      amenity: filters.amenities.length ? filters.amenities : undefined,
      guest_favorite: filters.guestFavorite || selectedCategory?.guestFavorite || undefined,
    }, controller.signal)
      .then((data) => {
        if (isSubscribed && currentSeq === requestSeqRef.current) {
          setListings(data.items);
          setTotalListings(data.total);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (isSubscribed && currentSeq === requestSeqRef.current) {
          const msg = err instanceof Error ? err.message : "Failed to load listings";
          setError(
            msg.includes("HTTP 500") || msg.includes("Failed to fetch")
              ? "Unable to connect to the backend server."
              : msg
          );
          setListings([]);
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [category, retryCount, search, filters, view]);

  const loadMore = async () => {
    if (loadingMore || listings.length >= totalListings) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const selectedCategory = view === "homes" ? categories.find((item) => item.label === category) : undefined;

    try {
      const data = await getListings({
        category: selectedCategory?.category,
        location: search.location || undefined,
        guests: search.guests || undefined,
        page: nextPage,
        page_size: PAGE_SIZE,
        check_in: search.checkIn || undefined,
        check_out: search.checkOut || undefined,
        property_type: (selectedCategory?.propertyType ?? filters.propertyType) || undefined,
        min_price_minor: filters.minPrice ? Number(filters.minPrice) * 100 : undefined,
        max_price_minor: filters.maxPrice ? Number(filters.maxPrice) * 100 : undefined,
        bedrooms: filters.bedrooms || undefined,
        beds: filters.beds || undefined,
        bathrooms: filters.bathrooms || undefined,
        amenity: filters.amenities.length ? filters.amenities : undefined,
        guest_favorite: filters.guestFavorite || selectedCategory?.guestFavorite || undefined,
      });

      setListings((prev) => [
        ...prev,
        ...data.items.filter((item) => !prev.some((existing) => existing.id === item.id)),
      ]);
      setPage(nextPage);
      setTotalListings(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load more stays.", "Network Error");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = () => {
    setListings([]);
    setError(null);
    setLoading(true);
    setRetryCount((count) => count + 1);
  };
  const activeFilterCount = [filters.propertyType, filters.minPrice, filters.maxPrice, filters.bedrooms, filters.beds, filters.bathrooms, filters.guestFavorite].filter(Boolean).length + filters.amenities.length;
  const hasMore = listings.length < totalListings;

  return (
    <>
      <Header view={view} onViewChange={setView} onSearch={(values) => { setSearch(values); setView("homes"); }} />
      <main>
        {/* Category selector row */}
        {view === "homes" && <section className="category-bar" aria-label="Stay categories">
          <div className="category-scroll">
            {categories.map((item) => (
              <button
                key={item.label}
                type="button"
                className={category === item.label ? "selected" : ""}
                onClick={() => handleCategorySelect(item.label)}
                aria-pressed={category === item.label}
              >
                <CategoryIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="filter-button"
            onClick={() => setFiltersOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10m4 0h2M14 5v4M4 17h2m4 0h10M6 15v4" /></svg> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
        </section>}

        {view === "all" && !loading && !error && <div className="all-discovery">
          <ListingRail title="Popular homes in Goa" listings={[...listings.filter((item) => item.region === "Goa"), ...listings.filter((item) => item.region !== "Goa")].slice(0, 7)} />
          <ListingRail title="Available in the mountains" listings={[...listings.filter((item) => ["Himachal Pradesh", "Uttarakhand", "Ladakh"].includes(item.region)), ...listings].filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index).slice(0, 7)} />
          <ListingRail title="Homes with amazing pools" listings={[...listings.filter((item) => item.category === "Amazing pools"), ...listings].filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index).slice(0, 7)} />
        </div>}

        {view === "experiences" && <LifestyleCards title="Experiences hosted by locals" cards={experienceCards} />}
        {view === "services" && <LifestyleCards title="Services for your stay" cards={serviceCards} />}

        {/* Section heading */}
        {view === "homes" && <section className="explore-heading">
          <div>
            <h1>
              {category === "Guest favourites" ? "Guests’ favourite homes" : category}
            </h1>
            <p>
              {loading
                ? "Loading stays..."
                : error
                ? "Backend service unavailable"
                : listings.length
                ? `Showing ${listings.length} of ${totalListings} stays`
                : "No homes found for this selection"}
            </p>
          </div>
          <button
            type="button"
            className="toggle-map-btn-top"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "Show grid" : "Show map"} <span>›</span>
          </button>
        </section>}

        {/* View Mode: Map or Grid */}
        {view === "homes" && (showMap ? (
          <div className="explore-map-view">
            <InteractiveMap
              listings={listings}
              selectedListingId={selectedListingId}
              onSelectListing={(id) => setSelectedListingId(id)}
            />
          </div>
        ) : loading ? (
          <section className="listing-grid" aria-label="Loading stays">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="listing-card-skeleton animate-pulse" style={{ opacity: 0.7 }}>
                <div style={{ aspectRatio: "20/19", backgroundColor: "#e5e7eb", borderRadius: "12px", marginBottom: "12px" }} />
                <div style={{ height: "16px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "70%", marginBottom: "8px" }} />
                <div style={{ height: "14px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "50%", marginBottom: "8px" }} />
                <div style={{ height: "14px", backgroundColor: "#e5e7eb", borderRadius: "4px", width: "40%" }} />
              </div>
            ))}
          </section>
        ) : error ? (
          <div className="empty-state error-state">
            <div>⚡</div>
            <h2>Unable to load stays</h2>
            <p>{error}</p>
            <p style={{ marginTop: "8px", fontSize: "0.9rem", color: "#6A6A6A" }}>
              Please ensure FastAPI server is running at <code>http://localhost:8000</code>.
            </p>
            <button
              type="button"
              className="retry-button"
              onClick={handleRetry}
            >
              Retry Connection
            </button>
          </div>
        ) : listings.length > 0 ? (
          <>
            <section className="listing-grid">
              {listings.map((listing, index) => (
                <ListingCard listing={listing} key={listing.id} priority={index < 5} />
              ))}
            </section>

            {/* Airbnb-style Show More Pagination */}
            <div className="pagination-wrapper">
              {hasMore ? (
                <button
                  type="button"
                  className="show-more-button"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner-dot" /> Loading more stays...
                    </span>
                  ) : (
                    `Show more stays (${listings.length} of ${totalListings})`
                  )}
                </button>
              ) : totalListings > 0 ? (
                <p className="pagination-end-text">All {totalListings} stays loaded</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div>⌂</div>
            <h2>No homes in this category yet</h2>
            <p>Try selecting another category above to explore available stays.</p>
          </div>
        ))}

        {/* Floating Airbnb Map Toggle Button */}
        {view === "homes" && !loading && !error && listings.length > 0 && (
          <div className="floating-map-toggle-wrap">
            <button
              type="button"
              className="floating-map-pill"
              onClick={() => setShowMap((prev) => !prev)}
            >
              <span>{showMap ? "Show list" : "Show map"}</span>
              <svg viewBox="0 0 32 32" aria-hidden="true" width="16" height="16">
                {showMap ? (
                  <path fill="currentColor" d="M4 6h24v4H4V6zm0 8h24v4H4v-4zm0 8h24v4H4v-4z" />
                ) : (
                  <path fill="currentColor" d="M3 25 12 11l5 7 3-4 9 11" />
                )}
              </svg>
            </button>
          </div>
        )}

        {/* Footer inspiration links */}
        <section className="inspiration">
          <h2>Inspiration for future getaways</h2>
          <div className="footer-tabs">
            <button type="button" className="active">
              Popular
            </button>
            <button type="button">Arts & culture</button>
            <button type="button">Outdoors</button>
            <button type="button">Mountains</button>
            <button type="button">Beach</button>
          </div>
        </section>
      </main>

      {filtersOpen && <FilterModal
        totalResults={totalListings}
        onClose={() => setFiltersOpen(false)}
        values={filters}
        onApply={(values) => { setFilters(values); setFiltersOpen(false); }}
      />}
    </>
  );
}


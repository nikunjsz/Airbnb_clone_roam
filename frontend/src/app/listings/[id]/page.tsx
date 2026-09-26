import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingCard } from "@/components/booking-card";
import { DetailHeader } from "@/components/detail-header";
import { ListingActions } from "@/components/listing-actions";
import { PhotoGallery } from "@/components/photo-gallery";
import { ListingDescription, ReviewsPanel } from "@/components/listing-content";
import { getListing, getReviews } from "@/lib/api/listings";
import { isNotFoundError } from "@/lib/api/errors";
import type { Listing } from "@/lib/api/types";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Listing detail page.
 * Loads listing from GET /api/v1/listings/{id}.
 * Triggers Next.js notFound() on HTTP 404, or displays error UI on server/network failure.
 */
export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;

  let listing: Listing;
  let reviews = [] as Awaited<ReturnType<typeof getReviews>>;
  try {
    listing = await getListing(id);
    reviews = await getReviews(listing.id);
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      notFound();
    }

    // Render server error state if backend is down or returns non-404 error
    return (
      <>
        <DetailHeader />
        <main className="detail-main" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h2>Unable to load listing details</h2>
          <p style={{ color: "#6A6A6A", margin: "1rem 0" }}>
            The API server at <code>http://localhost:8000</code> could not be reached or returned an error.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#222222",
              color: "#ffffff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Back to explore
          </Link>
        </main>
      </>
    );
  }

  // Ensure photos exist with graceful fallback if array is empty
  const photos = listing.photos.length > 0 ? listing.photos : [
    { url: "/images/listings/manali-villa.jpg", alt_text: listing.title },
  ];

  return (
    <>
      <DetailHeader />
      <nav className="detail-section-nav" aria-label="Listing sections">
        <a href="#photos">Photos</a><a href="#amenities">Amenities</a><a href="#reviews">Reviews</a><a href="#location">Location</a>
      </nav>

      <main className="detail-main">
        {/* Title and top actions */}
        <div className="detail-title">
          <div>
            <h1>{listing.title}</h1>
            <p>
              ★ {listing.rating.toFixed(2)} · <a className="review-link" href="#reviews">{listing.review_count} reviews</a> ·{" "}
              <u>{listing.subtitle}</u>
            </p>
          </div>
          <ListingActions listingId={listing.id} title={listing.title} />
        </div>

        {/* Five photo desktop gallery */}
        <PhotoGallery photos={photos} />

        {/* Detail breakdown & sticky booking card */}
        <section className="detail-columns">
          <div className="listing-info">
            <section className="host-summary">
              <div>
                <h2>
                  {listing.property_type} hosted by {listing.host.name}
                  {listing.host.is_superhost && <span className="superhost-badge-inline">🏅 Superhost</span>}
                </h2>
                <p>
                  {listing.max_guests} guests · {listing.bedrooms} bedrooms ·{" "}
                  {listing.beds} beds · {listing.bathrooms} baths
                </p>
              </div>
              <Image
                src={listing.host.avatar_url}
                alt={listing.host.name}
                width={56}
                height={56}
              />
            </section>


            <section className="guest-favorite-summary">
              <strong>❧</strong><b>Guest<br />favourite</b><p>One of the most loved homes on Roam, according to guests</p><span><b>{listing.rating.toFixed(2)}</b><small>★★★★★</small></span><span><b>{listing.review_count}</b><small>Reviews</small></span>
            </section>

            <section className="feature-list">
              <div>
                <b>✦</b>
                <span>
                  <strong>Guest favourite</strong>
                  <small>One of the most loved homes, according to guests</small>
                </span>
              </div>
              <div>
                <b>⌖</b>
                <span>
                  <strong>Great location</strong>
                  <small>100% of recent guests gave the location a 5-star rating</small>
                </span>
              </div>
              <div>
                <b>▤</b>
                <span>
                  <strong>Free cancellation before 27 Sep</strong>
                  <small>Get a full refund if you change your mind</small>
                </span>
              </div>
            </section>

            <ListingDescription description={listing.description} />

            <section className="amenities" id="amenities">
              <h2>What this place offers</h2>
              <div>
                {listing.amenities.map((amenity) => <span key={amenity.slug}>✓ {amenity.name}</span>)}
              </div>
              <button type="button">{listing.amenities.length} amenities included</button>
            </section>
          </div>

          <BookingCard listing={listing} />
        </section>

        <ReviewsPanel rating={listing.rating} reviewCount={listing.review_count} reviews={reviews} />
        <section className="location-block" id="location"><h2>Where you’ll be</h2><p>{listing.subtitle}, {listing.country}</p><div><span>⌖</span><strong>{listing.city}</strong></div></section>
      </main>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DetailHeader } from "@/components/detail-header";
import { ReviewModal } from "@/components/review-modal";
import { getTrips, type Trip } from "@/lib/api";
import { money } from "@/lib/listings";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<{ listingId: number; bookingId: number; title: string } | null>(null);

  const fetchTrips = () => {
    setLoading(true);
    getTrips()
      .then(setTrips)
      .catch(() => setError("Sign in to see your trips."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    getTrips(controller.signal)
      .then(setTrips)
      .catch(() => setError("Sign in to see your trips."))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      <DetailHeader />
      <main className="simple-page">
        <h1>Trips</h1>
        <p className="page-lead">Your upcoming and past reservations, all in one place.</p>
        {loading ? (
          <p>Loading trips…</p>
        ) : trips.length ? (
          <section className="trip-list">
            {trips.map(({ booking, listing, has_review }) => {
              const isCompleted = booking.check_out <= todayStr;
              return (
                <article className="trip-card" key={booking.id}>
                  <div className="trip-image">
                    <Image
                      src={listing.photos[0]?.url ?? "/images/listings/manali-villa.jpg"}
                      alt={listing.title}
                      fill
                      unoptimized={listing.photos[0]?.url.startsWith("http://localhost:8000")}
                    />
                  </div>
                  <div>
                    <div className="trip-status-row">
                      <span className={`status-pill ${isCompleted ? "completed" : "confirmed"}`}>
                        {isCompleted ? "Completed stay" : booking.status}
                      </span>
                      {has_review && <span className="reviewed-badge">✓ Reviewed</span>}
                    </div>
                    <h2>{listing.title}</h2>
                    <p>{listing.subtitle}</p>
                    <p>
                      <strong>
                        {new Date(booking.check_in).toLocaleDateString()} – {new Date(booking.check_out).toLocaleDateString()}
                      </strong>
                    </p>
                    <p>
                      {booking.guests} guests · {money(booking.total_minor)} total
                    </p>
                    <div className="trip-actions">
                      <Link href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer">
                        View your stay →
                      </Link>
                      {isCompleted && !has_review && (
                        <button
                          type="button"
                          className="leave-review-btn"
                          onClick={() => setReviewTarget({ listingId: listing.id, bookingId: booking.id, title: listing.title })}
                        >
                          Leave a review
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="empty-trips">
            <div>◇</div>
            <h2>{error || "No trips booked…yet!"}</h2>
            <p>Time to start planning your next adventure.</p>
            <Link href="/">Start searching</Link>
          </section>
        )}
      </main>

      {reviewTarget && (
        <ReviewModal
          isOpen={true}
          listingId={reviewTarget.listingId}
          bookingId={reviewTarget.bookingId}
          listingTitle={reviewTarget.title}
          onClose={() => setReviewTarget(null)}
          onSuccess={fetchTrips}
        />
      )}
    </>
  );
}


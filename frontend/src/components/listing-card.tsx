"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/lib/api/types";
import { money } from "@/lib/listings";
import { setFavorite } from "@/lib/api";
import { useToast } from "./toast";

interface ListingCardProps {
  listing: Listing;
  initiallyLiked?: boolean;
  onFavoriteChange?: (listingId: number, favorite: boolean) => void;
  priority?: boolean;
}

/**
 * Individual listing card displayed in explore grid.
 * Displays photo, rating, guest favorite badge, Superhost badge, location, dates, and price.
 */
export function ListingCard({ listing, initiallyLiked = false, onFavoriteChange, priority = false }: ListingCardProps) {
  const [liked, setLiked] = useState<boolean>(initiallyLiked);
  const [favoriteError, setFavoriteError] = useState("");
  const toast = useToast();

  const primaryPhoto = listing.photos[0] ?? {
    url: "/images/listings/manali-villa.jpg",
    alt_text: listing.title,
  };

  return (
    <article className="listing-card">
      <div className="image-wrap">
        <Link href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${listing.title}`}>
          <Image
            src={primaryPhoto.url}
            alt={primaryPhoto.alt_text}
            fill
            priority={priority}
            unoptimized={primaryPhoto.url.startsWith("http://localhost:8000")}
            sizes="(max-width: 740px) 100vw, (max-width: 1120px) 33vw, 25vw"
          />
        </Link>
        {listing.is_guest_favorite && <span className="favorite-badge">Guest favourite</span>}
        {!listing.is_guest_favorite && listing.host?.is_superhost && <span className="favorite-badge superhost-badge">Superhost</span>}
        <button
          type="button"
          className={`heart ${liked ? "liked" : ""}`}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = !liked;
            setLiked(next);
            setFavoriteError("");
            try {
              await setFavorite(listing.id, next);
              onFavoriteChange?.(listing.id, next);
              toast.success(
                next ? "Saved to your Wishlist" : "Removed from Wishlist",
                listing.title
              );
            } catch {
              setLiked(!next);
              setFavoriteError("Sign in to save this home");
              toast.warning("Sign in from account menu to save favorites", "Sign In Required");
            }
          }}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        >
          ♥
        </button>
        {favoriteError && <span className="favorite-error">{favoriteError}</span>}
        <span className="image-dots">
          <b />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>

      <Link href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer" className="card-copy">
        <div className="card-title-row">
          <h2>{listing.subtitle}</h2>
          <span>★ {listing.rating ? listing.rating.toFixed(2) : "New"}</span>
        </div>
        <p>{listing.title}</p>
        <p>2–7 Oct</p>
        <div className="price">
          {/* money() handles minor unit (paisa) conversion to formatted INR */}
          <strong>{money(listing.nightly_price_minor)}</strong> for 1 night
        </div>
      </Link>
    </article>
  );
}


import { apiFetch } from "./client";
import type {
  BookingPayload,
  BookingResponse,
  HealthResponse,
  Listing,
  ListingQueryParams,
  PaginatedListings,
  Trip,
  Availability,
  Review,
} from "./types";

/**
 * Checks backend health status.
 * Target path: GET /health
 */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  if (typeof window !== "undefined") {
    return apiFetch<HealthResponse>(`${window.location.origin}/api/health`, { signal, cache: "no-store" });
  }
  const envUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  // Remove trailing slash and /api/v1 prefix if present to hit root /health
  const rootUrl = envUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return apiFetch<HealthResponse>(`${rootUrl}/health`, { signal, cache: "no-store" });
}

/**
 * Fetches paginated listings from the backend.
 * Target path: GET /api/v1/listings
 * Supports query parameters for location, category, guest count, page, and page_size.
 */
export async function getListings(
  params?: ListingQueryParams,
  signal?: AbortSignal
): Promise<PaginatedListings> {
  return apiFetch<PaginatedListings>("/listings", {
    params: params ? (params as Record<string, string | number | boolean | string[] | undefined>) : undefined,
    signal,
    cache: "no-store",
  });
}

/** Uploads a host-selected photo before its URL is attached to a listing. */
export async function uploadListingPhoto(photo: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append("photo", photo);
  return apiFetch<{ url: string }>("/uploads/listing-photo", { method: "POST", body, timeoutMs: 30000 });
}

/**
 * Fetches a single listing detail by ID.
 * Target path: GET /api/v1/listings/{id}
 */
export async function getListing(
  id: number | string,
  signal?: AbortSignal
): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}`, { signal, cache: "no-store" });
}

/**
 * Creates a mock booking reservation.
 * Target path: POST /api/v1/bookings
 */
export async function createBooking(
  payload: BookingPayload,
  signal?: AbortSignal
): Promise<BookingResponse> {
  return apiFetch<BookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

/**
 * Creates a new host listing.
 * Target path: POST /api/v1/listings
 */
export async function createHostListing(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Listing> {
  return apiFetch<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

export async function getHostListings(signal?: AbortSignal): Promise<Listing[]> {
  return apiFetch<Listing[]>("/host/listings", { signal, cache: "no-store" });
}

export async function updateHostListing(id: number, payload: Record<string, unknown>): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function archiveHostListing(id: number): Promise<void> {
  return apiFetch<void>(`/listings/${id}`, { method: "DELETE" });
}

export async function getHostReservations(signal?: AbortSignal): Promise<Trip[]> {
  return apiFetch<Trip[]>("/host/reservations", { signal, cache: "no-store" });
}

export async function getTrips(signal?: AbortSignal): Promise<Trip[]> {
  return apiFetch<Trip[]>("/trips", { signal, cache: "no-store" });
}

export async function getFavorites(signal?: AbortSignal): Promise<Listing[]> {
  return apiFetch<Listing[]>("/favorites", { signal, cache: "no-store" });
}

export async function setFavorite(listingId: number, favorite: boolean): Promise<void> {
  return apiFetch<void>(`/favorites/${listingId}`, { method: favorite ? "PUT" : "DELETE" });
}

export async function getAvailability(listingId: number, signal?: AbortSignal): Promise<Availability> {
  return apiFetch<Availability>(`/listings/${listingId}/availability`, { signal, cache: "no-store" });
}

export async function getReviews(listingId: number, signal?: AbortSignal): Promise<Review[]> {
  return apiFetch<Review[]>(`/listings/${listingId}/reviews`, { signal, cache: "no-store" });
}

export async function createReview(
  listingId: number,
  payload: { booking_id: number; rating: number; comment: string }
): Promise<Review> {
  return apiFetch<Review>(`/listings/${listingId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

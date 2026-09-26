/**
 * Domain types for Roam API integrations.
 */

export interface ListingPhoto {
  url: string;
  alt_text: string;
  sort_order?: number;
}

export interface Host {
  id: number;
  name: string;
  avatar_url: string;
  is_superhost?: boolean;
}

export interface Amenity {
  slug: string;
  name: string;
  icon_key: string;
}

export interface Listing {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  category: string;
  property_type: string;
  /**
   * Money is represented in minor units (e.g., paisa for INR) as integers.
   * This avoids floating-point inaccuracies in pricing, quote calculation, and fees.
   */
  nightly_price_minor: number;
  cleaning_fee_minor: number;
  currency: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating: number;
  review_count: number;
  is_guest_favorite: boolean;
  photos: ListingPhoto[];
  amenities: Amenity[];
  host: Host;
}

export interface PaginatedListings {
  items: Listing[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListingQueryParams {
  category?: string;
  location?: string;
  guests?: number;
  page?: number;
  page_size?: number;
  property_type?: string;
  min_price_minor?: number;
  max_price_minor?: number;
  check_in?: string;
  check_out?: string;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  amenity?: string[];
  guest_favorite?: boolean;
}

export interface HealthResponse {
  status: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string;
  bio: string;
  can_host: boolean;
}

export interface BookingPayload {
  listing_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  idempotency_key: string;
}

export interface BookingResponse {
  id: number;
  listing_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  nights: number;
  nightly_price_minor: number;
  subtotal_minor: number;
  cleaning_fee_minor: number;
  service_fee_minor: number;
  total_minor: number;
  currency: string;
}

export interface Trip {
  booking: BookingResponse;
  listing: Listing;
  has_review?: boolean;
}

export interface UnavailableRange {
  start_date: string;
  end_date: string;
  reason: string;
}

export interface Availability {
  listing_id: number;
  unavailable: UnavailableRange[];
}

export interface Review {
  id: number;
  listing_id?: number;
  booking_id?: number | null;
  rating: number;
  comment: string;
  created_at: string;
  author: { name: string; avatar_url: string };
}

export interface ReviewPayload {
  booking_id: number;
  rating: number;
  comment: string;
}


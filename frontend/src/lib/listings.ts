import type { Listing } from "./api/types";

export type { Listing };

/**
 * Fallback static listings kept exclusively as development fixtures and testing references.
 * NOTE: These are NOT used as silent fallbacks when API requests fail.
 */
const rawListings: (string | number | boolean)[][] = [
  [1, "Glass villa above the valley", "Manali, Himachal Pradesh", "Manali", "Himachal Pradesh", "Amazing views", "Villa", 1840000, 4.92, 128, true, "/images/listings/manali-villa.jpg"],
  [2, "Quiet hideaway in the palms", "Assagao, Goa", "Assagao", "Goa", "Tropical", "Villa", 1275000, 4.89, 84, true, "/images/listings/goa-palms.jpg"],
  [3, "Stone cottage in the hills", "Mussoorie, Uttarakhand", "Mussoorie", "Uttarakhand", "Countryside", "Cottage", 890000, 4.78, 61, false, "/images/listings/mussoorie-cottage.jpg"],
  [4, "Design home by the sea", "Alibag, Maharashtra", "Alibag", "Maharashtra", "Beachfront", "Home", 2210000, 4.96, 203, true, "/images/listings/alibag-home.jpg"],
  [5, "Heritage haveli courtyard suite", "Jaipur, Rajasthan", "Jaipur", "Rajasthan", "Mansions", "Guest suite", 735000, 4.86, 97, false, "/images/listings/jaipur-haveli.jpg"],
  [6, "Lake cabin under the pines", "Nainital, Uttarakhand", "Nainital", "Uttarakhand", "Cabins", "Cabin", 1080000, 4.91, 112, true, "/images/listings/nainital-cabin.jpg"],
  [7, "Clifftop retreat with infinity pool", "Varkala, Kerala", "Varkala", "Kerala", "Amazing pools", "Villa", 1620000, 4.94, 146, true, "/images/listings/varkala-pool.jpg"],
  [8, "Minimalist city loft", "Bengaluru, Karnataka", "Bengaluru", "Karnataka", "Design", "Loft", 640000, 4.75, 58, false, "/images/listings/bengaluru-loft.jpg"],
];

export const fallbackListings: Listing[] = rawListings.map(
  ([id, title, subtitle, city, region, category, propertyType, price, rating, reviews, favorite, image]) => ({
    id: id as number,
    title: title as string,
    subtitle: subtitle as string,
    description: `A beautifully considered ${(propertyType as string).toLowerCase()} with calm interiors, thoughtful details, and a memorable setting.`,
    city: city as string,
    region: region as string,
    country: "India",
    latitude: 0,
    longitude: 0,
    category: category as string,
    property_type: propertyType as string,
    /**
     * Money in minor units (e.g. 1840000 = ₹18,400.00).
     */
    nightly_price_minor: price as number,
    cleaning_fee_minor: 180000,
    currency: "INR",
    max_guests: 6,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    rating: rating as number,
    review_count: reviews as number,
    is_guest_favorite: favorite as boolean,
    photos: [
      { url: image as string, alt_text: title as string },
      { url: "/images/listings/delhi-penthouse.jpg", alt_text: `Interior of ${title}` },
      { url: "/images/listings/interior-living.jpg", alt_text: `Living area of ${title}` },
      { url: "/images/listings/interior-bedroom.jpg", alt_text: `Bedroom of ${title}` },
      { url: "/images/listings/interior-exterior.jpg", alt_text: `Exterior of ${title}` },
    ],
    amenities: [],
    host: { id: 1, name: "Aarav", avatar_url: "https://i.pravatar.cc/160?img=12" },
  })
);

export type DiscoveryCategory = {
  label: string;
  icon: "heart" | "view" | "pool" | "room" | "beach" | "cabin" | "mansion" | "country" | "design" | "tropical";
  category?: string;
  propertyType?: string;
  guestFavorite?: boolean;
};

/** Airbnb-style discovery choices. Query metadata keeps display labels separate from API fields. */
export const categories: DiscoveryCategory[] = [
  { label: "Guest favourites", icon: "heart", guestFavorite: true },
  { label: "Amazing views", icon: "view", category: "Amazing views" },
  { label: "Amazing pools", icon: "pool", category: "Amazing pools" },
  { label: "Rooms", icon: "room", propertyType: "Guest suite" },
  { label: "Beachfront", icon: "beach", category: "Beachfront" },
  { label: "Cabins", icon: "cabin", category: "Cabins" },
  { label: "Mansions", icon: "mansion", category: "Mansions" },
  { label: "Countryside", icon: "country", category: "Countryside" },
  { label: "Design", icon: "design", category: "Design" },
  { label: "Tropical", icon: "tropical", category: "Tropical" },
];

/**
 * Formats a minor currency value (e.g., paisa) into a localized INR string.
 * Money is stored as integer minor units in the database and API to avoid floating point precision issues.
 */
export function money(minor: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

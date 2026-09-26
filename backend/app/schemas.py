from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    url: str
    alt_text: str


class HostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    avatar_url: str
    is_superhost: bool = False


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    slug: str
    name: str
    icon_key: str


class ListingOut(BaseModel):
    id: int
    title: str
    subtitle: str
    description: str
    city: str
    region: str
    country: str
    latitude: float
    longitude: float
    category: str
    property_type: str
    nightly_price_minor: int
    cleaning_fee_minor: int
    currency: str
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    rating: float
    review_count: int
    is_guest_favorite: bool
    photos: list[PhotoOut]
    amenities: list[AmenityOut]
    host: HostOut


class PaginatedListings(BaseModel):
    items: list[ListingOut]
    total: int
    page: int
    page_size: int


class QuoteRequest(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int = Field(ge=1)


class QuoteOut(BaseModel):
    nights: int
    nightly_price_minor: int
    subtotal_minor: int
    cleaning_fee_minor: int
    service_fee_minor: int
    total_minor: int
    currency: str


class BookingCreate(QuoteRequest):
    idempotency_key: str = Field(min_length=8, max_length=80)


class BookingOut(QuoteOut):
    id: int
    listing_id: int
    guest_id: int
    check_in: date
    check_out: date
    guests: int
    status: str


class ListingCreate(BaseModel):
    title: str = Field(min_length=5, max_length=160)
    description: str = Field(min_length=20, max_length=4000)
    city: str = Field(min_length=2, max_length=80)
    region: str = Field(min_length=2, max_length=80)
    country: str = "India"
    latitude: float = 0.0
    longitude: float = 0.0
    category: str = "Amazing views"
    property_type: str = "Home"
    nightly_price_minor: int = Field(ge=0)
    cleaning_fee_minor: int = Field(default=0, ge=0)
    max_guests: int = Field(ge=1, le=30)
    bedrooms: int = Field(ge=0, le=30)
    beds: int = Field(ge=1, le=50)
    bathrooms: int = Field(ge=1, le=30)
    photo_urls: list[str] = Field(min_length=1, max_length=12)
    amenity_slugs: list[str] = Field(default_factory=list, max_length=20)


class ListingUpdate(BaseModel):
    title: str | None = Field(None, min_length=5, max_length=160)
    description: str | None = Field(None, min_length=20, max_length=4000)
    nightly_price_minor: int | None = Field(None, ge=0)
    max_guests: int | None = Field(None, ge=1, le=30)
    city: str | None = Field(None, min_length=2, max_length=80)
    region: str | None = Field(None, min_length=2, max_length=80)
    country: str | None = Field(None, min_length=2, max_length=80)
    latitude: float | None = None
    longitude: float | None = None
    category: str | None = Field(None, min_length=2, max_length=50)
    property_type: str | None = Field(None, min_length=2, max_length=50)
    cleaning_fee_minor: int | None = Field(None, ge=0)
    bedrooms: int | None = Field(None, ge=0, le=30)
    beds: int | None = Field(None, ge=1, le=50)
    bathrooms: int | None = Field(None, ge=1, le=30)
    photo_urls: list[str] | None = Field(None, min_length=1, max_length=12)
    amenity_slugs: list[str] | None = Field(None, max_length=20)
    is_active: bool | None = None


class UnavailableRangeOut(BaseModel):
    start_date: date
    end_date: date
    reason: str


class AvailabilityOut(BaseModel):
    listing_id: int
    unavailable: list[UnavailableRangeOut]


class ReviewAuthorOut(BaseModel):
    name: str
    avatar_url: str


class ReviewOut(BaseModel):
    id: int
    listing_id: int
    booking_id: int | None = None
    rating: int
    comment: str
    created_at: datetime
    author: ReviewAuthorOut


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)


class TripOut(BaseModel):
    booking: BookingOut
    listing: ListingOut
    has_review: bool = False


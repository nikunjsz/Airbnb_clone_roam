from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import os
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .auth import require_user, router as auth_router
from .models import Amenity, AvailabilityBlock, Booking, Favorite, Listing, ListingAmenity, ListingPhoto, Review, User
from .schemas import AvailabilityOut, BookingCreate, BookingOut, HostOut, ListingCreate, ListingOut, ListingUpdate, PaginatedListings, QuoteOut, QuoteRequest, ReviewAuthorOut, ReviewCreate, ReviewOut, TripOut, UnavailableRangeOut


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Schema migrations and seed data are explicit deployment steps. Keeping
    # them out of startup prevents a server restart from mutating user data.
    yield


app = FastAPI(title="Roam Airbnb Clone API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parents[1] / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def is_superhost_for_user(db: Session, host_id: int) -> bool:
    """Superhost rule: Host has >= 3 reviews across active listings and an average rating >= 4.80."""
    result = db.execute(
        select(func.count(Review.id), func.avg(Review.rating))
        .join(Listing, Review.listing_id == Listing.id)
        .where(Listing.host_id == host_id, Listing.is_active.is_(True))
    ).first()
    if not result:
        return False
    count, avg_rating = result
    if count is None or count < 3 or avg_rating is None:
        return False
    return float(avg_rating) >= 4.80


def listing_out(listing: Listing, db: Session | None = None) -> ListingOut:
    superhost = False
    if db is not None and listing.host:
        superhost = is_superhost_for_user(db, listing.host_id)
    host_out = HostOut(
        id=listing.host.id,
        name=listing.host.name,
        avatar_url=listing.host.avatar_url,
        is_superhost=superhost,
    )
    return ListingOut(
        id=listing.id,
        title=listing.title,
        subtitle=listing.subtitle,
        description=listing.description,
        city=listing.city,
        region=listing.region,
        country=listing.country,
        latitude=listing.latitude,
        longitude=listing.longitude,
        category=listing.category,
        property_type=listing.property_type,
        nightly_price_minor=listing.nightly_price_minor,
        cleaning_fee_minor=listing.cleaning_fee_minor,
        currency=listing.currency,
        max_guests=listing.max_guests,
        bedrooms=listing.bedrooms,
        beds=listing.beds,
        bathrooms=listing.bathrooms,
        rating=listing.rating_hundredths / 100,
        review_count=listing.review_count,
        is_guest_favorite=listing.is_guest_favorite,
        photos=listing.photos,
        amenities=[link.amenity for link in listing.amenity_links],
        host=host_out,
    )



def get_listing_or_404(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(
        select(Listing)
        .options(
            selectinload(Listing.photos),
            selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Listing.id == listing_id, Listing.is_active.is_(True))
    )
    if listing is None:
        raise HTTPException(404, detail="Listing not found")
    return listing


def calculate_quote(listing: Listing, payload: QuoteRequest) -> QuoteOut:
    nights = (payload.check_out - payload.check_in).days
    if nights <= 0:
        raise HTTPException(422, detail="Check-out must be after check-in")
    if payload.guests > listing.max_guests:
        raise HTTPException(422, detail=f"This home allows up to {listing.max_guests} guests")
    subtotal = listing.nightly_price_minor * nights
    service_fee = int((Decimal(subtotal) * Decimal("0.12")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return QuoteOut(
        nights=nights,
        nightly_price_minor=listing.nightly_price_minor,
        subtotal_minor=subtotal,
        cleaning_fee_minor=listing.cleaning_fee_minor,
        service_fee_minor=service_fee,
        total_minor=subtotal + listing.cleaning_fee_minor + service_fee,
        currency=listing.currency,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/uploads/listing-photo")
async def upload_listing_photo(
    request: Request,
    photo: UploadFile = File(...),
    user: User = Depends(require_user),
) -> dict[str, str]:
    """Persist a host-uploaded listing image and return its public URL."""
    if not user.can_host:
        raise HTTPException(403, detail="This account is not enabled for hosting")
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    extension = allowed.get(photo.content_type or "")
    if extension is None:
        raise HTTPException(415, detail="Upload a JPG, PNG, or WebP image")
    contents = await photo.read(8 * 1024 * 1024 + 1)
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(413, detail="Image must be 8 MB or smaller")
    if not contents:
        raise HTTPException(400, detail="Image file is empty")
    filename = f"{uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(contents)
    return {"url": f"{str(request.base_url).rstrip('/')}/uploads/{filename}"}


@app.get("/api/v1/listings", response_model=PaginatedListings)
def list_listings(
    location: str | None = None,
    category: str | None = None,
    guests: int | None = Query(None, ge=1),
    property_type: str | None = None,
    min_price_minor: int | None = Query(None, ge=0),
    max_price_minor: int | None = Query(None, ge=0),
    amenity: list[str] | None = Query(None),
    bedrooms: int | None = Query(None, ge=0),
    beds: int | None = Query(None, ge=1),
    bathrooms: int | None = Query(None, ge=1),
    guest_favorite: bool | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=48),
    db: Session = Depends(get_db),
) -> PaginatedListings:
    filters = [Listing.is_active.is_(True)]
    if location:
        needle = f"%{location.strip()}%"
        filters.append(or_(Listing.city.ilike(needle), Listing.region.ilike(needle), Listing.country.ilike(needle)))
    if category:
        filters.append(Listing.category == category)
    if guests:
        filters.append(Listing.max_guests >= guests)
    if property_type:
        filters.append(Listing.property_type == property_type)
    if min_price_minor is not None:
        filters.append(Listing.nightly_price_minor >= min_price_minor)
    if max_price_minor is not None:
        filters.append(Listing.nightly_price_minor <= max_price_minor)
    if bedrooms is not None:
        filters.append(Listing.bedrooms >= bedrooms)
    if beds is not None:
        filters.append(Listing.beds >= beds)
    if bathrooms is not None:
        filters.append(Listing.bathrooms >= bathrooms)
    if guest_favorite:
        filters.append(Listing.is_guest_favorite.is_(True))
    if amenity:
        for slug in amenity:
            filters.append(Listing.amenity_links.any(ListingAmenity.amenity.has(slug=slug)))
    if check_in and check_out:
        if check_out <= check_in:
            raise HTTPException(422, detail="Check-out must be after check-in")
        filters.extend([
            ~exists().where(
                Booking.listing_id == Listing.id,
                Booking.status == "confirmed",
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            ),
            ~exists().where(
                AvailabilityBlock.listing_id == Listing.id,
                AvailabilityBlock.start_date < check_out,
                AvailabilityBlock.end_date > check_in,
            ),
        ])

    total = db.scalar(select(func.count(Listing.id)).where(*filters)) or 0
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.photos),
            selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(*filters)
        .order_by(Listing.is_guest_favorite.desc(), Listing.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return PaginatedListings(items=[listing_out(item, db) for item in listings], total=total, page=page, page_size=page_size)


@app.get("/api/v1/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)) -> ListingOut:
    return listing_out(get_listing_or_404(db, listing_id), db)


@app.get("/api/v1/listings/{listing_id}/availability", response_model=AvailabilityOut)
def listing_availability(listing_id: int, db: Session = Depends(get_db)) -> AvailabilityOut:
    get_listing_or_404(db, listing_id)
    unavailable = [
        UnavailableRangeOut(start_date=item.start_date, end_date=item.end_date, reason=item.reason)
        for item in db.scalars(select(AvailabilityBlock).where(AvailabilityBlock.listing_id == listing_id))
    ]
    unavailable.extend(
        UnavailableRangeOut(start_date=item.check_in, end_date=item.check_out, reason="Booked")
        for item in db.scalars(select(Booking).where(Booking.listing_id == listing_id, Booking.status == "confirmed"))
    )
    return AvailabilityOut(listing_id=listing_id, unavailable=sorted(unavailable, key=lambda item: item.start_date))


@app.get("/api/v1/listings/{listing_id}/reviews", response_model=list[ReviewOut])
def listing_reviews(listing_id: int, db: Session = Depends(get_db)) -> list[ReviewOut]:
    get_listing_or_404(db, listing_id)
    reviews = db.scalars(
        select(Review).options(selectinload(Review.author)).where(Review.listing_id == listing_id).order_by(Review.created_at.desc())
    ).all()
    return [
        ReviewOut(
            id=item.id,
            listing_id=item.listing_id,
            booking_id=item.booking_id,
            rating=item.rating,
            comment=item.comment,
            created_at=item.created_at,
            author=ReviewAuthorOut(name=item.author.name, avatar_url=item.author.avatar_url),
        )
        for item in reviews
    ]


@app.post("/api/v1/listings/{listing_id}/reviews", response_model=ReviewOut, status_code=201)
def create_review(
    listing_id: int,
    payload: ReviewCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> ReviewOut:
    get_listing_or_404(db, listing_id)
    booking = db.get(Booking, payload.booking_id)
    if (
        booking is None
        or booking.guest_id != user.id
        or booking.listing_id != listing_id
        or booking.status not in ("confirmed", "completed")
        or booking.check_out > date.today()
    ):
        raise HTTPException(400, detail="Only completed stays can be reviewed.")

    existing_review = db.scalar(select(Review).where(Review.booking_id == payload.booking_id))
    if existing_review:
        raise HTTPException(409, detail="A review has already been submitted for this stay.")

    review = Review(
        listing_id=listing_id,
        author_id=user.id,
        booking_id=payload.booking_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.flush()

    result = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.listing_id == listing_id)
    ).first()
    avg_val, count_val = result if result else (0.0, 0)
    listing = db.get(Listing, listing_id)
    if listing:
        listing.rating_hundredths = int(round((float(avg_val or 0.0)) * 100))
        listing.review_count = count_val or 0

    db.commit()
    db.refresh(review)
    return ReviewOut(
        id=review.id,
        listing_id=review.listing_id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        author=ReviewAuthorOut(name=user.name, avatar_url=user.avatar_url),
    )



@app.get("/api/v1/host/listings", response_model=list[ListingOut])
def host_listings(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[ListingOut]:
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.photos),
            selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Listing.host_id == user.id)
        .order_by(Listing.id.desc())
    ).all()
    return [listing_out(item) for item in listings]


@app.post("/api/v1/listings", response_model=ListingOut, status_code=201)
def create_listing(
    payload: ListingCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> ListingOut:
    if not user.can_host:
        raise HTTPException(403, detail="This account is not enabled for hosting")
    listing = Listing(
        host_id=user.id, title=payload.title, subtitle=f"{payload.city}, {payload.region}", description=payload.description,
        city=payload.city, region=payload.region, country=payload.country, latitude=payload.latitude, longitude=payload.longitude,
        category=payload.category, property_type=payload.property_type,
        nightly_price_minor=payload.nightly_price_minor, cleaning_fee_minor=payload.cleaning_fee_minor, currency="INR",
        max_guests=payload.max_guests, bedrooms=payload.bedrooms, beds=payload.beds, bathrooms=payload.bathrooms,
        rating_hundredths=500, review_count=0, is_guest_favorite=False,
    )
    listing.photos = [ListingPhoto(url=url, alt_text=payload.title, sort_order=index) for index, url in enumerate(payload.photo_urls)]
    if payload.amenity_slugs:
        amenities = db.scalars(select(Amenity).where(Amenity.slug.in_(payload.amenity_slugs))).all()
        listing.amenity_links = [ListingAmenity(amenity=amenity) for amenity in amenities]
    db.add(listing)
    db.commit()
    listing = db.scalar(
        select(Listing)
        .options(
            selectinload(Listing.photos),
            selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Listing.id == listing.id)
    )
    return listing_out(listing)


@app.patch("/api/v1/listings/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> ListingOut:
    listing = db.scalar(
        select(Listing)
        .options(
            selectinload(Listing.photos),
            selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Listing.id == listing_id)
    )
    if listing is None:
        raise HTTPException(404, detail="Listing not found")
    if listing.host_id != user.id:
        raise HTTPException(403, detail="You do not own this listing")
    changes = payload.model_dump(exclude_unset=True)
    photo_urls = changes.pop("photo_urls", None)
    amenity_slugs = changes.pop("amenity_slugs", None)
    for field, value in changes.items():
        setattr(listing, field, value)
    if "city" in changes or "region" in changes:
        listing.subtitle = f"{listing.city}, {listing.region}"
    if photo_urls is not None:
        for photo in list(listing.photos):
            db.delete(photo)
        db.flush()
        listing.photos = [ListingPhoto(url=url, alt_text=listing.title, sort_order=index) for index, url in enumerate(photo_urls)]
    if amenity_slugs is not None:
        for link in list(listing.amenity_links):
            db.delete(link)
        db.flush()
        amenities = db.scalars(select(Amenity).where(Amenity.slug.in_(amenity_slugs))).all()
        listing.amenity_links = [ListingAmenity(amenity=amenity) for amenity in amenities]
    db.commit()
    db.refresh(listing)
    return listing_out(listing)


@app.delete("/api/v1/listings/{listing_id}", status_code=204)
def archive_listing(
    listing_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> None:
    listing = db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(404, detail="Listing not found")
    if listing.host_id != user.id:
        raise HTTPException(403, detail="You do not own this listing")
    listing.is_active = False
    db.commit()


@app.post("/api/v1/bookings/quote", response_model=QuoteOut)
def quote_booking(payload: QuoteRequest, db: Session = Depends(get_db)) -> QuoteOut:
    return calculate_quote(get_listing_or_404(db, payload.listing_id), payload)


@app.post("/api/v1/bookings", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> BookingOut:
    # Acquire SQLite's write reservation before checking availability so two
    # concurrent requests cannot both observe the same dates as available.
    db.connection().exec_driver_sql("BEGIN IMMEDIATE")
    listing = get_listing_or_404(db, payload.listing_id)
    quote = calculate_quote(listing, payload)

    duplicate = db.scalar(select(Booking).where(Booking.guest_id == user.id, Booking.idempotency_key == payload.idempotency_key))
    if duplicate:
        return BookingOut.model_validate({**quote.model_dump(), **duplicate.__dict__})

    conflict = db.scalar(
        select(Booking.id).where(
            Booking.listing_id == payload.listing_id,
            Booking.status == "confirmed",
            Booking.check_in < payload.check_out,
            Booking.check_out > payload.check_in,
        ).limit(1)
    )
    if conflict:
        raise HTTPException(409, detail="Those dates are no longer available")
    blocked = db.scalar(
        select(AvailabilityBlock.id).where(
            AvailabilityBlock.listing_id == payload.listing_id,
            AvailabilityBlock.start_date < payload.check_out,
            AvailabilityBlock.end_date > payload.check_in,
        ).limit(1)
    )
    if blocked:
        raise HTTPException(409, detail="Those dates are unavailable")

    booking = Booking(
        listing_id=payload.listing_id,
        guest_id=user.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests=payload.guests,
        status="confirmed",
        idempotency_key=payload.idempotency_key,
        **quote.model_dump(),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate({**quote.model_dump(), **booking.__dict__})


@app.get("/api/v1/trips", response_model=list[TripOut])
def my_trips(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[TripOut]:
    bookings = db.scalars(
        select(Booking)
        .options(
            selectinload(Booking.listing).selectinload(Listing.photos),
            selectinload(Booking.listing).selectinload(Listing.host),
            selectinload(Booking.listing).selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Booking.guest_id == user.id)
        .order_by(Booking.check_in.desc())
    ).all()
    booking_ids = [b.id for b in bookings]
    reviewed_booking_ids = set(
        db.scalars(select(Review.booking_id).where(Review.booking_id.in_(booking_ids))).all()
    ) if booking_ids else set()
    return [
        TripOut(
            booking=BookingOut.model_validate(item, from_attributes=True),
            listing=listing_out(item.listing, db),
            has_review=(item.id in reviewed_booking_ids),
        )
        for item in bookings
    ]


@app.get("/api/v1/host/reservations", response_model=list[TripOut])
def host_reservations(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[TripOut]:
    bookings = db.scalars(
        select(Booking)
        .join(Listing)
        .options(
            selectinload(Booking.listing).selectinload(Listing.photos),
            selectinload(Booking.listing).selectinload(Listing.host),
            selectinload(Booking.listing).selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Listing.host_id == user.id)
        .order_by(Booking.check_in)
    ).all()
    return [TripOut(booking=BookingOut.model_validate(item, from_attributes=True), listing=listing_out(item.listing, db)) for item in bookings]



@app.get("/api/v1/favorites", response_model=list[ListingOut])
def my_favorites(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[ListingOut]:
    listings = db.scalars(
        select(Listing)
        .join(Favorite)
        .options(
            selectinload(Listing.photos), selectinload(Listing.host),
            selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
        )
        .where(Favorite.user_id == user.id, Listing.is_active.is_(True))
    ).all()
    return [listing_out(item) for item in listings]


@app.put("/api/v1/favorites/{listing_id}", status_code=204)
def add_favorite(listing_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> None:
    get_listing_or_404(db, listing_id)
    if db.get(Favorite, (user.id, listing_id)) is None:
        db.add(Favorite(user_id=user.id, listing_id=listing_id))
        db.commit()


@app.delete("/api/v1/favorites/{listing_id}", status_code=204)
def remove_favorite(listing_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> None:
    favorite = db.get(Favorite, (user.id, listing_id))
    if favorite:
        db.delete(favorite)
        db.commit()

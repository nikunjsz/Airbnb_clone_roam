"""Idempotent demo data for a useful first-run marketplace."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import (
    Amenity,
    AvailabilityBlock,
    Booking,
    Favorite,
    Listing,
    ListingAmenity,
    ListingPhoto,
    Review,
    User,
)


USERS = [
    ("Aarav", "aarav@roam.demo", "https://i.pravatar.cc/160?img=12", True, "Architect and mountain host."),
    ("Leela Nair", "leela@roam.demo", "https://i.pravatar.cc/160?img=32", True, "Designer sharing quiet coastal homes."),
    ("Kabir Singh", "kabir@roam.demo", "https://i.pravatar.cc/160?img=53", True, "Heritage-home host and local guide."),
    ("Maya Rao", "maya@roam.demo", "https://i.pravatar.cc/160?img=47", False, "Weekend explorer and food lover."),
    ("Rohan Das", "rohan@roam.demo", "https://i.pravatar.cc/160?img=68", False, "Photographer travelling across India."),
]

AMENITIES = [
    ("wifi", "Fast wifi", "wifi"),
    ("kitchen", "Kitchen", "kitchen"),
    ("pool", "Pool", "pool"),
    ("parking", "Free parking", "parking"),
    ("air-conditioning", "Air conditioning", "snowflake"),
    ("workspace", "Dedicated workspace", "desk"),
    ("garden", "Private garden", "leaf"),
    ("mountain-view", "Mountain view", "mountain"),
    ("beach-access", "Beach access", "waves"),
    ("self-check-in", "Self check-in", "key"),
    ("washer", "Washer", "washer"),
    ("pets", "Pets allowed", "paw"),
]

# title, city, region, category, property type, price in paisa, latitude, longitude, cover image
LISTINGS = [
    ("Glass villa above the valley", "Manali", "Himachal Pradesh", "Amazing views", "Villa", 1840000, 32.2432, 77.1892, "1600607687939-ce8a6c25118c"),
    ("Quiet hideaway in the palms", "Assagao", "Goa", "Tropical", "Villa", 1275000, 15.5904, 73.8140, "1582268611958-ebfd161ef9cf"),
    ("Stone cottage in the hills", "Mussoorie", "Uttarakhand", "Countryside", "Cottage", 890000, 30.4598, 78.0644, "1449158743715-0a90ebb6d2d8"),
    ("Design home by the sea", "Alibag", "Maharashtra", "Beachfront", "Home", 2210000, 18.6414, 72.8722, "1600047509807-ba8f99d2cdde"),
    ("Heritage haveli courtyard suite", "Jaipur", "Rajasthan", "Mansions", "Guest suite", 735000, 26.9124, 75.7873, "1600566753190-17f0baa2a6c3"),
    ("Lake cabin under the pines", "Nainital", "Uttarakhand", "Cabins", "Cabin", 1080000, 29.3919, 79.4542, "1473448912268-2022ce9509d8"),
    ("Clifftop retreat with infinity pool", "Varkala", "Kerala", "Amazing pools", "Villa", 1620000, 8.7379, 76.7163, "1566073771259-6a8506099945"),
    ("Minimalist city loft", "Bengaluru", "Karnataka", "Design", "Loft", 640000, 12.9716, 77.5946, "1522708323590-d24dbb6b0267"),
    ("Tea estate bungalow at sunrise", "Munnar", "Kerala", "Countryside", "Bungalow", 970000, 10.0889, 77.0595, "1544984243-ec57ea16fe25"),
    ("Forest chalet beside the river", "Kasol", "Himachal Pradesh", "Cabins", "Chalet", 780000, 32.0100, 77.3150, "1510798831971-661eb04b3739"),
    ("Whitewashed home near the beach", "Anjuna", "Goa", "Beachfront", "Home", 1190000, 15.5730, 73.7400, "1499793983690-e29da59ef1c2"),
    ("Royal residence inside the old city", "Udaipur", "Rajasthan", "Mansions", "Haveli", 1430000, 24.5854, 73.7125, "1564013799919-ab600027ffc6"),
    ("Private pool house among orchards", "Nashik", "Maharashtra", "Amazing pools", "Villa", 1320000, 19.9975, 73.7898, "1580587771525-78b9dba3b914"),
    ("Contemporary apartment with skyline views", "Mumbai", "Maharashtra", "Design", "Apartment", 1560000, 19.0760, 72.8777, "1502672260266-1c1ef2d93688"),
    ("Bamboo cottage by the backwaters", "Alappuzha", "Kerala", "Tropical", "Cottage", 820000, 9.4981, 76.3388, "1500530855697-b586d89ba3ee"),
    ("Himalayan lodge beneath the stars", "Leh", "Ladakh", "Amazing views", "Lodge", 1250000, 34.1526, 77.5771, "1500534314209-a25ddb2bd429"),
    ("Coffee plantation treehouse", "Chikmagalur", "Karnataka", "Treehouses", "Treehouse", 1010000, 13.3161, 75.7720, "1520250497591-112f2f40a3f4"),
    ("Fort-view terrace suite", "Jodhpur", "Rajasthan", "Amazing views", "Guest suite", 690000, 26.2389, 73.0243, "1590490360182-c33d57733427"),
    ("Houseboat on a quiet lagoon", "Srinagar", "Jammu and Kashmir", "Boats", "Houseboat", 1160000, 34.0837, 74.7973, "1493809842364-78817add7ffb"),
    ("Red-earth farmhouse with a pool", "Auroville", "Tamil Nadu", "Amazing pools", "Farm stay", 940000, 12.0069, 79.8106, "1600047509358-9dc75507daeb"),
    ("Colonial cottage in tea country", "Ooty", "Tamil Nadu", "Countryside", "Cottage", 870000, 11.4102, 76.6950, "1505693416388-ac5ce068fe85"),
    ("Sunlit penthouse in the arts district", "New Delhi", "Delhi", "Design", "Apartment", 1380000, 28.6139, 77.2090, "1600566753086-00f18fb6b3ea"),
    ("Secluded beach cottage", "Gokarna", "Karnataka", "Beachfront", "Cottage", 910000, 14.5479, 74.3188, "1455587734955-081b22074882"),
    ("Cedar cabin overlooking the valley", "Shimla", "Himachal Pradesh", "Cabins", "Cabin", 990000, 31.1048, 77.1734, "1449844908441-8829872d2607"),
]

INTERIOR_PHOTOS = [
    "1600566753086-00f18fb6b3ea",
    "1600607687920-4e2a09cf159d",
    "1600566753051-f0b89df2dd90",
    "1600585154340-be6161a56a0c",
]

PHOTO_FILES = {
    "1600607687939-ce8a6c25118c": "manali-villa.jpg",
    "1582268611958-ebfd161ef9cf": "goa-palms.jpg",
    "1449158743715-0a90ebb6d2d8": "mussoorie-cottage.jpg",
    "1600047509807-ba8f99d2cdde": "alibag-home.jpg",
    "1600566753190-17f0baa2a6c3": "jaipur-haveli.jpg",
    "1473448912268-2022ce9509d8": "nainital-cabin.jpg",
    "1566073771259-6a8506099945": "varkala-pool.jpg",
    "1522708323590-d24dbb6b0267": "bengaluru-loft.jpg",
    "1544984243-ec57ea16fe25": "munnar-bungalow.jpg",
    "1510798831971-661eb04b3739": "kasol-chalet.jpg",
    "1499793983690-e29da59ef1c2": "anjuna-home.jpg",
    "1564013799919-ab600027ffc6": "udaipur-residence.jpg",
    "1580587771525-78b9dba3b914": "nashik-pool.jpg",
    "1502672260266-1c1ef2d93688": "mumbai-apartment.jpg",
    "1500530855697-b586d89ba3ee": "alappuzha-cottage.jpg",
    "1500534314209-a25ddb2bd429": "leh-lodge.jpg",
    "1520250497591-112f2f40a3f4": "treehouse.jpg",
    "1590490360182-c33d57733427": "jodhpur-suite.jpg",
    "1493809842364-78817add7ffb": "srinagar-houseboat.jpg",
    "1600047509358-9dc75507daeb": "auroville-farm.jpg",
    "1505693416388-ac5ce068fe85": "ooty-cottage.jpg",
    "1600566753086-00f18fb6b3ea": "delhi-penthouse.jpg",
    "1455587734955-081b22074882": "gokarna-cottage.jpg",
    "1449844908441-8829872d2607": "shimla-cabin.jpg",
    "1600607687920-4e2a09cf159d": "interior-living.jpg",
    "1600566753051-f0b89df2dd90": "interior-bedroom.jpg",
    "1600585154340-be6161a56a0c": "interior-exterior.jpg",
}


def image_url(photo_id: str) -> str:
    """Return a frontend-owned URL so photos also work offline and in Docker."""
    return f"/images/listings/{PHOTO_FILES[photo_id]}"


def seed_database(db: Session) -> None:
    """Insert missing demo records without overwriting user-created data."""
    users: list[User] = []
    for name, email, avatar, can_host, bio in USERS:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(name=name, email=email, avatar_url=avatar, can_host=can_host, bio=bio)
            db.add(user)
            db.flush()
        users.append(user)

    amenities: list[Amenity] = []
    for slug, name, icon_key in AMENITIES:
        amenity = db.scalar(select(Amenity).where(Amenity.slug == slug))
        if amenity is None:
            amenity = Amenity(slug=slug, name=name, icon_key=icon_key)
            db.add(amenity)
            db.flush()
        amenities.append(amenity)

    today = date.today()
    seeded_listings: list[Listing] = []
    for index, row in enumerate(LISTINGS):
        title, city, region, category, property_type, price, latitude, longitude, cover_id = row
        listing = db.scalar(select(Listing).where(Listing.title == title))
        if listing is None:
            host = users[index % 3]
            listing = Listing(
                host_id=host.id,
                title=title,
                subtitle=f"{city}, {region}",
                description=(
                    f"A thoughtfully hosted {property_type.lower()} in {city}, designed for relaxed stays. "
                    "The home combines local character, comfortable rooms, and easy access to nearby highlights."
                ),
                city=city,
                region=region,
                country="India",
                latitude=latitude,
                longitude=longitude,
                category=category,
                property_type=property_type,
                nightly_price_minor=price,
                cleaning_fee_minor=120000 + (index % 4) * 30000,
                currency="INR",
                max_guests=2 + (index % 6),
                bedrooms=1 + (index % 4),
                beds=1 + (index % 5),
                bathrooms=1 + (index % 3),
                rating_hundredths=0,
                review_count=0,
            )
            listing.photos = [
                ListingPhoto(url=image_url(cover_id), alt_text=title, sort_order=0),
                *[
                    ListingPhoto(url=image_url(photo_id), alt_text=f"Interior of {title}", sort_order=order)
                    for order, photo_id in enumerate(INTERIOR_PHOTOS, start=1)
                ],
            ]
            selected_amenities = {0, 1, 3, 5, 9, index % len(amenities), (index + 2) % len(amenities)}
            listing.amenity_links = [ListingAmenity(amenity_id=amenities[position].id) for position in selected_amenities]
            db.add(listing)
            db.flush()

            ratings = [5, 5, 5] if (index % 3 == 0) else [4, 4, 5]
            for review_index, rating in enumerate(ratings):
                author = users[3 + (review_index % 2)]
                db.add(
                    Review(
                        listing_id=listing.id,
                        author_id=author.id,
                        rating=rating,
                        comment=(
                            "Beautifully maintained, accurately described, and hosted with real care. "
                            "We would happily stay here again."
                        ),
                    )
                )
            listing.review_count = len(ratings)
            listing.rating_hundredths = round(sum(ratings) / len(ratings) * 100)
            listing.is_guest_favorite = listing.rating_hundredths >= 480

            db.add(
                AvailabilityBlock(
                    listing_id=listing.id,
                    start_date=today + timedelta(days=25 + index),
                    end_date=today + timedelta(days=27 + index),
                    reason="Host maintenance",
                )
            )
        else:
            # Keep demo rows created by older versions in sync with bundled images.
            desired_photos = [cover_id, *INTERIOR_PHOTOS]
            ordered_photos = sorted(listing.photos, key=lambda photo: photo.sort_order)
            for order, photo_id in enumerate(desired_photos):
                if order < len(ordered_photos):
                    ordered_photos[order].url = image_url(photo_id)
                    ordered_photos[order].alt_text = title if order == 0 else f"Interior of {title}"
        seeded_listings.append(listing)

    # Seed realistic upcoming and completed past trips.
    if db.scalar(select(Booking.id).where(Booking.idempotency_key == "seed-upcoming-maya")) is None:
        listing = seeded_listings[3]
        check_in = today + timedelta(days=45)
        nights = 4
        subtotal = listing.nightly_price_minor * nights
        service_fee = round(subtotal * 0.12)
        db.add(
            Booking(
                listing_id=listing.id,
                guest_id=users[3].id,
                check_in=check_in,
                check_out=check_in + timedelta(days=nights),
                guests=2,
                status="confirmed",
                nightly_price_minor=listing.nightly_price_minor,
                nights=nights,
                subtotal_minor=subtotal,
                cleaning_fee_minor=listing.cleaning_fee_minor,
                service_fee_minor=service_fee,
                total_minor=subtotal + listing.cleaning_fee_minor + service_fee,
                currency=listing.currency,
                idempotency_key="seed-upcoming-maya",
            )
        )

    if db.scalar(select(Booking.id).where(Booking.idempotency_key == "seed-past-maya")) is None:
        listing = seeded_listings[0]
        check_in = today - timedelta(days=15)
        nights = 3
        subtotal = listing.nightly_price_minor * nights
        service_fee = round(subtotal * 0.12)
        db.add(
            Booking(
                listing_id=listing.id,
                guest_id=users[3].id,
                check_in=check_in,
                check_out=check_in + timedelta(days=nights),
                guests=2,
                status="confirmed",
                nightly_price_minor=listing.nightly_price_minor,
                nights=nights,
                subtotal_minor=subtotal,
                cleaning_fee_minor=listing.cleaning_fee_minor,
                service_fee_minor=service_fee,
                total_minor=subtotal + listing.cleaning_fee_minor + service_fee,
                currency=listing.currency,
                idempotency_key="seed-past-maya",
            )
        )

    if db.scalar(select(Favorite).where(Favorite.user_id == users[3].id, Favorite.listing_id == seeded_listings[0].id)) is None:
        db.add(Favorite(user_id=users[3].id, listing_id=seeded_listings[0].id))

    db.commit()



def main() -> None:
    with SessionLocal() as db:
        seed_database(db)
    print("Demo data is ready.")


if __name__ == "__main__":
    main()

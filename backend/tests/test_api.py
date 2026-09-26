from datetime import date, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.database import SessionLocal
from app.main import UPLOAD_DIR, app
from app.models import Amenity, AvailabilityBlock, Listing, Review, User
from app.seed import seed_database


def sign_in_demo(client: TestClient, user_id: int) -> None:
    response = client.post("/api/v1/demo/session", json={"user_id": user_id})
    assert response.status_code == 200


def test_health_check():
    """Verify health endpoint returns 200 OK."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_listings_pagination_and_structure():
    """Verify paginated listings structure and field contracts."""
    with TestClient(app) as client:
        response = client.get("/api/v1/listings")
        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

        assert data["total"] >= 8
        assert data["page"] == 1
        assert len(data["items"]) > 0

        # Check single listing contract against frontend types
        item = data["items"][0]
        assert "id" in item
        assert "title" in item
        assert "subtitle" in item
        assert "description" in item
        assert "city" in item
        assert "region" in item
        assert "country" in item
        assert "category" in item
        assert "property_type" in item
        assert "nightly_price_minor" in item
        assert "cleaning_fee_minor" in item
        assert "currency" in item
        assert "max_guests" in item
        assert "bedrooms" in item
        assert "beds" in item
        assert "bathrooms" in item
        assert "rating" in item
        assert "review_count" in item
        assert "is_guest_favorite" in item
        assert "photos" in item
        assert "amenities" in item
        assert "host" in item
        assert isinstance(item["photos"], list)
        assert isinstance(item["amenities"], list)
        assert isinstance(item["host"], dict)


def test_listings_category_filtering():
    """Verify category query parameter filters listings properly."""
    with TestClient(app) as client:
        response = client.get("/api/v1/listings?category=Amazing views")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0
        for item in data["items"]:
            assert item["category"] == "Amazing views"


def test_combined_discovery_filters():
    """Room, amenity, property, and guest-favourite filters compose correctly."""
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/listings?property_type=Villa&bedrooms=1&beds=1&bathrooms=1&amenity=wifi&guest_favorite=true"
        )
        assert response.status_code == 200
        items = response.json()["items"]
        assert items
        for item in items:
            assert item["property_type"] == "Villa"
            assert item["bedrooms"] >= 1
            assert item["beds"] >= 1
            assert item["bathrooms"] >= 1
            assert item["is_guest_favorite"] is True
            assert "wifi" in {amenity["slug"] for amenity in item["amenities"]}


def test_listing_detail_success_and_404():
    """Verify existing listing detail returns full payload and missing ID returns 404."""
    with TestClient(app) as client:
        # Existing listing detail
        detail = client.get("/api/v1/listings/1")
        assert detail.status_code == 200
        listing = detail.json()
        assert listing["id"] == 1
        assert listing["title"] == "Glass villa above the valley"
        assert len(listing["photos"]) > 0
        assert listing["host"]["name"] == "Aarav"

        # Non-existent listing detail returns 404
        missing = client.get("/api/v1/listings/999999")
        assert missing.status_code == 404
        assert missing.json()["detail"] == "Listing not found"


def test_listings_and_booking_conflict():
    """Verify atomic booking, idempotency, and date conflict handling."""
    with TestClient(app) as client:
        sign_in_demo(client, 4)
        # A randomized distant range keeps this persistent-database test repeatable.
        start = date.today() + timedelta(days=2000 + (uuid4().int % 10000))
        payload = {
            "listing_id": 1,
            "check_in": start.isoformat(),
            "check_out": (start + timedelta(days=3)).isoformat(),
            "guests": 2,
            "idempotency_key": f"test-{start.isoformat()}",
        }
        first = client.post("/api/v1/bookings", json=payload)
        assert first.status_code == 201

        # Idempotent re-submission with same idempotency key returns 201
        repeated = client.post("/api/v1/bookings", json=payload)
        assert repeated.status_code == 201

        # Overlapping dates with different idempotency key returns 409 Conflict
        overlapping = {**payload, "idempotency_key": f"overlap-{start.isoformat()}"}
        conflict = client.post("/api/v1/bookings", json=overlapping)
        assert conflict.status_code == 409


def test_host_can_create_update_and_archive_listing():
    """Verify host listing lifecycle endpoints."""
    payload = {
        "title": "Cedar house for integration testing",
        "description": "A complete test listing with enough detail to satisfy validation.",
        "city": "Shimla",
        "region": "Himachal Pradesh",
        "nightly_price_minor": 950000,
        "cleaning_fee_minor": 120000,
        "max_guests": 4,
        "bedrooms": 2,
        "beds": 2,
        "bathrooms": 2,
        "photo_urls": ["https://images.unsplash.com/photo-test"],
        "amenity_slugs": ["wifi"],
    }
    with TestClient(app) as client:
        sign_in_demo(client, 1)
        created = client.post("/api/v1/listings", json=payload)
        assert created.status_code == 201
        listing_id = created.json()["id"]
        discovery = client.get("/api/v1/listings?location=Shimla").json()
        assert any(item["id"] == listing_id for item in discovery["items"])

        updated = client.patch(f"/api/v1/listings/{listing_id}", json={
            "nightly_price_minor": 990000,
            "city": "Manali",
            "region": "Himachal Pradesh",
            "photo_urls": ["https://images.unsplash.com/photo-updated"],
            "amenity_slugs": ["wifi", "parking"],
        })
        assert updated.status_code == 200
        assert updated.json()["nightly_price_minor"] == 990000
        assert updated.json()["subtitle"] == "Manali, Himachal Pradesh"
        assert updated.json()["photos"][0]["url"].endswith("photo-updated")
        assert {item["slug"] for item in updated.json()["amenities"]} == {"wifi", "parking"}

        archived = client.delete(f"/api/v1/listings/{listing_id}")
        assert archived.status_code == 204
        assert client.get(f"/api/v1/listings/{listing_id}").status_code == 404


def test_host_can_upload_listing_photo():
    """Device images are persisted and exposed from the backend upload route."""
    with TestClient(app) as client:
        sign_in_demo(client, 1)
        response = client.post(
            "/api/v1/uploads/listing-photo",
            files={"photo": ("home.png", b"\x89PNG\r\n\x1a\nlocal-test-image", "image/png")},
        )
        assert response.status_code == 200
        filename = response.json()["url"].rsplit("/", 1)[-1]
        stored = UPLOAD_DIR / filename
        assert stored.exists()
        assert client.get(f"/uploads/{filename}").status_code == 200
        stored.unlink()


def test_seed_data_is_complete_and_idempotent():
    """The explicit seed command may be rerun without duplicating demo records."""
    with SessionLocal() as db:
        before = {
            "users": db.scalar(select(func.count()).select_from(User)),
            "listings": db.scalar(select(func.count()).select_from(Listing)),
            "amenities": db.scalar(select(func.count()).select_from(Amenity)),
            "reviews": db.scalar(select(func.count()).select_from(Review)),
            "blocks": db.scalar(select(func.count()).select_from(AvailabilityBlock)),
        }
        seed_database(db)
        after = {
            "users": db.scalar(select(func.count()).select_from(User)),
            "listings": db.scalar(select(func.count()).select_from(Listing)),
            "amenities": db.scalar(select(func.count()).select_from(Amenity)),
            "reviews": db.scalar(select(func.count()).select_from(Review)),
            "blocks": db.scalar(select(func.count()).select_from(AvailabilityBlock)),
        }

    assert after == before
    assert after["users"] >= 5
    assert after["listings"] >= 24
    assert after["amenities"] >= 12
    assert after["reviews"] >= 72
    assert after["blocks"] >= 24


def test_registration_login_and_logout_session_flow():
    """A registered account receives an HTTP-only session usable by /auth/me."""
    email = f"traveller-{uuid4().hex}@example.com"
    payload = {"name": "Test Traveller", "email": email, "password": "safe-demo-password"}
    with TestClient(app) as client:
        registered = client.post("/api/v1/auth/register", json=payload)
        assert registered.status_code == 201
        assert registered.json()["email"] == email
        assert "roam_session=" in registered.headers["set-cookie"]
        assert "HttpOnly" in registered.headers["set-cookie"]

        assert client.get("/api/v1/auth/me").status_code == 200
        assert client.post("/api/v1/auth/logout").status_code == 204
        assert client.get("/api/v1/auth/me").status_code == 401

        logged_in = client.post("/api/v1/auth/login", json={"email": email, "password": payload["password"]})
        assert logged_in.status_code == 200
        assert client.get("/api/v1/auth/me").json()["email"] == email


def test_demo_identity_switcher_creates_session():
    with TestClient(app) as client:
        users = client.get("/api/v1/demo/users")
        assert users.status_code == 200
        assert len(users.json()) >= 5

        selected = client.post("/api/v1/demo/session", json={"user_id": users.json()[0]["id"]})
        assert selected.status_code == 200
        assert client.get("/api/v1/auth/me").json()["id"] == users.json()[0]["id"]


def test_private_guest_resources_require_session_and_persist_favorites():
    with TestClient(app) as client:
        assert client.get("/api/v1/trips").status_code == 401
        assert client.get("/api/v1/favorites").status_code == 401

        sign_in_demo(client, 5)
        assert client.put("/api/v1/favorites/2").status_code == 204
        saved_ids = {item["id"] for item in client.get("/api/v1/favorites").json()}
        assert 2 in saved_ids
        assert client.delete("/api/v1/favorites/2").status_code == 204


def test_host_dashboard_is_scoped_to_signed_in_owner():
    with TestClient(app) as client:
        sign_in_demo(client, 1)
        listings = client.get("/api/v1/host/listings")
        reservations = client.get("/api/v1/host/reservations")
        assert listings.status_code == 200
        assert reservations.status_code == 200
        assert all(item["host"]["id"] == 1 for item in listings.json())
        assert all(item["listing"]["host"]["id"] == 1 for item in reservations.json())


def test_review_eligibility_duplicate_prevention_and_aggregation():
    """Verify review creation flow for completed stays, duplicate prevention, and rating aggregation."""
    with TestClient(app) as client:
        # Sign in as Maya (user 4)
        sign_in_demo(client, 4)
        trips = client.get("/api/v1/trips").json()
        today_str = date.today().isoformat()
        
        # Find or create a completed past trip without a review yet
        past_trip = next((t for t in trips if t["booking"]["check_out"] <= today_str and not t.get("has_review")), None)
        if past_trip is None:
            # Book a stay and update check_out date in DB to past for test purposes
            from app.database import SessionLocal
            from app.models import Booking
            db = SessionLocal()
            try:
                b = Booking(
                    listing_id=2,
                    guest_id=4,
                    check_in=date.today() - timedelta(days=10),
                    check_out=date.today() - timedelta(days=5),
                    guests=2,
                    status="confirmed",
                    nightly_price_minor=100000,
                    nights=5,
                    subtotal_minor=500000,
                    cleaning_fee_minor=5000,
                    service_fee_minor=60000,
                    total_minor=565000,
                    currency="INR",
                    idempotency_key=f"test-unreviewed-past-{date.today().isoformat()}",
                )
                db.add(b)
                db.commit()
                db.refresh(b)
                booking_id = b.id
                listing_id = b.listing_id
            finally:
                db.close()
        else:
            booking_id = past_trip["booking"]["id"]
            listing_id = past_trip["listing"]["id"]

        # 1. Attempt invalid rating
        bad_rating = client.post(
            f"/api/v1/listings/{listing_id}/reviews",
            json={"booking_id": booking_id, "rating": 6, "comment": "Too high rating"},
        )
        assert bad_rating.status_code == 422

        # 2. Submit valid review
        review_payload = {"booking_id": booking_id, "rating": 5, "comment": "Absolute magic stay!"}
        success = client.post(f"/api/v1/listings/{listing_id}/reviews", json=review_payload)
        assert success.status_code == 201
        res = success.json()
        assert res["rating"] == 5
        assert res["comment"] == "Absolute magic stay!"

        # 3. Verify trip now indicates has_review=True
        trips_after = client.get("/api/v1/trips").json()
        past_after = next(t for t in trips_after if t["booking"]["id"] == booking_id)
        assert past_after["has_review"] is True

        # 4. Duplicate review submission for same booking is rejected with 409
        dup = client.post(f"/api/v1/listings/{listing_id}/reviews", json=review_payload)
        assert dup.status_code == 409

        # 5. Check listing rating and review count aggregated in detail
        detail = client.get(f"/api/v1/listings/{listing_id}").json()
        assert detail["review_count"] >= 1
        assert detail["rating"] > 0


def test_uncompleted_stay_cannot_be_reviewed():
    """Attempting to review an uncompleted/upcoming stay is rejected."""
    with TestClient(app) as client:
        sign_in_demo(client, 4)
        trips = client.get("/api/v1/trips").json()
        today_str = date.today().isoformat()
        upcoming = next(t for t in trips if t["booking"]["check_out"] > today_str)
        response = client.post(
            f"/api/v1/listings/{upcoming['listing']['id']}/reviews",
            json={"booking_id": upcoming["booking"]["id"], "rating": 5, "comment": "Cannot review yet"},
        )
        assert response.status_code == 400



def test_superhost_status_calculation():
    """Verify Superhost status is correctly calculated based on rating and review count threshold."""
    with TestClient(app) as client:
        # Host 1 (Aarav) has ratings 5, 5, 5 across multiple listings -> should be Superhost
        response = client.get("/api/v1/listings/1")
        assert response.status_code == 200
        host = response.json()["host"]
        assert host["is_superhost"] is True


def test_host_ownership_checks_for_edit_and_archive():
    """User cannot edit or archive listings owned by another host."""
    with TestClient(app) as client:
        # Sign in as host 2 (Leela)
        sign_in_demo(client, 2)
        # Attempt to edit listing 1 (owned by host 1 Aarav)
        patch_res = client.patch("/api/v1/listings/1", json={"title": "Hacked Title by another host"})
        assert patch_res.status_code == 403

        # Attempt to archive listing 1 (owned by host 1 Aarav)
        del_res = client.delete("/api/v1/listings/1")
        assert del_res.status_code == 403


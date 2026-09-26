"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/account-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { archiveHostListing, createHostListing, getCurrentUser, getHostListings, getHostReservations, updateHostListing, uploadListingPhoto, type Trip } from "@/lib/api";
import type { Listing } from "@/lib/api/types";
import { money } from "@/lib/listings";

/**
 * Host dashboard screen.
 * Displays owned listings, host statistics, and a form modal to publish new listings.
 * Integrates with POST /api/v1/listings backend endpoint.
 */
export default function HostPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [message, setMessage] = useState<string>("");
  const [hostName, setHostName] = useState("Host");
  const [reservations, setReservations] = useState<Trip[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Listing | null>(null);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getHostListings(controller.signal), getCurrentUser(controller.signal), getHostReservations(controller.signal)])
      .then(([items, user, stays]) => { setListings(items); setHostName(user.name); setReservations(stays); })
      .catch(() => setMessage("Choose a host profile from the account menu to manage listings."));
    return () => controller.abort();
  }, []);

  async function handleConfirmArchive() {
    if (!archiveTarget) return;
    try {
      await archiveHostListing(archiveTarget.id);
      setListings((items) => items.filter((item) => item.id !== archiveTarget.id));
      toast.success(`Archived "${archiveTarget.title}"`, "Listing Archived");
      setMessage("Listing archived.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive listing", "Error");
    } finally {
      setArchiveTarget(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawPrice = Number(data.get("price")) || 0;

    /**
     * Money is converted from major units (Rupees) to minor units (paisa) by multiplying by 100.
     * The backend requires integer minor units to maintain numerical precision.
     */
    try {
      setMessage(photoFile ? "Uploading your photo…" : "Publishing your listing…");
      let photoUrl = String(data.get("photo") || "").trim();
      if (photoFile) {
        const uploadRes = await uploadListingPhoto(photoFile);
        photoUrl = uploadRes.url;
        toast.info("Photo uploaded successfully.", "Image Upload");
      }
      if (!photoUrl) throw new Error("Choose a photo from your device or enter a photo URL.");
      const payload = {
        title: data.get("title") as string,
        description: data.get("description") as string,
        city: data.get("city") as string,
        region: data.get("region") as string,
        country: "India",
        category: String(data.get("category") || "Amazing views"),
        property_type: String(data.get("property_type") || "Home"),
        nightly_price_minor: rawPrice * 100,
        cleaning_fee_minor: 150000,
        max_guests: Number(data.get("guests")) || 2,
        bedrooms: Number(data.get("bedrooms")) || 0,
        beds: Number(data.get("beds")) || 1,
        bathrooms: Number(data.get("bathrooms")) || 1,
        photo_urls: [photoUrl],
        amenity_slugs: String(data.get("amenities") || "").split(",").map((item) => item.trim()).filter(Boolean),
      };
      if (editing) {
        const updated = await updateHostListing(editing.id, payload);
        setListings((items) => items.map((item) => item.id === updated.id ? updated : item));
        toast.success(`Updated "${updated.title}"`, "Listing Saved");
        setMessage("Listing updated.");
      } else {
        const created = await createHostListing(payload);
        setListings((items) => [created, ...items]);
        toast.success(`"${created.title}" is now live on Roam!`, "Listing Created");
        setMessage("Your listing is live.");
      }
      setEditing(null);
      setShowForm(false);
      setPhotoFile(null);
      setPhotoPreview("");
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Could not publish the listing.";
      setMessage(msg);
      toast.error(msg, "Publish Failed");
    }
  }

  return (
    <>
      <header className="host-header">
        <Link href="/">
          <Logo />
        </Link>
        <nav>
          <button type="button" className="active">
            Today
          </button>
          <button type="button" onClick={() => toast.info("Host calendar view coming soon", "Calendar")}>Calendar</button>
          <button type="button" onClick={() => document.getElementById("host-listings-section")?.scrollIntoView({ behavior: "smooth" })}>Listings</button>
          <button type="button" onClick={() => toast.info("Guest messaging coming soon", "Messages")}>Messages</button>
        </nav>
        <div>
          <Link href="/">Switch to travelling</Link>
          <AccountMenu />
        </div>
      </header>

      <main className="host-main">
        <div className="host-welcome">
          <div>
            <p>Welcome back,</p>
            <h1>{hostName}</h1>
          </div>
          <button type="button" onClick={() => { setEditing(null); setPhotoFile(null); setPhotoPreview(""); setShowForm(true); }}>
            ＋ Create listing
          </button>
        </div>

        {message && <p className="host-message">{message}</p>}

        <section className="host-stats">
          <article>
            <span>Next check-in</span>
            <strong>2 Oct</strong>
            <p>Glass villa above the valley</p>
          </article>
          <article>
            <span>Current guests</span>
            <strong>{reservations.filter((item) => item.booking.status === "confirmed").length}</strong>
            <p>Across your active homes</p>
          </article>
          <article>
            <span>This month</span>
            <strong>₹1,48,200</strong>
            <p>Estimated earnings</p>
          </article>
        </section>

        <div className="host-section-title" id="host-listings-section">
          <h2>Your listings ({listings.length})</h2>
          <button type="button" onClick={() => toast.info(`Viewing all ${listings.length} active listings`)}>View all</button>
        </div>


        <section className="host-listings">
          {listings.map((listing) => (
            <article key={listing.id}>
              <Link href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer">
                <Image
                  src={listing.photos[0]?.url ?? "/images/listings/manali-villa.jpg"}
                  alt={listing.title}
                  fill
                  unoptimized={listing.photos[0]?.url.startsWith("http://localhost:8000")}
                />
              </Link>
              <span>Listed</span>
              <h3>{listing.title}</h3>
              <p>
                {listing.subtitle} · {money(listing.nightly_price_minor)} night
              </p>
              <div className="host-card-actions">
                <button type="button" onClick={() => { setEditing(listing); setPhotoFile(null); setPhotoPreview(listing.photos[0]?.url ?? ""); setShowForm(true); }}>Edit</button>
                <button type="button" onClick={() => setArchiveTarget(listing)}>Archive</button>
              </div>
            </article>
          ))}
        </section>
        <div className="host-section-title"><h2>Reservations</h2></div>
        <section className="reservation-table">
          {reservations.length ? reservations.map(({ booking, listing }) => <article key={booking.id}><strong>{listing.title}</strong><span>{booking.check_in} → {booking.check_out}</span><span>{booking.guests} guests</span><span>{money(booking.total_minor)}</span></article>) : <p>No reservations yet.</p>}
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop">
          <form className="listing-form" onSubmit={handleSubmit}>
            <div className="modal-title">
              <button type="button" onClick={() => { setEditing(null); setShowForm(false); }}>
                ×
              </button>
              <strong>{editing ? "Edit listing" : "Create a listing"}</strong>
              <span />
            </div>

            <div className="form-body">
              <label>
                Title
                <input
                  name="title"
                  required
                  minLength={5}
                  placeholder="A memorable name for your place"
                  defaultValue={editing?.title}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  minLength={20}
                  placeholder="Tell guests what makes your place special"
                  defaultValue={editing?.description}
                />
              </label>
              <div>
                <label>
                  City
                  <input name="city" required defaultValue={editing?.city} />
                </label>
                <label>
                  State or region
                  <input name="region" required defaultValue={editing?.region} />
                </label>
              </div>
              <div>
                <label>
                  Price per night (₹)
                  <input name="price" type="number" min="1" required defaultValue={editing ? editing.nightly_price_minor / 100 : undefined} />
                </label>
                <label>
                  Maximum guests
                  <input name="guests" type="number" min="1" max="30" required defaultValue={editing?.max_guests} />
                </label>
              </div>
              <div>
                <label>Property type<input name="property_type" required defaultValue={editing?.property_type ?? "Home"} /></label>
                <label>Category<input name="category" required defaultValue={editing?.category ?? "Amazing views"} /></label>
              </div>
              <div>
                <label>Bedrooms<input name="bedrooms" type="number" min="0" required defaultValue={editing?.bedrooms ?? 1} /></label>
                <label>Beds<input name="beds" type="number" min="1" required defaultValue={editing?.beds ?? 1} /></label>
              </div>
              <div>
                <label>Bathrooms<input name="bathrooms" type="number" min="1" required defaultValue={editing?.bathrooms ?? 1} /></label>
                <span />
              </div>
              <label>Amenities (comma-separated slugs)<input name="amenities" placeholder="wifi, pool, parking" defaultValue={editing?.amenities.map((item) => item.slug).join(", ")} /></label>
              <label>
                Cover photo URL (optional when uploading)
                <input
                  name="photo"
                  type="text"
                  placeholder="https://example.com/home.jpg"
                  defaultValue={editing?.photos[0]?.url ?? "/images/listings/interior-exterior.jpg"}
                />
              </label>
              <label className="photo-upload-field">
                Or upload a cover photo from your device
                <input name="photo_file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setPhotoFile(selected);
                  if (!selected) { setPhotoPreview(editing?.photos[0]?.url ?? ""); return; }
                  const reader = new FileReader();
                  reader.onload = () => setPhotoPreview(String(reader.result || ""));
                  reader.readAsDataURL(selected);
                }} />
                <small>JPG, PNG, or WebP · maximum 8 MB</small>
              </label>
              {photoPreview && <div className="photo-upload-preview" style={{ backgroundImage: `url(${photoPreview})` }} role="img" aria-label="Selected cover photo preview" />}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="clear"
                onClick={() => { setEditing(null); setShowForm(false); }}
              >
                Cancel
              </button>
              <button className="show" type="submit">
                {editing ? "Save changes" : "Create listing"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={archiveTarget !== null}
        title="Archive Listing"
        message={`Are you sure you want to archive "${archiveTarget?.title}"? Archived listings will no longer be visible in public discovery or open for new bookings.`}
        confirmText="Archive Listing"
        isDanger={true}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  );
}


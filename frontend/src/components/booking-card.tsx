"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Listing } from "@/lib/api/types";
import { createBooking, getAvailability, type UnavailableRange } from "@/lib/api";
import { money } from "@/lib/listings";
import { DateRangePicker, formatStayDate } from "./date-range-picker";
import { useToast } from "./toast";

interface BookingCardProps {
  listing: Listing;
}

type ReservationStatus = "idle" | "checkout" | "loading" | "reserved" | "error";

function GuestCounter({ label, detail, value, minimum = 0, disabled, onChange }: { label: string; detail: string; value: number; minimum?: number; disabled?: boolean; onChange: (value: number) => void }) {
  return <div className="booking-guest-row"><span><strong>{label}</strong><small>{detail}</small></span><div><button type="button" disabled={value <= minimum} onClick={() => onChange(value - 1)}>−</button><b>{value}</b><button type="button" disabled={disabled} onClick={() => onChange(value + 1)}>+</button></div></div>;
}

/**
 * Sticky reservation widget on listing detail page.
 * Calculates price breakdown (subtotal, cleaning fee, 12% service fee) in minor units.
 * Note: The backend remains authoritative for price quotes and availability validation.
 */
export function BookingCard({ listing }: BookingCardProps) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [status, setStatus] = useState<ReservationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const toast = useToast();

  const guests = adults + children;
  const guestSummary = [
    `${guests} guest${guests > 1 ? "s" : ""}`,
    infants ? `${infants} infant${infants > 1 ? "s" : ""}` : "",
    pets ? `${pets} pet${pets > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(", ");

  useEffect(() => {
    const controller = new AbortController();
    getAvailability(listing.id, controller.signal).then((data) => setUnavailable(data.unavailable)).catch(() => undefined);
    return () => controller.abort();
  }, [listing.id]);

  useEffect(() => {
    const closeGuestPicker = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) setGuestOpen(false);
    };
    document.addEventListener("mousedown", closeGuestPicker);
    return () => document.removeEventListener("mousedown", closeGuestPicker);
  }, []);

  const nights = checkIn && checkOut ? Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)) : 0;

  // Calculations are in minor units (paisa) to avoid floating point imprecision
  const subtotal = listing.nightly_price_minor * nights;
  const serviceFee = Math.round(subtotal * 0.12);
  const total = useMemo(
    () => subtotal + listing.cleaning_fee_minor + serviceFee,
    [subtotal, serviceFee, listing.cleaning_fee_minor]
  );

  function beginCheckout() {
    setErrorMessage("");
    if (!checkIn || !checkOut || nights < 1) {
      const msg = "Choose valid check-in and check-out dates.";
      setStatus("error");
      setErrorMessage(msg);
      toast.error(msg, "Invalid Dates");
      return;
    }
    const overlaps = unavailable.some((range) => checkIn < range.end_date && checkOut > range.start_date);
    if (overlaps) {
      const msg = "Those dates are unavailable. Please choose another stay.";
      setStatus("error");
      setErrorMessage(msg);
      toast.error(msg, "Dates Unavailable");
      return;
    }
    setStatus("checkout");
  }

  async function confirmBooking() {
    setStatus("loading");
    try {
      await createBooking({
        listing_id: listing.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        idempotency_key: typeof crypto !== "undefined" ? crypto.randomUUID() : `key-${Date.now()}`,
      });

      setStatus("reserved");
      toast.success("Your stay has been confirmed! View details under Trips.", "Booking Confirmed");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Booking failed";
      const finalMsg = msg.includes("HTTP 500") ? "Start the API server and try again." : msg;
      setErrorMessage(finalMsg);
      toast.error(finalMsg, "Booking Failed");
    }
  }


  return (
    <aside className="booking-card" ref={cardRef}>
      <div className="fee-banner"><span>🏷️</span><strong>Prices include all fees</strong></div>
      <div className="booking-price">
        <strong>{nights ? money(total) : money(listing.nightly_price_minor)}</strong> <span>{nights ? `for ${nights} night${nights > 1 ? "s" : ""}` : "night"}</span>
      </div>

      <div className="booking-fields booking-date-fields">
        <button type="button" onClick={() => { setGuestOpen(false); setCalendarOpen(true); }}>
          <span>CHECK-IN</span>
          <strong>{checkIn ? formatStayDate(checkIn) : "Add date"}</strong>
        </button>
        <button type="button" onClick={() => { setGuestOpen(false); setCalendarOpen(true); }}>
          <span>CHECKOUT</span>
          <strong>{checkOut ? formatStayDate(checkOut) : "Add date"}</strong>
        </button>
        <button
          type="button"
          className="guest-field"
          aria-expanded={guestOpen}
          onClick={() => { setCalendarOpen(false); setGuestOpen((value) => !value); }}
        >
          <span>GUESTS</span>
          <strong>
            {guestSummary}
          </strong>
          <b>⌄</b>
        </button>
      </div>
      {guestOpen && <div className="booking-guest-popover" role="dialog" aria-label="Choose guests">
        <GuestCounter label="Adults" detail="Age 13+" value={adults} minimum={1} disabled={guests >= listing.max_guests} onChange={setAdults} />
        <GuestCounter label="Children" detail="Ages 2–12" value={children} disabled={guests >= listing.max_guests} onChange={setChildren} />
        <GuestCounter label="Infants" detail="Under 2" value={infants} disabled={infants >= 5} onChange={setInfants} />
        <GuestCounter label="Pets" detail="Bringing a service animal?" value={pets} disabled={pets >= 5} onChange={setPets} />
        <p>This place has a maximum of {listing.max_guests} guests, excluding infants.</p>
        <button type="button" className="guest-done" onClick={() => setGuestOpen(false)}>Close</button>
      </div>}
      {calendarOpen && <div className="booking-calendar-popover"><div className="booking-calendar-heading"><span><strong>Select dates</strong><small>{nights ? `${nights} nights` : "Add your travel dates"}</small></span><button type="button" onClick={() => setCalendarOpen(false)}>×</button></div><DateRangePicker months={1} checkIn={checkIn} checkOut={checkOut} unavailable={unavailable} onChange={(start, end) => { setCheckIn(start); setCheckOut(end); if (end) setCalendarOpen(false); }} /></div>}

      <button
        type="button"
        className="reserve-button"
        disabled={status === "loading" || status === "reserved"}
        onClick={beginCheckout}
      >
        {status === "loading"
          ? "Confirming…"
          : status === "reserved"
          ? "Reserved ✓"
          : "Reserve"}
      </button>

      <p className={`charge-note ${status === "error" ? "error" : ""}`}>
        {status === "error"
          ? errorMessage || "Start the API server and try again."
          : status === "reserved"
          ? "Your trip is confirmed and saved."
          : "You won’t be charged yet"}
      </p>

      <div className="price-lines">
        <p>
          <u>
            {money(listing.nightly_price_minor)} × {nights || 0} nights
          </u>
          <span>{money(subtotal)}</span>
        </p>
        <p>
          <u>Cleaning fee</u>
          <span>{money(listing.cleaning_fee_minor)}</span>
        </p>
        <p>
          <u>Roam service fee</u>
          <span>{money(serviceFee)}</span>
        </p>
      </div>

      <div className="total-line">
        <strong>Total before taxes</strong>
        <strong>{money(total)}</strong>
      </div>
      {status === "checkout" && <div className="modal-backdrop"><section className="checkout-modal" role="dialog" aria-modal="true" aria-label="Confirm booking">
        <button className="checkout-close" type="button" onClick={() => setStatus("idle")}>×</button>
        <h2>Confirm and book</h2><p>{listing.title}</p>
        <div className="checkout-summary"><span>{checkIn} → {checkOut}</span><span>{guests} guest{guests > 1 ? "s" : ""}</span></div>
        <label>Payment method<input value="Demo Visa •••• 4242" readOnly /></label>
        <div className="total-line"><strong>Total</strong><strong>{money(total)}</strong></div>
        <button type="button" className="reserve-button" onClick={confirmBooking}>Confirm and pay</button>
        <small>This is a demo checkout. No payment is processed.</small>
      </section></div>}
    </aside>
  );
}

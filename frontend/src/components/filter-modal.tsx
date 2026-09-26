"use client";

import { useEffect, useState } from "react";

export interface FilterValues {
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  guestFavorite: boolean;
}

interface FilterModalProps {
  totalResults: number;
  values: FilterValues;
  onClose: () => void;
  onApply: (values: FilterValues) => void;
}

const EMPTY_FILTERS: FilterValues = { propertyType: "", minPrice: "", maxPrice: "", bedrooms: 0, beds: 0, bathrooms: 0, amenities: [], guestFavorite: false };
const AMENITIES = [["wifi", "Wifi"], ["kitchen", "Kitchen"], ["pool", "Pool"], ["parking", "Free parking"], ["air-conditioning", "Air conditioning"], ["workspace", "Dedicated workspace"], ["washer", "Washer"], ["pets", "Pets allowed"]];

function PropertyIcon({ type }: { type: string }) {
  if (type === "Apartment") return <svg viewBox="0 0 32 32"><path d="M7 28V5h18v23M11 10h3m4 0h3m-10 5h3m4 0h3m-10 5h3m4 0h3M4 28h24" /></svg>;
  if (type === "Guest suite") return <svg viewBox="0 0 32 32"><path d="M4 15 16 5l12 10v13H4ZM12 28v-8h8v8" /></svg>;
  if (type === "Villa") return <svg viewBox="0 0 32 32"><path d="m3 16 13-11 13 11M6 14v14h20V14M11 28v-9h10v9" /></svg>;
  return <svg viewBox="0 0 32 32"><path d="M4 27V12l12-7 12 7v15M2 27h28M12 27v-9h8v9" /></svg>;
}

function NumberPills({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="number-pills"><button type="button" className={value === 0 ? "active" : ""} onClick={() => onChange(0)}>Any</button>{[1, 2, 3, 4, 5, 6, 7, 8].map((number) => <button type="button" key={number} className={value === number ? "active" : ""} onClick={() => onChange(number)}>{number === 8 ? "8+" : number}</button>)}</div>;
}

export function FilterModal({ totalResults, values, onClose, onApply }: FilterModalProps) {
  const [draft, setDraft] = useState(values);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const minimum = Number(draft.minPrice || 0);
  const maximum = Number(draft.maxPrice || 30000);
  const activeCount = [draft.propertyType, draft.minPrice, draft.maxPrice, draft.bedrooms, draft.beds, draft.bathrooms, draft.guestFavorite].filter(Boolean).length + draft.amenities.length;
  const toggleAmenity = (slug: string) => setDraft((current) => ({ ...current, amenities: current.amenities.includes(slug) ? current.amenities.filter((item) => item !== slug) : [...current.amenities, slug] }));

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="filter-modal airbnb-filters" role="dialog" aria-modal="true" aria-label="Filters" onMouseDown={(event) => event.stopPropagation()}>
      <header className="modal-title"><button type="button" aria-label="Close filters" onClick={onClose}>×</button><strong>Filters</strong><span /></header>
      <div className="modal-body">
        <section className="filter-section"><h2>Type of place</h2><p>Search for a specific kind of home.</p><div className="segmented"><button type="button" className={!draft.propertyType ? "active" : ""} onClick={() => setDraft({ ...draft, propertyType: "" })}>Any type</button><button type="button" className={draft.propertyType === "Guest suite" ? "active" : ""} onClick={() => setDraft({ ...draft, propertyType: "Guest suite" })}>Room</button><button type="button" className={draft.propertyType === "Home" ? "active" : ""} onClick={() => setDraft({ ...draft, propertyType: "Home" })}>Entire home</button></div></section>

        <section className="filter-section"><h2>Price range</h2><p>Nightly prices before fees and taxes</p><div className="price-chart">{[22, 29, 37, 48, 61, 78, 91, 100, 94, 80, 64, 49, 35, 25, 18, 12].map((height, index) => <i key={index} className={index / 15 * 30000 >= minimum && index / 15 * 30000 <= maximum ? "active" : ""} style={{ height: `${height}%` }} />)}<div className="dual-range"><input aria-label="Minimum price" type="range" min="0" max="30000" step="500" value={minimum} onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })} /><input aria-label="Maximum price" type="range" min="0" max="30000" step="500" value={maximum} onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })} /></div></div><div className="price-inputs"><label>Minimum<span>₹ <input type="number" min="0" value={draft.minPrice} onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })} placeholder="0" /></span></label><b>–</b><label>Maximum<span>₹ <input type="number" min="0" value={draft.maxPrice} onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })} placeholder="30,000+" /></span></label></div></section>

        <section className="filter-section rooms-section"><h2>Rooms and beds</h2><label>Bedrooms<NumberPills value={draft.bedrooms} onChange={(bedrooms) => setDraft({ ...draft, bedrooms })} /></label><label>Beds<NumberPills value={draft.beds} onChange={(beds) => setDraft({ ...draft, beds })} /></label><label>Bathrooms<NumberPills value={draft.bathrooms} onChange={(bathrooms) => setDraft({ ...draft, bathrooms })} /></label></section>

        <section className="filter-section"><h2>Property type</h2><div className="property-cards">{["Home", "Apartment", "Guest suite", "Villa"].map((type) => <button type="button" key={type} className={draft.propertyType === type ? "active" : ""} onClick={() => setDraft({ ...draft, propertyType: draft.propertyType === type ? "" : type })}><PropertyIcon type={type} /><span>{type}</span></button>)}</div></section>

        <section className="filter-section"><h2>Amenities</h2><div className="amenity-checks">{AMENITIES.slice(0, showAllAmenities ? AMENITIES.length : 6).map(([slug, name]) => <label key={slug}><input type="checkbox" checked={draft.amenities.includes(slug)} onChange={() => toggleAmenity(slug)} /><span>{name}</span></label>)}</div><button className="show-more-filter" type="button" onClick={() => setShowAllAmenities((value) => !value)}>{showAllAmenities ? "Show less" : "Show more"}</button></section>

        <section className="filter-section standout-filter"><span><strong>Guest favourites</strong><small>The most loved homes on Airbnb</small></span><button type="button" role="switch" aria-checked={draft.guestFavorite} className={`toggle ${draft.guestFavorite ? "active" : ""}`} onClick={() => setDraft({ ...draft, guestFavorite: !draft.guestFavorite })}><i /></button></section>
      </div>
      <footer className="modal-footer"><button type="button" className="clear" onClick={() => setDraft(EMPTY_FILTERS)}>Clear all{activeCount ? ` (${activeCount})` : ""}</button><button type="button" className="show" disabled={maximum < minimum} onClick={() => onApply(draft)}>Show {totalResults} places</button></footer>
    </section>
  </div>;
}

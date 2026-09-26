"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "./logo";
import { AccountMenu } from "./account-menu";
import { DateRangePicker, formatStayDate } from "./date-range-picker";

export interface SearchValues { location: string; guests: number; checkIn: string; checkOut: string; }
export type ExploreView = "all" | "homes" | "experiences" | "services";
type SearchPanel = "where" | "dates" | "guests" | null;
const DESTINATIONS = ["Goa", "Manali", "Mumbai", "Jaipur", "Bengaluru", "Udaipur"];

function SearchIcon() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m13 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm6 14 7 7" /></svg>;
}

function GuestRow({ label, detail, value, onChange }: { label: string; detail: string; value: number; onChange: (value: number) => void }) {
  return <div className="guest-row"><span><strong>{label}</strong><small>{detail}</small></span><div><button type="button" disabled={value === 0} onClick={() => onChange(value - 1)}>−</button><b>{value}</b><button type="button" onClick={() => onChange(value + 1)}>+</button></div></div>;
}

export function Header({ onSearch, view = "all", onViewChange }: { onSearch?: (values: SearchValues) => void; view?: ExploreView; onViewChange?: (view: ExploreView) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [panel, setPanel] = useState<SearchPanel>(null);
  const [where, setWhere] = useState("");
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const guests = adults + children;
  const guestSummary = [guests ? `${guests} guest${guests > 1 ? "s" : ""}` : "", infants ? `${infants} infant${infants > 1 ? "s" : ""}` : "", pets ? `${pets} pet${pets > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ");
  const suggestions = DESTINATIONS.filter((city) => city.toLowerCase().includes(where.toLowerCase()));

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setExpanded(false); setPanel(null); } };
    let animationFrame = 0;
    const updateHeader = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        setCondensed((current) => current ? window.scrollY > 45 : window.scrollY > 110);
        animationFrame = 0;
      });
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
    return () => { window.removeEventListener("keydown", closeOnEscape); window.removeEventListener("scroll", updateHeader); window.cancelAnimationFrame(animationFrame); };
  }, []);

  function openPanel(next: SearchPanel) { setExpanded(true); setPanel(next); }
  function closeSearch() { setExpanded(false); setPanel(null); }

  return <header className={`site-header ${expanded ? "search-open" : ""} ${condensed && !expanded ? "condensed" : ""}`}>
    <div className="topbar">
      <Link href="/" className="logo-link"><Logo /></Link>
      <nav className="primary-tabs" aria-label="Explore types">
        {([
          ["all", "🌎", "All"],
          ["homes", "🏡", "Homes"],
          ["experiences", "🎈", "Experiences"],
          ["services", "🛎️", "Services"],
        ] as const).map(([value, icon, label]) => <button key={value} className={view === value ? "active" : ""} type="button" aria-pressed={view === value} onClick={() => onViewChange?.(value)}><span className="nav-tab-icon">{icon}</span><span>{label}</span></button>)}
      </nav>
      <div className="account-actions"><Link className="host-link" href="/host">Airbnb your home</Link><button className="circle-btn" type="button" aria-label="Choose language">◎</button><AccountMenu /></div>
    </div>

    {expanded && <button type="button" className="search-dismiss" aria-label="Close search" onClick={closeSearch} />}
    <div className={`search-shell ${expanded ? "expanded" : ""}`} onClick={(event) => event.stopPropagation()}>
      <label className={`search-section destination ${panel === "where" ? "active" : ""}`} onClick={() => openPanel("where")}><span>Where</span><input value={where} onFocus={() => openPanel("where")} onChange={(event) => setWhere(event.target.value)} placeholder={condensed ? "Anywhere" : "Search destinations"} /></label>
      <button className={`search-section desktop-only ${panel === "dates" ? "active" : ""}`} type="button" onClick={() => openPanel("dates")}><span>When</span><strong>{checkIn ? `${formatStayDate(checkIn)} – ${checkOut ? formatStayDate(checkOut) : "Add dates"}` : condensed ? "Anytime" : "Add dates"}</strong></button>
      <button className={`search-section guests ${panel === "guests" ? "active" : ""}`} type="button" aria-expanded={panel === "guests"} aria-controls="guest-picker" onClick={(event) => { event.stopPropagation(); openPanel("guests"); }}><span>Who</span><strong>{guestSummary || "Add guests"}</strong></button>
      <button className="search-submit" type="button" aria-label="Search" onClick={() => { onSearch?.({ location: where, guests, checkIn, checkOut }); closeSearch(); }}><SearchIcon /><span>Search</span></button>

      {expanded && panel === "where" && <section className="search-popover destination-popover"><h3>Search by region</h3>{suggestions.map((city) => <button type="button" key={city} onClick={() => { setWhere(city); setPanel("dates"); }}><i>⌖</i><span><strong>{city}</strong><small>India</small></span></button>)}</section>}
      {expanded && panel === "dates" && <section className="search-popover calendar-popover"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onChange={(start, end) => { setCheckIn(start); setCheckOut(end); }} showFlexible /></section>}
      {expanded && panel === "guests" && <section id="guest-picker" role="dialog" aria-label="Choose guests" className="search-popover guests-popover" onClick={(event) => event.stopPropagation()}><GuestRow label="Adults" detail="Ages 13 or above" value={adults} onChange={setAdults} /><GuestRow label="Children" detail="Ages 2–12" value={children} onChange={setChildren} /><GuestRow label="Infants" detail="Under 2" value={infants} onChange={setInfants} /><GuestRow label="Pets" detail="Bringing a service animal?" value={pets} onChange={setPets} /><div className="guest-picker-footer"><button type="button" onClick={closeSearch}>Done</button></div></section>}
    </div>
  </header>;
}

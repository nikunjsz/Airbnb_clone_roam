"use client";

import { useMemo, useState } from "react";
import type { UnavailableRange } from "@/lib/api";

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  unavailable?: UnavailableRange[];
  months?: 1 | 2;
  showFlexible?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthOffset(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
}

export function formatStayDate(value: string) {
  if (!value) return "Add dates";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export function DateRangePicker({ checkIn, checkOut, onChange, unavailable = [], months = 2, showFlexible = false }: DateRangePickerProps) {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hovered, setHovered] = useState("");
  const [mode, setMode] = useState<"dates" | "flexible">("dates");
  const [flexibleChoice, setFlexibleChoice] = useState("Weekend");

  const isUnavailable = (iso: string) => iso < isoDate(today) || unavailable.some((range) => iso >= range.start_date && iso < range.end_date);
  const rangeEnd = checkOut || hovered;

  function choose(iso: string) {
    if (isUnavailable(iso)) return;
    if (!checkIn || checkOut || iso <= checkIn) {
      onChange(iso, "");
      return;
    }
    const cursor = new Date(`${checkIn}T12:00:00`);
    const end = new Date(`${iso}T12:00:00`);
    while (cursor < end) {
      cursor.setDate(cursor.getDate() + 1);
      if (cursor < end && isUnavailable(isoDate(cursor))) {
        onChange(iso, "");
        return;
      }
    }
    onChange(checkIn, iso);
    setHovered("");
  }

  return <div className="range-picker">
    {showFlexible && <div className="calendar-tabs"><button type="button" className={mode === "dates" ? "active" : ""} onClick={() => setMode("dates")}>Dates</button><button type="button" className={mode === "flexible" ? "active" : ""} onClick={() => setMode("flexible")}>Flexible</button></div>}
    {mode === "flexible" ? <div className="flexible-calendar"><h3>How long would you like to stay?</h3><div>{["Weekend", "Week", "Month"].map((choice) => <button type="button" key={choice} className={choice === flexibleChoice ? "active" : ""} onClick={() => setFlexibleChoice(choice)}>{choice}</button>)}</div><h3>When do you want to go?</h3><div className="month-pills">{Array.from({ length: 6 }, (_, index) => monthOffset(visibleMonth, index)).map((month) => <button type="button" key={month.toISOString()}><b>▣</b>{month.toLocaleDateString("en-IN", { month: "long" })}</button>)}</div></div> : <>
      <button type="button" className="calendar-nav previous" aria-label="Previous month" disabled={visibleMonth <= new Date(today.getFullYear(), today.getMonth(), 1)} onClick={() => setVisibleMonth((month) => monthOffset(month, -1))}>‹</button>
      <button type="button" className="calendar-nav next" aria-label="Next month" onClick={() => setVisibleMonth((month) => monthOffset(month, 1))}>›</button>
      <div className={`calendar-months months-${months}`}>{Array.from({ length: months }, (_, index) => monthOffset(visibleMonth, index)).map((month) => <section className="calendar-month" key={month.toISOString()}>
        <h3>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
        <div className="weekday-row">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="day-grid">{monthDays(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const iso = isoDate(date);
          const disabled = isUnavailable(iso);
          const selected = iso === checkIn || iso === checkOut;
          const inRange = Boolean(checkIn && rangeEnd && iso > checkIn && iso < rangeEnd);
          return <button type="button" key={iso} disabled={disabled} className={`${selected ? "selected" : ""} ${inRange ? "in-range" : ""}`} onMouseEnter={() => !checkOut && checkIn && iso > checkIn && setHovered(iso)} onClick={() => choose(iso)} aria-label={date.toLocaleDateString("en-IN", { dateStyle: "full" })}>{date.getDate()}</button>;
        })}</div>
      </section>)}</div>
      <div className="calendar-legend"><span><i /> Available</span>{unavailable.length > 0 && <span><i className="blocked" /> Unavailable</span>}<button type="button" onClick={() => onChange("", "")}>Clear dates</button></div>
    </>}
  </div>;
}

"use client";

import { useState } from "react";
import { setFavorite } from "@/lib/api";

export function ListingActions({ listingId, title }: { listingId: number; title: string }) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); setMessage("Link copied"); }
  }
  async function save() {
    const next = !saved;
    try { await setFavorite(listingId, next); setSaved(next); setMessage(next ? "Saved" : "Removed"); }
    catch { setMessage("Sign in to save"); }
  }
  return <div className="listing-actions"><button type="button" onClick={share}>⇧ Share</button><button type="button" onClick={save}>{saved ? "♥ Saved" : "♡ Save"}</button>{message && <small>{message}</small>}</div>;
}

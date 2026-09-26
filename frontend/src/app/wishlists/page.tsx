"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { getFavorites, type Listing } from "@/lib/api";

export default function WishlistsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getFavorites(controller.signal).then(setListings).catch(() => setError("Sign in to view your saved homes."));
    return () => controller.abort();
  }, []);

  return <><Header /><main className="simple-page"><h1>Wishlists</h1><p className="page-lead">Homes you saved for later.</p>
    {error ? <section className="empty-trips"><h2>{error}</h2><Link href="/">Explore homes</Link></section>
      : listings.length ? <section className="listing-grid">{listings.map((item) => <ListingCard key={item.id} listing={item} initiallyLiked onFavoriteChange={(id, favorite) => { if (!favorite) setListings((items) => items.filter((listing) => listing.id !== id)); }} />)}</section>
      : <section className="empty-trips"><h2>No saved homes yet</h2><p>Tap the heart on a home to keep it here.</p><Link href="/">Start exploring</Link></section>}
  </main></>;
}

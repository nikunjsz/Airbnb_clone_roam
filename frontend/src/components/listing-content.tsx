"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Review } from "@/lib/api";

export function ListingDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="description">
    <p>{description}</p>
    {expanded && <>
      <p>Wake up to thoughtful interiors, spend slow afternoons in beautiful surroundings, and enjoy a home selected for its character and comfort.</p>
      <p>The space is prepared before every arrival and includes the everyday essentials needed for a relaxed, independent stay.</p>
    </>}
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less" : "Show more"} {expanded ? "⌃" : "›"}</button>
  </section>;
}

function ReviewCard({ review }: { review: Review }) {
  return <article>
    <div><Image src={review.author.avatar_url} alt="" width={42} height={42} /><span><strong>{review.author.name}</strong><small>{new Date(review.created_at).toLocaleDateString("en-IN")}</small></span></div>
    <p>{"★".repeat(review.rating)} {review.comment}</p>
  </article>;
}

export function ReviewsPanel({ rating, reviewCount, reviews }: { rating: number; reviewCount: number; reviews: Review[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return <>
    <section className="reviews-block" id="reviews">
      <div className="big-rating"><span>❧</span><strong>{rating.toFixed(2)}</strong><span>❧</span></div>
      <h2>Guest favourite</h2>
      <p>One of the most loved homes on Roam based on ratings, reviews and reliability</p>
      <div className="review-grid">{reviews.slice(0, 2).map((review) => <ReviewCard review={review} key={review.id} />)}</div>
      <button className="show-all-reviews" type="button" onClick={() => setOpen(true)}>Show all {reviewCount} reviews</button>
    </section>
    {open && <div className="reviews-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section className="reviews-modal" role="dialog" aria-modal="true" aria-label={`All ${reviewCount} reviews`} onClick={(event) => event.stopPropagation()}>
        <header><button type="button" aria-label="Close reviews" onClick={() => setOpen(false)}>×</button><strong>{rating.toFixed(2)} · {reviewCount} reviews</strong></header>
        <div className="reviews-modal-list">{reviews.map((review) => <ReviewCard review={review} key={review.id} />)}</div>
      </section>
    </div>}
  </>;
}

"use client";

import React, { useState } from "react";
import { useToast } from "./toast";
import { createReview } from "@/lib/api";

interface ReviewModalProps {
  isOpen: boolean;
  listingId: number;
  bookingId: number;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({
  isOpen,
  listingId,
  bookingId,
  listingTitle,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 3) {
      toast.error("Please enter a comment with at least 3 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await createReview(listingId, {
        booking_id: bookingId,
        rating,
        comment: comment.trim(),
      });
      toast.success("Thank you! Your review has been published.", "Review Submitted");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <button type="button" onClick={onClose} aria-label="Close review modal">
            ×
          </button>
          <strong>Rate & review your stay</strong>
          <span />
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          <p className="review-subtitle">How was your stay at <strong>{listingTitle}</strong>?</p>

          <div className="star-rating-selector" aria-label="Rating stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${star <= (hoverRating || rating) ? "active" : ""}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                ★
              </button>
            ))}
            <span className="rating-label-text">
              {rating === 5 && "Outstanding"}
              {rating === 4 && "Very Good"}
              {rating === 3 && "Average"}
              {rating === 2 && "Below Average"}
              {rating === 1 && "Poor"}
            </span>
          </div>

          <label className="review-comment-label">
            Your review
            <textarea
              required
              minLength={3}
              rows={4}
              placeholder="Describe your host, location, cleanliness, and overall experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>

          <div className="modal-footer">
            <button type="button" className="clear" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="show" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

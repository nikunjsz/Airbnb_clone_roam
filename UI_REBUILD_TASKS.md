# Airbnb UI Rebuild Tasks

Reference: Airbnb India desktop and mobile experience, English locale, INR currency.  
Goal: rebuild the current frontend so it feels like Airbnb in layout, typography, imagery, motion, and interaction while retaining the working FastAPI and SQLite workflows.

## Definition of done

- Every visible control works, navigates somewhere meaningful, or is removed.
- The desktop and mobile layouts closely match the current Airbnb visual hierarchy.
- Search, filters, favorites, authentication, booking, trips, and hosting remain database-backed.
- Listing images load reliably without depending on third-party hotlink behavior.
- Loading, empty, success, and failure states use the same visual system as the main interface.
- Keyboard focus, Escape behavior, labels, and dialog focus management work on all primary flows.

## Phase 1 — Reference baseline and design system

- Capture reference views at 1440×900 desktop and 390×844 mobile for the homepage, expanded search, filters, listing detail, login menu, wishlist, trips, and host dashboard.
- Record exact page gutters, header heights, card ratios, gaps, radii, shadows, font sizes, line heights, colors, and responsive breakpoints.
- Replace text glyphs such as `⌕`, `◎`, `☷`, `♡`, and `●` with one consistent SVG icon system.
- Create reusable `IconButton`, `Button`, `Pill`, `Avatar`, `Dialog`, `Popover`, `Toast`, `Counter`, `Skeleton`, and `Price` components.
- Replace Arial with a legally distributable font whose metrics closely match Airbnb’s UI; configure font weights and fallbacks through `next/font`.
- Add shared motion tokens for 120–250 ms fades, scale transitions, hover movement, and modal entry/exit.

Acceptance: a component showcase demonstrates consistent icons, typography, focus rings, hover states, disabled states, and motion on desktop and mobile.

## Phase 2 — Reliable imagery

- Download or create an approved local demo image set for every seeded listing, including at least five images per property.
- Store optimized WebP/AVIF assets under `frontend/public/listings` and update seed records to local application paths.
- Configure responsive `next/image` sizes, blur placeholders, stable aspect ratios, object positioning, and fallback art.
- Add a card carousel with previous/next controls, pagination dots, touch swiping, and preloading of the next image.
- Verify images inside Docker with no dependency on Unsplash or avatar hotlinks.

Acceptance: every card, gallery, host avatar, trip, and wishlist image appears after a fresh Docker start, even if external image hosts are unavailable.

## Phase 3 — Airbnb-style global navigation

- Rebuild the desktop header with logo on the left; illustrated Homes, Experiences, and Services tabs in the center; and “Airbnb your home,” globe, and profile menu on the right.
- Match active-tab underline, NEW badges, icon scale, spacing, sticky behavior, divider, and compact-on-scroll state.
- Implement a real profile popover with login/sign-up, Trips, Wishlists, host tools, profile switching, and logout.
- Add the mobile bottom navigation for Explore, Wishlists, Trips, Messages placeholder, and Profile.
- Remove navigation buttons that lead nowhere. Any out-of-scope product area must have a deliberate informative screen rather than a dead control.

Acceptance: every header and mobile-nav item has hover/pressed/selected states and a working destination.

## Phase 4 — Homepage discovery rebuild

- Replace the old category strip and generic four-column grid with Airbnb’s current discovery structure: titled recommendation rails, location/theme groupings, horizontal scrolling, and circular next/previous controls.
- Create polished listing cards with correct image ratio, favorite pill, heart button, location/title hierarchy, dates or distance, rating, and INR price formatting.
- Add responsive rail behavior: mouse wheel/trackpad, arrow buttons, touch swipe, scroll snapping, and hidden scrollbars.
- Add card skeletons that exactly match final geometry and prevent layout shift.
- Add the full multi-column Airbnb-style footer and legal/currency controls.

Acceptance: the homepage hierarchy, density, card geometry, and responsive behavior visually match the reference at the two baseline viewports.

## Phase 5 — Fully interactive search

- Implement collapsed and expanded search-header states with background dimming and click-outside/Escape dismissal.
- Build destination autocomplete using seeded cities and regions, recent searches, and location icons.
- Build an Airbnb-style date-range popover instead of native date inputs:
  - Two synchronized desktop months and a vertically scrolling mobile calendar.
  - Previous/next month controls, weekday headers, correct month boundaries, and locale-aware formatting.
  - Hovered-range preview, check-in/check-out states, selected range background, rounded range endpoints, and keyboard navigation.
  - Clearly disabled past, booked, and host-blocked dates with permitted checkout-boundary behavior.
  - Exact dates and flexible-date modes, including weekend, week, and month choices where appropriate.
  - Clear dates, close, and apply actions with focus trapping and focus return.
- Build a guest popover with Adults, Children, Infants, and Pets counters plus correct total-capacity validation.
- Add clear buttons per section and a working Search action that updates URL query parameters and fetches results.
- Preserve search state across result navigation and browser back/forward.

Acceptance: a user can complete the entire destination → dates → guests sequence using mouse, keyboard, or touch, and the resulting inventory is filtered by the API.

## Phase 6 — Search results and filters

- Create a dedicated search-results view rather than mutating the discovery homepage.
- Replace the current filter modal with an Airbnb-style scrollable filter sheet:
  - Type-of-place segmented selector with selected and hover states.
  - Price-range histogram with dual range handles plus synchronized minimum and maximum currency inputs.
  - Bedrooms, beds, and bathrooms rows using `Any`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, and `8+` pills.
  - Property-type icon cards for House, Flat, Guest house, and Hotel.
  - Amenities grouped into essentials, features, location, and accessibility, with Show more expansion.
  - Guest favourite, instant-book, self check-in, and cancellation options when supported by the data model.
  - Sticky header and footer, result count, Clear all, and Show places actions.
- Connect every control to explicit filter state and backend query parameters.
- Show active filter counts, removable applied-filter chips, result count, Clear all, and disabled Apply behavior when values are invalid.
- Add pagination or Load more and preserve the scroll position when returning from a listing.
- Add a mobile map/list toggle only after the required list experience is complete.

Acceptance: every filter visibly changes the results, survives URL reload, resets correctly, and the modal matches Airbnb's section order, spacing, borders, selection states, and sticky footer on desktop and mobile.

## Phase 7 — Listing detail fidelity

- Rebuild the title/action row, five-image gallery, host summary, highlights, description, sleeping arrangement, amenities, accessibility information, reviews, location, policies, and footer in the Airbnb order and spacing.
- Make the full gallery a keyboard-accessible lightbox with thumbnails, next/previous navigation, touch swiping, and image count.
- Replace generic amenity checkmarks with correct category icons.
- Add expandable “Show more” dialogs for description and amenities.
- Add the review distribution summary, review cards, show-all dialog, and date formatting.
- Make Share and Save display proper dialogs/toasts and accurately reflect saved state.

Acceptance: the page contains no decorative-only buttons and matches reference layout at desktop and mobile breakpoints.

## Phase 8 — Booking card and checkout polish

- Use the same date-range calendar and guest counter as search inside the sticky booking card.
- Show unavailable dates before submission and refresh availability after a booking.
- Match the Airbnb price breakdown, fee links, reserve button gradient, sticky desktop behavior, and fixed mobile reserve bar.
- Rebuild mock checkout as a full page or sheet with trip summary, cancellation policy, payment method, price details, and final confirmation.
- Add success toast/page with links to Trips and the listing.
- Handle unauthenticated reserve attempts by opening login and then resuming checkout.

Acceptance: the complete booking journey has no hard-coded dates, dead controls, or browser-only persistence.

## Phase 9 — Account, wishlist, trips, and host UI

- Rebuild login/sign-up as Airbnb-style dialogs with validation, password visibility, loading state, and useful API errors.
- Make card hearts read their initial saved state and update optimistically with rollback and toast feedback.
- Rebuild Wishlists with image-rich collection cards and immediate removal behavior.
- Rebuild Trips with upcoming/past sections and detailed itinerary cards.
- Rebuild the host dashboard navigation, listing table/cards, reservations, edit form, archive confirmation, and responsive views.
- Replace browser `prompt()` and `confirm()` with project dialogs.
- Add multi-photo URL management and visual amenity selection to listing create/edit forms.

Acceptance: guest and host workflows share the same polished design system and every mutation has loading, success, and error feedback.

## Phase 10 — Smoothness, accessibility, and QA

- Add route-level loading states, optimistic updates, non-blocking toasts, image transition handling, and prefetching for likely navigation.
- Remove unnecessary re-renders, race conditions, content jumps, and abrupt modal changes.
- Verify focus trapping, Escape, focus return, screen-reader labels, color contrast, and reduced-motion support.
- Test Chrome desktop, mobile viewport, touch behavior, Docker, and slow-network states.
- Add browser tests for search/filter, login, favorite, booking conflict, Trips persistence, and host create/edit/archive.
- Perform a final side-by-side screenshot review and fix spacing, typography, icon, and breakpoint differences before deployment.

Acceptance: lint, production build, backend tests, browser tests, Docker smoke tests, and screenshot review all pass.

## Execution order

1. Design system, icons, font, and local images.
2. Shared Airbnb-style date-range calendar and full filter sheet.
3. Header, mobile navigation, homepage rails, and cards.
4. Search interaction and dedicated results page.
5. Listing detail and booking checkout using the shared calendar.
6. Account, wishlist, trips, and host surfaces.
7. Accessibility, motion, browser tests, and visual comparison.
8. Public repository and deployed demo.

Do not spend time on optional map, dark mode, review creation, or real uploads until phases 1–10 pass.

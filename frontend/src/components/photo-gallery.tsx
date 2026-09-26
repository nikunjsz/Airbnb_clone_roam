"use client";

import { useState } from "react";
import Image from "next/image";
import type { ListingPhoto } from "@/lib/api";

export function PhotoGallery({ photos }: { photos: ListingPhoto[] }) {
  const [open, setOpen] = useState(false);
  return <><section className="photo-gallery" id="photos">
    {photos.slice(0, 5).map((photo, index) => <div key={`${photo.url}-${index}`} className={index === 0 ? "hero-photo" : ""}>
      <Image src={photo.url} alt={photo.alt_text} fill sizes={index === 0 ? "50vw" : "25vw"} priority={index === 0} unoptimized={photo.url.startsWith("http://localhost:8000")} />
    </div>)}
    <button type="button" onClick={() => setOpen(true)}>▦ Show all photos</button>
  </section>
  {open && <div className="gallery-modal"><header><button type="button" onClick={() => setOpen(false)}>×</button><strong>All photos</strong></header><div>{photos.map((photo, index) => <Image key={`${photo.url}-${index}`} src={photo.url} alt={photo.alt_text} width={900} height={600} unoptimized={photo.url.startsWith("http://localhost:8000")} />)}</div></div>}
  </>;
}

import Link from "next/link";
import { AccountMenu } from "./account-menu";
import { Logo } from "./logo";

/** Compact Airbnb-style navigation shared by listing and account pages. */
export function DetailHeader() {
  return <header className="detail-header">
    <Link href="/" aria-label="Roam home"><Logo /></Link>
    <Link href="/" className="compact-search" aria-label="Return to search">
      <span>🏡 Anywhere</span><i /><span>Anytime</span><i /><span>Add guests</span><b>⌕</b>
    </Link>
    <div className="detail-account-actions">
      <Link href="/host">Become a host</Link>
      <button type="button" className="circle-btn" aria-label="Choose language">◎</button>
      <AccountMenu />
    </div>
  </header>;
}

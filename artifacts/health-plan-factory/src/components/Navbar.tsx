import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const navLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/modalities", label: "Modalities" },
  { href: "/for-providers", label: "For Providers" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-[68px] px-6 md:px-12"
        style={{
          background: "rgba(250,250,248,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(27,45,79,0.1)",
        }}
      >
        <Logo />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors no-underline"
              style={{
                color: location === link.href ? "var(--navy)" : "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium no-underline transition-colors"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white no-underline transition-all hover:-translate-y-px"
            style={{
              background: "var(--navy)",
              fontFamily: "var(--app-font-sans)",
              boxShadow: "0 2px 8px rgba(27,45,79,0.2)",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "var(--navy-light)")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "var(--navy)")}
          >
            Build My Plan →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md transition-colors"
          style={{ color: "var(--navy)" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col pt-[68px]"
          style={{ background: "rgba(250,250,248,0.98)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex flex-col px-6 py-8 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-lg font-medium py-3 border-b no-underline transition-colors"
                style={{
                  color: "var(--navy)",
                  borderColor: "rgba(27,45,79,0.08)",
                  fontFamily: "var(--app-font-sans)",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              className="text-lg font-medium py-3 border-b no-underline"
              style={{ color: "var(--text-secondary)", borderColor: "rgba(27,45,79,0.08)" }}
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
            <div className="pt-6">
              <Link
                href="/sign-up"
                className="block w-full text-center px-6 py-3.5 rounded-lg text-base font-semibold text-white no-underline"
                style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
                onClick={() => setMobileOpen(false)}
              >
                Build My Plan →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

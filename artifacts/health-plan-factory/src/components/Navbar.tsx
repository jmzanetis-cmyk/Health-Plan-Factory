import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, User } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@workspace/replit-auth-web";

const navLinks = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/modalities", label: "Modalities" },
  { href: "/for-providers", label: "For Providers" },
  { href: "/pricing", label: "Pricing" },
];

function UserMenu({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" :
    user?.role === "provider" ? "/provider/dashboard" : "/dashboard";

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full transition-all"
        style={{ fontFamily: "var(--app-font-sans)" }}
      >
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={initials}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "var(--navy)" }}
          >
            {initials}
          </div>
        )}
        <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-10 z-50 w-52 rounded-xl py-2 shadow-xl"
            style={{
              background: "white",
              border: "1px solid rgba(27,45,79,0.08)",
              boxShadow: "0 8px 32px rgba(27,45,79,0.12)",
            }}
          >
            <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(27,45,79,0.06)" }}>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email || "Account"}
              </p>
              {user?.role && (
                <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  {user.role}
                </p>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); onClose?.(); navigate(dashboardPath); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <button
              onClick={() => { setOpen(false); onClose?.(); navigate("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              <User size={15} />
              Profile
            </button>
            <div className="border-t mt-1" style={{ borderColor: "rgba(27,45,79,0.06)" }} />
            <button
              onClick={() => { setOpen(false); onClose?.(); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50"
              style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();

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
              to={link.href}
              className="text-sm font-medium transition-colors no-underline"
              style={{
                color: location.pathname === link.href ? "var(--navy)" : "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && !isAuthenticated ? (
            <>
              <button
                onClick={() => login()}
                className="text-sm font-medium no-underline transition-colors"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", background: "none", border: "none", cursor: "pointer" }}
              >
                Sign In
              </button>
              <button
                onClick={() => login()}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white transition-all"
                style={{
                  background: "var(--navy)",
                  fontFamily: "var(--app-font-sans)",
                  boxShadow: "0 2px 8px rgba(27,45,79,0.2)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Build My Plan →
              </button>
            </>
          ) : !isLoading ? (
            <UserMenu />
          ) : null}
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
                to={link.href}
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
            {!isLoading && !isAuthenticated && (
              <>
                <button
                  onClick={() => { setMobileOpen(false); login(); }}
                  className="text-lg font-medium py-3 border-b text-left"
                  style={{ color: "var(--text-secondary)", borderColor: "rgba(27,45,79,0.08)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)", borderBottom: "1px solid rgba(27,45,79,0.08)" }}
                >
                  Sign In
                </button>
                <div className="pt-6">
                  <button
                    onClick={() => { setMobileOpen(false); login(); }}
                    className="block w-full text-center px-6 py-3.5 rounded-lg text-base font-semibold text-white"
                    style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)", border: "none", cursor: "pointer" }}
                  >
                    Build My Plan →
                  </button>
                </div>
              </>
            )}
            {!isLoading && isAuthenticated && (
              <div className="pt-4">
                <UserMenu onClose={() => setMobileOpen(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

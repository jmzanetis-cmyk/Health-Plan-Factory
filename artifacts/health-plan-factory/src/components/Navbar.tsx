import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, User, Bot } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

function UserMenu({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
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
            style={{ background: "var(--hpf-pink)" }}
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
              border: "1px solid rgba(212,34,126,0.08)",
              boxShadow: "0 8px 32px rgba(212,34,126,0.12)",
            }}
          >
            <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
              <p className="text-xs font-semibold truncate" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
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
              style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <LayoutDashboard size={15} />
              {t("nav.dashboard")}
            </button>
            <button
              onClick={() => { setOpen(false); onClose?.(); navigate("/coach"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <Bot size={15} />
              {t("nav.coach")}
            </button>
            <button
              onClick={() => { setOpen(false); onClose?.(); navigate("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <User size={15} />
              {t("nav.profile")}
            </button>
            <div className="border-t mt-1" style={{ borderColor: "rgba(212,34,126,0.06)" }} />
            <button
              onClick={() => { setOpen(false); onClose?.(); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50"
              style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}
            >
              <LogOut size={15} />
              {t("nav.signOut")}
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
  const { t } = useTranslation();

  const navLinks = [
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/modalities", label: t("nav.modalities") },
    { href: "/providers", label: t("nav.findProviders") },
    { href: "/savings-calculator", label: t("nav.hsaCalculator") },
    { href: "/list-your-practice", label: t("nav.listPractice") },
    { href: "/for-employers", label: t("nav.forEmployers") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-[84px] px-6 md:px-12"
        style={{
          background: "rgba(250,250,248,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(212,34,126,0.1)",
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
                color: location.pathname === link.href ? "var(--hpf-pink)" : "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA + Language switcher */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {!isLoading && !isAuthenticated ? (
            <>
              <Link
                to="/sign-in"
                className="text-sm font-medium no-underline transition-colors"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
              >
                {t("nav.signIn")}
              </Link>
              <Link
                to="/survey"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white no-underline transition-all"
                style={{
                  background: "var(--hpf-pink)",
                  fontFamily: "var(--app-font-sans)",
                  boxShadow: "0 2px 8px rgba(212,34,126,0.2)",
                }}
              >
                {t("nav.getStarted")}
              </Link>
            </>
          ) : !isLoading ? (
            <UserMenu />
          ) : null}
        </div>

        {/* Mobile: language switcher + hamburger — always visible */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <button
            className="p-2 rounded-md transition-colors"
            style={{ color: "var(--hpf-pink)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col pt-[84px]"
          style={{ background: "rgba(250,250,248,0.98)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex flex-col px-6 py-8 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-lg font-medium py-3 border-b no-underline transition-colors"
                style={{
                  color: "var(--hpf-pink)",
                  borderColor: "rgba(212,34,126,0.08)",
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
                  style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)", borderBottom: "1px solid rgba(212,34,126,0.08)" }}
                >
                  {t("nav.signIn")}
                </button>
                <div className="pt-6">
                  <Link
                    to="/survey"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-6 py-3.5 rounded-lg text-base font-semibold text-white no-underline"
                    style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
                  >
                    {t("nav.getStarted")}
                  </Link>
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

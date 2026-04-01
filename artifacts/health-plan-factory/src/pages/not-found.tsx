import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6" aria-hidden="true">🏭</div>
      <h1
        className="mb-3"
        style={{
          fontFamily: "var(--app-font-serif)",
          fontSize: "2.5rem",
          fontWeight: 700,
          color: "var(--hpf-pink)",
        }}
      >
        This page got lost on the factory floor.
      </h1>
      <p
        className="text-sm font-light mb-8 max-w-sm leading-relaxed"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
      >
        We couldn't find what you were looking for. Head back to the main floor and we'll get you sorted.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-lg text-sm font-semibold no-underline text-white"
        style={{ background: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}
      >
        Back to HealthPlanFactory →
      </Link>
    </div>
  );
}

import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, Plus, Save, X, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  goal: string | null;
  quote: string;
  stars: number;
  isVisible: boolean;
  displayOrder: number;
  createdAt: string;
}

const BLANK: Omit<Testimonial, "id" | "createdAt"> = {
  name: "",
  location: "",
  goal: "",
  quote: "",
  stars: 5,
  isVisible: true,
  displayOrder: 0,
};

const inputStyle = {
  background: "var(--warm-white)",
  border: "1.5px solid rgba(212,34,126,0.12)",
  color: "var(--hpf-pink)",
  fontFamily: "var(--app-font-sans)",
  outline: "none",
  borderRadius: 8,
  width: "100%",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
};

const labelStyle = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  color: "var(--text-muted)",
  fontFamily: "var(--app-font-sans)",
  marginBottom: 4,
  display: "block",
};

export default function AdminTestimonials() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTestimonials = () => {
    fetch(`${BASE}/api/admin/testimonials`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.testimonials)) setTestimonials(data.testimonials);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTestimonials(); }, []);

  const startEdit = (t: Testimonial) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      location: t.location ?? "",
      goal: t.goal ?? "",
      quote: t.quote,
      stars: t.stars,
      isVisible: t.isVisible,
      displayOrder: t.displayOrder,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ ...BLANK });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.quote.trim()) {
      toast({ title: "Missing fields", description: "Name and quote are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        location: form.location?.trim() || null,
        goal: form.goal?.trim() || null,
        quote: form.quote.trim(),
        stars: form.stars,
        isVisible: form.isVisible,
        displayOrder: form.displayOrder,
      };
      const url = editId
        ? `${BASE}/api/admin/testimonials/${editId}`
        : `${BASE}/api/admin/testimonials`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: editId ? "Testimonial updated" : "Testimonial added" });
      cancelForm();
      loadTestimonials();
    } catch {
      toast({ title: "Error", description: "Could not save testimonial.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (t: Testimonial) => {
    setTogglingId(t.id);
    try {
      await fetch(`${BASE}/api/admin/testimonials/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isVisible: !t.isVisible }),
      });
      setTestimonials((prev) => prev.map((x) => x.id === t.id ? { ...x, isVisible: !x.isVisible } : x));
    } catch {
      toast({ title: "Error", description: "Could not update visibility.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!window.confirm("Delete this testimonial? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/admin/testimonials/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Testimonial deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete testimonial.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: "var(--warm-white)" }}>
      <AdminNav active="/admin/testimonials" />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
              Testimonials
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Manage member success stories shown on the landing page and How It Works page.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <Plus size={15} /> Add testimonial
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div
            className="rounded-2xl p-6 mb-8"
            style={{ background: "white", border: "1px solid rgba(212,34,126,0.12)", boxShadow: "0 4px 24px rgba(212,34,126,0.07)" }}
          >
            <h2 className="text-base font-bold mb-5" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>
              {editId ? "Edit testimonial" : "Add new testimonial"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Sarah M."
                />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input
                  style={inputStyle}
                  value={form.location ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Denver, CO"
                />
              </div>
              <div>
                <label style={labelStyle}>Goal / Role</label>
                <input
                  style={inputStyle}
                  value={form.goal ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="Stress relief & budget management"
                />
              </div>
              <div>
                <label style={labelStyle}>Stars (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  style={inputStyle}
                  value={form.stars}
                  onChange={(e) => setForm((f) => ({ ...f, stars: Math.min(5, Math.max(1, Number(e.target.value))) }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Display Order</label>
                <input
                  type="number"
                  min={0}
                  style={inputStyle}
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="isVisible"
                  checked={form.isVisible}
                  onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
                  style={{ accentColor: "var(--hpf-pink)", width: 16, height: 16 }}
                />
                <label htmlFor="isVisible" className="text-sm" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  Visible on site
                </label>
              </div>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Quote *</label>
              <textarea
                style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
                value={form.quote}
                onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
                placeholder="Member success story..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editId ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: "1.5px solid rgba(212,34,126,0.15)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", background: "transparent" }}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin" size={24} style={{ color: "var(--hpf-pink)" }} />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">No testimonials yet. Add one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl p-5"
                style={{
                  background: "white",
                  border: `1px solid ${t.isVisible ? "rgba(212,34,126,0.08)" : "rgba(212,34,126,0.04)"}`,
                  opacity: t.isVisible ? 1 : 0.65,
                }}
              >
                <div className="flex items-start gap-4">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                        {t.name}
                      </span>
                      {t.location && (
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                          · {t.location}
                        </span>
                      )}
                      <span style={{ color: "var(--hpf-crimson)", fontSize: "0.75rem" }}>
                        {"★".repeat(t.stars)}
                      </span>
                      {!t.isVisible && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(212,34,126,0.07)", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
                        >
                          Hidden
                        </span>
                      )}
                    </div>
                    {t.goal && (
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{t.goal}</p>
                    )}
                    <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-serif)" }}>
                      "{t.quote}"
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      title={t.isVisible ? "Hide" : "Show"}
                      onClick={() => toggleVisibility(t)}
                      disabled={togglingId === t.id}
                      className="p-2 rounded-lg"
                      style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.1)", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      {togglingId === t.id ? <Loader2 size={14} className="animate-spin" /> : t.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => startEdit(t)}
                      className="p-2 rounded-lg"
                      style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.1)", color: "var(--hpf-pink)", cursor: "pointer" }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => deleteTestimonial(t.id)}
                      disabled={deletingId === t.id}
                      className="p-2 rounded-lg"
                      style={{ background: "var(--warm-white)", border: "1px solid rgba(224,32,64,0.12)", color: "var(--hpf-crimson)", cursor: "pointer" }}
                    >
                      {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import { apiFetch } from "@/lib/api";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { describeError } from "@/lib/utils";
import { ArrowLeft, Package, Save, LoaderCircle, X, ImagePlus } from "lucide-react";

/* ------------------------------ types ------------------------------ */

type ItemFormState = {
  // Vital info
  itemName: string;
  companyName: string; // used as "Brand" (kept so existing pages still work)
  manufacturer: string;
  category: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: string;
  notes: string;
  // Price & stock (used by the Orders page)
  sellingPrice: string;
  quantity: string;
  published: boolean; // show in the customer store
  // Compliance
  countryOfOrigin: string;
  gstRate: string;
  warranty: string;
  packerDetails: string;
};

type TextField = Exclude<keyof ItemFormState, "published">;
type Errors = Partial<Record<string, string>>;
type NewImage = { file: File; preview: string };

const emptyForm: ItemFormState = {
  itemName: "",
  companyName: "",
  manufacturer: "",
  category: "General",
  purchaseDate: "",
  warrantyExpiry: "",
  status: "Active",
  notes: "",
  sellingPrice: "",
  quantity: "",
  published: true,
  countryOfOrigin: "India",
  gstRate: "18",
  warranty: "",
  packerDetails: "",
};

const CATEGORIES = ["General", "Electronics", "Computers", "Networking", "Accessories", "Consumables", "Other"];
const GST_RATES = ["0", "5", "12", "18", "28"];
const MAX_IMAGES = 9; // 1 main + 8 extra
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const errorInputClass = "!border-red-400 focus:!border-red-500 focus:!ring-red-100";
const labelClass = "text-sm font-medium text-slate-700";
const sectionClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";

/* ----------------------------- helpers ----------------------------- */

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

// "" -> null (null removes the field on update, and is skipped on set)
function toNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      {label}
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

/* ----------------------------- component ----------------------------- */

export function ItemForm({ itemId }: { itemId?: string }) {
  const isEdit = Boolean(itemId);
  const router = useRouter();

  const { user, checking } = useAuthUser();
  const [form, setForm] = useState<ItemFormState>({
    ...emptyForm,
      });
  const [errors, setErrors] = useState<Errors>({});
  const [loadingItem, setLoadingItem] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const newImagesRef = useRef<NewImage[]>([]);
  useEffect(() => {
    newImagesRef.current = newImages;
  });

  /* load the product when editing */
  useEffect(() => {
    if (!itemId || !user) return;
    let cancelled = false;

    apiFetch<{ item: Record<string, unknown> }>(`/api/items/${itemId}`)
      .then(({ item: v }) => {
        if (cancelled) return;
        setForm({
          itemName: str(v.itemName),
          companyName: str(v.companyName),
          manufacturer: str(v.manufacturer),
          category: str(v.category, "General"),
          purchaseDate: str(v.purchaseDate),
          warrantyExpiry: str(v.warrantyExpiry),
          status: str(v.status, "Active"),
          notes: str(v.notes),
          sellingPrice: str(v.sellingPrice),
          quantity: str(v.quantity),
          published: v.published !== false,
          countryOfOrigin: str(v.countryOfOrigin, "India"),
          gstRate: str(v.gstRate, "18"),
          warranty: str(v.warranty),
          packerDetails: str(v.packerDetails),
        });
        setExistingImages(Array.isArray(v.imageUrls) ? (v.imageUrls as string[]) : []);
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err, "Unable to load this product."));
      })
      .finally(() => {
        if (!cancelled) setLoadingItem(false);
      });

    return () => {
      cancelled = true;
    };
  }, [itemId, user]);

  /* free preview URLs on unmount */
  useEffect(() => {
    return () => newImagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
  }, []);

  /* ----------------------------- handlers ----------------------------- */

  function updateField(field: TextField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again

    const accepted: NewImage[] = [];
    let message = "";
    let room = MAX_IMAGES - existingImages.length - newImages.length;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        message = `${file.name}: only JPG, PNG or WebP images are allowed.`;
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        message = `${file.name}: image is larger than 2 MB.`;
        continue;
      }
      if (room <= 0) {
        message = `You can add up to ${MAX_IMAGES} images (1 main + 8 extra).`;
        break;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
      room -= 1;
    }

    if (accepted.length) setNewImages((prev) => [...prev, ...accepted]);
    setErrors((prev) => ({ ...prev, images: message || undefined }));
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeExistingImage(index: number) {
    // Removes it from the item. The file stays in Storage until you delete it there.
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.itemName.trim()) e.itemName = "Item name is required.";
    if (!form.companyName.trim()) e.companyName = "Brand / company name is required.";

    if (form.published) {
      if (!form.sellingPrice.trim()) e.sellingPrice = "Price is required for items shown in the store.";
      if (!form.quantity.trim()) e.quantity = "Stock is required for items shown in the store.";
    }
    if (form.sellingPrice.trim()) {
      const price = toNum(form.sellingPrice);
      if (price === null || price <= 0) e.sellingPrice = "Enter a valid price greater than 0.";
    }
    if (form.quantity.trim()) {
      const q = Number(form.quantity);
      if (!Number.isInteger(q) || q < 0) e.quantity = "Quantity must be a whole number, 0 or more.";
    }
    if (form.purchaseDate && form.warrantyExpiry && form.warrantyExpiry < form.purchaseDate) {
      e.warrantyExpiry = "Warranty expiry cannot be before the purchase date.";
    }
    return e;
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setToast({ type: "error", message: "Please sign in before saving an item." });
      return;
    }

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setToast({ type: "error", message: "Please fix the highlighted fields." });
      return;
    }

    setSaving(true);

    try {
      // 1. Upload any new images to our own server
      const uploaded = await Promise.all(
        newImages.map(async ({ file }) => {
          const fd = new FormData();
          fd.append("file", file);
          const { url } = await apiFetch<{ url: string }>("/api/upload", { method: "POST", form: fd });
          return url;
        })
      );
      const imageUrls = [...existingImages, ...uploaded];

      // 2. Save the product (the server re-checks everything)
      const data = {
        ...form,
        sellingPrice: toNum(form.sellingPrice),
        quantity: toNum(form.quantity),
        gstRate: toNum(form.gstRate),
        imageUrls,
      };

      if (isEdit && itemId) {
        await apiFetch(`/api/items/${itemId}`, { method: "PUT", body: data });
        setSuccess("Product updated successfully!");
        setToast({ type: "success", message: "Product updated successfully!" });
        setNewImages([]);
        setExistingImages(imageUrls);
      } else {
        await apiFetch("/api/items", { method: "POST", body: data });
        setSuccess("Product added successfully!");
        setToast({ type: "success", message: "Product added successfully!" });
        newImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setNewImages([]);
        setExistingImages([]);
        setForm({ ...emptyForm });
      }
    } catch (err) {
      console.error("Failed to save item:", err);
      const message = describeError(err, "Could not save the product. Please try again.");
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------- render ----------------------------- */

  const cls = (name: string) => `${inputClass} ${errors[name] ? errorInputClass : ""}`;

  const totalImages = existingImages.length + newImages.length;

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Package size={22} />
          </div>

          <div>
            <h1 className="font-bold">Item Management</h1>
            <p className="text-xs text-slate-500">Inventory / {isEdit ? "Edit Item" : "Add Item"}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold sm:text-3xl">{isEdit ? "Edit Item" : "Add New Item"}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {isEdit
              ? "Update the item details below and save your changes."
              : "Enter the item details below and save them to your inventory."}
          </p>
        </div>

        {loadingItem ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading item details...</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* 1. Vital info */}
            <section className={sectionClass}>
              <h3 className="mb-5 font-semibold">Vital Info</h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Item Name *" error={errors.itemName}>
                  <input
                    maxLength={200}
                    className={cls("itemName")}
                    placeholder="e.g. Wireless Keyboard"
                    value={form.itemName}
                    onChange={(e) => updateField("itemName", e.target.value)}
                  />
                </Field>

                <Field label="Brand / Company Name *" error={errors.companyName}>
                  <input
                    maxLength={120}
                    className={cls("companyName")}
                    placeholder="e.g. HP, Canon, Epson"
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                  />
                </Field>

                <Field label="Manufacturer">
                  <input
                    maxLength={120}
                    className={inputClass}
                    value={form.manufacturer}
                    onChange={(e) => updateField("manufacturer", e.target.value)}
                  />
                </Field>

                <Field label="Category">
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* Price & stock */}
            <section className={sectionClass}>
              <h3 className="mb-5 font-semibold">Price &amp; Stock</h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Selling Price (₹)" error={errors.sellingPrice}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className={cls("sellingPrice")}
                    placeholder="e.g. 8999"
                    value={form.sellingPrice}
                    onChange={(e) => updateField("sellingPrice", e.target.value)}
                  />
                </Field>

                <Field label="Stock Quantity" error={errors.quantity}>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    className={cls("quantity")}
                    placeholder="e.g. 10"
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            {/* 3. Compliance */}
              <section className={sectionClass}>
                <h3 className="mb-5 font-semibold">Compliance</h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Country of Origin">
                    <input
                      maxLength={60}
                      className={inputClass}
                      value={form.countryOfOrigin}
                      onChange={(e) => updateField("countryOfOrigin", e.target.value)}
                    />
                  </Field>

                  <Field label="GST Rate (%)">
                    <select
                      className={inputClass}
                      value={form.gstRate}
                      onChange={(e) => updateField("gstRate", e.target.value)}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Warranty">
                    <input
                      maxLength={120}
                      className={inputClass}
                      placeholder="e.g. 1 year manufacturer warranty"
                      value={form.warranty}
                      onChange={(e) => updateField("warranty", e.target.value)}
                    />
                  </Field>

                  <Field label="Manufacturer / Packer Details" className="sm:col-span-2">
                    <textarea
                      rows={2}
                      maxLength={500}
                    className={inputClass}
                    value={form.packerDetails}
                    onChange={(e) => updateField("packerDetails", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            {/* 4. Images */}
            <section className={sectionClass}>
              <h3 className="mb-1 font-semibold">Images</h3>
              <p className="mb-5 text-xs text-slate-500">
                First image is the main image. JPG, PNG or WebP, max 2 MB each, up to {MAX_IMAGES} images.
              </p>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {existingImages.map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Item image ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeExistingImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 hover:bg-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {newImages.map((img, i) => (
                  <div
                    key={img.preview}
                    className="relative aspect-square overflow-hidden rounded-lg border border-blue-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.preview} alt={`New image ${i + 1}`} className="h-full w-full object-cover" />
                    {existingImages.length + i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeNewImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-700 hover:bg-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {totalImages < MAX_IMAGES && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600">
                    <ImagePlus size={22} />
                    Add image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImagePick}
                    />
                  </label>
                )}
              </div>

              {errors.images && (
                <p role="alert" className="mt-3 text-xs text-red-600">
                  {errors.images}
                </p>
              )}
            </section>

            {/* Existing: purchase & warranty */}
            <section className={sectionClass}>
              <h3 className="mb-5 font-semibold">Purchase &amp; Warranty</h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Purchase Date">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.purchaseDate}
                    onChange={(e) => updateField("purchaseDate", e.target.value)}
                  />
                </Field>

                <Field label="Warranty Expiry" error={errors.warrantyExpiry}>
                  <input
                    type="date"
                    className={cls("warrantyExpiry")}
                    value={form.warrantyExpiry}
                    onChange={(e) => updateField("warrantyExpiry", e.target.value)}
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.published}
                    onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                  />
                  <span>
                    <span className="font-medium">Show this item in the store</span>
                    <span className="block text-xs text-slate-500">
                      Customers can only see and order items that are shown, with a price and stock.
                    </span>
                  </span>
                </label>

                <Field label="Status">
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    <option>Active</option>
                    <option>Under Maintenance</option>
                    <option>Inactive</option>
                    <option>Retired</option>
                  </select>
                </Field>
              </div>

              <Field label="Additional Notes" className="mt-5 block">
                <textarea
                  rows={4}
                  maxLength={2000}
                  className={inputClass}
                  placeholder="Enter any additional item information..."
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </Field>
            </section>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <div role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                {success}
                {isEdit && itemId ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/items/${itemId}`)}
                    className="ml-2 font-semibold underline"
                  >
                    View item details
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="ml-2 font-semibold underline"
                  >
                    Back to dashboard
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? "Saving..." : isEdit ? "Update Item" : "Save Item"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  onValue,
  push,
  ref,
  set,
  serverTimestamp,
  update,
} from "firebase/database";
import { auth, rtdb } from "@/lib/firebase";
import {
  ArrowLeft,
  Package,
  Save,
  LoaderCircle,
} from "lucide-react";

type ItemFormState = {
  itemName: string;
  companyName: string;
  manufacturer: string;
  category: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: string;
  notes: string;
  sellingPrice: string;
  quantity: string;
  // Compliance
  countryOfOrigin: string;
  gstRate: string;
  warranty: string;
  packerDetails: string;
};

const emptyForm: ItemFormState = {
  itemName: "",
  category: "Printers",
  companyName: "",
  manufacturer: "",
  purchaseDate: "",
  warrantyExpiry: "",
  status: "Active",
  notes: "",
  sellingPrice: "",
  quantity: "",
  countryOfOrigin: "India",
  gstRate: "18",
  warranty: "",
  packerDetails: "",
};

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "text-sm font-medium text-slate-700";

export function ItemForm({ itemId }: { itemId?: string }) {
  const isEdit = Boolean(itemId);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState<ItemFormState>({
    ...emptyForm,
    });
  const [loadingItem, setLoadingItem] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);

      if (!currentUser) {
        router.replace("/");
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!itemId || !user) {
      return;
    }

    const itemRef = ref(rtdb, `items/${itemId}`);

    const unsubscribe = onValue(
      itemRef,
      (snapshot) => {
        const value = snapshot.val();

        if (value) {
          const stored = value as Record<string, unknown>;

          setForm({
            ...emptyForm,
            itemName: (stored.itemName as string) ?? "",
            companyName: (stored.companyName as string) ?? "",
            purchaseDate: (stored.purchaseDate as string) ?? "",
            warrantyExpiry: (stored.warrantyExpiry as string) ?? "",
            status: (stored.status as string) ?? "Active",
            notes: (stored.notes as string) ?? "",
          });
        }

        setLoadingItem(false);
      },
      (err) => {
        console.error("Failed to load item:", err);
        setError("Unable to load this item. Please check your Firebase Database Rules.");
        setLoadingItem(false);
      }
    );

    return unsubscribe;
  }, [itemId, user]);

  function updateField(
    field: keyof ItemFormState,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Please sign in before saving an item.");
      return;
    }

    setSaving(true);

    try {
      if (isEdit && itemId) {
        await update(ref(rtdb, `items/${itemId}`), {
          ...form,
          updatedAt: serverTimestamp(),
        });

        setSuccess("Item updated successfully!");
      } else {
        const itemsRef = ref(rtdb, "items");
        const newItemRef = push(itemsRef);

        await set(newItemRef, {
          ...form,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setSuccess("Item added successfully!");
        setForm({ ...emptyForm });
      }
    } catch (err) {
      console.error("Failed to save item:", err);
      setError(
        "Could not save the item. Check your Realtime Database rules and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
            <p className="text-xs text-slate-500">
              Inventory / {isEdit ? "Edit Item" : "Add Item"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {isEdit ? "Edit Item" : "Add New Item"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isEdit
              ? "Update the item details below and save your changes."
              : "Enter the item details below and save them to your inventory."}
          </p>
        </div>

        {loadingItem ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Loading item details...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="mb-5 font-semibold">Basic Information</h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Item Name *
                  <input
                    required
                    maxLength={120}
                    className={inputClass}
                    placeholder="e.g. Office Laser Printer"
                    value={form.itemName}
                    onChange={(e) => updateField("itemName", e.target.value)}
                  />
                </label>

                <label className={labelClass}>
                  Company Name *
                  <input
                    required
                    maxLength={120}
                    className={inputClass}
                    placeholder="e.g. HP, Canon, Epson"
                    value={form.companyName}
                    onChange={(e) =>
                      updateField("companyName", e.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="mb-5 font-semibold">Purchase &amp; Warranty</h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Purchase Date
                  <input
                    type="date"
                    className={inputClass}
                    value={form.purchaseDate}
                    onChange={(e) =>
                      updateField("purchaseDate", e.target.value)
                    }
                  />
                </label>

                <label className={labelClass}>
                  Warranty Expiry
                  <input
                    type="date"
                    className={inputClass}
                    value={form.warrantyExpiry}
                    onChange={(e) =>
                      updateField("warrantyExpiry", e.target.value)
                    }
                  />
                </label>

                <label className={labelClass}>
                  Status
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
                </label>
              </div>

              <label className={`${labelClass} mt-5 block`}>
                Additional Notes
                <textarea
                  rows={4}
                  maxLength={2000}
                  className={inputClass}
                  placeholder="Enter any additional item information..."
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </label>
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
                {saving ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving
                  ? "Saving..."
                  : isEdit
                    ? "Update Item"
                    : "Save Item"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

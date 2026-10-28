"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { SELLER, INVOICE_TERMS } from "@/lib/company";
import { amountInWords, buildInvoice } from "@/lib/invoice";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const printCss = `
@media print {
  @page { size: A4; margin: 12mm; }
  body > *:not(#invoice-portal) { display: none !important; }
  #invoice-portal { position: static !important; background: none !important; overflow: visible !important; padding: 0 !important; }
  #invoice-portal .no-print { display: none !important; }
  #invoice-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
  #invoice-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function InvoiceModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const inv = buildInvoice(order);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const buyerName = order.companyName || order.customerName;

  return createPortal(
    <div
      id="invoice-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${inv.invoiceNo}`}
    >
      <style>{printCss}</style>

      <div className="no-print mx-auto mb-3 flex max-w-4xl items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">Invoice {inv.invoiceNo}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Printer size={16} /> Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice"
            className="rounded-lg bg-white p-2 text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div id="invoice-sheet" className="relative mx-auto max-w-4xl overflow-hidden rounded-lg bg-white p-6 text-[13px] text-slate-800 shadow-xl sm:p-10">
        {order.status === "Cancelled" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 rounded-xl border-8 border-red-200 px-8 py-2 text-6xl font-black tracking-widest text-red-200">
              CANCELLED
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              {SELLER.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{SELLER.name}</h2>
              <p className="text-slate-500">{SELLER.tagline}</p>
              <p className="mt-1 max-w-xs text-slate-600">{SELLER.address}</p>
              <p className="text-slate-600">
                {SELLER.phone} · {SELLER.email}
              </p>
              <p className="font-medium">GSTIN: {SELLER.gstin}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-wide text-blue-700">
              {order.status === "Placed" ? "PROFORMA INVOICE" : "TAX INVOICE"}
            </h1>
            {order.status === "Placed" && <p className="text-xs text-amber-600">Awaiting confirmation from the store</p>}
            <table className="ml-auto mt-2 text-left">
              <tbody>
                <tr><td className="pr-3 text-slate-500">Invoice No.</td><td className="font-semibold">{inv.invoiceNo}</td></tr>
                <tr><td className="pr-3 text-slate-500">Date</td><td>{formatDate(order.createdAt)}</td></tr>
                <tr><td className="pr-3 text-slate-500">Order No.</td><td>{order.orderNo}</td></tr>
                <tr><td className="pr-3 text-slate-500">Payment</td><td>{order.paymentMethod}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Parties */}
        <div className="grid gap-6 border-b border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to / Ship to</p>
            <p className="mt-1 text-base font-bold">{buyerName}</p>
            {order.companyName && <p>Attn: {order.customerName}</p>}
            <p className="whitespace-pre-line text-slate-600">{order.address}</p>
            <p className="text-slate-600">
              Mobile: {order.phone}
              {order.email ? ` · ${order.email}` : ""}
            </p>
            {order.gstin && <p className="font-medium">GSTIN: {order.gstin}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requirements / notes</p>
            <p className="mt-1 whitespace-pre-line text-slate-600">{order.notes?.trim() || "—"}</p>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-x-auto py-5">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-white">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate (₹)</th>
                <th className="px-3 py-2 text-right">Taxable (₹)</th>
                <th className="px-3 py-2 text-right">GST</th>
                <th className="px-3 py-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-200 align-top">
                  <td className="px-3 py-2.5">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{l.name}</p>
                    {l.brand && <p className="text-xs text-slate-500">{l.brand}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right">{l.quantity}</td>
                  <td className="px-3 py-2.5 text-right">{inr(l.rate)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(l.taxable)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {l.gstRate}%
                    <span className="block text-xs text-slate-500">{inr(l.tax)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">{inr(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-t border-slate-200 pt-4">
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount in words</p>
            <p className="mt-1 font-medium">{amountInWords(inv.total)}</p>
            {SELLER.bank && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bank details</p>
                <p className="mt-1 text-slate-600">
                  {SELLER.bank.name}
                  <br />
                  A/C No: {SELLER.bank.accountNo} · IFSC: {SELLER.bank.ifsc}
                </p>
              </div>
            )}
          </div>

          <table className="w-full max-w-xs">
            <tbody>
              <tr><td className="py-1 text-slate-500">Taxable value</td><td className="py-1 text-right">₹{inr(inv.taxable)}</td></tr>
              {inv.igst ? (
                <tr><td className="py-1 text-slate-500">IGST</td><td className="py-1 text-right">₹{inr(inv.tax)}</td></tr>
              ) : (
                <>
                  <tr><td className="py-1 text-slate-500">CGST</td><td className="py-1 text-right">₹{inr(inv.cgst)}</td></tr>
                  <tr><td className="py-1 text-slate-500">SGST</td><td className="py-1 text-right">₹{inr(inv.sgst)}</td></tr>
                </>
              )}
              <tr className="border-t-2 border-slate-800 text-base font-bold">
                <td className="pt-2">Grand total</td>
                <td className="pt-2 text-right">₹{inr(inv.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 grid gap-6 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Terms &amp; conditions</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-slate-600">
              {INVOICE_TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col items-end justify-end text-right">
            <p className="text-xs text-slate-500">For {SELLER.name}</p>
            <div className="mt-10 w-48 border-t border-slate-400 pt-1 text-xs text-slate-600">Authorised signatory</div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">This is a computer-generated invoice.</p>
      </div>
    </div>,
    document.body
  );
}

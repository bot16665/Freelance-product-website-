import ExcelJS from "exceljs";
import { requireSeller } from "@/server/auth";
import { handle } from "@/server/http";
import { listOrders } from "@/server/orders";
import { orderTotal } from "@/lib/invoice";
import { SELLER } from "@/lib/company";

const dt = (ts?: number) =>
  ts ? new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

/**
 * Downloads every order as a real .xlsx file (store staff only).
 * Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive) filter by order date.
 * One row per product line, plus a summary sheet.
 */
export const GET = handle(async (req: Request) => {
  await requireSeller(req);

  const params = new URL(req.url).searchParams;
  const parseDay = (v: string | null, endOfDay = false): number | undefined => {
    if (!v) return undefined;
    const d = new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
    return Number.isNaN(d.getTime()) ? undefined : d.getTime();
  };
  const from = parseDay(params.get("from"));
  const to = parseDay(params.get("to"), true);
  // exports can be big, so pull up to 5000 orders
  const { orders } = listOrders("all", "", { limit: 5000, from, to });

  const wb = new ExcelJS.Workbook();
  wb.creator = SELLER.name;
  wb.created = new Date();

  /* ------------------------- sheet 1: order lines ------------------------- */
  const ws = wb.addWorksheet("Order Details");
  ws.columns = [
    { header: "Order No", key: "orderNo", width: 14 },
    { header: "Invoice No", key: "invoiceNo", width: 22 },
    { header: "Order Date & Time", key: "date", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Company", key: "company", width: 24 },
    { header: "GSTIN", key: "gstin", width: 17 },
    { header: "Contact Person", key: "customer", width: 20 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Delivery Address", key: "address", width: 40 },
    { header: "Product", key: "product", width: 28 },
    { header: "Quantity", key: "qty", width: 10 },
    { header: "Unit Price (₹)", key: "price", width: 14 },
    { header: "Line Total (₹)", key: "lineTotal", width: 14 },
    { header: "Order Total (₹)", key: "total", width: 15 },
    { header: "Payment", key: "payment", width: 16 },
    { header: "Buyer Email", key: "buyerEmail", width: 26 },
    { header: "Notes", key: "notes", width: 32 },
  ];

  for (const o of orders) {
    for (const line of o.items) {
      ws.addRow({
        orderNo: o.orderNo,
        invoiceNo: o.invoiceNo ?? "-",
        date: dt(o.createdAt),
        status: o.status,
        company: o.companyName ?? "-",
        gstin: o.gstin ?? "-",
        customer: o.customerName,
        phone: o.phone,
        address: o.address,
        product: line.name + (line.brand ? ` (${line.brand})` : ""),
        qty: line.quantity,
        price: line.price,
        lineTotal: line.lineTotal,
        total: orderTotal(o),
        payment: o.paymentMethod,
        buyerEmail: o.buyerEmail ?? "-",
        notes: o.notes || "-",
      });
    }
  }

  // style: bold header with fill, frozen, autofilter, money formats
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  header.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: "Q1" };
  for (const row of ws.getRows(2, ws.rowCount - 1) ?? []) {
    row.getCell("price").numFmt = "₹#,##0.00";
    row.getCell("lineTotal").numFmt = "₹#,##0.00";
    row.getCell("total").numFmt = "₹#,##0.00";
  }

  /* ------------------------- sheet 2: summary per order ------------------------- */
  const sum = wb.addWorksheet("Summary");
  sum.columns = [
    { header: "Order No", key: "orderNo", width: 14 },
    { header: "Invoice No", key: "invoiceNo", width: 22 },
    { header: "Order Date & Time", key: "date", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Company", key: "company", width: 24 },
    { header: "Contact Person", key: "customer", width: 20 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Items", key: "items", width: 8 },
    { header: "Total (₹)", key: "total", width: 14 },
  ];
  for (const o of orders) {
    sum.addRow({
      orderNo: o.orderNo,
      invoiceNo: o.invoiceNo ?? "-",
      date: dt(o.createdAt),
      status: o.status,
      company: o.companyName ?? "-",
      customer: o.customerName,
      phone: o.phone,
      items: o.totalItems,
      total: orderTotal(o),
    });
  }
  const sumHeader = sum.getRow(1);
  sumHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  sumHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  sum.views = [{ state: "frozen", ySplit: 1 }];
  sum.autoFilter = { from: "A1", to: "I1" };
  for (const row of sum.getRows(2, sum.rowCount - 1) ?? []) row.getCell("total").numFmt = "₹#,##0.00";

  const buffer = await wb.xlsx.writeBuffer();
  const range = from || to ? `_from_${params.get("from") ?? "start"}_to_${params.get("to") ?? "now"}` : "_all";
  const filename = `orders${range}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});

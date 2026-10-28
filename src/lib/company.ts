/**
 * YOUR business details. They are printed at the top of every invoice.
 * Edit these once and every invoice (old and new) uses them.
 */
export const SELLER = {
  name: "Your Company Name",
  tagline: "Quality products · Fast delivery",
  address: "Shop No. 1, Your Street, Your City, State - 400001",
  gstin: "27AAAAA0000A1Z5", // 15-character GSTIN. First 2 digits = state code.
  phone: "+91 90000 00000",
  email: "accounts@yourcompany.com",
  bank: {
    // Shown on the invoice. Remove the whole `bank` block if you don't want it.
    name: "Your Bank Name",
    accountNo: "000000000000",
    ifsc: "BANK0000000",
  },
};

export const INVOICE_TERMS = [
  "Goods once sold will not be taken back or exchanged.",
  "Warranty as per the manufacturer's terms.",
  "Prices shown are inclusive of GST.",
  "Subject to local jurisdiction only.",
];

export function printHtml(html: string, title: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #444; }
  h3 { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5562f; }
  .brand { color: #e5562f; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .meta { text-align: right; font-size: 12px; color: #666; }
  .section { margin-bottom: 20px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
  .label { font-size: 11px; color: #888; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 14px; font-weight: 600; }
  .value-lg { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; padding: 8px 10px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
  td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  tfoot td { border-top: 2px solid #e5e7eb; font-weight: 700; background: #f9fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-gray { background: #f3f4f6; color: #6b7280; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .summary-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #888; }
  .stamp { display: inline-block; border: 3px solid #15803d; color: #15803d; font-size: 18px; font-weight: 800; padding: 6px 16px; border-radius: 4px; transform: rotate(-8deg); letter-spacing: 2px; margin-left: 16px; vertical-align: middle; }
  .stamp-red { border-color: #b91c1c; color: #b91c1c; }
  .letter-body { line-height: 1.8; margin-bottom: 12px; }
  .indent { margin-left: 24px; }
  @media print {
    body { padding: 16px; }
    button { display: none !important; }
  }
</style>
</head>
<body>
<button onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#e5562f;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Print / Save PDF</button>
${html}
</body>
</html>`);
  win.document.close();
}

export function formatKES(n: number | string) {
  return `KES ${Number(n).toLocaleString("en-KE")}`;
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

export function today() {
  return new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem("jengo_settings");
    const d = {
      companyName: "Jengo Property Management",
      companyPhone: "+254 700 000 000",
      companyEmail: "info@jengo.co.ke",
      companyAddress: "Kilimani, Nairobi",
      mpesaPaybill: "247247",
      mpesaAccountPrefix: "SRVCHRG",
    };
    return raw ? { ...d, ...JSON.parse(raw) } : d;
  } catch {
    return {
      companyName: "Jengo Property Management",
      companyPhone: "+254 700 000 000",
      companyEmail: "info@jengo.co.ke",
      companyAddress: "Kilimani, Nairobi",
      mpesaPaybill: "247247",
      mpesaAccountPrefix: "SRVCHRG",
    };
  }
}

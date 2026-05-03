"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileDown, HandCoins, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function formatMeters(value) {
  return Number(value ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

async function getUrduFontBase64() {
  const res = await fetch("/fonts/NotoNaskhArabic-Regular.ttf");
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function getLogoDataUrl() {
  try {
    const res = await fetch("/hch-logo.svg");
    const svg = await res.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch {
    return "";
  }
}

export default function CustomerKhataPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { session } = useAuth();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [client, setClient] = useState(null);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [downloading, setDownloading] = useState(false);

  const isAdmin = session?.role === "admin";
  const clientId = String(id ?? "");

  const ui = useMemo(() => {
    const en = {
      title: "Customer Khata",
      statement: "Statement",
      outstanding: "Total Outstanding Balance",
      receive: "Receive Payment",
      download: "Download Statement",
      close: "Close",
      amount: "Amount",
      save: "Continue",
      tableTitle: "Transaction History",
      date: "Date",
      product: "Product",
      meters: "Meters",
      total: "Total Bill",
      paid: "Amount Paid",
      balance: "Remaining Balance",
    };

    const ur = {
      title: "کھاتہ",
      statement: "کھاتہ",
      outstanding: "کل بقایا",
      receive: "رقم وصول کریں",
      download: "کھاتہ ڈاؤنلوڈ کریں",
      close: "بند کریں",
      amount: "قیمت",
      save: "آگے جائیں",
      tableTitle: "لین دین",
      date: "تاریخ",
      product: "پروڈکٹ",
      meters: "میٹر",
      total: "کل بل",
      paid: "ادا شدہ رقم",
      balance: "بقایا",
    };

    return language === "ur" ? ur : en;
  }, [language]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const summary = useMemo(() => {
    const totals = rows.reduce(
      (acc, item) => {
        const total = toNumber(item.total_bill ?? item.total_price);
        acc.total += total;
        acc.paid += toNumber(item.amount_paid);
        return acc;
      },
      { total: 0, paid: 0 }
    );
    const outstanding = Math.max(totals.total - totals.paid, 0);
    return { ...totals, outstanding };
  }, [rows]);

  const rowsWithRunning = useMemo(() => {
    // Running balance must be computed in chronological order.
    const sorted = [...rows].sort((a, b) => {
      const at = new Date(a.created_at ?? 0).getTime();
      const bt = new Date(b.created_at ?? 0).getTime();

      if (Number.isNaN(at) || Number.isNaN(bt)) {
        return String(a.id).localeCompare(String(b.id));
      }

      if (at !== bt) return at - bt;
      return String(a.id).localeCompare(String(b.id));
    });

    const computed = sorted.reduce(
      (state, row) => {
        const total = toNumber(row.total_bill ?? row.total_price);
        const paid = toNumber(row.amount_paid);
        const isWasooli = total === 0 && paid > 0;
        const nextTracker = state.tracker + (total - paid);

        return {
          tracker: nextTracker,
          items: [
            ...state.items,
            {
              ...row,
              __total: total,
              __paid: paid,
              __running: nextTracker,
              __isWasooli: isWasooli,
            },
          ],
        };
      },
      { tracker: 0, items: [] }
    );

    return computed.items;
  }, [rows]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setIsLoading(true);

      const [clientResult, ledgerResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, phone, city, trust_level")
          .eq("id", clientId)
          .maybeSingle(),
        supabase
          .from("ledger")
          .select("id, created_at, quantity_meters, total_bill, total_price, amount_paid, balance, products(name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
      ]);

      if (!alive) return;

      if (clientResult.error) {
        console.error("Client fetch error:", clientResult.error.message || clientResult.error);
      }
      if (ledgerResult.error) {
        console.error("Ledger fetch error:", ledgerResult.error.message || ledgerResult.error);
      }

      setClient(clientResult.data ?? null);
      setRows(ledgerResult.data ?? []);
      setIsLoading(false);
    }

    if (mounted && clientId) load();
    return () => {
      alive = false;
    };
  }, [clientId, mounted]);

  async function handleDownloadStatement() {
    setDownloading(true);

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const now = new Date();
      const logoDataUrl = await getLogoDataUrl();
      const fileSafeName = String(client?.name ?? "customer")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (language === "ur") {
        const fontBase64 = await getUrduFontBase64();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        canvas.width = 1240;
        canvas.height = 1754;
        ctx.fillStyle = "#fffaf4";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const fontFace = new FontFace("KhataUrdu", `url(/fonts/NotoNaskhArabic-Regular.ttf)`);
        await fontFace.load();
        document.fonts.add(fontFace);
        await document.fonts.load('28px "KhataUrdu"');

        ctx.direction = "rtl";
        ctx.textAlign = "right";
        ctx.fillStyle = "#800000";
        ctx.font = 'bold 44px "KhataUrdu"';
        ctx.fillText("حافظ کلاتھ ہاؤس - کھاتہ", canvas.width - 70, 110);
        ctx.fillStyle = "#523939";
        ctx.font = '28px "KhataUrdu"';
        ctx.fillText(`${ui.date}: ${formatDate(now)}`, canvas.width - 70, 152);
        ctx.fillText(`${ui.statement}: ${client?.name ?? "-"}`, canvas.width - 70, 194);

        ctx.strokeStyle = "#800000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(70, 226);
        ctx.lineTo(canvas.width - 70, 226);
        ctx.stroke();

        ctx.fillStyle = "#2a1a1a";
        ctx.font = 'bold 32px "KhataUrdu"';
        ctx.fillText(`${ui.outstanding}: PKR ${formatCurrency(summary.outstanding)}`, canvas.width - 70, 282);

        ctx.font = '24px "KhataUrdu"';
        let y = 340;
        rows.slice(0, 14).forEach((row) => {
          const product = row.products?.name ?? "-";
          const meters = formatMeters(row.quantity_meters);
          const total = formatCurrency(toNumber(row.total_bill ?? row.total_price));
          const paid = formatCurrency(toNumber(row.amount_paid));
          const bal = formatCurrency(Math.max(toNumber(row.total_bill ?? row.total_price) - toNumber(row.amount_paid), 0));
          ctx.fillText(`${formatDate(row.created_at)} · ${product} · ${meters}m · PKR ${total} · PKR ${paid} · PKR ${bal}`, canvas.width - 70, y);
          y += 44;
        });

        const doc = new jsPDF({ unit: "pt", format: "a4" });
        doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", fontBase64);
        doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
        doc.setFont("NotoNaskhArabic");
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89);
        doc.save(`hafiz-clothes-house-khata-${fileSafeName || "customer"}-${now.toISOString().slice(0, 10)}.pdf`);
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 16;

      doc.setFillColor(111, 0, 0);
      doc.roundedRect(marginX, 14, pageWidth - marginX * 2, 34, 8, 8, "F");
      doc.setTextColor(255, 249, 241);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("HAFIZ CLOTHES HOUSE", marginX + 10, 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Customer Khata Statement", marginX + 10, 40);

      doc.setTextColor(53, 18, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(client?.name ?? "Customer", marginX, 66);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Phone: ${client?.phone ?? "-"}`, marginX, 76);
      doc.text(`City: ${client?.city ?? "-"}`, marginX, 84);

      autoTable(doc, {
        startY: 98,
        head: [["Summary", "Amount"]],
        body: [
          ["Total Bill", `PKR ${formatCurrency(summary.total)}`],
          ["Amount Paid", `PKR ${formatCurrency(summary.paid)}`],
          ["Outstanding", `PKR ${formatCurrency(summary.outstanding)}`],
        ],
        margin: { left: marginX, right: marginX },
        theme: "grid",
        headStyles: {
          fillColor: [128, 0, 0],
          textColor: [255, 249, 241],
          fontStyle: "bold",
        },
        bodyStyles: {
          textColor: [53, 18, 18],
        },
        styles: {
          fontSize: 11,
          cellPadding: 8,
          lineColor: [227, 216, 216],
          lineWidth: 1,
        },
      });

      const tableStart = doc.lastAutoTable?.finalY ?? 150;
      autoTable(doc, {
        startY: tableStart + 12,
        head: [[ui.date, ui.product, ui.meters, ui.total, ui.paid, ui.balance]],
        body: rows.map((row) => {
          const total = toNumber(row.total_bill ?? row.total_price);
          const paid = toNumber(row.amount_paid);
          const bal = Math.max(total - paid, 0);
          return [
            formatDate(row.created_at),
            row.products?.name ?? "-",
            `${formatMeters(row.quantity_meters)}m`,
            `PKR ${formatCurrency(total)}`,
            `PKR ${formatCurrency(paid)}`,
            `PKR ${formatCurrency(bal)}`,
          ];
        }),
        margin: { left: marginX, right: marginX },
        theme: "grid",
        headStyles: { fillColor: [128, 0, 0], textColor: [255, 249, 241] },
        styles: { fontSize: 9, cellPadding: 6 },
      });

      doc.save(`hafiz-clothes-house-khata-${fileSafeName || "customer"}-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Khata PDF error:", error);
    } finally {
      setDownloading(false);
    }
  }

  function handleReceivePayment() {
    if (!isAdmin || !client?.name) return;
    const paid = paymentAmount.trim();
    router.push(
      `/ledger?client=${encodeURIComponent(client.name)}&open=1&paid=${encodeURIComponent(paid)}`
    );
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section className="khata-page">
      <div className="khata-container">
        <div className="flex flex-col gap-6 mb-8 lg:flex-row">
          <div className="flex-1 rounded-3xl border border-white/20 bg-white/40 p-8 shadow-2xl backdrop-blur-xl">
            <p className="dashboard-eyebrow">{ui.statement}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#4b0000]">
              {client?.name ?? ui.title}
            </h2>
            <p className="mt-3 text-sm font-semibold text-[#4b0000]/80">
              {client?.phone ?? "-"}
              {client?.city ? <span className="text-[#4b0000]/50"> · {client.city}</span> : null}
            </p>
          </div>

          <div className="w-full lg:w-[350px]">
            <div className="flex flex-col justify-between rounded-3xl border border-[#4b0000]/20 bg-white/60 p-7 text-center text-[#4b0000] shadow-2xl backdrop-blur-2xl">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#4b0000]/55">
                  {ui.outstanding}
                </p>
                <p className="text-4xl font-black text-[#4b0000] drop-shadow-[0_10px_30px_rgba(128,0,0,0.12)]">
                  PKR {formatCurrency(summary.outstanding)}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#800000,#5b0303)] px-6 py-3 font-bold text-white shadow-lg shadow-[#4b0000]/20 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => setIsModalOpen(true)}
                  disabled={!isAdmin}
                >
                  <HandCoins size={16} />
                  <span>{ui.receive}</span>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#4b0000]/25 bg-white/40 px-6 py-3 font-semibold text-[#4b0000] shadow-sm transition-all hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDownloadStatement}
                  disabled={downloading}
                >
                  <FileDown size={16} />
                  <span>{downloading ? "..." : ui.download}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="khata-card">
          <div className="khata-card-head">
            <p className="dashboard-eyebrow">{ui.tableTitle}</p>
            <h3>{ui.tableTitle}</h3>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-xl">
            <div className="khata-table-wrap">
              <table className="w-full table-fixed">
              <colgroup>
                <col className="khata-col-date" />
                <col className="khata-col-product" />
                <col className="khata-col-meters" />
                <col className="khata-col-money" />
                <col className="khata-col-money" />
                <col className="khata-col-money" />
              </colgroup>
              <thead>
                <tr className="bg-[#f9f1e9] text-[#4b0000] border-b border-[#f1dfd8]">
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-widest">{ui.date}</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-widest">{ui.product}</th>
                  <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-widest">{ui.meters}</th>
                  <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-widest">{ui.total}</th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-widest">{ui.paid}</th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-widest">{ui.balance}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`loading-${idx}`}>
                      <td colSpan={6}>
                        <div className="khata-loading-row" />
                      </td>
                    </tr>
                  ))
                ) : rows.length ? (
                  rowsWithRunning.map((row) => {
                    const total = row.__total ?? toNumber(row.total_bill ?? row.total_price);
                    const paid = row.__paid ?? toNumber(row.amount_paid);
                    const running = row.__running ?? 0;
                    const isWasooli = Boolean(row.__isWasooli);
                    return (
                      <tr key={row.id} className="khata-row">
                        <td className="px-4 py-3 text-sm font-semibold text-[#241816]">{formatDate(row.created_at)}</td>
                        <td>
                          <span className={isWasooli ? "khata-payment-badge" : "khata-product-badge"}>
                            {isWasooli ? "Payment Recv." : row.products?.name ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-[#241816]">{formatMeters(row.quantity_meters)}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-[#241816]">PKR {formatCurrency(total)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[#241816]">PKR {formatCurrency(paid)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-[#241816]">
                          {running === 0 ? "Cleared" : `PKR ${formatCurrency(running)}`}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="khata-empty">
                      No ledger entries found for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="khata-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <div className="khata-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="khata-modal-head">
              <div>
                <p className="dashboard-eyebrow">{ui.receive}</p>
                <h3>{ui.receive}</h3>
              </div>
              <button type="button" className="khata-modal-close" onClick={() => setIsModalOpen(false)} aria-label={ui.close}>
                <X size={18} />
              </button>
            </div>

            <div className="khata-modal-body">
              <label className="khata-field">
                <span>{ui.amount}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0"
                />
              </label>
              <p className="khata-note">
                {language === "ur"
                  ? "یہ آپ کو میرا حساب میں اسی گاہک کے لیے نیا اندراج کھول دے گا۔"
                  : "This will open Mera Hisab with this customer pre-selected so you can record the payment."}
              </p>
              <button type="button" className="khata-primary" onClick={handleReceivePayment} disabled={!isAdmin}>
                {ui.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

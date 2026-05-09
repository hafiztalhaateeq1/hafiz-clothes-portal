"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText, Package, Wallet } from "lucide-react";
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

function formatDateLabel(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchExpensesForRange({ startKey, endKey }) {
  // Some schemas store an explicit date string (expense_date/date), others only have created_at.
  // We fetch a generous window and do reliable month/day grouping client-side.
  // (This also avoids UTC vs local date filtering issues.)
  let result = await supabase
    .from("expenses")
    .select("id, amount, expense_date, date, created_at, category, description")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (result.error) {
    const message = String(result.error.message ?? "");

    if (/expense_date/i.test(message)) {
      result = await supabase
        .from("expenses")
        .select("id, amount, date, created_at, category, description")
        .order("created_at", { ascending: false })
        .limit(5000);
    }

    if (result.error && /\\bdate\\b/i.test(String(result.error.message ?? ""))) {
      result = await supabase
        .from("expenses")
        .select("id, amount, created_at, category, description")
        .order("created_at", { ascending: false })
        .limit(5000);
    }
  }

  return result;
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

async function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
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

export default function ReportsPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [daily, setDaily] = useState({ sales: [], expenses: [] });
  const [monthly, setMonthly] = useState({
    totalSale: 0,
    totalCost: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [lowStock, setLowStock] = useState([]);
  const [downloading, setDownloading] = useState("");

  const isAdmin = session?.role === "admin" || session?.role === "management";

  const ui = useMemo(() => {
    const en = {
      title: "Report Center",
      subtitle: "Download business reports for daily operations and monthly decisions.",
      daily: "Daily Summary",
      monthly: "Monthly Financials",
      inventory: "Inventory Status",
      download: "Download PDF Report",
      todaySales: "Today's Sales",
      todayExpenses: "Today's Expenses",
      date: "Date",
      customer: "Customer",
      product: "Product",
      meters: "Meters",
      amount: "Amount",
      category: "Category",
      description: "Description",
      totalSale: "Total Sale",
      totalCost: "Total Purchase Cost",
      totalExpenses: "Total Expenses",
      netProfit: "Net Profit",
      lowStock: "Low Stock (< 50m)",
      stock: "Available",
      notAdmin: "Reports are available for administrators only.",
      header: "Hafiz Clothes House - Business Report",
    };

    const ur = {
      title: "رپورٹ سینٹر",
      subtitle: "روزانہ اور ماہانہ کاروباری رپورٹس ڈاؤنلوڈ کریں۔",
      daily: "یومیہ خلاصہ",
      monthly: "ماہانہ مالیات",
      inventory: "اسٹاک اسٹیٹس",
      download: "پی ڈی ایف ڈاؤنلوڈ کریں",
      todaySales: "آج کی فروخت",
      todayExpenses: "آج کے اخراجات",
      date: "تاریخ",
      customer: "گاہک",
      product: "پروڈکٹ",
      meters: "میٹر",
      amount: "قیمت",
      category: "زمرہ",
      description: "تفصیل",
      totalSale: "کل فروخت",
      totalCost: "کل قیمتِ خرید",
      totalExpenses: "کل اخراجات",
      netProfit: "خالص منافع",
      lowStock: "کم اسٹاک (50 میٹر سے کم)",
      stock: "دستیاب",
      notAdmin: "رپورٹس صرف ایڈمن کے لیے دستیاب ہیں۔",
      header: "حافظ کلاتھ ہاؤس - بزنس رپورٹ",
    };

    return language === "ur" ? ur : en;
  }, [language]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let alive = true;

    async function fetchReports() {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const now = new Date();
        const dayStart = startOfDay(now);
        const dayEnd = endOfDay(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const todayKey = getLocalDateKey(now);
        const monthPrefix = todayKey.slice(0, 7); // YYYY-MM
        const monthStartKey = getLocalDateKey(monthStart);
        const monthEndKey = getLocalDateKey(monthEnd);

        const [ledgerToday, ledgerMonth, expensesRange, productsLow] = await Promise.all([
          supabase
            .from("ledger")
            .select("id, created_at, total_bill, total_price, quantity_meters, clients(name), products(name, purchase_price)")
            .gte("created_at", dayStart.toISOString())
            .lte("created_at", dayEnd.toISOString())
            .order("created_at", { ascending: false }),
          supabase
            .from("ledger")
            .select("created_at, total_bill, total_price, quantity_meters, products(purchase_price)")
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString()),
          fetchExpensesForRange({ startKey: monthStartKey, endKey: monthEndKey }),
          supabase
            .from("products")
            .select("id, name, stock_meters")
            .lt("stock_meters", 50)
            .order("stock_meters", { ascending: true })
            .limit(50),
        ]);

        if (!alive) return;

        const dailySales = (ledgerToday.data ?? []).map((row) => ({
          id: row.id,
          date: row.created_at,
          customer: row.clients?.name ?? "-",
          product: row.products?.name ?? "-",
          meters: toNumber(row.quantity_meters),
          amount: toNumber(row.total_bill ?? row.total_price),
        }));

        const expensesRows = expensesRange?.data ?? [];
        const normalizeExpenseKey = (value) => {
          const raw = String(value ?? "").trim();
          if (!raw) return "";
          // If it's a timestamp, take YYYY-MM-DD prefix.
          if (raw.length >= 10) return raw.slice(0, 10);
          return raw;
        };

        const dailyExpenses = expensesRows
          .filter((row) => {
            const key = normalizeExpenseKey(row.expense_date ?? row.date);
            if (key) {
              return key === todayKey;
            }

            // Fallback when no date column exists yet.
            const d = new Date(row.created_at ?? "");
            if (Number.isNaN(d.getTime())) return false;
            return getLocalDateKey(d) === todayKey;
          })
          .map((row, idx) => ({
            id: row.id ?? `expense-${idx}`,
            date: row.expense_date ?? row.date ?? row.created_at,
            category: row.category ?? "others",
            description: row.description ?? "",
            amount: Number(row.amount ?? 0),
          }));

        const monthSales = ledgerMonth.data ?? [];
        const totalSale = monthSales.reduce((sum, row) => sum + toNumber(row.total_bill ?? row.total_price), 0);
        const totalCost = monthSales.reduce((sum, row) => {
          const meters = toNumber(row.quantity_meters);
          const purchasePrice = toNumber(row.products?.purchase_price);
          return sum + meters * purchasePrice;
        }, 0);

        const totalExpenses = expensesRows.reduce((sum, row) => {
          const key = normalizeExpenseKey(row.expense_date ?? row.date);
          if (key) {
            if (key.slice(0, 7) !== monthPrefix) return sum;
            return sum + Number(row.amount ?? 0);
          }

          const d = new Date(row.created_at ?? "");
          if (Number.isNaN(d.getTime())) return sum;
          if (getLocalDateKey(d).slice(0, 7) !== monthPrefix) return sum;
          return sum + Number(row.amount ?? 0);
        }, 0);

        console.log("Report Center expenses rows:", expensesRows.length);
        console.log("Today key:", todayKey, "Month prefix:", monthPrefix);
        console.log("Total Expenses Fetched:", totalExpenses);

        setDaily({ sales: dailySales, expenses: dailyExpenses });
        setMonthly({
          totalSale,
          totalCost,
          totalExpenses,
          netProfit: totalSale - totalCost - totalExpenses,
        });
        setLowStock((productsLow.data ?? []).map((row) => ({
          id: row.id,
          name: row.name ?? "-",
          stock: toNumber(row.stock_meters),
        })));
      } catch (error) {
        console.error("Reports fetch error:", error);
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    if (mounted) fetchReports();
    return () => {
      alive = false;
    };
  }, [isAdmin, mounted]);

  async function downloadReport(sectionKey) {
    setDownloading(sectionKey);

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const now = new Date();
      const reportDate = formatDateLabel(now);
      const logoDataUrl = await getLogoDataUrl();

      if (language === "ur") {
        const fontBase64 = await getUrduFontBase64();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        canvas.width = 1240;
        canvas.height = 1754;
        ctx.fillStyle = "#fffaf4";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (logoDataUrl) {
          const img = await loadImage(logoDataUrl);
          ctx.drawImage(img, 70, 60, 120, 120);
        }

        // Load font for canvas rendering
        const fontFace = new FontFace("ReportUrdu", `url(/fonts/NotoNaskhArabic-Regular.ttf)`);
        await fontFace.load();
        document.fonts.add(fontFace);
        await document.fonts.load('28px "ReportUrdu"');

        ctx.direction = "rtl";
        ctx.textAlign = "right";
        ctx.fillStyle = "#800000";
        ctx.font = 'bold 44px "ReportUrdu"';
        ctx.fillText(ui.header, canvas.width - 70, 105);
        ctx.fillStyle = "#523939";
        ctx.font = '28px "ReportUrdu"';
        ctx.fillText(`${ui.date}: ${reportDate}`, canvas.width - 70, 150);

        ctx.strokeStyle = "#800000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(70, 185);
        ctx.lineTo(canvas.width - 70, 185);
        ctx.stroke();

        // Simple section body (best-effort) as an image for proper RTL shaping.
        ctx.fillStyle = "#2a1a1a";
        ctx.font = 'bold 34px "ReportUrdu"';
        const sectionTitle =
          sectionKey === "daily" ? ui.daily : sectionKey === "monthly" ? ui.monthly : ui.inventory;
        ctx.fillText(sectionTitle, canvas.width - 70, 245);

        ctx.font = '26px "ReportUrdu"';
        let y = 300;
        const line = (text) => {
          ctx.fillText(text, canvas.width - 70, y);
          y += 44;
        };

        if (sectionKey === "monthly") {
          line(`${ui.totalSale}: PKR ${formatCurrency(monthly.totalSale)}`);
          line(`${ui.totalCost}: PKR ${formatCurrency(monthly.totalCost)}`);
          line(`${ui.totalExpenses}: PKR ${formatCurrency(monthly.totalExpenses)}`);
          line(`${ui.netProfit}: PKR ${formatCurrency(monthly.netProfit)}`);
        } else if (sectionKey === "inventory") {
          lowStock.slice(0, 15).forEach((row) => {
            line(`${row.name} - ${ui.stock}: ${row.stock} ${ui.meters}`);
          });
        } else {
          line(ui.todaySales);
          daily.sales.slice(0, 10).forEach((row) => {
            line(`${row.product} - PKR ${formatCurrency(row.amount)}`);
          });
          y += 22;
          line(ui.todayExpenses);
          daily.expenses.slice(0, 10).forEach((row) => {
            line(`${row.category} - PKR ${formatCurrency(row.amount)}`);
          });
        }

        const doc = new jsPDF({ unit: "pt", format: "a4" });
        doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", fontBase64);
        doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
        doc.setFont("NotoNaskhArabic");
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89);
        doc.save(`hafiz-clothes-house-report-${sectionKey}-${now.toISOString().slice(0, 10)}.pdf`);
        return;
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 48;

      doc.setFillColor(128, 0, 0);
      doc.rect(0, 0, pageWidth, 10, "F");

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", marginX, 22, 54, 54, undefined, "FAST");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(128, 0, 0);
      doc.text(ui.header, marginX + 64, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(82, 57, 57);
      doc.text(`${ui.date}: ${reportDate}`, marginX + 64, 68);

      doc.setDrawColor(128, 0, 0);
      doc.line(marginX, 86, pageWidth - marginX, 86);

      const sectionTitle =
        sectionKey === "daily" ? ui.daily : sectionKey === "monthly" ? ui.monthly : ui.inventory;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(36, 24, 22);
      doc.text(sectionTitle, marginX, 112);

      if (sectionKey === "monthly") {
        autoTable(doc, {
          startY: 132,
          head: [[ui.totalSale, ui.totalCost, ui.totalExpenses, ui.netProfit]],
          body: [[
            `PKR ${formatCurrency(monthly.totalSale)}`,
            `PKR ${formatCurrency(monthly.totalCost)}`,
            `PKR ${formatCurrency(monthly.totalExpenses)}`,
            `PKR ${formatCurrency(monthly.netProfit)}`,
          ]],
          styles: { fontSize: 11 },
          headStyles: { fillColor: [128, 0, 0] },
        });
      } else if (sectionKey === "inventory") {
        autoTable(doc, {
          startY: 132,
          head: [[ui.product, ui.stock]],
          body: lowStock.map((row) => [row.name, `${row.stock} m`]),
          styles: { fontSize: 11 },
          headStyles: { fillColor: [128, 0, 0] },
        });
      } else {
        autoTable(doc, {
          startY: 132,
          head: [[ui.todaySales]],
          body: daily.sales.map((row) => [
            `${formatDateLabel(new Date(row.date))} · ${row.customer} · ${row.product} · ${row.meters}m · PKR ${formatCurrency(row.amount)}`,
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [128, 0, 0] },
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [[ui.todayExpenses]],
          body: daily.expenses.map((row) => [
            `${formatDateLabel(new Date(row.date))} · ${row.category} · ${row.description || "-"} · PKR ${formatCurrency(row.amount)}`,
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [128, 0, 0] },
        });
      }

      doc.save(`hafiz-clothes-house-report-${sectionKey}-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Report PDF error:", error);
    } finally {
      setDownloading("");
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#FDF8F3]" />;
  }

  if (!isAdmin) {
    return (
      <section className="reports-page">
        <div className="reports-hero">
          <div>
            <p className="dashboard-eyebrow">{ui.title}</p>
            <h2>{ui.title}</h2>
            <p className="dashboard-copy">{ui.notAdmin}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reports-page">
      <div className="reports-hero">
        <div>
          <p className="dashboard-eyebrow">{ui.title}</p>
          <h2>{ui.title}</h2>
          <p className="dashboard-copy">{ui.subtitle}</p>
        </div>
      </div>

      <div className="reports-grid">
        <article className="reports-card">
          <div className="reports-card-head">
            <div className="reports-card-title">
              <span className="reports-card-icon" aria-hidden="true">
                <FileText size={18} />
              </span>
              <div>
                <p className="dashboard-eyebrow">{ui.daily}</p>
                <h3>{ui.daily}</h3>
              </div>
            </div>
            <button
              type="button"
              className="reports-download w-full justify-center md:w-auto"
              onClick={() => downloadReport("daily")}
              disabled={downloading === "daily"}
            >
              <FileDown size={24} />
              <span className="sm:hidden">{downloading === "daily" ? "..." : language === "ur" ? ui.download : "Download PDF"}</span>
              <span className="hidden sm:inline">{downloading === "daily" ? "..." : ui.download}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="reports-loading-row" />
          ) : (
            <div className="reports-card-body">
              <div className="reports-mini-grid grid grid-cols-2 gap-3 md:gap-4">
                <div className="reports-mini flex min-h-[100px] flex-col justify-between rounded-2xl border border-white/30 bg-white/60 p-4 text-left shadow-[0_10px_28px_rgba(69,9,9,0.06)] backdrop-blur-xl">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {ui.todaySales}
                  </span>
                  <strong className="text-2xl font-bold text-[#800000]">{daily.sales.length}</strong>
                </div>
                <div className="reports-mini flex min-h-[100px] flex-col justify-between rounded-2xl border border-white/30 bg-white/60 p-4 text-left shadow-[0_10px_28px_rgba(69,9,9,0.06)] backdrop-blur-xl">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    {ui.todayExpenses}
                  </span>
                  <strong className="text-2xl font-bold text-[#800000]">{daily.expenses.length}</strong>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="reports-card">
          <div className="reports-card-head">
            <div className="reports-card-title">
              <span className="reports-card-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <div>
                <p className="dashboard-eyebrow">{ui.monthly}</p>
                <h3>{ui.monthly}</h3>
              </div>
            </div>
            <button
              type="button"
              className="reports-download w-full justify-center md:w-auto"
              onClick={() => downloadReport("monthly")}
              disabled={downloading === "monthly"}
            >
              <FileDown size={24} />
              <span className="sm:hidden">{downloading === "monthly" ? "..." : language === "ur" ? ui.download : "Download PDF"}</span>
              <span className="hidden sm:inline">{downloading === "monthly" ? "..." : ui.download}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="reports-loading-row" />
          ) : (
            <div className="reports-card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-500">{ui.totalSale}</span>
                  <strong className="text-base font-bold text-[#3b1d1d]">
                    PKR {formatCurrency(monthly.totalSale)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-500">{ui.totalExpenses}</span>
                  <strong className="text-base font-bold text-[#3b1d1d]">
                    PKR {formatCurrency(monthly.totalExpenses)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-500">{ui.netProfit}</span>
                  <strong
                    className={[
                      "text-base font-bold",
                      monthly.netProfit >= 0 ? "text-emerald-700" : "text-[#800000]",
                    ].join(" ")}
                  >
                    PKR {formatCurrency(monthly.netProfit)}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="reports-card">
          <div className="reports-card-head">
            <div className="reports-card-title">
              <span className="reports-card-icon" aria-hidden="true">
                <Package size={18} />
              </span>
              <div>
                <p className="dashboard-eyebrow">{ui.inventory}</p>
                <h3>{ui.inventory}</h3>
              </div>
            </div>
            <button
              type="button"
              className="reports-download w-full justify-center md:w-auto"
              onClick={() => downloadReport("inventory")}
              disabled={downloading === "inventory"}
            >
              <FileDown size={24} />
              <span className="sm:hidden">{downloading === "inventory" ? "..." : language === "ur" ? ui.download : "Download PDF"}</span>
              <span className="hidden sm:inline">{downloading === "inventory" ? "..." : ui.download}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="reports-loading-row" />
          ) : (
            <div className="reports-card-body">
              <p className="reports-muted">{ui.lowStock}</p>
              {lowStock.length ? (
                <ul className="reports-list">
                  {lowStock.slice(0, 8).map((row) => (
                    <li key={row.id}>
                      <span>{row.name}</span>
                      <strong>{row.stock}m</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reports-muted">All stock levels look healthy.</p>
              )}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

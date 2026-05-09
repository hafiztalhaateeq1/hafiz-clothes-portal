"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  Boxes,
  Package,
  Ruler,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";
import { translations } from "@/app/lib/translations";
import { fetchPendingManagementRequests } from "@/app/lib/management-requests";

const initialMetrics = {
  totalRecovery: 0,
  totalBilled: 0,
  totalPaidAll: 0,
  totalInventoryValue: 0,
  monthlyExpenses: 0,
  grossProfit: 0,
  netProfit: 0,
  monthlyMeters: 0,
  totalCustomers: 0,
  activeProducts: 0,
  totalSales: 0,
  totalMetersSold: 0,
  profitEstimate: 0,
  amountPaid: 0,
  remainingBalance: 0,
  categoryCount: 0,
};

function formatLedgerDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${date.toLocaleString("en-US", {
    month: "short",
  })}`;
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value) {
  return Number(value ?? 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  });
}

function getAmountPaid(entry) {
  const explicitPaid =
    entry.amount_paid ?? entry.total_paid ?? entry.credit ?? entry.paid_amount;

  if (explicitPaid !== undefined && explicitPaid !== null && explicitPaid !== "") {
    return toNumber(explicitPaid);
  }

  const totalPrice = toNumber(entry.total_bill ?? entry.total_price ?? entry.debit);
  const balance = toNumber(entry.balance ?? entry.remaining_balance);
  return Math.max(totalPrice - balance, 0);
}

function getBalance(entry) {
  return toNumber(entry.balance ?? entry.remaining_balance);
}

function getProfit(entry) {
  const quantity = toNumber(entry.quantity_meters);
  const retailRate = toNumber(entry.products?.price_per_meter);
  const wholesaleRate = toNumber(entry.products?.wholesale_price);
  return Math.max(retailRate - wholesaleRate, 0) * quantity;
}

function normalizeHistoryEntries(data, includeCustomer = true) {
  return (data ?? []).map((entry, index) => ({
    id: entry.id ?? `recent-${index}`,
    dateLabel: formatLedgerDate(entry.created_at),
    customerName: includeCustomer ? entry.clients?.name ?? "No Name" : "",
    productName: entry.products?.name ?? "No Item",
    quantityMeters: toNumber(entry.quantity_meters),
    totalPrice: toNumber(entry.total_bill ?? entry.total_price ?? entry.debit),
    amountPaid: getAmountPaid(entry),
    balance: getBalance(entry),
  }));
}

function formatDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function logSupabaseError(scope, error) {
  if (!error) return;
  console.error(
    scope,
    error.message,
    error.details ?? "",
    error.hint ?? "",
    error.code ?? ""
  );
}

export default function Home() {
  const { session } = useAuth();
  const { t, language, hasMounted } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [weeklyMeters, setWeeklyMeters] = useState([]);
  const [chartRange, setChartRange] = useState("7d");
  const [insight, setInsight] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingManagementRequests, setPendingManagementRequests] = useState([]);
  const [isLoadingManagementRequests, setIsLoadingManagementRequests] = useState(false);
  const [managementActionId, setManagementActionId] = useState("");
  const [managementRequestError, setManagementRequestError] = useState("");
  const chartHostRef = useRef(null);
  const [chartReady] = useState(true);

  const isAdmin = session?.role === "admin" || session?.role === "management";
  const isWholesale = session?.role === "wholesale";
  const isRetail = session?.role === "retail";
  const dashboardText = translations.en.dashboard;
  const commonText = translations.en.common;
  const activeLanguage = mounted && hasMounted ? language : "en";

  const dashboardCopy = useMemo(() => {
    const fallback = {
      totalRecovery: "Total Recovery",
      netProfit: "Net Profit",
      monthlyExpenses: "Monthly Expenses",
      monthlyMeters: "Monthly Meters",
      totalCustomers: "Total Customers",
      activeProducts: "Active Products",
      salesOverview: "Sales Overview",
      last7Days: "Last 7 days (meters)",
      recentTransactions: "Recent Transactions",
      amount: "Amount",
    };

    if (activeLanguage === "ur") {
      return {
        ...fallback,
        totalRecovery: "کل بقایا",
        netProfit: "خالص منافع",
        monthlyExpenses: "ماہانہ اخراجات",
        monthlyMeters: "ماہانہ میٹر",
        totalCustomers: "کل گاہک",
        activeProducts: "فعال مصنوعات",
        salesOverview: "فروخت کا جائزہ",
        last7Days: "گزشتہ 7 دن (میٹر)",
        recentTransactions: "حالیہ لین دین",
        amount: "رقم",
      };
    }

    if (activeLanguage === "roman") {
      return {
        ...fallback,
        totalRecovery: "Kul Baqaya",
        netProfit: "Net Munafa",
        monthlyExpenses: "Mahwari Kharchay",
        monthlyMeters: "Mahwari Meter",
        totalCustomers: "Kul Grahak",
        activeProducts: "Active Products",
        salesOverview: "Sales Overview",
        last7Days: "Last 7 din (meter)",
        recentTransactions: "Haliya Transactions",
        amount: "Raqam",
      };
    }

    return fallback;
  }, [activeLanguage]);

  const recoveredLabel = useMemo(() => {
    if (activeLanguage === "ur") return "وصولی";
    if (activeLanguage === "roman") return "Wasooli";
    return "Recovered";
  }, [activeLanguage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardMetrics() {
      setIsLoading(true);

      let nextMetrics = { ...initialMetrics };
      let nextHistory = [];
      let nextWeeklyMeters = [];
      let nextInsight = null;
      let nextLowStockProducts = [];

      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const ledgerDevLimit = process.env.NODE_ENV === "development" ? 100 : 5000;
        const rangeDays = chartRange === "30d" ? 30 : 7;

        // Simple range keys: group by created_at.slice(0, 10) (YYYY-MM-DD).
        const endDate = new Date(now);
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - (rangeDays - 1));

        const startKey = startDate.toISOString().slice(0, 10);
        const endKey = endDate.toISOString().slice(0, 10);
        const startDateIso = `${startKey}T00:00:00.000Z`;
        const endDateIso = `${endKey}T23:59:59.999Z`;

        const productsCountPromise = supabase
          .from("products")
          .select("id", { count: "exact", head: true });

        if (isAdmin) {
          const productsInventoryPromise = supabase
            .from("products")
            .select("id, name, stock_meters, purchase_price");

          const ledgerProfitPromise = supabase
            .from("ledger")
            .select("created_at, total_bill, total_price, quantity_meters, products(purchase_price)")
            .gte("created_at", startOfMonth.toISOString())
            .order("created_at", { ascending: false })
            .limit(ledgerDevLimit);

          const expensesPromise = (async () => {
            // Use created_at for expense date logic on dashboard to avoid schema mismatch.
            let result = await supabase
              .from("expenses")
              .select("amount, created_at")
              .order("created_at", { ascending: false })
              .limit(1000);

            if (result.error) {
              logSupabaseError("SUPABASE EXPENSES ERROR:", result.error);
              // If ordering column doesn't exist, retry without order.
              result = await supabase.from("expenses").select("amount, created_at").limit(1000);
              if (result.error) {
                logSupabaseError("SUPABASE EXPENSES ERROR (fallback no order):", result.error);
              }
            }

            return result;
          })();

          const [
            clientsResult,
            productsResult,
            productsInventoryResult,
            ledgerAllResult,
            ledgerRecentResult,
            ledgerRangeResult,
            ledgerMonthResult,
            ledgerProfitResult,
            expensesResult,
          ] = await Promise.all([
            supabase.from("clients").select("id", { count: "exact", head: true }),
            productsCountPromise,
            productsInventoryPromise,
            supabase
              .from("ledger")
              .select("total_bill, total_price, amount_paid")
              .order("created_at", { ascending: false })
              .limit(ledgerDevLimit),
            supabase
              .from("ledger")
              .select(
                "id, created_at, total_bill, total_price, amount_paid, balance, clients(name), products(name), quantity_meters"
              )
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .limit(5),
            supabase
              .from("ledger")
              .select("created_at, quantity_meters")
              .gte("created_at", startDateIso)
              .lte("created_at", endDateIso)
              .order("created_at", { ascending: false })
              .limit(ledgerDevLimit),
            supabase
              .from("ledger")
              .select("quantity_meters")
              .gte("created_at", startOfMonth.toISOString())
              .order("created_at", { ascending: false })
              .limit(ledgerDevLimit),
            ledgerProfitPromise,
            expensesPromise,
          ]);

          nextMetrics.totalCustomers = clientsResult.count ?? 0;
          nextMetrics.activeProducts = productsResult.count ?? 0;

          if (!productsInventoryResult.error) {
            const rows = productsInventoryResult.data ?? [];
            nextMetrics.totalInventoryValue = rows.reduce((sum, item) => {
              const stock = toNumber(item.stock_meters ?? item.stock_quantity);
              const purchasePrice = toNumber(item.purchase_price);
              return sum + stock * purchasePrice;
            }, 0);

            nextLowStockProducts = rows
              .map((item) => ({
                id: item.id,
                name: item.name ?? "Item",
                stockMeters: toNumber(item.stock_meters ?? item.stock_quantity),
              }))
              .filter((item) => item.stockMeters > 0 && item.stockMeters < 50)
              .sort((a, b) => a.stockMeters - b.stockMeters)
              .slice(0, 3);
          } else {
            // If purchase_price or stock_meters columns are missing, ignore inventory stats.
            console.warn("Dashboard inventory fetch error:", productsInventoryResult.error.message || productsInventoryResult.error);
            nextLowStockProducts = [];
          }

          if (ledgerAllResult.error) {
            logSupabaseError("SUPABASE LEDGER TOTALS ERROR:", ledgerAllResult.error);
          } else {
            const ledgerRows = ledgerAllResult.data ?? [];

            nextMetrics.totalBilled = ledgerRows.reduce((sum, entry) => {
              const total = toNumber(entry.total_bill ?? entry.total_price);
              return sum + total;
            }, 0);

            nextMetrics.totalPaidAll = ledgerRows.reduce((sum, entry) => sum + getAmountPaid(entry), 0);

            nextMetrics.totalRecovery = ledgerRows.reduce((sum, entry) => {
              const total = toNumber(entry.total_bill ?? entry.total_price);
              const paid = getAmountPaid(entry);
              return sum + Math.max(total - paid, 0);
            }, 0);
          }

          if (!ledgerMonthResult.error) {
            nextMetrics.monthlyMeters = (ledgerMonthResult.data ?? []).reduce(
              (sum, entry) => sum + toNumber(entry.quantity_meters),
              0
            );
          } else {
            logSupabaseError("SUPABASE LEDGER MONTH ERROR:", ledgerMonthResult.error);
          }

          if (!ledgerProfitResult.error) {
            const rows = ledgerProfitResult.data ?? [];
            const totalSales = rows.reduce((sum, entry) => {
              const total = toNumber(entry.total_bill ?? entry.total_price);
              return sum + total;
            }, 0);

            const totalCost = rows.reduce((sum, entry) => {
              const meters = toNumber(entry.quantity_meters);
              const purchasePrice = toNumber(entry.products?.purchase_price);
              return sum + meters * purchasePrice;
            }, 0);

            nextMetrics.grossProfit = totalSales - totalCost;
          } else {
            console.warn(
              "Dashboard profit fetch error:",
              ledgerProfitResult.error.message || ledgerProfitResult.error
            );
            nextMetrics.grossProfit = 0;
          }

          if (!expensesResult.error) {
            const month = now.getMonth();
            const year = now.getFullYear();

            const totalExpenses = (expensesResult.data ?? []).reduce((sum, entry) => {
              const dateValue = entry.created_at ?? null;
              const date = new Date(dateValue);
              if (Number.isNaN(date.getTime())) return sum;
              if (date.getMonth() !== month || date.getFullYear() !== year) return sum;
              return sum + toNumber(entry.amount);
            }, 0);

            nextMetrics.monthlyExpenses = totalExpenses;
            console.log("Total Expenses Fetched:", totalExpenses);
          } else {
            console.warn(
              "Dashboard expenses fetch error:",
              expensesResult.error.message || expensesResult.error
            );
            nextMetrics.monthlyExpenses = 0;
          }

          nextMetrics.netProfit =
            toNumber(nextMetrics.grossProfit) - toNumber(nextMetrics.monthlyExpenses);

          if (!ledgerRecentResult.error) {
            const rows = ledgerRecentResult.data ?? [];
            nextHistory = normalizeHistoryEntries(rows, true);
          }

          if (!ledgerRangeResult.error) {
            console.log("Current Date Range:", { startDate: startDateIso, endDate: endDateIso });
            console.log("Fetched Ledger:", ledgerRangeResult.data ?? []);

            const buckets = new Map();
            for (let offset = 0; offset < rangeDays; offset += 1) {
              const day = new Date(startDate);
              day.setDate(startDate.getDate() + offset);
              const key = day.toISOString().slice(0, 10);
              buckets.set(key, {
                dayKey: key,
                label: formatDayLabel(day),
                meters: 0,
              });
            }

            let currentMeters = 0;
            let previousMeters = 0;

            (ledgerRangeResult.data ?? []).forEach((row) => {
              const key = String(row.created_at ?? "").slice(0, 10);
              if (!key) return;
              const meters = Number.parseFloat(row.quantity_meters ?? 0);
              if (!Number.isFinite(meters)) return;

              if (buckets.has(key)) {
                buckets.get(key).meters += meters;
                currentMeters += meters;
              } else {
                previousMeters += meters;
              }
            });

            nextWeeklyMeters = Array.from(buckets.values());

            if (previousMeters > 0) {
              const delta = currentMeters - previousMeters;
              const pct = (delta / previousMeters) * 100;
              nextInsight = {
                pct,
                direction: pct >= 0 ? "up" : "down",
              };
            } else if (currentMeters > 0) {
              nextInsight = { pct: 100, direction: "up" };
            } else {
              nextInsight = { pct: 0, direction: "flat" };
            }
          }
          else {
            logSupabaseError("SUPABASE LEDGER RANGE ERROR:", ledgerRangeResult.error);
          }
        } else {
          const [productsResult, ledgerResult] = await Promise.all([
            productsCountPromise,
            session?.customerId
                ? supabase
                    .from("ledger")
                    .select(
                      "id, created_at, total_bill, total_price, amount_paid, balance, quantity_meters, products!inner(name, price_per_meter, wholesale_price)"
                    )
                    .eq("client_id", session.customerId)
                    .order("id", { ascending: false })
              : Promise.resolve({ data: [], error: null }),
          ]);

          nextMetrics.activeProducts = productsResult.count ?? 0;

          if (!ledgerResult.error) {
            const ledgerRows = ledgerResult.data ?? [];
            nextMetrics.totalSales = ledgerRows.reduce(
              (sum, entry) => sum + toNumber(entry.total_bill ?? entry.total_price),
              0
            );
            nextMetrics.totalMetersSold = ledgerRows.reduce(
              (sum, entry) => sum + toNumber(entry.quantity_meters),
              0
            );
            nextMetrics.amountPaid = ledgerRows.reduce(
              (sum, entry) => sum + getAmountPaid(entry),
              0
            );
            nextMetrics.remainingBalance = ledgerRows.reduce(
              (sum, entry) => sum + getBalance(entry),
              0
            );
            nextHistory = normalizeHistoryEntries(ledgerRows, false).slice(0, 5);
          }
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }

      if (!isMounted) {
        return;
      }

      setMetrics(nextMetrics);
      setRecentTransactions(nextHistory);
      setWeeklyMeters(nextWeeklyMeters);
      setInsight(nextInsight);
      setLowStockProducts(nextLowStockProducts);
      setIsLoading(false);
    }

    fetchDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, session?.customerId, chartRange]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let isCurrent = true;

    async function loadPendingManagementRequests() {
      setIsLoadingManagementRequests(true);
      setManagementRequestError("");

      const authResult = await supabase.auth.getUser();
      if (authResult.error) {
        console.error("Fetch error:", authResult.error);
      }
      if (!authResult.data?.user && session?.role === "admin") {
        console.warn(
          "Pending management request fetch is running without a Supabase-authenticated user. If RLS blocks SELECT on clients/profiles/users, add an admin SELECT policy or query through a server route with elevated credentials."
        );
      }

      const result = await fetchPendingManagementRequests();

      if (result.error) {
        console.error("Fetch error:", result.error);
        if (isCurrent) {
          setPendingManagementRequests([]);
          setManagementRequestError("Unable to load management requests right now.");
          setIsLoadingManagementRequests(false);
        }
        return;
      }

      if (isCurrent) {
        setPendingManagementRequests(result.data ?? []);
        setIsLoadingManagementRequests(false);
      }
    }

    loadPendingManagementRequests();

    const channel = supabase
      .channel("management-requests-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          loadPendingManagementRequests();
        }
      )
      .subscribe();

    return () => {
      isCurrent = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, session?.role]);

  async function handleManagementRequestAction(clientId, nextStatus) {
    const normalizedClientId = String(clientId ?? "").trim();
    if (!normalizedClientId) {
      return;
    }

    setManagementActionId(normalizedClientId);
    setManagementRequestError("");

    const updates =
      nextStatus === "active"
        ? { status: "active", is_approved: true }
        : { status: "rejected", is_approved: false };

    let result = await supabase
      .from("clients")
      .update(updates)
      .eq("id", normalizedClientId);

    if (result.error && /is_approved/i.test(String(result.error.message ?? ""))) {
      result = await supabase
        .from("clients")
        .update({ status: updates.status })
        .eq("id", normalizedClientId);
    }

    if (result.error) {
      console.error("Management request action error:", result.error);
      setManagementRequestError("Unable to update this management request right now.");
      setManagementActionId("");
      return;
    }

    setPendingManagementRequests((currentRequests) =>
      currentRequests.filter((request) => String(request.id ?? "") !== normalizedClientId)
    );
    setManagementActionId("");
  }

  const dashboardCards = useMemo(() => {
    if (isAdmin) {
      const billed = toNumber(metrics.totalBilled);
      const paid = toNumber(metrics.totalPaidAll);
      const recoveredPct = billed > 0 ? Math.min((paid / billed) * 100, 100) : 0;

      return [
        {
          title: dashboardCopy.netProfit,
          icon: TrendingUp,
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.netProfit),
          detail: "Net profit after deducting monthly expenses.",
          className:
            toNumber(metrics.netProfit) >= 0 ? "smart-card-profit is-positive" : "smart-card-profit is-negative",
        },
        {
          title: dashboardCopy.monthlyExpenses,
          icon: TrendingDown,
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.monthlyExpenses),
          detail: "Sum of expense entries recorded this month.",
        },
        {
          title: dashboardCopy.totalRecovery,
          icon: Banknote,
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.totalRecovery),
          detail: dashboardCopy.totalRecovery,
          progress:
            isLoading || billed <= 0
              ? null
              : {
                  pct: recoveredPct,
                  label: `${Math.round(recoveredPct)}% ${recoveredLabel}`,
                },
        },
        {
          title: dashboardCopy.monthlyMeters,
          icon: Ruler,
          prefix: null,
          value: isLoading ? "---" : formatCount(metrics.monthlyMeters),
          detail: dashboardCopy.monthlyMeters,
        },
        {
          title: dashboardCopy.totalCustomers,
          icon: Users,
          prefix: null,
          value: isLoading ? "---" : formatCount(metrics.totalCustomers),
          detail: dashboardCopy.totalCustomers,
        },
        {
          title: dashboardCopy.activeProducts,
          icon: Package,
          prefix: null,
          value: isLoading ? "---" : formatCount(metrics.activeProducts),
          detail: dashboardCopy.activeProducts,
        },
        {
          title: "Total Inventory Value",
          icon: Boxes,
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.totalInventoryValue),
          detail: "Total investment across current stock quantity.",
        },
      ];
    }

    if (isWholesale) {
      return [
        {
          title: "Total Purchased",
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.totalSales),
          detail: "Your full billing history across saved Mera Hisab entries.",
        },
        {
          title: "Amount Paid",
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.amountPaid),
          detail: "Payments already adjusted against your total purchases.",
        },
        {
          title: "Remaining Balance",
          prefix: "PKR",
          value: isLoading ? "---" : formatCurrency(metrics.remainingBalance),
          detail: "Your current outstanding balance for follow-up and settlement.",
        },
        {
          title: "Items Available",
          prefix: null,
          value: isLoading ? "---" : formatCount(metrics.activeProducts),
          detail: "Products available in the live wholesale catalogue.",
        },
      ];
    }

    return [
      {
        title: "Welcome Offers",
        prefix: null,
        value: "New",
        detail: "Explore the latest retail stock and featured fabrics from the shop.",
      },
      {
        title: "Items Available",
        prefix: null,
        value: isLoading ? "---" : formatCount(metrics.activeProducts),
        detail: "Current items visible in the retail catalogue.",
      },
      {
        title: "Active Categories",
        prefix: null,
        value: isLoading ? "---" : formatCount(metrics.categoryCount),
        detail: "A quick look at the variety currently available in the shop.",
      },
      {
        title: "Your Balance",
        prefix: "PKR",
        value: isLoading ? "---" : formatCurrency(metrics.remainingBalance),
        detail: session?.customerId
          ? "Your current khata balance based on saved entries."
          : "Sign in with a saved customer account to see your own khata balance.",
      },
    ];
  }, [
    isAdmin,
    isLoading,
    isWholesale,
    metrics.amountPaid,
    metrics.categoryCount,
    metrics.activeProducts,
    metrics.monthlyExpenses,
    metrics.netProfit,
    metrics.remainingBalance,
    metrics.totalBilled,
    metrics.totalCustomers,
    metrics.totalInventoryValue,
    metrics.totalPaidAll,
    metrics.totalRecovery,
    metrics.monthlyMeters,
    metrics.totalSales,
    session?.customerId,
    dashboardCopy,
    recoveredLabel,
  ]);

  const heroCopy = isAdmin
    ? {
        eyebrow: t.dashboard?.eyebrow ?? dashboardText.eyebrow,
        heading: t.dashboard?.greeting ?? dashboardText.greeting,
        summary: t.dashboard?.summary ?? dashboardText.summary,
        focusLabel: t.dashboard?.focusLabel ?? dashboardText.focusLabel,
        focusText: t.dashboard?.focusText ?? dashboardText.focusText,
      }
    : isWholesale
      ? {
          eyebrow: "Wholesale Dashboard",
          heading: `Welcome back, ${session?.displayName ?? "Customer"}`,
          summary:
            "Review your purchase summary, outstanding balance, and the latest credit activity from your wholesale account.",
          focusLabel: "Account Focus",
          focusText:
            "Check your wholesale rates, track your balance, and review your latest khata entries.",
        }
      : {
          eyebrow: "Retail Dashboard",
          heading: `Welcome, ${session?.displayName ?? "Customer"}`,
          summary:
            "Browse shop highlights, retail prices, and your own account history from one clean customer dashboard.",
          focusLabel: "Shop Focus",
          focusText:
            "Explore the catalogue, review your history, and stay updated with the latest shop activity.",
        };

  const activityTitle = isAdmin
    ? t.dashboard?.lastFiveTransactions ?? dashboardText.lastFiveTransactions
    : "Your Khata History";

  if (!mounted) {
    return <div className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">{heroCopy.eyebrow}</p>
          <h2>
            {isAdmin ? (
              <>
                Welcome back,{" "}
                <span className="dashboard-hero-name">
                  {session?.displayName ?? "Hafiz Talha"}
                </span>
              </>
            ) : (
              heroCopy.heading
            )}
          </h2>
          <p className="dashboard-copy">{heroCopy.summary}</p>
        </div>

        <div className="dashboard-hero-actions">
          <div className="dashboard-highlight">
            <span className="dashboard-highlight-label">{heroCopy.focusLabel}</span>
            <strong>{heroCopy.focusText}</strong>
          </div>
          {isAdmin ? (
            <Link href="/ledger" className="dashboard-quick-action">
              + New Entry
            </Link>
          ) : null}
        </div>
      </div>

      <div className="dashboard-grid">
        {dashboardCards.map((card) => (
          <article
            key={card.title}
            className={`smart-card smart-card-elite ${card.className ?? ""}`}
          >
            <div className="smart-card-top">
              <div className="smart-card-label">
                <span className="smart-card-icon" aria-hidden="true">
                  {card.icon ? <card.icon size={18} /> : null}
                </span>
                <p>{card.title}</p>
              </div>
            </div>
            <h3 className={isLoading ? "smart-card-value is-loading" : "smart-card-value"}>
              {card.prefix ? <span className="smart-card-prefix">{card.prefix}</span> : null}
              {card.value}
            </h3>
            {card.progress ? (
              <div className="dashboard-recovery">
                <div className="dashboard-recovery-bar" aria-hidden="true">
                  <span
                    className="dashboard-recovery-fill"
                    style={{ width: `${Math.max(0, Math.min(card.progress.pct, 100))}%` }}
                  />
                </div>
                <span className="dashboard-recovery-label">{card.progress.label}</span>
              </div>
            ) : null}
            <p className="smart-card-detail">{card.detail}</p>
          </article>
        ))}
      </div>

      {isAdmin ? (
        <section className="dashboard-activity-card dashboard-chart-card">
          <div className="dashboard-activity-head">
            <div>
              <p className="dashboard-eyebrow">{dashboardCopy.salesOverview}</p>
              <h3>{chartRange === "30d" ? "Last 30 days (meters)" : dashboardCopy.last7Days}</h3>
            </div>
            <div className="dashboard-timeframe" role="tablist" aria-label="Sales timeframe">
              <button
                type="button"
                role="tab"
                aria-selected={chartRange === "7d"}
                className={chartRange === "7d" ? "is-active" : undefined}
                onClick={() => setChartRange("7d")}
              >
                7 Days
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartRange === "30d"}
                className={chartRange === "30d" ? "is-active" : undefined}
                onClick={() => setChartRange("30d")}
              >
                30 Days
              </button>
            </div>
          </div>

          <div
            ref={chartHostRef}
            className="dashboard-chart w-full h-[350px]"
            style={{ height: "350px", width: "100%" }}
          >
            {chartReady && weeklyMeters.some((point) => Number(point.meters || 0) > 0) ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                <AreaChart data={weeklyMeters}>
                  <defs>
                    <linearGradient id="metersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#800000" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#800000" stopOpacity={0.02} />
                    </linearGradient>
                    <filter id="metersGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="6"
                        floodColor="#800000"
                        floodOpacity="0.25"
                      />
                      <feDropShadow
                        dx="0"
                        dy="8"
                        stdDeviation="10"
                        floodColor="#5b0303"
                        floodOpacity="0.18"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid stroke="rgba(128,0,0,0.08)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#6b4b4b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b4b4b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(128,0,0,0.12)",
                      background: "rgba(255,252,248,0.95)",
                    }}
                    labelStyle={{ color: "#800000", fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="meters"
                    stroke="#800000"
                    strokeWidth={3}
                    fill="url(#metersFill)"
                    filter="url(#metersGlow)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/40 px-6 text-center text-sm font-semibold text-[#4b0000]/70">
                No data available
              </div>
            )}
          </div>

          {lowStockProducts.length ? (
            <div className="dashboard-low-stock">
              <div className="dashboard-low-stock-head">
                <p className="dashboard-eyebrow">Low Stock</p>
                <span className="dashboard-activity-pill">Re-order</span>
              </div>
              <ul>
                {lowStockProducts.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <strong>{formatCount(item.stockMeters)} m</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {isAdmin ? (
        <div className="dashboard-insights">
          <span className="dashboard-insight-badge">
            <ArrowUpRight size={14} aria-hidden="true" />
            {insight?.direction === "up"
              ? `Retail is up ${Math.abs(insight.pct).toFixed(0)}% this ${chartRange === "30d" ? "month" : "week"}`
              : insight?.direction === "down"
                ? `Retail is down ${Math.abs(insight.pct).toFixed(0)}% this ${chartRange === "30d" ? "month" : "week"}`
                : "Retail sales are steady this week"}
          </span>
        </div>
      ) : null}

      {isAdmin ? (
        <section className="dashboard-activity-card dashboard-management-card">
          <div className="dashboard-activity-head">
            <div>
              <p className="dashboard-eyebrow">Management Requests</p>
              <h3>Pending Approvals</h3>
            </div>
            <span className="dashboard-activity-pill dashboard-activity-pill-alert">
              {pendingManagementRequests.length} Pending
            </span>
          </div>

          {managementRequestError ? (
            <p className="dashboard-management-feedback">{managementRequestError}</p>
          ) : null}

          <div className="dashboard-management-list">
            {isLoadingManagementRequests ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`management-request-loading-${index}`} className="dashboard-management-row">
                  <div className="dashboard-management-loading" />
                </div>
              ))
            ) : pendingManagementRequests.length > 0 ? (
              pendingManagementRequests.map((request) => {
                const requestId = String(request.id ?? "");
                const isActing = managementActionId === requestId;

                return (
                  <article key={requestId} className="dashboard-management-row">
                    <div className="dashboard-management-copy">
                      <strong>{request.name ?? "Management User"}</strong>
                      <span>@{request.username ?? "username"}</span>
                      <span>{request.email ?? "No email"}</span>
                      <span>{request.phone ?? "No phone"}</span>
                    </div>
                    <div className="dashboard-management-actions">
                      <button
                        type="button"
                        className="dashboard-management-approve"
                        onClick={() => handleManagementRequestAction(requestId, "active")}
                        disabled={isActing}
                      >
                        {isActing ? "Updating..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-management-reject"
                        onClick={() => handleManagementRequestAction(requestId, "rejected")}
                        disabled={isActing}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="dashboard-management-empty">
                No pending management requests right now.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="dashboard-activity-card">
        <div className="dashboard-activity-head">
          <div>
            <p className="dashboard-eyebrow">
              {isAdmin
                ? dashboardCopy.recentTransactions
                : "Your History"}
            </p>
            <h3>{activityTitle}</h3>
          </div>
          <span className="dashboard-activity-pill">
            {recentTransactions.length} {t.common.recent}
          </span>
        </div>

        <div className="dashboard-activity-wrap">
          <table className="dashboard-activity-table">
            <colgroup>
              <col className="dashboard-activity-col-date" />
              {isAdmin ? <col className="dashboard-activity-col-customer" /> : null}
              <col className="dashboard-activity-col-product" />
              {!isAdmin ? <col className="dashboard-activity-col-meters" /> : null}
              <col className="dashboard-activity-col-total" />
              {!isAdmin ? <col className="dashboard-activity-col-total" /> : null}
              {!isAdmin ? <col className="dashboard-activity-col-total" /> : null}
            </colgroup>
            <thead>
              <tr>
                <th>{t.dashboard?.date ?? dashboardText.date}</th>
                {isAdmin ? <th>{t.dashboard?.customer ?? dashboardText.customer}</th> : null}
                <th>{t.dashboard?.product ?? dashboardText.product}</th>
                {!isAdmin ? <th>{t.common?.meters ?? commonText.meters}</th> : null}
                <th>{isAdmin ? dashboardCopy.amount : t.dashboard?.totalBill ?? dashboardText.totalBill}</th>
                {!isAdmin ? <th>{t.common?.amountPaid ?? commonText.amountPaid}</th> : null}
                {!isAdmin ? <th>{t.common?.balance ?? commonText.balance}</th> : null}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`activity-loading-${index}`}>
                    <td colSpan={isAdmin ? "4" : "6"}>
                      <div className="dashboard-activity-loading-row" />
                    </td>
                  </tr>
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((entry) => (
                  <tr key={entry.id} className="dashboard-activity-row">
                    <td data-label={t.dashboard?.date ?? dashboardText.date}>{entry.dateLabel}</td>
                    {isAdmin ? (
                      <td data-label={t.dashboard?.customer ?? dashboardText.customer}>
                        <div className="dashboard-customer-cell">
                          <span className="dashboard-customer-avatar" aria-hidden="true">
                            {String(entry.customerName ?? "?")
                              .trim()
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <span>{entry.customerName}</span>
                        </div>
                      </td>
                    ) : null}
                    <td data-label={t.dashboard?.product ?? dashboardText.product}>
                      {entry.productName}
                    </td>
                    {!isAdmin ? (
                      <td data-label={t.common?.meters ?? commonText.meters}>
                        {formatCount(entry.quantityMeters)}
                      </td>
                    ) : null}
                    <td
                      data-label={isAdmin ? dashboardCopy.amount : t.dashboard?.totalBill ?? dashboardText.totalBill}
                      className={
                        isAdmin
                          ? `dashboard-amount-cell ${
                              entry.balance > 0
                                ? "is-pending"
                                : entry.amountPaid > 0
                                  ? "is-cleared"
                                  : entry.totalPrice >= 10000
                                    ? "is-large"
                                    : ""
                            }`
                          : undefined
                      }
                    >
                      PKR {formatCurrency(entry.totalPrice)}
                    </td>
                    {!isAdmin ? (
                      <td data-label={t.common?.amountPaid ?? commonText.amountPaid}>
                        PKR {formatCurrency(entry.amountPaid)}
                      </td>
                    ) : null}
                    {!isAdmin ? (
                      <td data-label={t.common?.balance ?? commonText.balance}>
                        PKR {formatCurrency(entry.balance)}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? "4" : "6"} className="dashboard-activity-empty">
                    {session?.customerId || isAdmin
                      ? t.dashboard.noRecentActivity
                      : "Sign in with your saved customer account to view your personal khata history."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

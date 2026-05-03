"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { translations } from "@/app/lib/translations";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHOP_DETAILS = {
  en: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  ur: {
    name: "حافظ کلاتھ ہاؤس",
    proprietor: "حافظ زین العابدین",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  roman: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
};

let receiptLogoDataUrlPromise;
let urduFontBinaryPromise;
let urduFontBase64Promise;
let urduFontFacePromise;

const PDF_SHOP_DETAILS = {
  en: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  ur: {
    name: "حافظ کلاتھ ہاؤس",
    proprietor: "حافظ زین العابدین",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  roman: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
};

const PDF_RECEIPT_COPY = {
  en: {
    title: "HAFIZ CLOTHES HOUSE",
    subtitle: "Invoice / Receipt",
    proprietor: "Proprietor",
    contact: "Contact",
    transactionDate: "Date",
    customerName: "Customer Name",
    productName: "Product",
    meters: "Meters",
    totalBill: "Total Bill",
    amountPaid: "Amount Paid",
    remainingBalance: "Balance",
    addressStamp: "Address",
    thankYou: "Thank you for shopping with Hafiz Clothes House!",
  },
  ur: {
    title: "حافظ کلاتھ ہاؤس",
    subtitle: "بل / رسید",
    proprietor: "مالک",
    contact: "رابطہ",
    transactionDate: "تاریخ",
    customerName: "نام گاہک",
    productName: "پروڈکٹ",
    meters: "میٹر",
    totalBill: "کل بل",
    amountPaid: "ادا شدہ رقم",
    remainingBalance: "بقایا جات",
    addressStamp: "پتہ",
    thankYou: "حافظ کلاتھ ہاؤس سے خریداری کا شکریہ!",
  },
  roman: {
    title: "HAFIZ CLOTHES HOUSE",
    subtitle: "Bill / Receipt",
    proprietor: "Maalik",
    contact: "Rabita",
    transactionDate: "Tareekh",
    customerName: "Grahak ka Naam",
    productName: "Product",
    meters: "Meter",
    totalBill: "Kul Bill",
    amountPaid: "Ada Shuda Raqam",
    remainingBalance: "Baqaya",
    addressStamp: "Pata",
    thankYou: "Hafiz Clothes House se kharidari ka shukriya!",
  },
};

const PDF_SHOP_DETAILS_CLEAN = {
  en: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  ur: {
    name: "حافظ کلاتھ ہاؤس",
    proprietor: "حافظ زین العابدین",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
  roman: {
    name: "Hafiz Clothes House",
    proprietor: "Hafiz Zain-ul-Abideen",
    contact: "0323-7869400",
    address:
      "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  },
};

const PDF_RECEIPT_COPY_CLEAN = {
  en: {
    title: "HAFIZ CLOTHES HOUSE",
    subtitle: "Invoice / Receipt",
    proprietor: "Proprietor",
    contact: "Contact",
    transactionDate: "Date",
    customerName: "Customer Name",
    productName: "Product",
    meters: "Meters",
    totalBill: "Total Bill",
    amountPaid: "Amount Paid",
    remainingBalance: "Balance",
    addressStamp: "Address",
    thankYou: "Thank you for shopping with Hafiz Clothes House!",
  },
  ur: {
    title: "حافظ کلاتھ ہاؤس",
    subtitle: "بل / رسید",
    proprietor: "مالک",
    contact: "رابطہ",
    transactionDate: "تاریخ",
    customerName: "نام گاہک",
    productName: "پروڈکٹ",
    meters: "میٹر",
    totalBill: "کل بل",
    amountPaid: "ادا شدہ رقم",
    remainingBalance: "بقایا جات",
    addressStamp: "پتہ",
    thankYou: "حافظ کلاتھ ہاؤس سے خریداری کا شکریہ!",
  },
  roman: {
    title: "HAFIZ CLOTHES HOUSE",
    subtitle: "Bill / Receipt",
    proprietor: "Maalik",
    contact: "Rabita",
    transactionDate: "Tareekh",
    customerName: "Grahak ka Naam",
    productName: "Product",
    meters: "Meter",
    totalBill: "Kul Bill",
    amountPaid: "Ada Shuda Raqam",
    remainingBalance: "Baqaya",
    addressStamp: "Pata",
    thankYou: "Hafiz Clothes House se kharidari ka shukriya!",
  },
};

function formatCurrency(value) {
  return toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/[^0-9.-]/g, "");
    const number = Number(normalizedValue);
    return Number.isFinite(number) ? number : 0;
  }

  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatMeters(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function normalizeFilterValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function inferClientCategory(client) {
  const rawType = String(
    client?.trust_level ?? client?.customer_type ?? client?.account_type ?? client?.role ?? ""
  ).toLowerCase();

  if (rawType.includes("regular") || rawType.includes("whole")) {
    return "regular";
  }

  return "retail";
}

function formatLedgerDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/,/g, "");
}

function getTodayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeLedgerEntries(data) {
  return (data ?? []).map((entry, index) => {
    const totalBillValue = toNumber(entry.total_bill);
    const totalPriceFallback = toNumber(entry.total_price);
    const resolvedTotal = totalBillValue || totalPriceFallback || 0;
    const resolvedAmountPaid =
      entry.amount_paid ?? entry.total_paid ?? entry.credit ?? entry.paid_amount;
    const resolvedBalance = entry.balance ?? entry.remaining_balance;
    const resolvedBalanceNumber = toNumber(resolvedBalance);

    const productId = String(entry.product_id ?? entry.products?.id ?? entry.products?.[0]?.id ?? "");

    const productName =
      entry.products?.name ??
      entry.products?.[0]?.name ??
      entry.description ??
      (productId ? "No Item" : "Wasooli / Recovery");

    return {
      id: entry.id ?? `ledger-${index}`,
      clientId: String(entry.client_id ?? ""),
      productId,
      dateLabel: formatLedgerDate(entry.created_at),
      createdAt: entry.created_at ?? null,
      clientName:
        entry.clients?.name ??
        entry.clients?.[0]?.name ??
        entry.customer ??
        "No Name",
      clientPhone: entry.clients?.phone ?? entry.clients?.[0]?.phone ?? entry.phone ?? "",
      productName,
      quantityMeters: toNumber(entry.quantity_meters ?? entry.meters),
      totalPrice: resolvedTotal,
      amountPaid:
        resolvedAmountPaid !== undefined && resolvedAmountPaid !== null && resolvedAmountPaid !== ""
          ? toNumber(resolvedAmountPaid)
          : resolvedTotal === 0 && resolvedBalanceNumber < 0
            ? Math.abs(resolvedBalanceNumber)
            : Math.max(resolvedTotal - resolvedBalanceNumber, 0),
      balance:
        resolvedBalance !== undefined && resolvedBalance !== null && resolvedBalance !== ""
          ? resolvedBalanceNumber
          : Math.max(resolvedTotal - toNumber(resolvedAmountPaid), 0),
    };
  });
}

function getReceiptLogoDataUrl() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!receiptLogoDataUrlPromise) {
    receiptLogoDataUrlPromise = fetch("/hch-logo.svg")
      .then((response) => response.text())
      .then((svgMarkup) => {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
      })
      .catch((error) => {
        console.error("Receipt logo load error:", error);
        return null;
      });
  }

  return receiptLogoDataUrlPromise;
}

async function toJsPdfImageDataUrl(sourceDataUrl) {
  if (!sourceDataUrl || typeof sourceDataUrl !== "string") {
    return null;
  }

  if (!sourceDataUrl.startsWith("data:image")) {
    return null;
  }

  const mimeMatch = sourceDataUrl.match(/^data:(image\/[^;]+);/i);
  const mime = mimeMatch?.[1]?.toLowerCase() ?? "";

  // jsPDF can't reliably add SVG data URLs directly as PNG/JPEG.
  // Convert SVG -> PNG via canvas.
  if (mime === "image/svg+xml") {
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = sourceDataUrl;
      await image.decode();

      const targetSize = 256;
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(image, 0, 0, targetSize, targetSize);
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Receipt logo rasterize error:", error);
      return null;
    }
  }

  return sourceDataUrl;
}

function detectJsPdfImageFormat(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return "PNG";
  const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);/i);
  const mime = mimeMatch?.[1]?.toLowerCase() ?? "";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPEG";
  if (mime.includes("png")) return "PNG";
  return "PNG";
}

function getUrduFontBinaryString() {
  if (typeof window === "undefined") {
    return Promise.resolve("");
  }

  if (!urduFontBinaryPromise) {
    urduFontBinaryPromise = fetch("/fonts/NotoNaskhArabic-Regular.ttf")
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = "";

        for (let index = 0; index < bytes.length; index += chunkSize) {
          const chunk = bytes.subarray(index, index + chunkSize);
          binary += String.fromCharCode(...chunk);
        }

        return binary;
      })
      .catch((error) => {
        console.error("Urdu font load error:", error);
        return "";
      });
  }

  return urduFontBinaryPromise;
}

function getUrduFontBase64() {
  if (typeof window === "undefined") {
    return Promise.resolve("");
  }

  if (!urduFontBase64Promise) {
    urduFontBase64Promise = fetch("/fonts/NotoNaskhArabic-Regular.ttf")
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;

        for (let index = 0; index < bytes.length; index += chunkSize) {
          const chunk = bytes.subarray(index, index + chunkSize);
          binary += String.fromCharCode(...chunk);
        }

        return window.btoa(binary);
      })
      .catch((error) => {
        console.error("Urdu font base64 load error:", error);
        return "";
      });
  }

  return urduFontBase64Promise;
}

function ensureUrduCanvasFont() {
  if (typeof window === "undefined" || typeof FontFace === "undefined") {
    return Promise.resolve();
  }

  if (!urduFontFacePromise) {
    urduFontFacePromise = (async () => {
      const fontFace = new FontFace(
        "ReceiptUrdu",
        'url("/fonts/NotoNaskhArabic-Regular.ttf") format("truetype")'
      );
      await fontFace.load();
      document.fonts.add(fontFace);
      await document.fonts.load('24px "ReceiptUrdu"');
    })().catch((error) => {
      console.error("Urdu canvas font error:", error);
    });
  }

  return urduFontFacePromise;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = source;
  });
}

function getPdfShopDetails(language) {
  return PDF_SHOP_DETAILS_CLEAN[language] ?? PDF_SHOP_DETAILS_CLEAN.en;
}

function getPdfReceiptCopy(language) {
  return PDF_RECEIPT_COPY_CLEAN[language] ?? PDF_RECEIPT_COPY_CLEAN.en;
}

function drawTableCell(context, x, y, width, height, text, options = {}) {
  const {
    fill = "#ffffff",
    color = "#351212",
    bold = false,
    align = "left",
    rtl = false,
  } = options;

  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = "#e3d8d8";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.fillStyle = color;
  context.direction = rtl ? "rtl" : "ltr";
  context.textAlign = align;
  context.textBaseline = "middle";
  context.font = bold
    ? rtl
      ? '28px "ReceiptUrdu"'
      : 'bold 26px "Poppins", sans-serif'
    : rtl
      ? '25px "ReceiptUrdu"'
      : '24px "Poppins", sans-serif';

  const padding = 22;
  const textX = align === "right" ? x + width - padding : x + padding;
  context.fillText(text, textX, y + height / 2);
}

export default function LedgerPage() {
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [selectedCustomerFilterId, setSelectedCustomerFilterId] = useState("");
  const [selectedFilterProductId, setSelectedFilterProductId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [transactionDate, setTransactionDate] = useState(getTodayInputDate());
  const [meters, setMeters] = useState("");
  const [pricePerMeterInput, setPricePerMeterInput] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [receiptEntry, setReceiptEntry] = useState(null);
  const [toast, setToast] = useState(null);
  const [metersStockError, setMetersStockError] = useState(false);
  const [availableStockMeters, setAvailableStockMeters] = useState(null);
  const [generatingReceiptId, setGeneratingReceiptId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [requestedClient, setRequestedClient] = useState("");
  const isAdmin = session?.role === "admin";
  const showAdminColumns = mounted && isAdmin;
  const activeLanguage = mounted ? language : "en";
  const activeTranslations = translations[activeLanguage] ?? translations.en;
  const ledgerCopy = activeTranslations.ledger ?? translations.en.ledger;
  const invoiceCopy = getPdfReceiptCopy(activeLanguage);
  const shopDetails = getPdfShopDetails(activeLanguage);

  function showToast(message, variant = "error") {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToast({ id, message, variant });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === selectedProductId),
    [products, selectedProductId]
  );

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === selectedCustomerId),
    [clients, selectedCustomerId]
  );

  const selectedClientCategory = useMemo(() => {
    if (selectedClient) {
      return inferClientCategory(selectedClient);
    }

    return session?.role === "wholesale" ? "regular" : "retail";
  }, [selectedClient, session?.role]);

  const defaultPricePerMeter = useMemo(() => {
    if (!selectedProduct) {
      return 0;
    }

    const wholesaleRate = toNumber(selectedProduct.wholesale_price);
    const retailRate = toNumber(selectedProduct.price_per_meter);

    if (selectedClientCategory === "regular" && wholesaleRate > 0) {
      return wholesaleRate;
    }

    return retailRate;
  }, [selectedClientCategory, selectedProduct]);

  const computedPricePerMeter = useMemo(() => {
    if (selectedClientCategory !== "regular") {
      return defaultPricePerMeter;
    }

    const overrideRate = Number(pricePerMeterInput || 0);

    if (!Number.isFinite(overrideRate) || overrideRate <= 0) {
      return defaultPricePerMeter;
    }

    return overrideRate;
  }, [defaultPricePerMeter, pricePerMeterInput, selectedClientCategory]);

  const computedTotalPrice = useMemo(() => {
    const quantity = Number(meters || 0);
    const pricePerMeter = Number(computedPricePerMeter || 0);

    if (!Number.isFinite(quantity) || !Number.isFinite(pricePerMeter)) {
      return 0;
    }

    return quantity * pricePerMeter;
  }, [computedPricePerMeter, meters]);

  const pricingIndicator = useMemo(
    () =>
      selectedClientCategory === "regular"
        ? ledgerCopy.wholesaleApplied ?? "Wholesale rate applied"
        : ledgerCopy.retailApplied ?? "Retail rate applied",
    [ledgerCopy.retailApplied, ledgerCopy.wholesaleApplied, selectedClientCategory]
  );

  const computedAmountPaid = useMemo(() => {
    const paidValue = Number(amountPaid || 0);

    if (!Number.isFinite(paidValue) || paidValue < 0) {
      return 0;
    }

    return paidValue;
  }, [amountPaid]);

  const isRecoveryMode = useMemo(() => {
    return (
      computedTotalPrice === 0 &&
      computedAmountPaid > 0 &&
      (!selectedProductId || !meters.trim() || Number(meters || 0) <= 0)
    );
  }, [computedAmountPaid, computedTotalPrice, meters, selectedProductId]);

  const computedBalance = useMemo(() => {
    if (isRecoveryMode) {
      // A pure recovery should reduce the outstanding amount.
      return -computedAmountPaid;
    }

    return Math.max(computedTotalPrice - computedAmountPaid, 0);
  }, [computedAmountPaid, computedTotalPrice, isRecoveryMode]);

  const filteredTransactions = useMemo(() => {
    const query = normalizeFilterValue(searchCustomer);
    const selectedProductFilter = normalizeFilterValue(selectedFilterProductId);
    const customerIdFilter = String(selectedCustomerFilterId || "").trim();

    return transactions.filter((entry) => {
      const matchesCustomerId = customerIdFilter
        ? String(entry.clientId || "").trim() === customerIdFilter
        : true;
      const matchesCustomer = query
        ? normalizeFilterValue(entry.clientName).includes(query)
        : true;
      const matchesProduct =
        !selectedProductFilter ||
        normalizeFilterValue(entry.productName) === selectedProductFilter;

      return matchesCustomerId && matchesCustomer && matchesProduct;
    });
  }, [searchCustomer, selectedCustomerFilterId, selectedFilterProductId, transactions]);

  const netChangeLabel = useMemo(
    () => ledgerCopy.netChange ?? ledgerCopy.billBalance ?? ledgerCopy.balance ?? "Net Change",
    [ledgerCopy.balance, ledgerCopy.billBalance, ledgerCopy.netChange]
  );

  const runningTransactions = useMemo(() => {
    // Sort first (oldest -> newest) so cumulative math is correct.
    const sortedAsc = [...filteredTransactions].sort((first, second) => {
      const firstTime = new Date(first.createdAt ?? 0).getTime();
      const secondTime = new Date(second.createdAt ?? 0).getTime();

      if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
        return String(first.id).localeCompare(String(second.id));
      }

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }

      return String(first.id).localeCompare(String(second.id));
    });

    // Global tracker: runningBalance = runningBalance + (total_bill - amount_paid)
    let currentRunningBalance = 0;
    const withRunning = sortedAsc.map((row) => {
      currentRunningBalance =
        currentRunningBalance + (toNumber(row.totalPrice) - toNumber(row.amountPaid));

      return {
        ...row,
        runningBalance: currentRunningBalance,
      };
    });

    // Show latest entries first (but only after the running balance is computed).
    return withRunning.reverse();
  }, [filteredTransactions]);

  function buildReminderMessage(entry) {
    const name = entry.clientName || "Customer";
    const balanceValue = formatCurrency(entry.balance);

    if (activeLanguage === "ur") {
      return `محترم ${name} صاحب، حافظ کلاتھ ہاؤس پر آپ کا بقایا ${balanceValue} روپے ہے۔ براہ کرم جلد جمع کروا دیں۔`;
    }

    if (activeLanguage === "roman") {
      return `Mohtaram ${name}, Hafiz Clothes House par aap ka baqaya PKR ${balanceValue} hai. Bara-e-karam jald ada kar dein.`;
    }

    return `Dear ${name}, your pending balance at Hafiz Clothes House is PKR ${balanceValue}. Kindly clear it soon.`;
  }

  function buildReceiptMessage(entry) {
    const name = entry.clientName || "Customer";
    const paidValue = formatCurrency(entry.amountPaid);
    const balanceValue = formatCurrency(entry.balance);

    if (activeLanguage === "ur") {
      return `ادائیگی کا شکریہ۔ آپ کے ${paidValue} روپے موصول ہو گئے ہیں۔ آپ کا بقیہ بقایا ${balanceValue} روپے ہے۔`;
    }

    if (activeLanguage === "roman") {
      return `Shukriya ${name}, aap ki PKR ${paidValue} ki payment receive ho gai hai. Aap ka baqi baqaya PKR ${balanceValue} hai.`;
    }

    return `Thank you ${name} for your payment of PKR ${paidValue}. Your remaining balance is PKR ${balanceValue}.`;
  }

  function openWhatsAppMessage(phoneValue, message) {
    const phone = String(phoneValue ?? "").replace(/[^\d]/g, "");

    if (!phone || !message) {
      return;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleWhatsAppReminder(entry) {
    if (toNumber(entry.balance) <= 0) {
      return;
    }

    openWhatsAppMessage(entry.clientPhone ?? session?.phone ?? "", buildReminderMessage(entry));
  }

  function handleJumpToKhata() {
    const id = String(selectedCustomerFilterId || "").trim();

    if (!id) {
      return;
    }

    router.push(`/customers/${id}`);
  }

  function handleSendReceipt() {
    if (!receiptEntry) {
      return;
    }

    openWhatsAppMessage(receiptEntry.clientPhone, buildReceiptMessage(receiptEntry));
  }

  async function handleDownloadReceipt(entry) {
    setGeneratingReceiptId(String(entry.id));
    setFormError("");

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;
      const pricePerMeter =
        toNumber(entry.quantityMeters) > 0 ? entry.totalPrice / entry.quantityMeters : 0;
      const logoDataUrl = await getReceiptLogoDataUrl();
      const safeLogoDataUrl = await toJsPdfImageDataUrl(logoDataUrl);

      if (activeLanguage === "ur") {
        const urduFontBase64 = await getUrduFontBase64();
        await Promise.all([ensureUrduCanvasFont(), getUrduFontBinaryString()]);
        const canvas = document.createElement("canvas");
        const width = 1240;
        const height = 1754;
        const margin = 70;
        const columnWidth = (width - margin * 2) / 6;
        const rowHeight = 82;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context unavailable for Urdu invoice.");
        }

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#fffaf4";
        context.fillRect(0, 0, width, height);

        if (logoDataUrl) {
          const logoImage = await loadImage(logoDataUrl);
          context.drawImage(logoImage, margin, 54, 132, 132);
        }

        context.direction = "rtl";
        context.textAlign = "right";
        context.fillStyle = "#800000";
        context.font = 'bold 42px "ReceiptUrdu"';
        context.fillText(invoiceCopy.title, width - margin, 90);

        context.fillStyle = "#7a5a24";
        context.font = '28px "ReceiptUrdu"';
        context.fillText(invoiceCopy.subtitle, width - margin, 126);

        context.fillStyle = "#523939";
        context.font = '28px "ReceiptUrdu"';
        context.fillText(`${invoiceCopy.proprietor}: ${shopDetails.proprietor}`, width - margin, 172);
        context.fillText(`${invoiceCopy.contact}: ${shopDetails.contact}`, width - margin, 210);
        context.fillText(`${invoiceCopy.transactionDate}: ${entry.dateLabel}`, width - margin, 248);
        context.fillText(`${invoiceCopy.customerName}: ${entry.clientName}`, width - margin, 286);
        context.fillText(`${invoiceCopy.productName}: ${entry.productName}`, width - margin, 324);

        context.strokeStyle = "#800000";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(margin, 366);
        context.lineTo(width - margin, 366);
        context.stroke();

        const headerY = 416;
        const valueY = headerY + rowHeight;
        const headers = [
          invoiceCopy.remainingBalance,
          invoiceCopy.amountPaid,
          invoiceCopy.totalBill,
          invoiceCopy.meters,
          invoiceCopy.productName,
          invoiceCopy.transactionDate,
        ];
        const values = [
          `PKR ${formatCurrency(entry.balance)}`,
          `PKR ${formatCurrency(entry.amountPaid)}`,
          `PKR ${formatCurrency(entry.totalPrice)}`,
          formatMeters(entry.quantityMeters),
          entry.productName,
          entry.dateLabel,
        ];

        headers.forEach((label, index) => {
          const x = width - margin - columnWidth * (index + 1);
          drawTableCell(context, x, headerY, columnWidth, rowHeight, label, {
            fill: "#800000",
            color: "#fff9f1",
            bold: true,
            align: "right",
            rtl: true,
          });
          drawTableCell(context, x, valueY, columnWidth, rowHeight, values[index], {
            fill: "#ffffff",
            color: "#351212",
            align: "right",
            rtl: true,
          });
        });

        context.fillStyle = "#523939";
        context.font = '30px "ReceiptUrdu"';
        context.fillText(invoiceCopy.thankYou, width - margin, valueY + 145);

        context.strokeStyle = "#c4a95c";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(margin, height - 110);
        context.lineTo(width - margin, height - 110);
        context.stroke();

        context.fillStyle = "#800000";
        context.font = '26px "ReceiptUrdu"';
        context.fillText(
          `${invoiceCopy.addressStamp}: ${shopDetails.address}`,
          width - margin,
          height - 66
        );

        const doc = new jsPDF({
          unit: "pt",
          format: "a4",
        });
        if (urduFontBase64) {
          doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", urduFontBase64);
          doc.addFont("NotoNaskhArabic-Regular.ttf", "NotoNaskhArabic", "normal");
          doc.setFont("NotoNaskhArabic");
        }
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89);
        const safeClientName = String(entry.clientName ?? "customer")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        doc.save(`hafiz-clothes-house-invoice-${safeClientName || "customer"}-${entry.id}.pdf`);
        return;
      }

      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 48;
      const detailRightX = pageWidth - marginX;

      doc.setFillColor(128, 0, 0);
      doc.rect(0, 0, pageWidth, 12, "F");

      if (safeLogoDataUrl && safeLogoDataUrl.startsWith("data:image")) {
        const imageFormat = detectJsPdfImageFormat(safeLogoDataUrl);
        try {
          doc.addImage(safeLogoDataUrl, imageFormat, marginX, 24, 64, 64, undefined, "FAST");
        } catch (error) {
          console.error("Receipt logo addImage error:", error);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(128, 0, 0);
      doc.text(invoiceCopy.title, marginX + 70, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(82, 57, 57);
      doc.text(invoiceCopy.subtitle, marginX + 70, 70);
      doc.text(`${invoiceCopy.proprietor}: ${shopDetails.proprietor}`, detailRightX, 50, {
        align: "right",
      });
      doc.text(`${invoiceCopy.contact}: ${shopDetails.contact}`, detailRightX, 68, {
        align: "right",
      });
      doc.text(`${invoiceCopy.transactionDate}: ${entry.dateLabel}`, detailRightX, 86, {
        align: "right",
      });
      doc.text(`${invoiceCopy.customerName}: ${entry.clientName}`, detailRightX, 104, {
        align: "right",
      });
      doc.text(`${invoiceCopy.productName}: ${entry.productName}`, detailRightX, 122, {
        align: "right",
      });

      doc.setDrawColor(128, 0, 0);
      doc.line(marginX, 140, pageWidth - marginX, 140);

      autoTable(doc, {
        startY: 164,
        head: [[
          invoiceCopy.transactionDate,
          invoiceCopy.productName,
          invoiceCopy.meters,
          invoiceCopy.totalBill,
          invoiceCopy.amountPaid,
          invoiceCopy.remainingBalance,
        ]],
        body: [[
          entry.dateLabel,
          entry.productName,
          formatMeters(entry.quantityMeters),
          `PKR ${formatCurrency(entry.totalPrice)}`,
          `PKR ${formatCurrency(entry.amountPaid)}`,
          `PKR ${formatCurrency(entry.balance)}`,
        ]],
        theme: "grid",
        margin: { left: marginX, right: marginX },
        headStyles: {
          fillColor: [128, 0, 0],
          textColor: [255, 249, 241],
          fontStyle: "bold",
        },
        bodyStyles: {
          textColor: [53, 18, 18],
        },
        styles: {
          fontSize: 10,
          cellPadding: 10,
          lineColor: [227, 216, 216],
          lineWidth: 1,
        },
      });

      const finalY = doc.lastAutoTable?.finalY ?? 250;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(82, 57, 57);
      doc.text(invoiceCopy.thankYou, marginX, finalY + 34);
      doc.line(marginX, pageHeight - 72, pageWidth - marginX, pageHeight - 72);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(128, 0, 0);
      doc.text(`${invoiceCopy.addressStamp}: ${shopDetails.address}`, marginX, pageHeight - 50);

      const safeClientName = String(entry.clientName ?? "customer")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      doc.save(`hafiz-clothes-house-invoice-${safeClientName || "customer"}-${entry.id}.pdf`);
    } catch (error) {
      console.error("Receipt PDF generation error:", error);
      setFormError("Failed to generate the receipt PDF.");
    } finally {
      setGeneratingReceiptId("");
    }
  }

  async function fetchLedger(preferredClientName = requestedClient) {
    setIsLoading(true);

    const [clientsResult, productsResult] = await Promise.all([
      isAdmin
        ? supabase
            .from("clients")
            .select("id, name, phone, trust_level")
            .order("name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("products")
        .select("id, name, category, price_per_meter, wholesale_price")
        .order("name", { ascending: true }),
    ]);

    let ledgerQuery = supabase
      .from("ledger")
      .select(
        "id, created_at, client_id, product_id, description, quantity_meters, total_bill, total_price, amount_paid, balance, clients(name, phone), products(name)"
      )
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (!isAdmin && session?.customerId) {
      ledgerQuery = ledgerQuery.eq("client_id", session.customerId);
    }

    if (!isAdmin && !session?.customerId) {
      setClients([]);
      setProducts(productsResult.error ? [] : productsResult.data ?? []);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const ledgerResult = await ledgerQuery;
    const clientsData = clientsResult.error ? [] : clientsResult.data ?? [];
    const productsData = productsResult.error ? [] : productsResult.data ?? [];
    const ledgerData = ledgerResult.error ? [] : ledgerResult.data ?? [];

    if (clientsResult.error) {
      console.error("Supabase clients fetch error:", clientsResult.error);
    }

    if (productsResult.error) {
      console.error("Supabase products fetch error:", productsResult.error);
    }

    if (ledgerResult.error) {
      // Hard Refresh Schema: if PGRST205 persists, refresh Supabase schema cache
      // and confirm public.ledger is accessible in the project.
      console.error("Supabase ledger fetch error:", ledgerResult.error);
    }

    setClients(clientsData);
    setProducts(productsData);
    setTransactions(normalizeLedgerEntries(ledgerData));
    setIsLoading(false);

    if (isAdmin && preferredClientName && !selectedCustomerId && clientsData.length > 0) {
      const matchedClient = clientsData.find(
        (client) => client.name?.toLowerCase() === preferredClientName.toLowerCase()
      );

      if (matchedClient) {
        setSelectedCustomerId(String(matchedClient.id));
      }
    }
  }

  useEffect(() => {
    const clientFromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("client") ?? ""
        : "";
    const shouldOpenModal =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("open") === "1"
        : false;
    const paidFromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("paid") ?? ""
        : "";
    let isCurrent = true;

    async function bootstrapLedger() {
      setRequestedClient(clientFromQuery);
      await fetchLedger(clientFromQuery);

      if (!isCurrent) {
        return;
      }

      if (isAdmin && clientFromQuery) {
        setSearchCustomer(clientFromQuery);
      }

      if (isAdmin && shouldOpenModal) {
        const paidValue = paidFromQuery.trim();
        openModal({
          amountPaid: paidValue && /^\d+(\.\d+)?$/.test(paidValue) ? paidValue : undefined,
        });
      }
    }

    bootstrapLedger();

    return () => {
      isCurrent = false;
    };
    // fetchLedger intentionally stays outside the dependency list so this
    // bootstrap only follows auth visibility changes and not every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, session?.customerId]);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue =
      name === "quantityMeters" || name === "amountPaid"
        ? value.replace(/[^\d.]/g, "")
        : value;

    if (name === "clientId") {
      setSelectedCustomerId(nextValue);
      setPricePerMeterInput("");
    }

    if (name === "productId") {
      setSelectedProductId(nextValue);
      setPricePerMeterInput("");
      setMetersStockError(false);
      setAvailableStockMeters(null);
    }

    if (name === "transactionDate") {
      setTransactionDate(nextValue);
    }

    if (name === "quantityMeters") {
      setMeters(nextValue);
      setMetersStockError(false);
    }

    if (name === "pricePerMeter") {
      setPricePerMeterInput(nextValue);
    }

    if (name === "amountPaid") {
      setAmountPaid(nextValue);
    }

    setFormError("");
  }

  function openModal(options = {}) {
    if (!isAdmin) {
      return;
    }

    const initialPaid = options?.amountPaid;
    setFormError("");
    setSuccessMessage("");
    setReceiptEntry(null);
    setTransactionDate(getTodayInputDate());
    if (initialPaid !== undefined && initialPaid !== null) {
      setAmountPaid(String(initialPaid));
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setFormError("");
    setIsModalOpen(false);
    setSelectedProductId("");
    setTransactionDate(getTodayInputDate());
    setMeters("");
    setPricePerMeterInput("");
    setAmountPaid("");
  }

  async function handleSubmit(event) {
    if (!isAdmin) {
      return;
    }

    event.preventDefault();

    const quantity = Number(meters);
    const clientExists = clients.some((client) => String(client.id) === selectedCustomerId);
    const productExists = products.some(
      (product) => String(product.id) === selectedProductId
    );

    const isRecoveryEntry =
      computedTotalPrice === 0 &&
      computedAmountPaid > 0 &&
      (!selectedProductId ||
        !meters.trim() ||
        quantity <= 0 ||
        !UUID_PATTERN.test(String(selectedProductId)));

    if (
      !selectedCustomerId ||
      !transactionDate ||
      amountPaid.trim() === ""
    ) {
      setFormError("Please complete the date, customer, and amount paid fields.");
      return;
    }

    if (!isRecoveryEntry && (!selectedProductId || !meters.trim())) {
      setFormError("Please complete the date, customer, item, meters, and amount paid fields.");
      return;
    }

    if (
      !UUID_PATTERN.test(selectedCustomerId) ||
      !clientExists ||
      (!isRecoveryEntry &&
        (!UUID_PATTERN.test(selectedProductId) || !productExists))
    ) {
      setFormError(
        isRecoveryEntry
          ? "Please select a valid customer."
          : "Please select a valid customer and a valid product."
      );
      return;
    }

    if (!isRecoveryEntry) {
      if (!/^\d+(\.\d+)?$/.test(meters.trim()) || quantity <= 0) {
        setFormError("Please enter a valid meter quantity.");
        return;
      }
    }

    if (!/^\d+(\.\d+)?$/.test(amountPaid.trim()) || computedAmountPaid < 0) {
      setFormError("Please enter a valid amount paid.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setSuccessMessage("");

    let currentStockMeters = 0;
    if (!isRecoveryEntry) {
    // Stock guard: prevent saving a transaction that would take inventory below zero.
    const { data: stockRow, error: stockError } = await supabase
      .from("products")
      .select("id, stock_meters")
      .eq("id", selectedProductId)
      .maybeSingle();

    if (stockError) {
      console.error("Supabase stock lookup error:", stockError.message || stockError);
      setFormError("Unable to verify stock for this item. Please try again.");
      setIsSaving(false);
      return;
    }

    currentStockMeters = Number(stockRow?.stock_meters ?? 0);
    if (!Number.isFinite(currentStockMeters) || currentStockMeters < quantity) {
      setMetersStockError(true);
      setAvailableStockMeters(Number.isFinite(currentStockMeters) ? currentStockMeters : 0);

      const available = Number.isFinite(currentStockMeters) ? currentStockMeters : 0;
      const toastMessage =
        language === "ur"
          ? `اسٹاک میں کمی: کلاٹھ کی دستیاب مقدار صرف ${available} میٹر ہے۔`
          : `Insufficient Stock: Only ${available}m remaining in Catalog.`;

      showToast(toastMessage, "error");
      setIsSaving(false);
      return;
    }
    }

    const receiptDraft = {
      clientName: selectedClient?.name ?? "Customer",
      clientPhone: selectedClient?.phone ?? "",
      amountPaid: Number(computedAmountPaid.toFixed(2)),
      balance: Number(computedBalance.toFixed(2)),
    };

    const recoveryDescription = "Wasooli / Recovery";
    const newEntry = {
      created_at: `${transactionDate}T12:00:00`,
      client_id: selectedCustomerId,
      product_id: isRecoveryEntry ? null : selectedProductId,
      description: isRecoveryEntry ? recoveryDescription : undefined,
      quantity_meters: isRecoveryEntry ? 0 : quantity,
      total_price: Number((isRecoveryEntry ? 0 : computedTotalPrice).toFixed(2)),
      total_bill: Number((isRecoveryEntry ? 0 : computedTotalPrice).toFixed(2)),
      amount_paid: Number(computedAmountPaid.toFixed(2)),
      balance: Number(computedBalance.toFixed(2)),
    };

    await supabase.auth.getSession();
    const { data: insertedRows, error } = await supabase
      .from("ledger")
      .insert([newEntry])
      .select("id")
      .limit(1);

    if (error) {
      // Hard Refresh Schema: if PGRST205 persists, refresh Supabase schema cache
      // and confirm public.ledger is accessible in the project.
      console.error("Supabase ledger insert error:", error.message || error);
      setFormError("Failed to save Mera Hisab entry.");
      setIsSaving(false);
      return;
    }

    const insertedId = insertedRows?.[0]?.id;

    if (isRecoveryEntry) {
      closeModal();
      setSuccessMessage(
        ledgerCopy.saveSuccessToast ??
          "Entry Saved Successfully. You can now send the Receipt."
      );
      setReceiptEntry(receiptDraft);
      await fetchLedger();
      setIsSaving(false);
      return;
    }
    const nextStockMeters = Math.max(currentStockMeters - quantity, 0);

    const { error: stockUpdateError } = await supabase
      .from("products")
      .update({ stock_meters: nextStockMeters })
      .eq("id", selectedProductId);

    if (stockUpdateError) {
      console.error("Supabase stock update error:", stockUpdateError.message || stockUpdateError);

      // Best-effort rollback so we don't record a sale without decrementing stock.
      if (insertedId) {
        const rollback = await supabase.from("ledger").delete().eq("id", insertedId);
        if (rollback.error) {
          console.error("Supabase rollback error:", rollback.error.message || rollback.error);
        }
      }

      setFormError("Failed to update stock quantity for this item.");
      setIsSaving(false);
      return;
    }

    closeModal();
    setSuccessMessage(
      ledgerCopy.saveSuccessToast ??
        "Entry Saved Successfully. You can now send the Receipt."
    );
    setReceiptEntry(receiptDraft);
    await fetchLedger();
    setIsSaving(false);
  }

  async function handleDelete(entryId) {
    if (!isAdmin) {
      return;
    }

    setDeleteId(String(entryId));
    setSuccessMessage("");

    const { error } = await supabase.from("ledger").delete().eq("id", entryId);

    if (error) {
      console.error("Supabase ledger delete error:", error.message || error);
      setDeleteId("");
      setFormError("Failed to delete Mera Hisab entry.");
      return;
    }

    setTransactions((currentEntries) =>
      currentEntries.filter((entry) => String(entry.id) !== String(entryId))
    );
    setDeleteId("");
    setSuccessMessage("Mera Hisab entry removed.");
  }

  return (
    <section className="ledger-page">
      {toast ? (
        <div className="ledger-toast-wrap" role="status" aria-live="polite" key={toast.id}>
          <div className="ledger-toast ledger-toast-error">
            <span className="ledger-toast-icon" aria-hidden="true">
              <TriangleAlert size={18} />
            </span>
            <span className="ledger-toast-message">{toast.message}</span>
          </div>
        </div>
      ) : null}
      <div className="ledger-hero">
        <div className="ledger-hero-grid">
          <div className="ledger-hero-copy">
            <p className="dashboard-eyebrow">{ledgerCopy.pageTitle}</p>
            <h2 className="ledger-hero-title">
              {mounted ? (isAdmin ? ledgerCopy.heroAdmin : ledgerCopy.heroCustomer) : ""}
            </h2>
            <p className="dashboard-copy">
              {mounted ? (isAdmin ? ledgerCopy.heroCopyAdmin : ledgerCopy.heroCopyCustomer) : ""}
            </p>
          </div>

          <div className="ledger-filters-card" aria-label="Ledger filters">
            <div className="ledger-filters-grid">
              <label
                className="ledger-search-field ledger-search-field-hero"
                htmlFor="ledger-customer-search"
              >
                <span>{ledgerCopy.searchCustomer}</span>
                <input
                  id="ledger-customer-search"
                  type="search"
                  value={searchCustomer}
                  onChange={(event) => setSearchCustomer(event.target.value)}
                  placeholder={ledgerCopy.searchCustomerPlaceholder}
                />
              </label>

              {showAdminColumns ? (
                <label
                  className="ledger-search-field ledger-filter-field"
                  htmlFor="ledger-customer-filter"
                >
                  <span>{ledgerCopy.selectCustomer ?? "Select Customer"}</span>
                  <select
                    id="ledger-customer-filter"
                    value={selectedCustomerFilterId}
                    onChange={(event) => setSelectedCustomerFilterId(event.target.value)}
                  >
                    <option value="">{ledgerCopy.allCustomers ?? "All Customers"}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div aria-hidden="true" />
              )}

              <label
                className="ledger-search-field ledger-filter-field"
                htmlFor="ledger-product-filter"
              >
                <span>{ledgerCopy.filterByProduct}</span>
                <select
                  id="ledger-product-filter"
                  value={selectedFilterProductId}
                  onChange={(event) => setSelectedFilterProductId(event.target.value)}
                >
                  <option value="">{ledgerCopy.allProducts}</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.name ?? "")}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              {showAdminColumns ? (
                <div className="ledger-filters-button-slot">
                  <span className="ledger-filters-slot-label" aria-hidden="true">
                    {ledgerCopy.viewFullKhata ?? "View Full Khata"}
                  </span>
                  <button
                    type="button"
                    className="ledger-khata-jump"
                    onClick={handleJumpToKhata}
                    disabled={!String(selectedCustomerFilterId || "").trim()}
                  >
                    {ledgerCopy.viewFullKhata ?? "View Full Khata"}
                  </button>
                </div>
              ) : (
                <div aria-hidden="true" />
              )}
            </div>

            {mounted && isAdmin ? (
              <button
                type="button"
                className="ledger-primary-action ledger-primary-action-hero ledger-primary-action-wide"
                onClick={openModal}
              >
                + {ledgerCopy.addNewEntry}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="ledger-toast" role="status" aria-live="polite">
          <p className="ledger-feedback success">{successMessage}</p>
        </div>
      ) : null}
      {receiptEntry?.clientPhone ? (
        <div className="ledger-receipt-bar">
          <button
            type="button"
            className="ledger-whatsapp-button"
            onClick={handleSendReceipt}
          >
            {ledgerCopy.sendReceipt}
          </button>
        </div>
      ) : null}

      <section className="ledger-shell">
        <article className="ledger-table-card">
          <div className="ledger-section-head">
            <div>
              <p className="dashboard-eyebrow">{ledgerCopy.sectionEyebrow}</p>
              <h3>
                {mounted
                  ? isAdmin
                    ? ledgerCopy.sectionTitleAdmin
                    : ledgerCopy.sectionTitleCustomer
                  : "Loading history..."}
              </h3>
            </div>
            <span className="ledger-summary-pill">{runningTransactions.length} Entries</span>
          </div>

          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <colgroup>
                <col className="ledger-col-date" />
                {showAdminColumns ? <col className="ledger-col-client" /> : null}
                <col className="ledger-col-item" />
                <col className="ledger-col-meters" />
                <col className="ledger-col-total" />
                <col className="ledger-col-total" />
                <col className="ledger-col-total" />
                <col className="ledger-col-delete" />
                <col className="ledger-col-delete" />
                {showAdminColumns ? <col className="ledger-col-delete" /> : null}
              </colgroup>
              <thead className="ledger-table-header">
                <tr>
                  <th>{ledgerCopy.date}</th>
                  {showAdminColumns ? <th>{ledgerCopy.customer}</th> : null}
                  <th>{ledgerCopy.product}</th>
                  <th>{ledgerCopy.meters}</th>
                  <th>{ledgerCopy.totalBill}</th>
                  <th>{ledgerCopy.amountPaid}</th>
                  <th>{netChangeLabel}</th>
                  <th>{ledgerCopy.receipt}</th>
                  <th>{ledgerCopy.whatsapp}</th>
                  {showAdminColumns ? <th>{ledgerCopy.delete}</th> : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`ledger-loading-${index}`}>
                      <td colSpan={showAdminColumns ? "10" : "8"}>
                        <div className="ledger-loading-row" />
                      </td>
                    </tr>
                  ))
                ) : runningTransactions.length > 0 ? (
                  runningTransactions.map((entry) => (
                    <tr key={entry.id} className="ledger-row ledger-table-row">
                      <td data-label={ledgerCopy.date}>{entry.dateLabel}</td>
                      {showAdminColumns ? (
                        <td data-label={ledgerCopy.customer}>{entry.clientName}</td>
                      ) : null}
                      <td data-label={ledgerCopy.product}>
                        <div className="ledger-item-cell">
                          {entry.productId ? (
                            <strong>{entry.productName}</strong>
                          ) : (
                            <span className="ledger-recovery-badge">{entry.productName}</span>
                          )}
                        </div>
                      </td>
                      <td data-label={ledgerCopy.meters}>{formatMeters(entry.quantityMeters)}</td>
                      <td data-label={ledgerCopy.totalBill}>
                        PKR {formatCurrency(entry.totalPrice)}
                      </td>
                      <td data-label={ledgerCopy.amountPaid}>
                        PKR {formatCurrency(entry.amountPaid)}
                      </td>
                      <td data-label={netChangeLabel} className="ledger-net-change-cell">
                        PKR {formatCurrency(toNumber(entry.totalPrice) - toNumber(entry.amountPaid))}
                      </td>
                      <td data-label={ledgerCopy.receipt}>
                        <button
                          type="button"
                          className="ledger-receipt-button"
                          onClick={() => handleDownloadReceipt(entry)}
                          disabled={generatingReceiptId === String(entry.id)}
                          aria-label={`Download receipt for ${entry.clientName}`}
                        >
                          <FileDown size={15} aria-hidden="true" />
                          <span>
                            {generatingReceiptId === String(entry.id)
                              ? ledgerCopy.receiptPreparing
                              : ledgerCopy.receipt}
                          </span>
                        </button>
                      </td>
                      <td data-label={ledgerCopy.whatsapp}>
                        <button
                          type="button"
                          className="ledger-whatsapp-button"
                          onClick={() => handleWhatsAppReminder(entry)}
                          disabled={
                            !String(entry.clientPhone ?? session?.phone ?? "").trim() ||
                            toNumber(entry.balance) <= 0
                          }
                        >
                          {ledgerCopy.whatsapp}
                        </button>
                      </td>
                      {showAdminColumns ? (
                        <td data-label={ledgerCopy.delete}>
                          <button
                            type="button"
                            className="ledger-delete-button"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleteId === String(entry.id)}
                          >
                            {deleteId === String(entry.id) ? "Deleting..." : ledgerCopy.delete}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={showAdminColumns ? "10" : "8"} className="ledger-empty-state">
                      {mounted
                        ? searchCustomer.trim() || selectedFilterProductId
                          ? ledgerCopy.noMatches
                          : session?.customerId || isAdmin
                            ? ledgerCopy.noEntries
                            : ledgerCopy.signInHint
                        : "Loading history..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {isModalOpen && isAdmin ? (
        <div className="ledger-modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="ledger-modal-scroll" onClick={(event) => event.stopPropagation()}>
            <div
              className="ledger-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ledger-entry-title"
            >
              <div className="ledger-modal-head">
                <div>
                  <p className="dashboard-eyebrow">{ledgerCopy.modalEyebrow}</p>
                  <h3 id="ledger-entry-title">{ledgerCopy.modalTitle}</h3>
                  <p className="dashboard-copy">{ledgerCopy.modalCopy}</p>
                </div>
              </div>

              <form className="ledger-form" onSubmit={handleSubmit}>
                <label className="ledger-field">
                  <span>{ledgerCopy.transactionDate}</span>
                  <input
                    name="transactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={handleChange}
                  />
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.selectCustomer}</span>
                  <select
                    name="clientId"
                    value={selectedCustomerId}
                    onChange={handleChange}
                  >
                    <option value="">{ledgerCopy.selectCustomerPlaceholder}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.selectProduct}</span>
                  <select
                    name="productId"
                    value={selectedProductId}
                    onChange={handleChange}
                  >
                    <option value="">{ledgerCopy.selectProductPlaceholder}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.meters}</span>
                  <input
                    name="quantityMeters"
                    type="text"
                    inputMode="decimal"
                    value={meters}
                    onChange={handleChange}
                    placeholder={ledgerCopy.metersPlaceholder}
                    className={metersStockError ? "is-error" : undefined}
                    aria-invalid={metersStockError ? "true" : undefined}
                  />
                  {metersStockError && availableStockMeters !== null ? (
                    <small className="ledger-field-error">
                      {language === "ur"
                        ? `دستیاب مقدار: ${availableStockMeters} میٹر`
                        : `Available: ${availableStockMeters}m`}
                    </small>
                  ) : null}
                </label>

                <div className="ledger-live-total">
                  <span>{ledgerCopy.pricingType}</span>
                  <strong>
                    {selectedClientCategory === "regular"
                      ? ledgerCopy.wholesaleRate
                      : ledgerCopy.retailRate}
                  </strong>
                </div>

                <label className="ledger-field">
                  <span>{ledgerCopy.pricePerMeter}</span>
                  <input
                    name="pricePerMeter"
                    type="text"
                    inputMode="decimal"
                    value={
                      selectedClientCategory === "regular"
                        ? pricePerMeterInput || String(defaultPricePerMeter || "")
                        : String(defaultPricePerMeter || "")
                    }
                    onChange={handleChange}
                    readOnly={selectedClientCategory !== "regular"}
                    disabled={selectedClientCategory !== "regular"}
                  />
                  <small className="ledger-field-note">{pricingIndicator}</small>
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.totalBill}</span>
                  <input
                    type="text"
                    value={`PKR ${formatCurrency(computedTotalPrice)}`}
                    disabled
                    readOnly
                  />
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.amountPaid}</span>
                  <input
                    name="amountPaid"
                    type="text"
                    inputMode="decimal"
                    value={amountPaid}
                    onChange={handleChange}
                    placeholder={ledgerCopy.amountPaidPlaceholder}
                  />
                </label>

                <label className="ledger-field">
                  <span>{ledgerCopy.balance}</span>
                  <input
                    type="text"
                    value={`PKR ${formatCurrency(computedBalance)}`}
                    disabled
                    readOnly
                  />
                </label>

                {formError ? <p className="ledger-feedback error">{formError}</p> : null}

                <div className="ledger-form-actions">
                  <button
                    type="button"
                    className="ledger-secondary-action"
                    onClick={closeModal}
                  >
                    {ledgerCopy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="ledger-primary-action"
                    disabled={isSaving}
                  >
                    {isSaving ? ledgerCopy.saving : ledgerCopy.saveEntry}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

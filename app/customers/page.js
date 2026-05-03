"use client";

import Link from "next/link";
import { FileDown, MapPin, Phone, Trash2 } from "lucide-react";
import { Pencil } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";
import { translations } from "@/app/lib/translations";
import { useLanguage } from "@/app/ui/language-provider";

const initialForm = {
  fullName: "",
  phoneNumber: "",
  city: "",
  trustLevel: "regular",
};

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizeCustomerMatchName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("und");
}

function normalizeCustomerCategory(value, copy) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (normalizedValue.includes("whole")) {
    return {
      label: copy.wholesaleCategory,
      tone: "trusted",
    };
  }

  if (normalizedValue.includes("retail")) {
    return {
      label: copy.retailCategory,
      tone: "retail",
    };
  }

  return {
    label: copy.regularCategory,
    tone: "regular",
  };
}

function getTrustBadgeClasses(tone) {
  const baseClasses =
    "inline-flex w-fit items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md";

  if (tone === "retail") {
    return `${baseClasses} border-cyan-300/55 bg-cyan-400/12 text-cyan-900 ring-1 ring-cyan-200/45`;
  }

  if (tone === "trusted") {
    return `${baseClasses} border-emerald-300/55 bg-emerald-400/12 text-emerald-900 ring-1 ring-emerald-200/45`;
  }

  return `${baseClasses} border-amber-300/60 bg-amber-300/14 text-amber-950 ring-1 ring-amber-200/50`;
}

function buildReminderMessage(customer, language) {
  const name = customer.name ?? "Customer";
  const balance = formatCurrency(customer.remainingBalance);

  if (language === "ur") {
    return `Assalam-o-Alaikum ${name}، حافظ کلاتھ ہاؤس سے آپ کا کل بقایا PKR ${balance} ہے۔ شکریہ۔`;
  }

  if (language === "roman") {
    return `Assalam-o-Alaikum ${name}, Hafiz Clothes House se aap ka kul baqaya PKR ${balance} hai. Shukriya.`;
  }

  return `Assalam-o-Alaikum ${name}, Hafiz Clothes House se aap ka kul baqaya PKR ${balance} hai. Shukriya.`;
}

function getTransactionCustomerName(entry) {
  return String(entry.client_id ?? "").trim();
}

function normalizeCustomers(data, copy) {
  return (data ?? []).map((customer, index) => ({
    id: String(
      customer.id ?? `${customer.name ?? "customer"}-${customer.phone ?? "phone"}-${index}`
    ),
    name: customer.name ?? "Unnamed Customer",
    phone: customer.phone ?? "-",
    city: customer.city ?? "-",
    createdAt: customer.created_at ?? null,
    trustLevel: customer.trust_level ?? "regular",
    categoryBadge: normalizeCustomerCategory(customer.trust_level, copy),
    totalPurchased: 0,
    totalPaid: 0,
    remainingBalance: 0,
    hasTransactions: false,
  }));
}

function isRecentlyAddedCustomer(customer) {
  const createdAtValue = customer?.createdAt;

  if (!createdAtValue) {
    return false;
  }

  const createdAt = new Date(createdAtValue);

  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const now = Date.now();
  const createdTime = createdAt.getTime();

  // If the timestamp is in the future (timezone/parse issues), don't mark as NEW.
  if (createdTime > now) {
    return false;
  }

  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  return now - createdTime < twoDaysMs;
}

export default function CustomersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [directoryClients, setDirectoryClients] = useState([]);
  const [allHisabEntries, setAllHisabEntries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [pendingDeleteCustomer, setPendingDeleteCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortByBalance, setSortByBalance] = useState(false);
  const [generatingStatementId, setGeneratingStatementId] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const activeLanguage = mounted ? language : "en";
  const activeTranslations = translations[activeLanguage] ?? translations.en;
  const customerCopy = useMemo(
    () => ({
      eyebrow: activeTranslations.customers?.eyebrow ?? "Customers",
      heroTitle:
        activeTranslations.customers?.heroTitle ??
        "Customer directory for fast daily retail operations.",
      heroCopy:
        activeTranslations.customers?.heroCopy ??
        "Add customers quickly, keep the list clean, and jump into Mera Hisab follow-up from one focused workspace.",
      addCustomer: activeTranslations.customers?.addCustomer ?? "Add New Customer",
      tableEyebrow: activeTranslations.customers?.tableEyebrow ?? "Client Directory",
      tableTitle: activeTranslations.customers?.tableTitle ?? "Registered customers",
      tableCopy:
        activeTranslations.customers?.tableCopy ??
        "A smart view of customer trust, financial standing, and reminder follow-up from one clean directory.",
      records: activeTranslations.customers?.records ?? "Records",
      name: activeTranslations.customers?.name ?? "Name",
      phone: activeTranslations.customers?.phone ?? "Phone",
      city: activeTranslations.customers?.city ?? "City",
      category: activeTranslations.customers?.category ?? "Category",
      financialSummary:
        activeTranslations.customers?.financialSummary ?? "Financial Summary",
      reminder: activeTranslations.customers?.reminder ?? "Reminder",
      ledger: activeTranslations.customers?.ledger ?? "Mera Hisab",
      delete: activeTranslations.customers?.delete ?? "Delete",
      actions: activeTranslations.customers?.actions ?? "Actions",
      totalPurchased:
        activeTranslations.customers?.totalPurchased ?? "Total Purchased",
      totalPaid: activeTranslations.customers?.totalPaid ?? "Total Paid",
      remainingBalance:
        activeTranslations.customers?.remainingBalance ?? "Remaining Balance",
      sendReminder:
        activeTranslations.customers?.sendReminder ?? "Send Reminder",
      clear: activeTranslations.customers?.clear ?? "Clear",
      viewLedger:
        activeTranslations.customers?.viewLedger ?? "View Mera Hisab",
      viewLedgerShort:
        activeTranslations.customers?.viewLedgerShort ?? "View",
      downloadPdf:
        activeTranslations.customers?.downloadPdf ?? "Download PDF",
      pdfPreparing:
        activeTranslations.customers?.pdfPreparing ?? "Preparing...",
      edit: activeTranslations.customers?.edit ?? "Edit",
      deleting: activeTranslations.customers?.deleting ?? "Deleting...",
      noCustomers:
        activeTranslations.customers?.noCustomers ?? "No customers found",
      noCustomersCopy:
        activeTranslations.customers?.noCustomersCopy ??
        "Add your first customer to start building a clean retail directory.",
      newCustomer: activeTranslations.customers?.newCustomer ?? "New Customer",
      editCustomer: activeTranslations.customers?.editCustomer ?? "Edit Customer",
      modalTitle:
        activeTranslations.customers?.modalTitle ?? "Add customer details",
      modalCopy:
        activeTranslations.customers?.modalCopy ??
        "Enter the customer information below to add it to the client directory.",
      editModalTitle:
        activeTranslations.customers?.editModalTitle ?? "Update customer details",
      editModalCopy:
        activeTranslations.customers?.editModalCopy ??
        "Update the customer information below to keep the client directory accurate.",
      fullName: activeTranslations.customers?.fullName ?? "Full Name",
      phoneNumber:
        activeTranslations.customers?.phoneNumber ?? "Phone Number",
      cityPlaceholder:
        activeTranslations.customers?.cityPlaceholder ?? "Enter city",
      fullNamePlaceholder:
        activeTranslations.customers?.fullNamePlaceholder ?? "Enter full name",
      phonePlaceholder:
        activeTranslations.customers?.phonePlaceholder ?? "Enter phone number",
      categoryField:
        activeTranslations.customers?.categoryField ?? "Category",
      regularCategory:
        activeTranslations.customers?.regularCategory ?? "Regular",
      retailCategory:
        activeTranslations.customers?.retailCategory ?? "Retail",
      wholesaleCategory:
        activeTranslations.customers?.wholesaleCategory ?? "Wholesale",
      cancel: activeTranslations.customers?.cancel ?? "Cancel",
      saving: activeTranslations.customers?.saving ?? "Saving...",
      saveCustomer:
        activeTranslations.customers?.saveCustomer ?? "Save Customer",
      allFieldsRequired:
        activeTranslations.customers?.allFieldsRequired ?? "All fields are required.",
      phoneValidation:
        activeTranslations.customers?.phoneValidation ??
        "Please enter a valid phone number.",
      saveError:
        activeTranslations.customers?.saveError ??
        "Unable to save this customer. Please try again.",
      saveSuccess:
        activeTranslations.customers?.saveSuccess ?? "Customer saved!",
      updateSuccess:
        activeTranslations.customers?.updateSuccess ?? "Customer updated!",
      deleteSuccess:
        activeTranslations.customers?.deleteSuccess ?? "Customer removed.",
      searchCustomers:
        activeTranslations.customers?.searchCustomers ?? "Search Customers",
      searchCustomersPlaceholder:
        activeTranslations.customers?.searchCustomersPlaceholder ??
        "Search by name, phone, or city",
      filterByCategory:
        activeTranslations.customers?.filterByCategory ?? "Filter by Category",
      allCategories:
        activeTranslations.customers?.allCategories ?? "All",
      sortByBalance:
        activeTranslations.customers?.sortByBalance ??
        (language === "ur"
          ? "بقایا کے مطابق"
          : language === "roman"
            ? "Baqaya ke mutabiq"
            : "Sort by Balance"),
      summaryRecovery:
        activeTranslations.customers?.summaryRecovery ??
        (language === "ur"
          ? "کل بقایا"
          : language === "roman"
            ? "Kul Baqaya"
            : "Total Recovery"),
      summaryReceived:
        activeTranslations.customers?.summaryReceived ??
        (language === "ur"
          ? "کل وصولی"
          : language === "roman"
            ? "Kul Wasooli"
            : "Total Received"),
    }),
    [activeTranslations, language]
  );

  const customers = useMemo(() => {
    const baseClients = normalizeCustomers(directoryClients, customerCopy);

    return baseClients.map((client) => {
      const relevantEntries = allHisabEntries.filter((entry) => {
        const entryClientId = String(entry.client_id ?? "").trim();
        const clientId = String(client.id ?? "").trim();
        return entryClientId === clientId;
      });

      const totalPurchased = relevantEntries.reduce(
        (sum, entry) => sum + toNumber(entry.total_bill || entry.total_price || 0),
        0
      );
      const totalPaid = relevantEntries.reduce(
        (sum, entry) => sum + toNumber(entry.amount_paid || 0),
        0
      );
      const balance = totalPurchased - totalPaid;
      const isNew = isRecentlyAddedCustomer(client);

      return {
        ...client,
        totalPurchased,
        totalPaid,
        remainingBalance: Math.max(balance, 0),
        balance,
        hasTransactions: relevantEntries.length > 0,
        isNew,
      };
    });
  }, [allHisabEntries, customerCopy, directoryClients]);

  const portfolioTotals = useMemo(() => {
    return customers.reduce(
      (summary, customer) => ({
        totalRecovery: summary.totalRecovery + toNumber(customer.remainingBalance),
        totalReceived: summary.totalReceived + toNumber(customer.totalPaid),
      }),
      { totalRecovery: 0, totalReceived: 0 }
    );
  }, [customers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = normalizeCustomerMatchName(searchQuery);
    const normalizedCategory = String(categoryFilter ?? "all").trim().toLowerCase();

    return customers.filter((customer) => {
      const searchableFields = [customer.name, customer.phone, customer.city];
      const matchesSearch = normalizedQuery
        ? searchableFields.some((value) =>
            normalizeCustomerMatchName(value).includes(normalizedQuery)
          )
        : true;
      const matchesCategory =
        normalizedCategory === "all" ||
        String(customer.trustLevel ?? "").trim().toLowerCase() === normalizedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, customers, searchQuery]);

  const visibleCustomers = useMemo(() => {
    const nextCustomers = [...filteredCustomers];

    if (!sortByBalance) {
      return nextCustomers;
    }

    return nextCustomers.sort(
      (firstCustomer, secondCustomer) =>
        toNumber(secondCustomer.remainingBalance) - toNumber(firstCustomer.remainingBalance)
    );
  }, [filteredCustomers, sortByBalance]);

  const loadCustomers = useCallback(async ({ showLoading = true } = {}) => {
    if (session?.role !== "admin") {
      setDirectoryClients([]);
      setAllHisabEntries([]);
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    const [clientsResult, ledgerResult] = await Promise.all([
      supabase.from("clients").select("*").order("name", { ascending: true }),
      supabase.from("ledger").select("client_id, total_bill, total_price, amount_paid"),
    ]);

    if (clientsResult.error) {
      console.error("Supabase customers fetch error:", clientsResult.error);
      setDirectoryClients([]);
      setAllHisabEntries([]);
      setIsLoading(false);
      return;
    }

    setDirectoryClients(clientsResult.data ?? []);
    setAllHisabEntries(ledgerResult.error ? [] : ledgerResult.data ?? []);
    setIsLoading(false);
  }, [session?.role]);

  useEffect(() => {
    customers.forEach((client) => {
      const clientEntries = allHisabEntries.filter((entry) => {
        const entryClientId = String(entry.client_id ?? "").trim();
        const clientId = String(client.id ?? "").trim();
        return entryClientId === clientId;
      });

      console.log("Matching entries for client:", client.name, "Entries found:", clientEntries.length);
      console.log("Client:", client.name, "Calculated Balance:", client.balance);
      console.log(client.name, "is new:", Boolean(client.isNew));
    });
  }, [allHisabEntries, customers]);

  useEffect(() => {
    if (session?.role && session.role !== "admin") {
      router.replace("/");
      return;
    }

    let isMounted = true;

    async function bootstrapCustomers() {
      if (session?.role !== "admin") {
        if (isMounted) {
          setDirectoryClients([]);
          setAllHisabEntries([]);
          setIsLoading(false);
        }
        return;
      }

      await loadCustomers();
    }

    bootstrapCustomers();

    return () => {
      isMounted = false;
    };
  }, [loadCustomers, router, session?.role]);

  useEffect(() => {
    if (session?.role !== "admin") {
      return undefined;
    }

    const channel = supabase
      .channel("customers-ledger-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ledger" },
        () => {
          loadCustomers({ showLoading: false });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          loadCustomers({ showLoading: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCustomers, session?.role]);

  function openModal(customer = null) {
    // Defensive: `onClick={openModal}` would pass the click event as the first argument.
    // Treat events as "new customer" so we don't accidentally go into edit mode with `id: undefined`.
    const isEventLike =
      customer &&
      typeof customer === "object" &&
      typeof customer.preventDefault === "function" &&
      typeof customer.stopPropagation === "function";
    const resolvedCustomer = isEventLike ? null : customer;

    setEditingCustomer(resolvedCustomer);
    setForm(
      resolvedCustomer
        ? {
            fullName: resolvedCustomer.name ?? "",
            phoneNumber: resolvedCustomer.phone ?? "",
            city: resolvedCustomer.city ?? "",
            trustLevel: resolvedCustomer.trustLevel ?? "regular",
          }
        : initialForm
    );
    setFormErrors({});
    setSaveError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormErrors({});
    setSaveError("");
    setForm(initialForm);
    setEditingCustomer(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phoneNumber" ? value.replace(/[^\d]/g, "") : value;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: nextValue,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      form: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const trimmedName = form.fullName.trim();
    const trimmedPhone = form.phoneNumber.trim();
    const trimmedCity = form.city.trim();
    const trimmedTrustLevel = form.trustLevel.trim();

    if (!trimmedName || !trimmedPhone || !trimmedCity || !trimmedTrustLevel) {
      nextErrors.form = customerCopy.allFieldsRequired;
    }

    if (!/^\d{10,11}$/.test(trimmedPhone)) {
      nextErrors.phoneNumber = customerCopy.phoneValidation;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setSaveError(nextErrors.form ?? "");
      return;
    }

    setIsSaving(true);
    setFormErrors({});
    setSaveError("");
    setSuccessMessage("");

    // Clean insert/update payload:
    // - never include `id` (Supabase generates UUIDs)
    // - convert empty/undefined values to null for any optional fields
    const payload = {
      name: trimmedName,
      phone: trimmedPhone,
      city: trimmedCity,
      trust_level: trimmedTrustLevel,
    };

    const isEditing =
      editingCustomer &&
      typeof editingCustomer === "object" &&
      typeof editingCustomer.id === "string" &&
      editingCustomer.id.trim().length > 0;

    const { data, error } = isEditing
      ? await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingCustomer.id)
          .select("*")
      : await supabase.from("clients").insert([payload]).select("*");

    if (error) {
      console.error("Supabase error details:", JSON.stringify(error, null, 2));
      setSaveError(customerCopy.saveError);
      setIsSaving(false);
      return;
    }

    const returnedCustomers = data ?? [];

    if (returnedCustomers.length > 0) {
      setDirectoryClients((currentClients) => {
        const nextClients = editingCustomer
          ? currentClients.map((currentCustomer) =>
              String(currentCustomer.id) === String(editingCustomer.id)
                ? returnedCustomers[0]
                : currentCustomer
            )
          : [...returnedCustomers, ...currentClients];
        return nextClients.sort((firstCustomer, secondCustomer) =>
          firstCustomer.name.localeCompare(secondCustomer.name)
        );
      });
    } else {
      await loadCustomers({ showLoading: false });
    }

    closeModal();
    setSuccessMessage(editingCustomer ? customerCopy.updateSuccess : customerCopy.saveSuccess);
    setIsSaving(false);
  }

  function openDeleteConfirmation(customer) {
    setPendingDeleteCustomer(customer);
  }

  function closeDeleteConfirmation() {
    if (deleteKey) {
      return;
    }

    setPendingDeleteCustomer(null);
  }

  async function handleDelete(customer) {
    const customerKey = `${customer.name}-${customer.phone}-${customer.city}`;
    setDeleteKey(customerKey);
    setSuccessMessage("");

    const { error } = await supabase
      .from("clients")
      .delete()
      .match({
        name: customer.name,
        phone: customer.phone,
        city: customer.city,
      });

    if (error) {
      console.error("Supabase customer delete error:", error);
      setDeleteKey("");
      return;
    }

    setDirectoryClients((currentCustomers) =>
      currentCustomers.filter(
        (item) =>
          !(
            item.name === customer.name &&
            item.phone === customer.phone &&
            item.city === customer.city
          )
      )
    );
    setDeleteKey("");
    setPendingDeleteCustomer(null);
    setSuccessMessage(customerCopy.deleteSuccess);
  }

  function handleSendReminder(customer) {
    const cleanPhone = String(customer.phone ?? "").replace(/[^\d]/g, "");

    if (!cleanPhone || customer.remainingBalance <= 0) {
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      buildReminderMessage(customer, language)
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleDownloadStatement(customer) {
    try {
      const customerId = String(customer.id ?? customer.name ?? "customer");
      setGeneratingStatementId(customerId);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 16;
      const statementTitle =
        language === "ur"
          ? "گاہک اسٹیٹمنٹ"
          : language === "roman"
            ? "Customer Statement"
            : "Customer Statement";

      doc.setFillColor(111, 0, 0);
      doc.roundedRect(marginX, 14, pageWidth - marginX * 2, 34, 8, 8, "F");
      doc.setTextColor(255, 249, 241);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("HAFIZ CLOTHES HOUSE", marginX + 10, 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(statementTitle, marginX + 10, 40);

      doc.setTextColor(53, 18, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(customer.name ?? "Customer", marginX, 66);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Phone: ${customer.phone ?? "-"}`, marginX, 76);
      doc.text(`City: ${customer.city ?? "-"}`, marginX, 84);

      autoTable(doc, {
        startY: 98,
        head: [["Summary", "Amount"]],
        body: [
          ["Total Bill", `PKR ${formatCurrency(customer.totalPurchased)}`],
          ["Amount Paid", `PKR ${formatCurrency(customer.totalPaid)}`],
          ["Final Balance", `PKR ${formatCurrency(customer.remainingBalance)}`],
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

      const finalY = doc.lastAutoTable?.finalY ?? 150;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(82, 57, 57);
      doc.text(
        "Thank you for doing business with Hafiz Clothes House.",
        marginX,
        finalY + 18
      );

      const safeCustomerName = String(customer.name ?? "customer")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      doc.save(`hafiz-clothes-house-statement-${safeCustomerName || "customer"}.pdf`);
    } catch (error) {
      console.error("Customer statement PDF error:", error);
    } finally {
      setGeneratingStatementId("");
    }
  }

  return (
    <section className="customers-page">
      <div className="customers-hero">
        <div>
          <p className="dashboard-eyebrow">{mounted ? customerCopy.eyebrow : "Customers"}</p>
          <h2>
            {mounted
              ? customerCopy.heroTitle
              : "Customer directory for fast daily retail operations."}
          </h2>
          <p className="dashboard-copy">
            {mounted
              ? customerCopy.heroCopy
              : "Add customers quickly, keep the list clean, and jump into Mera Hisab follow-up from one focused workspace."}
          </p>
        </div>

        <button
          type="button"
          className="customers-primary-action"
          onClick={() => openModal(null)}
        >
          + {customerCopy.addCustomer}
        </button>
      </div>

      {successMessage ? (
        <p className="customers-feedback success">{successMessage}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-[28px] border border-white/18 bg-[linear-gradient(145deg,rgba(35,10,22,0.92),rgba(92,16,44,0.88))] p-6 text-white shadow-[0_24px_80px_rgba(104,16,48,0.28)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,126,179,0.24),transparent_42%)]" />
          <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="relative space-y-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/72" suppressHydrationWarning={true}>
              {customerCopy.summaryRecovery}
            </p>
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              PKR {formatCurrency(portfolioTotals.totalRecovery)}
            </h3>
            <p className="max-w-xs text-sm leading-6 text-white/74" suppressHydrationWarning={true}>
              {activeLanguage === "ur"
                ? "تمام گاہکوں کے بقایاجات کا مجموعی خلاصہ۔"
                : activeLanguage === "roman"
                  ? "Tamam grahakon ke baqayajat ka majmooi khulasa."
                  : "A live view of the full outstanding amount across all customers."}
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[28px] border border-white/18 bg-[linear-gradient(145deg,rgba(24,11,28,0.92),rgba(72,18,58,0.88))] p-6 text-white shadow-[0_24px_80px_rgba(128,20,90,0.24)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,162,209,0.22),transparent_40%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-fuchsia-400/18 blur-3xl" />
          <div className="relative space-y-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/72" suppressHydrationWarning={true}>
              {customerCopy.summaryReceived}
            </p>
            <h3 className="text-3xl font-semibold tracking-tight text-white">
              PKR {formatCurrency(portfolioTotals.totalReceived)}
            </h3>
            <p className="max-w-xs text-sm leading-6 text-white/74" suppressHydrationWarning={true}>
              {activeLanguage === "ur"
                ? "تمام موصول شدہ ادائیگیوں کی اپ ڈیٹ شدہ رقم۔"
                : activeLanguage === "roman"
                  ? "Tamam moosool shuda adaigiyon ki updated raqam."
                  : "A running total of every payment received from the customer base."}
            </p>
          </div>
        </article>
      </section>

      <section className="customers-table-card">
        <div className="customers-table-head">
          <div className="customers-table-title">
            <p className="dashboard-eyebrow">{customerCopy.tableEyebrow}</p>
            <h3>{customerCopy.tableTitle}</h3>
            <p className="customers-table-subtitle">{customerCopy.tableCopy}</p>
          </div>
          <div className="customers-table-actions">
            <div className="customers-filter-row">
              <label className="customers-search-field" htmlFor="customers-search">
                <span>{customerCopy.searchCustomers}</span>
                <input
                  id="customers-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={customerCopy.searchCustomersPlaceholder}
                />
              </label>
              <label className="customers-search-field customers-category-field" htmlFor="customers-category-filter">
                <span>{customerCopy.filterByCategory}</span>
                <select
                  id="customers-category-filter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">{customerCopy.allCategories}</option>
                  <option value="regular">{customerCopy.regularCategory}</option>
                  <option value="retail">{customerCopy.retailCategory}</option>
                </select>
              </label>
              <button
                type="button"
                className={`customers-sort-toggle customers-sort-toggle-control${sortByBalance ? " is-active" : ""}`}
                onClick={() => setSortByBalance((currentValue) => !currentValue)}
                aria-pressed={sortByBalance}
              >
                {customerCopy.sortByBalance}
              </button>
            </div>
            <span className="customers-count">
              {filteredCustomers.length} {customerCopy.records}
            </span>
          </div>
        </div>

        <div className="customers-table-wrap md:hidden">
          <div className="grid gap-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`customers-mobile-skel-${index}`}
                  className="rounded-2xl border border-white/20 bg-white/50 p-3 shadow-sm backdrop-blur-md"
                >
                  <div className="h-4 w-40 rounded bg-black/5" />
                  <div className="mt-2 h-3 w-56 rounded bg-black/5" />
                </div>
              ))
            ) : visibleCustomers.length > 0 ? (
              visibleCustomers.map((customer) => {
                const balance = toNumber(customer.remainingBalance);
                const balanceTone =
                  balance > 0
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700";

                const categoryLabel =
                  customer.categoryBadge?.label ?? customer.trustLevel ?? "-";

                return (
                  <article
                    key={customer.id}
                    className="rounded-2xl border border-white/20 bg-white/50 px-3 py-2.5 shadow-sm backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/customers/${encodeURIComponent(String(customer.id))}`}
                          className="block truncate text-[0.95rem] font-extrabold text-[#4b0000]"
                        >
                          {customer.name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#4b0000]/70">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={13} />
                            <span>{customer.phone}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={13} />
                            <span className="truncate">{customer.city}</span>
                          </span>
                          <span className="text-[#4b0000]/35">|</span>
                          <span>{categoryLabel}</span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl border px-2 py-1 text-xs font-extrabold ${balanceTone}`}
                        title="Balance"
                      >
                        PKR {formatCurrency(balance)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        href={`/ledger?client=${encodeURIComponent(customer.name)}`}
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-[#4b0000]/15 bg-white/60 text-xs font-bold text-[#4b0000] shadow-sm backdrop-blur-md"
                      >
                        {customerCopy.viewLedgerShort}
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-9 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm"
                        onClick={() => openDeleteConfirmation(customer)}
                        aria-label={`Delete ${customer.name}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="customers-empty-state">
                <div className="customers-empty-state-wrap">
                  <div className="customers-empty-illustration" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>{customerCopy.noCustomers}</strong>
                  <p>
                    {searchQuery.trim()
                      ? customerCopy.searchCustomersPlaceholder
                      : customerCopy.noCustomersCopy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="customers-table-wrap hidden md:block">
          <table className="customers-table">
            <colgroup>
              <col className="customers-col-name" />
              <col className="customers-col-phone" />
              <col className="customers-col-city" />
              <col className="customers-col-summary" />
              <col className="customers-col-reminder" />
              <col className="customers-col-ledger" />
              <col className="customers-col-delete" />
            </colgroup>
            <thead>
              <tr>
                <th>{customerCopy.name}</th>
                <th>{customerCopy.phone}</th>
                <th>{customerCopy.city}</th>
                <th>{customerCopy.financialSummary}</th>
                <th>{customerCopy.reminder}</th>
                <th>{customerCopy.ledger}</th>
                <th>{customerCopy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`loading-${index}`} className="customers-row-loading">
                    <td colSpan="7">
                      <div className="customers-loading-row" />
                    </td>
                  </tr>
                ))
              ) : visibleCustomers.length > 0 ? (
                visibleCustomers.map((customer) => (
                  <tr key={customer.id} className="customers-row">
                    <td data-label={customerCopy.name}>
                      <div className="customers-name-cell">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${encodeURIComponent(String(customer.id))}`}
                            className="customers-name-link"
                          >
                            <strong className="leading-tight">{customer.name}</strong>
                          </Link>
                          {customer.isNew ? (
                            <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.08)] animate-pulse">
                              NEW
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={getTrustBadgeClasses(customer.categoryBadge.tone)}
                        >
                          {customer.categoryBadge.label}
                        </span>
                      </div>
                    </td>
                    <td data-label={customerCopy.phone}>{customer.phone}</td>
                    <td data-label={customerCopy.city}>{customer.city}</td>
                    <td data-label={customerCopy.financialSummary}>
                      <div className="customers-finance-stack">
                        <span>
                          <strong>{customerCopy.totalPurchasedShort ?? "Total"}:</strong> PKR{" "}
                          {formatCurrency(customer.totalPurchased)}
                        </span>
                        <span>
                          <strong>{customerCopy.totalPaidShort ?? "Paid"}:</strong> PKR{" "}
                          {formatCurrency(customer.totalPaid)}
                        </span>
                        <span>
                          <strong>{customerCopy.balanceShort ?? "Bal"}:</strong> PKR{" "}
                          {formatCurrency(customer.remainingBalance)}
                        </span>
                      </div>
                    </td>
                    <td data-label={customerCopy.reminder}>
                      {customer.remainingBalance > 0 ? (
                        <button
                          type="button"
                          className="customers-reminder-button"
                          onClick={() => handleSendReminder(customer)}
                        >
                          {customerCopy.sendReminder}
                        </button>
                      ) : (
                        <span className="customers-reminder-clear">{customerCopy.clear}</span>
                      )}
                    </td>
                    <td data-label={customerCopy.ledger}>
                      <div className="customers-ledger-actions">
                        <Link
                          href={`/ledger?client=${encodeURIComponent(customer.name)}`}
                          className="customers-ledger-link"
                        >
                          {customerCopy.viewLedgerShort}
                        </Link>
                        <button
                          type="button"
                          className="customers-pdf-button"
                          onClick={() => handleDownloadStatement(customer)}
                          disabled={generatingStatementId === String(customer.id ?? customer.name)}
                          aria-label={`Download PDF for ${customer.name}`}
                        >
                          <FileDown size={15} aria-hidden="true" />
                          <span className="customers-button-text">
                            {generatingStatementId === String(customer.id ?? customer.name)
                              ? customerCopy.pdfPreparing
                              : customerCopy.downloadPdf}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td data-label={customerCopy.actions}>
                      <div className="customers-row-actions">
                        <button
                          type="button"
                          className="customers-edit-button"
                          onClick={() => openModal(customer)}
                          disabled={
                            deleteKey === `${customer.name}-${customer.phone}-${customer.city}`
                          }
                          aria-label={`Edit ${customer.name}`}
                        >
                          <Pencil size={15} aria-hidden="true" />
                          <span className="customers-button-text">{customerCopy.edit}</span>
                        </button>
                        <button
                          type="button"
                          className="customers-delete-button"
                          onClick={() => openDeleteConfirmation(customer)}
                          disabled={
                            deleteKey === `${customer.name}-${customer.phone}-${customer.city}`
                          }
                      >
                        {deleteKey === `${customer.name}-${customer.phone}-${customer.city}`
                          ? customerCopy.deleting
                          : customerCopy.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="customers-empty-state">
                    <div className="customers-empty-state-wrap">
                      <div className="customers-empty-illustration" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                      <strong>{customerCopy.noCustomers}</strong>
                      <p>{searchQuery.trim() ? customerCopy.searchCustomersPlaceholder : customerCopy.noCustomersCopy}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div
          className="customers-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-customer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customers-modal-head">
              <div>
                <p className="dashboard-eyebrow">
                  {editingCustomer ? customerCopy.editCustomer : customerCopy.newCustomer}
                </p>
                <h3 id="add-customer-title">
                  {editingCustomer ? customerCopy.editModalTitle : customerCopy.modalTitle}
                </h3>
                <p className="dashboard-copy">
                  {editingCustomer ? customerCopy.editModalCopy : customerCopy.modalCopy}
                </p>
              </div>
            </div>

            <form className="customers-form" onSubmit={handleSubmit}>
              <label className="customers-field">
                <span>{customerCopy.fullName}</span>
                <input
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder={customerCopy.fullNamePlaceholder}
                  autoComplete="name"
                />
                {formErrors.fullName ? (
                  <small className="customers-field-error">{formErrors.fullName}</small>
                ) : null}
              </label>

              <label className="customers-field">
                <span>{customerCopy.phoneNumber}</span>
                <input
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder={customerCopy.phonePlaceholder}
                  autoComplete="tel"
                />
                {formErrors.phoneNumber ? (
                  <small className="customers-field-error">
                    {formErrors.phoneNumber}
                  </small>
                ) : null}
              </label>

              <label className="customers-field">
                <span>{customerCopy.city}</span>
                <input
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={handleChange}
                  placeholder={customerCopy.cityPlaceholder}
                  autoComplete="address-level2"
                />
                {formErrors.city ? (
                  <small className="customers-field-error">{formErrors.city}</small>
                ) : null}
              </label>

              <label className="customers-field">
                <span>{customerCopy.categoryField}</span>
                <select
                  name="trustLevel"
                  value={form.trustLevel}
                  onChange={handleChange}
                >
                  <option value="regular">{customerCopy.regularCategory}</option>
                  <option value="retail">{customerCopy.retailCategory}</option>
                </select>
              </label>

              {saveError ? <p className="customers-feedback error">{saveError}</p> : null}

              <div className="customers-form-actions">
                <button
                  type="button"
                  className="customers-secondary-action"
                  onClick={closeModal}
                >
                  {customerCopy.cancel}
                </button>
                <button
                  type="submit"
                  className="customers-primary-action"
                  disabled={isSaving}
                >
                  {isSaving
                    ? customerCopy.saving
                    : editingCustomer
                      ? customerCopy.editCustomer
                      : customerCopy.saveCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDeleteCustomer ? (
        <div
          className="customers-modal-backdrop"
          role="presentation"
          onClick={closeDeleteConfirmation}
        >
          <div
            className="customers-modal customers-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customers-modal-head">
              <div>
                <p className="dashboard-eyebrow">{customerCopy.delete}</p>
                <h3 id="delete-customer-title">Delete Customer</h3>
                <p className="dashboard-copy">
                  Kya aap waqai is customer ko delete karna chahte hain? Inka poora
                  record khatam ho jaye ga.
                </p>
              </div>
            </div>

            <div className="customers-form-actions">
              <button
                type="button"
                className="customers-secondary-action"
                onClick={closeDeleteConfirmation}
                disabled={Boolean(deleteKey)}
              >
                {customerCopy.cancel}
              </button>
              <button
                type="button"
                className="customers-danger-action"
                onClick={() => handleDelete(pendingDeleteCustomer)}
                disabled={Boolean(deleteKey)}
              >
                {deleteKey ===
                `${pendingDeleteCustomer.name}-${pendingDeleteCustomer.phone}-${pendingDeleteCustomer.city}`
                  ? customerCopy.deleting
                  : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

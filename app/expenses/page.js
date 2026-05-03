"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";

const CATEGORY_OPTIONS = ["rent", "electricity", "salary", "tea", "others"];

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  });
}

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeExpenseRow(row, index = 0) {
  const fallbackId = `expense-${index}`;
  const dateValue = row.expense_date ?? row.date ?? row.created_at ?? null;
  const date = safeDate(dateValue);

  return {
    id: row.id ?? fallbackId,
    date,
    dateLabel: date
      ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "-",
    category: row.category ?? "others",
    description: row.description ?? "",
    amount: toNumber(row.amount),
  };
}

async function fetchExpensesSafe() {
  // Try with both possible date columns. If the schema doesn't have one, fall back.
  let result = await supabase
    .from("expenses")
    .select("id, created_at, expense_date, date, category, description, amount")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (result.error) {
    const message = String(result.error.message ?? "");

    if (/expense_date/i.test(message)) {
      result = await supabase
        .from("expenses")
        .select("id, created_at, date, category, description, amount")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    }

    if (result.error && /\\bdate\\b/i.test(String(result.error.message ?? ""))) {
      result = await supabase
        .from("expenses")
        .select("id, created_at, category, description, amount")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    }
  }

  return result;
}

export default function ExpensesPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteId, setDeleteId] = useState("");

  const [form, setForm] = useState({
    date: getTodayInputDate(),
    category: "rent",
    description: "",
    amount: "",
  });

  const isAdmin = session?.role === "admin";
  const canEdit = mounted && isAdmin;

  const ui = useMemo(() => {
    const currentLanguage = language ?? "en";

    const en = {
      eyebrow: "Expenses",
      title: "Expenses",
      subtitle: "Track day-to-day shop expenses in one clean ledger.",
      monthlyTotal: "Total Monthly Expenses",
      monthlyNote: "Auto-summed from entries recorded this month.",
      formTitle: "Add New Expense",
      date: "Date",
      category: "Category",
      description: "Description",
      descriptionPlaceholder: "Enter notes (optional)",
      amount: "Amount",
      actions: "Actions",
      save: "Save",
      saving: "Saving...",
      deleting: "Deleting...",
      delete: "Delete",
      empty: "No expenses recorded yet.",
      completeFields: "Please complete the required fields.",
      validAmount: "Please enter a valid amount.",
      saveFailed: "Unable to save expense. Please try again.",
      deleteConfirm: "Kya aap waqai is expense ko delete karna chahte hain?",
      deleteFailed: "Unable to delete expense.",
      tableMissingHint: "Expenses table is not available yet.",
      categories: {
        rent: "Rent",
        electricity: "Electricity",
        salary: "Staff Salary",
        tea: "Tea/Misc",
        others: "Others",
      },
    };

    const ur = {
      eyebrow: "اخراجات",
      title: "اخراجات",
      subtitle: "دکان کے روزمرہ اخراجات ایک جگہ پر دیکھیں۔",
      monthlyTotal: "اس ماہ کے کل اخراجات",
      monthlyNote: "اس ماہ میں محفوظ شدہ اندراجات سے خودکار جمع۔",
      formTitle: "نیا خرچ درج کریں",
      date: "تاریخ",
      category: "زمرہ",
      description: "تفصیل",
      descriptionPlaceholder: "نوٹس (اختیاری)",
      amount: "قیمت",
      actions: "اقدامات",
      save: "سیو کریں",
      saving: "سیو ہو رہا ہے...",
      deleting: "حذف...",
      delete: "حذف",
      empty: "اب تک کوئی خرچ درج نہیں۔",
      completeFields: "براہ کرم لازمی خانے پورے کریں۔",
      validAmount: "براہ کرم درست قیمت درج کریں۔",
      saveFailed: "خرچ سیو نہیں ہوا۔",
      deleteConfirm: "کیا آپ واقعی اس خرچ کو حذف کرنا چاہتے ہیں؟",
      deleteFailed: "خرچ حذف نہیں ہوا۔",
      tableMissingHint: "اخراجات والی ٹیبل موجود نہیں۔",
      categories: {
        rent: "کرایہ",
        electricity: "بجلی",
        salary: "تنخواہ",
        tea: "چائے/متفرق",
        others: "دیگر",
      },
    };

    if (currentLanguage === "ur") return ur;
    return en;
  }, [language]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function loadExpenses() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await fetchExpensesSafe();

    if (error) {
      console.error("Supabase expenses fetch error:", error.message || error);
      setExpenses([]);
      setIsLoading(false);
      // If the table isn't created yet, show a friendly hint without crashing the page.
      setErrorMessage(ui.tableMissingHint);
      return;
    }

    setExpenses((data ?? []).map(normalizeExpenseRow));
    setIsLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadExpenses();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return expenses.reduce((sum, item) => {
      if (!item.date) return sum;
      if (item.date.getMonth() !== month || item.date.getFullYear() !== year) return sum;
      return sum + toNumber(item.amount);
    }, 0);
  }, [expenses]);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "amount" ? value.replace(/[^\d.]/g, "") : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAdmin) return;

    const trimmedDescription = form.description.trim();
    const trimmedAmount = form.amount.trim();

    if (!form.date || !form.category || !trimmedAmount) {
      setErrorMessage(ui.completeFields);
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(trimmedAmount) || toNumber(trimmedAmount) <= 0) {
      setErrorMessage(ui.validAmount);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    // Prefer expense_date if it exists; if the DB doesn't have it yet we fall back to date.
    let insertResult = await supabase.from("expenses").insert([
      {
        created_at: `${form.date}T12:00:00`,
        expense_date: form.date,
        date: form.date,
        category: form.category,
        description: trimmedDescription,
        amount: toNumber(trimmedAmount),
      },
    ]);

    if (insertResult.error && /expense_date/i.test(insertResult.error.message ?? "")) {
      insertResult = await supabase.from("expenses").insert([
        {
          created_at: `${form.date}T12:00:00`,
          date: form.date,
          category: form.category,
          description: trimmedDescription,
          amount: toNumber(trimmedAmount),
        },
      ]);
    }

    if (insertResult.error && /\bdate\b/i.test(insertResult.error.message ?? "")) {
      insertResult = await supabase.from("expenses").insert([
        {
          created_at: `${form.date}T12:00:00`,
          category: form.category,
          description: trimmedDescription,
          amount: toNumber(trimmedAmount),
        },
      ]);
    }

    if (insertResult.error) {
      console.error("Supabase expenses insert error:", insertResult.error.message || insertResult.error);
      setErrorMessage(ui.saveFailed);
      setIsSaving(false);
      return;
    }

    setForm({
      date: getTodayInputDate(),
      category: "rent",
      description: "",
      amount: "",
    });

    await loadExpenses();
    setIsSaving(false);
  }

  async function handleDelete(expenseId) {
    if (!isAdmin) return;

    const ok = window.confirm(
      ui.deleteConfirm
    );

    if (!ok) return;

    setDeleteId(String(expenseId));
    setErrorMessage("");

    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

    if (error) {
      console.error("Supabase expenses delete error:", error.message || error);
      setErrorMessage(ui.deleteFailed);
      setDeleteId("");
      return;
    }

    setExpenses((current) => current.filter((row) => String(row.id) !== String(expenseId)));
    setDeleteId("");
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section className="expenses-page">
      <div className="expenses-hero">
        <div>
          <p className="dashboard-eyebrow">{ui.eyebrow}</p>
          <h2>{ui.title}</h2>
          <p className="dashboard-copy">{ui.subtitle}</p>
        </div>
        <article className="expenses-summary-card">
          <p className="expenses-summary-label">{ui.monthlyTotal}</p>
          <h3>PKR {formatCurrency(monthlyTotal)}</h3>
          <p className="expenses-summary-footnote">{ui.monthlyNote}</p>
        </article>
      </div>

      <section className="expenses-card">
        <div className="expenses-card-head">
          <div>
            <p className="dashboard-eyebrow">{ui.eyebrow}</p>
            <h3>{ui.formTitle}</h3>
          </div>
        </div>

        <form className="expenses-form" onSubmit={handleSubmit}>
          <label className="expenses-field">
            <span>{ui.date}</span>
            <input name="date" type="date" value={form.date} onChange={handleChange} />
          </label>

          <label className="expenses-field">
            <span>{ui.category}</span>
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {ui.categories?.[value] ?? value}
                </option>
              ))}
            </select>
          </label>

          <label className="expenses-field expenses-field-wide">
            <span>{ui.description}</span>
            <input
              name="description"
              type="text"
              value={form.description}
              onChange={handleChange}
              placeholder={ui.descriptionPlaceholder}
            />
          </label>

          <label className="expenses-field">
            <span>{ui.amount}</span>
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={handleChange}
              placeholder="0"
            />
          </label>

          {errorMessage ? <p className="expenses-feedback error">{errorMessage}</p> : null}

          <div className="expenses-actions">
            <button type="submit" className="expenses-primary" disabled={!canEdit || isSaving}>
              {isSaving ? ui.saving : ui.save}
            </button>
          </div>
        </form>
      </section>

      <section className="expenses-card">
        <div className="expenses-card-head">
          <div>
            <p className="dashboard-eyebrow">{ui.eyebrow}</p>
            <h3>{ui.tableTitle}</h3>
          </div>
        </div>

        <div className="expenses-table-wrap">
          <table className="expenses-table">
            <colgroup>
              <col className="expenses-col-date" />
              <col className="expenses-col-category" />
              <col className="expenses-col-description" />
              <col className="expenses-col-amount" />
              <col className="expenses-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{ui.date}</th>
                <th>{ui.category}</th>
                <th>{ui.description}</th>
                <th>{ui.amount}</th>
                <th>{ui.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`expense-loading-${index}`}>
                    <td colSpan={5}>
                      <div className="expenses-loading-row" />
                    </td>
                  </tr>
                ))
              ) : expenses.length ? (
                expenses.map((row) => (
                  <tr key={row.id} className="expenses-row">
                    <td>{row.dateLabel}</td>
                    <td>{ui.categories?.[row.category] ?? row.category}</td>
                    <td>{row.description || "-"}</td>
                    <td className="expenses-amount">PKR {formatCurrency(row.amount)}</td>
                    <td className="expenses-actions-cell">
                      <button
                        type="button"
                        className="expenses-delete"
                        onClick={() => handleDelete(row.id)}
                        disabled={!canEdit || deleteId === String(row.id)}
                        aria-label={ui.delete}
                      >
                        <Trash2 size={16} />
                        <span>
                          {deleteId === String(row.id) ? ui.deleting : ui.delete}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="expenses-empty">
                    {errorMessage || ui.empty}
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

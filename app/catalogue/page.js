"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";

const initialForm = {
  productName: "",
  stockMeters: "",
  pricePerMeter: "",
  purchasePrice: "",
  wholesalePrice: "",
  category: "",
  imageFile: null,
};

const PRODUCT_COLUMNS_WITH_PURCHASE =
  "id, name, category, stock_meters, price_per_meter, purchase_price, wholesale_price, image_url";

const PRODUCT_COLUMNS_FALLBACK =
  "id, name, category, stock_meters, price_per_meter, wholesale_price, image_url";

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeProducts(data) {
  return (data ?? []).map((item, index) => ({
    id: item.id ?? `${item.name ?? "item"}-${item.category ?? "category"}-${index}`,
    productName: item.name ?? "Unnamed Item",
    stockMeters: Number(item.stock_meters ?? 0),
    pricePerMeter: Number(item.price_per_meter ?? 0),
    purchasePrice: Number(item.purchase_price ?? 0),
    wholesalePrice: Number(item.wholesale_price ?? 0),
    category: item.category ?? "General",
    imageUrl: item.image_url ?? "",
  }));
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function releasePreviewUrl(previewUrl) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

async function fetchProductsWithRetry() {
  let result = await supabase.from("products").select(PRODUCT_COLUMNS_WITH_PURCHASE);

  // If the DB column isn't added yet, Supabase will throw PGRST204.
  // Fall back to a safe column list so the page still renders.
  if (result.error && /purchase_price/i.test(result.error.message ?? "")) {
    result = await supabase.from("products").select(PRODUCT_COLUMNS_FALLBACK);
  }

  if (result.error) {
    await delay(500);
    result = await supabase.from("products").select(PRODUCT_COLUMNS_WITH_PURCHASE);

    if (result.error && /purchase_price/i.test(result.error.message ?? "")) {
      result = await supabase.from("products").select(PRODUCT_COLUMNS_FALLBACK);
    }
  }

  return result;
}

async function insertProductWithRetry(newProduct) {
  let result = await supabase
    .from("products")
    .insert([newProduct])
    .select(PRODUCT_COLUMNS_WITH_PURCHASE);

  if (result.error) {
    await delay(500);
    result = await supabase
      .from("products")
      .insert([newProduct])
      .select(PRODUCT_COLUMNS_WITH_PURCHASE);
  }

  return result;
}

async function updateProductWithRetry(productId, updates) {
  let result = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select(PRODUCT_COLUMNS_WITH_PURCHASE);

  if (result.error) {
    await delay(500);
    result = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select(PRODUCT_COLUMNS_WITH_PURCHASE);
  }

  return result;
}

async function deleteProductWithRetry(productId) {
  let result = await supabase.from("products").delete().eq("id", productId);

  if (result.error) {
    await delay(500);
    result = await supabase.from("products").delete().eq("id", productId);
  }

  return result;
}

function getStoragePathFromPublicUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/product-images/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return "";
    }

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return "";
  }
}

async function removeProductImage(imageUrl) {
  const storagePath = getStoragePathFromPublicUrl(imageUrl);

  if (!storagePath) {
    return;
  }

  const { error } = await supabase.storage.from("product-images").remove([storagePath]);

  if (error) {
    throw error;
  }
}

async function uploadProductImage(file) {
  if (!file) {
    return "";
  }

  const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const filePath = `catalogue/${Date.now()}-${safeName || "product"}.${fileExtension}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);

  return data?.publicUrl ?? "";
}

export default function CataloguePage() {
  const { session } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState("");
  const canSeeWholesalePrice =
    session?.role === "admin" || session?.role === "wholesale";
  const canManageCatalogue = session?.role === "admin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      releasePreviewUrl(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function loadProducts({ showLoading = true } = {}) {
    if (showLoading) {
      setIsLoading(true);
    }

    const { data, error } = await fetchProductsWithRetry();

    if (error) {
      console.error("Full Error Details:", JSON.stringify(error, null, 2));
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setProducts(normalizeProducts(data ?? []));
    setIsLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapProducts() {
      try {
        const { data, error } = await fetchProductsWithRetry();

        if (!isMounted) {
          return;
        }

        if (error) {
          setProducts([]);
          setIsLoading(false);
          return;
        }

        setProducts(normalizeProducts(data ?? []));
        setIsLoading(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setProducts([]);
        setIsLoading(false);
      }
    }

    bootstrapProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  function openModal() {
    releasePreviewUrl(imagePreviewUrl);
    setForm(initialForm);
    setFormErrors({});
    setSaveError("");
    setImagePreviewUrl("");
    setEditingProduct(null);
    setIsModalOpen(true);
  }

  function openEditModal(product) {
    releasePreviewUrl(imagePreviewUrl);

    setEditingProduct(product);
    setForm({
      productName: product.productName,
      stockMeters: String(product.stockMeters),
      pricePerMeter: String(product.pricePerMeter),
      purchasePrice: String(product.purchasePrice ?? ""),
      wholesalePrice: String(product.wholesalePrice),
      category: product.category,
      imageFile: null,
    });
    setFormErrors({});
    setSaveError("");
    setSuccessMessage("");
    setImagePreviewUrl(product.imageUrl ?? "");
    setIsModalOpen(true);
  }

  function closeModal() {
    releasePreviewUrl(imagePreviewUrl);
    setIsModalOpen(false);
    setForm(initialForm);
    setFormErrors({});
    setSaveError("");
    setImagePreviewUrl("");
    setEditingProduct(null);
  }

  function handleChange(event) {
    const { files, name, value } = event.target;

    if (name === "imageFile") {
      const nextFile = files?.[0] ?? null;
      const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : "";

      releasePreviewUrl(imagePreviewUrl);

      setForm((currentForm) => ({
        ...currentForm,
        imageFile: nextFile,
      }));
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        imageFile: "",
      }));
      setImagePreviewUrl(nextPreviewUrl);
      return;
    }

    const nextValue =
      name === "stockMeters" ||
      name === "pricePerMeter" ||
      name === "purchasePrice" ||
      name === "wholesalePrice"
        ? value.replace(/[^\d.]/g, "")
        : value;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: nextValue,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedProductName = form.productName.trim();
    const trimmedStockMeters = form.stockMeters.trim();
    const trimmedPricePerMeter = form.pricePerMeter.trim();
    const trimmedPurchasePrice = form.purchasePrice.trim();
    const trimmedWholesalePrice = form.wholesalePrice.trim();
    const trimmedCategory = form.category.trim();
    const nextErrors = {};

    if (
      !trimmedProductName ||
      !trimmedStockMeters ||
      !trimmedPricePerMeter ||
      !trimmedWholesalePrice ||
      !trimmedCategory
    ) {
      nextErrors.form = "All fields are required.";
    }

    if (!/^\d+(\.\d+)?$/.test(trimmedStockMeters)) {
      nextErrors.stockMeters = "Please enter a valid stock quantity.";
    }

    if (!/^\d+(\.\d+)?$/.test(trimmedPricePerMeter)) {
      nextErrors.pricePerMeter = "Please enter a valid price.";
    }

    if (trimmedPurchasePrice && !/^\d+(\.\d+)?$/.test(trimmedPurchasePrice)) {
      nextErrors.purchasePrice = "Please enter a valid purchase price.";
    }

    if (!/^\d+(\.\d+)?$/.test(trimmedWholesalePrice)) {
      nextErrors.wholesalePrice = "Please enter a valid wholesale price.";
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

    try {
      let imageUrl = editingProduct?.imageUrl ?? "";

      if (form.imageFile) {
        imageUrl = await uploadProductImage(form.imageFile);
      }

      const nextProduct = {
        name: trimmedProductName,
        category: trimmedCategory,
        stock_meters: parseFloat(trimmedStockMeters),
        price_per_meter: parseFloat(trimmedPricePerMeter),
        purchase_price: trimmedPurchasePrice ? parseFloat(trimmedPurchasePrice) : 0,
        wholesale_price: parseFloat(trimmedWholesalePrice),
        image_url: imageUrl,
      };

      const { error } = editingProduct
        ? await updateProductWithRetry(editingProduct.id, nextProduct)
        : await insertProductWithRetry(nextProduct);

      if (error) {
        console.error("Full Error Details:", JSON.stringify(error, null, 2));
        setSaveError("Failed to save product");
        alert("Failed to save product");
        setIsSaving(false);
        return;
      }

      if (editingProduct?.imageUrl && form.imageFile && editingProduct.imageUrl !== imageUrl) {
        try {
          await removeProductImage(editingProduct.imageUrl);
        } catch (imageError) {
          console.error("Failed to remove old product image:", imageError);
        }
      }

      setForm(initialForm);
      setImagePreviewUrl("");
      await loadProducts({ showLoading: false });
      closeModal();
      setSuccessMessage(editingProduct ? "Item updated!" : "Item saved!");
      setIsSaving(false);
    } catch (error) {
      console.error("Full Error Details:", JSON.stringify(error, null, 2));
      setSaveError("Failed to save product");
      alert("Failed to save product");
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!canManageCatalogue) {
      return;
    }

    const shouldDelete = window.confirm(
      "Kya aap waqayi ye item khatam karna chahte hain?"
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingProductId(String(product.id));
    setSaveError("");
    setSuccessMessage("");

    try {
      const { error } = await deleteProductWithRetry(product.id);

      if (error) {
        console.error("Full Error Details:", JSON.stringify(error, null, 2));
        setSaveError("Failed to delete product");
        setDeletingProductId("");
        return;
      }

      if (product.imageUrl) {
        try {
          await removeProductImage(product.imageUrl);
        } catch (imageError) {
          console.error("Failed to remove product image:", imageError);
        }
      }

      setProducts((currentProducts) =>
        currentProducts.filter((item) => String(item.id) !== String(product.id))
      );
      setSuccessMessage("Item deleted!");
    } catch (error) {
      console.error("Full Error Details:", JSON.stringify(error, null, 2));
      setSaveError("Failed to delete product");
    } finally {
      setDeletingProductId("");
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <section className="catalogue-page">
      <div className="catalogue-hero">
        <div>
          <p className="dashboard-eyebrow">Catalogue</p>
          <h2>
            {session?.role === "wholesale"
              ? "Wholesale catalogue with your working rates."
              : "Inventory catalogue for a sharper retail operation."}
          </h2>
          <p className="dashboard-copy">
            {session?.role === "wholesale"
              ? "Review available products, categories, stock visibility, and wholesale rates from one clean customer catalogue."
              : "Track product availability, meter-based stock, price positioning, and category coverage from one professional inventory workspace."}
          </p>
        </div>

        {canManageCatalogue ? (
          <button
            type="button"
            className="catalogue-primary-action"
            onClick={openModal}
          >
            + Add New Item
          </button>
        ) : (
          <div className="catalogue-guest-pill">
            {session?.role === "retail" ? "Retail View" : "Wholesale View"}
          </div>
        )}
      </div>

      {successMessage ? (
        <p className="catalogue-feedback success">{successMessage}</p>
      ) : null}

      <section className="catalogue-table-card">
        <div className="catalogue-table-head">
          <div className="catalogue-table-title">
            <p className="dashboard-eyebrow">Inventory View</p>
            <h3>Catalogue items</h3>
            <p className="catalogue-table-subtitle">
              {canSeeWholesalePrice
                ? "A polished grid of current stock, category placement, and both retail plus wholesale pricing."
                : "A polished grid of current stock, category placement, and customer-facing retail pricing."}
            </p>
          </div>
          <div className="catalogue-table-actions">
            <span className="catalogue-count">{products.length} Items</span>
          </div>
        </div>

        <div className="catalogue-grid">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <article key={`catalogue-loading-${index}`} className="catalogue-card">
                <div className="catalogue-card-image catalogue-card-image-loading" />
                <div className="catalogue-loading-row" />
              </article>
            ))
          ) : products.length > 0 ? (
            products.map((product) => (
              <article key={product.id} className="catalogue-card">
                <div className="catalogue-card-image-wrap">
                  {canManageCatalogue ? (
                    <div className="catalogue-card-tools">
                      <button
                        type="button"
                        className="catalogue-card-tool"
                        onClick={() => openEditModal(product)}
                        aria-label={`Edit ${product.productName}`}
                        title="Edit item"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="catalogue-card-tool catalogue-card-tool-danger"
                        onClick={() => handleDelete(product)}
                        aria-label={`Delete ${product.productName}`}
                        title="Delete item"
                        disabled={deletingProductId === String(product.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : null}
                  <span
                    className={
                      product.stockMeters <= 0
                        ? "catalogue-stock-badge is-out"
                        : product.stockMeters < 50
                          ? "catalogue-stock-badge is-low"
                          : "catalogue-stock-badge"
                    }
                    title={product.stockMeters < 50 ? "Stock Khatam Hone Wala Hai" : undefined}
                  >
                    {formatNumber(product.stockMeters)} m
                  </span>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="catalogue-card-image"
                    />
                  ) : (
                    <div className="catalogue-card-image catalogue-card-image-fallback">
                      <span>{product.productName.slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  {product.stockMeters <= 0 ? (
                    <div className="catalogue-soldout" aria-hidden="true">
                      <span>Sold Out</span>
                    </div>
                  ) : null}
                  <span className="catalogue-category-pill">{product.category}</span>
                </div>

                <div className="catalogue-card-body">
                  <div className="catalogue-card-head">
                    <h4>{product.productName}</h4>
                    <p>{formatNumber(product.stockMeters)} Meters in stock</p>
                  </div>

                  <div className="catalogue-price-grid">
                    <div className="catalogue-price-panel">
                      <span>Retail Rate</span>
                      <strong>PKR {formatCurrency(product.pricePerMeter)}</strong>
                    </div>
                    {canSeeWholesalePrice ? (
                      <div className="catalogue-price-panel">
                        <span>Wholesale Rate</span>
                        <strong>PKR {formatCurrency(product.wholesalePrice)}</strong>
                      </div>
                    ) : null}
                  </div>

                  <p className="catalogue-purchase-price">
                    Purchase Price / قیمتِ خرید:{" "}
                    <strong>PKR {formatCurrency(product.purchasePrice ?? 0)}</strong>
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="catalogue-empty-state">
              <div className="catalogue-empty-state-wrap">
                <div className="catalogue-empty-illustration" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <strong>No items found</strong>
                <p>Add your first product to start building the live catalogue.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {isModalOpen && canManageCatalogue ? (
        <div
          className="catalogue-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="catalogue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="catalogue-modal-head">
              <div>
                <p className="dashboard-eyebrow">
                  {editingProduct ? "Edit Item" : "New Item"}
                </p>
                <h3 id="add-item-title">
                  {editingProduct ? "Update catalogue item" : "Add catalogue item"}
                </h3>
                <p className="dashboard-copy">
                  {editingProduct
                    ? "Update the product details below to save changes in the inventory catalogue."
                    : "Enter the product details below to save them into the inventory catalogue."}
                </p>
              </div>
            </div>

            <form className="catalogue-form" onSubmit={handleSubmit}>
              <label className="catalogue-field">
                <span>Product Name</span>
                <input
                  name="productName"
                  type="text"
                  value={form.productName}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </label>

              <label className="catalogue-field">
                <span>Stock (in Meters)</span>
                <input
                  name="stockMeters"
                  type="text"
                  inputMode="decimal"
                  value={form.stockMeters}
                  onChange={handleChange}
                  placeholder="Enter stock in meters"
                />
                {formErrors.stockMeters ? (
                  <small className="catalogue-field-error">{formErrors.stockMeters}</small>
                ) : null}
              </label>

              <label className="catalogue-field">
                <span>Price per Meter</span>
                <input
                  name="pricePerMeter"
                  type="text"
                  inputMode="decimal"
                  value={form.pricePerMeter}
                  onChange={handleChange}
                  placeholder="Enter price per meter"
                />
                {formErrors.pricePerMeter ? (
                  <small className="catalogue-field-error">
                    {formErrors.pricePerMeter}
                  </small>
                ) : null}
              </label>

              <label className="catalogue-field">
                <span>Purchase Price / قیمتِ خرید</span>
                <input
                  name="purchasePrice"
                  type="text"
                  inputMode="decimal"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  placeholder="Enter purchase price per meter"
                />
                {formErrors.purchasePrice ? (
                  <small className="catalogue-field-error">
                    {formErrors.purchasePrice}
                  </small>
                ) : null}
              </label>

              <label className="catalogue-field">
                <span>Wholesale Rate</span>
                <input
                  name="wholesalePrice"
                  type="text"
                  inputMode="decimal"
                  value={form.wholesalePrice}
                  onChange={handleChange}
                  placeholder="Enter wholesale rate"
                />
                {formErrors.wholesalePrice ? (
                  <small className="catalogue-field-error">
                    {formErrors.wholesalePrice}
                  </small>
                ) : null}
              </label>

              <label className="catalogue-field">
                <span>Category</span>
                <input
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Enter category"
                />
              </label>

              <label className="catalogue-field">
                <span>Product Image</span>
                <input
                  name="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                />
                <small className="catalogue-field-hint">
                  Upload to the `product-images` bucket and save the image URL with the product.
                </small>
              </label>

              {imagePreviewUrl ? (
                <div className="catalogue-image-preview">
                  <img src={imagePreviewUrl} alt="Product preview" />
                </div>
              ) : null}

              {saveError ? <p className="catalogue-feedback error">{saveError}</p> : null}

              <div className="catalogue-form-actions">
                <button
                  type="button"
                  className="catalogue-secondary-action"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="catalogue-primary-action"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Item"
                      : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

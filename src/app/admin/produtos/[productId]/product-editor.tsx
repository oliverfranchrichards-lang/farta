"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createAdminVariant,
  listAdminCompanyPrices,
  upsertAdminCompanyPrice,
  upsertAdminCompanyPrices,
  updateAdminProduct,
  updateAdminVariant,
  uploadAdminProductImage,
  type AdminCategory,
  type AdminProduct,
  type AdminProductImage,
  type AdminVariant,
} from "@/modules/admin/admin.actions";
import styles from "../../catalog-admin.module.css";

type VariantDraft = {
  id: string;
  skuCode: string;
  name: string;
  saleUnit: string;
  minimumQuantity: number;
  status: "ACTIVE" | "INACTIVE";
};

type CompanyOption = {
  id: string;
  display_name: string;
  legal_name?: string;
  tax_id?: string;
};

type ProductEditorProps = {
  product: AdminProduct;
  categories: AdminCategory[];
  initialVariants: AdminVariant[];
  initialImages: AdminProductImage[];
  companies: CompanyOption[];
};

export function ProductEditor({
  product,
  categories,
  initialVariants,
  initialImages,
  companies,
}: ProductEditorProps) {
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [status, setStatus] = useState(product.status);
  const [variants, setVariants] = useState(initialVariants);
  const [images, setImages] = useState(initialImages);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newVariant, setNewVariant] = useState({
    skuCode: "",
    name: "",
    saleUnit: "UNIT",
    minimumQuantity: 1,
    priceCompanyId: companies[0]?.id ?? "",
    price: "",
  });
  const [editingVariant, setEditingVariant] = useState<VariantDraft | null>(
    null,
  );
  const [editingPriceCompanyId, setEditingPriceCompanyId] = useState(
    companies[0]?.id ?? "",
  );
  const [editingPrice, setEditingPrice] = useState("");
  const [applyToAllCompanies, setApplyToAllCompanies] = useState(false);
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const closeDrawerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "variants" | "images">(
    "main",
  );

  function clearFeedback() {
    setNotice("");
    setError("");
  }

  function parsePrice(value: string) {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0
      ? Math.round(parsed * 100)
      : null;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadPrice() {
      if (!editingVariant || !editingPriceCompanyId) return;
      setPriceError("");
      const results = await Promise.all(
        companies.map((company) => listAdminCompanyPrices(company.id)),
      );
      if (cancelled) return;
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok) {
        setPriceError(failed.message);
        return;
      }
      const rows = results.flatMap((result) =>
        result.ok ? result.prices : [],
      );
      const current = rows.find(
        (item) =>
          item.company_id === editingPriceCompanyId &&
          item.sku_id === editingVariant.id,
      );
      setEditingPrice(
        current?.amount_minor == null
          ? ""
          : (current.amount_minor / 100).toFixed(2).replace(".", ","),
      );
      const allHaveSamePrice =
        companies.length > 0 &&
        current?.amount_minor != null &&
        companies.every((company) =>
          rows.some(
            (item) =>
              item.company_id === company.id &&
              item.sku_id === editingVariant.id &&
              item.amount_minor === current.amount_minor,
          ),
        );
      setApplyToAllCompanies(allHaveSamePrice);
    }
    void loadPrice();
    return () => {
      cancelled = true;
    };
  }, [companies, editingVariant, editingPriceCompanyId]);

  useEffect(() => {
    if (!editingVariant) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => closeDrawerRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingVariant(null);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[aria-labelledby='edit-variant-title']");
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, [href]")).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [editingVariant]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearFeedback();
    const result = await updateAdminProduct({
      id: product.id,
      categoryId,
      name,
      brand,
      description,
      status: status as "ACTIVE" | "INACTIVE",
    });
    if (!result.ok) setError(result.message);
    else setNotice("Produto salvo com sucesso.");
    setBusy(false);
  }

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearFeedback();
    const result = await createAdminVariant({
      productId: product.id,
      ...newVariant,
    });
    if (!result.ok) setError(result.message);
    else {
      const newPriceMinor =
        newVariant.priceCompanyId && newVariant.price
          ? parsePrice(newVariant.price)
          : null;
      if (newVariant.price && newPriceMinor === null) {
        setError(
          "Variante criada, mas informe um preço válido maior ou igual a zero.",
        );
        setBusy(false);
        return;
      }
      if (newPriceMinor !== null && result.variant?.id) {
        const priceResult = await upsertAdminCompanyPrice({
          companyId: newVariant.priceCompanyId,
          skuId: result.variant.id,
          amountMinor: newPriceMinor,
        });
        if (!priceResult.ok) {
          setError(
            `Variante criada, mas não foi possível salvar o preço: ${priceResult.message}`,
          );
          setBusy(false);
          return;
        }
      }
      setNotice(
        "Variante criada com sucesso." +
          (newPriceMinor !== null ? " Preço da empresa salvo." : ""),
      );
      setNewVariant({
        skuCode: "",
        name: "",
        saleUnit: "UNIT",
        minimumQuantity: 1,
        priceCompanyId: companies[0]?.id ?? "",
        price: "",
      });
      window.location.reload();
    }
    setBusy(false);
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVariant) return;
    setBusy(true);
    clearFeedback();
    const result = await updateAdminVariant(editingVariant);
    if (!result.ok) setError(result.message);
    else {
      setVariants((current) =>
        current.map((item) =>
          item.id === editingVariant.id
            ? {
                ...item,
                sku_code: editingVariant.skuCode,
                name: editingVariant.name,
                sale_unit: editingVariant.saleUnit,
                minimum_quantity: editingVariant.minimumQuantity,
                status: editingVariant.status,
              }
            : item,
        ),
      );
      setEditingVariant(null);
      setNotice("Variante atualizada com sucesso.");
    }
    setBusy(false);
  }

  async function saveVariantPrice() {
    if (!editingVariant || !editingPriceCompanyId) return;
    const amountMinor = parsePrice(editingPrice);
    if (amountMinor === null) {
      setPriceError("Informe um preço válido maior ou igual a zero.");
      return;
    }
    if (
      applyToAllCompanies &&
      !window.confirm(
        "Este preço será aplicado a todas as empresas autorizadas. Deseja continuar?",
      )
    )
      return;
    setPriceBusy(true);
    setPriceError("");
    const result = applyToAllCompanies
      ? await upsertAdminCompanyPrices({
          companyIds: companies.map((company) => company.id),
          skuId: editingVariant.id,
          amountMinor,
        })
      : await upsertAdminCompanyPrice({
          companyId: editingPriceCompanyId,
          skuId: editingVariant.id,
          amountMinor,
        });
    if (!result.ok) {
      setPriceError(result.message);
      setPriceBusy(false);
      return;
    }
    setNotice(
      applyToAllCompanies
        ? "Preço aplicado a todas as empresas."
        : "Preço da empresa atualizado com sucesso.",
    );
    setPriceBusy(false);
  }

  async function toggleVariant(variant: AdminVariant) {
    setBusy(true);
    clearFeedback();
    const nextStatus = variant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await updateAdminVariant({
      id: variant.id,
      skuCode: variant.sku_code,
      name: variant.name,
      saleUnit: variant.sale_unit,
      minimumQuantity: variant.minimum_quantity,
      status: nextStatus,
    });
    if (!result.ok) setError(result.message);
    else {
      setVariants((current) =>
        current.map((item) =>
          item.id === variant.id ? { ...item, status: nextStatus } : item,
        ),
      );
      setNotice(
        `Variante ${nextStatus === "ACTIVE" ? "ativada" : "inativada"} com sucesso.`,
      );
    }
    setBusy(false);
  }

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageFile) return;
    setBusy(true);
    clearFeedback();
    const result = await uploadAdminProductImage({
      productId: product.id,
      altText: imageAlt,
      file: imageFile,
      isPrimary: images.length === 0,
    });
    if (!result.ok) setError(result.message);
    else {
      setNotice("Imagem cadastrada com sucesso.");
      setImages((current) => [...current, result.image as AdminProductImage]);
      setImageFile(null);
      setImageAlt("");
    }
    setBusy(false);
  }

  return (
    <>
      {notice && <div className={styles.notice} role="status">{notice}</div>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      <nav className={styles.editorTabs} aria-label="Seções do produto">
        <button
          type="button"
          className={activeTab === "main" ? styles.editorTabActive : styles.editorTab}
          aria-current={activeTab === "main" ? "page" : undefined}
          onClick={() => setActiveTab("main")}
        >
          Informações principais
        </button>
        <button
          type="button"
          className={activeTab === "variants" ? styles.editorTabActive : styles.editorTab}
          aria-current={activeTab === "variants" ? "page" : undefined}
          onClick={() => setActiveTab("variants")}
        >
          Variantes <span className={styles.tabCount}>{variants.length}</span>
        </button>
        <button
          type="button"
          className={activeTab === "images" ? styles.editorTabActive : styles.editorTab}
          aria-current={activeTab === "images" ? "page" : undefined}
          onClick={() => setActiveTab("images")}
        >
          Imagens <span className={styles.tabCount}>{images.length}</span>
        </button>
      </nav>

      {activeTab === "main" && (
        <section className={styles.editorLayout}>
          <Card className={styles.formCard}>
        <form className={styles.form} onSubmit={save}>
          <h2>Informações principais</h2>
          <label className={styles.field} htmlFor="product-name">
            Nome do produto
            <input
              id="product-name"
              required
              maxLength={240}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className={styles.field} htmlFor="product-brand">
            Marca
            <input
              id="product-brand"
              maxLength={160}
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
          </label>
          <label className={styles.field} htmlFor="product-category">
            Categoria
            <select
              id="product-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field} htmlFor="product-status">
            Status
            <select
              id="product-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </label>
          <label className={styles.field} htmlFor="product-description">
            Descrição
            <textarea
              id="product-description"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <div className={styles.formActions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar produto"}
            </Button>
          </div>
        </form>
          </Card>
          <aside className={styles.productSummary} aria-label="Resumo do produto">
            <h2>Resumo do produto</h2>
            <strong>{name || product.name}</strong>
            <p className={`${styles.summaryStatus} ${status === "ACTIVE" ? "" : styles.summaryStatusInactive}`}>
              <span aria-hidden="true" />
              Produto {status === "ACTIVE" ? "ativo" : "inativo"}
            </p>
            <p>{brand || "Sem marca"} · {categories.find((category) => category.id === categoryId)?.name ?? "Sem categoria"}</p>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryMetrics}>
              <div><strong>{variants.length}</strong><span>variantes</span></div>
              <div><strong>{images.length}</strong><span>imagens</span></div>
            </div>
          </aside>
        </section>
      )}

      {activeTab === "variants" && <section className={styles.variantSection}>
        <header>
          <h2>Variantes / SKUs</h2>
        </header>
        <div className={styles.variantGrid}>
          {variants.length === 0 ? (
            <Card className={styles.empty}>
              <p>Este produto ainda não possui variantes.</p>
            </Card>
          ) : (
            variants.map((variant) => (
              <div className={styles.variantRow} key={variant.id}>
                <strong>{variant.name}</strong>
                <span className={styles.variantMeta}>
                  SKU {variant.sku_code}
                  <span>
                    {variant.sale_unit} · mínimo {variant.minimum_quantity}
                  </span>
                </span>
                <span
                  className={`${styles.status} ${variant.status === "ACTIVE" ? styles.active : styles.inactive}`}
                >
                  {variant.status === "ACTIVE" ? "Ativa" : "Inativa"}
                </span>
                <div className={styles.variantActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setApplyToAllCompanies(false);
                      setEditingVariant({
                        id: variant.id,
                        skuCode: variant.sku_code,
                        name: variant.name,
                        saleUnit: variant.sale_unit,
                        minimumQuantity: variant.minimum_quantity,
                        status:
                          variant.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
                      });
                    }}
                    disabled={busy}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void toggleVariant(variant)}
                    disabled={busy}
                  >
                    {variant.status === "ACTIVE" ? "Inativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {editingVariant && (
          <div
            className={styles.drawerOverlay}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy && !priceBusy)
                setEditingVariant(null);
            }}
          >
            <Card
              className={`${styles.formCard} ${styles.variantDrawer}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-variant-title"
            >
              <form className={styles.form} onSubmit={saveVariant}>
                <div className={styles.drawerHeader}>
                  <div>
                    <h2 id="edit-variant-title">Editar variante</h2>
                    <p className={styles.confirmHint}>
                      Atualize os dados da variante e o preço aplicado à
                      empresa.
                    </p>
                  </div>
                  <Button
                    ref={closeDrawerRef}
                    type="button"
                    variant="tertiary"
                    onClick={() => setEditingVariant(null)}
                    aria-label="Fechar edição da variante"
                  >
                    ×
                  </Button>
                </div>
                <fieldset className={styles.priceFieldset}>
                  <legend>Preço da empresa</legend>
                  <p className={styles.confirmHint}>
                    A variante é global; o preço abaixo vale somente para a
                    empresa selecionada.
                  </p>
                  <label className={styles.field} htmlFor="edit-price-company">
                    Empresa do preço
                    <select
                      id="edit-price-company"
                      value={editingPriceCompanyId}
                      disabled={applyToAllCompanies}
                      aria-disabled={applyToAllCompanies}
                      onChange={(event) =>
                        setEditingPriceCompanyId(event.target.value)
                      }
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field} htmlFor="edit-variant-price">
                    Preço de venda (R$)
                    <input
                      id="edit-variant-price"
                      inputMode="decimal"
                      value={editingPrice}
                      onChange={(event) => setEditingPrice(event.target.value)}
                    />
                  </label>
                  {priceError && (
                    <div className={styles.error} role="alert">
                      {priceError}
                    </div>
                  )}
                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      onClick={() => void saveVariantPrice()}
                      disabled={priceBusy || !editingPriceCompanyId}
                    >
                      {priceBusy ? "Salvando…" : "Salvar preço da empresa"}
                    </Button>
                  </div>
                </fieldset>
                <label
                  className={styles.checkboxField}
                  htmlFor="edit-price-all"
                >
                  <input
                    id="edit-price-all"
                    type="checkbox"
                    checked={applyToAllCompanies}
                    onChange={(event) =>
                      setApplyToAllCompanies(event.target.checked)
                    }
                    aria-describedby="edit-price-all-help"
                  />{" "}
                  <span>Todas recebem esse preço</span>
                </label>
                <p id="edit-price-all-help" className={styles.confirmHint}>
                  Aplicar este mesmo preço a todas as empresas autorizadas. A
                  caixa é marcada automaticamente quando os preços são iguais.
                </p>
                <label className={styles.field} htmlFor="edit-variant-name">
                  Nome da variante
                  <input
                    id="edit-variant-name"
                    required
                    value={editingVariant.name}
                    onChange={(event) =>
                      setEditingVariant({
                        ...editingVariant,
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.field} htmlFor="edit-variant-sku">
                  Código SKU
                  <input
                    id="edit-variant-sku"
                    required
                    value={editingVariant.skuCode}
                    onChange={(event) =>
                      setEditingVariant({
                        ...editingVariant,
                        skuCode: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.field} htmlFor="edit-variant-unit">
                  Unidade de venda
                  <select
                    id="edit-variant-unit"
                    value={editingVariant.saleUnit}
                    onChange={(event) =>
                      setEditingVariant({
                        ...editingVariant,
                        saleUnit: event.target.value,
                      })
                    }
                  >
                    <option value="UNIT">Unidade</option>
                    <option value="BOX">Caixa</option>
                  </select>
                </label>
                <label className={styles.field} htmlFor="edit-variant-minimum">
                  Venda mínima
                  <input
                    id="edit-variant-minimum"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                    value={editingVariant.minimumQuantity}
                    onChange={(event) =>
                      setEditingVariant({
                        ...editingVariant,
                        minimumQuantity: Number(event.target.value) || 1,
                      })
                    }
                  />
                </label>
                <label className={styles.field} htmlFor="edit-variant-status">
                  Status
                  <select
                    id="edit-variant-status"
                    value={editingVariant.status}
                    onChange={(event) =>
                      setEditingVariant({
                        ...editingVariant,
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </label>
                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingVariant(null)}
                    disabled={busy}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Salvando…" : "Salvar variante"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        <Card className={styles.formCard}>
          <form className={styles.form} onSubmit={addVariant}>
            <h2>Cadastrar variante</h2>
            <fieldset className={styles.priceFieldset}>
              <legend>Preço da empresa (opcional)</legend>
              <p className={styles.confirmHint}>
                A variante será global; este preço será criado somente para a
                empresa selecionada.
              </p>
              <label className={styles.field} htmlFor="new-price-company">
                Empresa do preço
                <select
                  id="new-price-company"
                  value={newVariant.priceCompanyId}
                  onChange={(event) =>
                    setNewVariant({
                      ...newVariant,
                      priceCompanyId: event.target.value,
                    })
                  }
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field} htmlFor="new-variant-price">
                Preço de venda (R$)
                <input
                  id="new-variant-price"
                  inputMode="decimal"
                  value={newVariant.price}
                  onChange={(event) =>
                    setNewVariant({ ...newVariant, price: event.target.value })
                  }
                />
              </label>
            </fieldset>
            <label className={styles.field} htmlFor="variant-name">
              Nome da variante
              <input
                id="variant-name"
                required
                value={newVariant.name}
                onChange={(event) =>
                  setNewVariant({ ...newVariant, name: event.target.value })
                }
              />
            </label>
            <label className={styles.field} htmlFor="variant-sku">
              Código SKU
              <input
                id="variant-sku"
                required
                value={newVariant.skuCode}
                onChange={(event) =>
                  setNewVariant({ ...newVariant, skuCode: event.target.value })
                }
              />
            </label>
            <label className={styles.field} htmlFor="variant-unit">
              Unidade de venda
              <select
                id="variant-unit"
                value={newVariant.saleUnit}
                onChange={(event) =>
                  setNewVariant({ ...newVariant, saleUnit: event.target.value })
                }
              >
                <option value="UNIT">Unidade</option>
                <option value="BOX">Caixa</option>
              </select>
            </label>
            <label className={styles.field} htmlFor="variant-minimum">
              Venda mínima
              <input
                id="variant-minimum"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                required
                value={newVariant.minimumQuantity}
                onChange={(event) =>
                  setNewVariant({
                    ...newVariant,
                    minimumQuantity: Number(event.target.value) || 1,
                  })
                }
              />
            </label>
            <div className={styles.formActions}>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando…" : "Cadastrar variante"}
              </Button>
            </div>
          </form>
        </Card>

      </section>}

      {activeTab === "images" && <section className={styles.imagesSection}>
        <Card className={styles.imageCard}>
          <form className={styles.form} onSubmit={uploadImage}>
            <div className={styles.sectionHeading}>
              <div><h2>Imagens do produto</h2><p>Adicione fotos claras para facilitar a identificação do produto no catálogo.</p></div>
              <span className={styles.count}>{images.length}</span>
            </div>
            <div className={styles.imageUpload}>
              <span className={styles.uploadIcon} aria-hidden="true">⌁</span>
              <strong>Arraste uma imagem ou selecione um arquivo</strong>
              <span className={styles.imageMeta}>JPEG, PNG ou WebP · até 5 MB</span>
              <label className={styles.filePicker} htmlFor="product-image">Selecionar arquivo<input id="product-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
            </div>
            <label className={styles.field} htmlFor="product-image-alt">Texto alternativo<input id="product-image-alt" required placeholder="Descreva a imagem para acessibilidade" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} /></label>
            <div className={styles.formActions}><Button type="submit" disabled={busy || !imageFile}>{busy ? "Enviando…" : "Cadastrar imagem"}</Button></div>
          </form>
        </Card>
      </section>}
    </>
  );
}

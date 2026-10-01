"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createEstablishment } from "@/modules/admin/admin.actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import styles from "../../../../admin.module.css";

export function EstablishmentForm({ companyId }: { companyId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const errorRef = useRef<HTMLDivElement>(null); const [form, setForm] = useState<Record<string,string>>({});
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [key]: e.target.value }));
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); setLoading(true); try { const r = await createEstablishment({ companyId, name: form.name ?? "", address: { label: form.label ?? "", addressLine: form.addressLine ?? "", addressNumber: form.addressNumber ?? "", addressComplement: form.addressComplement, district: form.district ?? "", city: form.city ?? "", state: form.state ?? "", postalCode: form.postalCode ?? "" } }); if (!r.ok) { setError(r.message); queueMicrotask(() => errorRef.current?.focus()); return; } router.push(`/admin/empresas/${companyId}/estabelecimentos`); } catch { setError("Não foi possível criar o estabelecimento. Revise os dados e tente novamente."); queueMicrotask(() => errorRef.current?.focus()); } finally { setLoading(false); } }
  const field = (id: string, label: string, wide = false) => <div className={wide ? styles.wide : ""}><Input id={id} label={label} value={form[id] ?? ""} onChange={set(id)} required={id !== "addressComplement"} /></div>;
  return <Card className={styles.card}><form onSubmit={submit} aria-busy={loading} aria-describedby={error ? "establishment-form-error" : undefined}>{error && <div id="establishment-form-error" ref={errorRef} tabIndex={-1} className={styles.feedback} role="alert" aria-live="assertive">{error}</div>}<fieldset className={styles.section}><legend>Identificação</legend><div className={styles.grid}>{field("name", "Nome do estabelecimento", true)}</div></fieldset><fieldset className={styles.section}><legend>Endereço principal</legend><div className={styles.grid}>{field("label", "Identificação do endereço")}{field("addressLine", "Logradouro", true)}{field("addressNumber", "Número")}{field("addressComplement", "Complemento")}{field("district", "Bairro")}{field("city", "Cidade")}{field("state", "UF")}{field("postalCode", "CEP")}</div></fieldset><div className={styles.actions}><Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Criar estabelecimento"}</Button></div></form></Card>;
}

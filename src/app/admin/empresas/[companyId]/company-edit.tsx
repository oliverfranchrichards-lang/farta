'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCompanyStatus, updateCompany } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import styles from '../../admin.module.css';

const groups = [
  { title: 'Dados cadastrais', fields: [['legal_name', 'Razão social'], ['display_name', 'Nome fantasia'], ['tax_id', 'CNPJ'], ['state_registration', 'Inscrição estadual'], ['corporate_email', 'E-mail corporativo', 'email'], ['corporate_phone', 'Telefone corporativo']] },
  { title: 'Endereço fiscal', fields: [['fiscal_address_line', 'Logradouro'], ['fiscal_address_number', 'Número'], ['fiscal_address_complement', 'Complemento'], ['fiscal_district', 'Bairro'], ['fiscal_city', 'Cidade'], ['fiscal_state', 'UF'], ['fiscal_postal_code', 'CEP']] },
  { title: 'Contatos', fields: [['legal_representative_name', 'Representante legal'], ['legal_representative_email', 'E-mail do representante', 'email'], ['legal_representative_phone', 'Telefone do representante'], ['operational_contact_name', 'Contato operacional'], ['operational_contact_email', 'E-mail operacional', 'email'], ['operational_contact_phone', 'Telefone operacional']] },
  { title: 'Condições comerciais', fields: [['payment_terms_days', 'Prazo de pagamento (dias)', 'number'], ['credit_limit_reais', 'Limite de crédito (R$)', 'number']] },
] as const;
const optional = new Set(['state_registration', 'corporate_phone', 'fiscal_address_complement', 'legal_representative_phone', 'operational_contact_phone']);

export function CompanyEdit({ companyId, company }: { companyId: string; company: Record<string, unknown> }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const group of groups) for (const [key] of group.fields) initial[key] = key === 'credit_limit_reais' ? (Number(company.credit_limit_minor ?? 0) / 100).toFixed(2) : String(company[key] ?? '');
    return initial;
  });
  const [status, setStatus] = useState(String(company.status ?? 'ACTIVE'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  function fail(message: string) { setError(message); queueMicrotask(() => errorRef.current?.focus()); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    const credit = Number(form.credit_limit_reais);
    if (!/^\d+(\.\d{1,2})?$/.test(form.credit_limit_reais) || !Number.isSafeInteger(Math.round(credit * 100))) { fail('Informe um limite de crédito válido, com no máximo duas casas decimais.'); return; }
    setLoading(true);
    try {
      const result = await updateCompany(companyId, { ...form, credit_limit_minor: Math.round(credit * 100), payment_terms_days: Number(form.payment_terms_days) });
      if (!result.ok) fail(result.message);
      else { setSuccess('Empresa atualizada com sucesso.'); router.refresh(); }
    } catch { fail('Não foi possível atualizar a empresa. Tente novamente.'); }
    finally { setLoading(false); }
  }
  async function changeStatus() {
    const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true); setError(''); setSuccess('');
    try {
      const result = await setCompanyStatus(companyId, next);
      if (!result.ok) fail(result.message);
      else { setStatus(next); setConfirmOpen(false); setSuccess(next === 'ACTIVE' ? 'Empresa ativada.' : 'Empresa desativada.'); router.refresh(); }
    } catch { fail('Não foi possível atualizar o status da empresa.'); }
    finally { setLoading(false); }
  }
  return <Card className={styles.card}>
    <div className={styles.statusRow}><span>Status: <Badge tone={status === 'ACTIVE' ? 'success' : status === 'BLOCKED' ? 'error' : 'default'}>{status === 'ACTIVE' ? 'Ativa' : status === 'INACTIVE' ? 'Inativa' : status === 'PENDING_SETUP' ? 'Aguardando configuração' : 'Bloqueada'}</Badge></span>{(status === 'ACTIVE' || status === 'INACTIVE') && <Button type='button' variant={status === 'ACTIVE' ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)} disabled={loading}>{status === 'ACTIVE' ? 'Desativar empresa' : 'Ativar empresa'}</Button>}</div>
    <ConfirmDialog open={confirmOpen} title={status === 'ACTIVE' ? 'Desativar empresa?' : 'Ativar empresa?'} description={status === 'ACTIVE' ? 'Os usuários perderão acesso até a reativação. Os pedidos existentes serão preservados.' : 'Os usuários voltarão a ter acesso conforme suas permissões.'} confirmLabel={status === 'ACTIVE' ? 'Desativar empresa' : 'Ativar empresa'} destructive={status === 'ACTIVE'} busy={loading} onCancel={() => setConfirmOpen(false)} onConfirm={() => void changeStatus()} />
    <form onSubmit={submit} aria-busy={loading} aria-describedby={error ? 'company-edit-error' : success ? 'company-edit-success' : undefined}>
      {error && <div id='company-edit-error' className={styles.feedback} role='alert' tabIndex={-1} ref={errorRef}>{error}</div>}
      {success && <div id='company-edit-success' className={styles.success} role='status'>{success}</div>}
      {groups.map(group => <fieldset className={styles.section} key={group.title}><legend>{group.title}</legend><div className={styles.grid}>{group.fields.map(([key, label, type]) => <Input key={key} id={key} label={label} type={type ?? 'text'} value={form[key] ?? ''} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} required={!optional.has(key)} min={type === 'number' ? '0' : undefined} step={key === 'credit_limit_reais' ? '0.01' : type === 'number' ? '1' : undefined} />)}</div></fieldset>)}
      <div className={styles.actions}><Button type='button' variant='secondary' onClick={() => router.back()}>Cancelar</Button><Button type='submit' disabled={loading}>{loading ? 'Salvando…' : 'Salvar alterações'}</Button></div>
    </form>
  </Card>;
}

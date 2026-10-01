'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCompany } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import styles from '../../admin.module.css';

const optional = new Set(['stateRegistration', 'corporatePhone', 'fiscalAddressComplement', 'legalRepresentativePhone', 'operationalContactPhone']);
const groups = [
  { title: 'Dados cadastrais', fields: [['legalName', 'Razão social'], ['displayName', 'Nome fantasia'], ['taxId', 'CNPJ'], ['stateRegistration', 'Inscrição estadual'], ['corporateEmail', 'E-mail corporativo', 'email'], ['corporatePhone', 'Telefone corporativo']] },
  { title: 'Endereço fiscal', fields: [['fiscalAddressLine', 'Logradouro'], ['fiscalAddressNumber', 'Número'], ['fiscalAddressComplement', 'Complemento'], ['fiscalDistrict', 'Bairro'], ['fiscalCity', 'Cidade'], ['fiscalState', 'UF'], ['fiscalPostalCode', 'CEP']] },
  { title: 'Contatos', fields: [['legalRepresentativeName', 'Representante legal'], ['legalRepresentativeEmail', 'E-mail do representante', 'email'], ['legalRepresentativePhone', 'Telefone do representante'], ['operationalContactName', 'Contato operacional'], ['operationalContactEmail', 'E-mail operacional', 'email'], ['operationalContactPhone', 'Telefone operacional']] },
  { title: 'Condições comerciais', fields: [['paymentTermsDays', 'Prazo de pagamento (dias)', 'number'], ['creditLimitReais', 'Limite de crédito (R$)', 'number']] },
] as const;

export function CompanyForm() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  function fail(message: string) { setError(message); queueMicrotask(() => errorRef.current?.focus()); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const credit = Number(form.creditLimitReais ?? '0');
    if (!/^\d+(\.\d{1,2})?$/.test(form.creditLimitReais ?? '0') || !Number.isSafeInteger(Math.round(credit * 100))) { fail('Informe um limite de crédito válido, com no máximo duas casas decimais.'); return; }
    setLoading(true);
    try {
      const result = await createCompany({
        legalName: form.legalName ?? '', displayName: form.displayName ?? '', taxId: form.taxId ?? '',
        stateRegistration: form.stateRegistration, corporateEmail: form.corporateEmail ?? '', corporatePhone: form.corporatePhone,
        fiscalAddressLine: form.fiscalAddressLine ?? '', fiscalAddressNumber: form.fiscalAddressNumber ?? '',
        fiscalAddressComplement: form.fiscalAddressComplement, fiscalDistrict: form.fiscalDistrict ?? '',
        fiscalCity: form.fiscalCity ?? '', fiscalState: form.fiscalState ?? '', fiscalPostalCode: form.fiscalPostalCode ?? '',
        legalRepresentativeName: form.legalRepresentativeName ?? '', legalRepresentativeEmail: form.legalRepresentativeEmail ?? '',
        legalRepresentativePhone: form.legalRepresentativePhone, operationalContactName: form.operationalContactName ?? '',
        operationalContactEmail: form.operationalContactEmail ?? '', operationalContactPhone: form.operationalContactPhone,
        paymentTermsDays: Number(form.paymentTermsDays ?? 0), creditLimitMinor: Math.round(credit * 100),
      });
      if (!result.ok) { fail(result.message); return; }
      router.push(`/admin/empresas/${result.company.id}/estabelecimentos/novo`);
    } catch { fail('Não foi possível criar a empresa. Revise os dados e tente novamente.'); }
    finally { setLoading(false); }
  }
  return <Card className={styles.card}><form onSubmit={submit} aria-busy={loading} aria-describedby={error ? 'company-form-error' : undefined}>
    {error && <div id='company-form-error' ref={errorRef} tabIndex={-1} className={styles.feedback} role='alert'>{error}</div>}
    {groups.map(group => <fieldset className={styles.section} key={group.title}><legend>{group.title}</legend><div className={styles.grid}>{group.fields.map(([key, label, type]) => <Input key={key} id={key} label={label} type={type ?? 'text'} value={form[key] ?? ''} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} required={!optional.has(key)} min={type === 'number' ? '0' : undefined} step={key === 'creditLimitReais' ? '0.01' : type === 'number' ? '1' : undefined} />)}</div></fieldset>)}
    <div className={styles.actions}><Button type='button' variant='secondary' onClick={() => router.back()}>Cancelar</Button><Button type='submit' disabled={loading}>{loading ? 'Salvando…' : 'Criar empresa'}</Button></div>
  </form></Card>;
}

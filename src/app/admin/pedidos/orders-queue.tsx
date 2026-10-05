'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { advanceOrderStatus, assignCompanyOrderDriver, getCompanyOrderDetails, listAdminOrders, listCompanyDrivers, listCompanyOrders, setOrderFinalPrices, startCompanyOrderPicking, startOrderPicking, type AdminOrder, type CompanyDriver, type CompanyOrderDetails } from '@/modules/admin/admin.actions';
import { formatBrazilPhone, whatsappUrl } from '@/lib/contact/phone';
import styles from './orders-queue.module.css';

const labels: Record<string, string> = {
  SUBMITTED_FOR_REVIEW: 'Aguardando análise',
  PRICED_AWAITING_CUSTOMER_CONFIRMATION: 'Aguardando cliente',
  CUSTOMER_CONFIRMED: 'Confirmado',
  CONFIRMED: 'Confirmado',
  PICKING: 'Em separação',
  READY_FOR_DISPATCH: 'Pronto para envio',
  DISPATCHED: 'Em rota',
  DELIVERED: 'Entregue',
  RECEIPT_CONFIRMED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const tone = (status: string) => {
  if (status === 'CANCELLED') return 'error' as const;
  if (status === 'DELIVERED' || status === 'RECEIPT_CONFIRMED') return 'success' as const;
  if (status === 'PICKING' || status === 'PRICED_AWAITING_CUSTOMER_CONFIRMATION') return 'warning' as const;
  if (status === 'READY_FOR_DISPATCH' || status === 'DISPATCHED') return 'info' as const;
  return 'default' as const;
};

const money = (minor: number) =>
  (minor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = { initial: AdminOrder[]; initialError: string; scope?: 'admin' | 'company' | 'driver' };

export function OrdersQueue({ initial, initialError, scope = 'admin' }: Props) {
  const [orders, setOrders] = useState(initial);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(initialError);
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>(initialError ? 'error' : 'success');
  const [busy, setBusy] = useState('');
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [detailOrder, setDetailOrder] = useState<CompanyOrderDetails | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [finalPriceValues, setFinalPriceValues] = useState<Record<string, string>>({});
  const [finalPriceReason, setFinalPriceReason] = useState('');
  const [exportBusy, setExportBusy] = useState<'xlsx' | 'pdf' | ''>('');
  const closeDetailRef = useRef<HTMLButtonElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!detailOrder) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeDetailRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDetails();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = closeDetailRef.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [detailOrder]);

  async function openDetails(orderId: string, trigger?: HTMLButtonElement) {
    detailTriggerRef.current = trigger ?? null;
    setDetailBusy(true);
    setNotice('');
    const result = await getCompanyOrderDetails(orderId);
    if (result.ok) {
      setDetailOrder(result.order);
      setFinalPriceValues(Object.fromEntries(result.order.items.map((item) => [item.skuId, ((item.finalUnitPriceMinor ?? item.approximateUnitPriceMinor ?? item.unitPriceMinor) / 100).toFixed(2)])));
      setFinalPriceReason('');
    }
    else { setNoticeTone('error'); setNotice(result.message); }
    setDetailBusy(false);
  }

  function closeDetails() {
    setDetailOrder(null);
    detailTriggerRef.current?.focus();
  }

  function showNotice(message: string, kind: 'success' | 'error') {
    setNoticeTone(kind);
    setNotice(message);
  }

  async function downloadOrder(format: 'xlsx' | 'pdf') {
    if (!detailOrder || exportBusy) return;
    setExportBusy(format);
    setNotice('');
    try {
      const response = await fetch(`/api/operacao/pedidos/${detailOrder.id}/export?format=${format}`);
      if (!response.ok) throw new Error('EXPORT_FAILED');
      const fileUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `pedido-${detailOrder.orderNumber}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
    } catch {
      showNotice('Não foi possível baixar o pedido. Tente novamente.', 'error');
    } finally {
      setExportBusy('');
    }
  }

  useEffect(() => {
    if (scope !== 'company') return;
    void listCompanyDrivers().then((result) => {
      if (result.ok) setDrivers(result.drivers);
      else showNotice(result.message, 'error');
    });
  }, [scope]);

  useEffect(() => {
    const timer = window.setInterval(() => { if (!busy) void refresh(); }, 30000);
    return () => window.clearInterval(timer);
  // refresh is intentionally recreated with the current scope/status for the polling callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, status, scope]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = !status || order.status === status;
      const matchesQuery = !normalized ||
        String(order.order_number).includes(normalized) ||
        order.company_name.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, status]);

  async function refresh(nextStatus = status) {
    const requestedStatus = scope === 'driver' ? 'DISPATCHED' : nextStatus || undefined;
    const result = scope === 'admin' ? await listAdminOrders(requestedStatus) : await listCompanyOrders(requestedStatus);
    if (result.ok) setOrders(result.orders);
    else showNotice(result.message, 'error');
  }

  async function start(order: AdminOrder) {
    setBusy(order.id);
    setNotice('');
    const result = scope === 'company' ? await startCompanyOrderPicking(order.id) : await startOrderPicking(order.id);
    if (!result.ok) {
      showNotice(result.message, 'error');
      setBusy('');
      return false;
    } else {
      showNotice('Separação iniciada.', 'success');
      await refresh();
    }
    setBusy('');
    return true;
  }

  async function advance(order: AdminOrder, toStatus: 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'DELIVERED') {
    setBusy(order.id); setNotice('');
    const result = await advanceOrderStatus(order.id, toStatus);
    if (!result.ok) showNotice(result.message, 'error'); else { showNotice('Status atualizado.', 'success'); await refresh(); }
    setBusy('');
  }

  async function assignAndDispatch(order: AdminOrder) {
    const driverId = selectedDrivers[order.id];
    if (!driverId) {
      showNotice('Selecione um entregador antes de enviar o pedido para rota.', 'error');
      return;
    }
    setBusy(order.id); setNotice('');
    const assignment = await assignCompanyOrderDriver(order.id, driverId);
    if (!assignment.ok) {
      showNotice(assignment.message, 'error');
      setBusy('');
      return;
    }
    const result = await advanceOrderStatus(order.id, 'DISPATCHED');
    if (!result.ok) showNotice(result.message, 'error');
    else { showNotice('Pedido atribuído e enviado para rota.', 'success'); await refresh(); }
    setBusy('');
  }

  async function saveFinalPrices() {
    if (!detailOrder) return;
    const invalidPrice = detailOrder.items.some((item) => {
      const value = finalPriceValues[item.skuId]?.trim().replace(',', '.') ?? '';
      const parsed = Number(value);
      return value === '' || !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalidPrice) {
      showNotice('Informe um preço final válido para cada item.', 'error');
      return;
    }
    setDetailBusy(true);
    setNotice('');
    const items = detailOrder.items.map((item) => ({ skuId: item.skuId, unitPriceMinor: Math.round(Number(finalPriceValues[item.skuId].replace(',', '.')) * 100) }));
    const result = await setOrderFinalPrices(detailOrder.id, items, finalPriceReason);
    if (!result.ok) {
      showNotice(result.message, 'error');
      setDetailBusy(false);
      return;
    }
    showNotice('Preços finais salvos. O cliente já pode revisar o pedido.', 'success');
    closeDetails();
    await refresh();
    setDetailBusy(false);
  }

  const action = (order: AdminOrder) => scope === 'driver' && order.status === 'DISPATCHED' ? (
    <Button type="button" onClick={() => void advance(order, 'DELIVERED')} disabled={busy === order.id}>{busy === order.id ? 'Confirmando…' : 'Confirmar entrega'}</Button>
  ) : scope === 'company' && order.status === 'PICKING' ? (
    <Button type="button" onClick={() => void advance(order, 'READY_FOR_DISPATCH')} disabled={busy === order.id}>{busy === order.id ? 'Atualizando…' : 'Marcar pronto'}</Button>
  ) : scope === 'company' && order.status === 'READY_FOR_DISPATCH' ? (
    <div className={styles.dispatchAction}>
      <select
        aria-label={`Entregador do pedido ${order.order_number}`}
        value={selectedDrivers[order.id] ?? ''}
        onChange={(event) => setSelectedDrivers((current) => ({ ...current, [order.id]: event.target.value }))}
        disabled={busy === order.id}
      >
        <option value="">Selecionar entregador</option>
        {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
      </select>
      <Button type="button" onClick={() => void assignAndDispatch(order)} disabled={busy === order.id || drivers.length === 0}>
        {busy === order.id ? 'Atualizando…' : 'Enviar para rota'}
      </Button>
    </div>
  ) : (order.status === 'CONFIRMED' || order.status === 'CUSTOMER_CONFIRMED') && scope !== 'driver' ? (
    <Button type="button" onClick={() => void start(order)} disabled={busy === order.id}>
      {busy === order.id ? 'Iniciando…' : 'Iniciar separação'}
    </Button>
  ) : <span aria-label="Sem ação">—</span>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{scope === 'driver' ? 'ENTREGAS' : 'OPERAÇÃO'}</div>
        <h1>{scope === 'driver' ? 'Entregas atribuídas' : 'Fila de pedidos'}</h1>
        <p>{scope === 'driver' ? 'Acompanhe os pedidos em rota e confirme cada entrega.' : 'Monitore pedidos em análise e conduza a separação da operação.'}</p>
      </header>

      <section className={styles.summary} aria-label="Resumo da fila">
        <Card><strong>{orders.length}</strong><span>{scope === 'driver' ? 'Entregas atribuídas' : 'Pedidos carregados'}</span></Card>
        <Card><strong>{scope === 'driver' ? orders.filter((order) => order.status === 'DISPATCHED').length : orders.filter((order) => order.status === 'CONFIRMED' || order.status === 'CUSTOMER_CONFIRMED').length}</strong><span>{scope === 'driver' ? 'Em rota' : 'Aguardando separação'}</span></Card>
        <Card><strong>{scope === 'driver' ? orders.reduce((sum, order) => sum + order.units, 0) : orders.filter((order) => order.status === 'PICKING').length}</strong><span>{scope === 'driver' ? 'Unidades em rota' : 'Em separação'}</span></Card>
      </section>

      <Card className={styles.panel}>
        <div className={styles.toolbar}>
          <Input id="admin-order-search" type="search" label="Buscar pedido ou empresa" placeholder="Número ou nome da empresa" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className={styles.selectLabel} htmlFor="admin-order-status">
            Status
            <select id="admin-order-status" value={status} onChange={(event) => { setStatus(event.target.value); void refresh(event.target.value); }}>
              <option value="">Todos</option>
              {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <Button type="button" variant="tertiary" className={styles.clearFilter} disabled={!query && !status} onClick={() => { setQuery(''); setStatus(''); void refresh(''); }}>Limpar filtros</Button>
        </div>

        <p className={styles.filterSummary} role="status">{visible.length} pedido{visible.length === 1 ? '' : 's'} exibido{visible.length === 1 ? '' : 's'}{query || status ? ' com os filtros aplicados' : ' na fila'}</p>
        {detailBusy && !detailOrder && <p className={styles.loading} role="status">Carregando detalhes do pedido…</p>}
          {notice && !detailOrder && <div className={`${styles.notice} ${noticeTone === 'error' ? styles.errorNotice : ''}`} role={noticeTone === 'error' ? 'alert' : 'status'} aria-live={noticeTone === 'error' ? 'assertive' : 'polite'}>{notice}</div>}

        {visible.length === 0 ? (
          <div className={styles.empty} role="status">
            <strong>Nenhum pedido encontrado</strong>
            <p>{query || status ? 'Tente ajustar a busca ou limpar os filtros.' : 'Os pedidos enviados aparecerão aqui para acompanhamento.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.visuallyHidden}>Fila operacional de pedidos</caption>
              <thead><tr><th scope="col">Pedido</th><th scope="col">Empresa</th><th scope="col">Estabelecimento</th><th scope="col">Data</th><th scope="col">Itens</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Ação</th></tr></thead>
              <tbody>{visible.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.order_number}</strong></td><td>{order.company_name}</td><td>{order.establishment_name}</td>
                  <td>{new Date(order.created_at).toLocaleString('pt-BR')}</td><td>{order.units}</td><td>{money(order.total_minor)}</td>
                  <td><Badge tone={tone(order.status)}>{labels[order.status] ?? order.status}</Badge></td><td><div className={styles.rowActions}><Button type="button" variant="secondary" onClick={(event) => void openDetails(order.id, event.currentTarget)} disabled={detailBusy}>Ver detalhes</Button>{action(order)}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <div className={styles.mobileList}>
          {visible.map((order) => (
            <Card key={order.id} className={styles.mobileCard}>
              <div className={styles.mobileTitle}><strong>#{order.order_number}</strong><Badge tone={tone(order.status)}>{labels[order.status] ?? order.status}</Badge></div>
              <p>{order.company_name} · {order.establishment_name}</p>
              <p>{new Date(order.created_at).toLocaleString('pt-BR')} · {order.units} itens</p>
              <strong>{money(order.total_minor)}</strong>
              <div className={styles.rowActions}><Button type="button" variant="secondary" onClick={(event) => void openDetails(order.id, event.currentTarget)} disabled={detailBusy}>Ver detalhes</Button>{(scope !== 'driver' || order.status === 'DISPATCHED') && action(order)}</div>
            </Card>
          ))}
        </div>
      </Card>
      {detailOrder && <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="order-detail-title" aria-describedby="order-detail-context" aria-busy={detailBusy || Boolean(exportBusy)}>
          <div className={styles.drawerHeader}><div><p className={styles.eyebrow}>DETALHES DO PEDIDO</p><h2 id="order-detail-title">Pedido #{detailOrder.orderNumber}</h2></div><button ref={closeDetailRef} className={styles.close} type="button" onClick={closeDetails} aria-label="Fechar detalhes">×</button></div>
          <div className={styles.drawerMeta} id="order-detail-context"><Badge tone={tone(detailOrder.status)}>{labels[detailOrder.status] ?? detailOrder.status}</Badge><span>{detailOrder.companyName} · {detailOrder.establishmentName}</span><span>{new Date(detailOrder.createdAt).toLocaleString('pt-BR')}</span></div>
          {notice && <div className={`${styles.notice} ${noticeTone === 'error' ? styles.errorNotice : ''}`} role={noticeTone === 'error' ? 'alert' : 'status'} aria-live={noticeTone === 'error' ? 'assertive' : 'polite'}>{notice}</div>}
          <section className={styles.contact} aria-labelledby="order-contact-title">
            <h3 id="order-contact-title">Contato do cliente</h3>
            <span className={styles.contactName}>{detailOrder.customer?.name || 'Cliente'}</span>
            {formatBrazilPhone(detailOrder.customer?.phone) && whatsappUrl(detailOrder.customer?.phone) ? <>
              <span className={styles.contactPhone}>{formatBrazilPhone(detailOrder.customer?.phone)}</span>
              <a className={styles.whatsappLink} href={whatsappUrl(detailOrder.customer?.phone) ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`Conversar pelo WhatsApp com ${detailOrder.customer?.name || 'cliente'} (abre em nova aba)`}>Conversar pelo WhatsApp (abre em nova aba)</a>
            </> : <p className={styles.contactUnavailable}>Telefone não informado ou indisponível para contato.</p>}
          </section>
          <section className={styles.contact} aria-labelledby="customer-note-title">
            <h3 id="customer-note-title">Observações do pedido</h3>
            <p className={styles.customerNote}>{detailOrder.customerNote || 'Nenhuma observação informada.'}</p>
          </section>
          {(detailOrder.status === 'CONFIRMED' || detailOrder.status === 'CUSTOMER_CONFIRMED') && <p className={styles.detailHint}>Confira os itens antes de iniciar a separação.</p>}
          {detailOrder.status === 'SUBMITTED_FOR_REVIEW' && <section className={styles.priceReview} aria-labelledby="price-review-title">
            <h3 id="price-review-title">Definir preços finais</h3>
            <p className={styles.detailHint}>Informe o preço final por unidade comercial. O preço estimado permanece preservado no histórico.</p>
            <div className={styles.priceFields}>{detailOrder.items.map((item) => <label key={item.id}>
              <span>{item.productName} · {item.variantName} ({item.unit})</span>
              <input type="number" min="0" step="0.01" inputMode="decimal" aria-label={`Preço final de ${item.productName}, ${item.variantName}`} disabled={detailBusy} value={finalPriceValues[item.skuId] ?? ''} onChange={(event) => setFinalPriceValues((current) => ({ ...current, [item.skuId]: event.target.value }))} />
              <small>Preço por unidade em reais</small>
            </label>)}</div>
            <label className={styles.reasonField}><span>Observação da análise (opcional)</span><textarea rows={2} disabled={detailBusy} value={finalPriceReason} onChange={(event) => setFinalPriceReason(event.target.value)} maxLength={500} /><small>{finalPriceReason.length}/500 caracteres</small></label>
            <Button type="button" onClick={() => void saveFinalPrices()} disabled={detailBusy}>{detailBusy ? 'Salvando…' : 'Salvar preços finais'}</Button>
          </section>}
          <h3>Itens do pedido</h3>
          <ul className={styles.detailItems}>{detailOrder.items.map(item => <li className={styles.detailItem} key={item.id}><div><strong>{item.productName}</strong><span>{item.brand ? `${item.brand} · ` : ''}{item.variantName} · {item.unit}</span>{item.skuCode && <small>SKU {item.skuCode}</small>}</div><div className={styles.detailNumbers}><strong>{item.quantity}×</strong><span>{money(item.subtotalMinor)}</span></div></li>)}</ul>
          <div className={styles.detailTotals}><span>Total de unidades <strong>{detailOrder.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span><span>Total <strong>{money(detailOrder.totalMinor)}</strong></span></div>
          <div className={styles.drawerActions}>{scope !== 'driver' && (detailOrder.status === 'CONFIRMED' || detailOrder.status === 'CUSTOMER_CONFIRMED') && <Button type="button" disabled={busy === detailOrder.id} onClick={() => { const order = orders.find(item => item.id === detailOrder.id); if (order) void start(order).then((started) => { if (started) closeDetails(); }); }}>{busy === detailOrder.id ? 'Iniciando…' : 'Iniciar separação'}</Button>}{scope !== 'driver' && <><Button type="button" variant="secondary" className={styles.downloadButton} disabled={Boolean(exportBusy)} onClick={() => void downloadOrder('xlsx')}>{exportBusy === 'xlsx' ? 'Baixando Excel…' : 'Baixar Excel'}</Button><Button type="button" variant="secondary" className={styles.downloadButton} disabled={Boolean(exportBusy)} onClick={() => void downloadOrder('pdf')}>{exportBusy === 'pdf' ? 'Baixando PDF…' : 'Baixar PDF'}</Button></>}{<Button type="button" variant="secondary" onClick={closeDetails}>Fechar</Button>}</div>
        </aside>
      </div>}
    </main>
  );
}

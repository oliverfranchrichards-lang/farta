'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { advanceOrderStatus, assignCompanyOrderDriver, getCompanyOrderDetails, listAdminOrders, listCompanyDrivers, listCompanyOrders, startCompanyOrderPicking, startOrderPicking, type AdminOrder, type CompanyDriver, type CompanyOrderDetails } from '@/modules/admin/admin.actions';
import styles from './orders-queue.module.css';

const labels: Record<string, string> = {
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
  if (status === 'PICKING') return 'warning' as const;
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
  const [busy, setBusy] = useState('');
  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [detailOrder, setDetailOrder] = useState<CompanyOrderDetails | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const closeDetailRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!detailOrder) return;
    closeDetailRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetailOrder(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailOrder]);

  async function openDetails(orderId: string) {
    setDetailBusy(true);
    setNotice('');
    const result = await getCompanyOrderDetails(orderId);
    if (result.ok) setDetailOrder(result.order);
    else setNotice(result.message);
    setDetailBusy(false);
  }

  useEffect(() => {
    if (scope !== 'company') return;
    void listCompanyDrivers().then((result) => {
      if (result.ok) setDrivers(result.drivers);
      else setNotice(result.message);
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
    else setNotice(result.message);
  }

  async function start(order: AdminOrder) {
    setBusy(order.id);
    setNotice('');
    const result = scope === 'company' ? await startCompanyOrderPicking(order.id) : await startOrderPicking(order.id);
    if (!result.ok) setNotice(result.message);
    else {
      setNotice('Separação iniciada.');
      await refresh();
    }
    setBusy('');
  }

  async function advance(order: AdminOrder, toStatus: 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'DELIVERED') {
    setBusy(order.id); setNotice('');
    const result = await advanceOrderStatus(order.id, toStatus);
    if (!result.ok) setNotice(result.message); else { setNotice('Status atualizado.'); await refresh(); }
    setBusy('');
  }

  async function assignAndDispatch(order: AdminOrder) {
    const driverId = selectedDrivers[order.id];
    if (!driverId) {
      setNotice('Selecione um entregador antes de enviar o pedido para rota.');
      return;
    }
    setBusy(order.id); setNotice('');
    const assignment = await assignCompanyOrderDriver(order.id, driverId);
    if (!assignment.ok) {
      setNotice(assignment.message);
      setBusy('');
      return;
    }
    const result = await advanceOrderStatus(order.id, 'DISPATCHED');
    if (!result.ok) setNotice(result.message);
    else { setNotice('Pedido atribuído e enviado para rota.'); await refresh(); }
    setBusy('');
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
  ) : order.status === 'CONFIRMED' && scope !== 'driver' ? (
    <Button type="button" onClick={() => void start(order)} disabled={busy === order.id}>
      {busy === order.id ? 'Iniciando…' : 'Iniciar separação'}
    </Button>
  ) : <span aria-label="Sem ação">—</span>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>OPERAÇÃO</div>
        <h1>Fila de pedidos</h1>
        <p>Monitore pedidos confirmados e conduza a separação da operação.</p>
      </header>

      <section className={styles.summary} aria-label="Resumo da fila">
        <Card><strong>{orders.length}</strong><span>Pedidos carregados</span></Card>
        <Card><strong>{orders.filter((order) => order.status === 'CONFIRMED').length}</strong><span>Aguardando separação</span></Card>
        <Card><strong>{orders.filter((order) => order.status === 'PICKING').length}</strong><span>Em separação</span></Card>
      </section>

      <Card className={styles.panel}>
        <div className={styles.toolbar}>
          <Input id="admin-order-search" label="Buscar pedido ou empresa" placeholder="Número ou nome da empresa" value={query} onChange={(event) => setQuery(event.target.value)} />
          <label className={styles.selectLabel} htmlFor="admin-order-status">
            Status
            <select id="admin-order-status" value={status} onChange={(event) => { setStatus(event.target.value); void refresh(event.target.value); }}>
              <option value="">Todos</option>
              {Object.entries(labels).filter(([key]) => key !== 'RECEIPT_CONFIRMED').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>

        {notice && <div className={styles.notice} role="status" aria-live="polite">{notice}</div>}

        {visible.length === 0 ? (
          <div className={styles.empty} role="status">
            <strong>Nenhum pedido encontrado</strong>
            <p>A fila aparecerá aqui quando uma compra for confirmada.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.visuallyHidden}>Fila operacional de pedidos</caption>
              <thead><tr><th>Pedido</th><th>Empresa</th><th>Estabelecimento</th><th>Data</th><th>Itens</th><th>Total</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>{visible.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.order_number}</strong></td><td>{order.company_name}</td><td>{order.establishment_name}</td>
                  <td>{new Date(order.created_at).toLocaleString('pt-BR')}</td><td>{order.units}</td><td>{money(order.total_minor)}</td>
                  <td><Badge tone={tone(order.status)}>{labels[order.status] ?? order.status}</Badge></td><td><div className={styles.rowActions}><Button type="button" variant="secondary" onClick={() => void openDetails(order.id)} disabled={detailBusy}>Ver detalhes</Button>{action(order)}</div></td>
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
              <div className={styles.rowActions}><Button type="button" variant="secondary" onClick={() => void openDetails(order.id)} disabled={detailBusy}>Ver detalhes</Button>{(scope !== 'driver' || order.status === 'DISPATCHED') && action(order)}</div>
            </Card>
          ))}
        </div>
      </Card>
      {detailOrder && <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailOrder(null); }}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="order-detail-title" aria-describedby="order-detail-context">
          <div className={styles.drawerHeader}><div><p className={styles.eyebrow}>DETALHES DO PEDIDO</p><h2 id="order-detail-title">Pedido #{detailOrder.orderNumber}</h2></div><button ref={closeDetailRef} className={styles.close} type="button" onClick={() => setDetailOrder(null)} aria-label="Fechar detalhes">×</button></div>
          <div className={styles.drawerMeta} id="order-detail-context"><Badge tone={tone(detailOrder.status)}>{labels[detailOrder.status] ?? detailOrder.status}</Badge><span>{detailOrder.companyName} · {detailOrder.establishmentName}</span><span>{new Date(detailOrder.createdAt).toLocaleString('pt-BR')}</span></div>
          {detailOrder.status === 'CONFIRMED' && <p className={styles.detailHint}>Confira os itens antes de iniciar a separação.</p>}
          <h3>Itens do pedido</h3>
          <ul className={styles.detailItems}>{detailOrder.items.map(item => <li className={styles.detailItem} key={item.id}><div><strong>{item.productName}</strong><span>{item.brand ? `${item.brand} · ` : ''}{item.variantName} · {item.unit}</span>{item.skuCode && <small>SKU {item.skuCode}</small>}</div><div className={styles.detailNumbers}><strong>{item.quantity}×</strong><span>{money(item.subtotalMinor)}</span></div></li>)}</ul>
          <div className={styles.detailTotals}><span>Total de unidades <strong>{detailOrder.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span><span>Total <strong>{money(detailOrder.totalMinor)}</strong></span></div>
          <div className={styles.drawerActions}>{detailOrder.status === 'CONFIRMED' && <Button type="button" onClick={() => { const order = orders.find(item => item.id === detailOrder.id); if (order) void start(order); setDetailOrder(null); }}>Iniciar separação</Button>}{scope !== 'driver' && <><a className={styles.downloadButton} href={`/api/operacao/pedidos/${detailOrder.id}/export?format=xlsx`}>Baixar Excel</a><a className={styles.downloadButton} href={`/api/operacao/pedidos/${detailOrder.id}/export?format=pdf`}>Baixar PDF</a></>}<Button type="button" variant="secondary" onClick={() => setDetailOrder(null)}>Fechar</Button></div>
        </aside>
      </div>}
    </main>
  );
}

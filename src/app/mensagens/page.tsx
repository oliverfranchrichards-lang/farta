import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { listDirectConversations } from '@/modules/chat/chat.actions';
import styles from './mensagens.module.css';

const roleLabel = (role: string) => role === 'INTERNAL_OPERATOR' ? 'Operador interno' : role === 'DRIVER' ? 'Entregador' : 'Cliente';

export default async function MessagesPage() {
  const result = await listDirectConversations();
  return <main className={styles.page}><div className={styles.content}><div className={styles.breadcrumb}>Mensagens</div><header className={styles.header}><div><h1>Mensagens</h1><p>Converse com participantes autorizados da operação.</p></div></header>{!result.ok ? <div className={styles.error} role="alert">{result.message}</div> : result.conversations.length === 0 ? <Card className={styles.empty}><h2>Você ainda não possui conversas disponíveis.</h2><p>As conversas aparecem quando houver participantes autorizados para contato.</p></Card> : <section className={styles.list} aria-label="Conversas">{result.conversations.map(conversation => <Link className={styles.conversation} key={conversation.id} href={`/mensagens/${conversation.id}`}><div className={styles.conversationHeader}><strong>{conversation.peer_name}</strong><span>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString('pt-BR') : ''}</span></div><div className={styles.conversationMeta}>{roleLabel(conversation.peer_role)}<span aria-hidden="true">›</span></div><div className={styles.lastMessage}>{conversation.last_message ?? 'Nenhuma mensagem ainda.'}</div></Link>)}</section>}</div></main>;
}

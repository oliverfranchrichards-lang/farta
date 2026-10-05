'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { sendDirectMessage, type ChatMessage, type ConversationSummary } from '@/modules/chat/chat.actions';
import styles from '../mensagens.module.css';

const roleLabel = (role: string) => role === 'INTERNAL_OPERATOR' ? 'Operador interno' : role === 'DRIVER' ? 'Entregador' : 'Cliente';

export function ChatConversation({ conversation, initialMessages }: { conversation: ConversationSummary; initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    const result = await sendDirectMessage(conversation.id, body);
    if (!result.ok) setError(result.message);
    else { setMessages(current => [...current, result.message]); setBody(''); setNotice('Mensagem enviada.'); }
    setBusy(false);
  }

  return <main className={styles.page}><div className={styles.chatShell}><div className={styles.chatHeader}><Link href="/mensagens"><Button type="button" variant="secondary">Voltar</Button></Link><div><h1>{conversation.peer_name}</h1><p>{roleLabel(conversation.peer_role)}</p></div></div>{error && <div className={styles.error} role="alert">{error}</div>}{notice && <div className={styles.notice} role="status" aria-live="polite">{notice}</div>}<section className={styles.history} aria-label="Histórico da conversa" aria-live="polite">{messages.length === 0 ? <p role="status">Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.</p> : messages.map(message => { const mine = message.sender_profile_id !== conversation.peer_profile_id; return <article className={`${styles.message} ${mine ? styles.messageMine : styles.messageOther}`} key={message.id}><span className={styles.messageSender}>{mine ? 'Você' : conversation.peer_name}</span><p className={styles.messageBody}>{message.body}</p><time className={styles.messageTime} dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('pt-BR')}</time></article>; })}</section><form className={styles.composer} onSubmit={submit}><label htmlFor="message-body">Mensagem<textarea id="message-body" value={body} placeholder="Escreva uma mensagem…" maxLength={4000} disabled={busy} aria-describedby="message-help" onChange={event => setBody(event.target.value)} /></label><div className={styles.composerActions}><small id="message-help">{body.length}/4000 caracteres</small><Button type="submit" disabled={busy || !body.trim()}>{busy ? 'Enviando…' : 'Enviar'}</Button></div></form></div></main>;
}

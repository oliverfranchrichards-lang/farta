'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Banner } from '@/modules/banners/banner.actions';
import styles from './banner-carousel.module.css';

type BannerWithImage = Banner & { imageUrl: string | null };

export function BannerCarousel({ banners }: { banners: BannerWithImage[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % count), 8000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const activeIndex = Math.min(index, count - 1);
  const current = banners[activeIndex] ?? banners[0];
  const move = (delta: number) => setIndex(value => (value + delta + count) % count);

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (count < 2) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'Home') { event.preventDefault(); setIndex(0); }
    if (event.key === 'End') { event.preventDefault(); setIndex(count - 1); }
  }

  return (
    <section ref={regionRef} className={styles.region} aria-label="Destaques" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onKeyDown={onKeyDown}>
      <article className={styles.slide} aria-roledescription="slide" aria-label={`Destaque ${activeIndex + 1} de ${count}`}>
        <div className={styles.copy}>
          {current.title && <h2>{current.title}</h2>}
          <p>{current.alt_text}</p>
        </div>
        {current.imageUrl ? <Image className={styles.image} src={current.imageUrl} alt={current.alt_text} width={1200} height={360} priority={index === 0} /> : <div className={styles.imageFallback} aria-hidden="true" />}
      </article>
      {count > 1 && <div className={styles.controls}>
        <Button type="button" variant="secondary" aria-label="Destaque anterior" onClick={() => move(-1)}>‹</Button>
        <div className={styles.dots} role="tablist" aria-label="Selecionar destaque">{banners.map((banner, bannerIndex) => <button key={banner.id} type="button" role="tab" aria-selected={bannerIndex === activeIndex} aria-label={`Exibir destaque ${bannerIndex + 1}`} className={bannerIndex === activeIndex ? styles.dotActive : styles.dot} onClick={() => setIndex(bannerIndex)} />)}</div>
        <Button type="button" variant="secondary" aria-label="Próximo destaque" onClick={() => move(1)}>›</Button>
      </div>}
    </section>
  );
}

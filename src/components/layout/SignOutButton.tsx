"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/modules/auth/auth.actions";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      router.replace("/auth/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return <button className={className} type="button" onClick={handleSignOut} disabled={loading} aria-label="Sair da conta"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></svg><span>{loading ? "Saindo…" : "Sair da conta"}</span></button>;
}

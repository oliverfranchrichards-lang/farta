"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/modules/auth/auth.actions";

export function SignOutButton() {
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
  return <button type="button" onClick={handleSignOut} disabled={loading} aria-label="Sair da conta">{loading ? "…" : "Sair"}</button>;
}

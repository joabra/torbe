"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function RegistreraPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Lösenorden matchar inte");
      return;
    }
    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Något gick fel");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-forest-800 font-bold text-xl">
            <Leaf className="w-6 h-6 text-sand-500" />
            Torbe
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-forest-900">Skapa konto</h1>
          <p className="mt-2 text-stone-500 text-sm">Gå med i familjens bokningssystem</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="name"
                label="Ditt namn"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Anna Torbe"
              />
              <Input
                id="email"
                label="E-postadress"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.se"
              />
              <Input
                id="password"
                label="Lösenord (minst 6 tecken)"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                id="confirm"
                label="Bekräfta lösenord"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                error={confirm && password !== confirm ? "Lösenorden matchar inte" : undefined}
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" variant="sand" size="lg" disabled={loading} className="w-full mt-2">
                {loading ? "Skapar konto..." : "Skapa konto"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-sm text-stone-500 mt-6">
          Har du redan ett konto?{" "}
          <Link href="/logga-in" className="text-forest-700 font-semibold hover:underline">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  );
}

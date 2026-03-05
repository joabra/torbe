"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

function LoggaInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Fel e-post eller lösenord");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
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
          <h1 className="mt-4 text-3xl font-bold text-forest-900">Logga in</h1>
          <p className="mt-2 text-stone-500 text-sm">Välkommen tillbaka till familjen</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                label="Lösenord"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" variant="sand" size="lg" disabled={loading} className="w-full mt-2">
                {loading ? "Loggar in..." : "Logga in"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-sm text-stone-500 mt-6">
          Inte med ännu?{" "}
          <Link href="/registrera" className="text-forest-700 font-semibold hover:underline">
            Skapa konto
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoggaInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-500">Laddar...</div>}>
      <LoggaInForm />
    </Suspense>
  );
}

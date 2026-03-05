"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

function LoggaInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Kontrollera om MFA krävs utan att logga in (försök utan mfaCode)
    const result = await signIn("credentials", {
      email,
      password,
      mfaCode: "",
      redirect: false,
    });

    setLoading(false);

    if (!result?.error) {
      // Inloggning lyckades utan MFA (bör ej hända för nya konton, men fallback)
      router.push(callbackUrl);
      router.refresh();
    } else {
      // Fel — kan vara felaktiga uppgifter ELLER MFA krävs
      // Vi vet inte vilket, men vi ber om MFA-kod ändå om e-post/lösenord ser rimliga ut
      // För att avgöra: försök att validera via ett separat endpoint
      const check = await fetch("/api/auth/check-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (check.ok) {
        const data = await check.json();
        if (data.mfaRequired) {
          setStep("mfa");
        } else if (data.valid) {
          // Inloggning utan MFA (gammal admin/seed-konto)
          router.push(callbackUrl);
          router.refresh();
        } else {
          setError("Fel e-post eller lösenord");
        }
      } else {
        setError("Fel e-post eller lösenord");
      }
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      mfaCode: mfaCode.replace(/\s/g, ""),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Felaktig engångskod — kontrollera appen och försök igen");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-forest-800 font-bold text-xl">
            <Leaf className="w-6 h-6 text-sand-500" />
            Torbe
          </Link>
          {step === "credentials" ? (
            <>
              <h1 className="mt-4 text-3xl font-bold text-forest-900">Logga in</h1>
              <p className="mt-2 text-stone-500 text-sm">Välkommen tillbaka till familjen</p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold text-forest-900">Tvåstegsverifiering</h1>
              <p className="mt-2 text-stone-500 text-sm">Ange koden från din autentiseringsapp</p>
            </>
          )}
        </div>

        <Card>
          <CardBody>
            {step === "credentials" ? (
              <form onSubmit={handleCredentials} className="flex flex-col gap-4">
                <Input id="email" label="E-postadress" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@epost.se" />
                <Input id="password" label="Lösenord" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <Button type="submit" variant="sand" size="lg" disabled={loading} className="w-full mt-2">
                  {loading ? "Kontrollerar..." : "Fortsätt"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMfa} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-forest-50 rounded-xl px-4 py-3 text-sm text-forest-700">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-forest-600" />
                  <span>Öppna din autentiseringsapp och ange den 6-siffriga koden för <strong>Torbe</strong>.</span>
                </div>

                <Input
                  id="mfaCode"
                  label="6-siffrig kod"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <Button type="submit" variant="sand" size="lg" disabled={loading || mfaCode.length < 6} className="w-full mt-2">
                  {loading ? "Verifierar..." : "Logga in"}
                </Button>
                <button type="button" onClick={() => { setStep("credentials"); setError(""); setMfaCode(""); }}
                  className="text-sm text-stone-400 hover:text-stone-600 text-center">
                  ← Tillbaka
                </button>
              </form>
            )}
          </CardBody>
        </Card>

        {step === "credentials" && (
          <p className="text-center text-sm text-stone-500 mt-6">
            Inte med ännu?{" "}
            <Link href="/registrera" className="text-forest-700 font-semibold hover:underline">Skapa konto</Link>
          </p>
        )}
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


"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Leaf, AlertCircle, ShieldCheck, Copy, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function RegistreraPage() {
  // Steg 1: Kontouppgifter
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Steg 2: MFA-setup
  const [step, setStep] = useState<"form" | "mfa" | "pending">("form");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generera QR-kod via canvas när otpUri är känt
  useEffect(() => {
    if (!mfaSecret || !email) return;
    const otpUri = `otpauth://totp/Torbe:${encodeURIComponent(email)}?secret=${mfaSecret}&issuer=Torbe`;
    // Ladda qrcode dynamiskt i klienten
    import("qrcode").then((QR) => {
      QR.toDataURL(otpUri, { width: 200 }).then(setQrDataUrl);
    });
  }, [mfaSecret, email]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Lösenorden matchar inte"); return; }
    if (password.length < 6) { setError("Lösenordet måste vara minst 6 tecken"); return; }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Något gick fel"); return; }

    setMfaSecret(data.secret);
    setStep("mfa");
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register/verify-mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: mfaCode.replace(/\s/g, "") }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Ogiltig kod"); return; }

    setStep("pending");
  }

  function copySecret() {
    navigator.clipboard.writeText(mfaSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {step === "form" ? (
            <>
              <h1 className="mt-4 text-3xl font-bold text-forest-900">Skapa konto</h1>
              <p className="mt-2 text-stone-500 text-sm">Gå med i familjens bokningssystem</p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold text-forest-900">
                {step === "mfa" ? "Aktivera MFA" : "Konto skapat!"}
              </h1>
              <p className="mt-2 text-stone-500 text-sm">
                {step === "mfa" ? "Skanna QR-koden med din autentiseringsapp" : "Vi granskar ditt konto"}
              </p>
            </>
          )}
        </div>

        <Card>
          <CardBody>
            {step === "pending" ? (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-sand-50 border-2 border-sand-300 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-sand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-forest-900">Väntar på godkännande</h2>
                  <p className="mt-2 text-stone-500 text-sm leading-relaxed">
                    Ditt konto har skapats och en administratör har fått en notis.
                    Du får ett e-postmeddelande till <strong>{email}</strong> så fort kontot är godkänt.
                  </p>
                </div>
                <div className="w-full bg-forest-50 rounded-xl px-4 py-3 text-sm text-forest-700 text-left">
                  <strong>Vad händer nu?</strong>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>Admin granskar din registrering</li>
                    <li>Du får ett bekräftelsemejl när kontot godkänts</li>
                    <li>Därefter kan du logga in</li>
                  </ol>
                </div>
                <Link href="/logga-in" className="text-forest-700 font-semibold text-sm hover:underline">
                  Gå till inloggning
                </Link>
              </div>
            ) : step === "form" ? (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input id="name" label="Ditt namn" type="text" autoComplete="name" required
                  value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna Torbe" />
                <Input id="email" label="E-postadress" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@epost.se" />
                <Input id="password" label="Lösenord (minst 6 tecken)" type="password" autoComplete="new-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <Input id="confirm" label="Bekräfta lösenord" type="password" autoComplete="new-password" required
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                  error={confirm && password !== confirm ? "Lösenorden matchar inte" : undefined} />

                {/* MFA-info */}
                <div className="flex items-start gap-3 bg-forest-50 rounded-xl px-4 py-3 text-sm text-forest-700">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-forest-600" />
                  <span>Kontot kräver <strong>tvåstegsverifiering (MFA)</strong>. Du ombeds installera en autentiseringsapp (Google Authenticator, Microsoft Authenticator, Aegis m.fl.).</span>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}

                <Button type="submit" variant="sand" size="lg" disabled={loading} className="w-full mt-2">
                  {loading ? "Skapar konto..." : "Fortsätt till MFA-setup →"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyMfa} className="flex flex-col gap-5">
                <ol className="text-sm text-stone-600 space-y-1 list-decimal list-inside">
                  <li>Öppna din autentiseringsapp (Google/Microsoft Authenticator, Aegis m.fl.)</li>
                  <li>Välj <strong>"Lägg till konto"</strong> och skanna QR-koden nedan</li>
                  <li>Ange den 6-siffriga koden appen visar</li>
                </ol>

                {qrDataUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={qrDataUrl} alt="MFA QR-kod" className="rounded-xl border border-stone-200 p-2 bg-white" width={200} height={200} />
                    <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 w-full">
                      <span className="text-xs text-stone-400 flex-1 font-mono break-all">{mfaSecret}</span>
                      <button type="button" onClick={copySecret} className="shrink-0 text-forest-600 hover:text-forest-800">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-stone-400 text-center">Kan du inte skanna? Ange koden manuellt i appen.</p>
                  </div>
                ) : (
                  <div className="flex justify-center py-6">
                    <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <Input
                  id="mfaCode"
                  label="6-siffrig kod från appen"
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

                <Button type="submit" variant="sand" size="lg" disabled={loading || mfaCode.length < 6} className="w-full">
                  {loading ? "Verifierar..." : "Aktivera MFA & slutför registrering"}
                </Button>
              </form>
            )}
          </CardBody>
        </Card>

        {step === "form" && (
          <p className="text-center text-sm text-stone-500 mt-6">
            Har du redan ett konto?{" "}
            <Link href="/logga-in" className="text-forest-700 font-semibold hover:underline">Logga in</Link>
          </p>
        )}
      </div>
    </div>
  );
}


"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, ShieldOff, Copy, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function KontoinstellningarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Lösenord
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaStep, setMfaStep] = useState<"idle" | "setup" | "confirm" | "disable">("idle");
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/logga-in");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/account/me")
        .then((r) => r.json())
        .then((data) => setMfaEnabled(data.mfaEnabled ?? false));
    }
  }, [status]);

  useEffect(() => {
    if (!mfaSecret || !session?.user?.email) return;
    import("qrcode").then((QR) => {
      const uri = `otpauth://totp/Torbe:${encodeURIComponent(session.user!.email!)}?secret=${mfaSecret}&issuer=Torbe`;
      QR.toDataURL(uri, { width: 200 }).then(setQrDataUrl);
    });
  }, [mfaSecret, session?.user?.email]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPw !== confirmPw) { setPwError("Lösenorden matchar inte"); return; }
    if (newPw.length < 6) { setPwError("Minst 6 tecken"); return; }
    setPwLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (!res.ok) { setPwError(data.error ?? "Något gick fel"); return; }
    setPwSuccess(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  }

  async function startMfaSetup() {
    setMfaError("");
    setMfaLoading(true);
    const res = await fetch("/api/account/mfa/setup", { method: "POST" });
    const data = await res.json();
    setMfaLoading(false);
    if (!res.ok) { setMfaError(data.error ?? "Något gick fel"); return; }
    setMfaSecret(data.secret);
    setMfaStep("setup");
  }

  async function confirmMfa(e: React.FormEvent) {
    e.preventDefault();
    setMfaError("");
    setMfaLoading(true);
    const res = await fetch("/api/account/mfa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const data = await res.json();
    setMfaLoading(false);
    if (!res.ok) { setMfaError(data.error ?? "Felaktig kod"); return; }
    setMfaEnabled(true);
    setMfaSuccess("MFA är nu aktiverat på ditt konto!");
    setMfaStep("idle");
    setMfaCode("");
    setMfaSecret("");
    setQrDataUrl("");
  }

  async function disableMfa(e: React.FormEvent) {
    e.preventDefault();
    setMfaError("");
    setMfaLoading(true);
    const res = await fetch("/api/account/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: mfaCode }),
    });
    const data = await res.json();
    setMfaLoading(false);
    if (!res.ok) { setMfaError(data.error ?? "Felaktig kod"); return; }
    setMfaEnabled(false);
    setMfaSuccess("MFA har inaktiverats.");
    setMfaStep("idle");
    setMfaCode("");
  }

  function copySecret() {
    navigator.clipboard.writeText(mfaSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading") {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-10">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Konto</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Inställningar</h1>
          <p className="mt-2 text-stone-500">Hantera lösenord och säkerhet för ditt konto.</p>
        </div>

        {/* ── Byt lösenord ── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 text-forest-900 font-semibold">
              <KeyRound className="w-4 h-4 text-sand-500" />
              Byt lösenord
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <Input
                id="current-pw"
                label="Nuvarande lösenord"
                type="password"
                autoComplete="current-password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                id="new-pw"
                label="Nytt lösenord (minst 6 tecken)"
                type="password"
                autoComplete="new-password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                id="confirm-pw"
                label="Bekräfta nytt lösenord"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="••••••••"
                error={confirmPw && newPw !== confirmPw ? "Lösenorden matchar inte" : undefined}
              />
              {pwError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />Lösenordet är uppdaterat!
                </div>
              )}
              <Button type="submit" variant="sand" disabled={pwLoading} className="w-full">
                {pwLoading ? "Sparar..." : "Uppdatera lösenord"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* ── MFA ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-forest-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-sand-500" />
                Tvåstegsverifiering (MFA)
              </div>
              {mfaEnabled !== null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mfaEnabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                  {mfaEnabled ? "Aktivt" : "Inaktivt"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {mfaSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />{mfaSuccess}
              </div>
            )}

            {mfaStep === "idle" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-stone-500">
                  Tvåstegsverifiering lägger till ett extra lager säkerhet. Du behöver en autentiseringsapp (Google Authenticator, Microsoft Authenticator, Aegis m.fl.).
                </p>
                {mfaError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{mfaError}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={startMfaSetup} disabled={mfaLoading} className="flex-1">
                    <ShieldOff className="w-4 h-4" />
                    {mfaLoading ? "Förbereder..." : mfaEnabled ? "Byt autentiserare" : "Sätt upp MFA"}
                  </Button>
                  {mfaEnabled && (
                    <Button
                      variant="danger"
                      onClick={() => { setMfaStep("disable"); setMfaCode(""); setMfaError(""); }}
                      className="flex-1"
                    >
                      <ShieldOff className="w-4 h-4" />
                      Inaktivera MFA
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mfaStep === "setup" && (
              <div className="flex flex-col gap-4">
                <ol className="text-sm text-stone-600 space-y-1 list-decimal list-inside">
                  <li>Öppna din autentiseringsapp och välj <strong>"Lägg till konto"</strong></li>
                  <li>Skanna QR-koden nedan</li>
                  <li>Ange den 6-siffriga koden för att bekräfta</li>
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
                <form onSubmit={confirmMfa} className="flex flex-col gap-3">
                  <Input
                    id="mfa-code"
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
                  {mfaError && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />{mfaError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => { setMfaStep("idle"); setMfaCode(""); }} className="flex-1">
                      Avbryt
                    </Button>
                    <Button type="submit" variant="sand" disabled={mfaLoading || mfaCode.length < 6} className="flex-1">
                      {mfaLoading ? "Verifierar..." : "Aktivera MFA"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {mfaStep === "disable" && (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Ange din nuvarande engångskod för att bekräfta att du vill inaktivera MFA.
                </div>
                <form onSubmit={disableMfa} className="flex flex-col gap-3">
                  <Input
                    id="mfa-disable-code"
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
                  {mfaError && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />{mfaError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => { setMfaStep("idle"); setMfaCode(""); }} className="flex-1">
                      Avbryt
                    </Button>
                    <Button type="submit" variant="danger" disabled={mfaLoading || mfaCode.length < 6} className="flex-1">
                      {mfaLoading ? "Inaktiverar..." : "Inaktivera MFA"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

"use client";
import { useState, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { JanCharacter, type CharacterState } from "@/components/JanCharacter";

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
  const [charState, setCharState] = useState<CharacterState>("idle");
  const [cardShake, setCardShake] = useState(false);

  const handleCardShake = useCallback(() => {
    setCardShake(true);
    setTimeout(() => setCardShake(false), 600);
  }, []);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCharState("idle");

    const result = await signIn("credentials", {
      email,
      password,
      mfaCode: "",
      redirect: false,
    });

    setLoading(false);

    if (!result?.error) {
      setCharState("happy");
      setTimeout(() => router.push(callbackUrl), 1500);
      router.refresh();
    } else {
      const check = await fetch("/api/auth/check-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (check.ok) {
        const data = await check.json();
        if (data.notApproved) {
          setCharState("sad");
          setError("Ditt konto väntar på godkännande av administratören. Du får ett e-postmeddelande när det är klart.");
          setTimeout(() => setCharState("idle"), 2500);
        } else if (data.mfaRequired) {
          setStep("mfa");
          setCharState("idle");
        } else if (data.valid) {
          setCharState("happy");
          setTimeout(() => router.push(callbackUrl), 1500);
          router.refresh();
        } else {
          setCharState("sad");
          setError("Fel e-post eller lösenord");
          setTimeout(() => setCharState("idle"), 2500);
        }
      } else {
        setCharState("sad");
        setError("Fel e-post eller lösenord");
        setTimeout(() => setCharState("idle"), 2500);
      }
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCharState("idle");

    const result = await signIn("credentials", {
      email,
      password,
      mfaCode: mfaCode.replace(/\s/g, ""),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setCharState("sad");
      setError("Felaktig engångskod — kontrollera appen och försök igen");
      setTimeout(() => setCharState("idle"), 2500);
    } else {
      setCharState("happy");
      setTimeout(() => router.push(callbackUrl), 1500);
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f0e8 0%, #e8dfd4 50%, #d4c9b8 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden', padding: '20px' }}>
      <style>{`
        @keyframes janCardShake {
          0%,100% { transform: translateX(0); }
          12% { transform: translateX(-10px); }
          25% { transform: translateX(8px); }
          37% { transform: translateX(-6px); }
          50% { transform: translateX(5px); }
          62% { transform: translateX(-3px); }
          75% { transform: translateX(2px); }
        }
        .jan-login-input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e8e2d8;
          border-radius: 14px;
          font-size: 16px;
          background: #faf8f5;
          color: #2d3a2e;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .jan-login-input:focus {
          border-color: #c9b896;
          box-shadow: 0 0 0 4px rgba(201, 184, 150, 0.15);
        }
        .jan-login-input::placeholder { color: #bbb; }
        .jan-login-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #c9a96e 0%, #b08d4f 100%);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
          margin-top: 8px;
        }
        .jan-login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(176, 141, 79, 0.3);
        }
        .jan-login-btn:active:not(:disabled) { transform: translateY(0); }
        .jan-login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Character */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', height: 160, marginBottom: -10, zIndex: 2 }}>
          <JanCharacter state={charState} emailValue={email} onCardShake={handleCardShake} />
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 24, padding: '40px 32px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)', position: 'relative', zIndex: 4, animation: cardShake ? 'janCardShake 0.6s ease' : undefined }}>
          {step === "credentials" ? (
            <>
              <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#2d3a2e', marginBottom: 4, marginTop: 0 }}>Logga in</h1>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#8a8a8a', marginBottom: 28, marginTop: 0 }}>Välkommen tillbaka till familjen ☀️</p>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, fontSize: 14, marginBottom: 16, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />{error}
                </div>
              )}

              <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5a4a', marginBottom: 6 }}>E-postadress</label>
                  <input
                    className="jan-login-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => { setError(""); setCharState("watching"); }}
                    onBlur={() => { if (charState === "watching") setCharState("idle"); }}
                    placeholder="din@epost.se"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5a4a', marginBottom: 6 }}>Lösenord</label>
                  <input
                    className="jan-login-input"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => { setError(""); setCharState("peeking"); }}
                    onBlur={() => { if (charState === "peeking") setCharState("idle"); }}
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="jan-login-btn" disabled={loading}>
                  {loading ? "Kontrollerar..." : "Fortsätt"}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#8a8a8a', marginTop: 20, marginBottom: 0 }}>
                Inte med ännu?{" "}
                <Link href="/registrera" style={{ color: '#4a5a4a', fontWeight: 600, textDecoration: 'none' }}>Skapa konto</Link>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#2d3a2e', marginBottom: 4, marginTop: 0 }}>Tvåstegsverifiering</h1>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#8a8a8a', marginBottom: 28, marginTop: 0 }}>Ange koden från din autentiseringsapp</p>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, fontSize: 14, marginBottom: 16, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />{error}
                </div>
              )}

              <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#15803d' }}>
                  <ShieldCheck style={{ width: 20, height: 20, flexShrink: 0 }} />
                  <span>Öppna din autentiseringsapp och ange den 6-siffriga koden för <strong>Torbe</strong>.</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5a4a', marginBottom: 6 }}>6-siffrig kod</label>
                  <input
                    className="jan-login-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>

                <button type="submit" className="jan-login-btn" disabled={loading || mfaCode.length < 6}>
                  {loading ? "Verifierar..." : "Logga in"}
                </button>
                <button type="button" onClick={() => { setStep("credentials"); setError(""); setMfaCode(""); setCharState("idle"); }}
                  style={{ fontSize: 14, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                  ← Tillbaka
                </button>
              </form>
            </>
          )}
        </div>
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


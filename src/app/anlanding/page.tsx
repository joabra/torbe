"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wifi, Car, Key, Phone, FileText, AlertCircle, CheckSquare, Square, ClipboardList } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

interface ArrivalInfo {
  wifiName?: string;
  wifiPassword?: string;
  checkInInstructions?: string;
  parkingInfo?: string;
  houseRules?: string;
  emergencyContact?: string;
  departureChecklist?: string[];
  manualSections?: Array<{ title: string; content: string }>;
}

function InfoBlock({ icon, title, content }: { icon: React.ReactNode; title: string; content?: string }) {
  if (!content) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-forest-800 font-semibold">
          {icon}
          {title}
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">{content}</p>
      </CardBody>
    </Card>
  );
}

export default function AnlandningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [info, setInfo] = useState<ArrivalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("departureChecklist");
      if (stored) setCheckedItems(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleItem(i: number) {
    setCheckedItems((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      try { localStorage.setItem("departureChecklist", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/logga-in?callbackUrl=/anlanding");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/admin/arrival-info")
        .then(async (r) => {
          if (r.status === 403) { setDenied(true); return null; }
          return r.json();
        })
        .then((d) => { if (d) setInfo(d); })
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-forest-900 mb-2">Ingen åtkomst</h1>
          <p className="text-stone-500">Den här sidan är tillgänglig för gäster med en godkänd bokning.</p>
          <p className="text-stone-400 text-sm mt-2">Kontakta oss om du har frågor.</p>
        </div>
      </div>
    );
  }

  const hasContent = Boolean(
    info && (
      info.wifiName?.trim() ||
      info.wifiPassword?.trim() ||
      info.checkInInstructions?.trim() ||
      info.parkingInfo?.trim() ||
      info.houseRules?.trim() ||
      info.emergencyContact?.trim() ||
      (Array.isArray(info.departureChecklist) && info.departureChecklist.length > 0) ||
      (Array.isArray(info.manualSections) && info.manualSections.some((s) => s?.title?.trim() && s?.content?.trim()))
    )
  );
  const manualSections = Array.isArray(info?.manualSections)
    ? info!.manualSections.filter((s) => s?.title?.trim() && s?.content?.trim())
    : [];

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <span className="text-sand-500 text-sm font-semibold uppercase tracking-widest">Välkommen</span>
          <h1 className="mt-3 text-4xl font-bold text-forest-900">Ankomstinformation</h1>
          <p className="mt-2 text-stone-500">
            Hej {session?.user?.name?.split(" ")[0]}! Här hittar du allt du behöver inför din vistelse.
          </p>
        </div>

        {!hasContent ? (
          <Card>
            <CardBody className="text-center py-16">
              <p className="text-stone-400">Information har inte lagts till ännu. Hör av dig till oss om du har frågor!</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {(info?.wifiName || info?.wifiPassword) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-forest-800 font-semibold">
                    <Wifi className="w-4 h-4 text-sand-500" />
                    WiFi
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-col gap-2">
                    {info.wifiName && (
                      <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
                        <span className="text-sm text-stone-500">Nätverk</span>
                        <span className="font-mono font-semibold text-forest-800">{info.wifiName}</span>
                      </div>
                    )}
                    {info.wifiPassword && (
                      <div className="flex items-center justify-between bg-forest-50 rounded-xl px-4 py-3">
                        <span className="text-sm text-stone-500">Lösenord</span>
                        <span className="font-mono font-semibold text-forest-800 text-lg tracking-wide">{info.wifiPassword}</span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}
            <InfoBlock icon={<Key className="w-4 h-4 text-sand-500" />} title="Incheckning" content={info?.checkInInstructions} />
            <InfoBlock icon={<Car className="w-4 h-4 text-sand-500" />} title="Parkering" content={info?.parkingInfo} />
            <InfoBlock icon={<FileText className="w-4 h-4 text-sand-500" />} title="Husregler" content={info?.houseRules} />
            <InfoBlock icon={<Phone className="w-4 h-4 text-sand-500" />} title="Nödkontakt" content={info?.emergencyContact} />

            {manualSections.map((section, idx) => (
              <InfoBlock
                key={`${section.title}-${idx}`}
                icon={<FileText className="w-4 h-4 text-sand-500" />}
                title={section.title}
                content={section.content}
              />
            ))}

            {info?.departureChecklist && info.departureChecklist.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-forest-800 font-semibold">
                    <ClipboardList className="w-4 h-4 text-sand-500" />
                    Avresechecklista
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-col divide-y divide-stone-100">
                    {info.departureChecklist.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleItem(i)}
                        className="flex items-center gap-3 w-full text-left py-3 first:pt-0 last:pb-0"
                      >
                        {checkedItems[i]
                          ? <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                          : <Square className="w-5 h-5 text-stone-300 shrink-0" />
                        }
                        <span className={checkedItems[i] ? "line-through text-stone-400" : "text-stone-700"}>{item}</span>
                      </button>
                    ))}
                  </div>
                  {Object.values(checkedItems).filter(Boolean).length === info.departureChecklist.length && (
                    <p className="mt-4 text-sm text-emerald-600 font-medium text-center">✅ Allt klarmarkerat — bra jobbat!</p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

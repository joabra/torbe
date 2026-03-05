import Link from "next/link";
import { Leaf, Instagram, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-forest-900 text-white mt-24">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-sand-400" />
              <span className="font-bold text-lg">Torbe</span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed">
              Familjens plats i solen. En lägenhet i Spanien — för avkoppling,
              äventyr och minnen för livet.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4 text-stone-300">Navigera</h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link href="/kalender" className="hover:text-sand-400 transition-colors">Kalender</Link></li>
              <li><Link href="/boka" className="hover:text-sand-400 transition-colors">Boka lägenhet</Link></li>
              <li><Link href="/aktiviteter" className="hover:text-sand-400 transition-colors">Aktiviteter & tips</Link></li>
              <li><Link href="/bilder" className="hover:text-sand-400 transition-colors">Bildgalleri</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-stone-300">Kontakt</h3>
            <ul className="space-y-3 text-sm text-stone-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sand-400" />
                <a href="mailto:kontakt@torbe.se" className="hover:text-sand-400 transition-colors">
                  kontakt@torbe.se
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-sand-400" />
                <span>Tagga dina bilder med #torbespain</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-forest-800 mt-12 pt-6 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Torbe-familjen. Med kärlek från solen.
        </div>
      </div>
    </footer>
  );
}

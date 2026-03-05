/**
 * Seeda databas med en admin-användare och exempeltips.
 * Kör: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seedar databas...");

  // Admin-användare
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@torbe.se" },
    update: {},
    create: {
      name: "Admin Torbe",
      email: "admin@torbe.se",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin skapad: ${admin.email}`);

  // Exempeltips
  const tips = [
    {
      category: "RESTAURANT" as const,
      title: "La Taberna del Mar",
      description: "Fantastisk fisk och skaldjur direkt vid stranden. Prova deras paella – den är legendarisk!",
      address: "Paseo Marítimo, Marbella",
    },
    {
      category: "EXCURSION" as const,
      title: "Vandring till La Concha",
      description: "Vacker vandring med panoramautsikt över Costa del Sol. Ca 3 timmar tur och retur.",
      address: "Sierra de las Nieves",
    },
    {
      category: "MARKET" as const,
      title: "Marknaden i Estepona",
      description: "Varje lördag morgon 09–14. Färska grönsaker, lokala delikatesser och hantverk.",
      address: "Plaza de las Flores, Estepona",
    },
    {
      category: "EVENT" as const,
      title: "Flamenco-show",
      description: "Äkta flamenco i traditionell miljö. Boka bord i förväg – populärt bland turister som lokalbefolkning.",
      address: "Tablao Flamenco, Málaga",
    },
    {
      category: "EXCURSION" as const,
      title: "Ronda – stadens berg",
      description: "En av Spaniens vackraste städer. Besök den spektakulära bron Puente Nuevo och gamla stadsdelen.",
      address: "Ronda, Málaga",
    },
  ];

  for (const tip of tips) {
    await prisma.tip.create({ data: tip });
  }
  console.log(`✅ ${tips.length} tips skapade`);

  console.log("\n🎉 Databas seedades framgångsrikt!");
  console.log("\nAdmin-loginuppgifter:");
  console.log("  E-post:   admin@torbe.se");
  console.log("  Lösenord: admin123");
  console.log("\n⚠️  Ändra lösenordet via admin-panelen i produktion!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

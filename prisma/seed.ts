/**
 * Seeda databas med en admin-användare och exempeltips.
 * Kör: npx tsx prisma/seed.ts
 */
import "dotenv/config";
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

  // Tips om Mil Palmeras-området
  const tips = [
    {
      category: "RESTAURANT" as const,
      title: "El Varadero – Torre de la Horadada",
      description: "Topprestaurang i den charmiga fiskehamnen Torre de la Horadada, 2 km norrut. Perfekt friterad fisk, arroz caldoso och skumma glassar. Boka bord i förväg på helger.",
      address: "Puerto de Torre de la Horadada, Pilar de la Horadada",
      imageUrl: "/tips/restaurant.jpg",
      mapUrl: "https://maps.google.com/?q=Torre+de+la+Horadada+puerto",
    },
    {
      category: "RESTAURANT" as const,
      title: "Chiringuitos på Playa Mil Palmeras",
      description: "Strandbarerna längs vår strand serverar bocadillos, grillad fisk och kalla drycker. Perfekt lunch med fötterna i sanden. Öppna från tidig vår till sen höst.",
      address: "Playa de Mil Palmeras, Pilar de la Horadada",
      imageUrl: "/tips/beach.jpg",
      mapUrl: "https://maps.google.com/?q=Playa+Mil+Palmeras",
    },
    {
      category: "EXCURSION" as const,
      title: "Lo Pagán – Gyttjebad & flamingos",
      description: "Bara 8 km söderut i Lo Pagán kan du bada i det terapeutiska saltgyttjan vid Mar Menors strand. Flamingorna samlas i de angränsande saltdammarna – otroligt vackert! Gratis och öppet hela dygnet.",
      address: "Playa de Lo Pagán, San Pedro del Pinatar",
      imageUrl: "/tips/saltlake.jpg",
      mapUrl: "https://maps.google.com/?q=Lo+Pagan+mud+baths+San+Pedro+del+Pinatar",
    },
    {
      category: "EXCURSION" as const,
      title: "Torrevieja – Rosa saltsjöar",
      description: "15 km norrut ligger Torrevieja med Europas mest spektakulära rosa saltsjöar. Flamingor, havspromenaden Juan Aparicio och Submarino-museet. Besök även Naturparken Lagunas de La Mata.",
      address: "Torrevieja, Alicante",
      imageUrl: "/tips/saltlake.jpg",
      mapUrl: "https://maps.google.com/?q=Salinas+de+Torrevieja",
      website: "https://www.torrevieja.es",
    },
    {
      category: "EXCURSION" as const,
      title: "Guardamar del Segura – Sanddynerna",
      description: "20 km norrut längs kusten möts du av ett dramatiskt landskap med sanddyner, tallar och en av Costa Blancas finaste stränder. Toppen för cykelturer och naturpromenader. Blue Flag-strand.",
      address: "Guardamar del Segura, Alicante",
      imageUrl: "/tips/beach.jpg",
      mapUrl: "https://maps.google.com/?q=Guardamar+del+Segura+dunas",
    },
    {
      category: "EXCURSION" as const,
      title: "Alicante – Slottet Santa Bárbara",
      description: "66 km norrut ligger provinshuvudstaden Alicante. Klättra upp till det imponerande renässansslottet Santa Bárbara med fantastisk utsikt. Promenera längs Esplanade de España och njut av tapas i gamla stan (El Barrio).",
      address: "Castillo de Santa Bárbara, Alicante",
      imageUrl: "/tips/castle.jpg",
      mapUrl: "https://maps.google.com/?q=Castillo+Santa+Barbara+Alicante",
    },
    {
      category: "MARKET" as const,
      title: "Torreviejas fredagsmarknad",
      description: "En av Costa Blancas största och bästa utomhusmarknader hålls varje fredag i Torrevieja (09–14). Kläder, skor, lokala delikatesser, kryddor och hantverk. Kul och billigt!",
      address: "Avenida de las Cortes Valencianas, Torrevieja",
      imageUrl: "/tips/market.jpg",
      mapUrl: "https://maps.google.com/?q=Mercado+Torrevieja+viernes",
    },
    {
      category: "MARKET" as const,
      title: "La Zenia Boulevard",
      description: "Stort och fint utomhusshopping-center 10 km norrut i Orihuela Costa. Zara, Mango, H&M, restauranger och biografer – allt under spansk sol. Öppet dagligen till 22:00.",
      address: "La Zenia Boulevard, Orihuela Costa",
      imageUrl: "/tips/shopping.jpg",
      mapUrl: "https://maps.google.com/?q=La+Zenia+Boulevard",
      website: "https://www.lazeniaboulevardonline.com",
    },
    {
      category: "EVENT" as const,
      title: "Midsommarfirande – San Juan",
      description: "Natten till 24 juni tänds jättebål på alla stränder i Spanien till midsommarfirandet Sant Joan / San Juan. Eldverk, musik och folk som hoppar över elden vid midnatt. Inte att missa!",
      address: "Playa de Mil Palmeras & Torre de la Horadada",
      imageUrl: "/tips/beach.jpg",
    },
    {
      category: "OTHER" as const,
      title: "Torre de la Horadada – Vakttorn (1591)",
      description: "Det medeltida vakttornet i den angränsande byn Torre de la Horadada byggdes 1591 för att skydda mot pirater. Promenera längs den charmiga hamnpromenaden och njut av en glass.",
      address: "Torre de la Horadada, Pilar de la Horadada",
      imageUrl: "/tips/castle.jpg",
      mapUrl: "https://maps.google.com/?q=Torre+de+la+Horadada+watchtower",
    },
    {
      category: "OTHER" as const,
      title: "Romersk stenstäkt – Playa Mil Palmeras",
      description: "På norra delen av vår strand finns rester av en romersk stentäkt från antiken – en fascinerande historisk kuriositet alldeles intill sanden. Den romerska bosättningen Thiar låg här längs Via Augusta.",
      address: "Playa de Mil Palmeras (norra delen), Pilar de la Horadada",
      imageUrl: "/tips/beach.jpg",
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

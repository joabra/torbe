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
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Puerto_deportivo_Torre_Horadada.jpg",
      mapUrl: "https://maps.google.com/?q=Torre+de+la+Horadada+puerto",
    },
    {
      category: "RESTAURANT" as const,
      title: "Chiringuitos på Playa Mil Palmeras",
      description: "Strandbarerna längs vår strand serverar bocadillos, grillad fisk och kalla drycker. Perfekt lunch med fötterna i sanden. Öppna från tidig vår till sen höst.",
      address: "Playa de Mil Palmeras, Pilar de la Horadada",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg/1920px-Playa_de_las_Mil_Palmeras_%28Alicante%29.jpg",
      mapUrl: "https://maps.google.com/?q=Playa+Mil+Palmeras",
    },
    {
      category: "EXCURSION" as const,
      title: "Lo Pagán – Gyttjebad & flamingos",
      description: "Bara 8 km söderut i Lo Pagán kan du bada i det terapeutiska saltgyttjan vid Mar Menors strand. Flamingorna samlas i de angränsande saltdammarna – otroligt vackert! Gratis och öppet hela dygnet.",
      address: "Playa de Lo Pagán, San Pedro del Pinatar",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg/1920px-Vista_a%C3%A9rea_del_puerto_deportivo_de_Lo_Pag%C3%A1n_01.jpg",
      mapUrl: "https://maps.google.com/?q=Lo+Pagan+mud+baths+San+Pedro+del+Pinatar",
    },
    {
      category: "EXCURSION" as const,
      title: "Torrevieja – Rosa saltsjöar",
      description: "15 km norrut ligger Torrevieja med Europas mest spektakulära rosa saltsjöar. Flamingor, havspromenaden Juan Aparicio och Submarino-museet. Besök även Naturparken Lagunas de La Mata.",
      address: "Torrevieja, Alicante",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Laguna_Salada_de_Torrevieja_-_52451565734.jpg/1920px-Laguna_Salada_de_Torrevieja_-_52451565734.jpg",
      mapUrl: "https://maps.google.com/?q=Salinas+de+Torrevieja",
      website: "https://www.torrevieja.es",
    },
    {
      category: "EXCURSION" as const,
      title: "Guardamar del Segura – Sanddynerna",
      description: "20 km norrut längs kusten möts du av ett dramatiskt landskap med sanddyner, tallar och en av Costa Blancas finaste stränder. Toppen för cykelturer och naturpromenader. Blue Flag-strand.",
      address: "Guardamar del Segura, Alicante",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/R%C3%A1bita_Califal.JPG/1920px-R%C3%A1bita_Califal.JPG",
      mapUrl: "https://maps.google.com/?q=Guardamar+del+Segura+dunas",
    },
    {
      category: "EXCURSION" as const,
      title: "Alicante – Slottet Santa Bárbara",
      description: "66 km norrut ligger provinshuvudstaden Alicante. Klättra upp till det imponerande renässansslottet Santa Bárbara med fantastisk utsikt. Promenera längs Esplanade de España och njut av tapas i gamla stan (El Barrio).",
      address: "Castillo de Santa Bárbara, Alicante",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG/1920px-Castillo_de_Santa_B%C3%A1rbara%2C_Alicante%2C_Espa%C3%B1a%2C_2014-07-04%2C_DD_61.JPG",
      mapUrl: "https://maps.google.com/?q=Castillo+Santa+Barbara+Alicante",
    },
    {
      category: "MARKET" as const,
      title: "Torreviejas fredagsmarknad",
      description: "En av Costa Blancas största och bästa utomhusmarknader hålls varje fredag i Torrevieja (09–14). Kläder, skor, lokala delikatesser, kryddor och hantverk. Kul och billigt!",
      address: "Avenida de las Cortes Valencianas, Torrevieja",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Torrevieja_-_Mercado_Central_%27La_Plasa%27_3.jpg",
      mapUrl: "https://maps.google.com/?q=Mercado+Torrevieja+viernes",
    },
    {
      category: "MARKET" as const,
      title: "La Zenia Boulevard",
      description: "Stort och fint utomhusshopping-center 10 km norrut i Orihuela Costa. Zara, Mango, H&M, restauranger och biografer – allt under spansk sol. Öppet dagligen till 22:00.",
      address: "La Zenia Boulevard, Orihuela Costa",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/La_Zenia_Boulevard_%2849287363646%29.jpg/1920px-La_Zenia_Boulevard_%2849287363646%29.jpg",
      mapUrl: "https://maps.google.com/?q=La+Zenia+Boulevard",
      website: "https://www.lazeniaboulevardonline.com",
    },
    {
      category: "EVENT" as const,
      title: "Midsommarfirande – San Juan",
      description: "Natten till 24 juni tänds jättebål på alla stränder i Spanien till midsommarfirandet Sant Joan / San Juan. Eldverk, musik och folk som hoppar över elden vid midnatt. Inte att missa!",
      address: "Playa de Mil Palmeras & Torre de la Horadada",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg/1920px-Estado_de_la_playa_del_Orz%C3%A1n_despu%C3%A9s_de_la_noche_de_San_Juan_-_A_Coru%C3%B1a%2C_Galicia%2C_Spain_-_24_June_2010.jpg",
    },
    {
      category: "OTHER" as const,
      title: "Torre de la Horadada – Vakttorn (1591)",
      description: "Det medeltida vakttornet i den angränsande byn Torre de la Horadada byggdes 1591 för att skydda mot pirater. Promenera längs den charmiga hamnpromenaden och njut av en glass.",
      address: "Torre de la Horadada, Pilar de la Horadada",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg/1920px-Club_n%C3%A1utico_de_Torre_de_la_Horadada_3.jpg",
      mapUrl: "https://maps.google.com/?q=Torre+de+la+Horadada+watchtower",
    },
    {
      category: "OTHER" as const,
      title: "Romersk stenstäkt – Playa Mil Palmeras",
      description: "På norra delen av vår strand finns rester av en romersk stentäkt från antiken – en fascinerande historisk kuriositet alldeles intill sanden. Den romerska bosättningen Thiar låg här längs Via Augusta.",
      address: "Playa de Mil Palmeras (norra delen), Pilar de la Horadada",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Sea_Time_%2824023423%29.jpeg/1920px-Sea_Time_%2824023423%29.jpeg",
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

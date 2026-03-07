/**
 * Seed-script: Fyll i husmanual från ägarens PDF (Jan & Anita Torbe).
 * Kör med: npx tsx prisma/seed-manual.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const arrivalInfo = {
  wifiName: "Flexa_E3A2",
  wifiPassword: "wb6q5HZ4",
  checkInInstructions:
    `Adressen är: Av. Holanda (Res. Garda Casa) 10.4, Plan Baja – 03191 Mil Palmeras, Pilar de la Horadada.

Framme vid Garda: Leta upp grinden (grön) där det står 10.4. Öppna grinden genom att trycka ner handtaget på insidan. Du kommer in på den mindre altanen med ingång till köket. Öppna dörren med erhållen nyckel.

Reservnyckel: Om du inte hittar nyckeln finns en reservnyckel i nyckelskåpet på väggen vid värmepumpen. Koden är 0618.

Reservnycklar till dörrar, grindar och bilen finns även i besticklådan i köket.`,
  parkingInfo:
    `Bilen (Opel Corsa 2008, guldgul, reg. 6304 FZL) hämtas på Royal Parking vid Alicante Airport.

Vid ankomst: Ring Royal Parking, tel. +34 656 274 206, när du är vid bussparkeringen (plats 1–5). De hämtar upp er. Kundnummer: A636. Bilen är fulltankad vid hämtning. Två lösa barnkuddar finns i bilen.

GPS-adress: Av Holanda 10, Pilar de la Horadada (Mil Palmeras). Kör ut på N332 – alla rondeller körs rakt igenom. Sväng av vid rondellen som skyltar mot Pilar de la Horadada (kinarestaurang snett till vänster = rätt rondell).

Kostnad: 150 kr/dag (gäller alla).

Vid hemresa: Tanka bilen fullt och lämna den på Royal Parking. Lämna nyckeln till personalen på kontoret – de skjutsar er till flygplatsen (5–10 min).

OBS: Ställ belysningsknappen (till vänster om ratten) på 0 vid parkering, annars kan batteriet laddas ur. Startkablar finns i bagageluckan om det behövs.`,
  houseRules:
    `• Väggarna är målade gipsskivor och mycket känsliga för slag och stötar – var försiktiga.
• Håll golvet fritt från smulor och matrester – annars dyker det upp myror.
• Vid luftkonditionering på dagen: håll dörrar och fönster stängda.
• Lås alltid grinden mot gatan och dörren mot poolen när ni går ut.
• Sätt belysningsknappen i bilen på 0 vid parkering.`,
  emergencyContact:
    `Ägare: Jan och Anita Torbe
Royal Parking (bil/flygplats): +34 656 274 206, kundnummer A636`,
  departureChecklist: [
    "Bädda rent och tvätta använda sängkläder (alt. lägg dem i tvättstugan)",
    "Stäng av vattnet med huvudkranen (på gästtoaletten)",
    "Stäng av varmvattenberedaren (tryck på on/off-knappen)",
    "Stäng av luftkonditioneringen",
    "Städa – dammsug och torka golvet",
    "Sätt in möbler, tvättställningar, strandstolar och slangar enligt instruktion",
    "Fäll ihop grillen och placera den i förrådet under trappan",
    "Kolla kylen – ta ur det som inte håller sig länge",
    "Se till att det finns 3–5 dagars förbrukningsartiklar kvar (tvål, tandkräm, schampo, toalettpapper, diskmedel etc.)",
    "Se till att det finns 3–5 liter dricksvatten kvar",
    "Dra ner jalusierna",
    "Lås grinden mot poolen",
    "Lås dörren mot poolen inifrån",
    "Lås dörren mot gatan utifrån",
    "Lås grinden mot gatan",
    "Resan till flygplatsen tar ca 1 timme med bil",
  ],
  manualSections: [
    {
      title: "Bil – hämtning och lämning",
      content:
        `Bilen är en Opel Corsa 2008, guldgul, registreringsnummer: 6304 FZL.

Hämtning vid ankomst:
Ring Royal Parking, tel. +34 656 274 206, när du är vid bussparkeringen (plats 1–5). Kundnummer A636. De hämtar upp er och kör er till Royal Parking där bilen står. Visa passet och följ deras instruktioner. Bilen är fulltankad vid hämtning. Två lösa barnkuddar finns i bilen.

GPS-inställning: Ort: Pilar de la Horadada (Mil Palmeras). Gata: Av Holanda 10. Väg N332 tar er hela vägen. Alla rondeller körs rakt igenom. Sväng av vid rondellen mot Pilar de la Horadada – ett bra riktmärke är en svart kinarestaurang snett till vänster om rondellen.

Hemresa:
Ställ in GPS:en på Alicante Airport. Tanka bilen fullt ca 5 km innan flygplatsen, ta avfarten mot El Altet, kör rakt igenom rondellen – Royal Parking ligger ca 100m efter rondellen till höger. Ring på porttelefonen om grinden är stängd. Lämna nyckeln på kontoret – de skjutsar er till flygplatsen.

OBS: Ställ belysningsknappen (till vänster om ratten) på 0 vid parkering. Om batteriet ändå tar slut kan bilen rullas igång, eller använd startkablarna i bagageluckan.

Kostnad: 150 kr/dag (gäller alla – barn och gäster inkluderat). Kostnaden delas lika mellan dem som använder bilen.`,
    },
    {
      title: "Vatten & varmvatten",
      content:
        `Vattnet är AVSTÄNGT vid ankomst.

Slå på vattnet: Vrid på den stora kranen med röd märkning på väggen i gästtoaletten (märkt "Avstängning vatten"). OBS: Det kan bli luftsmällar när du öppnar kranar efter att vattnet har varit avstängt – öppna försiktigt.

Varmvattenberedaren: Slå på den genom att trycka på on/off-knappen till vänster om displayen.

Dricksvatten: Vid ankomst finns dricksvatten (dunk eller flaskor). Lämna 3–5 liter kvar vid avresa.`,
    },
    {
      title: "Luftkonditionering (AC)",
      content:
        `Sätt på luftkonditioneringen genom att trycka på ON.
Ställ in önskad temperatur med pilarna upp/ner.
Rekommendation: 25°C på dagen, 23°C på natten.

OBS: När luftkonditioneringen är på ska dörrar och fönster vara stängda.
Om korsdrag behövs (t.ex. vid myrmedel) måste luftkonditioneringen stängas av.`,
    },
    {
      title: "Myror",
      content:
        `Håll golvet fritt från smulor och matrester – annars dyker det upp myror.

Bekämpning: Dammsug och använd myrmedel. Om myrmedel sprayas (luktar starkt): använd munskydd och vädra med korsdrag. OBS: Stäng då av luftkonditioneringen.`,
    },
    {
      title: "Diskmaskin",
      content:
        `1. Ladda maskinen.
2. Tryck på "Auto Off" på uppsidan av luckan.
3. Stäng luckan och välj program med programknappen.
4. Tryck på programknappen tills 30 visas i displayen.
5. Tryck på Start.

Luckan öppnas automatiskt när maskinen är klar. Disken måste plockas ut manuellt.`,
    },
    {
      title: "Grill (Weber Traveler, gasol)",
      content:
        `Om grillen är hopfälld (bara några decimeter hög): dra i det röda handtaget och lossa på den röda spärren på sidan – då fälls grillen upp.

Tändning:
1. Skruva fast gasolslangen uppe till höger på grillen.
2. Öppna kranen vid slanganslutningen.
3. Öppna gasreglaget på framsidan.
4. Tryck på den röda knappen på framsidan – grillen tänds. Kontrollera att det syns små lågor vid brännarna.

OBS: Innan grillen fälls ihop efter användning – rengör fettskålen på undersidan från fett (annars droppar det fett på golvet).

Grillen förvaras i förrådet under trappan.`,
    },
    {
      title: "Förråd",
      content:
        `Under trappan finns ett förråd för strandstolar, grill med mera.
Förrådsdörren är låst med ett hänglås.
Kod: 036`,
    },
    {
      title: "Laptop och surfplattor",
      content:
        `En laptop och två surfplattor finns tillgängliga i en låda i TV-bänken. De är anslutna till befintligt WiFi-nätverk.
PIN-kod till laptop: 0618`,
    },
    {
      title: "Jalusier och vattenslangar",
      content:
        `Jalusier: Dra upp dem genom att dra i banden som sitter på ena sidan av fönstren. Jalusierna ska dras ner vid avresa.

Vattenslangar: Finns på båda altanerna. Används för att spola av sand från fötter och andra kroppsdelar efter stranden, eller för att spola rentgolven på altanerna.`,
    },
    {
      title: "Sopor",
      content:
        `Sopor slängs i den stora soptunnan på gatan.

Gå ut genom grinden mot gatan, sväng åt vänster och gå utmed muren tills du kommer till Av. Italia. Vrid till höger – där ser du 3 soptunnor. Öppna locket med handtaget (lyft uppåt). Kasta soporna. Gå samma väg tillbaka.`,
    },
    {
      title: "Restauranger och shopping",
      content:
        `Restauranger:
Gå gatan mot havet – nära havet (ca 6–700 m) ligger 4 restauranger samt en restauranggata med flera restauranger och barer. Mot N332 finns en kinarestaurang (svart byggnad).

Köpcentrum La Zenia (ca 4–5 km mot Torrevieja på N332):
Kolla efter en stor vit skylt med "KARE" rakt fram. Sväng vänster i nästa rondell. Consum syns på vänster sida. Kör till nästa rondell och sväng höger – där ligger Lidl. På baksidan av samma hus finns Mercadona (mat, öl, vin, sprit – bra priser). Håll höger efter rondellen så kommer du till La Zenia köpcenter (på vänster sida lite längre fram). Stor gratis parkering under köpcentret.

Nära lägenheten:
En matbutik finns ca 700 m från lägenheten.
Mercadona finns även i Horadada, ca 5 km söderut på N332.`,
    },
    {
      title: "Termometrar",
      content:
        `Det finns flera termometrar i lägenheten:
• Köksfläkten: En visar inner- och yttertemperatur. En annan visar temperaturen i kylskåpet och innetemperaturen.
• Altanen mot poolen: En termometer hänger på väggen. Kolla var överkanten på kvicksilverpelaren slutar – det är aktuell temperatur.`,
    },
    {
      title: "Manualer och viktiga handlingar",
      content:
        `Manualer, pärmar med viktiga papper, telefonnummer och andra viktiga handlingar finns i höger låda i TV-bänken. Öppna lådan genom att ta i handtaget och dra utåt.`,
    },
    {
      title: "Kostnader",
      content:
        `Barn, barnbarn och barnbarnsbarn (och gäster i deras närvaro) samt inbjudna gäster (i ägarnas närvaro) disponerar lägenheten utan kostnad.

Övriga nära släktingar och vänner som lånar lägenheten debiteras en självkostnad (el, vatten, försäkring, TV, WiFi, samfällighetsavgift, underhåll, deklaration, fastighetsskatt, förbrukningsartiklar m.m.): för närvarande 600 kr/dygn.

Övriga: marknadspris.

Bil: 150 kr/dag (gäller alla).`,
    },
  ],
};

async function main() {
  const existing = await prisma.apartmentInfo.findFirst();

  if (existing) {
    await prisma.apartmentInfo.update({
      where: { id: existing.id },
      data: { arrivalInfo },
    });
    console.log("✅ ApartmentInfo uppdaterad med husmanual.");
  } else {
    await prisma.apartmentInfo.create({
      data: {
        title: "Garda – Familjens lägenhet i Spanien",
        description:
          "Lägenheten Garda tillhör Jan och Anita Torbe och ligger på Av. Holanda (Res. Garda Casa) 10.4, Plan Baja – 03191 Mil Palmeras, Pilar de la Horadada, Alicante, Spanien.",
        maxGuests: 8,
        arrivalInfo,
      },
    });
    console.log("✅ ApartmentInfo skapad med husmanual.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

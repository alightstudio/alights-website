const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const brands = [
    { id: "1", name: "Porsche", slug: "porsche", order: 1 },
    { id: "2", name: "BMW", slug: "bmw", order: 2 },
    { id: "3", name: "Audi", slug: "audi", order: 3 },
    { id: "4", name: "Tesla", slug: "tesla", order: 4 },
    { id: "5", name: "Huawei", slug: "huawei", order: 5 },
    { id: "6", name: "Xiaomi", slug: "xiaomi", order: 6 },
    { id: "7", name: "OPPO", slug: "oppo", order: 7 },
    { id: "8", name: "vivo", slug: "vivo", order: 8 },
    { id: "9", name: "Samsung", slug: "samsung", order: 9 },
    { id: "10", name: "Sony", slug: "sony", order: 10 },
    { id: "11", name: "Apple", slug: "apple", order: 11 },
    { id: "12", name: "DJI", slug: "dji", order: 12 },
    { id: "13", name: "Bose", slug: "bose", order: 13 },
    { id: "14", name: "Nike", slug: "nike", order: 14 },
    { id: "15", name: "FILA", slug: "fila", order: 15 },
    { id: "16", name: "Anta", slug: "anta", order: 16 },
    { id: "17", name: "Li-Ning", slug: "lining", order: 17 },
    { id: "18", name: "Under Armour", slug: "underarmour", order: 18 },
    { id: "19", name: "New Balance", slug: "newbalance", order: 19 }
  ];
  
  await prisma.siteConfig.upsert({
    where: { key: "brands" },
    update: { value: JSON.stringify(brands) },
    create: { key: "brands", value: JSON.stringify(brands) }
  });
  
  console.log("✅ Brands updated: 19 real-logo brands (no placeholders)");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

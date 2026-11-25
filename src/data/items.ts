import type { Category, ItemStatus } from "@/types/item";

export type SeedItemInput = {
  name: string;
  category: Category;
  status: ItemStatus;
  amazonAsin?: string;
  defaultQty: number;
  daysAgo: number;
};

export const DEFAULT_SEED_ITEMS: SeedItemInput[] = [
  {
    name: "厕纸",
    category: "bathroom",
    status: "red",
    amazonAsin: "B074CR89IB",
    defaultQty: 2,
    daysAgo: 32,
  },
  {
    name: "狗粮",
    category: "pet",
    status: "red",
    defaultQty: 1,
    daysAgo: 40,
  },
  {
    name: "洗洁精",
    category: "bathroom",
    status: "yellow",
    defaultQty: 1,
    daysAgo: 21,
  },
  {
    name: "矿泉水",
    category: "kitchen",
    status: "yellow",
    defaultQty: 2,
    daysAgo: 14,
  },
  {
    name: "咖啡胶囊",
    category: "kitchen",
    status: "green",
    defaultQty: 1,
    daysAgo: 5,
  },
  {
    name: "垃圾袋",
    category: "other",
    status: "green",
    defaultQty: 1,
    daysAgo: 7,
  },
];

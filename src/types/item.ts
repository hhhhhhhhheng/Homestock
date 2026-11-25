export type Category = "kitchen" | "bathroom" | "pet" | "other";

export type ItemStatus = "green" | "yellow" | "red";

export type Item = {
  id: string;
  householdId: string;
  name: string;
  category: Category;
  status: ItemStatus;
  amazonAsin?: string;
  defaultQty: number;
  lastRestockedAt: string;
};

export interface OptionChoiceData {
  id: string;
  name: string;
  extraPrice: number;
}

export interface OptionGroupData {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  isRequired: boolean;
  choices: OptionChoiceData[];
}

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  optionGroups: OptionGroupData[];
}

export interface CategoryData {
  id: string;
  name: string;
  items: MenuItemData[];
}

export interface RestaurantData {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface TableData {
  id: string;
  label: string;
  qrToken: string;
}

export interface TableMenuData {
  restaurant: RestaurantData;
  table: TableData;
  categories: CategoryData[];
}

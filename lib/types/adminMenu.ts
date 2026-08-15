import type { OptionSelectionType } from "@/lib/types/database.types";

export interface AdminOptionChoice {
  id: string;
  name: string;
  extraPrice: number;
}

export interface AdminOptionGroup {
  id: string;
  name: string;
  selectionType: OptionSelectionType;
  isRequired: boolean;
  choices: AdminOptionChoice[];
}

export interface AdminMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
  optionGroups: AdminOptionGroup[];
}

export interface AdminCategory {
  id: string;
  name: string;
  items: AdminMenuItem[];
}

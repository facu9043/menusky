export interface CartSelectedOption {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  extraPrice: number;
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  photoUrl: string | null;
  basePrice: number;
  quantity: number;
  selectedOptions: CartSelectedOption[];
  note: string;
}

export function cartItemUnitPrice(item: CartItem): number {
  const optionsTotal = item.selectedOptions.reduce(
    (sum, opt) => sum + opt.extraPrice,
    0
  );
  return item.basePrice + optionsTotal;
}

export function cartItemSubtotal(item: CartItem): number {
  return cartItemUnitPrice(item) * item.quantity;
}

import { SellerGate } from "@/components/layout/SellerGate";
import { ItemForm } from "@/components/items/ItemForm";

export default function NewItemPage() {
  return (
    <SellerGate>
      <ItemForm />
    </SellerGate>
  );
}

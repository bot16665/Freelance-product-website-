import { SellerGate } from "@/components/layout/SellerGate";
import { StaffOrders } from "@/components/orders/StaffOrders";

export default function StaffOrdersPage() {
  return (
    <SellerGate>
      <StaffOrders />
    </SellerGate>
  );
}

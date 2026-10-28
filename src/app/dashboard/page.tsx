import { SellerGate } from "@/components/layout/SellerGate";
import { ItemsDashboard } from "@/components/items/ItemsDashboard";

export default function DashboardPage() {
  return (
    <SellerGate>
      <ItemsDashboard />
    </SellerGate>
  );
}

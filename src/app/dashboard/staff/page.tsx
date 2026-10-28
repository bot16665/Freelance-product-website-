import { SellerGate } from "@/components/layout/SellerGate";
import { StaffManager } from "@/components/staff/StaffManager";

export default function StaffPage() {
  return (
    <SellerGate>
      <StaffManager />
    </SellerGate>
  );
}

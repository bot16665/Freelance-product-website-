import { Suspense } from "react";
import { SellerGate } from "@/components/layout/SellerGate";
import { ItemDetailsView } from "@/components/items/ItemDetails";

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense
        fallback={
          <p className="flex min-h-screen items-center justify-center text-slate-500">
            Loading item details...
          </p>
        }
      >
        <ItemDetailsSection params={params} />
      </Suspense>
    </main>
  );
}

async function ItemDetailsSection({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SellerGate>
      <ItemDetailsView itemId={id} />
    </SellerGate>
  );
}

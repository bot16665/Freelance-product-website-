import { Suspense } from "react";
import { SellerGate } from "@/components/layout/SellerGate";
import { ItemForm } from "@/components/items/ItemForm";

export default function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
          Loading item details...
        </main>
      }
    >
      <EditItemSection params={params} />
    </Suspense>
  );
}

async function EditItemSection({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <SellerGate>
      <ItemForm itemId={id} />
    </SellerGate>
  );
}

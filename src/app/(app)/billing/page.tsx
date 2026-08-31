import { redirect } from "next/navigation";

export const metadata = {
  title: "Billing | Inkest",
  description: "Credit balance, crypto top-ups, and payment history.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ payment?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const payment = params?.payment;
  const query = payment
    ? `?tab=billing&payment=${encodeURIComponent(payment)}`
    : "?tab=billing";
  redirect(`/settings${query}`);
}


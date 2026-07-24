import { listVaultItems } from "@/server/vault/vault-service";
import { VaultView } from "@/components/vault/vault-view";

export const metadata = {
  title: "Vault | Inkest",
  description: "Zero-knowledge client-side encrypted vault for secrets, API keys, and sensitive notes.",
};

export default async function VaultPage() {
  const items = await listVaultItems();
  return <VaultView initialItems={items} />;
}

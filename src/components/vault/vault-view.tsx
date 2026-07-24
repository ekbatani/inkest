"use client";

import * as React from "react";
import { Lock, Unlock, Plus, Eye, EyeOff, Copy, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { encryptVaultSecret, decryptVaultSecret } from "@/lib/vault-crypto";
import { createVaultItemAction, deleteVaultItemAction } from "@/server/vault/actions";
import type { VaultCategory } from "@/server/vault/vault-service";

interface VaultItemRow {
  id: string;
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  createdAt: Date;
}

interface Props {
  initialItems: VaultItemRow[];
}

export function VaultView({ initialItems }: Props) {
  const [masterPassword, setMasterPassword] = React.useState("");
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [items, setItems] = React.useState<VaultItemRow[]>(initialItems);

  // New item modal
  const [newModalOpen, setNewModalOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [secretText, setSecretText] = React.useState("");
  const [category, setCategory] = React.useState<VaultCategory>("secret_note");
  const [isSaving, setIsSaving] = React.useState(false);

  // Revealed secrets store (client-side in-memory map)
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      toast.error("Enter your vault master password.");
      return;
    }
    setIsUnlocked(true);
    toast.success("Vault session unlocked.");
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !secretText.trim()) {
      toast.error("Provide a title and secret text.");
      return;
    }
    setIsSaving(true);
    try {
      const encrypted = await encryptVaultSecret(secretText, masterPassword);
      const res = await createVaultItemAction({
        title: title.trim(),
        category,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });

      setItems((prev) => [
        {
          id: res.id,
          title: title.trim(),
          category,
          ciphertext: `${encrypted.salt}:${encrypted.ciphertext}`,
          iv: encrypted.iv,
          createdAt: new Date(),
        },
        ...prev,
      ]);

      toast.success("Secret encrypted and stored in vault.");
      setNewModalOpen(false);
      setTitle("");
      setSecretText("");
    } catch {
      toast.error("Encryption failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleReveal = async (item: VaultItemRow) => {
    if (revealed[item.id]) {
      setRevealed((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      return;
    }

    try {
      const parts = item.ciphertext.split(":");
      const salt = parts[0] || "";
      const cipherHex = parts[1] || item.ciphertext;

      const plain = await decryptVaultSecret(cipherHex, item.iv, salt, masterPassword);
      setRevealed((prev) => ({ ...prev, [item.id]: plain }));
    } catch {
      toast.error("Decryption failed. Incorrect master password?");
    }
  };

  const handleCopySecret = async (plainText: string) => {
    await navigator.clipboard.writeText(plainText);
    toast.success("Secret copied to clipboard.");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVaultItemAction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item deleted from vault.");
    } catch {
      toast.error("Could not delete item.");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-12">
        <div className="rounded-2xl border border-violet-500/20 bg-card p-8 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
            <Lock className="size-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Zero-Knowledge Encrypted Vault</h1>
            <p className="text-xs text-muted-foreground">
              Enter your vault key to decrypt secrets in your browser. Inkest servers never see unencrypted secrets.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-3">
            <Input
              type="password"
              placeholder="Vault Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="text-center"
            />
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2">
              <Unlock className="size-4" /> Unlock Vault
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-6">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <ShieldCheck className="size-6 text-violet-500" />
            Encrypted Vault ({items.length})
          </h1>
          <p className="text-sm text-muted-foreground">
            Client-side AES-GCM 256-bit zero-knowledge storage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewModalOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="size-4" /> New Secret
          </Button>
          <Button variant="outline" onClick={() => setIsUnlocked(false)}>
            Lock Vault
          </Button>
        </div>
      </div>

      {/* Secret list */}
      <div className="divide-y rounded-xl border bg-card">
        {items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No secrets stored in vault yet.
          </div>
        ) : (
          items.map((item) => {
            const isRevealed = Boolean(revealed[item.id]);
            const plain = revealed[item.id];

            return (
              <div key={item.id} className="flex items-center justify-between p-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{item.title}</span>
                    <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300 capitalize">
                      {item.category.replace("_", " ")}
                    </span>
                  </div>
                  {isRevealed ? (
                    <div className="flex items-center gap-2 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                      <span>{plain}</span>
                      <button onClick={() => handleCopySecret(plain!)} className="hover:opacity-80" title="Copy">
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="font-mono text-muted-foreground">••••••••••••••••</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="xs" onClick={() => handleToggleReveal(item)}>
                    {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => handleDelete(item.id)} className="text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New secret dialog inline */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Add New Vault Secret</h3>
            <form onSubmit={handleCreateSecret} className="space-y-3">
              <div>
                <Label className="text-xs">Title / Identifier</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. OpenAI API Key"
                />
              </div>

              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VaultCategory)}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                >
                  <option value="secret_note">Secret Note</option>
                  <option value="password">Password</option>
                  <option value="key">API Key</option>
                  <option value="token">Token</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Secret Content</Label>
                <textarea
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  placeholder="Sensitive payload to encrypt..."
                  className="w-full h-24 rounded-md border bg-background p-2 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setNewModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSaving} className="bg-violet-600 text-white">
                  Encrypt & Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

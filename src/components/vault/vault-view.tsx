"use client";

import * as React from "react";
import { Lock, Unlock, Plus, Eye, EyeOff, Copy, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
      <div className="app-page items-center justify-center min-h-[70vh]">
        <div className="surface-card w-full max-w-md p-8 text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Zero-Knowledge Encrypted Vault</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your vault key to decrypt secrets in your browser. Inkest servers never see unencrypted secrets.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="Vault Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="text-center rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl shadow-sm gap-2">
              <Unlock className="size-4" /> Unlock Vault
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page gap-6 sm:gap-8">
      {/* Header */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span className="section-label">Zero-Knowledge Security</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl text-foreground">
              Encrypted Vault ({items.length})
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Client-side AES-GCM 256-bit zero-knowledge storage for secrets, API keys, and sensitive notes.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setNewModalOpen(true)} className="rounded-xl shadow-sm gap-2">
              <Plus className="size-4" /> New Secret
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsUnlocked(false)} className="rounded-xl">
              Lock Vault
            </Button>
          </div>
        </div>
      </div>

      {/* Secret list */}
      {items.length === 0 ? (
        <div className="surface-card-dashed p-12 text-center text-sm text-muted-foreground">
          No secrets stored in vault yet.
        </div>
      ) : (
        <div className="surface-card overflow-hidden divide-y divide-border/70">
          {items.map((item) => {
            const isRevealed = Boolean(revealed[item.id]);
            const plain = revealed[item.id];

            return (
              <div key={item.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{item.title}</span>
                    <Badge variant="secondary" className="text-[10px] font-medium capitalize">
                      {item.category.replace("_", " ")}
                    </Badge>
                  </div>
                  {isRevealed ? (
                    <div className="flex items-center gap-2 font-mono text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg w-fit">
                      <span>{plain}</span>
                      <button onClick={() => handleCopySecret(plain!)} className="hover:opacity-80 transition-opacity" title="Copy">
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="font-mono text-muted-foreground tracking-wider">••••••••••••••••</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleReveal(item)}>
                    {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New secret Dialog */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Add New Vault Secret
            </DialogTitle>
            <DialogDescription>
              Secrets are encrypted locally in your browser before being stored.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSecret} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title / Identifier</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OpenAI API Key"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VaultCategory)}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="secret_note">Secret Note</option>
                <option value="password">Password</option>
                <option value="key">API Key</option>
                <option value="token">Token</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Secret Content</Label>
              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Sensitive payload to encrypt..."
                className="w-full h-24 rounded-xl border border-input bg-background p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setNewModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving} className="rounded-xl shadow-sm">
                Encrypt & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


"use client";

import * as React from "react";
import {
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ShieldCheck,
  FileText,
  FileCode,
  FileKey,
  KeyRound,
  Download,
  Upload,
  Search,
  Check,
  File,
} from "lucide-react";
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
import {
  encryptVaultSecret,
  decryptVaultSecret,
  MAX_VAULT_CONTENT_LENGTH,
  MAX_VAULT_FILENAME_LENGTH,
} from "@/lib/vault-crypto";
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

function getFileIcon(category: string, fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".env") || lowerName.includes("env") || lowerName.endsWith(".json") || lowerName.endsWith(".yaml") || lowerName.endsWith(".yml") || lowerName.endsWith(".toml")) {
    return <FileCode className="size-4 text-emerald-500 shrink-0" />;
  }
  if (lowerName.endsWith(".pem") || lowerName.endsWith(".key") || lowerName.includes("id_rsa") || lowerName.includes("id_ed25519") || category === "key") {
    return <FileKey className="size-4 text-amber-500 shrink-0" />;
  }
  if (category === "password" || category === "token") {
    return <KeyRound className="size-4 text-sky-500 shrink-0" />;
  }
  if (category === "secret_note" || lowerName.endsWith(".md") || lowerName.endsWith(".txt")) {
    return <FileText className="size-4 text-primary shrink-0" />;
  }
  return <File className="size-4 text-muted-foreground shrink-0" />;
}

export function VaultView({ initialItems }: Props) {
  const [masterPassword, setMasterPassword] = React.useState("");
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [items, setItems] = React.useState<VaultItemRow[]>(initialItems);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // New item modal
  const [newModalOpen, setNewModalOpen] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [secretContent, setSecretContent] = React.useState("");
  const [category, setCategory] = React.useState<VaultCategory>("secret_note");
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Revealed secrets store (client-side in-memory map)
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      toast.error("Enter your vault master password.");
      return;
    }
    setIsUnlocked(true);
    toast.success("Vault session unlocked.");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200_000) {
      toast.error("File is too large. Maximum size for secret text area is 50KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || "";
      if (text.length > MAX_VAULT_CONTENT_LENGTH) {
        toast.warning(`File content exceeds limit and was truncated to ${MAX_VAULT_CONTENT_LENGTH.toLocaleString()} characters.`);
        setSecretContent(text.slice(0, MAX_VAULT_CONTENT_LENGTH));
      } else {
        setSecretContent(text);
      }

      if (!fileName.trim()) {
        setFileName(file.name.slice(0, MAX_VAULT_FILENAME_LENGTH));
      }
      toast.success(`Imported content from "${file.name}"`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again if needed
    e.target.value = "";
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFileName = fileName.trim();
    if (!cleanFileName) {
      toast.error("Provide a file name (key).");
      return;
    }
    if (!secretContent.trim()) {
      toast.error("Provide secret file content in the text area.");
      return;
    }
    if (secretContent.length > MAX_VAULT_CONTENT_LENGTH) {
      toast.error(`Secret content exceeds maximum size of ${MAX_VAULT_CONTENT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setIsSaving(true);
    try {
      const encrypted = await encryptVaultSecret(secretContent, masterPassword);
      const res = await createVaultItemAction({
        title: cleanFileName,
        category,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      });

      setItems((prev) => [
        {
          id: res.id,
          title: cleanFileName,
          category,
          ciphertext: `${encrypted.salt}:${encrypted.ciphertext}`,
          iv: encrypted.iv,
          createdAt: new Date(),
        },
        ...prev,
      ]);

      toast.success(`Secret file "${cleanFileName}" encrypted and stored.`);
      setNewModalOpen(false);
      setFileName("");
      setSecretContent("");
    } catch {
      toast.error("Encryption failed. Please try again.");
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

  const handleCopySecret = async (id: string, plainText: string) => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("File content copied to clipboard.");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleDownloadFile = (itemTitle: string, plainContent: string) => {
    try {
      const blob = new Blob([plainContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = itemTitle || "secret-file.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${itemTitle}"`);
    } catch {
      toast.error("Failed to download secret file.");
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    try {
      await deleteVaultItemAction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRevealed((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.success(`Deleted "${itemTitle}" from vault.`);
    } catch {
      toast.error("Could not delete vault item.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              Enter your vault master password to decrypt secret files and text areas in your browser. Inkest servers never see unencrypted secrets.
            </p>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="Vault Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="text-center rounded-xl"
              autoFocus
            />
            <Button type="submit" className="w-full rounded-xl shadow-sm gap-2">
              <Unlock className="size-4" /> Unlock Vault
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const charsRemaining = MAX_VAULT_CONTENT_LENGTH - secretContent.length;
  const isNearLimit = charsRemaining < 2000;

  return (
    <div className="app-page gap-6 sm:gap-8">
      {/* Header */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span className="section-label">Zero-Knowledge Secret Files</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl text-foreground">
              Encrypted Vault ({items.length})
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Client-side AES-GCM 256-bit encrypted storage for sensitive text areas, config files (<code className="font-mono text-xs">.env</code>), private keys, certificates, and confidential notes.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setNewModalOpen(true)} className="rounded-xl shadow-sm gap-2">
              <Plus className="size-4" /> New Secret File
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsUnlocked(false)} className="rounded-xl gap-2">
              <Lock className="size-3.5" /> Lock Vault
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search secret files..."
              className="pl-9 h-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "All Files" },
              { id: "secret_note", label: "Secret Notes" },
              { id: "key", label: "Keys / .env" },
              { id: "password", label: "Passwords / SSH" },
              { id: "token", label: "Tokens" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secret list */}
      {filteredItems.length === 0 ? (
        <div className="surface-card-dashed p-12 text-center text-sm text-muted-foreground space-y-2">
          <p>
            {searchQuery || categoryFilter !== "all"
              ? "No secret files match your search criteria."
              : "No secret files stored in vault yet."}
          </p>
          {!searchQuery && categoryFilter === "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewModalOpen(true)}
              className="rounded-xl mt-2 gap-1.5"
            >
              <Plus className="size-3.5" /> Add Your First Secret File
            </Button>
          )}
        </div>
      ) : (
        <div className="surface-card overflow-hidden divide-y divide-border/70">
          {filteredItems.map((item) => {
            const isRevealed = Boolean(revealed[item.id]);
            const plain = revealed[item.id];
            const lineCount = plain ? plain.split("\n").length : 0;
            const isCopied = copiedId === item.id;

            return (
              <div key={item.id} className="p-4 transition-colors hover:bg-muted/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(item.category, item.title)}
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-sm font-semibold text-foreground truncate">
                        {item.title}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-medium capitalize shrink-0">
                        {item.category.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleReveal(item)}
                      title={isRevealed ? "Hide content" : "Decrypt & reveal secret file"}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="size-3.5" />
                          <span className="hidden sm:inline">Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" />
                          <span className="hidden sm:inline">Reveal</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-destructive hover:text-destructive"
                      title="Delete secret file"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Secret Content Display */}
                {isRevealed && plain !== undefined ? (
                  <div className="rounded-xl border border-border/80 bg-muted/30 dark:bg-muted/20 overflow-hidden space-y-0">
                    {/* Toolbar inside revealed box */}
                    <div className="flex items-center justify-between px-3.5 py-2 bg-muted/60 dark:bg-muted/40 border-b border-border/60 text-[11px] text-muted-foreground">
                      <span className="font-mono">
                        {lineCount} {lineCount === 1 ? "line" : "lines"} • {plain.length.toLocaleString()} chars
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleCopySecret(item.id, plain)}
                          className="h-6 px-2 text-[11px] gap-1 font-medium hover:bg-background/80"
                        >
                          {isCopied ? (
                            <>
                              <Check className="size-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDownloadFile(item.title, plain)}
                          className="h-6 px-2 text-[11px] gap-1 font-medium hover:bg-background/80"
                          title="Download decrypted file"
                        >
                          <Download className="size-3" />
                          <span>Download</span>
                        </Button>
                      </div>
                    </div>

                    {/* Preformatted Text Area */}
                    <pre className="max-h-72 overflow-auto p-3.5 text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed select-text bg-background/50 dark:bg-black/20">
                      {plain}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground/80 pl-6">
                    <span>••••••••••••••••••••••••••••••••</span>
                    <span className="text-[10px] text-muted-foreground font-sans">(Encrypted text area)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New secret Dialog */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Add Encrypted Secret File
            </DialogTitle>
            <DialogDescription>
              Secret files (e.g. <code className="font-mono text-xs">.env</code>, SSH keys, certificates, config files) are encrypted client-side with AES-GCM 256 before being sent to the server.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSecret} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">File Name / Key</Label>
                <Input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. .env.production, id_ed25519, config.json"
                  maxLength={MAX_VAULT_FILENAME_LENGTH}
                  className="rounded-xl font-mono text-xs"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VaultCategory)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="secret_note">Secret Note / Doc</option>
                  <option value="key">Key / .env File</option>
                  <option value="password">Password / SSH Key</option>
                  <option value="token">API Token</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Secret Content (Text Area)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="size-3" />
                    <span>Import File</span>
                  </Button>
                  <span
                    className={`text-[11px] font-mono ${
                      isNearLimit ? "text-amber-500 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {secretContent.length.toLocaleString()} / {MAX_VAULT_CONTENT_LENGTH.toLocaleString()} chars
                  </span>
                </div>
              </div>

              <textarea
                value={secretContent}
                onChange={(e) => setSecretContent(e.target.value)}
                placeholder="Paste or import secret file content (e.g. environment variables, SSH private key, tokens, YAML/JSON configs, secret notes)..."
                maxLength={MAX_VAULT_CONTENT_LENGTH}
                rows={9}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Limited text area (up to {MAX_VAULT_CONTENT_LENGTH.toLocaleString()} characters) with full multi-line formatting preserved.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button variant="outline" size="sm" type="button" onClick={() => setNewModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving} className="rounded-xl shadow-sm gap-1.5">
                <Lock className="size-3.5" />
                {isSaving ? "Encrypting..." : "Encrypt & Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



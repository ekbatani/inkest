import { redirect } from "next/navigation";

// `/` is only reached from a browser — the desktop and mobile apps open
// `/dashboard` directly (see capacitor.config.ts and the Tauri launcher), so
// web visitors land on the marketing site, signed in or not.
export default function RootPage() {
  redirect("/landing");
}

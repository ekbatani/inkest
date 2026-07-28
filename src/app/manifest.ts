import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inkest — Markdown Workspace",
    short_name: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions.",
    start_url: "/notes",
    display: "standalone",
    background_color: "#18181b",
    theme_color: "#18181b",
    orientation: "any",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "New Note",
        short_name: "New Note",
        description: "Create a new Markdown note",
        url: "/notes/new",
      },
      {
        name: "Tasks",
        short_name: "Tasks",
        description: "View task dashboard",
        url: "/tasks",
      },
    ],
  };
}

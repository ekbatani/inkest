import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inkest — Markdown Workspace",
    short_name: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0c0a1f",
    theme_color: "#0c0a1f",
    orientation: "any",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/app-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-square.png",
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
        name: "Daily Journal",
        short_name: "Daily",
        description: "Open today's daily log",
        url: "/daily",
      },
      {
        name: "Projects & Tasks",
        short_name: "Projects",
        description: "View project Kanban boards",
        url: "/projects",
      },
    ],
  };
}

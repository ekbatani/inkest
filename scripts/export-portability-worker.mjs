import { writeFile } from "node:fs/promises";
import { buildExportArchiveForContext } from "../src/server/export/service.ts";

const output = process.env.EXPORT_DRILL_ARCHIVE;
if (!output) throw new Error("EXPORT_DRILL_ARCHIVE is required.");

const { buffer } = await buildExportArchiveForContext({
  user: { id: "export-user", email: "export@example.test", name: "Export Drill" },
  workspace: { id: "export-workspace", userId: "export-user", name: "Export", slug: "export" },
});
await writeFile(output, buffer);

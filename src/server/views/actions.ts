"use server";

import { revalidatePath } from "next/cache";
import {
  createSavedView,
  listSavedViews,
  deleteSavedView,
  executeSavedViewQuery,
  type SavedViewFilter,
} from "./service";

export async function createSavedViewAction(input: {
  name: string;
  icon?: string;
  filter: SavedViewFilter;
  sortOrder?: number;
}) {
  const view = await createSavedView(input);
  revalidatePath("/notes");
  return view;
}

export async function listSavedViewsAction() {
  return listSavedViews();
}

export async function deleteSavedViewAction(viewId: string) {
  await deleteSavedView(viewId);
  revalidatePath("/notes");
}

export async function runSavedViewAction(filter: SavedViewFilter) {
  return executeSavedViewQuery(filter);
}

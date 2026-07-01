ALTER TABLE `notes` ADD `sort_order` integer;
--> statement-breakpoint
WITH ranked_notes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY coalesce(parent_id, '__root__')
      ORDER BY created_at ASC, id ASC
    ) AS next_sort_order
  FROM `notes`
)
UPDATE `notes`
SET `sort_order` = (
  SELECT next_sort_order
  FROM ranked_notes
  WHERE ranked_notes.id = `notes`.id
);

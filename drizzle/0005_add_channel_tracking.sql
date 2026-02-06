ALTER TABLE "usage_records"
  ADD COLUMN IF NOT EXISTS "channel" text;

-- 回填历史数据中的 channel（优先从 raw.detail.auth_index 提取）
UPDATE "usage_records"
SET "channel" = NULLIF(("raw"::jsonb -> 'detail' ->> 'auth_index'), '')
WHERE "channel" IS NULL;
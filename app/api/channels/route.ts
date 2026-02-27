import { NextResponse } from "next/server";
import { and, sql, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { usageRecords, modelPrices } from "@/lib/db/schema";
import { estimateCost, priceMap } from "@/lib/usage";

type ChannelAggRow = {
  channel: string | null;
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  errorCount: number;
};

type ChannelModelAggRow = {
  channel: string | null;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
};

type ChannelGroupedRow = {
  channel_group: string;
  requests: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
  error_count: number;
};

type ChannelModelGroupedRow = {
  channel_group: string;
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_tokens: number;
};

type PriceRow = typeof modelPrices.$inferSelect;

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function parseDateInput(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function withDayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function withDayEnd(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const daysParam = searchParams.get("days");

  const startDate = parseDateInput(startParam);
  const endDate = parseDateInput(endParam);
  const hasCustomRange = startDate && endDate && endDate >= startDate;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const days = hasCustomRange 
    ? Math.max(1, Math.round((withDayEnd(endDate).getTime() - withDayStart(startDate).getTime()) / DAY_MS) + 1)
    : Math.min(Math.max(Math.floor(Number(daysParam) || 14), 1), 90);

  const since = hasCustomRange ? withDayStart(startDate!) : new Date(Date.now() - days * DAY_MS);
  const until = hasCustomRange ? withDayEnd(endDate!) : undefined;

  const whereParts: SQL[] = [gte(usageRecords.occurredAt, since)];
  if (until) whereParts.push(lte(usageRecords.occurredAt, until));
  const whereClause = whereParts.length ? and(...whereParts) : undefined;

  try {
    const channelGroupExpr = sql<string>`
      CASE
        -- codex-plus first (explicit account mapping)
        WHEN lower(coalesce(${usageRecords.source}, '')) IN ('leekayson33@gmail.com','fantasysk33@gmail.com','fantasysk3@gmail.com') THEN 'codex-plus'
        WHEN lower(coalesce(${usageRecords.channel}, '')) IN ('leekayson33@gmail.com','fantasysk33@gmail.com','fantasysk3@gmail.com') THEN 'codex-plus'
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%codex%' AND lower(coalesce(${usageRecords.source}, '')) LIKE '%plus%' THEN 'codex-plus'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%codex%' AND lower(coalesce(${usageRecords.channel}, '')) LIKE '%plus%' THEN 'codex-plus'

        -- gemini
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%gemini%' THEN 'gemini'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%gemini%' THEN 'gemini'

        -- iflow (explicit phone mapping + keyword)
        WHEN coalesce(${usageRecords.source}, '') IN ('156****0707','189****0038') THEN 'iflow'
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%iflow%' THEN 'iflow'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%iflow%' THEN 'iflow'

        -- nvidia
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE 'nvapi-%' THEN 'nvidia'
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%nvidia%' THEN 'nvidia'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%nvidia%' THEN 'nvidia'

        -- antigravity
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%antigravity%' THEN 'antigravity'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%antigravity%' THEN 'antigravity'

        -- codex (keyword + generic account-like fallback)
        WHEN lower(coalesce(${usageRecords.source}, '')) LIKE '%codex%' THEN 'codex'
        WHEN lower(coalesce(${usageRecords.channel}, '')) LIKE '%codex%' THEN 'codex'
        WHEN coalesce(${usageRecords.source}, '') LIKE '%@%' THEN 'codex'
        WHEN coalesce(${usageRecords.channel}, '') LIKE '%@%' THEN 'codex'

        -- fallback buckets
        WHEN coalesce(${usageRecords.channel}, '') ~ '^[0-9a-f]{8,}$' THEN 'unknown'
        WHEN coalesce(${usageRecords.source}, '') ~ '^[0-9a-f]{8,}$' THEN 'unknown'
        ELSE coalesce(nullif(${usageRecords.channel}, ''), nullif(${usageRecords.source}, ''), 'unknown')
      END
    `;

    // Fetch aggregated channel statistics (grouped)
    const channelAggRows: ChannelGroupedRow[] = await db
      .select({
        channel_group: channelGroupExpr,
        requests: sql<number>`count(*)`,
        tokens: sql<number>`sum(${usageRecords.totalTokens})`,
        input_tokens: sql<number>`sum(${usageRecords.inputTokens})`,
        output_tokens: sql<number>`sum(${usageRecords.outputTokens})`,
        reasoning_tokens: sql<number>`coalesce(sum(${usageRecords.reasoningTokens}), 0)`,
        cached_tokens: sql<number>`coalesce(sum(${usageRecords.cachedTokens}), 0)`,
        error_count: sql<number>`sum(case when ${usageRecords.isError} then 1 else 0 end)`
      })
      .from(usageRecords)
      .where(whereClause)
      .groupBy(channelGroupExpr)
      .orderBy(sql`count(*) desc`);

    // Fetch channel-model breakdown for cost calculation (grouped)
    const channelModelAggRows: ChannelModelGroupedRow[] = await db
      .select({
        channel_group: channelGroupExpr,
        model: usageRecords.model,
        requests: sql<number>`count(*)`,
        input_tokens: sql<number>`sum(${usageRecords.inputTokens})`,
        output_tokens: sql<number>`sum(${usageRecords.outputTokens})`,
        reasoning_tokens: sql<number>`coalesce(sum(${usageRecords.reasoningTokens}), 0)`,
        cached_tokens: sql<number>`coalesce(sum(${usageRecords.cachedTokens}), 0)`
      })
      .from(usageRecords)
      .where(whereClause)
      .groupBy(channelGroupExpr, usageRecords.model);

    // Fetch pricing information
    const priceRows: PriceRow[] = await db.select().from(modelPrices);
    const prices = priceMap(
      priceRows.map((p: PriceRow) => ({
        model: p.model,
        inputPricePer1M: Number(p.inputPricePer1M),
        cachedInputPricePer1M: Number(p.cachedInputPricePer1M),
        outputPricePer1M: Number(p.outputPricePer1M)
      }))
    );

    // Calculate costs per channel group
    const channelCostMap = new Map<string, number>();
    for (const row of channelModelAggRows) {
      const channelKey = row.channel_group || "unknown";
      const cost = estimateCost(
        {
          inputTokens: toNumber(row.input_tokens),
          cachedTokens: toNumber(row.cached_tokens),
          outputTokens: toNumber(row.output_tokens),
          reasoningTokens: toNumber(row.reasoning_tokens)
        },
        row.model,
        prices
      );
      channelCostMap.set(channelKey, (channelCostMap.get(channelKey) ?? 0) + cost);
    }

    // Build response
    const channels = channelAggRows.map((row) => {
      const channelKey = row.channel_group || "unknown";
      return {
        channel: channelKey,
        requests: toNumber(row.requests),
        totalTokens: toNumber(row.tokens),
        inputTokens: toNumber(row.input_tokens),
        outputTokens: toNumber(row.output_tokens),
        reasoningTokens: toNumber(row.reasoning_tokens),
        cachedTokens: toNumber(row.cached_tokens),
        errorCount: toNumber(row.error_count),
        cost: Number((channelCostMap.get(channelKey) ?? 0).toFixed(4))
      };
    });

    return NextResponse.json({ channels, days });
  } catch (error) {
    console.error("Error fetching channel statistics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

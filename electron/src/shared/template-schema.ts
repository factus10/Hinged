// Zod schema for .hinged-template.json files.
//
// Templates are the catalog *scaffolding* of an album: the catalog numbers,
// years, denominations, colors — without any of the user's personal data
// (ownership status, condition, prices, notes, images). They're meant to be
// shared between collectors so that one person's work cataloguing "US Scott
// 1-100" can be picked up by anyone else.
//
// Hinged itself ships zero templates. The format and the import/export tools
// are the only things the app provides; everything in any given template is
// authored by the person who exported it.

import { z } from 'zod';

export const TEMPLATE_VERSION = 1;
export const TEMPLATE_KIND = 'hinged-template' as const;

const decimalLike = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v) => (v == null ? null : typeof v === 'number' ? String(v) : v));

const templateStampSchema = z.object({
  catalogNumber: z.string(),
  yearStart: z.number().int().nullable().optional(),
  yearEnd: z.number().int().nullable().optional(),
  denomination: z.string().optional().default(''),
  color: z.string().optional().default(''),
  perforationGauge: decimalLike,
  watermark: z.string().nullable().optional(),
});

const templateCountrySchema = z.object({
  name: z.string(),
  catalogPrefixes: z.record(z.string(), z.string()).optional().default({}),
});

export const hingedTemplateSchema = z.object({
  version: z.number().int(),
  kind: z.literal(TEMPLATE_KIND),
  name: z.string(),
  description: z.string().optional().default(''),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  catalogSystemRaw: z.string(),
  country: templateCountrySchema.optional(),
  stamps: z.array(templateStampSchema),
});

export type HingedTemplate = z.infer<typeof hingedTemplateSchema>;
export type TemplateStamp = z.infer<typeof templateStampSchema>;
export type TemplateCountry = z.infer<typeof templateCountrySchema>;

/** Discriminator-only schema used to peek at unknown JSON to decide whether it's a template. */
export const templateKindOnlySchema = z.object({
  kind: z.literal(TEMPLATE_KIND),
});

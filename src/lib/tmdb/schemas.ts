import { z } from 'zod';

export const rawMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  poster_path: z.string().nullish(),
  popularity: z.number().nullish(),
});

export const rawTvSchema = z.object({
  id: z.number(),
  name: z.string(),
  first_air_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  poster_path: z.string().nullish(),
  popularity: z.number().nullish(),
});

export const moviePageSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  results: z.array(rawMovieSchema),
});

export const tvPageSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  results: z.array(rawTvSchema),
});

export const rawProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullish(),
  display_priority: z.number().nullish(),
  display_priorities: z.record(z.string(), z.number()).nullish(),
});

export const providerListSchema = z.object({
  results: z.array(rawProviderSchema),
});

export const titleProvidersSchema = z.object({
  results: z.record(z.string(), z.object({ flatrate: z.array(rawProviderSchema).nullish() })),
});

export const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
});

export type RawMovie = z.infer<typeof rawMovieSchema>;
export type RawTv = z.infer<typeof rawTvSchema>;
export type RawProvider = z.infer<typeof rawProviderSchema>;

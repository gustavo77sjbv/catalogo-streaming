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

const detailsCommon = {
  id: z.number(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  poster_path: z.string().nullish(),
  overview: z.string().nullish(),
  genres: z.array(z.object({ name: z.string() })).nullish(),
  credits: z
    .object({
      cast: z
        .array(
          z.object({
            name: z.string(),
            character: z.string().nullish(),
            profile_path: z.string().nullish(),
            order: z.number().nullish(),
          }),
        )
        .nullish(),
      crew: z.array(z.object({ name: z.string(), job: z.string().nullish() })).nullish(),
    })
    .nullish(),
  videos: z
    .object({
      results: z.array(
        z.object({
          key: z.string(),
          site: z.string(),
          type: z.string(),
          name: z.string(),
          iso_639_1: z.string().nullish(),
          official: z.boolean().nullish(),
        }),
      ),
    })
    .nullish(),
};

export const movieDetailsSchema = z.object({
  ...detailsCommon,
  title: z.string(),
  original_title: z.string().nullish(),
  release_date: z.string().nullish(),
  runtime: z.number().nullish(),
  release_dates: z
    .object({
      results: z.array(
        z.object({
          iso_3166_1: z.string(),
          release_dates: z.array(z.object({ certification: z.string().nullish(), type: z.number().nullish() })),
        }),
      ),
    })
    .nullish(),
});

export const tvDetailsSchema = z.object({
  ...detailsCommon,
  name: z.string(),
  original_name: z.string().nullish(),
  first_air_date: z.string().nullish(),
  number_of_seasons: z.number().nullish(),
  number_of_episodes: z.number().nullish(),
  created_by: z.array(z.object({ name: z.string() })).nullish(),
  content_ratings: z
    .object({ results: z.array(z.object({ iso_3166_1: z.string(), rating: z.string().nullish() })) })
    .nullish(),
});

export type RawMovieDetails = z.infer<typeof movieDetailsSchema>;
export type RawTvDetails = z.infer<typeof tvDetailsSchema>;
export type RawMovie = z.infer<typeof rawMovieSchema>;
export type RawTv = z.infer<typeof rawTvSchema>;
export type RawProvider = z.infer<typeof rawProviderSchema>;

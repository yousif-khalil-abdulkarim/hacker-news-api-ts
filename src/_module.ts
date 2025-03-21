import { HnApi } from "@/hn-api/_module.js";
import { HnFlatApi, type ICache, TTLCache } from "@/hn-flat-api/_module.js";

type IHnClientSettings = {
    /**
     * @default
     * ```ts
     * import { TTLCache } from "hacker-news-api-ts";
     *
     * // It will cache every fetched Hacker News item or user for 2 seconds.
     * new TTLCache(2_000);
     * ```
     */
    cache?: ICache;

    /**
     * @default {10}
     */
    pageSize?: number;

    /**
     * @default {10}
     */
    maxConcurrency?: number;
};

export function createHnApi({
    cache = new TTLCache(2_000),
    pageSize = 10,
    maxConcurrency = 10,
}: IHnClientSettings = {}): HnApi {
    return new HnApi(
        new HnFlatApi("https://hacker-news.firebaseio.com/v0", cache),
        {
            page: 1,
            pageSize,
            maxConcurrency,
            predicate: null,
        },
    );
}
export { type ICache, TTLCache };

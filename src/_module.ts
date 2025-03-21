import {
    HnApi,
    type IFetchable,
    type IPaginateData,
    type MapFn,
    type PredicateGuard,
    type PredicateFn,
    type IListElement,
    type IList,
    type CommentData,
    type JobData,
    type PollData,
    type PollOptData,
    type StoryData,
    type ItemData,
    type UserData,
    type User,
    type Users,
    type Item,
    type Items,
    type IHnApi,
} from "@/hn-api/_module.js";
import { HnFlatApi, type ICache, TTLCache } from "@/hn-flat-api/_module.js";

export type IHnClientSettings = {
    /**
     * @default
     * ```ts
     * import { TTLCache } from "hn-news-api-ts";
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
export {
    type ICache,
    type IFetchable,
    type IPaginateData,
    type MapFn,
    type PredicateGuard,
    type PredicateFn,
    type IListElement,
    type IList,
    type CommentData,
    type JobData,
    type PollData,
    type PollOptData,
    type StoryData,
    type ItemData,
    type UserData,
    type User,
    type Users,
    type Item,
    type Items,
    type IHnApi,
    TTLCache,
};

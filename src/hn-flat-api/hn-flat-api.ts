import type {
    ItemJson,
    UserJson,
    PositiveIntegerArray,
    ChangedItemsAndProfilesJson,
    IHnFlatApi,
    ICache,
    PositiveInteger,
} from "@/hn-flat-api/contracts.js";
import {
    itemSchema,
    userSchema,
    positiveIntegerArraySchema,
    changedItemsAndProfilesSchema,
    positiveIntegerSchema,
} from "@/hn-flat-api/contracts.js";
import { strict } from "assert";

/**
 * @internal
 */
export function ensureValidUrl(url: string): void {
    if (url.endsWith("/")) {
        strict.fail(new Error(`The url cannot end with "/"`));
    }
}

/**
 * @internal
 */
export class HnFlatApi implements IHnFlatApi {
    constructor(
        private readonly baseUrl: string,
        private readonly cache: ICache,
    ) {
        ensureValidUrl(baseUrl);
    }

    async fetchItem(itemId: number): Promise<ItemJson> {
        return await this.cache.getOrSet<ItemJson>(
            `item/${itemId.toString()}`,
            async () => {
                const response = await fetch(
                    `${this.baseUrl}/item/${itemId.toString()}.json`,
                );
                const json = await response.json();
                return itemSchema.parse(json);
            },
        );
    }

    async fetchUser(userId: string): Promise<UserJson> {
        return await this.cache.getOrSet(`user/${userId}`, async () => {
            const response = await fetch(`${this.baseUrl}/user/${userId}.json`);
            const json = await response.json();
            return userSchema.parse(json);
        });
    }

    async fetchTopStories(): Promise<PositiveIntegerArray> {
        return await this.cache.getOrSet("topstories", async () => {
            const response = await fetch(`${this.baseUrl}/topstories.json`);
            const json = await response.json();
            return positiveIntegerArraySchema.parse(json);
        });
    }

    async fetchNewStories(): Promise<PositiveIntegerArray> {
        return await this.cache.getOrSet("newstories", async () => {
            const response = await fetch(`${this.baseUrl}/newstories.json`);
            const json = await response.json();
            return positiveIntegerArraySchema.parse(json);
        });
    }

    async fetchBestStories(): Promise<PositiveIntegerArray> {
        return await this.cache.getOrSet("beststories", async () => {
            const response = await fetch(`${this.baseUrl}/beststories.json`);
            const json = await response.json();
            return positiveIntegerArraySchema.parse(json);
        });
    }

    async fetchAskstories(): Promise<PositiveIntegerArray> {
        return await this.cache.getOrSet("askstories", async () => {
            const response = await fetch(`${this.baseUrl}/askstories.json`);
            const json = await response.json();
            return positiveIntegerArraySchema.parse(json);
        });
    }

    async fetchShowStories(): Promise<PositiveIntegerArray> {
        return await this.cache.getOrSet("showstories", async () => {
            const response = await fetch(`${this.baseUrl}/showstories.json`);
            const json = await response.json();
            return positiveIntegerArraySchema.parse(json);
        });
    }

    async fetchChangedItemsAndProfiles(): Promise<ChangedItemsAndProfilesJson> {
        return await this.cache.getOrSet("updates", async () => {
            const response = await fetch(`${this.baseUrl}/updates.json`);
            const json = await response.json();
            const data = changedItemsAndProfilesSchema.parse(json);
            const { items, profiles } = data;
            const promises: Promise<unknown>[] = [];
            for (const item of items) {
                promises.push(this.cache.remove(`item/${item.toString()}`));
            }
            for (const profile of profiles) {
                promises.push(this.cache.remove(`user/${profile}`));
            }
            await Promise.allSettled(promises);
            return data;
        });
    }

    async fetchMaxItemId(): Promise<PositiveInteger> {
        const response = await fetch(`${this.baseUrl}/topstories.json`);
        const json = await response.json();
        return positiveIntegerSchema.parse(json);
    }
}

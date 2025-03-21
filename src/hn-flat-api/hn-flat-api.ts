import type {
    ItemJson,
    UserJson,
    IntegerArray,
    ChangedItemsAndProfilesJson,
    IHnFlatApi,
    ICache,
} from "@/hn-flat-api/contracts.js";
import {
    itemSchema,
    userSchema,
    integerArraySchema,
    changedItemsAndProfilesSchema,
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
        const key = `item/${itemId.toString()}`;
        const value = await this.cache.get<ItemJson>(key);
        if (value === null) {
            const response = await fetch(
                `${this.baseUrl}/item/${itemId.toString()}.json`,
            );
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return itemSchema.parse(json);
        }
        return value;
    }

    async fetchUser(userId: string): Promise<UserJson> {
        const key = `user/${userId}`;
        const value = await this.cache.get<UserJson>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/user/${userId}.json`);
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return userSchema.parse(json);
        }
        return value;
    }

    async fetchTopStories(): Promise<IntegerArray> {
        const key = "topstories";
        const value = await this.cache.get<IntegerArray>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return integerArraySchema.parse(json);
        }
        return value;
    }

    async fetchNewStories(): Promise<IntegerArray> {
        const key = "newstories";
        const value = await this.cache.get<IntegerArray>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return integerArraySchema.parse(json);
        }
        return value;
    }

    async fetchBestStories(): Promise<IntegerArray> {
        const key = "beststories";
        const value = await this.cache.get<IntegerArray>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return integerArraySchema.parse(json);
        }
        return value;
    }

    async fetchAskstories(): Promise<IntegerArray> {
        const key = "askstories";
        const value = await this.cache.get<IntegerArray>("key");
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            await this.cache.set("key", json);
            return integerArraySchema.parse(json);
        }
        return value;
    }

    async fetchShowStories(): Promise<IntegerArray> {
        const key = "showstories";
        const value = await this.cache.get<IntegerArray>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            await this.cache.set(key, json);
            return integerArraySchema.parse(json);
        }
        return value;
    }

    async fetchChangedItemsAndProfiles(): Promise<ChangedItemsAndProfilesJson> {
        const key = "updates";
        const value = await this.cache.get<ChangedItemsAndProfilesJson>(key);
        if (value === null) {
            const response = await fetch(`${this.baseUrl}/${key}.json`);
            const json: unknown = await response.json();
            const data = changedItemsAndProfilesSchema.parse(json);
            await this.cache.set(key, data);
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
        }
        return value;
    }
}

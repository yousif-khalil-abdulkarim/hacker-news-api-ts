import { strict } from "assert";
import type {
    IHnFlatApi,
    CommentJson,
    JobJson,
    PollJson,
    PollOptionJson,
    StoryJson,
    ItemJson,
} from "@/hn-flat-api/_module.js";
import type {
    CommentData,
    IList,
    IListElement,
    Item,
    ItemData as TElement,
    Items,
    JobData,
    PollData,
    PollOptData,
    StoryData,
    User,
    UserData,
    Users,
    IHnApi,
    MapFn,
    IPaginateData,
    Predicate,
    PredicateWithError,
    ItemData,
} from "@/hn-api/contracts.js";

/**
 * @internal
 */
export async function promiseAll<TValue>(
    promises: PromiseLike<TValue>[],
): Promise<TValue[]> {
    const resultArr = await Promise.allSettled(promises);
    return resultArr.map((result) => {
        if (result.status === "rejected") {
            throw result.reason;
        }
        return result.value;
    });
}

/**
 * @internal
 */
export class GroupIterable<TItem> implements Iterable<TItem[]> {
    constructor(
        private readonly iterable: Iterable<TItem>,
        private readonly groupSize: number,
    ) {}

    *[Symbol.iterator](): Iterator<TItem[]> {
        const currentGroup: TItem[] = [];
        for (const item of this.iterable) {
            currentGroup.push(item);
            if (currentGroup.length === this.groupSize) {
                yield currentGroup;
                currentGroup.length = 0;
            }
        }
    }
}

/**
 * @internal
 */
export type ElementWithId<TElement, TId> = {
    id: TId;
    element: TElement;
};

/**
 * @internal
 */
export class AsyncBatchIterable<TElement, TId>
    implements AsyncIterable<ElementWithId<TElement, TId>>
{
    constructor(
        private readonly fetchIds: () => Promise<TId[]>,
        private readonly itemFactory: (id: TId) => IListElement<TElement, TId>,
        private readonly batchSize: number,
    ) {}

    async *[Symbol.asyncIterator](): AsyncIterator<
        ElementWithId<TElement, TId>
    > {
        const ids = await this.fetchIds();
        for (const group of new GroupIterable(ids, this.batchSize)) {
            yield* await promiseAll(
                group.map(this.itemFactory).map(async (item) => ({
                    id: await item.getId(),
                    element: await item.fetch(),
                })),
            );
        }
    }
}

/**
 * @internal
 */
export async function runAsyncIterable<TValue>(
    iterable: AsyncIterable<TValue>,
): Promise<TValue[]> {
    const values: TValue[] = [];
    for await (const item of iterable) {
        values.push(item);
    }
    return values;
}

/**
 * @internal
 */
export class ListElement<TValue, TId> implements IListElement<TValue, TId> {
    constructor(
        private readonly fetchId: () => Promise<TId>,
        private readonly elementFactory: (id: TId) => Promise<TValue>,
    ) {}

    async fetch(): Promise<TValue> {
        const id = await this.fetchId();
        return await this.elementFactory(id);
    }

    async getId(): Promise<TId> {
        return this.fetchId();
    }

    ensure<TOutput extends TValue = TValue>(
        predicate:
            | Predicate<TValue, TOutput>
            | PredicateWithError<TValue, TOutput>,
    ): IListElement<TOutput, TId> {
        return new ListElement(this.fetchId, async (id) => {
            let errorFactory: ((item: TValue) => unknown) | null = null;
            if (typeof predicate !== "function") {
                errorFactory = predicate.error;
                predicate = predicate.predicate;
            }
            const value = await this.elementFactory(id);
            if (!(await predicate(value))) {
                const message =
                    "The ListElement data did not match the predicate";
                if (errorFactory === null) {
                    throw new TypeError(message);
                }
                throw errorFactory(value);
            }
            return value as TOutput;
        });
    }

    map<TOutput = TValue>(
        mapFn: MapFn<TValue, TOutput>,
    ): IListElement<TOutput, TId> {
        return new ListElement(this.fetchId, async (id) => {
            return mapFn(await this.elementFactory(id));
        });
    }
}

/**
 * @internal
 */
export type ListSettings = {
    page: number;
    pageSize: number;
    maxConcurrency: number;
};

/**
 * @internal
 */
export class List<TElement, TId> implements IList<TElement, TId> {
    private static paginate<TElement>(
        items: TElement[],
        page: number,
        pageSize: number,
    ): TElement[] {
        if (pageSize < 1) {
            strict.fail(
                new TypeError(`Invalid "pageSize", must be larger than 0`),
            );
        }
        if (page < 1) {
            strict.fail(new TypeError(`Invalid "page", must be larger than 0`));
        }
        return items.slice((page - 1) * pageSize, page * pageSize);
    }

    constructor(
        private readonly fetchIds: () => Promise<TId[]>,
        private readonly itemFactory: (id: TId) => IListElement<TElement, TId>,
        private readonly settings: ListSettings,
    ) {}

    private fetchPaginatedIds = async (): Promise<IPaginateData<TId>> => {
        const allIds = await this.fetchIds();
        return {
            page: this.settings.page,
            pageSize: this.settings.pageSize,
            totalPages: Math.ceil(allIds.length / this.settings.pageSize),
            totalElements: allIds.length,
            elements: List.paginate(
                allIds,
                this.settings.page,
                this.settings.pageSize,
            ),
        };
    };

    async fetch(): Promise<IPaginateData<TElement>> {
        const { elements: ids, ...rest } = await this.fetchPaginatedIds();
        const elements = await runAsyncIterable(
            new AsyncBatchIterable(
                () => Promise.resolve(ids),
                this.itemFactory,
                this.settings.maxConcurrency,
            ),
        );
        return {
            elements: elements.map(({ element }) => element),
            ...rest,
        };
    }

    setPageSize(pageSize: number): IList<TElement, TId> {
        return new List<TElement, TId>(this.fetchIds, this.itemFactory, {
            ...this.settings,
            pageSize,
        });
    }

    setPage(page: number): IList<TElement, TId> {
        return new List<TElement, TId>(this.fetchIds, this.itemFactory, {
            ...this.settings,
            page,
        });
    }

    private fetchOneId = async (index: number): Promise<TId | null> => {
        const { elements: ids } = await this.fetchPaginatedIds();
        return (ids[index] ?? null) as TId | null;
    };

    getItem(index: number): IListElement<TElement, TId | null> {
        if (index < 0) {
            throw new RangeError(
                `"index" is out of range, must be larger than -1`,
            );
        }
        return new ListElement(
            async () => this.fetchOneId(index),
            async (id) => {
                if (id === null) {
                    throw new RangeError(
                        `"index" is out of range, must be larger than -1`,
                    );
                }
                return this.itemFactory(id).fetch();
            },
        );
    }

    map<TOutput = TElement>(
        mapFn: MapFn<TElement, TOutput>,
    ): IList<TOutput, TId> {
        return new List<TOutput, TId>(
            this.fetchIds,
            (id) => {
                return this.itemFactory(id).map(mapFn);
            },
            this.settings,
        );
    }
}

export class AllItems<TElement> implements IList<TElement, number> {
    constructor(
        private readonly fetchMaxItemId: () => Promise<number>,
        private readonly itemFactory: (
            id: number,
        ) => IListElement<TElement, number>,
        private readonly settings: ListSettings,
    ) {}

    private static paginate(
        maxItemId: number,
        page: number,
        pageSize: number,
    ): number[] {
        const start = maxItemId - (page - 1) * pageSize;
        const end = maxItemId - page * pageSize;

        const arr: number[] = [];
        for (let i = start; i >= end; i--) {
            arr.push(i);
        }
        return arr;
    }

    private fetchPaginatedIds = async (): Promise<IPaginateData<number>> => {
        const maxItemId = await this.fetchMaxItemId();
        const paginatedIds = AllItems.paginate(
            maxItemId,
            this.settings.page,
            this.settings.pageSize,
        );
        return {
            page: this.settings.page,
            pageSize: this.settings.pageSize,
            totalPages: Math.ceil(maxItemId / this.settings.pageSize),
            totalElements: maxItemId,
            elements: paginatedIds,
        };
    };

    async fetch(): Promise<IPaginateData<TElement>> {
        const { elements: ids, ...rest } = await this.fetchPaginatedIds();
        const elements = await runAsyncIterable(
            new AsyncBatchIterable(
                () => Promise.resolve(ids),
                this.itemFactory,
                this.settings.maxConcurrency,
            ),
        );
        return {
            elements: elements.map(({ element }) => element),
            ...rest,
        };
    }

    setPageSize(pageSize: number): IList<TElement, number> {
        return new AllItems(this.fetchMaxItemId, this.itemFactory, {
            ...this.settings,
            pageSize,
        });
    }

    setPage(page: number): IList<TElement, number> {
        return new AllItems(this.fetchMaxItemId, this.itemFactory, {
            ...this.settings,
            page,
        });
    }

    private fetchOneId = async (index: number): Promise<number | null> => {
        const { elements: ids } = await this.fetchPaginatedIds();
        return ids[index] ?? null;
    };

    getItem(index: number): IListElement<TElement, number | null> {
        if (index < 0) {
            throw new RangeError(
                `"index" is out of range, must be larger than -1`,
            );
        }
        return new ListElement(
            async () => this.fetchOneId(index),
            async (id) => {
                if (id === null) {
                    throw new RangeError(
                        `"index" is out of range, must be larger than -1`,
                    );
                }
                return this.itemFactory(id).fetch();
            },
        );
    }

    map<TOutput = TElement>(
        mapFn: MapFn<TElement, TOutput>,
    ): IList<TOutput, number> {
        return new AllItems<TOutput>(
            this.fetchMaxItemId,
            (id) => {
                return this.itemFactory(id).map(mapFn);
            },
            this.settings,
        );
    }
}

/**
 * @internal
 */
export class HnApi implements IHnApi {
    constructor(
        private readonly flatApi: IHnFlatApi,
        private readonly settings: ListSettings,
    ) {}

    private handleComment = (json: CommentJson): CommentData => {
        if (json.deleted) {
            return {
                dead: json.dead,
                deleted: true,
                id: json.id,
                createdAt: json.time,
                type: json.type,
            };
        }
        if (json.by === undefined) {
            throw new TypeError("Unable to process data");
        }
        return {
            createdBy: new ListElement(
                () => {
                    if (json.by === undefined) {
                        throw new TypeError("Unable to process data");
                    }
                    return Promise.resolve(json.by);
                },
                (id) => this.userFactory(id).fetch(),
            ),
            id: json.id,
            kids: new List(
                () => Promise.resolve(json.kids),
                this.itemFactory,
                this.settings,
            ),
            parent: new ListElement(
                () => Promise.resolve(json.parent),
                (id) => this.itemFactory(id).fetch(),
            ),
            text: json.text,
            createdAt: json.time,
            url: json.url,
            deleted: false,
            dead: json.dead,
            type: json.type,
        };
    };

    private handleJob = (json: JobJson): JobData => {
        if (json.deleted) {
            return {
                dead: json.dead,
                deleted: true,
                id: json.id,
                createdAt: json.time,
                type: json.type,
            };
        }
        if (json.by === undefined) {
            throw new TypeError("Unable to process data");
        }
        return {
            createdBy: new ListElement(
                () => {
                    if (json.by === undefined) {
                        throw new TypeError("Unable to process data");
                    }
                    return Promise.resolve(json.by);
                },
                (id) => this.userFactory(id).fetch(),
            ),
            id: json.id,
            score: json.score,
            text: json.text,
            createdAt: json.time,
            title: json.title,
            url: json.url,
            deleted: false,
            dead: json.dead,
            type: json.type,
        };
    };

    private handlePoll = (json: PollJson): PollData => {
        if (json.deleted) {
            return {
                dead: json.dead,
                deleted: true,
                id: json.id,
                createdAt: json.time,
                type: json.type,
            };
        }
        if (json.by === undefined) {
            throw new TypeError("Unable to process data");
        }
        return {
            createdBy: new ListElement(
                () => {
                    if (json.by === undefined) {
                        throw new TypeError("Unable to process data");
                    }
                    return Promise.resolve(json.by);
                },
                (id) => this.userFactory(id).fetch(),
            ),
            totalKids: json.descendants,
            id: json.id,
            kids: new List(
                () => Promise.resolve(json.kids),
                this.itemFactory,
                this.settings,
            ),
            parts: new List(
                () => Promise.resolve(json.parts),
                this.itemFactory,
                this.settings,
            ),
            score: json.score,
            text: json.text,
            createdAt: json.time,
            title: json.title,
            url: json.url,
            deleted: false,
            dead: json.dead,
            type: json.type,
        };
    };

    private handlePollOption = (json: PollOptionJson): PollOptData => {
        if (json.deleted) {
            return {
                dead: json.dead,
                deleted: true,
                id: json.id,
                createdAt: json.time,
                type: json.type,
            };
        }
        if (json.by === undefined) {
            throw new TypeError("Unable to process data");
        }
        return {
            createdBy: new ListElement(
                () => {
                    if (json.by === undefined) {
                        throw new TypeError("Unable to process data");
                    }
                    return Promise.resolve(json.by);
                },
                (id) => this.userFactory(id).fetch(),
            ),
            id: json.id,
            pollId: new ListElement(
                () => Promise.resolve(json.poll),
                (id) => this.itemFactory(id).fetch(),
            ),
            score: json.score,
            text: json.text,
            createdAt: json.time,
            url: json.url,
            deleted: json.deleted,
            dead: json.dead,
            type: json.type,
        };
    };

    private handleStory = (json: StoryJson): StoryData => {
        if (json.deleted) {
            return {
                dead: json.dead,
                deleted: true,
                id: json.id,
                createdAt: json.time,
                type: json.type,
            };
        }
        if (json.by === undefined) {
            throw new TypeError("Unable to process data");
        }
        return {
            createdBy: new ListElement(
                () => {
                    if (json.by === undefined) {
                        throw new TypeError("Unable to process data");
                    }
                    return Promise.resolve(json.by);
                },
                (id) => this.userFactory(id).fetch(),
            ),
            totalKids: json.descendants,
            id: json.id,
            kids: new List(
                () => Promise.resolve(json.kids),
                this.itemFactory,
                this.settings,
            ),
            score: json.score,
            text: json.text,
            createdAt: json.time,
            title: json.title,
            url: json.url,
            deleted: false,
            dead: json.dead,
            type: json.type,
        };
    };

    private handleItem = (json: ItemJson): ItemData => {
        if (json.type === "comment") {
            return this.handleComment(json);
        }
        if (json.type === "job") {
            return this.handleJob(json);
        }
        if (json.type === "poll") {
            return this.handlePoll(json);
        }
        if (json.type === "pollopt") {
            return this.handlePollOption(json);
        }
        return this.handleStory(json);
    };

    private itemFactory = (id: number): Item => {
        return new ListElement(
            () => Promise.resolve(id),
            async (id) => this.handleItem(await this.flatApi.fetchItem(id)),
        );
    };

    private userFactory = (id: string): User => {
        return new ListElement<UserData, string>(
            () => Promise.resolve(id),
            async (id) => {
                const json = await this.flatApi.fetchUser(id);
                return {
                    username: json.id,
                    createdAt: json.created,
                    description: json.about,
                    karma: json.karma,
                    submitted: new List(
                        () => Promise.resolve(json.submitted),
                        this.itemFactory,
                        this.settings,
                    ),
                };
            },
        );
    };

    item(itemId: number): Item {
        return this.itemFactory(itemId);
    }

    user(userId: string): User {
        return this.userFactory(userId);
    }

    topStories(): Items {
        return new List<TElement, number>(
            this.flatApi.fetchTopStories.bind(this),
            this.itemFactory,
            this.settings,
        );
    }

    newStories(): Items {
        return new List<TElement, number>(
            () => this.flatApi.fetchNewStories(),
            this.itemFactory,
            this.settings,
        );
    }

    bestStories(): Items {
        return new List<TElement, number>(
            () => this.flatApi.fetchBestStories(),
            this.itemFactory,
            this.settings,
        );
    }

    askstories(): Items {
        return new List<TElement, number>(
            () => this.flatApi.fetchAskstories(),
            this.itemFactory,
            this.settings,
        );
    }

    showStories(): Items {
        return new List<TElement, number>(
            this.flatApi.fetchShowStories.bind(this),
            this.itemFactory,
            this.settings,
        );
    }

    allItems(): Items {
        return new AllItems(
            this.flatApi.fetchMaxItem.bind(this),
            this.itemFactory,
            this.settings,
        );
    }

    changedItems(): Items {
        return new List<TElement, number>(
            async () => {
                const { items } =
                    await this.flatApi.fetchChangedItemsAndProfiles();
                return items;
            },
            this.itemFactory,
            this.settings,
        );
    }

    changedUsers(): Users {
        return new List<UserData, string>(
            async () => {
                const { profiles } =
                    await this.flatApi.fetchChangedItemsAndProfiles();
                return profiles;
            },
            this.userFactory,
            this.settings,
        );
    }
}

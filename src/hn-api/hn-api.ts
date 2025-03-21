import { strict } from "assert";
import type {
    IHnFlatApi,
    CommentJson,
    JobJson,
    PollJson,
    PollOptionJson,
    StoryJson,
} from "@/hn-flat-api/_module.js";
import type {
    CommentData,
    IList,
    IListElement,
    Item,
    ItemData,
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
    PredicateFn,
    IPaginateData,
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

    map<TOutput = TValue>(
        mapFn: MapFn<TValue, TOutput>,
    ): IListElement<TOutput, TId> {
        return new ListElement<TOutput, TId>(this.fetchId, async (id) => {
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
    predicate: PredicateFn<any, any> | null;
};

/**
 * @internal
 */
export function paginate<TElement>(
    items: TElement[],
    page: number,
    pageSize: number,
): TElement[] {
    if (pageSize < 1) {
        strict.fail(new TypeError(`Invalid "pageSize", must be larger than 0`));
    }
    if (page < 1) {
        strict.fail(new TypeError(`Invalid "page", must be larger than 0`));
    }
    return items.slice((page - 1) * pageSize, page * pageSize);
}

/**
 * @internal
 */
export class List<TElement, TId> implements IList<TElement, TId> {
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
            elements: paginate(
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

/**
 * @internal
 */
export class HnApi implements IHnApi {
    constructor(
        private readonly flatApi: IHnFlatApi,
        private readonly settings: ListSettings,
    ) {}

    private handleComment = (json: CommentJson): CommentData => {
        return {
            createdBy: this.userFactory(json.by),
            commentId: json.id,
            kids: new List(
                () => Promise.resolve(json.kids),
                this.itemFactory,
                this.settings,
            ),
            parent: this.itemFactory(json.parent),
            text: json.text,
            createAt: json.time,
            type: json.type,
        };
    };

    private handleJob = (json: JobJson): JobData => {
        return {
            createdBy: this.userFactory(json.by),
            jobId: json.id,
            score: json.score,
            text: json.text,
            createdAt: json.time,
            title: json.title,
            url: json.url,
            type: json.type,
        };
    };

    private handlePoll = (json: PollJson): PollData => {
        return {
            createdBy: this.userFactory(json.by),
            totalKids: json.descendants,
            pollId: json.id,
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
            type: json.type,
        };
    };

    private handlePollOption = (json: PollOptionJson): PollOptData => {
        return {
            createdBy: this.userFactory(json.by),
            pollOptId: json.id,
            pollId: this.itemFactory(json.id),
            score: json.score,
            text: json.text,
            createdAt: json.time,
            type: json.type,
        };
    };

    private handleStory = (json: StoryJson): StoryData => {
        return {
            createdBy: this.userFactory(json.by),
            totalKids: json.descendants,
            storyId: json.id,
            kids: new List(
                () => Promise.resolve(json.kids),
                this.itemFactory,
                this.settings,
            ),
            score: json.score,
            text: json.text,
            createdAt: json.time,
            title: json.title,
            type: json.type,
        };
    };

    private itemFactory = (id: number): Item => {
        return new ListElement(
            () => Promise.resolve(id),
            async (id) => {
                const json = await this.flatApi.fetchItem(id);
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
            },
        );
    };

    private userFactory = (id: string): User => {
        return new ListElement(
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
        return new List<ItemData, number>(
            () => this.flatApi.fetchTopStories(),
            this.itemFactory,
            this.settings,
        );
    }

    newStories(): Items {
        return new List<ItemData, number>(
            () => this.flatApi.fetchNewStories(),
            this.itemFactory,
            this.settings,
        );
    }

    bestStories(): Items {
        return new List<ItemData, number>(
            () => this.flatApi.fetchBestStories(),
            this.itemFactory,
            this.settings,
        );
    }

    askstories(): Items {
        return new List<ItemData, number>(
            () => this.flatApi.fetchAskstories(),
            this.itemFactory,
            this.settings,
        );
    }

    showStories(): Items {
        return new List<ItemData, number>(
            () => this.flatApi.fetchShowStories(),
            this.itemFactory,
            this.settings,
        );
    }

    changedItems(): Items {
        return new List<ItemData, number>(
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

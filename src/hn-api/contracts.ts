export type IFetchable<TValue> = {
    fetch(): Promise<TValue>;
};

export type IPaginateData<TElement> = {
    elements: TElement[];
    page: number;
    pageSize: number;
    totalPages: number;
    totalElements: number;
};

export type MapFn<TInput, TOutput> = (
    item: TInput,
) => TOutput | Promise<TOutput>;

export type PredicateGuard<TInput, TOutput extends TInput> = (
    item: TInput,
) => item is TOutput;
export type PredicateFn<TInput, TOutput extends TInput> =
    | PredicateGuard<TInput, TOutput>
    | ((item: TInput) => boolean | Promise<boolean>);

export type IListElement<TElement, TId> = IFetchable<TElement> & {
    getId(): Promise<TId>;

    map<TOutput = TElement>(
        mapFn: MapFn<TElement, TOutput>,
    ): IListElement<TOutput, TId>;
};

export type IList<TElement, TId> = IFetchable<IPaginateData<TElement>> & {
    setPageSize(pageSize: number): IList<TElement, TId>;

    setPage(page: number): IList<TElement, TId>;

    getItem(index: number): IListElement<TElement, TId | null>;

    map<TOutput = TElement>(
        mapFn: MapFn<TElement, TOutput>,
    ): IList<TOutput, TId>;

    filter<TOutput extends TElement>(
        predicate: PredicateFn<TElement, TOutput>,
    ): IList<TOutput, TId>;
};

export type CommentData = {
    createdBy: User;
    commentId: number;
    kids: Items;
    parent: Item;
    text?: string;
    createAt: Date;
    type: "comment";
};
export type JobData = {
    createdBy: User;
    jobId: number;
    score: number;
    text?: string;
    createdAt: Date;
    title: string;
    url?: string;
    type: "job";
};
export type PollData = {
    createdBy: User;
    totalKids: number;
    pollId: number;
    kids: Items;
    parts: Items;
    score: number;
    text?: string;
    createdAt: Date;
    title: string;
    type: "poll";
};
export type PollOptData = {
    createdBy: User;
    pollOptId: number;
    pollId: Item;
    score: number;
    text?: string;
    createdAt: Date;
    type: "pollopt";
};
export type StoryData = {
    createdBy: User;
    totalKids: number;
    storyId: number;
    kids: Items;
    score: number;
    text?: string;
    createdAt: Date;
    title: string;
    type: "story";
};
export type ItemData =
    | CommentData
    | JobData
    | PollData
    | PollOptData
    | StoryData;
export type UserData = {
    username: string;
    createdAt: Date;
    description?: string;
    karma: number;
    submitted: Items;
};
export type User = IListElement<UserData, string>;
export type Users = IList<UserData, string>;
export type Item = IListElement<ItemData, number>;
export type Items = IList<ItemData, number>;

export type IHnApi = {
    item(itemId: number): Item;

    user(userId: string): User;

    topStories(): Items;

    newStories(): Items;

    bestStories(): Items;

    askstories(): Items;

    showStories(): Items;

    changedItems(): Items;

    changedUsers(): Users;
};

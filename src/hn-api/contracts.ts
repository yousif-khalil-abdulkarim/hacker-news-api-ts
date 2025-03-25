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
    value: TInput,
) => TOutput | Promise<TOutput>;

export type PredicateGuard<TInput, TOutput extends TInput> = (
    value: TInput,
) => value is TOutput;
export type PredicateFn<TInput> = (value: TInput) => boolean | Promise<boolean>;
export type Predicate<TInput, TOutput extends TInput> =
    | PredicateGuard<TInput, TOutput>
    | PredicateFn<TInput>;
export type PredicateWithError<TInput, TOutput extends TInput> = {
    predicate: Predicate<TInput, TOutput>;
    error: (value: TInput) => unknown;
};

export type IListElement<TValue, TId> = IFetchable<TValue> & {
    getId(): Promise<TId>;

    ensure<TOutput extends TValue = TValue>(
        predicate:
            | Predicate<TValue, TOutput>
            | PredicateWithError<TValue, TOutput>,
    ): IListElement<TOutput, TId>;

    map<TOutput = TValue>(
        mapFn: MapFn<TValue, TOutput>,
    ): IListElement<TOutput, TId>;
};

export type IList<TElement, TId> = IFetchable<IPaginateData<TElement>> & {
    setPageSize(pageSize: number): IList<TElement, TId>;

    setPage(page: number): IList<TElement, TId>;

    getItem(index: number): IListElement<TElement, TId | null>;

    map<TOutput = TElement>(
        mapFn: MapFn<TElement, TOutput>,
    ): IList<TOutput, TId>;
};

type DeletedItem<
    TType extends "comment" | "job" | "poll" | "pollopt" | "story",
> = {
    dead: boolean;
    deleted: true;
    id: number;
    createdAt: Date;
    type: TType;
};
export type CommentData =
    | {
          createdBy: User;
          id: number;
          kids: Items;
          parent: Item;
          text: string | undefined;
          createdAt: Date;
          url: string | undefined;
          deleted: false;
          dead: boolean;
          type: "comment";
      }
    | DeletedItem<"comment">;
export type JobData =
    | {
          createdBy: User;
          id: number;
          score: number;
          text: string | undefined;
          createdAt: Date;
          title: string | undefined;
          url: string | undefined;
          deleted: false;
          dead: boolean;
          type: "job";
      }
    | DeletedItem<"job">;
export type PollData =
    | {
          createdBy: User;
          totalKids: number;
          id: number;
          kids: Items;
          parts: Items;
          score: number;
          text: string | undefined;
          createdAt: Date;
          title: string | undefined;
          url: string | undefined;
          deleted: false;
          dead: boolean;
          type: "poll";
      }
    | DeletedItem<"poll">;
export type PollOptData =
    | {
          createdBy: User;
          id: number;
          pollId: Item;
          score: number;
          text: string | undefined;
          createdAt: Date;
          url: string | undefined;
          deleted: false;
          dead: boolean;
          type: "pollopt";
      }
    | DeletedItem<"pollopt">;
export type StoryData =
    | {
          createdBy: User;
          totalKids: number;
          id: number;
          kids: Items;
          score: number;
          text: string | undefined;
          createdAt: Date;
          title: string | undefined;
          url: string | undefined;
          deleted: false;
          dead: boolean;
          type: "story";
      }
    | DeletedItem<"story">;

export type ItemData =
    | CommentData
    | JobData
    | PollData
    | PollOptData
    | StoryData;

export function isItemOf<TType extends ItemData["type"]>(
    type: TType,
): PredicateWithError<ItemData, Extract<ItemData, { type: TType }>> {
    return {
        predicate: (value) => value.type === type,
        error: (value) =>
            new TypeError(
                `Expected value.type field to be "${type}" but got instead "${value.type}"`,
            ),
    };
}

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

    allItems(): Items;

    changedItems(): Items;

    changedUsers(): Users;
};

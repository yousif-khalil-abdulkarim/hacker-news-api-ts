import { z } from "zod";

/**
 * @internal
 */
export const integerSchema = z.number().int();

/**
 * @internal
 */
export type Integer = z.infer<typeof integerSchema>;

/**
 * @internal
 */
export const unixTimestampSchema = z
    .number()
    .transform((timeInSeconds) => new Date(timeInSeconds * 1000));

/**
 * @internal
 */
export const textSchema = z.string().transform((value) => {
    if (value === "") {
        return value;
    }
    return value;
});

/**
 * @internal
 */
export const integerArraySchema = integerSchema.array().default([]);

/**
 * @internal
 */
export type IntegerArray = z.infer<typeof integerArraySchema>;

/**
 * @internal
 */
export const jobItemSchema = z.object({
    by: z.string(),
    id: integerSchema,
    score: integerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("job"),
    url: textSchema.optional(),
});

/**
 * @internal
 */
export type JobJson = z.infer<typeof jobItemSchema>;

/**
 * @internal
 */
export const storyItemSchema = z.object({
    by: z.string(),
    descendants: integerSchema,
    id: integerSchema,
    kids: integerArraySchema,
    score: integerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("story"),
});

/**
 * @internal
 */
export type StoryJson = z.infer<typeof storyItemSchema>;

/**
 * @internal
 */
export const commentItemSchema = z.object({
    by: z.string(),
    id: integerSchema,
    kids: integerArraySchema,
    parent: integerSchema,
    text: textSchema,
    time: unixTimestampSchema,
    type: z.literal("comment"),
});

/**
 * @internal
 */
export type CommentJson = z.infer<typeof commentItemSchema>;

/**
 * @internal
 */
export const pollItemSchema = z.object({
    by: z.string(),
    descendants: integerSchema,
    id: integerSchema,
    kids: integerArraySchema,
    parts: integerArraySchema,
    score: integerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("poll"),
});

/**
 * @internal
 */
export type PollJson = z.infer<typeof pollItemSchema>;

/**
 * @internal
 */
export const pollOptionItemSchema = z.object({
    by: z.string(),
    id: integerSchema,
    poll: integerSchema,
    score: integerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    type: z.literal("pollopt"),
});

/**
 * @internal
 */
export type PollOptionJson = z.infer<typeof pollOptionItemSchema>;

/**
 * @internal
 */
export const itemSchema = jobItemSchema
    .or(storyItemSchema)
    .or(commentItemSchema)
    .or(pollItemSchema)
    .or(pollOptionItemSchema);

/**
 * @internal
 */
export type ItemJson = z.infer<typeof itemSchema>;

/**
 * @internal
 */
export const userSchema = z.object({
    id: z.string(),
    created: unixTimestampSchema,
    about: z.string().optional(),
    karma: integerSchema,
    submitted: integerArraySchema,
});

/**
 * @internal
 */
export type UserJson = z.infer<typeof userSchema>;

/**
 * @internal
 */
export const changedItemsAndProfilesSchema = z.object({
    items: integerArraySchema,
    profiles: z.string().array(),
});

/**
 * @internal
 */
export type ChangedItemsAndProfilesJson = z.infer<
    typeof changedItemsAndProfilesSchema
>;

export type ICache<TBase = unknown> = {
    get<TValue extends TBase>(key: string): Promise<TValue | null>;

    getOrSet<TValue extends TBase>(
        key: string,
        value: () => Promise<TValue>,
    ): Promise<TValue>;

    set<TValue extends TBase>(key: string, value: TValue): Promise<void>;

    remove(key: string): Promise<void>;
};

/**
 * @internal
 */
export type IHnFlatApi = {
    fetchItem(itemId: number): Promise<ItemJson>;

    fetchUser(userId: string): Promise<UserJson>;

    fetchTopStories(): Promise<IntegerArray>;

    fetchNewStories(): Promise<IntegerArray>;

    fetchBestStories(): Promise<IntegerArray>;

    fetchAskstories(): Promise<IntegerArray>;

    fetchShowStories(): Promise<IntegerArray>;

    fetchChangedItemsAndProfiles(): Promise<ChangedItemsAndProfilesJson>;
};

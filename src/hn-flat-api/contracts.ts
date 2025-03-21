import { z } from "zod";

/**
 * @internal
 */
export const positiveIntegerSchema = z.number().int().positive();

/**
 * @internal
 */
export type PositiveInteger = z.infer<typeof positiveIntegerSchema>;

/**
 * @internal
 */
const unixTimestampSchema = z
    .number()
    .transform((timeInSeconds) => new Date(timeInSeconds * 1000));

/**
 * @internal
 */
const textSchema = z.string().transform((value) => {
    if (value === "") {
        return value;
    }
    return value;
});

/**
 * @internal
 */
export const positiveIntegerArraySchema = positiveIntegerSchema.array();

/**
 * @internal
 */
export type PositiveIntegerArray = z.infer<typeof positiveIntegerArraySchema>;

/**
 * @internal
 */
export const jobSchema = z.object({
    by: z.string(),
    id: positiveIntegerSchema,
    score: positiveIntegerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("job"),
    url: textSchema.optional(),
});

/**
 * @internal
 */
export type JobJson = z.infer<typeof jobSchema>;

/**
 * @internal
 */
export const storySchema = z.object({
    by: z.string(),
    descendants: positiveIntegerSchema,
    id: positiveIntegerSchema,
    kids: positiveIntegerArraySchema,
    score: positiveIntegerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("story"),
});

/**
 * @internal
 */
export type StoryJson = z.infer<typeof storySchema>;

/**
 * @internal
 */
export const commentSchema = z.object({
    by: z.string(),
    id: positiveIntegerSchema,
    kids: positiveIntegerArraySchema,
    parent: positiveIntegerSchema,
    text: textSchema,
    time: unixTimestampSchema,
    type: z.literal("comment"),
});

/**
 * @internal
 */
export type CommentJson = z.infer<typeof commentSchema>;

/**
 * @internal
 */
export const pollSchema = z.object({
    by: z.string(),
    descendants: positiveIntegerSchema,
    id: positiveIntegerSchema,
    kids: positiveIntegerArraySchema,
    parts: positiveIntegerArraySchema,
    score: positiveIntegerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    title: z.string(),
    type: z.literal("poll"),
});

/**
 * @internal
 */
export type PollJson = z.infer<typeof pollSchema>;

/**
 * @internal
 */
export const pollOptionSchema = z.object({
    by: z.string(),
    id: positiveIntegerSchema,
    poll: positiveIntegerSchema,
    score: positiveIntegerSchema,
    text: textSchema.optional(),
    time: unixTimestampSchema,
    type: z.literal("pollopt"),
});

/**
 * @internal
 */
export type PollOptionJson = z.infer<typeof pollOptionSchema>;

/**
 * @internal
 */
export const itemSchema = jobSchema
    .or(storySchema)
    .or(commentSchema)
    .or(pollSchema)
    .or(pollOptionSchema);

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
    karma: positiveIntegerSchema,
    submitted: positiveIntegerArraySchema,
});

/**
 * @internal
 */
export type UserJson = z.infer<typeof userSchema>;

/**
 * @internal
 */
export const changedItemsAndProfilesSchema = z.object({
    items: positiveIntegerArraySchema,
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

    fetchTopStories(): Promise<PositiveIntegerArray>;

    fetchNewStories(): Promise<PositiveIntegerArray>;

    fetchBestStories(): Promise<PositiveIntegerArray>;

    fetchAskstories(): Promise<PositiveIntegerArray>;

    fetchShowStories(): Promise<PositiveIntegerArray>;

    fetchChangedItemsAndProfiles(): Promise<ChangedItemsAndProfilesJson>;

    fetchMaxItemId(): Promise<PositiveInteger>;
};

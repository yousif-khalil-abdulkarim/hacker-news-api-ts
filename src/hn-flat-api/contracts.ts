import { z } from "zod";

/**
 * @internal
 */
export const integerSchema = z
    .number()
    .int()
    .transform((value) => {
        if (value < 0) {
            return 0;
        }
        return value;
    });

/**
 * @internal
 */
export const booleanSchema = z
    .number()
    .or(z.boolean())
    .default(false)
    .transform((value) => {
        if (typeof value === "boolean") {
            return value;
        }
        return value > 0;
    });

/**
 * @internal
 */
export type Integer = z.infer<typeof integerSchema>;

/**
 * @internal
 */
export const dateSchema = integerSchema.or(z.string()).transform((value) => {
    if (typeof value === "number") {
        // is unix timestamp
        return new Date(value * 1000);
    }
    // is date string
    return new Date(value);
});

/**
 * @internal
 */
export const integerArraySchema = integerSchema.array();

/**
 * @internal
 */
export type IntegerArray = z.infer<typeof integerArraySchema>;

/**
 * @internal
 */
const jobItemSchema = z.object({
    by: z.string().optional(),
    id: integerSchema,
    score: integerSchema.default(0),
    text: z.string().optional(),
    time: dateSchema,
    title: z.string().optional(),
    type: z.literal("job"),
    deleted: booleanSchema.default(false),
    dead: booleanSchema.default(false),
    url: z.string().optional(),
});

/**
 * @internal
 */
export type JobJson = z.infer<typeof jobItemSchema>;

/**
 * @internal
 */
export const storyItemSchema = z.object({
    by: z.string().optional(),
    descendants: integerSchema.default(0),
    id: integerSchema,
    kids: integerArraySchema.default([]),
    score: integerSchema.default(0),
    text: z.string().optional(),
    time: dateSchema,
    title: z.string().optional(),
    type: z.literal("story"),
    deleted: booleanSchema.default(false),
    dead: booleanSchema.default(false),
    url: z.string().optional(),
});

/**
 * @internal
 */
export type StoryJson = z.infer<typeof storyItemSchema>;

/**
 * @internal
 */
export const commentItemSchema = z.object({
    by: z.string().optional(),
    id: integerSchema,
    kids: integerArraySchema.default([]),
    parent: integerSchema,
    text: z.string().optional(),
    time: dateSchema,
    type: z.literal("comment"),
    deleted: booleanSchema.default(false),
    dead: booleanSchema.default(false),
    url: z.string().optional(),
});

/**
 * @internal
 */
export type CommentJson = z.infer<typeof commentItemSchema>;

/**
 * @internal
 */
export const pollItemSchema = z.object({
    by: z.string().optional(),
    descendants: integerSchema.default(0),
    id: integerSchema,
    kids: integerArraySchema.default([]),
    parts: integerArraySchema,
    score: integerSchema.default(0),
    text: z.string().optional(),
    time: dateSchema,
    title: z.string().optional(),
    type: z.literal("poll"),
    deleted: booleanSchema.default(false),
    dead: booleanSchema.default(false),
    url: z.string().optional(),
});

/**
 * @internal
 */
export type PollJson = z.infer<typeof pollItemSchema>;

/**
 * @internal
 */
export const pollOptionItemSchema = z.object({
    by: z.string().optional(),
    id: integerSchema,
    poll: integerSchema,
    score: integerSchema.default(0),
    text: z.string().optional(),
    time: dateSchema,
    type: z.literal("pollopt"),
    deleted: booleanSchema.default(false),
    dead: booleanSchema.default(false),
    url: z.string().optional(),
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
    created: dateSchema,
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

    fetchMaxItem(): Promise<Integer>;
};

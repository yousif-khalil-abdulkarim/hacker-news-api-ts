import type { ICache } from "@/hn-flat-api/contracts.js";

export class TTLCache<TBase> implements ICache<TBase> {
    private readonly transform = new Map<string, TBase>();
    private readonly timeoutIdMap = new Map<
        string,
        string | number | NodeJS.Timeout
    >();

    constructor(private readonly ttlInMs: number) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    async get<TValue extends TBase>(key: string): Promise<TValue | null> {
        return (this.transform.get(key) as TValue) ?? null;
    }

    async getOrSet<TValue extends TBase>(
        key: string,
        value: () => Promise<TValue>,
    ): Promise<TValue> {
        const value_ = await this.get(key);
        if (value_ === null) {
            const insertValue = await value();
            await this.set(key, insertValue);
            return insertValue;
        }
        return value_ as TValue;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async set<TValue extends TBase>(key: string, value: TValue): Promise<void> {
        this.transform.set(key, value);
        this.timeoutIdMap.set(
            key,
            setTimeout(() => {
                this.transform.delete(key);
                this.timeoutIdMap.delete(key);
            }, this.ttlInMs),
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async remove(key: string): Promise<void> {
        this.transform.delete(key);
        clearTimeout(this.timeoutIdMap.get(key));
        this.timeoutIdMap.delete(key);
    }
}

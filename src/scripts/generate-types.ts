/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
    quicktype,
    InputData,
    jsonInputForTargetLanguage,
} from "quicktype-core";

class FetchAllItems implements AsyncIterable<string> {
    constructor(private readonly maxConcurrency: number) {}

    async *[Symbol.asyncIterator](): AsyncIterator<string> {
        const res = await fetch(
            "https://hacker-news.firebaseio.com/v0/maxitem.json?",
        );
        const maxItem: number = await res.json();

        console.log("MAX_ITEM:", maxItem);
        console.log("START:");
        const promises: Array<() => Promise<string>> = [];
        for (let i = 1; i <= maxItem; i++) {
            console.log(
                "STATS:",
                `${String(i)} / ${String(maxItem)}`,
                `${String((i / maxItem) * 100).slice(0, 10)}%`,
            );

            promises.push(async () => {
                const res = await fetch(
                    `https://hacker-news.firebaseio.com/v0/item/${String(1)}.json`,
                );
                return await res.text();
            });

            if (promises.length === this.maxConcurrency) {
                yield* await Promise.all(promises.map((fn) => fn()));
                promises.length = 0;
            }
        }
        console.log("END");
    }
}

function captialize(str: string): string {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}

async function generateType() {
    const TARGET_LANGUAGE = "typescript";
    const MAX_CONCURRENCY = 75;
    const jsonInput = jsonInputForTargetLanguage(TARGET_LANGUAGE);

    for await (const json of new FetchAllItems(MAX_CONCURRENCY)) {
        const type: string = JSON.parse(json)["type"];
        await jsonInput.addSource({
            name: captialize(type),
            samples: [json],
        });
    }

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    return await quicktype({
        inputData,
        lang: TARGET_LANGUAGE,
        ignoreJsonRefs: true,
        inferEnums: false,
        inferBooleanStrings: false,
        inferDateTimes: false,
        inferIntegerStrings: false,
        inferMaps: false,
        inferUuids: false,
    });
}

const result = await generateType();

await mkdir(join(import.meta.filename, "..", "..", "auto-generated"));
await writeFile(
    join(import.meta.filename, "..", "..", "auto-generated", "item-type.ts"),
    result.lines.join("\n"),
);

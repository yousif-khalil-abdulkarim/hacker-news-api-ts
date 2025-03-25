import { TTLCache } from "@/_module.js";
import { HnFlatApi } from "@/hn-flat-api/hn-flat-api.js";
import { appendFile, writeFile } from "fs/promises";

const api = new HnFlatApi(
    "https://hacker-news.firebaseio.com/v0",
    new TTLCache(0),
);

const start = 50594;
const end = await api.fetchMaxItem();
const outputFile = "failed-items.txt";
await writeFile(outputFile, "");
for (let i = start; i <= end; i++) {
    try {
        console.log("INDEX:", i + 1);
        console.log(await api.fetchItem(i));
        console.log("\n");
    } catch (error: unknown) {
        await appendFile(outputFile, i.toString() + "\n");
        console.error(error);
    }
}

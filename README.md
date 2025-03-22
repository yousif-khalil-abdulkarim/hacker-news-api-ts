# hn-api-ts

### Installation

```
npm install hn-api-ts
```

### Description

A TypeScript-based Hacker News client designed to simplify and streamline the process of fetching related data.

```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();
```

<br>

### Settings

- You can provide your own `ICache` implementation. The default implementation is `TTLCache` class which is an in memory ttl cache. Every endpoint will be cached.

- You can set default `pageSize`. The default value is 10.
- You can set default `maxConcurrency`. The default value is 10.
  <br>

Here is the default settings.00,

```ts
import { createHnApi, TTLCache } from "hn-api-ts";

const client = createHnApi({
    cache: new TTLCache(2_000), // in milliseconds
    pageSize: 10,
    maxConcurrency: 10,
});
```

<br>

### Usage

All of the following methods return `List` class instance.

```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();

const topStories = client.topStories();

const newStories = client.newStories();

const bestStories = client.bestStories();

const askstories = client.askstories();

const showStories = client.showStories();

const changedItems = client.changedItems();

const changedUsers = client.changedUsers();
```

<br>

The `List` class instance can be used in the following way.

```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();

const topStories = client.topStories();

// Will fetch the 10 first items by default this can be configured when creating the client.
console.log(await topStories.fetch());

// Will fetch the 5 first items.
console.log(await topStories.setPageSize(5).fetch());

// Will fetch the 10 second items.
console.log(await topStories.setPage(2).fetch());

// Will fetch the 5 second items.
console.log(await topStories.setPage(2).setPageSize(5).fetch());

// You can provide a map function that will be called after fetching the data.
// The map function is used to transform the data.
console.log(
    await topStories
        .map((item) => item.type)
        .setPage(2)
        .setPageSize(5)
        .fetch(),
);
```

<br>

All of the following method return `ListElement` class instance.

```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();

const topStories = client.topStories();

const item = topStories.getItem(0);
```

The `ListElement` class instance can be used in the following way.

```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();

const topStories = client.topStories().setPage(2).setPageSize(5);

const item = topStories.getItem(0);

// Will fetch only the first item from the page.
console.log(await item.fetch());

// If you provide a negative index a RangeError will be thrown
console.log(await topStories.getItem(-1).fetch());

// If you provide a index larger than the pageSize a RangeError will also be thrown
console.log(await topStories.getItem(-1).fetch());

// You can provide a map function that will be called after fetching the data.
// The map function is used to transform the data.
console.log(await item.map((item) => item.type).fetch());
```

<br>

Fetching nested data.
```ts
import { createHnApi } from "hn-api-ts";

const client = createHnApi();

const pageResult = await client
    .topStories()
    // If the item is a comment, then all related data will be fetched.
    .map(async (item) => {
        if (item.type !== "comment") {
            return item;
        }
        return {
            ...item,
            parent: await item.parent.fetch()
            kids: await item.kids.fetch()
        };
    })
    .fetch();
console.log(pageResult);
```

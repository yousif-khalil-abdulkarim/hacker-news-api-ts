# hacker-news-api-ts

### Installation

```
npm install hacker-news-api-ts
```

### Description

A TypeScript-based Hacker News client designed to simplify and streamline the process of fetching related data.

```ts
import { createHnApi } from "hacker-news-api-ts";

const client = createHnApi();
```

<br>

### Settings

- You can provide your own `ICache` implementation. The default implementation is `TTLCache` which is an in memory ttl cache. Every user and item that fetched will be cached. This will make your app faster.

- You can set default `pageSize`. The default value is 10.
- You can set default `maxConcurrency`. The default value is 10.
  <br>

Here is the default settings.00,

```ts
import { createHnApi, TTLCache } from "hacker-news-api-ts";

const client = createHnApi({
    cache: new TTLCache(2_000), // in milliseconds
    pageSize: 10,
    maxConcurrency: 10,
});
```


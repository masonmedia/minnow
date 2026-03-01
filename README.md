# Mini Framework

A tiny, zero-dependency JavaScript framework with Vue-inspired single-file components, reactive data, and client-side routing. No build tools, no npm, no bundler — just files in a browser.

---

## Latest dev state

Router needs integration to maintain state/cache and stop counter jank on homescreen.

1 -

My last claude prompts:
A couple more questions:
1) Is fetched data cached so it doesn't get refetched on every page red-load?
1b) if not, can you add it?
2) How hard would it be to add component and page-level state? 
* I don't think I need it but the current counter example on the homepage doesn't hold it's state on route changes
* if you can add it, can you make it modular so it can be activated if needed?
3) is there/can you add a route-active detection so styles can be added dynamically based on route?

2 - After the above 

Ok so I reverted to this router.js:
* Your latest version goes back to lag on the blog-remote page data load
* and there's a weird jank with each counter click on the homepage.
* for some reason the previous router keeps the counter state

It updated framework.js which is currently v3 commented out. the <x-navbar> no longer rendered on the index page...?

---

I reverted to v2 of framework.


## How it works

There are two core pieces:

**`lib/framework.js`** — Parses and runs components. Each component is an HTML file with three blocks: `<template>` (markup), `<script>` (data and logic), and `<style>` (scoped CSS). When a component is loaded, the framework makes its data reactive (any change automatically re-renders the DOM), processes directives like `v-if` and `v-for`, and calls `mounted()` once the component is live.

**`lib/router.js`** — Handles URL-based navigation without page reloads. It intercepts link clicks and `popstate` events, matches the current URL to a route, fetches the right component file, and swaps it into the `#app` container with a fade transition.

---

## Directory structure

```
/
├── index.html              # Entry point — sets up #app and boots the router
├── lib/
│   ├── framework.js        # Core: component parser, reactivity, directives
│   └── router.js           # Client-side router and state management
├── pages/
│   ├── index.html          # Home page component
│   ├── about.html          # About page component
│   ├── blog.html           # Blog listing component
│   └── blog-post.html      # Individual post component
├── components/
│   ├── navbar.html
│   ├── footer.html
│   └── card.html
└── data/
    ├── posts.json          # Blog post data (id, title, content, author, etc.)
    └── site-info.json
```

---

## Components

Each page or component is a single `.html` file with three sections:

```html
<template>
    <div>
        <h1>{{ title }}</h1>
        <button @click="increment">Clicked {{ count }} times</button>
        <ul>
            <li v-for="item in items">{{ item.name }}</li>
        </ul>
    </div>
</template>

<script>
({
    data: {
        title: 'Hello',
        count: 0,
        items: []
    },
    methods: {
        increment() {
            this.data.count++;
        }
    },
    async mounted() {
        const res = await fetch('/data/items.json');
        this.data.items = await res.json();
    }
})
</script>

<style>
h1 { color: navy; }
</style>
```

A few things to note:
- The `<script>` block must return a plain object (or a function returning one) — not an ES module.
- `this.data` is how you read and write reactive state inside `methods` and `mounted`. Any assignment to a `this.data` property triggers a re-render automatically.
- `mounted()` can be `async`. It runs once after the component is first rendered, so it's the right place to fetch data.
- You do **not** need to call `this.update()` manually — setting `this.data.anything = value` handles it.

---

## Directives

| Directive | What it does | Example |
|---|---|---|
| `{{ expr }}` | Renders a value as text | `{{ post.title }}` |
| `v-if` | Shows/hides an element based on a condition | `<div v-if="loading">` |
| `v-for` | Repeats an element for each item in an array | `<li v-for="post in posts">` |
| `v-model` | Two-way binding between an input and a data property | `<input v-model="query">` |
| `:class` | Applies classes conditionally | `<div :class="{ active: isOpen }">` |
| `@click` | Calls a method on click | `<button @click="save">` or `<button @click="save(id)">` |

**Important — `v-if` and `v-for` interaction:** if you have `{{ item.prop }}` mustaches inside a `v-if` block, the framework evaluates them *after* checking the condition, so expressions inside a false block are never run. This means it's safe to write `<div v-if="post">{{ post.title }}</div>` even when `post` starts as `null`.

---

## Routing

Routes are defined in `lib/router.js`:

```javascript
const router = new Router([
    { path: '/',           component: './pages/index.html' },
    { path: '/about',      component: './pages/about.html' },
    { path: '/blog',       component: './pages/blog.html' },
    { path: '/blog/:slug', component: './pages/blog-post.html' }
]);
```

The `:slug` syntax defines a dynamic segment. Its value is available inside the component as `this.data.$route.params.slug`.

### Navigating

Links with `href` starting with `/` are intercepted automatically — no special syntax needed:

```html
<a href="/blog">Go to blog</a>
```

To navigate programmatically from a method:

```javascript
this.data.$router.push('/blog/my-post-slug');
```

### Reading route params

```javascript
async mounted() {
    const slug = this.data.$route.params.slug;
    const res = await fetch('/data/posts.json');
    const posts = await res.json();
    this.data.post = posts.find(p => p.slug === slug);
}
```

### How slugs work

Post URLs are derived from the post title using a `slugify` function — `"Hello World"` becomes `/blog/hello-world`. This happens in `blog.html` when posts are loaded (a `slug` property is attached to each post), and the same function is used in `blog-post.html` to match the URL back to a post. There is no numeric ID in the URL.

```javascript
const slugify = (title) => title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
```

---

## State management

Three state objects are available inside any component:

| Object | Scope | Use for |
|---|---|---|
| `this.data` | Component only | Local UI state — selected tab, form values, loaded data |
| `this.data.$globalState` | Entire app | Shared data that persists across route changes — logged-in user, theme |
| `this.data.$componentState` | Current route | Data that should reset on navigation but be shared between re-renders of the same route |

```javascript
// Write
this.data.$globalState.user = { name: 'Alice' };

// Read
const user = this.data.$globalState.user;
```

---

## Data loading

Fetch data in `mounted()` using standard `fetch`. Always use absolute paths so the URL resolves correctly regardless of what route you're on:

```javascript
async mounted() {
    try {
        const res = await fetch('/data/posts.json');  // absolute path — not ./data/
        this.data.posts = await res.json();
    } catch (err) {
        console.error('Failed to load posts', err);
    }
}
```

---

## posts.json format

Each post object should have at minimum:

```json
[
    {
        "title": "Getting Started",
        "author": "Your Name",
        "date": "January 1, 2025",
        "category": "Guide",
        "excerpt": "A short summary shown on the blog listing.",
        "content": "The full post body shown on the individual post page."
    }
]
```

The `slug` field is generated automatically from `title` — you don't need to add it manually.

---

## Running locally

Any static file server works. The simplest:

```bash
npx http-server -p 5173 -c-1
```

Then open `http://localhost:5173`. You cannot open `index.html` directly as a file (`file://`) because ES modules and `fetch` require HTTP.

---

## Browser support

Requires a modern browser with support for ES modules, Proxies, Fetch, and the History API. All current versions of Chrome, Firefox, Safari, and Edge work.
// import { parseSFC } from './framework.js';

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.globalState = this.createReactiveState({});
//         this.componentState = this.createReactiveState({});
//         this.params = {};
//         this.currentComponent = null;
//     }

//     createReactiveState(initialState) {
//         const listeners = [];
//         const state = {};

//         const notify = () => {
//             listeners.forEach(listener => listener(state));
//         };

//         return new Proxy(initialState, {
//             get(target, prop) {
//                 if (prop === 'subscribe') {
//                     return (listener) => {
//                         listeners.push(listener);
//                         return () => {
//                             const index = listeners.indexOf(listener);
//                             if (index > -1) listeners.splice(index, 1);
//                         };
//                     };
//                 }
//                 if (prop === 'setState') {
//                     return (updates) => {
//                         Object.assign(target, updates);
//                         notify();
//                     };
//                 }
//                 return target[prop];
//             },
//             set(target, prop, value) {
//                 target[prop] = value;
//                 notify();
//                 return true;
//             }
//         });
//     }

//     init(container) {
//         this.container = container;

//         // Inject global transition styles so the fade works without needing
//         // a separate stylesheet entry
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 /* No transition on enter so the new content is invisible
//                    before we trigger the fade-in */
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         // Normalise trailing slash (but preserve bare '/')
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};

//                 paramNames.forEach((name, i) => {
//                     params[name] = match[i + 1];
//                 });

//                 return { route, params };
//             }
//         }

//         return null;
//     }

//     async navigate(path, pushState = true) {
//         const matched = this.matchRoute(path);

//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params);
//     }

//     async transitionTo(route, params) {
//         if (!this.container) return;

//         // --- Fade out ---
//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         // --- Swap content while invisible ---
//         this.componentState = this.createReactiveState({});

//         // Resolve component path from root so it never inherits the current
//         // URL path (e.g. /blog/:slug resolving ./pages/ as /blog/pages/)
//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Assign router/state references without going through the reactive
//         // setter, so they don't trigger premature update() calls
//         Object.defineProperty(component.data, '$route', { value: { params, path: route.path }, writable: true, enumerable: true });
//         Object.defineProperty(component.data, '$router', { value: { push: (path) => this.navigate(path), params }, writable: true, enumerable: true });
//         Object.defineProperty(component.data, '$globalState', { value: this.globalState, writable: true, enumerable: true });
//         Object.defineProperty(component.data, '$componentState', { value: this.componentState, writable: true, enumerable: true });

//         this.currentComponent = component;
//         this.container.innerHTML = '';

//         // Apply enter (opacity: 0, no transition) before rendering so the
//         // new content doesn't flash in
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         await component.render(this.container);

//         // --- Fade in ---
//         // rAF ensures the browser has painted the enter state before we
//         // trigger the transition, preventing a flash
//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');

//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }

//     getGlobalState() {
//         return this.globalState;
//     }

//     getComponentState() {
//         return this.componentState;
//     }
// }

// const router = new Router([
//     { path: '/', component: './pages/index.html' },
//     { path: '/about', component: './pages/about.html' },
//     { path: '/blog', component: './pages/blog.html' },
//     { path: '/blog/:slug', component: './pages/blog-post.html' }
// ]);

// export { Router, router };



// v2
// import { parseSFC } from './framework.js';

// // Persistent key-value store backed by localStorage.
// // Replaces both $globalState and $componentState — one simple thing
// // that actually survives page refreshes and navigation.
// //
// // Usage inside any component:
// //   this.data.$store.set('count', 5)
// //   this.data.$store.get('count', 0)    // second arg is fallback default
// //   this.data.$store.remove('count')
// //   this.data.$store.clear()            // wipe all store keys
// class Store {
//     constructor(namespace = 'mini-fw') {
//         this.ns = namespace;
//     }
//     _key(k) { return `${this.ns}:${k}`; }
//     get(key, fallback = null) {
//         try {
//             const raw = localStorage.getItem(this._key(key));
//             return raw !== null ? JSON.parse(raw) : fallback;
//         } catch { return fallback; }
//     }
//     set(key, value) {
//         try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
//         catch (e) { console.warn('Store.set failed:', e); }
//     }
//     remove(key) { localStorage.removeItem(this._key(key)); }
//     clear() {
//         Object.keys(localStorage)
//             .filter(k => k.startsWith(this.ns + ':'))
//             .forEach(k => localStorage.removeItem(k));
//     }

//     // Fetch a URL and return the parsed JSON. Caches the result in
//     // localStorage so subsequent calls return instantly without a network
//     // request. Pass force=true to bypass the cache.
//     //
//     // Usage: const data = await this.data.$store.get(url)
//     async fetch(url, { force = false } = {}) {
//         const cacheKey = 'fetch:' + url;
//         if (!force) {
//             const cached = this.get(cacheKey);
//             if (cached !== null) return cached;
//         }
//         const res = await window.fetch(url);
//         if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
//         const data = await res.json();
//         this.set(cacheKey, data);
//         return data;
//     }
// }

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.params = {};
//         this.currentComponent = null;
//         this.store = new Store();
//     }

//     init(container) {
//         this.container = container;
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};
//                 paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
//                 return { route, params };
//             }
//         }
//         return null;
//     }

//     async navigate(path, pushState = true) {
//         const matched = this.matchRoute(path);
//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params);
//     }

//     async transitionTo(route, params) {
//         if (!this.container) return;

//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Inject $route, $router, $store without triggering reactive setters
//         Object.defineProperty(component.data, '$route', {
//             value: { params, path: route.path }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$router', {
//             value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$store', {
//             value: this.store, writable: true, enumerable: true
//         });

//         this.currentComponent = component;
//         this.container.innerHTML = '';
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         await component.render(this.container);

//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');
//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }
// }

// const router = new Router([
//     { path: '/',                component: './pages/index.html' },
//     { path: '/about',           component: './pages/about.html' },
//     { path: '/blog',            component: './pages/blog.html' },
//     { path: '/blog/:slug',      component: './pages/blog-post.html' },
//     { path: '/blog-remote',     component: './pages/blog-remote.html' },
//     { path: '/blog-remote/:slug', component: './pages/blog-remote-post.html' }
// ]);

// export { Router, Store, router };



// v3
// import { parseSFC } from './framework.js';

// // Persistent key-value store backed by localStorage.
// // Replaces both $globalState and $componentState — one simple thing
// // that actually survives page refreshes and navigation.
// //
// // Usage inside any component:
// //   this.data.$store.set('count', 5)
// //   this.data.$store.get('count', 0)    // second arg is fallback default
// //   this.data.$store.remove('count')
// //   this.data.$store.clear()            // wipe all store keys
// class Store {
//     constructor(namespace = 'mini-fw') {
//         this.ns = namespace;
//     }
//     _key(k) { return `${this.ns}:${k}`; }
//     get(key, fallback = null) {
//         try {
//             const raw = localStorage.getItem(this._key(key));
//             return raw !== null ? JSON.parse(raw) : fallback;
//         } catch { return fallback; }
//     }
//     set(key, value) {
//         try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
//         catch (e) { console.warn('Store.set failed:', e); }
//     }
//     remove(key) { localStorage.removeItem(this._key(key)); }
//     clear() {
//         Object.keys(localStorage)
//             .filter(k => k.startsWith(this.ns + ':'))
//             .forEach(k => localStorage.removeItem(k));
//     }

//     // Fetch a URL and return parsed JSON.
//     // Caches to localStorage with a TTL (default: 5 minutes).
//     // On a cache hit the network is never touched — navigation is instant.
//     //
//     // Options:
//     //   ttl   — cache lifetime in ms (default: 5 * 60 * 1000)
//     //   force — bypass cache and refetch regardless of TTL
//     //
//     // Usage:
//     //   await this.data.$store.fetch(url)
//     //   await this.data.$store.fetch(url, { ttl: 60_000 })   // 1 minute
//     //   await this.data.$store.fetch(url, { force: true })    // always fresh
//     async fetch(url, { force = false, ttl = 5 * 60 * 1000 } = {}) {
//         const cacheKey = 'fetch:' + url;
//         if (!force) {
//             const entry = this.get(cacheKey);
//             if (entry && (Date.now() - entry.ts < ttl)) {
//                 return entry.data;
//             }
//         }
//         const res = await window.fetch(url);
//         if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
//         const data = await res.json();
//         this.set(cacheKey, { data, ts: Date.now() });
//         return data;
//     }
// }

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.params = {};
//         this.currentComponent = null;
//         this.store = new Store();
//     }

//     init(container) {
//         this.container = container;
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};
//                 paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
//                 return { route, params };
//             }
//         }
//         return null;
//     }

//     async navigate(path, pushState = true) {
//         const matched = this.matchRoute(path);
//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params, path);
//     }

//     async transitionTo(route, params, currentPath) {
//         if (!this.container) return;

//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Inject $route, $router, $store without triggering reactive setters
//         // currentPath is the actual URL (e.g. /blog/my-post)
//         // path is the route pattern (e.g. /blog/:slug)
//         Object.defineProperty(component.data, '$route', {
//             value: { params, path: route.path, currentPath: currentPath || window.location.pathname }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$router', {
//             value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$store', {
//             value: this.store, writable: true, enumerable: true
//         });

//         this.currentComponent = component;
//         this.container.innerHTML = '';
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         await component.render(this.container);

//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');
//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }
// }

// const router = new Router([
//     { path: '/',                component: './pages/index.html' },
//     { path: '/about',           component: './pages/about.html' },
//     { path: '/blog',            component: './pages/blog.html' },
//     { path: '/blog/:slug',      component: './pages/blog-post.html' },
//     { path: '/blog-remote',     component: './pages/blog-remote.html' },
//     { path: '/blog-remote/:slug', component: './pages/blog-remote-post.html' }
// ]);

// export { Router, Store, router };


// v4

// import { parseSFC } from './framework.js';

// // Persistent key-value store backed by localStorage.
// // Replaces both $globalState and $componentState — one simple thing
// // that actually survives page refreshes and navigation.
// //
// // Usage inside any component:
// //   this.data.$store.set('count', 5)
// //   this.data.$store.get('count', 0)    // second arg is fallback default
// //   this.data.$store.remove('count')
// //   this.data.$store.clear()            // wipe all store keys
// class Store {
//     constructor(namespace = 'mini-fw') {
//         this.ns = namespace;
//     }
//     _key(k) { return `${this.ns}:${k}`; }
//     get(key, fallback = null) {
//         try {
//             const raw = localStorage.getItem(this._key(key));
//             return raw !== null ? JSON.parse(raw) : fallback;
//         } catch { return fallback; }
//     }
//     set(key, value) {
//         try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
//         catch (e) { console.warn('Store.set failed:', e); }
//     }
//     remove(key) { localStorage.removeItem(this._key(key)); }
//     clear() {
//         Object.keys(localStorage)
//             .filter(k => k.startsWith(this.ns + ':'))
//             .forEach(k => localStorage.removeItem(k));
//     }

//     // Fetch a URL and return parsed JSON.
//     // Caches to localStorage with a TTL (default: 5 minutes).
//     // On a cache hit the network is never touched — navigation is instant.
//     //
//     // Options:
//     //   ttl   — cache lifetime in ms (default: 5 * 60 * 1000)
//     //   force — bypass cache and refetch regardless of TTL
//     //
//     // Usage:
//     //   await this.data.$store.fetch(url)
//     //   await this.data.$store.fetch(url, { ttl: 60_000 })   // 1 minute
//     //   await this.data.$store.fetch(url, { force: true })    // always fresh
//     async fetch(url, { force = false, ttl = 5 * 60 * 1000 } = {}) {
//         const cacheKey = 'fetch:' + url;
//         if (!force) {
//             const entry = this.get(cacheKey);
//             if (entry && (Date.now() - entry.ts < ttl)) {
//                 return entry.data;
//             }
//         }
//         const res = await window.fetch(url);
//         if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
//         const data = await res.json();
//         this.set(cacheKey, { data, ts: Date.now() });
//         return data;
//     }
// }

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.params = {};
//         this.currentComponent = null;
//         this.store = new Store();
//     }

//     init(container) {
//         this.container = container;
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};
//                 paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
//                 return { route, params };
//             }
//         }
//         return null;
//     }

//     async navigate(path, pushState = true) {
//         const matched = this.matchRoute(path);
//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params, path);
//     }

//     async transitionTo(route, params, currentPath) {
//         if (!this.container) return;

//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Inject $route, $router, $store without triggering reactive setters
//         // currentPath is the actual URL (e.g. /blog/my-post)
//         // path is the route pattern (e.g. /blog/:slug)
//         Object.defineProperty(component.data, '$route', {
//             value: { params, path: route.path, currentPath: currentPath || window.location.pathname }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$router', {
//             value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$store', {
//             value: this.store, writable: true, enumerable: true
//         });

//         this.currentComponent = component;
//         this.container.innerHTML = '';
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         await component.render(this.container);

//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');
//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }
// }

// const router = new Router([
//     { path: '/',                component: './pages/index.html' },
//     { path: '/about',           component: './pages/about.html' },
//     { path: '/blog',            component: './pages/blog.html' },
//     { path: '/blog/:slug',      component: './pages/blog-post.html' },
//     { path: '/blog-remote',     component: './pages/blog-remote.html' },
//     { path: '/blog-remote/:slug', component: './pages/blog-remote-post.html' }
// ]);

// export { Router, Store, router };



// working good

// import { parseSFC } from './framework.js';

// // Persistent key-value store backed by localStorage.
// // Replaces both $globalState and $componentState — one simple thing
// // that actually survives page refreshes and navigation.
// //
// // Usage inside any component:
// //   this.data.$store.set('count', 5)
// //   this.data.$store.get('count', 0)    // second arg is fallback default
// //   this.data.$store.remove('count')
// //   this.data.$store.clear()            // wipe all store keys
// class Store {
//     constructor(namespace = 'mini-fw') {
//         this.ns = namespace;
//     }
//     _key(k) { return `${this.ns}:${k}`; }
//     get(key, fallback = null) {
//         try {
//             const raw = localStorage.getItem(this._key(key));
//             return raw !== null ? JSON.parse(raw) : fallback;
//         } catch { return fallback; }
//     }
//     set(key, value) {
//         try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
//         catch (e) { console.warn('Store.set failed:', e); }
//     }
//     remove(key) { localStorage.removeItem(this._key(key)); }
//     clear() {
//         Object.keys(localStorage)
//             .filter(k => k.startsWith(this.ns + ':'))
//             .forEach(k => localStorage.removeItem(k));
//     }

//     // Fetch a URL and return parsed JSON.
//     // Caches to localStorage with a TTL (default: 5 minutes).
//     // On a cache hit the network is never touched — navigation is instant.
//     //
//     // Options:
//     //   ttl   — cache lifetime in ms (default: 5 * 60 * 1000)
//     //   force — bypass cache and refetch regardless of TTL
//     //
//     // Usage:
//     //   await this.data.$store.fetch(url)
//     //   await this.data.$store.fetch(url, { ttl: 60_000 })   // 1 minute
//     //   await this.data.$store.fetch(url, { force: true })    // always fresh
//     async fetch(url, { force = false, ttl = 5 * 60 * 1000 } = {}) {
//         const cacheKey = 'fetch:' + url;
//         if (!force) {
//             const entry = this.get(cacheKey);
//             if (entry && (Date.now() - entry.ts < ttl)) {
//                 return entry.data;
//             }
//         }
//         const res = await window.fetch(url);
//         if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
//         const data = await res.json();
//         this.set(cacheKey, { data, ts: Date.now() });
//         return data;
//     }
// }

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.params = {};
//         this.currentComponent = null;
//         this.store = new Store();
//         // Persistent component instances registered via registerComponent()
//         // These get _rerender() called after every navigation
//         this.persistentComponents = [];
//     }

//     // Register a persistent component (e.g. navbar in shell index.html)
//     // so it re-renders after every route change and reflects the new active path.
//     // Usage in shell: router.registerComponent(navbarInstance);
//     registerComponent(component, sfcPath) {
//         component._sfcPath = sfcPath;
//         this.persistentComponents.push(component);
//     }

//     init(container) {
//         this.container = container;
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};
//                 paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
//                 return { route, params };
//             }
//         }
//         return null;
//     }

//     async navigate(path, pushState = true) {
//         // Don't re-navigate if already on this path (skip for initial load where pushState=false)
//         if (pushState && path === window.location.pathname) return;

//         const matched = this.matchRoute(path);
//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params, path);
//     }

//     async transitionTo(route, params, currentPath) {
//         if (!this.container) return;

//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Inject $route, $router, $store without triggering reactive setters
//         // currentPath is the actual URL (e.g. /blog/my-post)
//         // path is the route pattern (e.g. /blog/:slug)
//         Object.defineProperty(component.data, '$route', {
//             value: { params, path: route.path, currentPath: currentPath || window.location.pathname }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$router', {
//             value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$store', {
//             value: this.store, writable: true, enumerable: true
//         });

//         this.currentComponent = component;
//         this.container.innerHTML = '';
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         await component.render(this.container);

//         window.scrollTo({ top: 0, behavior: 'smooth' });

//         // Re-render persistent shell components (navbar etc.) so active class updates
//         // Re-parse to get a fresh instance so data() re-runs with new pathname
//         for (const c of this.persistentComponents) {
//             if (!c.element) continue;
//             const fresh = await parseSFC(c._sfcPath);
//             fresh.render(c.element);
//         }

//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');
//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }
// }

// const router = new Router([
//     { path: '/',                component: './pages/index.html' },
//     { path: '/about',           component: './pages/about.html' },
//     { path: '/blog',            component: './pages/blog.html' },
//     { path: '/blog/:slug',      component: './pages/blog-post.html' },
//     { path: '/blog-remote',     component: './pages/blog-remote.html' },
//     { path: '/blog-remote/:slug', component: './pages/blog-remote-post.html' }
// ]);

// export { Router, Store, router };


// working: add support for SEO

// import { parseSFC } from './framework.js';

// // Persistent key-value store backed by localStorage.
// // Replaces both $globalState and $componentState — one simple thing
// // that actually survives page refreshes and navigation.
// //
// // Usage inside any component:
// //   this.data.$store.set('count', 5)
// //   this.data.$store.get('count', 0)    // second arg is fallback default
// //   this.data.$store.remove('count')
// //   this.data.$store.clear()            // wipe all store keys
// class Store {
//     constructor(namespace = 'mini-fw') {
//         this.ns = namespace;
//     }
//     _key(k) { return `${this.ns}:${k}`; }
//     get(key, fallback = null) {
//         try {
//             const raw = localStorage.getItem(this._key(key));
//             return raw !== null ? JSON.parse(raw) : fallback;
//         } catch { return fallback; }
//     }
//     set(key, value) {
//         try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
//         catch (e) { console.warn('Store.set failed:', e); }
//     }
//     remove(key) { localStorage.removeItem(this._key(key)); }
//     clear() {
//         Object.keys(localStorage)
//             .filter(k => k.startsWith(this.ns + ':'))
//             .forEach(k => localStorage.removeItem(k));
//     }

//     // Fetch a URL and return parsed JSON.
//     // Caches to localStorage with a TTL (default: 5 minutes).
//     // On a cache hit the network is never touched — navigation is instant.
//     //
//     // Options:
//     //   ttl   — cache lifetime in ms (default: 5 * 60 * 1000)
//     //   force — bypass cache and refetch regardless of TTL
//     //
//     // Usage:
//     //   await this.data.$store.fetch(url)
//     //   await this.data.$store.fetch(url, { ttl: 60_000 })   // 1 minute
//     //   await this.data.$store.fetch(url, { force: true })    // always fresh
//     async fetch(url, { force = false, ttl = 5 * 60 * 1000 } = {}) {
//         const cacheKey = 'fetch:' + url;
//         if (!force) {
//             const entry = this.get(cacheKey);
//             if (entry && (Date.now() - entry.ts < ttl)) {
//                 return entry.data;
//             }
//         }
//         const res = await window.fetch(url);
//         if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
//         const data = await res.json();
//         this.set(cacheKey, { data, ts: Date.now() });
//         return data;
//     }
// }

// class Router {
//     constructor(routes) {
//         this.routes = routes;
//         this.currentRoute = null;
//         this.container = null;
//         this.params = {};
//         this.currentComponent = null;
//         this.store = new Store();
//         // Persistent component instances registered via registerComponent()
//         // These get _rerender() called after every navigation
//         this.persistentComponents = [];
//     }

//     // Register a persistent component (e.g. navbar in shell index.html)
//     // so it re-renders after every route change and reflects the new active path.
//     // Usage in shell: router.registerComponent(navbarInstance);
//     registerComponent(component, sfcPath) {
//         component._sfcPath = sfcPath;
//         this.persistentComponents.push(component);
//     }

//     init(container) {
//         this.container = container;
//         this.injectTransitionStyles();

//         window.addEventListener('popstate', () => {
//             this.navigate(window.location.pathname, false);
//         });

//         document.addEventListener('click', (e) => {
//             const link = e.target.closest('a[href]');
//             if (link && link.getAttribute('href').startsWith('/')) {
//                 e.preventDefault();
//                 this.navigate(link.getAttribute('href'));
//             }
//         });

//         // Pre-populate nav links so navbar has them on first render
//         this.store.set('$nav', this.buildNavLinks(window.location.pathname));

//         this.navigate(window.location.pathname, false);
//     }

//     injectTransitionStyles() {
//         if (document.getElementById('router-transition-styles')) return;
//         const style = document.createElement('style');
//         style.id = 'router-transition-styles';
//         style.textContent = `
//             #app {
//                 transition: opacity 0.25s ease;
//                 opacity: 1;
//             }
//             #app.page-transition-exit {
//                 opacity: 0;
//             }
//             #app.page-transition-enter {
//                 opacity: 0;
//                 transition: none;
//             }
//             #app.page-transition-enter-active {
//                 opacity: 1;
//                 transition: opacity 0.25s ease;
//             }
//         `;
//         document.head.appendChild(style);
//     }

//     matchRoute(path) {
//         const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

//         for (const route of this.routes) {
//             const pattern = route.path.replace(/:\w+/g, '([^/]+)');
//             const regex = new RegExp(`^${pattern}$`);
//             const match = normPath.match(regex);

//             if (match) {
//                 const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
//                 const params = {};
//                 paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
//                 return { route, params };
//             }
//         }
//         return null;
//     }

//     async navigate(path, pushState = true) {
//         // Don't re-navigate if already on this path (skip for initial load where pushState=false)
//         if (pushState && path === window.location.pathname) return;

//         const matched = this.matchRoute(path);
//         if (!matched) {
//             console.error('Route not found:', path);
//             return;
//         }

//         const { route, params } = matched;
//         this.currentRoute = route;
//         this.params = params;

//         if (pushState) {
//             window.history.pushState({}, '', path);
//         }

//         await this.transitionTo(route, params, path);
//     }

//     // Update <head> meta tags from a page component's meta config.
//     // Supports static object or function for dynamic pages (post titles etc.)
//     // All values are optional — omitting a key leaves the shell default in place.
//     //
//     // Supported keys:
//     //   title        — <title> + og:title + twitter:title
//     //   description  — <meta name="description"> + og + twitter (max 155 chars)
//     //   image        — og:image + twitter:image (absolute URL, 1200×630px recommended)
//     //   imageAlt     — og:image:alt + twitter:image:alt
//     //   url          — og:url + canonical link (defaults to window.location.href)
//     //   type         — og:type ('website' | 'article' | 'product') default: 'website'
//     //   siteName     — og:site_name
//     //   twitterCard  — 'summary_large_image' | 'summary' (default: 'summary_large_image')
//     //   twitterSite  — twitter:site handle e.g. '@mysite'
//     //   twitterCreator — twitter:creator handle e.g. '@author'
//     //   author       — <meta name="author">
//     //   robots       — <meta name="robots"> e.g. 'index,follow'
//     //   canonical    — explicit canonical URL (overrides url)
//     //   article      — { publishedTime, modifiedTime, author, section, tags[] }
//     applyMeta(component) {
//         if (!component.meta) return;

//         const meta = typeof component.meta === 'function'
//             ? component.meta.call(component)
//             : component.meta;

//         if (!meta) return;

//         // ── Helpers ───────────────────────────────────────────────────────────
//         const setTag = (selector, attr, key, value) => {
//             if (value === undefined || value === null || value === '') return;
//             let el = document.querySelector(selector);
//             if (!el) {
//                 el = document.createElement('meta');
//                 el.setAttribute(attr, key);
//                 document.head.appendChild(el);
//             }
//             el.setAttribute('content', String(value));
//         };
//         const setName     = (name, value)     => setTag(`meta[name="${name}"]`,     'name',     name,     value);
//         const setProperty = (prop, value)     => setTag(`meta[property="${prop}"]`, 'property', prop,     value);

//         const url         = meta.url || window.location.href;
//         const canonical   = meta.canonical || url;
//         const type        = meta.type || 'website';
//         const twitterCard = meta.twitterCard || 'summary_large_image';

//         // ── Standard SEO ──────────────────────────────────────────────────────
//         if (meta.title)       document.title = meta.title;
//         setName('description',   meta.description);
//         setName('author',        meta.author);
//         setName('robots',        meta.robots);

//         // ── Open Graph (Facebook, LinkedIn, Discord, Slack, WhatsApp) ─────────
//         setProperty('og:type',        type);
//         setProperty('og:url',         url);
//         setProperty('og:title',       meta.title);
//         setProperty('og:description', meta.description);
//         setProperty('og:image',       meta.image);
//         setProperty('og:image:alt',   meta.imageAlt);
//         setProperty('og:image:width', meta.imageWidth  || (meta.image ? '1200' : null));
//         setProperty('og:image:height',meta.imageHeight || (meta.image ? '630'  : null));
//         setProperty('og:site_name',   meta.siteName);
//         setProperty('og:locale',      meta.locale || 'en_US');

//         // ── Article tags (og:type = 'article') ────────────────────────────────
//         if (type === 'article' && meta.article) {
//             const a = meta.article;
//             setProperty('article:published_time', a.publishedTime);
//             setProperty('article:modified_time',  a.modifiedTime);
//             setProperty('article:author',         a.author);
//             setProperty('article:section',        a.section);
//             if (a.tags) a.tags.forEach(tag => {
//                 const el = document.createElement('meta');
//                 el.setAttribute('property', 'article:tag');
//                 el.setAttribute('content', tag);
//                 // Only add if not already present
//                 if (!document.querySelector(`meta[property="article:tag"][content="${tag}"]`)) {
//                     document.head.appendChild(el);
//                 }
//             });
//         }

//         // ── Twitter / X Cards ─────────────────────────────────────────────────
//         // X does not fall back to OG for card type — must be explicit
//         setName('twitter:card',        twitterCard);
//         setName('twitter:title',       meta.title);
//         setName('twitter:description', meta.description);
//         setName('twitter:image',       meta.image);
//         setName('twitter:image:alt',   meta.imageAlt);
//         setName('twitter:site',        meta.twitterSite);
//         setName('twitter:creator',     meta.twitterCreator);

//         // ── Canonical link ────────────────────────────────────────────────────
//         let canonEl = document.querySelector('link[rel="canonical"]');
//         if (!canonEl) {
//             canonEl = document.createElement('link');
//             canonEl.setAttribute('rel', 'canonical');
//             document.head.appendChild(canonEl);
//         }
//         canonEl.setAttribute('href', canonical);
//     }

//     buildNavLinks(currentPath) {
//         const p = currentPath || window.location.pathname;
//         return this.routes
//             .filter(r => r.nav)
//             .map(r => ({
//                 href:   r.path,
//                 label:  r.nav,
//                 active: (r.path === '/' ? p === '/' : p === r.path || p.startsWith(r.path + '/')) ? 'active' : ''
//             }));
//     }

//     async transitionTo(route, params, currentPath) {
//         if (!this.container) return;

//         this.container.classList.add('page-transition-exit');
//         await new Promise(resolve => setTimeout(resolve, 250));

//         const componentPath = route.component.startsWith('/')
//             ? route.component
//             : '/' + route.component.replace(/^\.\//, '');

//         const component = await parseSFC(componentPath);

//         // Inject $route, $router, $store without triggering reactive setters
//         // currentPath is the actual URL (e.g. /blog/my-post)
//         // path is the route pattern (e.g. /blog/:slug)
//         Object.defineProperty(component.data, '$route', {
//             value: { params, path: route.path, currentPath: currentPath || window.location.pathname }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$router', {
//             value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
//         });
//         Object.defineProperty(component.data, '$store', {
//             value: this.store, writable: true, enumerable: true
//         });

//         this.currentComponent = component;
//         this.container.innerHTML = '';
//         this.container.classList.remove('page-transition-exit');
//         this.container.classList.add('page-transition-enter');

//         // Write nav links to store so navbar can read them without hardcoding
//         this.store.set('$nav', this.buildNavLinks(currentPath));

//         await component.render(this.container);

//         this.applyMeta(component);
//         window.scrollTo({ top: 0, behavior: 'smooth' });

//         // Re-render persistent shell components (navbar etc.) so active class updates
//         // Re-parse to get a fresh instance so data() re-runs with new pathname
//         for (const c of this.persistentComponents) {
//             if (!c.element) continue;
//             const fresh = await parseSFC(c._sfcPath);
//             fresh.render(c.element);
//         }

//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => {
//                 this.container.classList.remove('page-transition-enter');
//                 this.container.classList.add('page-transition-enter-active');
//                 setTimeout(() => {
//                     this.container.classList.remove('page-transition-enter-active');
//                 }, 250);
//             });
//         });
//     }
// }

// const router = new Router([
//     { path: '/',                component: './pages/index.html' },
//     { path: '/about',           component: './pages/about.html' },
//     { path: '/template-1',           component: './pages/template-1.html' },
//     { path: '/template-2',           component: './pages/template-2.html' },
//     { path: '/blog',            component: './pages/blog.html' },
//     { path: '/blog/:slug',      component: './pages/blog-post.html' },
//     { path: '/blog-remote',     component: './pages/blog-remote.html' },
//     { path: '/blog-remote/:slug', component: './pages/blog-remote-post.html' }
// ]);

// export { Router, Store, router };



// add support for auto route writing and detection to/from /lib/manifest.json
// routes write automatically on server start, get read by router

import { parseSFC } from './framework.js';

// Persistent key-value store backed by localStorage.
// Replaces both $globalState and $componentState — one simple thing
// that actually survives page refreshes and navigation.
//
// Usage inside any component:
//   this.data.$store.set('count', 5)
//   this.data.$store.get('count', 0)    // second arg is fallback default
//   this.data.$store.remove('count')
//   this.data.$store.clear()            // wipe all store keys
class Store {
    constructor(namespace = 'mini-fw') {
        this.ns = namespace;
    }
    _key(k) { return `${this.ns}:${k}`; }
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(this._key(key));
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    }
    set(key, value) {
        try { localStorage.setItem(this._key(key), JSON.stringify(value)); }
        catch (e) { console.warn('Store.set failed:', e); }
    }
    remove(key) { localStorage.removeItem(this._key(key)); }
    clear() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.ns + ':'))
            .forEach(k => localStorage.removeItem(k));
    }

    // Fetch a URL and return parsed JSON.
    // Caches to localStorage with a TTL (default: 5 minutes).
    // On a cache hit the network is never touched — navigation is instant.
    //
    // Options:
    //   ttl   — cache lifetime in ms (default: 5 * 60 * 1000)
    //   force — bypass cache and refetch regardless of TTL
    //
    // Usage:
    //   await this.data.$store.fetch(url)
    //   await this.data.$store.fetch(url, { ttl: 60_000 })   // 1 minute
    //   await this.data.$store.fetch(url, { force: true })    // always fresh
    async fetch(url, { force = false, ttl = 5 * 60 * 1000 } = {}) {
        const cacheKey = 'fetch:' + url;
        if (!force) {
            const entry = this.get(cacheKey);
            if (entry && (Date.now() - entry.ts < ttl)) {
                return entry.data;
            }
        }
        const res = await window.fetch(url);
        if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
        const data = await res.json();
        this.set(cacheKey, { data, ts: Date.now() });
        return data;
    }
}

class Router {
    constructor(routes) {
        this.routes = routes;
        this.currentRoute = null;
        this.container = null;
        this.params = {};
        this.currentComponent = null;
        this.store = new Store();
        // Persistent component instances registered via registerComponent()
        // These get _rerender() called after every navigation
        this.persistentComponents = [];
    }

    // Register a persistent component (e.g. navbar in shell index.html)
    // so it re-renders after every route change and reflects the new active path.
    // Usage in shell: router.registerComponent(navbarInstance);
    registerComponent(component, sfcPath) {
        component._sfcPath = sfcPath;
        this.persistentComponents.push(component);
    }

    async init(container) {
        this.container = container;
        this.injectTransitionStyles();

        // Load routes from manifest before first navigation
        try {
            const res = await fetch('/lib/manifest.json');
            if (res.ok) {
                this.routes = await res.json();
            }
        } catch (e) {
            console.warn('[router] could not load manifest.json, routes may be empty', e);
        }

        window.addEventListener('popstate', () => {
            this.navigate(window.location.pathname, false);
        });

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && link.getAttribute('href').startsWith('/')) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });

        // Pre-populate nav links so navbar has them on first render
        this.store.set('$nav', this.buildNavLinks(window.location.pathname));

        this.navigate(window.location.pathname, false);
    }

    injectTransitionStyles() {
        if (document.getElementById('router-transition-styles')) return;
        const style = document.createElement('style');
        style.id = 'router-transition-styles';
        style.textContent = `
            #app {
                transition: opacity 0.25s ease;
                opacity: 1;
            }
            #app.page-transition-exit {
                opacity: 0;
            }
            #app.page-transition-enter {
                opacity: 0;
                transition: none;
            }
            #app.page-transition-enter-active {
                opacity: 1;
                transition: opacity 0.25s ease;
            }
        `;
        document.head.appendChild(style);
    }

    matchRoute(path) {
        const normPath = path.length > 1 ? path.replace(/\/$/, '') : path;

        for (const route of this.routes) {
            const pattern = route.path.replace(/:\w+/g, '([^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            const match = normPath.match(regex);

            if (match) {
                const paramNames = (route.path.match(/:\w+/g) || []).map(p => p.slice(1));
                const params = {};
                paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
                return { route, params };
            }
        }
        return null;
    }

    async navigate(path, pushState = true) {
        // Don't re-navigate if already on this path (skip for initial load where pushState=false)
        if (pushState && path === window.location.pathname) return;

        const matched = this.matchRoute(path);
        if (!matched) {
            console.error('Route not found:', path);
            return;
        }

        const { route, params } = matched;
        this.currentRoute = route;
        this.params = params;

        if (pushState) {
            window.history.pushState({}, '', path);
        }

        await this.transitionTo(route, params, path);
    }

    // Update <head> meta tags from a page component's meta config.
    // Supports static object or function for dynamic pages (post titles etc.)
    // All values are optional — omitting a key leaves the shell default in place.
    //
    // Supported keys:
    //   title        — <title> + og:title + twitter:title
    //   description  — <meta name="description"> + og + twitter (max 155 chars)
    //   image        — og:image + twitter:image (absolute URL, 1200×630px recommended)
    //   imageAlt     — og:image:alt + twitter:image:alt
    //   url          — og:url + canonical link (defaults to window.location.href)
    //   type         — og:type ('website' | 'article' | 'product') default: 'website'
    //   siteName     — og:site_name
    //   twitterCard  — 'summary_large_image' | 'summary' (default: 'summary_large_image')
    //   twitterSite  — twitter:site handle e.g. '@mysite'
    //   twitterCreator — twitter:creator handle e.g. '@author'
    //   author       — <meta name="author">
    //   robots       — <meta name="robots"> e.g. 'index,follow'
    //   canonical    — explicit canonical URL (overrides url)
    //   article      — { publishedTime, modifiedTime, author, section, tags[] }
    applyMeta(component) {
        if (!component.meta) return;

        const meta = typeof component.meta === 'function'
            ? component.meta.call(component)
            : component.meta;

        if (!meta) return;

        // ── Helpers ───────────────────────────────────────────────────────────
        const setTag = (selector, attr, key, value) => {
            if (value === undefined || value === null || value === '') return;
            let el = document.querySelector(selector);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, key);
                document.head.appendChild(el);
            }
            el.setAttribute('content', String(value));
        };
        const setName     = (name, value)     => setTag(`meta[name="${name}"]`,     'name',     name,     value);
        const setProperty = (prop, value)     => setTag(`meta[property="${prop}"]`, 'property', prop,     value);

        const url         = meta.url || window.location.href;
        const canonical   = meta.canonical || url;
        const type        = meta.type || 'website';
        const twitterCard = meta.twitterCard || 'summary_large_image';

        // ── Standard SEO ──────────────────────────────────────────────────────
        if (meta.title)       document.title = meta.title;
        setName('description',   meta.description);
        setName('author',        meta.author);
        setName('robots',        meta.robots);

        // ── Open Graph (Facebook, LinkedIn, Discord, Slack, WhatsApp) ─────────
        setProperty('og:type',        type);
        setProperty('og:url',         url);
        setProperty('og:title',       meta.title);
        setProperty('og:description', meta.description);
        setProperty('og:image',       meta.image);
        setProperty('og:image:alt',   meta.imageAlt);
        setProperty('og:image:width', meta.imageWidth  || (meta.image ? '1200' : null));
        setProperty('og:image:height',meta.imageHeight || (meta.image ? '630'  : null));
        setProperty('og:site_name',   meta.siteName);
        setProperty('og:locale',      meta.locale || 'en_US');

        // ── Article tags (og:type = 'article') ────────────────────────────────
        if (type === 'article' && meta.article) {
            const a = meta.article;
            setProperty('article:published_time', a.publishedTime);
            setProperty('article:modified_time',  a.modifiedTime);
            setProperty('article:author',         a.author);
            setProperty('article:section',        a.section);
            if (a.tags) a.tags.forEach(tag => {
                const el = document.createElement('meta');
                el.setAttribute('property', 'article:tag');
                el.setAttribute('content', tag);
                // Only add if not already present
                if (!document.querySelector(`meta[property="article:tag"][content="${tag}"]`)) {
                    document.head.appendChild(el);
                }
            });
        }

        // ── Twitter / X Cards ─────────────────────────────────────────────────
        // X does not fall back to OG for card type — must be explicit
        setName('twitter:card',        twitterCard);
        setName('twitter:title',       meta.title);
        setName('twitter:description', meta.description);
        setName('twitter:image',       meta.image);
        setName('twitter:image:alt',   meta.imageAlt);
        setName('twitter:site',        meta.twitterSite);
        setName('twitter:creator',     meta.twitterCreator);

        // ── Canonical link ────────────────────────────────────────────────────
        let canonEl = document.querySelector('link[rel="canonical"]');
        if (!canonEl) {
            canonEl = document.createElement('link');
            canonEl.setAttribute('rel', 'canonical');
            document.head.appendChild(canonEl);
        }
        canonEl.setAttribute('href', canonical);
    }

    buildNavLinks(currentPath) {
        const p = currentPath || window.location.pathname;
        return this.routes
            .filter(r => r.nav)
            .map(r => ({
                href:   r.path,
                label:  r.nav,
                active: (r.path === '/' ? p === '/' : p === r.path || p.startsWith(r.path + '/')) ? 'active' : ''
            }));
    }

    async transitionTo(route, params, currentPath) {
        if (!this.container) return;

        this.container.classList.add('page-transition-exit');
        await new Promise(resolve => setTimeout(resolve, 250));

        const componentPath = route.component.startsWith('/')
            ? route.component
            : '/' + route.component.replace(/^\.\//, '');

        const component = await parseSFC(componentPath);

        // Inject $route, $router, $store without triggering reactive setters
        // currentPath is the actual URL (e.g. /blog/my-post)
        // path is the route pattern (e.g. /blog/:slug)
        Object.defineProperty(component.data, '$route', {
            value: { params, path: route.path, currentPath: currentPath || window.location.pathname }, writable: true, enumerable: true
        });
        Object.defineProperty(component.data, '$router', {
            value: { push: (p) => this.navigate(p), params }, writable: true, enumerable: true
        });
        Object.defineProperty(component.data, '$store', {
            value: this.store, writable: true, enumerable: true
        });

        this.currentComponent = component;
        this.container.innerHTML = '';
        this.container.classList.remove('page-transition-exit');
        this.container.classList.add('page-transition-enter');

        // Write nav links to store so navbar can read them without hardcoding
        this.store.set('$nav', this.buildNavLinks(currentPath));

        await component.render(this.container);

        this.applyMeta(component);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Re-render persistent shell components (navbar etc.) so active class updates
        // Re-parse to get a fresh instance so data() re-runs with new pathname
        for (const c of this.persistentComponents) {
            if (!c.element) continue;
            const fresh = await parseSFC(c._sfcPath);
            fresh.render(c.element);
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.container.classList.remove('page-transition-enter');
                this.container.classList.add('page-transition-enter-active');
                setTimeout(() => {
                    this.container.classList.remove('page-transition-enter-active');
                }, 250);
            });
        });
    }
}

// Load routes from /pages/manifest.json so new pages are picked up
// automatically without touching router.js.
// Falls back to an empty router if the manifest is missing.
async function createRouter() {
    try {
        const res = await fetch('/lib/manifest.json');
        if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
        const routes = await res.json();
        console.log(`[router] loaded ${routes.length} routes from manifest`);
        return new Router(routes);
    } catch (e) {
        console.error('[router] could not load manifest.json:', e.message);
        console.error('[router] make sure serve.js is running and lib/manifest.json exists');
        return new Router([]);
    }
}

// Synchronous singleton — resolved via top-level await in the shell.
// Usage in shell index.html:
//
//   import { createRouter, Store } from './lib/router.js';
//   const router = await createRouter();
//   const app = createApp('#app', router).mount();
//
// Or use the pre-built default router which loads the manifest automatically:
const router = new Router([]); // placeholder — shell should use createRouter()

export { Router, Store, router, createRouter };
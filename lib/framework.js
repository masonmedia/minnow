// class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.watchers = {};
//         this.element = null;
//         this.components = {};
//         this._isMounting = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         this.data = this.createReactiveData(config.data || {});
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.mounted = config.mounted;
//         this.components = config.components || {};

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() {
//                     return value;
//                 },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();

//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(callback => callback(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) {
//             this.watchers[key] = [];
//         }
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         this._rerender();

//         if (this.mounted) {
//             await this.mounted.call(this);
//         }

//         this._isMounting = false;

//         // Single controlled update after mount completes,
//         // to reflect any state changes made during mounted()
//         this._rerender();
//     }

//     _rerender() {
//         if (!this.element) return;

//         // Step 1: stamp raw template HTML into the DOM — mustaches left in place.
//         this.element.innerHTML = this.template;

//         // Step 2: run directives first. processIf hides v-if=false elements
//         // before we try to read any expressions inside them.
//         this.bindEvents(this.element);
//         this.processDirectives(this.element);

//         // Step 3: resolve {{ }} only on nodes that are actually visible.
//         // Hidden v-if blocks are skipped entirely, so post.content is never
//         // evaluated while post is still null.
//         this.resolveMustaches(this.element);
//     }

//     // Collect all v-for loop variable names so resolveMustaches leaves them
//     // alone — processFor has already substituted them in the DOM.
//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     // Walk every text node and attribute in the live DOM, resolving {{ expr }}.
//     // Skips any element that is hidden (display:none) so v-if=false blocks
//     // are never evaluated, and skips v-for host elements (already processed).
//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 // Skip hidden v-if blocks
//                 if (node.style && node.style.display === 'none') return;
//                 // Skip v-for hosts — processFor already expanded them
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 // Resolve mustaches in attributes (e.g. href, src)
//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }

//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     // Retained for any external callers — no longer used internally.
//     processTemplate(template) {
//         return template;
//     }

//     evaluateExpression(expr) {
//         try {
//             const func = new Function(
//                 ...Object.keys(this.data),
//                 ...Object.keys(this.computed),
//                 ...Object.keys(this.methods),
//                 `return ${expr}`
//             );
//             const computedValues = {};
//             Object.keys(this.computed).forEach(key => {
//                 computedValues[key] = this.computed[key].call(this);
//             });
//             return func(
//                 ...Object.values(this.data),
//                 ...Object.values(computedValues),
//                 ...Object.values(this.methods)
//             );
//         } catch (e) {
//             console.error('Error evaluating expression:', expr, e);
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         const elements = container.querySelectorAll('[v-if]');
//         elements.forEach(el => {
//             const condition = el.getAttribute('v-if');
//             const show = this.evaluateExpression(condition);

//             if (!show) {
//                 el.style.display = 'none';
//             } else {
//                 el.style.display = '';
//             }
//         });
//     }

//     processFor(container) {
//         const elements = container.querySelectorAll('[v-for]');
//         elements.forEach(el => {
//             const forExpr = el.getAttribute('v-for');
//             const match = forExpr.match(/(\w+)\s+in\s+(.+)/);

//             if (match) {
//                 const itemName = match[1];
//                 const arrayExpr = match[2];
//                 const array = this.evaluateExpression(arrayExpr);

//                 if (Array.isArray(array)) {
//                     const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//                     const parent = el.parentNode;
//                     const placeholder = document.createComment('v-for');
//                     parent.replaceChild(placeholder, el);

//                     const fragment = document.createDocumentFragment();
//                     array.forEach((item, index) => {
//                         const temp = document.createElement('div');
//                         temp.innerHTML = templateHtml;
//                         const newEl = temp.firstElementChild;
//                         newEl.setAttribute('data-index', index);

//                         // Resolve {{ itemName.prop }} and {{ itemName }} in
//                         // every text node AND every attribute of the cloned element,
//                         // so hrefs like /blog/{{post.id}} are substituted correctly.
//                         this.resolveItemMustaches(newEl, itemName, item);

//                         fragment.appendChild(newEl);
//                     });

//                     placeholder.parentNode.insertBefore(fragment, placeholder);
//                 }
//             }
//         });
//     }

//     // Walk all text nodes and attributes in a cloned v-for item element,
//     // substituting {{ itemName }} and {{ itemName.prop }} with item values.
//     resolveItemMustaches(el, itemName, item) {
//         const replacer = (str) => {
//             // {{ itemName.prop }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(\\w+)\\s*\\}\\}`, 'g'),
//                 (_, prop) => (item[prop] !== undefined ? item[prop] : '')
//             );
//             // {{ itemName }} — the whole item
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = replacer(node.textContent);
//                 }
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = replacer(attr.value);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         const elements = container.querySelectorAll('[\\:class], [v-bind\\:class]');
//         elements.forEach(el => {
//             const classExpr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (classExpr) {
//                 const classObj = this.evaluateExpression(classExpr);
//                 if (typeof classObj === 'object') {
//                     Object.keys(classObj).forEach(className => {
//                         if (classObj[className]) {
//                             el.classList.add(className);
//                         } else {
//                             el.classList.remove(className);
//                         }
//                     });
//                 }
//             }
//         });
//     }

//     processModel(container) {
//         const elements = container.querySelectorAll('[v-model]');
//         elements.forEach(el => {
//             const key = el.getAttribute('v-model');

//             if (this.data.hasOwnProperty(key)) {
//                 el.value = this.data[key];

//                 el.addEventListener('input', (e) => {
//                     this.data[key] = e.target.value;
//                 });
//             }
//         });
//     }

//     bindEvents(container) {
//         const elements = container.querySelectorAll('[\\@click], [v-on\\:click]');
//         elements.forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');

//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/(\w+)\((.*)\)/);
//                 if (match) {
//                     const methodName = match[1];
//                     const args = match[2]
//                         ? match[2].split(',').map(arg => this.evaluateExpression(arg.trim()))
//                         : [];
//                     if (this.methods[methodName]) {
//                         this.methods[methodName](...args);
//                     }
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         // Guard: skip reactive updates triggered during initial mount
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// async function parseSFC(path) {
//     const response = await fetch(path);
//     const content = await response.text();

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     const template = templateMatch ? templateMatch[1].trim() : '';
//     const script = scriptMatch ? scriptMatch[1].trim() : '';
//     const style = styleMatch ? styleMatch[1].trim() : '';

//     return new Component(template, script, style);
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             const container = document.querySelector(selector);
//             router.init(container);
//         }
//     };
// }

// export { Component, parseSFC, createApp };


// v2

// class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.prefetch = null;
//         this.watchers = {};
//         this.element = null;
//         this._isMounting = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         // Support both data: {} and data() { return {} } styles
//         const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
//         this.data = this.createReactiveData(rawData);
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.prefetch = config.prefetch || null;
//         this.mounted = config.mounted || null;

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() {
//                     return value;
//                 },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();

//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(callback => callback(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) {
//             this.watchers[key] = [];
//         }
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         // prefetch() runs before the first render so the template always
//         // has data on first paint — no empty-array flash, no loading states needed
//         if (this.prefetch) {
//             await this.prefetch.call(this);
//         }

//         this._isMounting = false;
//         this._rerender();
//         await this.resolveComponents(this.element);

//         // mounted() runs after render, for any post-paint work
//         if (this.mounted) {
//             await this.mounted.call(this);
//         }
//     }

//     _rerender() {
//         if (!this.element) return;

//         // Step 1: stamp raw template HTML into the DOM — mustaches left in place.
//         this.element.innerHTML = this.template;

//         // Step 2: run directives first. processIf hides v-if=false elements
//         // before we try to read any expressions inside them.
//         this.bindEvents(this.element);
//         this.processDirectives(this.element);

//         // Step 3: resolve {{ }} only on nodes that are actually visible.
//         // Hidden v-if blocks are skipped entirely, so post.content is never
//         // evaluated while post is still null.
//         this.resolveMustaches(this.element);

//         // Step 4: resolve any <x-component> tags async (fire-and-forget on reactive updates)
//         this.resolveComponents(this.element);
//     }

//     // Collect all v-for loop variable names so resolveMustaches leaves them
//     // alone — processFor has already substituted them in the DOM.
//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     // Walk every text node and attribute in the live DOM, resolving {{ expr }}.
//     // Skips any element that is hidden (display:none) so v-if=false blocks
//     // are never evaluated, and skips v-for host elements (already processed).
//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 // Skip hidden v-if blocks
//                 if (node.style && node.style.display === 'none') return;
//                 // Skip v-for hosts — processFor already expanded them
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 // Resolve mustaches in attributes (e.g. href, src)
//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }

//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     // Retained for any external callers — no longer used internally.
//     processTemplate(template) {
//         return template;
//     }

//     evaluateExpression(expr) {
//         try {
//             const func = new Function(
//                 ...Object.keys(this.data),
//                 ...Object.keys(this.computed),
//                 ...Object.keys(this.methods),
//                 `return ${expr}`
//             );
//             const computedValues = {};
//             Object.keys(this.computed).forEach(key => {
//                 computedValues[key] = this.computed[key].call(this);
//             });
//             return func(
//                 ...Object.values(this.data),
//                 ...Object.values(computedValues),
//                 ...Object.values(this.methods)
//             );
//         } catch (e) {
//             console.error('Error evaluating expression:', expr, e);
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         const elements = container.querySelectorAll('[v-if]');
//         elements.forEach(el => {
//             const condition = el.getAttribute('v-if');
//             const show = this.evaluateExpression(condition);

//             if (!show) {
//                 el.style.display = 'none';
//             } else {
//                 el.style.display = '';
//             }
//         });
//     }

//     processFor(container) {
//         const elements = container.querySelectorAll('[v-for]');
//         elements.forEach(el => {
//             const forExpr = el.getAttribute('v-for');
//             const match = forExpr.match(/(\w+)\s+in\s+(.+)/);

//             if (match) {
//                 const itemName = match[1];
//                 const arrayExpr = match[2];
//                 const array = this.evaluateExpression(arrayExpr);

//                 if (Array.isArray(array)) {
//                     const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//                     const parent = el.parentNode;
//                     const placeholder = document.createComment('v-for');
//                     parent.replaceChild(placeholder, el);

//                     const fragment = document.createDocumentFragment();
//                     array.forEach((item, index) => {
//                         const temp = document.createElement('div');
//                         temp.innerHTML = templateHtml;
//                         const newEl = temp.firstElementChild;
//                         newEl.setAttribute('data-index', index);

//                         // Resolve {{ itemName.prop }} and {{ itemName }} in
//                         // every text node AND every attribute of the cloned element,
//                         // so hrefs like /blog/{{post.id}} are substituted correctly.
//                         this.resolveItemMustaches(newEl, itemName, item);

//                         fragment.appendChild(newEl);
//                     });

//                     placeholder.parentNode.insertBefore(fragment, placeholder);
//                 }
//             }
//         });
//     }

//     // Walk all text nodes and attributes in a cloned v-for item element,
//     // substituting {{ itemName }} and {{ itemName.prop.nested }} with item values.
//     resolveItemMustaches(el, itemName, item) {
//         // Walk a dot-path like "reactions.likes" into a nested object
//         const getPath = (obj, path) => {
//             return path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);
//         };

//         const replacer = (str) => {
//             // {{ itemName.any.depth.path }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
//                 (_, path) => {
//                     const val = getPath(item, path);
//                     return val !== undefined && val !== null ? val : '';
//                 }
//             );
//             // {{ itemName }} — the whole item
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = replacer(node.textContent);
//                 }
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = replacer(attr.value);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         const elements = container.querySelectorAll('[\\:class], [v-bind\\:class]');
//         elements.forEach(el => {
//             const classExpr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (classExpr) {
//                 const classObj = this.evaluateExpression(classExpr);
//                 if (typeof classObj === 'object') {
//                     Object.keys(classObj).forEach(className => {
//                         if (classObj[className]) {
//                             el.classList.add(className);
//                         } else {
//                             el.classList.remove(className);
//                         }
//                     });
//                 }
//             }
//         });
//     }

//     processModel(container) {
//         const elements = container.querySelectorAll('[v-model]');
//         elements.forEach(el => {
//             const key = el.getAttribute('v-model');

//             if (this.data.hasOwnProperty(key)) {
//                 el.value = this.data[key];

//                 el.addEventListener('input', (e) => {
//                     this.data[key] = e.target.value;
//                 });
//             }
//         });
//     }

//     bindEvents(container) {
//         const elements = container.querySelectorAll('[\\@click], [v-on\\:click]');
//         elements.forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');

//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/(\w+)\((.*)\)/);
//                 if (match) {
//                     const methodName = match[1];
//                     const args = match[2]
//                         ? match[2].split(',').map(arg => this.evaluateExpression(arg.trim()))
//                         : [];
//                     if (this.methods[methodName]) {
//                         this.methods[methodName](...args);
//                     }
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     // Find all <x-tag> elements and replace them with the rendered component
//     // fetched automatically from /components/tag.html — no registration needed.
//     // Convention: <x-navbar> → /components/navbar.html
//     //             <x-hero>   → /components/hero.html
//     async resolveComponents(container) {
//         if (!container) return;
//         const customs = Array.from(container.querySelectorAll('*'))
//             .filter(el => el.tagName.toLowerCase().startsWith('x-'));
//         if (!customs.length) return;

//         for (const el of customs) {
//             const tagName       = el.tagName.toLowerCase();
//             const componentName = tagName.slice(2); // strip "x-"
//             const componentPath = `/components/${componentName}.html`;

//             try {
//                 const child = await parseSFC(componentPath);

//                 // Pass route/store through to child without triggering reactivity
//                 ['$route', '$router', '$store'].forEach(key => {
//                     if (this.data[key]) {
//                         Object.defineProperty(child.data, key, {
//                             value: this.data[key], writable: true,
//                             enumerable: true, configurable: true
//                         });
//                     }
//                 });

//                 const wrapper = document.createElement('div');
//                 wrapper.setAttribute('data-component', componentName);
//                 el.replaceWith(wrapper);
//                 await child.render(wrapper);
//             } catch (e) {
//                 console.warn(`Could not load component <${tagName}>:`, e);
//             }
//         }
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         // Guard: skip reactive updates triggered during initial mount
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// async function parseSFC(path) {
//     const response = await fetch(path);
//     const content = await response.text();

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     const template = templateMatch ? templateMatch[1].trim() : '';
//     const script = scriptMatch ? scriptMatch[1].trim() : '';
//     const style = styleMatch ? styleMatch[1].trim() : '';

//     return new Component(template, script, style);
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             const container = document.querySelector(selector);
//             router.init(container);
//         }
//     };
// }

// export { Component, parseSFC, createApp };


// v3 this adds state support and fixes counter jank, but breaks the nav component on the index for some reason

// class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.prefetch = null;
//         this.watchers = {};
//         this.element = null;
//         this._isMounting = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         // Support both data: {} and data() { return {} } styles
//         const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
//         this.data = this.createReactiveData(rawData);
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.prefetch = config.prefetch || null;
//         this.mounted = config.mounted || null;

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() {
//                     return value;
//                 },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();

//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(callback => callback(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) {
//             this.watchers[key] = [];
//         }
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         // prefetch() runs before the first render so the template always
//         // has data on first paint — no empty-array flash, no loading states needed
//         if (this.prefetch) {
//             await this.prefetch.call(this);
//         }

//         this._isMounting = false;
//         this._rerender();
//         await this.resolveComponents(this.element);

//         // mounted() runs after render, for any post-paint work
//         if (this.mounted) {
//             await this.mounted.call(this);
//         }
//     }

//     _rerender() {
//         if (!this.element) return;

//         // Step 1: stamp raw template HTML into the DOM — mustaches left in place.
//         this.element.innerHTML = this.template;

//         // Step 2: run directives first. processIf hides v-if=false elements
//         // before we try to read any expressions inside them.
//         this.bindEvents(this.element);
//         this.processDirectives(this.element);

//         // Step 3: resolve {{ }} only on nodes that are actually visible.
//         // Hidden v-if blocks are skipped entirely, so post.content is never
//         // evaluated while post is still null.
//         this.resolveMustaches(this.element);

//     }

//     // Collect all v-for loop variable names so resolveMustaches leaves them
//     // alone — processFor has already substituted them in the DOM.
//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     // Walk every text node and attribute in the live DOM, resolving {{ expr }}.
//     // Skips any element that is hidden (display:none) so v-if=false blocks
//     // are never evaluated, and skips v-for host elements (already processed).
//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 // Skip hidden v-if blocks
//                 if (node.style && node.style.display === 'none') return;
//                 // Skip v-for hosts — processFor already expanded them
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 // Resolve mustaches in attributes (e.g. href, src)
//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }

//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     // Retained for any external callers — no longer used internally.
//     processTemplate(template) {
//         return template;
//     }

//     evaluateExpression(expr) {
//         try {
//             const func = new Function(
//                 ...Object.keys(this.data),
//                 ...Object.keys(this.computed),
//                 ...Object.keys(this.methods),
//                 `return ${expr}`
//             );
//             const computedValues = {};
//             Object.keys(this.computed).forEach(key => {
//                 computedValues[key] = this.computed[key].call(this);
//             });
//             return func(
//                 ...Object.values(this.data),
//                 ...Object.values(computedValues),
//                 ...Object.values(this.methods)
//             );
//         } catch (e) {
//             console.error('Error evaluating expression:', expr, e);
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         const elements = container.querySelectorAll('[v-if]');
//         elements.forEach(el => {
//             const condition = el.getAttribute('v-if');
//             const show = this.evaluateExpression(condition);

//             if (!show) {
//                 el.style.display = 'none';
//             } else {
//                 el.style.display = '';
//             }
//         });
//     }

//     processFor(container) {
//         const elements = container.querySelectorAll('[v-for]');
//         elements.forEach(el => {
//             const forExpr = el.getAttribute('v-for');
//             const match = forExpr.match(/(\w+)\s+in\s+(.+)/);

//             if (match) {
//                 const itemName = match[1];
//                 const arrayExpr = match[2];
//                 const array = this.evaluateExpression(arrayExpr);

//                 if (Array.isArray(array)) {
//                     const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//                     const parent = el.parentNode;
//                     const placeholder = document.createComment('v-for');
//                     parent.replaceChild(placeholder, el);

//                     const fragment = document.createDocumentFragment();
//                     array.forEach((item, index) => {
//                         const temp = document.createElement('div');
//                         temp.innerHTML = templateHtml;
//                         const newEl = temp.firstElementChild;
//                         newEl.setAttribute('data-index', index);

//                         // Resolve {{ itemName.prop }} and {{ itemName }} in
//                         // every text node AND every attribute of the cloned element,
//                         // so hrefs like /blog/{{post.id}} are substituted correctly.
//                         this.resolveItemMustaches(newEl, itemName, item);

//                         fragment.appendChild(newEl);
//                     });

//                     placeholder.parentNode.insertBefore(fragment, placeholder);
//                 }
//             }
//         });
//     }

//     // Walk all text nodes and attributes in a cloned v-for item element,
//     // substituting {{ itemName }} and {{ itemName.prop.nested }} with item values.
//     resolveItemMustaches(el, itemName, item) {
//         // Walk a dot-path like "reactions.likes" into a nested object
//         const getPath = (obj, path) => {
//             return path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);
//         };

//         const replacer = (str) => {
//             // {{ itemName.any.depth.path }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
//                 (_, path) => {
//                     const val = getPath(item, path);
//                     return val !== undefined && val !== null ? val : '';
//                 }
//             );
//             // {{ itemName }} — the whole item
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = replacer(node.textContent);
//                 }
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = replacer(attr.value);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         const elements = container.querySelectorAll('[\\:class], [v-bind\\:class]');
//         elements.forEach(el => {
//             const classExpr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (classExpr) {
//                 const classObj = this.evaluateExpression(classExpr);
//                 if (typeof classObj === 'object') {
//                     Object.keys(classObj).forEach(className => {
//                         if (classObj[className]) {
//                             el.classList.add(className);
//                         } else {
//                             el.classList.remove(className);
//                         }
//                     });
//                 }
//             }
//         });
//     }

//     processModel(container) {
//         const elements = container.querySelectorAll('[v-model]');
//         elements.forEach(el => {
//             const key = el.getAttribute('v-model');

//             if (this.data.hasOwnProperty(key)) {
//                 el.value = this.data[key];

//                 el.addEventListener('input', (e) => {
//                     this.data[key] = e.target.value;
//                 });
//             }
//         });
//     }

//     bindEvents(container) {
//         const elements = container.querySelectorAll('[\\@click], [v-on\\:click]');
//         elements.forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');

//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/(\w+)\((.*)\)/);
//                 if (match) {
//                     const methodName = match[1];
//                     const args = match[2]
//                         ? match[2].split(',').map(arg => this.evaluateExpression(arg.trim()))
//                         : [];
//                     if (this.methods[methodName]) {
//                         this.methods[methodName](...args);
//                     }
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     // Find all <x-tag> elements and replace them with the rendered component
//     // fetched automatically from /components/tag.html — no registration needed.
//     // Convention: <x-navbar> → /components/navbar.html
//     //             <x-hero>   → /components/hero.html
//     async resolveComponents(container) {
//         if (!container) return;
//         const customs = Array.from(container.querySelectorAll('*'))
//             .filter(el => el.tagName.toLowerCase().startsWith('x-'));
//         if (!customs.length) return;

//         for (const el of customs) {
//             const tagName       = el.tagName.toLowerCase();
//             const componentName = tagName.slice(2); // strip "x-"
//             const componentPath = `/components/${componentName}.html`;

//             try {
//                 const child = await parseSFC(componentPath);

//                 // Pass route/store through to child without triggering reactivity
//                 ['$route', '$router', '$store'].forEach(key => {
//                     if (this.data[key]) {
//                         Object.defineProperty(child.data, key, {
//                             value: this.data[key], writable: true,
//                             enumerable: true, configurable: true
//                         });
//                     }
//                 });

//                 const wrapper = document.createElement('div');
//                 wrapper.setAttribute('data-component', componentName);
//                 el.replaceWith(wrapper);
//                 await child.render(wrapper);
//             } catch (e) {
//                 console.warn(`Could not load component <${tagName}>:`, e);
//             }
//         }
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         // Guard: skip reactive updates triggered during initial mount
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// const _sfcCache = {};

// async function parseSFC(path) {
//     // Cache raw SFC text in memory — avoids re-fetching component files
//     // (especially <x-navbar> which would otherwise be fetched on every page render)
//     if (!_sfcCache[path]) {
//         const response = await fetch(path);
//         _sfcCache[path] = await response.text();
//     }
//     const content = _sfcCache[path];

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     const template = templateMatch ? templateMatch[1].trim() : '';
//     const script = scriptMatch ? scriptMatch[1].trim() : '';
//     const style = styleMatch ? styleMatch[1].trim() : '';

//     return new Component(template, script, style);
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             const container = document.querySelector(selector);
//             router.init(container);
//         }
//     };
// }

// export { Component, parseSFC, createApp };


// v4

// class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.prefetch = null;
//         this.watchers = {};
//         this.element = null;
//         this._isMounting = false;
//         this._initialRender = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         // Support both data: {} and data() { return {} } styles
//         const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
//         this.propsDef = config.props || {};

//         // Merge prop defaults into data so props are first-class reactive values.
//         // When resolveComponents runs, it will overwrite these with the actual
//         // passed values. This means in templates: {{title}} not {{$props.title}}
//         Object.entries(this.propsDef).forEach(([key, def]) => {
//             if (!(key in rawData)) {
//                 rawData[key] = def.default !== undefined ? def.default : null;
//             }
//         });

//         this.data = this.createReactiveData(rawData);
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.prefetch = config.prefetch || null;
//         this.mounted = config.mounted || null;

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() { return value; },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();
//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(cb => cb(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) this.watchers[key] = [];
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         // prefetch() runs before first render — data is ready before paint
//         if (this.prefetch) {
//             await this.prefetch.call(this);
//         }

//         this._isMounting = false;
//         this._initialRender = false;
//         this._rerender();

//         // Resolve <x-tag> components once after initial render
//         await this.resolveComponents(this.element);

//         // Mark initial render complete — subsequent _rerender calls will
//         // preserve already-resolved component wrappers instead of wiping them
//         this._initialRender = true;

//         // mounted() runs after render and components are resolved
//         if (this.mounted) {
//             await this.mounted.call(this);
//         }
//     }

//     _rerender() {
//         if (!this.element) return;

//         if (this._initialRender) {
//             // Subsequent renders: preserve already-resolved component wrappers.
//             // Snapshot their current DOM, stamp fresh template, then restore them.
//             const snapshots = {};
//             this.element.querySelectorAll('[data-component]').forEach(el => {
//                 snapshots[el.getAttribute('data-component')] = el.cloneNode(true);
//             });

//             this.element.innerHTML = this.template;

//             // Re-stamp directives and mustaches on fresh template
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);

//             // Put resolved components back — replace <x-tag> placeholders with snapshots
//             this.element.querySelectorAll('*').forEach(el => {
//                 const tag = el.tagName.toLowerCase();
//                 if (tag.startsWith('x-')) {
//                     const name = tag.slice(2);
//                     if (snapshots[name]) el.replaceWith(snapshots[name]);
//                 }
//             });
//         } else {
//             // First render: full stamp, then resolveComponents runs in render()
//             this.element.innerHTML = this.template;
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);
//         }
//     }

//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 if (node.style && node.style.display === 'none') return;
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     processTemplate(template) { return template; }

//     evaluateExpression(expr) {
//         try {
//             // Use a single context object with `with()` so late-injected keys
//             // like $props, $route, $store are always in scope regardless of
//             // when they were added to this.data.
//             const ctx = {};
//             for (const key of Object.keys(this.data)) ctx[key] = this.data[key];
//             for (const key of Object.keys(this.computed)) ctx[key] = this.computed[key].call(this);
//             for (const key of Object.keys(this.methods)) ctx[key] = this.methods[key];

//             const fn = new Function('$ctx', `with($ctx){ return (${expr}); }`);
//             return fn(ctx);
//         } catch (e) {
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         container.querySelectorAll('[v-if]').forEach(el => {
//             const show = this.evaluateExpression(el.getAttribute('v-if'));
//             el.style.display = show ? '' : 'none';
//             el.removeAttribute('v-if');
//         });
//     }

//     processFor(container) {
//         container.querySelectorAll('[v-for]').forEach(el => {
//             const match = el.getAttribute('v-for').match(/(\w+)\s+in\s+(.+)/);
//             if (!match) return;

//             const [, itemName, arrayExpr] = match;
//             const array = this.evaluateExpression(arrayExpr);
//             if (!Array.isArray(array)) return;

//             const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//             const placeholder = document.createComment('v-for');
//             el.parentNode.replaceChild(placeholder, el);

//             const fragment = document.createDocumentFragment();
//             array.forEach((item, index) => {
//                 const temp = document.createElement('div');
//                 temp.innerHTML = templateHtml;
//                 const newEl = temp.firstElementChild;
//                 newEl.setAttribute('data-index', index);
//                 newEl.removeAttribute('v-for');
//                 this.resolveItemMustaches(newEl, itemName, item);
//                 fragment.appendChild(newEl);
//             });

//             placeholder.parentNode.insertBefore(fragment, placeholder);
//         });
//     }

//     resolveItemMustaches(el, itemName, item) {
//         const getPath = (obj, path) =>
//             path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);

//         const replacer = (str) => {
//             // {{ item.nested.path }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
//                 (_, path) => {
//                     const val = getPath(item, path);
//                     return val !== undefined && val !== null ? val : '';
//                 }
//             );
//             // {{ item }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) node.textContent = replacer(node.textContent);
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) attr.value = replacer(attr.value);
//                 }
//                 for (const child of Array.from(node.childNodes)) walk(child);
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         container.querySelectorAll('[\\:class], [v-bind\\:class]').forEach(el => {
//             const expr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (!expr) return;
//             const classObj = this.evaluateExpression(expr);
//             if (typeof classObj === 'object') {
//                 Object.keys(classObj).forEach(cls => {
//                     el.classList.toggle(cls, !!classObj[cls]);
//                 });
//             }
//             el.removeAttribute(':class');
//             el.removeAttribute('v-bind:class');
//         });
//     }

//     processModel(container) {
//         container.querySelectorAll('[v-model]').forEach(el => {
//             const key = el.getAttribute('v-model');
//             if (Object.prototype.hasOwnProperty.call(this.data, key)) {
//                 el.value = this.data[key];
//                 el.removeAttribute('v-model');
//                 el.addEventListener('input', (e) => { this.data[key] = e.target.value; });
//             }
//         });
//     }

//     bindEvents(container) {
//         container.querySelectorAll('[\\@click], [v-on\\:click]').forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');
//             el.removeAttribute('@click');
//             el.removeAttribute('v-on:click');
//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/^(\w+)\((.*)\)$/);
//                 if (match) {
//                     const args = match[2]
//                         ? match[2].split(',').map(a => this.evaluateExpression(a.trim()))
//                         : [];
//                     if (this.methods[match[1]]) this.methods[match[1]](...args);
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     // ── Slot support ──────────────────────────────────────────────────────────
//     // When a component is used with inner content:
//     //   <x-card><p>Hello</p></x-card>
//     // The inner content is captured and injected wherever <slot></slot> appears
//     // in the component's template.
//     resolveSlots(container, slotContent) {
//         if (!slotContent) return;
//         container.querySelectorAll('slot').forEach(slot => {
//             const wrapper = document.createElement('div');
//             wrapper.innerHTML = slotContent;
//             slot.replaceWith(...wrapper.childNodes);
//         });
//     }

//     // ── Component resolution ──────────────────────────────────────────────────
//     // Scans for <x-tag> elements and renders /components/tag.html into them.
//     // Runs once after initial render — NOT on reactive updates.
//     //
//     // Props: HTML attributes on <x-tag> are passed as this.data.$props in the child.
//     //   <x-hero title="Hello" subtitle="World" :active="true"></x-hero>
//     //   → child receives this.data.$props = { title: "Hello", subtitle: "World", active: true }
//     //
//     // Booleans: prefix with : to evaluate as an expression
//     //   :active="true"   → prop is boolean true
//     //   :count="5"       → prop is number 5
//     //   label="Hello"    → prop is string "Hello"
//     //
//     // Slots: inner HTML of <x-tag> is injected into <slot></slot> in the template
//     //   <x-card><p>Some content</p></x-card>
//     async resolveComponents(container) {
//         if (!container) return;
//         const customs = Array.from(container.querySelectorAll('*'))
//             .filter(el => el.tagName.toLowerCase().startsWith('x-'));
//         if (!customs.length) return;

//         for (const el of customs) {
//             const tagName       = el.tagName.toLowerCase();
//             const componentName = tagName.slice(2);
//             const componentPath = `/components/${componentName}.html`;

//             try {
//                 const child = await parseSFC(componentPath);

//                 // ── Pass $route, $router, $store through to child ──
//                 ['$route', '$router', '$store'].forEach(key => {
//                     if (this.data[key]) {
//                         Object.defineProperty(child.data, key, {
//                             value: this.data[key], writable: true,
//                             enumerable: true, configurable: true
//                         });
//                     }
//                 });

//                 // ── Props — read attributes off the custom element ──
//                 // Three ways to pass a prop:
//                 //   title="Hello"      → string (always)
//                 //   :count="posts.length" → evaluated expression
//                 //   :active="true"     → boolean true
//                 //   featured           → bare attribute → Boolean true if prop type is Boolean
//                 // Set each passed attribute directly on child.data so props
//                 // are usable as {{title}}, v-if="cta" etc. — not {{$props.title}}
//                 const propsDef = child.propsDef || {};

//                 for (const attr of Array.from(el.attributes)) {
//                     let propName, propValue;

//                     if (attr.name.startsWith(':')) {
//                         // :propName="expr" — evaluate in parent context
//                         propName = attr.name.slice(1);
//                         try { propValue = this.evaluateExpression(attr.value); }
//                         catch { propValue = attr.value; }
//                     } else {
//                         propName = attr.name;
//                         const def = propsDef[propName];
//                         if (def && def.type === Boolean) {
//                             propValue = attr.value === '' || attr.value === 'true' || attr.value === propName;
//                         } else if (def && def.type === Number) {
//                             propValue = Number(attr.value);
//                         } else {
//                             propValue = attr.value;
//                         }
//                     }

//                     // Write directly into child.data so it's reactive and in scope
//                     if (propName in child.data) {
//                         child.data[propName] = propValue;
//                     } else {
//                         Object.defineProperty(child.data, propName, {
//                             value: propValue, writable: true, enumerable: true, configurable: true
//                         });
//                     }
//                 }

//                 // ── Slot — capture inner HTML before replacing the element ──
//                 const slotContent = el.innerHTML.trim();

//                 const wrapper = document.createElement('div');
//                 wrapper.setAttribute('data-component', componentName);
//                 el.replaceWith(wrapper);
//                 await child.render(wrapper);

//                 // Inject slot content after child renders
//                 if (slotContent) this.resolveSlots(wrapper, slotContent);

//             } catch (e) {
//                 console.warn(`Could not load component <${tagName}>:`, e);
//             }
//         }
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// // ── SFC file cache ────────────────────────────────────────────────────────────
// // Caches raw component file text in memory for the lifetime of the page.
// // Prevents re-fetching navbar.html (and other components) on every navigation.
// const _sfcCache = {};

// async function parseSFC(path) {
//     if (!_sfcCache[path]) {
//         const res = await fetch(path);
//         if (!res.ok) throw new Error(`Could not load ${path}: ${res.status}`);
//         _sfcCache[path] = await res.text();
//     }
//     const content = _sfcCache[path];

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch   = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch    = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     return new Component(
//         templateMatch ? templateMatch[1].trim() : '',
//         scriptMatch   ? scriptMatch[1].trim()   : '',
//         styleMatch    ? styleMatch[1].trim()     : ''
//     );
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             router.init(document.querySelector(selector));
//         }
//     };
// }

// export { Component, parseSFC, createApp };class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.prefetch = null;
//         this.watchers = {};
//         this.element = null;
//         this._isMounting = false;
//         this._initialRender = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         // Support both data: {} and data() { return {} } styles
//         const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
//         this.propsDef = config.props || {};

//         // Merge prop defaults into data so props are first-class reactive values.
//         // When resolveComponents runs, it will overwrite these with the actual
//         // passed values. This means in templates: {{title}} not {{$props.title}}
//         Object.entries(this.propsDef).forEach(([key, def]) => {
//             if (!(key in rawData)) {
//                 rawData[key] = def.default !== undefined ? def.default : null;
//             }
//         });

//         this.data = this.createReactiveData(rawData);
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.prefetch = config.prefetch || null;
//         this.mounted = config.mounted || null;

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() { return value; },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();
//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(cb => cb(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) this.watchers[key] = [];
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         // prefetch() runs before first render — data is ready before paint
//         if (this.prefetch) {
//             await this.prefetch.call(this);
//         }

//         this._isMounting = false;
//         this._initialRender = false;
//         this._rerender();

//         // Resolve <x-tag> components once after initial render
//         await this.resolveComponents(this.element);

//         // Mark initial render complete — subsequent _rerender calls will
//         // preserve already-resolved component wrappers instead of wiping them
//         this._initialRender = true;

//         // mounted() runs after render and components are resolved
//         if (this.mounted) {
//             await this.mounted.call(this);
//         }
//     }

//     _rerender() {
//         if (!this.element) return;

//         if (this._initialRender) {
//             // Subsequent renders: preserve already-resolved component wrappers.
//             // Snapshot their current DOM, stamp fresh template, then restore them.
//             const snapshots = {};
//             this.element.querySelectorAll('[data-component]').forEach(el => {
//                 snapshots[el.getAttribute('data-component')] = el.cloneNode(true);
//             });

//             this.element.innerHTML = this.template;

//             // Re-stamp directives and mustaches on fresh template
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);

//             // Put resolved components back — replace <x-tag> placeholders with snapshots
//             this.element.querySelectorAll('*').forEach(el => {
//                 const tag = el.tagName.toLowerCase();
//                 if (tag.startsWith('x-')) {
//                     const name = tag.slice(2);
//                     if (snapshots[name]) el.replaceWith(snapshots[name]);
//                 }
//             });
//         } else {
//             // First render: full stamp, then resolveComponents runs in render()
//             this.element.innerHTML = this.template;
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);
//         }
//     }

//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 if (node.style && node.style.display === 'none') return;
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     processTemplate(template) { return template; }

//     evaluateExpression(expr) {
//         try {
//             // Use a single context object with `with()` so late-injected keys
//             // like $props, $route, $store are always in scope regardless of
//             // when they were added to this.data.
//             const ctx = {};
//             for (const key of Object.keys(this.data)) ctx[key] = this.data[key];
//             for (const key of Object.keys(this.computed)) ctx[key] = this.computed[key].call(this);
//             for (const key of Object.keys(this.methods)) ctx[key] = this.methods[key];

//             const fn = new Function('$ctx', `with($ctx){ return (${expr}); }`);
//             return fn(ctx);
//         } catch (e) {
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         container.querySelectorAll('[v-if]').forEach(el => {
//             const show = this.evaluateExpression(el.getAttribute('v-if'));
//             el.style.display = show ? '' : 'none';
//             el.removeAttribute('v-if');
//         });
//     }

//     processFor(container) {
//         container.querySelectorAll('[v-for]').forEach(el => {
//             const match = el.getAttribute('v-for').match(/(\w+)\s+in\s+(.+)/);
//             if (!match) return;

//             const [, itemName, arrayExpr] = match;
//             const array = this.evaluateExpression(arrayExpr);
//             if (!Array.isArray(array)) return;

//             const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//             const placeholder = document.createComment('v-for');
//             el.parentNode.replaceChild(placeholder, el);

//             const fragment = document.createDocumentFragment();
//             array.forEach((item, index) => {
//                 const temp = document.createElement('div');
//                 temp.innerHTML = templateHtml;
//                 const newEl = temp.firstElementChild;
//                 newEl.setAttribute('data-index', index);
//                 newEl.removeAttribute('v-for');
//                 this.resolveItemMustaches(newEl, itemName, item);
//                 fragment.appendChild(newEl);
//             });

//             placeholder.parentNode.insertBefore(fragment, placeholder);
//         });
//     }

//     resolveItemMustaches(el, itemName, item) {
//         const getPath = (obj, path) =>
//             path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);

//         const replacer = (str) => {
//             // {{ item.nested.path }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
//                 (_, path) => {
//                     const val = getPath(item, path);
//                     return val !== undefined && val !== null ? val : '';
//                 }
//             );
//             // {{ item }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) node.textContent = replacer(node.textContent);
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) attr.value = replacer(attr.value);
//                 }
//                 for (const child of Array.from(node.childNodes)) walk(child);
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         container.querySelectorAll('[\\:class], [v-bind\\:class]').forEach(el => {
//             const expr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (!expr) return;
//             const classObj = this.evaluateExpression(expr);
//             if (typeof classObj === 'object') {
//                 Object.keys(classObj).forEach(cls => {
//                     el.classList.toggle(cls, !!classObj[cls]);
//                 });
//             }
//             el.removeAttribute(':class');
//             el.removeAttribute('v-bind:class');
//         });
//     }

//     processModel(container) {
//         container.querySelectorAll('[v-model]').forEach(el => {
//             const key = el.getAttribute('v-model');
//             if (Object.prototype.hasOwnProperty.call(this.data, key)) {
//                 el.value = this.data[key];
//                 el.removeAttribute('v-model');
//                 el.addEventListener('input', (e) => { this.data[key] = e.target.value; });
//             }
//         });
//     }

//     bindEvents(container) {
//         container.querySelectorAll('[\\@click], [v-on\\:click]').forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');
//             el.removeAttribute('@click');
//             el.removeAttribute('v-on:click');
//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/^(\w+)\((.*)\)$/);
//                 if (match) {
//                     const args = match[2]
//                         ? match[2].split(',').map(a => this.evaluateExpression(a.trim()))
//                         : [];
//                     if (this.methods[match[1]]) this.methods[match[1]](...args);
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     // ── Slot support ──────────────────────────────────────────────────────────
//     // When a component is used with inner content:
//     //   <x-card><p>Hello</p></x-card>
//     // The inner content is captured and injected wherever <slot></slot> appears
//     // in the component's template.
//     resolveSlots(container, slotContent) {
//         if (!slotContent) return;
//         container.querySelectorAll('slot').forEach(slot => {
//             const wrapper = document.createElement('div');
//             wrapper.innerHTML = slotContent;
//             slot.replaceWith(...wrapper.childNodes);
//         });
//     }

//     // ── Component resolution ──────────────────────────────────────────────────
//     // Scans for <x-tag> elements and renders /components/tag.html into them.
//     // Runs once after initial render — NOT on reactive updates.
//     //
//     // Props: HTML attributes on <x-tag> are passed as this.data.$props in the child.
//     //   <x-hero title="Hello" subtitle="World" :active="true"></x-hero>
//     //   → child receives this.data.$props = { title: "Hello", subtitle: "World", active: true }
//     //
//     // Booleans: prefix with : to evaluate as an expression
//     //   :active="true"   → prop is boolean true
//     //   :count="5"       → prop is number 5
//     //   label="Hello"    → prop is string "Hello"
//     //
//     // Slots: inner HTML of <x-tag> is injected into <slot></slot> in the template
//     //   <x-card><p>Some content</p></x-card>
//     async resolveComponents(container) {
//         if (!container) return;
//         const customs = Array.from(container.querySelectorAll('*'))
//             .filter(el => el.tagName.toLowerCase().startsWith('x-'));
//         if (!customs.length) return;

//         for (const el of customs) {
//             const tagName       = el.tagName.toLowerCase();
//             const componentName = tagName.slice(2);
//             const componentPath = `/components/${componentName}.html`;

//             try {
//                 const child = await parseSFC(componentPath);

//                 // ── Pass $route, $router, $store through to child ──
//                 ['$route', '$router', '$store'].forEach(key => {
//                     if (this.data[key]) {
//                         Object.defineProperty(child.data, key, {
//                             value: this.data[key], writable: true,
//                             enumerable: true, configurable: true
//                         });
//                     }
//                 });

//                 // ── Props — read attributes off the custom element ──
//                 // Three ways to pass a prop:
//                 //   title="Hello"      → string (always)
//                 //   :count="posts.length" → evaluated expression
//                 //   :active="true"     → boolean true
//                 //   featured           → bare attribute → Boolean true if prop type is Boolean
//                 // Set each passed attribute directly on child.data so props
//                 // are usable as {{title}}, v-if="cta" etc. — not {{$props.title}}
//                 const propsDef = child.propsDef || {};

//                 for (const attr of Array.from(el.attributes)) {
//                     let propName, propValue;

//                     if (attr.name.startsWith(':')) {
//                         // :propName="expr" — evaluate in parent context
//                         propName = attr.name.slice(1);
//                         try { propValue = this.evaluateExpression(attr.value); }
//                         catch { propValue = attr.value; }
//                     } else {
//                         propName = attr.name;
//                         const def = propsDef[propName];
//                         if (def && def.type === Boolean) {
//                             propValue = attr.value === '' || attr.value === 'true' || attr.value === propName;
//                         } else if (def && def.type === Number) {
//                             propValue = Number(attr.value);
//                         } else {
//                             propValue = attr.value;
//                         }
//                     }

//                     // Write directly into child.data so it's reactive and in scope
//                     if (propName in child.data) {
//                         child.data[propName] = propValue;
//                     } else {
//                         Object.defineProperty(child.data, propName, {
//                             value: propValue, writable: true, enumerable: true, configurable: true
//                         });
//                     }
//                 }

//                 // ── Slot — capture inner HTML before replacing the element ──
//                 const slotContent = el.innerHTML.trim();

//                 const wrapper = document.createElement('div');
//                 wrapper.setAttribute('data-component', componentName);
//                 el.replaceWith(wrapper);
//                 await child.render(wrapper);

//                 // Inject slot content after child renders, then resolve any
//                 // <x-*> components that came in via the slot — this is what enables
//                 // nested components inside layout slots (Nuxt/Astro style)
//                 if (slotContent) {
//                     this.resolveSlots(wrapper, slotContent);
//                     await this.resolveComponents(wrapper);
//                 }

//             } catch (e) {
//                 console.warn(`Could not load component <${tagName}>:`, e);
//             }
//         }
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// // ── SFC file cache ────────────────────────────────────────────────────────────
// // Caches raw component file text in memory for the lifetime of the page.
// // Prevents re-fetching navbar.html (and other components) on every navigation.
// const _sfcCache = {};

// async function parseSFC(path) {
//     if (!_sfcCache[path]) {
//         const res = await fetch(path);
//         if (!res.ok) throw new Error(`Could not load ${path}: ${res.status}`);
//         _sfcCache[path] = await res.text();
//     }
//     const content = _sfcCache[path];

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch   = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch    = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     return new Component(
//         templateMatch ? templateMatch[1].trim() : '',
//         scriptMatch   ? scriptMatch[1].trim()   : '',
//         styleMatch    ? styleMatch[1].trim()     : ''
//     );
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             router.init(document.querySelector(selector));
//         }
//     };
// }

// export { Component, parseSFC, createApp };


// v5 supports nested components in slots

// class Component {
//     constructor(template, script, style) {
//         this.template = template;
//         this.script = script;
//         this.style = style;
//         this.data = {};
//         this.methods = {};
//         this.computed = {};
//         this.mounted = null;
//         this.prefetch = null;
//         this.watchers = {};
//         this.element = null;
//         this._isMounting = false;
//         this._initialRender = false;

//         if (script) {
//             this.initScript(script);
//         }
//     }

//     initScript(script) {
//         const func = new Function('return ' + script)();
//         const config = typeof func === 'function' ? func() : func;

//         // Support both data: {} and data() { return {} } styles
//         const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
//         this.propsDef = config.props || {};

//         // Merge prop defaults into data so props are first-class reactive values.
//         // When resolveComponents runs, it will overwrite these with the actual
//         // passed values. This means in templates: {{title}} not {{$props.title}}
//         Object.entries(this.propsDef).forEach(([key, def]) => {
//             if (!(key in rawData)) {
//                 rawData[key] = def.default !== undefined ? def.default : null;
//             }
//         });

//         this.data = this.createReactiveData(rawData);
//         this.methods = config.methods || {};
//         this.computed = config.computed || {};
//         this.prefetch = config.prefetch || null;
//         this.mounted = config.mounted || null;

//         const self = this;
//         Object.keys(this.methods).forEach(key => {
//             const originalMethod = this.methods[key];
//             this.methods[key] = function(...args) {
//                 return originalMethod.call(self, ...args);
//             };
//         });
//     }

//     createReactiveData(data) {
//         const self = this;
//         const reactive = {};

//         Object.keys(data).forEach(key => {
//             let value = data[key];

//             Object.defineProperty(reactive, key, {
//                 get() { return value; },
//                 set(newValue) {
//                     if (value !== newValue) {
//                         value = newValue;
//                         self.update();
//                         if (self.watchers[key]) {
//                             self.watchers[key].forEach(cb => cb(newValue));
//                         }
//                     }
//                 },
//                 enumerable: true
//             });
//         });

//         return reactive;
//     }

//     watch(key, callback) {
//         if (!this.watchers[key]) this.watchers[key] = [];
//         this.watchers[key].push(callback);
//     }

//     async render(container) {
//         this.element = container;
//         this._isMounting = true;

//         if (this.style) {
//             this.injectStyle(this.style);
//         }

//         // prefetch() runs before first render — data is ready before paint
//         if (this.prefetch) {
//             await this.prefetch.call(this);
//         }

//         this._isMounting = false;
//         this._initialRender = false;
//         this._rerender();

//         // Resolve <x-tag> components once after initial render
//         await this.resolveComponents(this.element);

//         // Mark initial render complete — subsequent _rerender calls will
//         // preserve already-resolved component wrappers instead of wiping them
//         this._initialRender = true;

//         // mounted() runs after render and components are resolved
//         if (this.mounted) {
//             await this.mounted.call(this);
//         }
//     }

//     _rerender() {
//         if (!this.element) return;

//         if (this._initialRender) {
//             // Subsequent renders: preserve already-resolved component wrappers.
//             // Snapshot their current DOM, stamp fresh template, then restore them.
//             const snapshots = {};
//             this.element.querySelectorAll('[data-component]').forEach(el => {
//                 snapshots[el.getAttribute('data-component')] = el.cloneNode(true);
//             });

//             this.element.innerHTML = this.template;

//             // Re-stamp directives and mustaches on fresh template
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);

//             // Put resolved components back — replace <x-tag> placeholders with snapshots
//             this.element.querySelectorAll('*').forEach(el => {
//                 const tag = el.tagName.toLowerCase();
//                 if (tag.startsWith('x-')) {
//                     const name = tag.slice(2);
//                     if (snapshots[name]) el.replaceWith(snapshots[name]);
//                 }
//             });
//         } else {
//             // First render: full stamp, then resolveComponents runs in render()
//             this.element.innerHTML = this.template;
//             this.bindEvents(this.element);
//             this.processDirectives(this.element);
//             this.resolveMustaches(this.element);
//         }
//     }

//     getForVariables(template) {
//         const forVars = new Set();
//         const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
//         for (const match of matches) {
//             forVars.add(match[1]);
//         }
//         return forVars;
//     }

//     resolveMustaches(container) {
//         const forVars = this.getForVariables(this.template);

//         const walk = (node) => {
//             if (node.nodeType === Node.ELEMENT_NODE) {
//                 if (node.style && node.style.display === 'none') return;
//                 if (node.hasAttribute && node.hasAttribute('v-for')) return;

//                 for (const attr of Array.from(node.attributes || [])) {
//                     if (attr.value.includes('{{')) {
//                         attr.value = this.resolveMustacheString(attr.value, forVars);
//                     }
//                 }
//                 for (const child of Array.from(node.childNodes)) {
//                     walk(child);
//                 }
//             } else if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) {
//                     node.textContent = this.resolveMustacheString(node.textContent, forVars);
//                 }
//             }
//         };

//         walk(container);
//     }

//     resolveMustacheString(str, forVars) {
//         return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
//             const rootIdent = expr.trim().split(/[.([ ]/)[0];
//             if (forVars.has(rootIdent)) return match;
//             return this.evaluateExpression(expr.trim());
//         });
//     }

//     processTemplate(template) { return template; }

//     evaluateExpression(expr) {
//         try {
//             // Use a single context object with `with()` so late-injected keys
//             // like $props, $route, $store are always in scope regardless of
//             // when they were added to this.data.
//             const ctx = {};
//             for (const key of Object.keys(this.data)) ctx[key] = this.data[key];
//             for (const key of Object.keys(this.computed)) ctx[key] = this.computed[key].call(this);
//             for (const key of Object.keys(this.methods)) ctx[key] = this.methods[key];

//             const fn = new Function('$ctx', `with($ctx){ return (${expr}); }`);
//             return fn(ctx);
//         } catch (e) {
//             return '';
//         }
//     }

//     processDirectives(container) {
//         this.processIf(container);
//         this.processFor(container);
//         this.processBind(container);
//         this.processModel(container);
//     }

//     processIf(container) {
//         container.querySelectorAll('[v-if]').forEach(el => {
//             const show = this.evaluateExpression(el.getAttribute('v-if'));
//             el.style.display = show ? '' : 'none';
//             el.removeAttribute('v-if');
//         });
//     }

//     processFor(container) {
//         container.querySelectorAll('[v-for]').forEach(el => {
//             const match = el.getAttribute('v-for').match(/(\w+)\s+in\s+(.+)/);
//             if (!match) return;

//             const [, itemName, arrayExpr] = match;
//             const array = this.evaluateExpression(arrayExpr);
//             if (!Array.isArray(array)) return;

//             const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
//             const placeholder = document.createComment('v-for');
//             el.parentNode.replaceChild(placeholder, el);

//             const fragment = document.createDocumentFragment();
//             array.forEach((item, index) => {
//                 const temp = document.createElement('div');
//                 temp.innerHTML = templateHtml;
//                 const newEl = temp.firstElementChild;
//                 newEl.setAttribute('data-index', index);
//                 newEl.removeAttribute('v-for');
//                 this.resolveItemMustaches(newEl, itemName, item);
//                 fragment.appendChild(newEl);
//             });

//             placeholder.parentNode.insertBefore(fragment, placeholder);
//         });
//     }

//     resolveItemMustaches(el, itemName, item) {
//         const getPath = (obj, path) =>
//             path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);

//         const replacer = (str) => {
//             // {{ item.nested.path }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
//                 (_, path) => {
//                     const val = getPath(item, path);
//                     return val !== undefined && val !== null ? val : '';
//                 }
//             );
//             // {{ item }}
//             str = str.replace(
//                 new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
//                 typeof item === 'object' ? JSON.stringify(item) : item
//             );
//             return str;
//         };

//         const walk = (node) => {
//             if (node.nodeType === Node.TEXT_NODE) {
//                 if (node.textContent.includes('{{')) node.textContent = replacer(node.textContent);
//             } else if (node.nodeType === Node.ELEMENT_NODE) {
//                 for (const attr of Array.from(node.attributes)) {
//                     if (attr.value.includes('{{')) attr.value = replacer(attr.value);
//                 }
//                 for (const child of Array.from(node.childNodes)) walk(child);
//             }
//         };

//         walk(el);
//     }

//     processBind(container) {
//         container.querySelectorAll('[\\:class], [v-bind\\:class]').forEach(el => {
//             const expr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
//             if (!expr) return;
//             const classObj = this.evaluateExpression(expr);
//             if (typeof classObj === 'object') {
//                 Object.keys(classObj).forEach(cls => {
//                     el.classList.toggle(cls, !!classObj[cls]);
//                 });
//             }
//             el.removeAttribute(':class');
//             el.removeAttribute('v-bind:class');
//         });
//     }

//     processModel(container) {
//         container.querySelectorAll('[v-model]').forEach(el => {
//             const key = el.getAttribute('v-model');
//             if (Object.prototype.hasOwnProperty.call(this.data, key)) {
//                 el.value = this.data[key];
//                 el.removeAttribute('v-model');
//                 el.addEventListener('input', (e) => { this.data[key] = e.target.value; });
//             }
//         });
//     }

//     bindEvents(container) {
//         container.querySelectorAll('[\\@click], [v-on\\:click]').forEach(el => {
//             const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');
//             el.removeAttribute('@click');
//             el.removeAttribute('v-on:click');
//             el.addEventListener('click', (e) => {
//                 const match = handler.match(/^(\w+)\((.*)\)$/);
//                 if (match) {
//                     const args = match[2]
//                         ? match[2].split(',').map(a => this.evaluateExpression(a.trim()))
//                         : [];
//                     if (this.methods[match[1]]) this.methods[match[1]](...args);
//                 } else if (this.methods[handler]) {
//                     this.methods[handler](e);
//                 }
//             });
//         });
//     }

//     // ── Slot support ──────────────────────────────────────────────────────────
//     // When a component is used with inner content:
//     //   <x-card><p>Hello</p></x-card>
//     // The inner content is captured and injected wherever <slot></slot> appears
//     // in the component's template.
//     resolveSlots(container, slotContent) {
//         if (!slotContent) return;
//         container.querySelectorAll('slot').forEach(slot => {
//             const wrapper = document.createElement('div');
//             wrapper.innerHTML = slotContent;
//             slot.replaceWith(...wrapper.childNodes);
//         });
//     }

//     // ── Component resolution ──────────────────────────────────────────────────
//     // Scans for <x-tag> elements and renders /components/tag.html into them.
//     // Runs once after initial render — NOT on reactive updates.
//     //
//     // Props: HTML attributes on <x-tag> are passed as this.data.$props in the child.
//     //   <x-hero title="Hello" subtitle="World" :active="true"></x-hero>
//     //   → child receives this.data.$props = { title: "Hello", subtitle: "World", active: true }
//     //
//     // Booleans: prefix with : to evaluate as an expression
//     //   :active="true"   → prop is boolean true
//     //   :count="5"       → prop is number 5
//     //   label="Hello"    → prop is string "Hello"
//     //
//     // Slots: inner HTML of <x-tag> is injected into <slot></slot> in the template
//     //   <x-card><p>Some content</p></x-card>
//     async resolveComponents(container) {
//         if (!container) return;
//         const customs = Array.from(container.querySelectorAll('*'))
//             .filter(el => el.tagName.toLowerCase().startsWith('x-'));
//         if (!customs.length) return;

//         for (const el of customs) {
//             const tagName       = el.tagName.toLowerCase();
//             const componentName = tagName.slice(2);
//             const componentPath = `/components/${componentName}.html`;

//             try {
//                 const child = await parseSFC(componentPath);

//                 // ── Pass $route, $router, $store through to child ──
//                 ['$route', '$router', '$store'].forEach(key => {
//                     if (this.data[key]) {
//                         Object.defineProperty(child.data, key, {
//                             value: this.data[key], writable: true,
//                             enumerable: true, configurable: true
//                         });
//                     }
//                 });

//                 // ── Props — read attributes off the custom element ──
//                 // Three ways to pass a prop:
//                 //   title="Hello"      → string (always)
//                 //   :count="posts.length" → evaluated expression
//                 //   :active="true"     → boolean true
//                 //   featured           → bare attribute → Boolean true if prop type is Boolean
//                 // Set each passed attribute directly on child.data so props
//                 // are usable as {{title}}, v-if="cta" etc. — not {{$props.title}}
//                 const propsDef = child.propsDef || {};

//                 for (const attr of Array.from(el.attributes)) {
//                     let propName, propValue;

//                     if (attr.name.startsWith(':')) {
//                         // :propName="expr" — evaluate in parent context
//                         propName = attr.name.slice(1);
//                         try { propValue = this.evaluateExpression(attr.value); }
//                         catch { propValue = attr.value; }
//                     } else {
//                         propName = attr.name;
//                         const def = propsDef[propName];
//                         if (def && def.type === Boolean) {
//                             propValue = attr.value === '' || attr.value === 'true' || attr.value === propName;
//                         } else if (def && def.type === Number) {
//                             propValue = Number(attr.value);
//                         } else {
//                             propValue = attr.value;
//                         }
//                     }

//                     // Write directly into child.data so it's reactive and in scope
//                     if (propName in child.data) {
//                         child.data[propName] = propValue;
//                     } else {
//                         Object.defineProperty(child.data, propName, {
//                             value: propValue, writable: true, enumerable: true, configurable: true
//                         });
//                     }
//                 }

//                 // ── Slot — capture inner HTML before replacing the element ──
//                 const slotContent = el.innerHTML.trim();

//                 const wrapper = document.createElement('div');
//                 wrapper.setAttribute('data-component', componentName);
//                 el.replaceWith(wrapper);
//                 await child.render(wrapper);

//                 // Inject slot content after child renders, then resolve any
//                 // <x-*> components that came in via the slot — this is what enables
//                 // nested components inside layout slots (Nuxt/Astro style)
//                 if (slotContent) {
//                     this.resolveSlots(wrapper, slotContent);
//                     await this.resolveComponents(wrapper);
//                 }

//             } catch (e) {
//                 console.warn(`Could not load component <${tagName}>:`, e);
//             }
//         }
//     }

//     injectStyle(style) {
//         const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
//         if (!document.getElementById(styleId)) {
//             const styleEl = document.createElement('style');
//             styleEl.id = styleId;
//             styleEl.textContent = style;
//             document.head.appendChild(styleEl);
//         }
//     }

//     update() {
//         if (this._isMounting) return;
//         this._rerender();
//     }
// }

// // ── SFC file cache ────────────────────────────────────────────────────────────
// // Caches raw component file text in memory for the lifetime of the page.
// // Prevents re-fetching navbar.html (and other components) on every navigation.
// const _sfcCache = {};

// async function parseSFC(path) {
//     if (!_sfcCache[path]) {
//         const res = await fetch(path);
//         if (!res.ok) throw new Error(`Could not load ${path}: ${res.status}`);
//         _sfcCache[path] = await res.text();
//     }
//     const content = _sfcCache[path];

//     const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
//     const scriptMatch   = content.match(/<script>([\s\S]*?)<\/script>/);
//     const styleMatch    = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

//     return new Component(
//         templateMatch ? templateMatch[1].trim() : '',
//         scriptMatch   ? scriptMatch[1].trim()   : '',
//         styleMatch    ? styleMatch[1].trim()     : ''
//     );
// }

// function createApp(selector, router) {
//     return {
//         router,
//         mount() {
//             router.init(document.querySelector(selector));
//         }
//     };
// }

// export { Component, parseSFC, createApp };



// v6 add SEO support

class Component {
    constructor(template, script, style) {
        this.template = template;
        this.script = script;
        this.style = style;
        this.data = {};
        this.methods = {};
        this.computed = {};
        this.mounted = null;
        this.prefetch = null;
        this.watchers = {};
        this.element = null;
        this._isMounting = false;
        this._initialRender = false;

        if (script) {
            this.initScript(script);
        }
    }

    initScript(script) {
        const func = new Function('return ' + script)();
        const config = typeof func === 'function' ? func() : func;

        // Support both data: {} and data() { return {} } styles
        const rawData = typeof config.data === 'function' ? config.data() : (config.data || {});
        this.propsDef = config.props || {};

        // Merge prop defaults into data so props are first-class reactive values.
        // When resolveComponents runs, it will overwrite these with the actual
        // passed values. This means in templates: {{title}} not {{$props.title}}
        Object.entries(this.propsDef).forEach(([key, def]) => {
            if (!(key in rawData)) {
                rawData[key] = def.default !== undefined ? def.default : null;
            }
        });

        this.data = this.createReactiveData(rawData);
        this.methods = config.methods || {};
        this.computed = config.computed || {};
        this.prefetch = config.prefetch || null;
        this.mounted  = config.mounted  || null;
        this.meta     = config.meta     || null;

        const self = this;
        Object.keys(this.methods).forEach(key => {
            const originalMethod = this.methods[key];
            this.methods[key] = function(...args) {
                return originalMethod.call(self, ...args);
            };
        });
    }

    createReactiveData(data) {
        const self = this;
        const reactive = {};

        Object.keys(data).forEach(key => {
            let value = data[key];

            Object.defineProperty(reactive, key, {
                get() { return value; },
                set(newValue) {
                    if (value !== newValue) {
                        value = newValue;
                        self.update();
                        if (self.watchers[key]) {
                            self.watchers[key].forEach(cb => cb(newValue));
                        }
                    }
                },
                enumerable: true
            });
        });

        return reactive;
    }

    watch(key, callback) {
        if (!this.watchers[key]) this.watchers[key] = [];
        this.watchers[key].push(callback);
    }

    async render(container) {
        this.element = container;
        this._isMounting = true;

        if (this.style) {
            this.injectStyle(this.style);
        }

        // prefetch() runs before first render — data is ready before paint
        if (this.prefetch) {
            await this.prefetch.call(this);
        }

        this._isMounting = false;
        this._initialRender = false;
        this._rerender();

        // Resolve <x-tag> components once after initial render
        await this.resolveComponents(this.element);

        // Mark initial render complete — subsequent _rerender calls will
        // preserve already-resolved component wrappers instead of wiping them
        this._initialRender = true;

        // mounted() runs after render and components are resolved
        if (this.mounted) {
            await this.mounted.call(this);
        }
    }

    _rerender() {
        if (!this.element) return;

        if (this._initialRender) {
            // Subsequent renders: preserve already-resolved component wrappers.
            // Snapshot their current DOM, stamp fresh template, then restore them.
            const snapshots = {};
            this.element.querySelectorAll('[data-component]').forEach(el => {
                snapshots[el.getAttribute('data-component')] = el.cloneNode(true);
            });

            this.element.innerHTML = this.template;

            // Re-stamp directives and mustaches on fresh template
            this.bindEvents(this.element);
            this.processDirectives(this.element);
            this.resolveMustaches(this.element);

            // Put resolved components back — replace <x-tag> placeholders with snapshots
            this.element.querySelectorAll('*').forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag.startsWith('x-')) {
                    const name = tag.slice(2);
                    if (snapshots[name]) el.replaceWith(snapshots[name]);
                }
            });
        } else {
            // First render: full stamp, then resolveComponents runs in render()
            this.element.innerHTML = this.template;
            this.bindEvents(this.element);
            this.processDirectives(this.element);
            this.resolveMustaches(this.element);
        }
    }

    getForVariables(template) {
        const forVars = new Set();
        const matches = template.matchAll(/v-for="(\w+)\s+in\s+/g);
        for (const match of matches) {
            forVars.add(match[1]);
        }
        return forVars;
    }

    resolveMustaches(container) {
        const forVars = this.getForVariables(this.template);

        const walk = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.style && node.style.display === 'none') return;
                if (node.hasAttribute && node.hasAttribute('v-for')) return;

                for (const attr of Array.from(node.attributes || [])) {
                    if (attr.value.includes('{{')) {
                        attr.value = this.resolveMustacheString(attr.value, forVars);
                    }
                }
                for (const child of Array.from(node.childNodes)) {
                    walk(child);
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.includes('{{')) {
                    node.textContent = this.resolveMustacheString(node.textContent, forVars);
                }
            }
        };

        walk(container);
    }

    resolveMustacheString(str, forVars) {
        return str.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
            const rootIdent = expr.trim().split(/[.([ ]/)[0];
            if (forVars.has(rootIdent)) return match;
            return this.evaluateExpression(expr.trim());
        });
    }

    processTemplate(template) { return template; }

    evaluateExpression(expr) {
        try {
            // Use a single context object with `with()` so late-injected keys
            // like $props, $route, $store are always in scope regardless of
            // when they were added to this.data.
            const ctx = {};
            for (const key of Object.keys(this.data)) ctx[key] = this.data[key];
            for (const key of Object.keys(this.computed)) ctx[key] = this.computed[key].call(this);
            for (const key of Object.keys(this.methods)) ctx[key] = this.methods[key].bind(this);

            const fn = new Function('$ctx', `with($ctx){ return (${expr}); }`);
            return fn(ctx);
        } catch (e) {
            return '';
        }
    }

    processDirectives(container) {
        this.processIf(container);
        this.processFor(container);
        this.processBind(container);
        this.processModel(container);
    }

    processIf(container) {
        container.querySelectorAll('[v-if]').forEach(el => {
            const show = this.evaluateExpression(el.getAttribute('v-if'));
            el.style.display = show ? '' : 'none';
            el.removeAttribute('v-if');
        });
    }

    processFor(container) {
        container.querySelectorAll('[v-for]').forEach(el => {
            const match = el.getAttribute('v-for').match(/(\w+)\s+in\s+(.+)/);
            if (!match) return;

            const [, itemName, arrayExpr] = match;
            const array = this.evaluateExpression(arrayExpr);
            if (!Array.isArray(array)) return;

            const templateHtml = el.outerHTML.replace(/v-for="[^"]*"/, '');
            const placeholder = document.createComment('v-for');
            el.parentNode.replaceChild(placeholder, el);

            const fragment = document.createDocumentFragment();
            array.forEach((item, index) => {
                const temp = document.createElement('div');
                temp.innerHTML = templateHtml;
                const newEl = temp.firstElementChild;
                newEl.setAttribute('data-index', index);
                newEl.removeAttribute('v-for');
                this.resolveItemMustaches(newEl, itemName, item);
                fragment.appendChild(newEl);
            });

            placeholder.parentNode.insertBefore(fragment, placeholder);
        });
    }

    resolveItemMustaches(el, itemName, item) {
        const getPath = (obj, path) =>
            path.split('.').reduce((o, k) => (o != null ? o[k] : ''), obj);

        const replacer = (str) => {
            // {{ item.nested.path }}
            str = str.replace(
                new RegExp(`\\{\\{\\s*${itemName}\\.(([\\w]+\\.?)+)\\s*\\}\\}`, 'g'),
                (_, path) => {
                    const val = getPath(item, path);
                    return val !== undefined && val !== null ? val : '';
                }
            );
            // {{ item }}
            str = str.replace(
                new RegExp(`\\{\\{\\s*${itemName}\\s*\\}\\}`, 'g'),
                typeof item === 'object' ? JSON.stringify(item) : item
            );
            return str;
        };

        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.includes('{{')) node.textContent = replacer(node.textContent);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (const attr of Array.from(node.attributes)) {
                    if (attr.value.includes('{{')) attr.value = replacer(attr.value);
                }
                for (const child of Array.from(node.childNodes)) walk(child);
            }
        };

        walk(el);
    }

    processBind(container) {
        container.querySelectorAll('[\\:class], [v-bind\\:class]').forEach(el => {
            const expr = el.getAttribute(':class') || el.getAttribute('v-bind:class');
            if (!expr) return;
            const classObj = this.evaluateExpression(expr);
            if (typeof classObj === 'object') {
                Object.keys(classObj).forEach(cls => {
                    el.classList.toggle(cls, !!classObj[cls]);
                });
            }
            el.removeAttribute(':class');
            el.removeAttribute('v-bind:class');
        });
    }

    processModel(container) {
        container.querySelectorAll('[v-model]').forEach(el => {
            const key = el.getAttribute('v-model');
            if (Object.prototype.hasOwnProperty.call(this.data, key)) {
                el.value = this.data[key];
                el.removeAttribute('v-model');
                el.addEventListener('input', (e) => { this.data[key] = e.target.value; });
            }
        });
    }

    bindEvents(container) {
        container.querySelectorAll('[\\@click], [v-on\\:click]').forEach(el => {
            const handler = el.getAttribute('@click') || el.getAttribute('v-on:click');
            el.removeAttribute('@click');
            el.removeAttribute('v-on:click');
            el.addEventListener('click', (e) => {
                const match = handler.match(/^(\w+)\((.*)\)$/);
                if (match) {
                    const args = match[2]
                        ? match[2].split(',').map(a => this.evaluateExpression(a.trim()))
                        : [];
                    if (this.methods[match[1]]) this.methods[match[1]](...args);
                } else if (this.methods[handler]) {
                    this.methods[handler](e);
                }
            });
        });
    }

    // ── Slot support ──────────────────────────────────────────────────────────
    // When a component is used with inner content:
    //   <x-card><p>Hello</p></x-card>
    // The inner content is captured and injected wherever <slot></slot> appears
    // in the component's template.
    resolveSlots(container, slotContent) {
        if (!slotContent) return;
        container.querySelectorAll('slot').forEach(slot => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = slotContent;
            slot.replaceWith(...wrapper.childNodes);
        });
    }

    // ── Component resolution ──────────────────────────────────────────────────
    // Scans for <x-tag> elements and renders /components/tag.html into them.
    // Runs once after initial render — NOT on reactive updates.
    //
    // Props: HTML attributes on <x-tag> are passed as this.data.$props in the child.
    //   <x-hero title="Hello" subtitle="World" :active="true"></x-hero>
    //   → child receives this.data.$props = { title: "Hello", subtitle: "World", active: true }
    //
    // Booleans: prefix with : to evaluate as an expression
    //   :active="true"   → prop is boolean true
    //   :count="5"       → prop is number 5
    //   label="Hello"    → prop is string "Hello"
    //
    // Slots: inner HTML of <x-tag> is injected into <slot></slot> in the template
    //   <x-card><p>Some content</p></x-card>
    async resolveComponents(container) {
        if (!container) return;
        const customs = Array.from(container.querySelectorAll('*'))
            .filter(el => el.tagName.toLowerCase().startsWith('x-'));
        if (!customs.length) return;

        for (const el of customs) {
            const tagName       = el.tagName.toLowerCase();
            const componentName = tagName.slice(2);
            const componentPath = `/components/${componentName}.html`;

            try {
                const child = await parseSFC(componentPath);

                // ── Pass $route, $router, $store through to child ──
                ['$route', '$router', '$store'].forEach(key => {
                    if (this.data[key]) {
                        Object.defineProperty(child.data, key, {
                            value: this.data[key], writable: true,
                            enumerable: true, configurable: true
                        });
                    }
                });

                // ── Props — read attributes off the custom element ──
                // Three ways to pass a prop:
                //   title="Hello"      → string (always)
                //   :count="posts.length" → evaluated expression
                //   :active="true"     → boolean true
                //   featured           → bare attribute → Boolean true if prop type is Boolean
                // Set each passed attribute directly on child.data so props
                // are usable as {{title}}, v-if="cta" etc. — not {{$props.title}}
                const propsDef = child.propsDef || {};

                for (const attr of Array.from(el.attributes)) {
                    let propName, propValue;

                    if (attr.name.startsWith(':')) {
                        // :propName="expr" — evaluate in parent context
                        propName = attr.name.slice(1);
                        try { propValue = this.evaluateExpression(attr.value); }
                        catch { propValue = attr.value; }
                    } else {
                        propName = attr.name;
                        const def = propsDef[propName];
                        if (def && def.type === Boolean) {
                            propValue = attr.value === '' || attr.value === 'true' || attr.value === propName;
                        } else if (def && def.type === Number) {
                            propValue = Number(attr.value);
                        } else {
                            propValue = attr.value;
                        }
                    }

                    // Write directly into child.data so it's reactive and in scope
                    if (propName in child.data) {
                        child.data[propName] = propValue;
                    } else {
                        Object.defineProperty(child.data, propName, {
                            value: propValue, writable: true, enumerable: true, configurable: true
                        });
                    }
                }

                // ── Slot — capture inner HTML before replacing the element ──
                const slotContent = el.innerHTML.trim();

                const wrapper = document.createElement('div');
                wrapper.setAttribute('data-component', componentName);
                el.replaceWith(wrapper);
                await child.render(wrapper);

                // Inject slot content after child renders, then resolve any
                // <x-*> components that came in via the slot — this is what enables
                // nested components inside layout slots (Nuxt/Astro style)
                if (slotContent) {
                    this.resolveSlots(wrapper, slotContent);
                    await this.resolveComponents(wrapper);
                }

            } catch (e) {
                console.warn(`Could not load component <${tagName}>:`, e);
            }
        }
    }

    injectStyle(style) {
        const styleId = 'component-style-' + Math.random().toString(36).substr(2, 9);
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = style;
            document.head.appendChild(styleEl);
        }
    }

    update() {
        if (this._isMounting) return;
        this._rerender();
    }
}

// ── SFC file cache ────────────────────────────────────────────────────────────
// Caches raw component file text in memory for the lifetime of the page.
// Prevents re-fetching navbar.html (and other components) on every navigation.
const _sfcCache = {};

async function parseSFC(path) {
    if (!_sfcCache[path]) {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Could not load ${path}: ${res.status}`);
        _sfcCache[path] = await res.text();
    }
    const content = _sfcCache[path];

    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch   = content.match(/<script>([\s\S]*?)<\/script>/);
    const styleMatch    = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

    return new Component(
        templateMatch ? templateMatch[1].trim() : '',
        scriptMatch   ? scriptMatch[1].trim()   : '',
        styleMatch    ? styleMatch[1].trim()     : ''
    );
}

function createApp(selector, router) {
    return {
        router,
        mount() {
            router.init(document.querySelector(selector));
        }
    };
}

export { Component, parseSFC, createApp };

(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/HomeScreen.svelte generated by Svelte v3.44.3 */

    const { Object: Object_1$1 } = globals;
    const file$Y = "src/HomeScreen.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (35:3) {#each Object.keys(boards[yearKey][monthKey]) as dayKey}
    function create_each_block_2(ctx) {
    	let button;
    	let t0_value = /*monthKey*/ ctx[10] + "";
    	let t0;
    	let t1;
    	let t2_value = /*dayKey*/ ctx[13] + "";
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			add_location(button, file$Y, 35, 4, 1187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*pickButtonDate*/ ctx[2](/*yearKey*/ ctx[7], /*monthKey*/ ctx[10], /*dayKey*/ ctx[13]))) /*pickButtonDate*/ ctx[2](/*yearKey*/ ctx[7], /*monthKey*/ ctx[10], /*dayKey*/ ctx[13]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*boards*/ 1 && t0_value !== (t0_value = /*monthKey*/ ctx[10] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*boards*/ 1 && t2_value !== (t2_value = /*dayKey*/ ctx[13] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(35:3) {#each Object.keys(boards[yearKey][monthKey]) as dayKey}",
    		ctx
    	});

    	return block;
    }

    // (33:2) {#each Object.keys(boards[yearKey]) as monthKey}
    function create_each_block_1$1(ctx) {
    	let br;
    	let t;
    	let each_1_anchor;
    	let each_value_2 = Object.keys(/*boards*/ ctx[0][/*yearKey*/ ctx[7]][/*monthKey*/ ctx[10]]);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			br = element("br");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(br, file$Y, 33, 3, 1116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pickButtonDate, Object, boards*/ 5) {
    				each_value_2 = Object.keys(/*boards*/ ctx[0][/*yearKey*/ ctx[7]][/*monthKey*/ ctx[10]]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(33:2) {#each Object.keys(boards[yearKey]) as monthKey}",
    		ctx
    	});

    	return block;
    }

    // (31:1) {#each Object.keys(boards) as yearKey}
    function create_each_block$2(ctx) {
    	let h3;
    	let t0_value = /*yearKey*/ ctx[7] + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = Object.keys(/*boards*/ ctx[0][/*yearKey*/ ctx[7]]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h3, file$Y, 31, 2, 1043);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*boards*/ 1 && t0_value !== (t0_value = /*yearKey*/ ctx[7] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*Object, boards, pickButtonDate*/ 5) {
    				each_value_1 = Object.keys(/*boards*/ ctx[0][/*yearKey*/ ctx[7]]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(31:1) {#each Object.keys(boards) as yearKey}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$Z(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let input;
    	let t2;
    	let h2;
    	let t4;
    	let mounted;
    	let dispose;
    	let each_value = Object.keys(/*boards*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Select a Date";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			h2 = element("h2");
    			h2.textContent = "Or Select Day from below list of found boards";
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h1, file$Y, 26, 2, 817);
    			attr_dev(input, "type", "date");
    			attr_dev(input, "id", "start");
    			attr_dev(input, "name", "date-pick");
    			attr_dev(input, "min", "2022/01/01");
    			attr_dev(input, "max", "2025/12/31");
    			add_location(input, file$Y, 27, 2, 842);
    			add_location(h2, file$Y, 29, 1, 946);
    			attr_dev(div, "class", "center svelte-17f3t0z");
    			add_location(div, file$Y, 25, 0, 794);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(div, t2);
    			append_dev(div, h2);
    			append_dev(div, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*pickDate*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Object, boards, pickButtonDate*/ 5) {
    				each_value = Object.keys(/*boards*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$Z.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$Z($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('HomeScreen', slots, []);
    	let { weekday } = $$props;
    	let { month } = $$props;
    	let { day } = $$props;
    	let { year } = $$props;
    	let { boards } = $$props;

    	let pickDate = e => {
    		const date = new Date(e.target.value.replace('-', '/')); // dumb hack because date formatted like 2022-01-02 will be set as 2022-01-01 UTC sucks
    		$$invalidate(3, weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]);

    		$$invalidate(4, month = [
    			"January",
    			"February",
    			"March",
    			"April",
    			"May",
    			"June",
    			"July",
    			"August",
    			"September",
    			"October",
    			"November",
    			"December"
    		][date.getMonth()]);

    		$$invalidate(5, day = date.getDate());
    		$$invalidate(6, year = date.getFullYear());
    	};

    	let pickButtonDate = (yearIn, monthIn, dayIn) => {
    		let board = boards[yearIn][monthIn][dayIn];
    		$$invalidate(6, year = board.year);
    		$$invalidate(4, month = board.month);
    		$$invalidate(5, day = board.day);
    		$$invalidate(3, weekday = board.weekday);
    	};

    	const writable_props = ['weekday', 'month', 'day', 'year', 'boards'];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HomeScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('weekday' in $$props) $$invalidate(3, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(4, month = $$props.month);
    		if ('day' in $$props) $$invalidate(5, day = $$props.day);
    		if ('year' in $$props) $$invalidate(6, year = $$props.year);
    		if ('boards' in $$props) $$invalidate(0, boards = $$props.boards);
    	};

    	$$self.$capture_state = () => ({
    		weekday,
    		month,
    		day,
    		year,
    		boards,
    		pickDate,
    		pickButtonDate
    	});

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(3, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(4, month = $$props.month);
    		if ('day' in $$props) $$invalidate(5, day = $$props.day);
    		if ('year' in $$props) $$invalidate(6, year = $$props.year);
    		if ('boards' in $$props) $$invalidate(0, boards = $$props.boards);
    		if ('pickDate' in $$props) $$invalidate(1, pickDate = $$props.pickDate);
    		if ('pickButtonDate' in $$props) $$invalidate(2, pickButtonDate = $$props.pickButtonDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [boards, pickDate, pickButtonDate, weekday, month, day, year];
    }

    class HomeScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$Z, create_fragment$Z, safe_not_equal, {
    			weekday: 3,
    			month: 4,
    			day: 5,
    			year: 6,
    			boards: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HomeScreen",
    			options,
    			id: create_fragment$Z.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*weekday*/ ctx[3] === undefined && !('weekday' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'weekday'");
    		}

    		if (/*month*/ ctx[4] === undefined && !('month' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'month'");
    		}

    		if (/*day*/ ctx[5] === undefined && !('day' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'day'");
    		}

    		if (/*year*/ ctx[6] === undefined && !('year' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'year'");
    		}

    		if (/*boards*/ ctx[0] === undefined && !('boards' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'boards'");
    		}
    	}

    	get weekday() {
    		throw new Error("<HomeScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weekday(value) {
    		throw new Error("<HomeScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get month() {
    		throw new Error("<HomeScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set month(value) {
    		throw new Error("<HomeScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get day() {
    		throw new Error("<HomeScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set day(value) {
    		throw new Error("<HomeScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get year() {
    		throw new Error("<HomeScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set year(value) {
    		throw new Error("<HomeScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get boards() {
    		throw new Error("<HomeScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set boards(value) {
    		throw new Error("<HomeScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/shapes/B/B1.svelte generated by Svelte v3.44.3 */

    const file$X = "src/shapes/B/B1.svelte";

    function create_fragment$Y(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$X, 5, 20, 509);
    			attr_dev(g0, "transform", "matrix(6.16264e-17,1.00643,-1,6.12323e-17,1888.82,-208.311)");
    			add_location(g0, file$X, 4, 16, 413);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$X, 8, 20, 877);
    			attr_dev(g1, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1642.54,-21.1068)");
    			add_location(g1, file$X, 7, 16, 774);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$X, 11, 20, 1131);
    			attr_dev(g2, "transform", "matrix(1,0,0,0.787396,1389.68,50.33)");
    			add_location(g2, file$X, 10, 16, 1058);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$X, 14, 20, 1408);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1818.35,32.4863)");
    			add_location(g3, file$X, 13, 16, 1312);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$X, 17, 20, 1687);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1342.91,-96.1897)");
    			add_location(g4, file$X, 16, 16, 1589);
    			add_location(g5, file$X, 3, 12, 393);
    			add_location(g6, file$X, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1513.08,-205.322)");
    			add_location(g7, file$X, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$X, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$Y.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$Y($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$Y, create_fragment$Y, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B1",
    			options,
    			id: create_fragment$Y.name
    		});
    	}
    }

    /* src/shapes/B/B2.svelte generated by Svelte v3.44.3 */

    const file$W = "src/shapes/B/B2.svelte";

    function create_fragment$X(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$W, 5, 20, 229);
    			attr_dev(g0, "transform", "matrix(1.00643,0,0,1,1130.68,233.588)");
    			add_location(g0, file$W, 4, 16, 155);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$W, 8, 20, 591);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1373.89,154.866)");
    			add_location(g1, file$W, 7, 16, 494);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$W, 11, 20, 860);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1675.65,328.858)");
    			add_location(g2, file$W, 10, 16, 758);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$W, 14, 20, 1143);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1726.46,279.625)");
    			add_location(g3, file$W, 13, 16, 1041);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$W, 17, 20, 1399);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,1370.68,298.688)");
    			add_location(g4, file$W, 16, 16, 1324);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$W, 20, 20, 1661);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,1318.34,476.319)");
    			add_location(g5, file$W, 19, 16, 1580);
    			add_location(g6, file$W, 3, 12, 135);
    			add_location(g7, file$W, 2, 8, 119);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1544.31,-455.159)");
    			add_location(g8, file$W, 1, 4, 61);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			add_location(svg, file$W, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$X.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$X($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$X, create_fragment$X, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B2",
    			options,
    			id: create_fragment$X.name
    		});
    	}
    }

    /* src/shapes/B/B3.svelte generated by Svelte v3.44.3 */

    const file$V = "src/shapes/B/B3.svelte";

    function create_fragment$W(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$V, 5, 18, 498);
    			attr_dev(g0, "transform", "matrix(6.16264e-17,-1.00643,1,6.12323e-17,1295.78,1285.69)");
    			add_location(g0, file$V, 4, 14, 405);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$V, 8, 18, 854);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1345.96,465.952)");
    			add_location(g1, file$V, 7, 14, 759);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$V, 11, 18, 1110);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,1929.95,593.966)");
    			add_location(g2, file$V, 10, 14, 1017);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$V, 14, 18, 1366);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1338.65,691.031)");
    			add_location(g3, file$V, 13, 14, 1287);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$V, 17, 18, 1622);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1389.89,739.624)");
    			add_location(g4, file$V, 16, 14, 1543);
    			add_location(g5, file$V, 3, 10, 387);
    			add_location(g6, file$V, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1517.35,-767.893)");
    			add_location(g7, file$V, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$V, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$W.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$W($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$W, create_fragment$W, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B3",
    			options,
    			id: create_fragment$W.name
    		});
    	}
    }

    /* src/shapes/B/B4.svelte generated by Svelte v3.44.3 */

    const file$U = "src/shapes/B/B4.svelte";

    function create_fragment$V(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$U, 5, 18, 500);
    			attr_dev(g0, "transform", "matrix(-1.00643,-1.23253e-16,1.22465e-16,-1,2057.81,1431.25)");
    			add_location(g0, file$U, 4, 14, 405);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$U, 8, 18, 856);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1369.61,804.696)");
    			add_location(g1, file$U, 7, 14, 761);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$U, 11, 18, 1113);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1419.7,753.416)");
    			add_location(g2, file$U, 10, 14, 1019);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$U, 14, 18, 1370);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1801.09,932.379)");
    			add_location(g3, file$U, 13, 14, 1276);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$U, 17, 18, 1619);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,1365.62,797.536)");
    			add_location(g4, file$U, 16, 14, 1547);
    			add_location(g5, file$U, 3, 10, 387);
    			add_location(g6, file$U, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1540.01,-1055.51)");
    			add_location(g7, file$U, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$U, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$V.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$V($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$V, create_fragment$V, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B4",
    			options,
    			id: create_fragment$V.name
    		});
    	}
    }

    /* src/shapes/B/B5.svelte generated by Svelte v3.44.3 */

    const file$T = "src/shapes/B/B5.svelte";

    function create_fragment$U(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$T, 4, 14, 476);
    			attr_dev(g0, "transform", "matrix(-6.16264e-17,1.00643,1,6.12323e-17,1300.32,973.308)");
    			add_location(g0, file$T, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$T, 7, 14, 824);
    			attr_dev(g1, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1546.6,1160.51)");
    			add_location(g1, file$T, 6, 10, 729);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$T, 10, 14, 1083);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,0.787396,4.82141e-17,1370.79,1214.11)");
    			add_location(g2, file$T, 9, 10, 993);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$T, 13, 14, 1342);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1351.7,1086.52)");
    			add_location(g3, file$T, 12, 10, 1252);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$T, 16, 14, 1572);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1396.18,1307.12)");
    			add_location(g4, file$T, 15, 10, 1497);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$T, 19, 14, 1816);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,1345.07,1357.23)");
    			add_location(g5, file$T, 18, 10, 1741);
    			add_location(g6, file$T, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1521.89,-1386.94)");
    			add_location(g7, file$T, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$T, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$U.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$U($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$U, create_fragment$U, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B5",
    			options,
    			id: create_fragment$U.name
    		});
    	}
    }

    /* src/shapes/B/B6.svelte generated by Svelte v3.44.3 */

    const file$S = "src/shapes/B/B6.svelte";

    function create_fragment$T(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$S, 4, 14, 457);
    			attr_dev(g0, "transform", "matrix(-1,0,0,0.787396,1908.44,2133.86)");
    			add_location(g0, file$S, 3, 10, 387);
    			attr_dev(path1, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path1, "fill", "rgb(100,113,255)");
    			set_style(path1, "stroke", "rgb(0,2,88)");
    			set_style(path1, "stroke-width", "4.15px");
    			add_location(path1, file$S, 7, 14, 717);
    			attr_dev(g1, "transform", "matrix(1.00643,-1.23253e-16,-1.22465e-16,-1,1131.33,2612.87)");
    			add_location(g1, file$S, 6, 10, 626);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$S, 10, 14, 1057);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,0.787396,4.82141e-17,1388.04,2114)");
    			add_location(g2, file$S, 9, 10, 970);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$S, 13, 14, 1317);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1372.67,1934.83)");
    			add_location(g3, file$S, 12, 10, 1226);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$S, 16, 14, 1547);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1317.64,2160.66)");
    			add_location(g4, file$S, 15, 10, 1472);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$S, 19, 14, 1785);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1370.12,2132.48)");
    			add_location(g5, file$S, 18, 10, 1716);
    			add_location(g6, file$S, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1544.96,-2237.13)");
    			add_location(g7, file$S, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$S, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$T.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$T($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$T, create_fragment$T, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B6",
    			options,
    			id: create_fragment$T.name
    		});
    	}
    }

    /* src/shapes/B/B7.svelte generated by Svelte v3.44.3 */

    const file$R = "src/shapes/B/B7.svelte";

    function create_fragment$S(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$R, 4, 14, 457);
    			attr_dev(g0, "transform", "matrix(-1,0,0,0.787396,1931.17,1795.72)");
    			add_location(g0, file$R, 3, 10, 387);
    			attr_dev(path1, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path1, "fill", "rgb(100,113,255)");
    			set_style(path1, "stroke", "rgb(0,2,88)");
    			set_style(path1, "stroke-width", "4.15px");
    			add_location(path1, file$R, 7, 14, 717);
    			attr_dev(g1, "transform", "matrix(-6.16264e-17,-1.00643,-1,6.12323e-17,1893.36,2467.31)");
    			add_location(g1, file$R, 6, 10, 626);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$R, 10, 14, 1059);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,1.27952,7.83479e-17,1259.19,1775.58)");
    			add_location(g2, file$R, 9, 10, 970);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$R, 13, 14, 1318);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1398.6,1648.79)");
    			add_location(g3, file$R, 12, 10, 1228);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$R, 16, 14, 1563);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1346.87,1699.1)");
    			add_location(g4, file$R, 15, 10, 1473);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$R, 19, 14, 1787);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1391.15,1792.72)");
    			add_location(g5, file$R, 18, 10, 1718);
    			add_location(g6, file$R, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1517.62,-1949.51)");
    			add_location(g7, file$R, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$R, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$S.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$S($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$S, create_fragment$S, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B7",
    			options,
    			id: create_fragment$S.name
    		});
    	}
    }

    /* src/shapes/B/B8.svelte generated by Svelte v3.44.3 */

    const file$Q = "src/shapes/B/B8.svelte";

    function create_fragment$R(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$Q, 4, 14, 456);
    			attr_dev(g0, "transform", "matrix(-1.00643,0,0,1,2058.46,1415.21)");
    			add_location(g0, file$Q, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$Q, 7, 14, 805);
    			attr_dev(g1, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1513.49,1510.48)");
    			add_location(g1, file$Q, 6, 10, 709);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$Q, 10, 14, 1070);
    			attr_dev(g2, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1462.68,1461.24)");
    			add_location(g2, file$Q, 9, 10, 974);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$Q, 13, 14, 1308);
    			attr_dev(g3, "transform", "matrix(-1,0,0,1.27952,1904.37,1378.52)");
    			add_location(g3, file$Q, 12, 10, 1239);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$Q, 16, 14, 1568);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1369.99,1335.34)");
    			add_location(g4, file$Q, 15, 10, 1477);
    			add_location(g5, file$Q, 2, 6, 373);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-1540.66,-1636.78)");
    			add_location(g6, file$Q, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$Q, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$R.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$R($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('B8', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<B8> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class B8 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$R, create_fragment$R, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B8",
    			options,
    			id: create_fragment$R.name
    		});
    	}
    }

    /* src/shapes/i/i1.svelte generated by Svelte v3.44.3 */

    const file$P = "src/shapes/i/i1.svelte";

    function create_fragment$Q(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$P, 4, 16, 478);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,1,1,6.12323e-17,262.699,1836.27)");
    			add_location(g0, file$P, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$P, 7, 16, 829);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,332.828,1929.07)");
    			add_location(g1, file$P, 6, 12, 736);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$P, 10, 16, 1081);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,282.868,2028.23)");
    			add_location(g2, file$P, 9, 12, 988);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$P, 13, 16, 1332);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,713.899,2106.61)");
    			add_location(g3, file$P, 12, 12, 1240);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$P, 16, 16, 1575);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,279.396,1969.51)");
    			add_location(g4, file$P, 15, 12, 1505);
    			add_location(g5, file$P, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-453.731,-2230.55)");
    			add_location(g6, file$P, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$P, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$Q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$Q($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$Q, create_fragment$Q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I1",
    			options,
    			id: create_fragment$Q.name
    		});
    	}
    }

    /* src/shapes/i/i2.svelte generated by Svelte v3.44.3 */

    const file$O = "src/shapes/i/i2.svelte";

    function create_fragment$P(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$O, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(1,-1.22465e-16,-1.22465e-16,-1,35.4575,2249.69)");
    			add_location(g0, file$O, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$O, 7, 16, 831);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,258.868,1652.04)");
    			add_location(g1, file$O, 6, 12, 738);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$O, 10, 16, 1082);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,685.341,1731.48)");
    			add_location(g2, file$O, 9, 12, 990);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$O, 13, 16, 1353);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,658.971,1777.26)");
    			add_location(g3, file$O, 12, 12, 1255);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$O, 16, 16, 1597);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,304.637,1797.12)");
    			add_location(g4, file$O, 15, 12, 1526);
    			add_location(g5, file$O, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-429.729,-1954.47)");
    			add_location(g6, file$O, 1, 4, 319);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$O, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$P.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$P($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$P, create_fragment$P, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I2",
    			options,
    			id: create_fragment$P.name
    		});
    	}
    }

    /* src/shapes/i/i3.svelte generated by Svelte v3.44.3 */

    const file$N = "src/shapes/i/i3.svelte";

    function create_fragment$O(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$N, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,-1,-1,6.12323e-17,745.247,2191.99)");
    			add_location(g0, file$N, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$N, 7, 16, 830);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,281.027,1342.6)");
    			add_location(g1, file$N, 6, 12, 738);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$N, 10, 16, 1065);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,272.93,1568.36)");
    			add_location(g2, file$N, 9, 12, 989);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$N, 13, 16, 1336);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,578.975,1516.93)");
    			add_location(g3, file$N, 12, 12, 1238);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$N, 16, 16, 1604);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,632.188,1417)");
    			add_location(g4, file$N, 15, 12, 1509);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$N, 19, 16, 1848);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,225.785,1529.51)");
    			add_location(g5, file$N, 18, 12, 1777);
    			add_location(g6, file$N, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-450.027,-1643.55)");
    			add_location(g7, file$N, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$N, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$O.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$O($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$O, create_fragment$O, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I3",
    			options,
    			id: create_fragment$O.name
    		});
    	}
    }

    /* src/shapes/i/i4.svelte generated by Svelte v3.44.3 */

    const file$M = "src/shapes/i/i4.svelte";

    function create_fragment$N(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$M, 4, 16, 458);
    			attr_dev(g0, "transform", "matrix(-1,0,0,1,974.464,1176.44)");
    			add_location(g0, file$M, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$M, 7, 16, 809);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,254.842,1065.61)");
    			add_location(g1, file$M, 6, 12, 716);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$M, 10, 16, 1059);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,838.346,1194.94)");
    			add_location(g2, file$M, 9, 12, 968);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$M, 13, 16, 1309);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,299.532,1339.69)");
    			add_location(g3, file$M, 12, 12, 1232);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$M, 16, 16, 1559);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,200.113,1290.23)");
    			add_location(g4, file$M, 15, 12, 1482);
    			add_location(g5, file$M, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-426.025,-1367.47)");
    			add_location(g6, file$M, 1, 4, 319);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$M, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$N.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$N($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$N, create_fragment$N, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I4",
    			options,
    			id: create_fragment$N.name
    		});
    	}
    }

    /* src/shapes/i/i5.svelte generated by Svelte v3.44.3 */

    const file$L = "src/shapes/i/i5.svelte";

    function create_fragment$M(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$L, 4, 16, 478);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,1,-1,6.12323e-17,736.902,657.481)");
    			add_location(g0, file$L, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$L, 7, 16, 828);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,270.068,750.27)");
    			add_location(g1, file$L, 6, 12, 736);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$L, 10, 16, 1079);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,692.141,928.658)");
    			add_location(g2, file$L, 9, 12, 987);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$L, 13, 16, 1329);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,265.072,1074.86)");
    			add_location(g3, file$L, 12, 12, 1252);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$L, 16, 16, 1573);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,217.863,893.815)");
    			add_location(g4, file$L, 15, 12, 1502);
    			add_location(g5, file$L, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-441.683,-1051.75)");
    			add_location(g6, file$L, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$L, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$M.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$M($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$M, create_fragment$M, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I5",
    			options,
    			id: create_fragment$M.name
    		});
    	}
    }

    /* src/shapes/i/i6.svelte generated by Svelte v3.44.3 */

    const file$K = "src/shapes/i/i6.svelte";

    function create_fragment$L(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$K, 4, 16, 456);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,25.1379,-2.35133)");
    			add_location(g0, file$K, 3, 12, 391);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$K, 7, 16, 808);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,248.088,-63.2958)");
    			add_location(g1, file$K, 6, 12, 714);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$K, 10, 16, 1058);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,831.733,16.5953)");
    			add_location(g2, file$K, 9, 12, 967);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$K, 13, 16, 1302);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,296.266,34.9165)");
    			add_location(g3, file$K, 12, 12, 1231);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$K, 16, 16, 1568);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,348.335,-113.04)");
    			add_location(g4, file$K, 15, 12, 1475);
    			add_location(g5, file$K, 2, 8, 375);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-419.41,-188.68)");
    			add_location(g6, file$K, 1, 4, 319);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$K, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$L.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$L($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$L, create_fragment$L, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I6",
    			options,
    			id: create_fragment$L.name
    		});
    	}
    }

    /* src/shapes/i/i7.svelte generated by Svelte v3.44.3 */

    const file$J = "src/shapes/i/i7.svelte";

    function create_fragment$K(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$J, 4, 16, 477);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,254.355,1013.2)");
    			add_location(g0, file$J, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$J, 7, 16, 828);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,274.817,163.472)");
    			add_location(g1, file$J, 6, 12, 735);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$J, 10, 16, 1084);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,623.891,338.77)");
    			add_location(g2, file$J, 9, 12, 987);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$J, 13, 16, 1354);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,576.31,236.503)");
    			add_location(g3, file$J, 12, 12, 1257);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$J, 16, 16, 1597);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,273.218,206.576)");
    			add_location(g4, file$J, 15, 12, 1527);
    			add_location(g5, file$J, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-445.387,-464.759)");
    			add_location(g6, file$J, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$J, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$K.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$K($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$K, create_fragment$K, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I7",
    			options,
    			id: create_fragment$K.name
    		});
    	}
    }

    /* src/shapes/i/i8.svelte generated by Svelte v3.44.3 */

    const file$I = "src/shapes/i/i8.svelte";

    function create_fragment$J(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M546.335,243.136L546.335,193.115L496.335,193.115L496.335,243.136L396.355,243.136L396.355,293.136L546.355,293.136L546.355,243.136L546.335,243.136Z");
    			set_style(path0, "fill", "rgb(7,207,203)");
    			set_style(path0, "stroke", "rgb(0,111,109)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$I, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(-1,-1.22465e-16,1.22465e-16,-1,964.144,1070.89)");
    			add_location(g0, file$I, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$I, 7, 16, 830);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,244.269,473.99)");
    			add_location(g1, file$I, 6, 12, 738);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$I, 10, 16, 1081);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,721.638,553.214)");
    			add_location(g2, file$I, 9, 12, 989);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$I, 13, 16, 1331);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,289.678,699.134)");
    			add_location(g3, file$I, 12, 12, 1254);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$I, 16, 16, 1581);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,189.214,748.147)");
    			add_location(g4, file$I, 15, 12, 1504);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$I, 19, 16, 1852);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,544.606,599.518)");
    			add_location(g5, file$I, 18, 12, 1754);
    			add_location(g6, file$I, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-415.706,-775.674)");
    			add_location(g7, file$I, 1, 4, 319);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$I, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$J.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$J($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('I8', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<I8> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class I8 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$J, create_fragment$J, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I8",
    			options,
    			id: create_fragment$J.name
    		});
    	}
    }

    /* src/shapes/J/J1.svelte generated by Svelte v3.44.3 */

    const file$H = "src/shapes/J/J1.svelte";

    function create_fragment$I(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g5;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g5 = svg_element("g");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$H, 4, 16, 491);
    			attr_dev(g0, "transform", "matrix(1.00704,1.23326e-16,1.22444e-16,-0.999829,-91.8271,574.41)");
    			add_location(g0, file$H, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$H, 8, 20, 863);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,50.7361,-151.611)");
    			add_location(g1, file$H, 7, 16, 765);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$H, 11, 20, 1130);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-0.179612,-2.41589)");
    			add_location(g2, file$H, 10, 16, 1030);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$H, 14, 20, 1366);
    			attr_dev(g3, "transform", "matrix(1,0,0,1.67322,0,-184.423)");
    			add_location(g3, file$H, 13, 16, 1297);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$H, 17, 20, 1643);
    			attr_dev(g4, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,429.793,78.5489)");
    			add_location(g4, file$H, 16, 16, 1547);
    			add_location(g5, file$H, 6, 12, 745);
    			add_location(g6, file$H, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-171.788,-150.158)");
    			add_location(g7, file$H, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$H, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g5);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$I.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$I($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$I, create_fragment$I, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J1",
    			options,
    			id: create_fragment$I.name
    		});
    	}
    }

    /* src/shapes/J/J2.svelte generated by Svelte v3.44.3 */

    const file$G = "src/shapes/J/J2.svelte";

    function create_fragment$H(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$G, 4, 16, 492);
    			attr_dev(g0, "transform", "matrix(1.8499e-16,-1.00704,-0.999829,-1.83666e-16,536.355,857.338)");
    			add_location(g0, file$G, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$G, 7, 16, 840);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-59.5294,188.194)");
    			add_location(g1, file$G, 6, 12, 746);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$G, 10, 16, 1089);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,522.474,266.13)");
    			add_location(g2, file$G, 9, 12, 999);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$G, 13, 16, 1360);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,395.564,311.662)");
    			add_location(g3, file$G, 12, 12, 1262);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$G, 16, 16, 1604);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,38.1458,335.406)");
    			add_location(g4, file$G, 15, 12, 1533);
    			add_location(g5, file$G, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-112.103,-489.556)");
    			add_location(g6, file$G, 1, 4, 319);
    			attr_dev(svg, "width", "400px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$G, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$H.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$H($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$H, create_fragment$H, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J2",
    			options,
    			id: create_fragment$H.name
    		});
    	}
    }

    /* src/shapes/J/J3.svelte generated by Svelte v3.44.3 */

    const file$F = "src/shapes/J/J3.svelte";

    function create_fragment$G(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$F, 4, 16, 491);
    			attr_dev(g0, "transform", "matrix(-1.00704,-2.46653e-16,-2.44888e-16,0.999829,530.402,505.01)");
    			add_location(g0, file$F, 3, 12, 392);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$F, 7, 16, 839);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-8.20801,423.234)");
    			add_location(g1, file$F, 6, 12, 745);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$F, 10, 16, 1091);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,343,498.31)");
    			add_location(g2, file$F, 9, 12, 998);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$F, 13, 16, 1362);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,293.914,648.095)");
    			add_location(g3, file$F, 12, 12, 1264);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$F, 16, 16, 1606);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,-61.8005,517.327)");
    			add_location(g4, file$F, 15, 12, 1535);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$F, 19, 16, 1857);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,-13.1562,647.031)");
    			add_location(g5, file$F, 18, 12, 1779);
    			add_location(g6, file$F, 2, 8, 376);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-162.62,-725.095)");
    			add_location(g7, file$F, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$F, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$G.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$G($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$G, create_fragment$G, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J3",
    			options,
    			id: create_fragment$G.name
    		});
    	}
    }

    /* src/shapes/J/J4.svelte generated by Svelte v3.44.3 */

    const file$E = "src/shapes/J/J4.svelte";

    function create_fragment$F(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$E, 4, 16, 492);
    			attr_dev(g0, "transform", "matrix(-1.20274e-15,1.00704,0.999829,1.19414e-15,-100.428,814.201)");
    			add_location(g0, file$E, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$E, 7, 16, 840);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-51.0408,777.207)");
    			add_location(g1, file$E, 6, 12, 746);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$E, 10, 16, 1090);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.67322,1.02455e-16,651.741,904.347)");
    			add_location(g2, file$E, 9, 12, 999);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$E, 13, 16, 1340);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,41.3477,1050.36)");
    			add_location(g3, file$E, 12, 12, 1263);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$E, 16, 16, 1591);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,-106.806,1002.26)");
    			add_location(g4, file$E, 15, 12, 1513);
    			add_location(g5, file$E, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-119.658,-1077.82)");
    			add_location(g6, file$E, 1, 4, 319);
    			attr_dev(svg, "width", "400px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$E, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$F.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$F($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$F, create_fragment$F, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J4",
    			options,
    			id: create_fragment$F.name
    		});
    	}
    }

    /* src/shapes/J/J5.svelte generated by Svelte v3.44.3 */

    const file$D = "src/shapes/J/J5.svelte";

    function create_fragment$E(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$D, 4, 16, 493);
    			attr_dev(g0, "transform", "matrix(-1.00704,1.23326e-16,-1.22444e-16,-0.999829,539.687,1746.63)");
    			add_location(g0, file$D, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$D, 7, 16, 840);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1.35592,1021.82)");
    			add_location(g1, file$D, 6, 12, 747);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$D, 10, 16, 1090);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,421.16,1249.82)");
    			add_location(g2, file$D, 9, 12, 999);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$D, 13, 16, 1341);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,-6.24885,1396.38)");
    			add_location(g3, file$D, 12, 12, 1263);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$D, 16, 16, 1585);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,-53.2772,1069.88)");
    			add_location(g4, file$D, 15, 12, 1514);
    			add_location(g5, file$D, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-171.905,-1322.38)");
    			add_location(g6, file$D, 1, 4, 319);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$D, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$E.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$E($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$E, create_fragment$E, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J5",
    			options,
    			id: create_fragment$E.name
    		});
    	}
    }

    /* src/shapes/J/J6.svelte generated by Svelte v3.44.3 */

    const file$C = "src/shapes/J/J6.svelte";

    function create_fragment$D(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$C, 4, 16, 491);
    			attr_dev(g0, "transform", "matrix(6.16632e-17,1.00704,-0.999829,6.12219e-17,547.146,1391.01)");
    			add_location(g0, file$C, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$C, 7, 16, 839);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-47.5228,1403.11)");
    			add_location(g1, file$C, 6, 12, 745);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$C, 10, 16, 1091);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,101.019,1353.61)");
    			add_location(g2, file$C, 9, 12, 998);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$C, 13, 16, 1341);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-1.67322,1.02455e-16,659.746,1482.33)");
    			add_location(g3, file$C, 12, 12, 1250);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$C, 16, 16, 1585);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,48.2774,1508.38)");
    			add_location(g4, file$C, 15, 12, 1514);
    			add_location(g5, file$C, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-122.894,-1654.62)");
    			add_location(g6, file$C, 1, 4, 319);
    			attr_dev(svg, "width", "400px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$C, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$D.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$D($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$D, create_fragment$D, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J6",
    			options,
    			id: create_fragment$D.name
    		});
    	}
    }

    /* src/shapes/J/J7.svelte generated by Svelte v3.44.3 */

    const file$B = "src/shapes/J/J7.svelte";

    function create_fragment$C(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$B, 4, 16, 213);
    			attr_dev(g0, "transform", "matrix(1.00704,0,0,0.999829,-98.0876,1704.55)");
    			add_location(g0, file$B, 3, 12, 135);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$B, 7, 16, 561);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-5.73951,1624.31)");
    			add_location(g1, file$B, 6, 12, 467);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$B, 10, 16, 791);
    			attr_dev(g2, "transform", "matrix(1,0,0,1.67322,-7.72729,1590.01)");
    			add_location(g2, file$B, 9, 12, 720);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$B, 13, 16, 1061);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,345.34,1847.21)");
    			add_location(g3, file$B, 12, 12, 964);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$B, 16, 16, 1332);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,294.837,1698.46)");
    			add_location(g4, file$B, 15, 12, 1234);
    			add_location(g5, file$B, 2, 8, 119);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-165.527,-1924.63)");
    			add_location(g6, file$B, 1, 4, 61);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			add_location(svg, file$B, 0, 1, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$C.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$C($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$C, create_fragment$C, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J7",
    			options,
    			id: create_fragment$C.name
    		});
    	}
    }

    /* src/shapes/J/J8.svelte generated by Svelte v3.44.3 */

    const file$A = "src/shapes/J/J8.svelte";

    function create_fragment$B(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M313.842,222.241L313.842,222.207L263.842,222.207L263.842,272.207L313.143,272.207L313.143,422.241L363.143,422.241L363.143,222.241L313.842,222.241Z");
    			set_style(path0, "fill", "rgb(255,0,0)");
    			set_style(path0, "stroke", "rgb(116,0,0)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$A, 4, 16, 492);
    			attr_dev(g0, "transform", "matrix(6.16632e-17,-1.00704,0.999829,6.12219e-17,-85.8944,2644.91)");
    			add_location(g0, file$A, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$A, 7, 16, 840);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-36.5352,1975.45)");
    			add_location(g1, file$A, 6, 12, 746);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$A, 10, 16, 1089);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,596.44,2054.71)");
    			add_location(g2, file$A, 9, 12, 999);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$A, 13, 16, 1340);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,-94.2983,2251.26)");
    			add_location(g3, file$A, 12, 12, 1262);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$A, 16, 16, 1590);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,55.1041,2199.43)");
    			add_location(g4, file$A, 15, 12, 1513);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$A, 19, 16, 1860);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,262.56,2099.61)");
    			add_location(g5, file$A, 18, 12, 1763);
    			add_location(g6, file$A, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-134.191,-2277.13)");
    			add_location(g7, file$A, 1, 4, 319);
    			attr_dev(svg, "width", "400px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$A, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$B.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$B($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('J8', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<J8> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class J8 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$B, create_fragment$B, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J8",
    			options,
    			id: create_fragment$B.name
    		});
    	}
    }

    /* src/shapes/L/L1.svelte generated by Svelte v3.44.3 */

    const file$z = "src/shapes/L/L1.svelte";

    function create_fragment$A(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M2550,172L2400,172L2400,222L2500,222L2500,322L2550,322L2550,172Z");
    			set_style(path0, "fill", "rgb(255,0,198)");
    			set_style(path0, "stroke", "rgb(146,0,112)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$z, 4, 16, 450);
    			attr_dev(g0, "transform", "matrix(1,0,0,-1,-50,494)");
    			add_location(g0, file$z, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$z, 7, 16, 717);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,2757.8,47.3015)");
    			add_location(g1, file$z, 6, 12, 627);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$z, 10, 16, 984);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2276.01,-132.533)");
    			add_location(g2, file$z, 9, 12, 890);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$z, 13, 16, 1237);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2176.08,-32.4485)");
    			add_location(g3, file$z, 12, 12, 1143);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$z, 16, 16, 1464);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,2225,-90.8738)");
    			add_location(g4, file$z, 15, 12, 1396);
    			add_location(g5, file$z, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2347.92,-169.917)");
    			add_location(g6, file$z, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$z, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$A.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$A($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('L1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<L1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class L1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$A, create_fragment$A, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L1",
    			options,
    			id: create_fragment$A.name
    		});
    	}
    }

    /* src/shapes/L/L2.svelte generated by Svelte v3.44.3 */

    const file$y = "src/shapes/L/L2.svelte";

    function create_fragment$z(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M2550,172L2400,172L2400,222L2500,222L2500,322L2550,322L2550,172Z");
    			set_style(path0, "fill", "rgb(255,0,198)");
    			set_style(path0, "stroke", "rgb(146,0,112)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$y, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,-1,-6.12323e-17,2666.22,3006.24)");
    			add_location(g0, file$y, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$y, 7, 16, 749);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2592.32,231.096)");
    			add_location(g1, file$y, 6, 12, 657);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$y, 10, 16, 1020);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2572.26,327.695)");
    			add_location(g2, file$y, 9, 12, 922);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$y, 13, 16, 1286);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2170.52,152.986)");
    			add_location(g3, file$y, 12, 12, 1193);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$y, 16, 16, 1515);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,2218.23,193.697)");
    			add_location(g4, file$y, 15, 12, 1445);
    			add_location(g5, file$y, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2342.14,-454.157)");
    			add_location(g6, file$y, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$y, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$z.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$z($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('L2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<L2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class L2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$z, create_fragment$z, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L2",
    			options,
    			id: create_fragment$z.name
    		});
    	}
    }

    /* src/shapes/L/L3.svelte generated by Svelte v3.44.3 */

    const file$x = "src/shapes/L/L3.svelte";

    function create_fragment$y(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M2550,172L2400,172L2400,222L2500,222L2500,322L2550,322L2550,172Z");
    			set_style(path0, "fill", "rgb(255,0,198)");
    			set_style(path0, "stroke", "rgb(146,0,112)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$x, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(-1,-1.22465e-16,-1.22465e-16,1,4899.24,592.451)");
    			add_location(g0, file$x, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$x, 7, 16, 748);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2658.05,540.02)");
    			add_location(g1, file$x, 6, 12, 657);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$x, 10, 16, 998);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,2219.78,684.924)");
    			add_location(g2, file$x, 9, 12, 921);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$x, 13, 16, 1269);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2475.91,635.262)");
    			add_location(g3, file$x, 12, 12, 1171);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$x, 16, 16, 1513);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,2123.16,655.684)");
    			add_location(g4, file$x, 15, 12, 1442);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$x, 19, 16, 1778);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2175.26,460.93)");
    			add_location(g5, file$x, 18, 12, 1686);
    			add_location(g6, file$x, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2347.16,-762.367)");
    			add_location(g7, file$x, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$x, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$y.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$y($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('L3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<L3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class L3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$y, create_fragment$y, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L3",
    			options,
    			id: create_fragment$y.name
    		});
    	}
    }

    /* src/shapes/L/L4.svelte generated by Svelte v3.44.3 */

    const file$w = "src/shapes/L/L4.svelte";

    function create_fragment$x(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M2550,172L2400,172L2400,222L2500,222L2500,322L2550,322L2550,172Z");
    			set_style(path0, "fill", "rgb(255,0,198)");
    			set_style(path0, "stroke", "rgb(146,0,112)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$w, 4, 16, 478);
    			attr_dev(g0, "transform", "matrix(-1.83697e-16,1,1,1.83697e-16,2183.18,-1356.21)");
    			add_location(g0, file$w, 3, 12, 392);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$w, 7, 16, 746);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,2760.55,919.371)");
    			add_location(g1, file$w, 6, 12, 655);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$w, 10, 16, 996);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,2226.09,1064.47)");
    			add_location(g2, file$w, 9, 12, 919);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$w, 13, 16, 1239);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,2129.1,886.215)");
    			add_location(g3, file$w, 12, 12, 1169);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$w, 16, 16, 1505);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2181.08,739.935)");
    			add_location(g4, file$w, 15, 12, 1412);
    			add_location(g5, file$w, 2, 8, 376);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2353.09,-1041.7)");
    			add_location(g6, file$w, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$w, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$x.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$x($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('L4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<L4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class L4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$x, create_fragment$x, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L4",
    			options,
    			id: create_fragment$x.name
    		});
    	}
    }

    /* src/shapes/line/line1.svelte generated by Svelte v3.44.3 */

    const file$v = "src/shapes/line/line1.svelte";

    function create_fragment$w(ctx) {
    	let svg;
    	let g5;
    	let g0;
    	let rect;
    	let g4;
    	let g1;
    	let path0;
    	let g2;
    	let path1;
    	let g3;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			rect = svg_element("rect");
    			g4 = svg_element("g");
    			g1 = svg_element("g");
    			path0 = svg_element("path");
    			g2 = svg_element("g");
    			path1 = svg_element("path");
    			g3 = svg_element("g");
    			path2 = svg_element("path");
    			attr_dev(rect, "x", "1764.07");
    			attr_dev(rect, "y", "212.106");
    			attr_dev(rect, "width", "201.396");
    			attr_dev(rect, "height", "67.744");
    			set_style(rect, "fill", "rgb(245,239,9)");
    			set_style(rect, "stroke", "rgb(196,201,0)");
    			set_style(rect, "stroke-width", "4.76px");
    			add_location(rect, file$v, 3, 10, 444);
    			attr_dev(g0, "transform", "matrix(0.993071,0,0,0.738068,23.2236,55.5574)");
    			add_location(g0, file$v, 2, 6, 372);
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$v, 7, 14, 685);
    			attr_dev(g1, "transform", "matrix(1.01426,0,0,0.393698,1697.34,132.332)");
    			add_location(g1, file$v, 6, 10, 610);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$v, 10, 14, 944);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.77164,1.08482e-16,2334.82,-11.3458)");
    			add_location(g2, file$v, 9, 10, 854);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$v, 13, 14, 1204);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1602.81,-90.773)");
    			add_location(g3, file$v, 12, 10, 1113);
    			add_location(g4, file$v, 5, 6, 596);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-1772.99,-210.023)");
    			add_location(g5, file$v, 1, 2, 316);
    			attr_dev(svg, "width", "400px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 55");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$v, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g5);
    			append_dev(g5, g0);
    			append_dev(g0, rect);
    			append_dev(g5, g4);
    			append_dev(g4, g1);
    			append_dev(g1, path0);
    			append_dev(g4, g2);
    			append_dev(g2, path1);
    			append_dev(g4, g3);
    			append_dev(g3, path2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$w($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Line1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Line1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Line1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Line1",
    			options,
    			id: create_fragment$w.name
    		});
    	}
    }

    /* src/shapes/line/line2.svelte generated by Svelte v3.44.3 */

    const file$u = "src/shapes/line/line2.svelte";

    function create_fragment$v(ctx) {
    	let svg;
    	let g5;
    	let g0;
    	let rect;
    	let g4;
    	let g1;
    	let path0;
    	let g2;
    	let path1;
    	let g3;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			rect = svg_element("rect");
    			g4 = svg_element("g");
    			g1 = svg_element("g");
    			path0 = svg_element("path");
    			g2 = svg_element("g");
    			path1 = svg_element("path");
    			g3 = svg_element("g");
    			path2 = svg_element("path");
    			attr_dev(rect, "x", "1764.07");
    			attr_dev(rect, "y", "212.106");
    			attr_dev(rect, "width", "201.396");
    			attr_dev(rect, "height", "67.744");
    			set_style(rect, "fill", "rgb(245,239,9)");
    			set_style(rect, "stroke", "rgb(196,201,0)");
    			set_style(rect, "stroke-width", "4.76px");
    			add_location(rect, file$u, 3, 10, 463);
    			attr_dev(g0, "transform", "matrix(6.0808e-17,-0.993071,0.738068,4.51936e-17,1694.49,2385.26)");
    			add_location(g0, file$u, 2, 6, 371);
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$u, 7, 14, 725);
    			attr_dev(g1, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1977.72,356.795)");
    			add_location(g1, file$u, 6, 10, 629);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$u, 10, 14, 962);
    			attr_dev(g2, "transform", "matrix(1,0,0,1.77164,1627.17,71.0784)");
    			add_location(g2, file$u, 9, 10, 894);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$u, 13, 14, 1222);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1679.03,128.923)");
    			add_location(g3, file$u, 12, 10, 1131);
    			add_location(g4, file$u, 5, 6, 615);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-1848.95,-431.328)");
    			add_location(g5, file$u, 1, 2, 315);
    			attr_dev(svg, "width", "100%");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 55 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$u, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g5);
    			append_dev(g5, g0);
    			append_dev(g0, rect);
    			append_dev(g5, g4);
    			append_dev(g4, g1);
    			append_dev(g1, path0);
    			append_dev(g4, g2);
    			append_dev(g2, path1);
    			append_dev(g4, g3);
    			append_dev(g3, path2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$v($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Line2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Line2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Line2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Line2",
    			options,
    			id: create_fragment$v.name
    		});
    	}
    }

    /* src/shapes/n/n1.svelte generated by Svelte v3.44.3 */

    const file$t = "src/shapes/n/n1.svelte";

    function create_fragment$u(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$t, 4, 14, 469);
    			attr_dev(g0, "transform", "matrix(-1.19434e-15,1,1,1.19434e-15,839.61,1274.67)");
    			add_location(g0, file$t, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$t, 7, 14, 800);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,829.677,1921.94)");
    			add_location(g1, file$t, 6, 10, 709);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$t, 10, 14, 1030);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,772.236,2143.34)");
    			add_location(g2, file$t, 9, 10, 955);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$t, 13, 14, 1295);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1129.98,2046.61)");
    			add_location(g3, file$t, 12, 10, 1199);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$t, 16, 14, 1559);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1180.73,2146.8)");
    			add_location(g4, file$t, 15, 10, 1464);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$t, 19, 14, 1796);
    			attr_dev(g5, "transform", "matrix(1,0,0,1.27952,826.687,2014.69)");
    			add_location(g5, file$t, 18, 10, 1728);
    			add_location(g6, file$t, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-999.038,-2222.59)");
    			add_location(g7, file$t, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$t, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N1",
    			options,
    			id: create_fragment$u.name
    		});
    	}
    }

    /* src/shapes/n/n2.svelte generated by Svelte v3.44.3 */

    const file$s = "src/shapes/n/n2.svelte";

    function create_fragment$t(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$s, 4, 14, 471);
    			attr_dev(g0, "transform", "matrix(1,1.22465e-16,1.22465e-16,-1,-3.69292,2228.42)");
    			add_location(g0, file$s, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$s, 7, 14, 800);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,824.81,1663.6)");
    			add_location(g1, file$s, 6, 10, 711);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$s, 10, 14, 1046);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,772.185,1712.93)");
    			add_location(g2, file$s, 9, 10, 955);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$s, 13, 14, 1291);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1303.54,1741.61)");
    			add_location(g3, file$s, 12, 10, 1201);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$s, 16, 14, 1550);
    			attr_dev(g4, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1200.95,1792.58)");
    			add_location(g4, file$s, 15, 10, 1460);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$s, 19, 14, 1794);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,769.897,1938.13)");
    			add_location(g5, file$s, 18, 10, 1719);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$s, 22, 14, 2038);
    			attr_dev(g6, "transform", "matrix(1.01426,0,0,0.393698,868.066,1888.37)");
    			add_location(g6, file$s, 21, 10, 1963);
    			add_location(g7, file$s, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-944.224,-1964.83)");
    			add_location(g8, file$s, 1, 2, 317);
    			attr_dev(svg, "width", "406px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$s, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N2",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    /* src/shapes/n/n3.svelte generated by Svelte v3.44.3 */

    const file$r = "src/shapes/n/n3.svelte";

    function create_fragment$s(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$r, 4, 14, 472);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,-1,-1,6.12323e-17,1259.52,2784.79)");
    			add_location(g0, file$r, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$r, 7, 14, 803);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,825.053,1331.02)");
    			add_location(g1, file$r, 6, 10, 712);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$r, 10, 14, 1054);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1125.17,1506.06)");
    			add_location(g2, file$r, 9, 10, 958);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$r, 13, 14, 1319);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1174.88,1557.13)");
    			add_location(g3, file$r, 12, 10, 1223);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$r, 16, 14, 1557);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,822.803,1578.84)");
    			add_location(g4, file$r, 15, 10, 1488);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$r, 19, 14, 1795);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,773.195,1477.75)");
    			add_location(g5, file$r, 18, 10, 1726);
    			add_location(g6, file$r, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-995.922,-1632.72)");
    			add_location(g7, file$r, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$r, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N3",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src/shapes/n/n4.svelte generated by Svelte v3.44.3 */

    const file$q = "src/shapes/n/n4.svelte";

    function create_fragment$r(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$q, 4, 14, 450);
    			attr_dev(g0, "transform", "matrix(-1,0,0,1,2101.52,1211.27)");
    			add_location(g0, file$q, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$q, 7, 14, 781);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,778.035,1118.44)");
    			add_location(g1, file$q, 6, 10, 690);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$q, 10, 14, 1026);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,878.631,1067.1)");
    			add_location(g2, file$q, 9, 10, 936);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$q, 13, 14, 1270);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,1358.27,1198.75)");
    			add_location(g3, file$q, 12, 10, 1181);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$q, 16, 14, 1514);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,874.447,1291.93)");
    			add_location(g4, file$q, 15, 10, 1439);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$q, 19, 14, 1758);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,823.715,1342.16)");
    			add_location(g5, file$q, 18, 10, 1683);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$q, 22, 14, 2023);
    			attr_dev(g6, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1232.65,1144.52)");
    			add_location(g6, file$q, 21, 10, 1927);
    			add_location(g7, file$q, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-949.451,-1370.69)");
    			add_location(g8, file$q, 1, 2, 317);
    			attr_dev(svg, "width", "406px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$q, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N4",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src/shapes/n/n5.svelte generated by Svelte v3.44.3 */

    const file$p = "src/shapes/n/n5.svelte";

    function create_fragment$q(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$p, 4, 14, 470);
    			attr_dev(g0, "transform", "matrix(1.19434e-15,1,-1,1.19434e-15,1260.96,91.1267)");
    			add_location(g0, file$p, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$p, 7, 14, 799);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,827.421,788.6)");
    			add_location(g1, file$p, 6, 10, 710);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$p, 10, 14, 1044);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,876.32,734.665)");
    			add_location(g2, file$p, 9, 10, 954);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$p, 13, 14, 1295);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1127.81,961.941)");
    			add_location(g3, file$p, 12, 10, 1199);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$p, 16, 14, 1560);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1179.23,863.744)");
    			add_location(g4, file$p, 15, 10, 1464);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$p, 19, 14, 1794);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,775,978.145)");
    			add_location(g5, file$p, 18, 10, 1729);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$p, 22, 14, 2032);
    			attr_dev(g6, "transform", "matrix(1,0,0,0.787396,823.499,883.389)");
    			add_location(g6, file$p, 21, 10, 1963);
    			add_location(g7, file$p, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-997.365,-1039.04)");
    			add_location(g8, file$p, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$p, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N5",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src/shapes/n/n6.svelte generated by Svelte v3.44.3 */

    const file$o = "src/shapes/n/n6.svelte";

    function create_fragment$p(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$o, 4, 14, 190);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,16.0615,34.6883)");
    			add_location(g0, file$o, 3, 10, 128);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$o, 7, 14, 519);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,1426.33,22.0512)");
    			add_location(g1, file$o, 6, 10, 430);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$o, 10, 14, 785);
    			attr_dev(g2, "transform", "matrix(3.10527e-17,0.507129,-0.393698,2.41071e-17,1091.87,106.477)");
    			add_location(g2, file$o, 9, 10, 688);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$o, 13, 14, 1029);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,889.017,167.615)");
    			add_location(g3, file$o, 12, 10, 954);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$o, 16, 14, 1273);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,788.233,116.773)");
    			add_location(g4, file$o, 15, 10, 1198);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$o, 19, 14, 1533);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,792.95,-107.393)");
    			add_location(g5, file$o, 18, 10, 1442);
    			add_location(g6, file$o, 2, 6, 114);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-963.978,-194.117)");
    			add_location(g7, file$o, 1, 2, 58);
    			attr_dev(svg, "width", "406px");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			add_location(svg, file$o, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N6",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src/shapes/n/n7.svelte generated by Svelte v3.44.3 */

    const file$n = "src/shapes/n/n7.svelte";

    function create_fragment$o(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$n, 4, 14, 470);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,841.053,1601.25)");
    			add_location(g0, file$n, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$n, 7, 14, 801);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,879.787,146.664)");
    			add_location(g1, file$n, 6, 10, 710);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$n, 10, 14, 1045);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,828.08,245.45)");
    			add_location(g2, file$n, 9, 10, 956);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$n, 13, 14, 1295);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1185.71,322.11)");
    			add_location(g3, file$n, 12, 10, 1200);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$n, 16, 14, 1560);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1132.68,370.872)");
    			add_location(g4, file$n, 15, 10, 1464);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$n, 19, 14, 1797);
    			attr_dev(g5, "transform", "matrix(1,0,0,1.27952,827.163,186.575)");
    			add_location(g5, file$n, 18, 10, 1729);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$n, 22, 14, 2041);
    			attr_dev(g6, "transform", "matrix(1.01426,0,0,0.393698,774.179,521.869)");
    			add_location(g6, file$n, 21, 10, 1966);
    			add_location(g7, file$n, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1000.48,-449.177)");
    			add_location(g8, file$n, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$n, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N7",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src/shapes/n/n8.svelte generated by Svelte v3.44.3 */

    const file$m = "src/shapes/n/n8.svelte";

    function create_fragment$n(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1049.99,211.56L1049.99,161.56L950,161.512L950,211.512L999.989,211.512L999.989,261.512L1149.99,261.512L1149.99,211.56L1049.99,211.56Z");
    			set_style(path0, "fill", "rgb(141,0,102)");
    			set_style(path0, "stroke", "rgb(89,6,65)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$m, 4, 14, 457);
    			attr_dev(g0, "transform", "matrix(-1,1.22465e-16,-1.22465e-16,-1,2089.7,1046.21)");
    			add_location(g0, file$m, 3, 10, 373);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$m, 7, 14, 788);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,765.067,478.367)");
    			add_location(g1, file$m, 6, 10, 697);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$m, 10, 14, 1033);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1194.89,559.039)");
    			add_location(g2, file$m, 9, 10, 943);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$m, 13, 14, 1290);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1292.3,610.26)");
    			add_location(g3, file$m, 12, 10, 1202);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$m, 16, 14, 1534);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,860.956,754.553)");
    			add_location(g4, file$m, 15, 10, 1459);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$m, 19, 14, 1778);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,809.644,705.084)");
    			add_location(g5, file$m, 18, 10, 1703);
    			add_location(g6, file$m, 2, 6, 359);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-937.632,-782.619)");
    			add_location(g7, file$m, 1, 2, 303);
    			attr_dev(svg, "width", "406px");
    			attr_dev(svg, "viewBox", "0 0 205 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$m, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('N8', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<N8> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class N8 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N8",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src/shapes/s/s1.svelte generated by Svelte v3.44.3 */

    const file$l = "src/shapes/s/s1.svelte";

    function create_fragment$m(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1300,298L1300,250L1400,250L1400,300L1350,300L1350,350L1250,350L1250,298L1300,298Z");
    			set_style(path0, "fill", "rgb(255,127,0)");
    			set_style(path0, "stroke", "rgb(133,66,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$l, 4, 14, 449);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,1.28298,-50.3799)");
    			add_location(g0, file$l, 3, 10, 386);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$l, 7, 14, 736);
    			attr_dev(g1, "transform", "matrix(3.10527e-17,0.507129,-0.393698,2.41071e-17,1477.92,110.165)");
    			add_location(g1, file$l, 6, 10, 639);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$l, 10, 14, 980);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1123.18,121.222)");
    			add_location(g2, file$l, 9, 10, 905);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$l, 13, 14, 1224);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1072.51,173.801)");
    			add_location(g3, file$l, 12, 10, 1149);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$l, 16, 14, 1483);
    			attr_dev(g4, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1506.05,25.5383)");
    			add_location(g4, file$l, 15, 10, 1393);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$l, 19, 14, 1743);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1128.9,-102.977)");
    			add_location(g5, file$l, 18, 10, 1652);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$l, 22, 14, 1990);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1076.93,-56.8145)");
    			add_location(g6, file$l, 21, 10, 1898);
    			add_location(g7, file$l, 2, 6, 372);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1249.2,-197.537)");
    			add_location(g8, file$l, 1, 2, 317);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$l, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('S1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<S1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class S1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "S1",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/shapes/s/s2.svelte generated by Svelte v3.44.3 */

    const file$k = "src/shapes/s/s2.svelte";

    function create_fragment$l(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1300,298L1300,250L1400,250L1400,300L1350,300L1350,350L1250,350L1250,298L1300,298Z");
    			set_style(path0, "fill", "rgb(255,127,0)");
    			set_style(path0, "stroke", "rgb(133,66,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$k, 4, 14, 470);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,1025.94,1881.41)");
    			add_location(g0, file$k, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$k, 7, 14, 751);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1103.57,177.722)");
    			add_location(g1, file$k, 6, 10, 660);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$k, 10, 14, 981);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1047.32,400.652)");
    			add_location(g2, file$k, 9, 10, 906);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$k, 13, 14, 1246);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1453.25,353.161)");
    			add_location(g3, file$k, 12, 10, 1150);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$k, 16, 14, 1510);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1401.93,302.14)");
    			add_location(g4, file$k, 15, 10, 1415);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$k, 19, 14, 1748);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1099.49,374.015)");
    			add_location(g5, file$k, 18, 10, 1679);
    			add_location(g6, file$k, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1273.86,-479.323)");
    			add_location(g7, file$k, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$k, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('S2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<S2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class S2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "S2",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/shapes/s/s5.svelte generated by Svelte v3.44.3 */

    const file$j = "src/shapes/s/s5.svelte";

    function create_fragment$k(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M1300,298L1300,250L1400,250L1400,300L1350,300L1350,350L1250,350L1250,298L1300,298Z");
    			set_style(path0, "fill", "rgb(255,127,0)");
    			set_style(path0, "stroke", "rgb(133,66,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$j, 4, 14, 449);
    			attr_dev(g0, "transform", "matrix(-1,0,0,1,2645.88,545.824)");
    			add_location(g0, file$j, 3, 10, 386);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$j, 7, 14, 730);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1071.61,490.976)");
    			add_location(g1, file$j, 6, 10, 639);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$j, 10, 14, 975);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1548.77,619.836)");
    			add_location(g2, file$j, 9, 10, 885);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$j, 13, 14, 1219);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1066.44,713.295)");
    			add_location(g3, file$j, 12, 10, 1144);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$j, 16, 14, 1463);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1118.31,764.704)");
    			add_location(g4, file$j, 15, 10, 1388);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$j, 19, 14, 1728);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1372.78,566.658)");
    			add_location(g5, file$j, 18, 10, 1632);
    			add_location(g6, file$j, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1243.8,-793.741)");
    			add_location(g7, file$j, 1, 2, 317);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$j, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('S5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<S5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class S5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "S5",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/shapes/s/s6.svelte generated by Svelte v3.44.3 */

    const file$i = "src/shapes/s/s6.svelte";

    function create_fragment$j(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M1300,298L1300,250L1400,250L1400,300L1350,300L1350,350L1250,350L1250,298L1300,298Z");
    			set_style(path0, "fill", "rgb(255,127,0)");
    			set_style(path0, "stroke", "rgb(133,66,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$i, 4, 14, 472);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,-1,-1,6.12323e-17,1621.23,2477.61)");
    			add_location(g0, file$i, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$i, 7, 14, 753);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1148.58,774.113)");
    			add_location(g1, file$i, 6, 10, 662);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$i, 10, 14, 999);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1097.73,823.498)");
    			add_location(g2, file$i, 9, 10, 908);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$i, 13, 14, 1229);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1044.12,1096.64)");
    			add_location(g3, file$i, 12, 10, 1154);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$i, 16, 14, 1494);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1401.38,950.261)");
    			add_location(g4, file$i, 15, 10, 1398);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$i, 19, 14, 1759);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1451.32,897.849)");
    			add_location(g5, file$i, 18, 10, 1663);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$i, 22, 14, 1997);
    			attr_dev(g6, "transform", "matrix(1,0,0,0.787396,1095.84,919.821)");
    			add_location(g6, file$i, 21, 10, 1928);
    			add_location(g7, file$i, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1269.14,-1075.53)");
    			add_location(g8, file$i, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$i, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('S6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<S6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class S6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "S6",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/shapes/T/T1.svelte generated by Svelte v3.44.3 */

    const file$h = "src/shapes/T/T1.svelte";

    function create_fragment$i(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M2200,200L2100,200L2100,250L2200,250L2200,300L2250,300L2250,150L2200,150L2200,200Z");
    			set_style(path0, "fill", "rgb(136,0,255)");
    			set_style(path0, "stroke", "rgb(61,8,93)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$h, 4, 14, 470);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,1,-1,6.12323e-17,2369.9,-1043.21)");
    			add_location(g0, file$h, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$h, 7, 14, 748);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,2475.53,931.523)");
    			add_location(g1, file$h, 6, 10, 659);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$h, 10, 14, 991);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1941.7,1076.83)");
    			add_location(g2, file$h, 9, 10, 917);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$h, 13, 14, 1229);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,1893.96,899.097)");
    			add_location(g3, file$h, 12, 10, 1160);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$h, 16, 14, 1489);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1947.51,753.314)");
    			add_location(g4, file$h, 15, 10, 1398);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$h, 19, 14, 1735);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1896.53,852.518)");
    			add_location(g5, file$h, 18, 10, 1644);
    			add_location(g6, file$h, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2067.82,-1054.71)");
    			add_location(g7, file$h, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$h, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('T1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<T1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class T1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T1",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/shapes/T/t2.svelte generated by Svelte v3.44.3 */

    const file$g = "src/shapes/T/t2.svelte";

    function create_fragment$h(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M2200,200L2100,200L2100,250L2200,250L2200,300L2250,300L2250,150L2200,150L2200,200Z");
    			set_style(path0, "fill", "rgb(136,0,255)");
    			set_style(path0, "stroke", "rgb(61,8,93)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$g, 4, 14, 439);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,-10,8)");
    			add_location(g0, file$g, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$g, 7, 14, 724);
    			attr_dev(g1, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2319.76,31.3275)");
    			add_location(g1, file$g, 6, 10, 628);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$g, 10, 14, 984);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2346.78,-14.8653)");
    			add_location(g2, file$g, 9, 10, 893);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$g, 13, 14, 1245);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1916.39,-95.7426)");
    			add_location(g3, file$g, 12, 10, 1153);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$g, 16, 14, 1492);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2017.47,-146.632)");
    			add_location(g4, file$g, 15, 10, 1400);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$g, 19, 14, 1716);
    			attr_dev(g5, "transform", "matrix(1,0,0,1.27952,1965.48,-101.135)");
    			add_location(g5, file$g, 18, 10, 1647);
    			add_location(g6, file$g, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2087.92,-155.917)");
    			add_location(g7, file$g, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('T2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<T2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class T2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T2",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/shapes/T/T3.svelte generated by Svelte v3.44.3 */

    const file$f = "src/shapes/T/T3.svelte";

    function create_fragment$g(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M2200,200L2100,200L2100,250L2200,250L2200,300L2250,300L2250,150L2200,150L2200,200Z");
    			set_style(path0, "fill", "rgb(136,0,255)");
    			set_style(path0, "stroke", "rgb(61,8,93)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$f, 4, 14, 470);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,1934.16,2701.75)");
    			add_location(g0, file$f, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$f, 7, 14, 734);
    			attr_dev(g1, "transform", "matrix(1.01426,0,0,0.393698,1954.39,372.591)");
    			add_location(g1, file$f, 6, 10, 659);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$f, 10, 14, 999);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2261.83,322.958)");
    			add_location(g2, file$f, 9, 10, 903);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$f, 13, 14, 1264);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2212.95,223.332)");
    			add_location(g3, file$f, 12, 10, 1168);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$f, 16, 14, 1528);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2310.62,224.09)");
    			add_location(g4, file$f, 15, 10, 1433);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$f, 19, 14, 1766);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1907.84,343.766)");
    			add_location(g5, file$f, 18, 10, 1697);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$f, 22, 14, 2023);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1910,147.105)");
    			add_location(g6, file$f, 21, 10, 1935);
    			add_location(g7, file$f, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2082.07,-449.667)");
    			add_location(g8, file$f, 1, 2, 317);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('T3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<T3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class T3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T3",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/shapes/T/t4.svelte generated by Svelte v3.44.3 */

    const file$e = "src/shapes/T/t4.svelte";

    function create_fragment$f(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M2200,200L2100,200L2100,250L2200,250L2200,300L2250,300L2250,150L2200,150L2200,200Z");
    			set_style(path0, "fill", "rgb(136,0,255)");
    			set_style(path0, "stroke", "rgb(61,8,93)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$e, 4, 14, 472);
    			attr_dev(g0, "transform", "matrix(-1,1.22465e-16,-1.22465e-16,-1,4329.53,1067.28)");
    			add_location(g0, file$e, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$e, 7, 14, 751);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2385.51,593.334)");
    			add_location(g1, file$e, 6, 10, 661);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$e, 10, 14, 995);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1850.52,783.496)");
    			add_location(g2, file$e, 9, 10, 920);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$e, 13, 14, 1238);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1949.7,738.365)");
    			add_location(g3, file$e, 12, 10, 1164);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$e, 16, 14, 1481);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1851.3,690.514)");
    			add_location(g4, file$e, 15, 10, 1407);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$e, 19, 14, 1745);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2206.6,638.166)");
    			add_location(g5, file$e, 18, 10, 1650);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$e, 22, 14, 2005);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1907.11,464.519)");
    			add_location(g6, file$e, 21, 10, 1914);
    			add_location(g7, file$e, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2077.45,-765.201)");
    			add_location(g8, file$e, 1, 2, 317);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$e, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('T4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<T4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class T4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T4",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/shapes/u/u1.svelte generated by Svelte v3.44.3 */

    const file$d = "src/shapes/u/u1.svelte";

    function create_fragment$e(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M2600,300L2750,300L2750,200L2700,200L2700,250L2650,250L2650,200L2600,200L2600,300Z");
    			set_style(path0, "fill", "rgb(35,104,0)");
    			set_style(path0, "stroke", "rgb(0,36,2)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$d, 4, 14, 449);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,25.3657,-2.3355)");
    			add_location(g0, file$d, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$d, 7, 14, 725);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,3035.42,23.3447)");
    			add_location(g1, file$d, 6, 10, 636);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$d, 10, 14, 969);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,2396.88,119.622)");
    			add_location(g2, file$d, 9, 10, 894);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$d, 13, 14, 1206);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,2500.56,41.389)");
    			add_location(g3, file$d, 12, 10, 1138);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$d, 16, 14, 1467);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2452.01,-106.786)");
    			add_location(g4, file$d, 15, 10, 1375);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$d, 19, 14, 1714);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2551.36,-107.644)");
    			add_location(g5, file$d, 18, 10, 1622);
    			add_location(g6, file$d, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2623.28,-195.581)");
    			add_location(g7, file$d, 1, 2, 317);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('U1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<U1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class U1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U1",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/shapes/u/u2.svelte generated by Svelte v3.44.3 */

    const file$c = "src/shapes/u/u2.svelte";

    function create_fragment$d(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M2600,300L2750,300L2750,200L2700,200L2700,250L2650,250L2650,200L2600,200L2600,300Z");
    			set_style(path0, "fill", "rgb(35,104,0)");
    			set_style(path0, "stroke", "rgb(0,36,2)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$c, 4, 14, 467);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,2455,3203.39)");
    			add_location(g0, file$c, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$c, 7, 14, 744);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2910.14,328.303)");
    			add_location(g1, file$c, 6, 10, 654);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$c, 10, 14, 1004);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2480.57,147.449)");
    			add_location(g2, file$c, 9, 10, 913);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$c, 13, 14, 1249);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2482.3,249.571)");
    			add_location(g3, file$c, 12, 10, 1159);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$c, 16, 14, 1471);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,2478.5,189.169)");
    			add_location(g4, file$c, 15, 10, 1404);
    			add_location(g5, file$c, 2, 6, 373);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2652.92,-451.307)");
    			add_location(g6, file$c, 1, 2, 317);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('U2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<U2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class U2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U2",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/shapes/u/u3.svelte generated by Svelte v3.44.3 */

    const file$b = "src/shapes/u/u3.svelte";

    function create_fragment$c(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M2600,300L2750,300L2750,200L2700,200L2700,250L2650,250L2650,200L2600,200L2600,300Z");
    			set_style(path0, "fill", "rgb(35,104,0)");
    			set_style(path0, "stroke", "rgb(0,36,2)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$b, 4, 16, 218);
    			attr_dev(g0, "transform", "matrix(-1,1.22465e-16,-1.22465e-16,-1,5380,1075.41)");
    			add_location(g0, file$b, 3, 12, 134);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$b, 7, 16, 486);
    			attr_dev(g1, "transform", "matrix(1.01426,0,0,0.393698,2401.94,742.491)");
    			add_location(g1, file$b, 6, 12, 409);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$b, 10, 16, 757);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2757.57,597.546)");
    			add_location(g2, file$b, 9, 12, 659);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$b, 13, 16, 1028);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2804.65,546.414)");
    			add_location(g3, file$b, 12, 12, 930);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$b, 16, 16, 1298);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2861.45,596.41)");
    			add_location(g4, file$b, 15, 12, 1201);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$b, 19, 16, 1541);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,2506.27,616.45)");
    			add_location(g5, file$b, 18, 12, 1471);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$b, 22, 16, 1807);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2456.62,470.999)");
    			add_location(g6, file$b, 21, 12, 1714);
    			add_location(g7, file$b, 2, 8, 118);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2627.92,-773.328)");
    			add_location(g8, file$b, 1, 4, 60);
    			attr_dev(svg, "width", "306px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 105");
    			add_location(svg, file$b, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('U3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<U3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class U3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U3",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/shapes/u/u4.svelte generated by Svelte v3.44.3 */

    const file$a = "src/shapes/u/u4.svelte";

    function create_fragment$b(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M2600,300L2750,300L2750,200L2700,200L2700,250L2650,250L2650,200L2600,200L2600,300Z");
    			set_style(path0, "fill", "rgb(35,104,0)");
    			set_style(path0, "stroke", "rgb(0,36,2)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$a, 4, 16, 220);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,1,-1,6.12323e-17,2939.28,-1544.62)");
    			add_location(g0, file$a, 3, 12, 134);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$a, 7, 16, 503);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2896.82,929.139)");
    			add_location(g1, file$a, 6, 12, 411);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$a, 10, 16, 753);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,2411.62,1024.08)");
    			add_location(g2, file$a, 9, 12, 676);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$a, 13, 16, 1003);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,2460.18,976.065)");
    			add_location(g3, file$a, 12, 12, 926);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$a, 16, 16, 1253);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,2462.57,1076.65)");
    			add_location(g4, file$a, 15, 12, 1176);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$a, 19, 16, 1524);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2816.52,827.027)");
    			add_location(g5, file$a, 18, 12, 1426);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$a, 22, 16, 1790);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2467.82,751.788)");
    			add_location(g6, file$a, 21, 12, 1697);
    			add_location(g7, file$a, 2, 8, 118);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2637.19,-1053.3)");
    			add_location(g8, file$a, 1, 4, 61);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			add_location(svg, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('U4', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<U4> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class U4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U4",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/shapes/Z/Z1.svelte generated by Svelte v3.44.3 */

    const file$9 = "src/shapes/Z/Z1.svelte";

    function create_fragment$a(ctx) {
    	let svg;
    	let g7;
    	let g6;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g7 = svg_element("g");
    			g6 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M719.049,222.7L718.972,322.745L818.972,322.745L818.972,272.745L768.991,272.745L768.991,172.7L668.991,172.7L668.991,222.7L719.049,222.7Z");
    			set_style(path0, "fill", "rgb(0,177,2)");
    			set_style(path0, "stroke", "rgb(30,84,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$9, 4, 16, 481);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,-1,-1,6.12323e-17,1022.04,1878.02)");
    			add_location(g0, file$9, 3, 12, 394);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$9, 7, 16, 818);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,528.143,756.214)");
    			add_location(g1, file$9, 6, 12, 725);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$9, 10, 16, 1069);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,951.403,884.805)");
    			add_location(g2, file$9, 9, 12, 977);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$9, 13, 16, 1317);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,469.5,974.405)");
    			add_location(g3, file$9, 12, 12, 1242);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$9, 16, 16, 1588);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,931.675,928.083)");
    			add_location(g4, file$9, 15, 12, 1490);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$9, 19, 16, 1832);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,574.045,950.494)");
    			add_location(g5, file$9, 18, 12, 1761);
    			add_location(g6, file$9, 2, 8, 378);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-697.211,-1056.96)");
    			add_location(g7, file$9, 1, 4, 320);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "300px");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g7);
    			append_dev(g7, g6);
    			append_dev(g6, g0);
    			append_dev(g0, path0);
    			append_dev(g6, g1);
    			append_dev(g1, path1);
    			append_dev(g6, g2);
    			append_dev(g2, path2);
    			append_dev(g6, g3);
    			append_dev(g3, path3);
    			append_dev(g6, g4);
    			append_dev(g4, path4);
    			append_dev(g6, g5);
    			append_dev(g5, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Z1', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Z1> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Z1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Z1",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/shapes/Z/Z2.svelte generated by Svelte v3.44.3 */

    const file$8 = "src/shapes/Z/Z2.svelte";

    function create_fragment$9(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M719.049,222.7L718.972,322.745L818.972,322.745L818.972,272.745L768.991,272.745L768.991,172.7L668.991,172.7L668.991,222.7L719.049,222.7Z");
    			set_style(path0, "fill", "rgb(0,177,2)");
    			set_style(path0, "stroke", "rgb(30,84,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$8, 4, 16, 458);
    			attr_dev(g0, "transform", "matrix(-1,0,0,1,1512.79,585.924)");
    			add_location(g0, file$8, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$8, 7, 16, 795);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,571.076,455.644)");
    			add_location(g1, file$8, 6, 12, 702);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$8, 10, 16, 1047);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,519.186,554.685)");
    			add_location(g2, file$8, 9, 12, 954);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$8, 13, 16, 1298);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,948.167,633.487)");
    			add_location(g3, file$8, 12, 12, 1206);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$8, 16, 16, 1548);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,564.522,681.209)");
    			add_location(g4, file$8, 15, 12, 1471);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$8, 19, 16, 1819);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,924.325,530.131)");
    			add_location(g5, file$8, 18, 12, 1721);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$8, 22, 16, 2063);
    			attr_dev(g6, "transform", "matrix(1,0,0,0.787396,517.362,655.381)");
    			add_location(g6, file$8, 21, 12, 1992);
    			add_location(g7, file$8, 2, 8, 377);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-691.735,-756.541)");
    			add_location(g8, file$8, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Z2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Z2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Z2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Z2",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/shapes/Z/Z5.svelte generated by Svelte v3.44.3 */

    const file$7 = "src/shapes/Z/Z5.svelte";

    function create_fragment$8(ctx) {
    	let svg;
    	let g8;
    	let g7;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;
    	let g5;
    	let path5;
    	let g6;
    	let path6;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g8 = svg_element("g");
    			g7 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			g5 = svg_element("g");
    			path5 = svg_element("path");
    			g6 = svg_element("g");
    			path6 = svg_element("path");
    			attr_dev(path0, "d", "M719.049,222.7L718.972,322.745L818.972,322.745L818.972,272.745L768.991,272.745L768.991,172.7L668.991,172.7L668.991,222.7L719.049,222.7Z");
    			set_style(path0, "fill", "rgb(0,177,2)");
    			set_style(path0, "stroke", "rgb(30,84,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$7, 4, 16, 478);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,1,6.12323e-17,530.751,1292.09)");
    			add_location(g0, file$7, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$7, 7, 16, 815);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,531.792,219.794)");
    			add_location(g1, file$7, 6, 12, 722);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$7, 10, 16, 1067);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,631.447,168.096)");
    			add_location(g2, file$7, 9, 12, 974);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$7, 13, 16, 1318);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1008.48,296.695)");
    			add_location(g3, file$7, 12, 12, 1226);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$7, 16, 16, 1589);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,831.667,343.367)");
    			add_location(g4, file$7, 15, 12, 1491);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$7, 19, 16, 1832);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,578.07,313.895)");
    			add_location(g5, file$7, 18, 12, 1762);
    			attr_dev(path6, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$7, 22, 16, 2082);
    			attr_dev(g6, "transform", "matrix(1.01426,0,0,0.393698,474.464,492.174)");
    			add_location(g6, file$7, 21, 12, 2005);
    			add_location(g7, file$7, 2, 8, 377);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-701.368,-471.037)");
    			add_location(g8, file$7, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g8);
    			append_dev(g8, g7);
    			append_dev(g7, g0);
    			append_dev(g0, path0);
    			append_dev(g7, g1);
    			append_dev(g1, path1);
    			append_dev(g7, g2);
    			append_dev(g2, path2);
    			append_dev(g7, g3);
    			append_dev(g3, path3);
    			append_dev(g7, g4);
    			append_dev(g4, path4);
    			append_dev(g7, g5);
    			append_dev(g5, path5);
    			append_dev(g7, g6);
    			append_dev(g6, path6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Z5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Z5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Z5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Z5",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/shapes/Z/Z6.svelte generated by Svelte v3.44.3 */

    const file$6 = "src/shapes/Z/Z6.svelte";

    function create_fragment$7(ctx) {
    	let svg;
    	let g6;
    	let g5;
    	let g0;
    	let path0;
    	let g1;
    	let path1;
    	let g2;
    	let path2;
    	let g3;
    	let path3;
    	let g4;
    	let path4;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			path4 = svg_element("path");
    			attr_dev(path0, "d", "M719.049,222.7L718.972,322.745L818.972,322.745L818.972,272.745L768.991,272.745L768.991,172.7L668.991,172.7L668.991,222.7L719.049,222.7Z");
    			set_style(path0, "fill", "rgb(0,177,2)");
    			set_style(path0, "stroke", "rgb(30,84,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$6, 4, 16, 446);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,40,0)");
    			add_location(g0, file$6, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$6, 7, 16, 782);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1013.69,48.8021)");
    			add_location(g1, file$6, 6, 12, 690);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$6, 10, 16, 1032);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,580.363,194.505)");
    			add_location(g2, file$6, 9, 12, 955);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$6, 13, 16, 1275);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,533.16,14.3763)");
    			add_location(g3, file$6, 12, 12, 1205);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$6, 16, 16, 1542);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,535.977,-131.869)");
    			add_location(g4, file$6, 15, 12, 1448);
    			add_location(g5, file$6, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-706.908,-170.617)");
    			add_location(g6, file$6, 1, 4, 319);
    			attr_dev(svg, "width", "300px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 155 155");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g6);
    			append_dev(g6, g5);
    			append_dev(g5, g0);
    			append_dev(g0, path0);
    			append_dev(g5, g1);
    			append_dev(g1, path1);
    			append_dev(g5, g2);
    			append_dev(g2, path2);
    			append_dev(g5, g3);
    			append_dev(g3, path3);
    			append_dev(g5, g4);
    			append_dev(g4, path4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Z6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Z6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Z6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Z6",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/Shape.svelte generated by Svelte v3.44.3 */
    const file$5 = "src/Shape.svelte";

    function create_fragment$6(ctx) {
    	let div_1;
    	let switch_instance;
    	let div_1_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*ShapeTypes*/ ctx[6][/*pieceId*/ ctx[0]];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			div_1 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(div_1, "class", "svgDiv svelte-1dou8pm");
    			attr_dev(div_1, "style", div_1_style_value = "top: " + coordToPx(/*posY*/ ctx[3]) + "px; left: " + coordToPx(/*posX*/ ctx[2]) + "px; " + /*cssTransformValue*/ ctx[5]);
    			toggle_class(div_1, "onBoard", /*onBoard*/ ctx[1]);
    			add_location(div_1, file$5, 244, 0, 5038);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div_1, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div_1, null);
    			}

    			/*div_1_binding*/ ctx[12](div_1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div_1, "click", /*toggle*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*ShapeTypes*/ ctx[6][/*pieceId*/ ctx[0]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div_1, null);
    				} else {
    					switch_instance = null;
    				}
    			}

    			if (!current || dirty & /*posY, posX, cssTransformValue*/ 44 && div_1_style_value !== (div_1_style_value = "top: " + coordToPx(/*posY*/ ctx[3]) + "px; left: " + coordToPx(/*posX*/ ctx[2]) + "px; " + /*cssTransformValue*/ ctx[5])) {
    				attr_dev(div_1, "style", div_1_style_value);
    			}

    			if (dirty & /*onBoard*/ 2) {
    				toggle_class(div_1, "onBoard", /*onBoard*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div_1);
    			if (switch_instance) destroy_component(switch_instance);
    			/*div_1_binding*/ ctx[12](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function coordToPx(x) {
    	return x * 100 + 50;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Shape', slots, []);

    	const ShapeTypes = {
    		B1,
    		B2,
    		B3,
    		B4,
    		B5,
    		B6,
    		B7,
    		B8,
    		I1,
    		I2,
    		I3,
    		I4,
    		I5,
    		I6,
    		I7,
    		I8,
    		J1,
    		J2,
    		J3,
    		J4,
    		J5,
    		J6,
    		J7,
    		J8,
    		L1,
    		L2,
    		L3,
    		L4,
    		N1,
    		N2,
    		N3,
    		N4,
    		N5,
    		N6,
    		N7,
    		N8,
    		S1,
    		S2,
    		S5,
    		S6,
    		T1,
    		T2,
    		T3,
    		T4,
    		U1,
    		U2,
    		U3,
    		U4,
    		Z1,
    		Z2,
    		Z5,
    		Z6,
    		"|1": Line1,
    		"|2": Line2
    	};

    	let { pieceId } = $$props;
    	let { top } = $$props;
    	let { left } = $$props;
    	let { offX = 0 } = $$props;
    	let { offY = 0 } = $$props;
    	let posX = left;
    	let posY = top;
    	let div;
    	let onBoard = false;
    	let changePos;
    	let targetPos;
    	let changeScale = 50;
    	let targetScale = 100;
    	let everToggle;

    	function toggle() {
    		everToggle = true;
    		$$invalidate(1, onBoard = !onBoard);
    		changePos = { x: div.offsetLeft, y: div.offsetTop };
    		changeScale = onBoard ? 100 : 50;
    		targetScale = onBoard ? 50 : 100;

    		targetPos = onBoard
    		? { x: coordToPx(left), y: coordToPx(top) }
    		: { x: coordToPx(offX), y: coordToPx(offY) };
    	}

    	let lastPos = { x: posX, y: posY };
    	let offBoardAngle = Math.random() * 360;
    	let cssTransformValue = `transform: scale(${changeScale}%);`;

    	const interval = setInterval(
    		() => {
    			if (!everToggle) return;

    			// get current position;
    			var currPos = { x: div.offsetLeft, y: div.offsetTop };

    			var diff = {
    				x: targetPos.x - currPos.x,
    				y: targetPos.y - currPos.y
    			};

    			var total = {
    				x: targetPos.x - changePos.x,
    				y: targetPos.y - changePos.y
    			};

    			var totalDist = Math.sqrt(Math.pow(total.x, 2) + Math.pow(total.y, 2));
    			var dist = Math.sqrt(Math.pow(diff.x, 2) + Math.pow(diff.y, 2));
    			var normal = { x: diff.x / dist, y: diff.y / dist };
    			var r = dist / totalDist;
    			var degX = 40 * normal.x * Math.sin(r * 3.14 * r * r);
    			var degY = 40 * normal.y * Math.sin(r * 3.14 * r * r);
    			var z = onBoard ? 0 : offBoardAngle;
    			var scaleP = changeScale + Math.sin(r * 3.14 * r * r) * r * r * (targetScale - changeScale);
    			$$invalidate(5, cssTransformValue = `transform: rotateY(${degX}deg) rotateX(${degY}deg) rotateZ(${z}deg) scale(${scaleP}%);`);
    			lastPos = currPos;
    		},
    		1
    	);

    	onDestroy(() => clearInterval(interval));
    	const writable_props = ['pieceId', 'top', 'left', 'offX', 'offY'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Shape> was created with unknown prop '${key}'`);
    	});

    	function div_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			div = $$value;
    			$$invalidate(4, div);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('pieceId' in $$props) $$invalidate(0, pieceId = $$props.pieceId);
    		if ('top' in $$props) $$invalidate(8, top = $$props.top);
    		if ('left' in $$props) $$invalidate(9, left = $$props.left);
    		if ('offX' in $$props) $$invalidate(10, offX = $$props.offX);
    		if ('offY' in $$props) $$invalidate(11, offY = $$props.offY);
    	};

    	$$self.$capture_state = () => ({
    		B1,
    		B2,
    		B3,
    		B4,
    		B5,
    		B6,
    		B7,
    		B8,
    		I1,
    		I2,
    		I3,
    		I4,
    		I5,
    		I6,
    		I7,
    		I8,
    		J1,
    		J2,
    		J3,
    		J4,
    		J5,
    		J6,
    		J7,
    		J8,
    		L1,
    		L2,
    		L3,
    		L4,
    		Line1,
    		Line2,
    		N1,
    		N2,
    		N3,
    		N4,
    		N5,
    		N6,
    		N7,
    		N8,
    		S1,
    		S2,
    		S5,
    		S6,
    		T1,
    		T2,
    		T3,
    		T4,
    		U1,
    		U2,
    		U3,
    		U4,
    		Z1,
    		Z2,
    		Z5,
    		Z6,
    		ShapeTypes,
    		onDestroy,
    		pieceId,
    		top,
    		left,
    		offX,
    		offY,
    		posX,
    		posY,
    		div,
    		onBoard,
    		changePos,
    		targetPos,
    		changeScale,
    		targetScale,
    		everToggle,
    		toggle,
    		lastPos,
    		offBoardAngle,
    		cssTransformValue,
    		interval,
    		coordToPx
    	});

    	$$self.$inject_state = $$props => {
    		if ('pieceId' in $$props) $$invalidate(0, pieceId = $$props.pieceId);
    		if ('top' in $$props) $$invalidate(8, top = $$props.top);
    		if ('left' in $$props) $$invalidate(9, left = $$props.left);
    		if ('offX' in $$props) $$invalidate(10, offX = $$props.offX);
    		if ('offY' in $$props) $$invalidate(11, offY = $$props.offY);
    		if ('posX' in $$props) $$invalidate(2, posX = $$props.posX);
    		if ('posY' in $$props) $$invalidate(3, posY = $$props.posY);
    		if ('div' in $$props) $$invalidate(4, div = $$props.div);
    		if ('onBoard' in $$props) $$invalidate(1, onBoard = $$props.onBoard);
    		if ('changePos' in $$props) changePos = $$props.changePos;
    		if ('targetPos' in $$props) targetPos = $$props.targetPos;
    		if ('changeScale' in $$props) changeScale = $$props.changeScale;
    		if ('targetScale' in $$props) targetScale = $$props.targetScale;
    		if ('everToggle' in $$props) everToggle = $$props.everToggle;
    		if ('lastPos' in $$props) lastPos = $$props.lastPos;
    		if ('offBoardAngle' in $$props) offBoardAngle = $$props.offBoardAngle;
    		if ('cssTransformValue' in $$props) $$invalidate(5, cssTransformValue = $$props.cssTransformValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*onBoard, left, offX*/ 1538) {
    			$$invalidate(2, posX = onBoard ? left : offX);
    		}

    		if ($$self.$$.dirty & /*onBoard, top, offY*/ 2306) {
    			$$invalidate(3, posY = onBoard ? top : offY);
    		}
    	};

    	return [
    		pieceId,
    		onBoard,
    		posX,
    		posY,
    		div,
    		cssTransformValue,
    		ShapeTypes,
    		toggle,
    		top,
    		left,
    		offX,
    		offY,
    		div_1_binding
    	];
    }

    class Shape extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			pieceId: 0,
    			top: 8,
    			left: 9,
    			offX: 10,
    			offY: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Shape",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pieceId*/ ctx[0] === undefined && !('pieceId' in props)) {
    			console.warn("<Shape> was created without expected prop 'pieceId'");
    		}

    		if (/*top*/ ctx[8] === undefined && !('top' in props)) {
    			console.warn("<Shape> was created without expected prop 'top'");
    		}

    		if (/*left*/ ctx[9] === undefined && !('left' in props)) {
    			console.warn("<Shape> was created without expected prop 'left'");
    		}
    	}

    	get pieceId() {
    		throw new Error("<Shape>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pieceId(value) {
    		throw new Error("<Shape>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get top() {
    		throw new Error("<Shape>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<Shape>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get left() {
    		throw new Error("<Shape>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set left(value) {
    		throw new Error("<Shape>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offX() {
    		throw new Error("<Shape>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offX(value) {
    		throw new Error("<Shape>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offY() {
    		throw new Error("<Shape>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offY(value) {
    		throw new Error("<Shape>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ShapesLayer.svelte generated by Svelte v3.44.3 */

    const { Object: Object_1 } = globals;

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (42:0) {#each Object.values(board.locations) as piece, pieceIndex}
    function create_each_block$1(ctx) {
    	let shape;
    	let current;

    	shape = new Shape({
    			props: {
    				pieceId: /*piece*/ ctx[2].id,
    				top: /*piece*/ ctx[2].topY,
    				left: /*piece*/ ctx[2].leftX,
    				offX: /*offBoardSpots*/ ctx[1][/*pieceIndex*/ ctx[4] % /*offBoardSpots*/ ctx[1].length].x,
    				offY: /*offBoardSpots*/ ctx[1][/*pieceIndex*/ ctx[4] % /*offBoardSpots*/ ctx[1].length].y
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(shape.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(shape, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const shape_changes = {};
    			if (dirty & /*board*/ 1) shape_changes.pieceId = /*piece*/ ctx[2].id;
    			if (dirty & /*board*/ 1) shape_changes.top = /*piece*/ ctx[2].topY;
    			if (dirty & /*board*/ 1) shape_changes.left = /*piece*/ ctx[2].leftX;
    			shape.$set(shape_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(shape.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(shape.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(shape, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(42:0) {#each Object.values(board.locations) as piece, pieceIndex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = Object.values(/*board*/ ctx[0].locations);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Object, board, offBoardSpots*/ 3) {
    				each_value = Object.values(/*board*/ ctx[0].locations);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ShapesLayer', slots, []);
    	let { board } = $$props;

    	let offBoardSpots = [
    		{ x: -3, y: 0 },
    		{ x: -3, y: 3 },
    		{ x: -3, y: 6 },
    		{ x: 8, y: 0 },
    		{ x: 8, y: 3 },
    		{ x: 8, y: 6 }
    	];

    	const writable_props = ['board'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ShapesLayer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('board' in $$props) $$invalidate(0, board = $$props.board);
    	};

    	$$self.$capture_state = () => ({ Shape, board, offBoardSpots });

    	$$self.$inject_state = $$props => {
    		if ('board' in $$props) $$invalidate(0, board = $$props.board);
    		if ('offBoardSpots' in $$props) $$invalidate(1, offBoardSpots = $$props.offBoardSpots);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [board, offBoardSpots];
    }

    class ShapesLayer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { board: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ShapesLayer",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*board*/ ctx[0] === undefined && !('board' in props)) {
    			console.warn("<ShapesLayer> was created without expected prop 'board'");
    		}
    	}

    	get board() {
    		throw new Error("<ShapesLayer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set board(value) {
    		throw new Error("<ShapesLayer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/BoardBackground.svelte generated by Svelte v3.44.3 */

    const file$4 = "src/BoardBackground.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let g5;
    	let path0;
    	let g0;
    	let path1;
    	let g1;
    	let path2;
    	let g2;
    	let path3;
    	let g3;
    	let path4;
    	let g4;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g5 = svg_element("g");
    			path0 = svg_element("path");
    			g0 = svg_element("g");
    			path1 = svg_element("path");
    			g1 = svg_element("g");
    			path2 = svg_element("path");
    			g2 = svg_element("g");
    			path3 = svg_element("path");
    			g3 = svg_element("g");
    			path4 = svg_element("path");
    			g4 = svg_element("g");
    			path5 = svg_element("path");
    			attr_dev(path0, "d", "M342.343,738.308L60.729,738.308C46.573,738.308 35.08,726.815 35.08,712.658L35.08,48.958C35.08,34.801 46.573,23.308 60.729,23.308L661.43,23.308C675.586,23.308 687.08,34.801 687.08,48.958L687.08,199.864C687.586,215.027 696.267,224.038 711.909,224.68L722.148,224.68C759.64,224.68 790.08,255.119 790.08,292.612L790.08,776.749C790.08,814.241 759.64,844.68 722.148,844.68L632.227,844.68C631.457,844.713 630.679,844.729 629.898,844.729L424.935,844.729C394.659,844.729 370.08,820.149 370.08,789.874L370.08,766.286C369.849,748.616 364.223,739.129 342.343,738.308Z");
    			set_style(path0, "fill", "rgb(222,192,136)");
    			set_style(path0, "stroke", "rgb(131,85,0)");
    			set_style(path0, "stroke-width", "10.42px");
    			add_location(path0, file$4, 2, 8, 377);
    			attr_dev(path1, "d", "M178.425,321.099C178.336,316.432 178.332,307.826 178.862,307.45C178.93,306.752 188.018,306.962 192.895,307.09C183.806,307.187 178.42,311.735 178.425,321.099Z");
    			set_style(path1, "fill", "rgb(238,230,214)");
    			add_location(path1, file$4, 4, 12, 1115);
    			attr_dev(g0, "transform", "matrix(8.36081,-0.122878,0.0847507,5.76657,-1470.19,-1711.96)");
    			add_location(g0, file$4, 3, 8, 1025);
    			attr_dev(path2, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path2, "fill", "rgb(238,230,214)");
    			add_location(path2, file$4, 7, 12, 1404);
    			attr_dev(g1, "transform", "matrix(0.70355,0,0,1,194.289,-72.0701)");
    			add_location(g1, file$4, 6, 8, 1337);
    			attr_dev(path3, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C596.727,891.083 541.393,890.922 428.136,893.727C396.701,894.505 360.804,895.512 317.926,896.801Z");
    			set_style(path3, "fill", "rgb(238,230,214)");
    			add_location(path3, file$4, 10, 12, 1719);
    			attr_dev(g2, "transform", "matrix(-0.000388906,1.14319,-1,-0.000340193,1667.86,-99.3781)");
    			add_location(g2, file$4, 9, 8, 1629);
    			attr_dev(path4, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path4, "fill", "rgb(238,230,214)");
    			add_location(path4, file$4, 13, 12, 2081);
    			attr_dev(g3, "transform", "matrix(0.000306889,0.373202,-1,0.000822315,1564.36,-81.2722)");
    			add_location(g3, file$4, 12, 8, 1992);
    			attr_dev(path5, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path5, "fill", "rgb(238,230,214)");
    			add_location(path5, file$4, 16, 12, 2375);
    			attr_dev(g4, "transform", "matrix(0.720629,0,0,1,-182.622,-175.869)");
    			add_location(g4, file$4, 15, 8, 2306);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-29.8712,-18.0998)");
    			add_location(g5, file$4, 1, 4, 319);
    			attr_dev(svg, "width", "850px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 766 832");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xml:space", "preserve");
    			attr_dev(svg, "xmlns:serif", "http://www.serif.com/");
    			set_style(svg, "fill-rule", "evenodd");
    			set_style(svg, "clip-rule", "evenodd");
    			set_style(svg, "stroke-linecap", "round");
    			set_style(svg, "stroke-linejoin", "round");
    			set_style(svg, "stroke-miterlimit", "1.5");
    			add_location(svg, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g5);
    			append_dev(g5, path0);
    			append_dev(g5, g0);
    			append_dev(g0, path1);
    			append_dev(g5, g1);
    			append_dev(g1, path2);
    			append_dev(g5, g2);
    			append_dev(g2, path3);
    			append_dev(g5, g3);
    			append_dev(g3, path4);
    			append_dev(g5, g4);
    			append_dev(g4, path5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BoardBackground', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BoardBackground> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class BoardBackground extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BoardBackground",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/BaseBoard.svelte generated by Svelte v3.44.3 */
    const file$3 = "src/BaseBoard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (47:6) {:else}
    function create_else_block(ctx) {
    	let t_value = '' + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(47:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (45:6) {#if baseBoard[rowIndex][colIndex]}
    function create_if_block$1(ctx) {
    	let t_value = /*baseBoard*/ ctx[0][/*rowIndex*/ ctx[3]][/*colIndex*/ ctx[6]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(45:6) {#if baseBoard[rowIndex][colIndex]}",
    		ctx
    	});

    	return block;
    }

    // (42:4) {#each row as col, colIndex}
    function create_each_block_1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*baseBoard*/ ctx[0][/*rowIndex*/ ctx[3]][/*colIndex*/ ctx[6]]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "cellDiv svelte-44pp6");
    			toggle_class(div, "nonBoardCell", !/*col*/ ctx[4]);
    			add_location(div, file$3, 42, 5, 1082);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(42:4) {#each row as col, colIndex}",
    		ctx
    	});

    	return block;
    }

    // (40:2) {#each baseBoard as row, rowIndex}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*row*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "flexRow svelte-44pp6");
    			add_location(div, file$3, 40, 3, 1024);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*baseBoard*/ 1) {
    				each_value_1 = /*row*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(40:2) {#each baseBoard as row, rowIndex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let boardbackground;
    	let t;
    	let div1;
    	let current;
    	boardbackground = new BoardBackground({ $$inline: true });
    	let each_value = /*baseBoard*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(boardbackground.$$.fragment);
    			t = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "absolute svelte-44pp6");
    			add_location(div0, file$3, 37, 1, 900);
    			attr_dev(div1, "class", "flexCol absolute gap svelte-44pp6");
    			add_location(div1, file$3, 38, 1, 949);
    			add_location(div2, file$3, 36, 0, 893);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(boardbackground, div0, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*baseBoard*/ 1) {
    				each_value = /*baseBoard*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boardbackground.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boardbackground.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(boardbackground);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BaseBoard', slots, []);

    	let baseBoard = [
    		['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', null],
    		['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', null],
    		['1', '2', '3', '4', '5', '6', '7'],
    		['8', '9', '10', '11', '12', '13', '14'],
    		['15', '16', '17', '18', '19', '20', '21'],
    		['22', '23', '24', '25', '26', '27', '28'],
    		['29', '30', '31', 'Sun', 'Mon', 'Tues', 'Wed'],
    		[null, null, null, null, 'Thur', 'Fri', 'Sat']
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BaseBoard> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ BoardBackground, baseBoard });

    	$$self.$inject_state = $$props => {
    		if ('baseBoard' in $$props) $$invalidate(0, baseBoard = $$props.baseBoard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [baseBoard];
    }

    class BaseBoard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BaseBoard",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/BoardHeader.svelte generated by Svelte v3.44.3 */

    const file$2 = "src/BoardHeader.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let h2;
    	let t2;
    	let t3;
    	let div0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Puzzle of the Day";
    			t1 = space();
    			h2 = element("h2");
    			t2 = text(/*dateString*/ ctx[1]);
    			t3 = space();
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Back To Home";
    			add_location(h1, file$2, 1, 2, 35);
    			add_location(h2, file$2, 2, 2, 64);
    			attr_dev(button, "class", "green svelte-a76hxd");
    			add_location(button, file$2, 4, 4, 112);
    			attr_dev(div0, "class", "flexRow svelte-a76hxd");
    			add_location(div0, file$2, 3, 2, 88);
    			set_style(div1, "text-align", "center");
    			add_location(div1, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, h2);
    			append_dev(h2, t2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*clearData*/ ctx[0]())) /*clearData*/ ctx[0]().apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*dateString*/ 2) set_data_dev(t2, /*dateString*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BoardHeader', slots, []);
    	let { clearData } = $$props;
    	let { dateString } = $$props;
    	const writable_props = ['clearData', 'dateString'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BoardHeader> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('clearData' in $$props) $$invalidate(0, clearData = $$props.clearData);
    		if ('dateString' in $$props) $$invalidate(1, dateString = $$props.dateString);
    	};

    	$$self.$capture_state = () => ({ clearData, dateString });

    	$$self.$inject_state = $$props => {
    		if ('clearData' in $$props) $$invalidate(0, clearData = $$props.clearData);
    		if ('dateString' in $$props) $$invalidate(1, dateString = $$props.dateString);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [clearData, dateString];
    }

    class BoardHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { clearData: 0, dateString: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BoardHeader",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*clearData*/ ctx[0] === undefined && !('clearData' in props)) {
    			console.warn("<BoardHeader> was created without expected prop 'clearData'");
    		}

    		if (/*dateString*/ ctx[1] === undefined && !('dateString' in props)) {
    			console.warn("<BoardHeader> was created without expected prop 'dateString'");
    		}
    	}

    	get clearData() {
    		throw new Error("<BoardHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clearData(value) {
    		throw new Error("<BoardHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dateString() {
    		throw new Error("<BoardHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dateString(value) {
    		throw new Error("<BoardHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/BoardScreen.svelte generated by Svelte v3.44.3 */
    const file$1 = "src/BoardScreen.svelte";

    function create_fragment$1(ctx) {
    	let boardheader;
    	let t0;
    	let div;
    	let baseboard;
    	let t1;
    	let shapeslayer;
    	let current;

    	boardheader = new BoardHeader({
    			props: {
    				clearData: /*clearData*/ ctx[1],
    				dateString: /*dateString*/ ctx[2]
    			},
    			$$inline: true
    		});

    	baseboard = new BaseBoard({ $$inline: true });

    	shapeslayer = new ShapesLayer({
    			props: { board: /*board*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(boardheader.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(baseboard.$$.fragment);
    			t1 = space();
    			create_component(shapeslayer.$$.fragment);
    			attr_dev(div, "class", "center svelte-krb9ts");
    			add_location(div, file$1, 11, 0, 297);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(boardheader, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(baseboard, div, null);
    			append_dev(div, t1);
    			mount_component(shapeslayer, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const boardheader_changes = {};
    			if (dirty & /*clearData*/ 2) boardheader_changes.clearData = /*clearData*/ ctx[1];
    			if (dirty & /*dateString*/ 4) boardheader_changes.dateString = /*dateString*/ ctx[2];
    			boardheader.$set(boardheader_changes);
    			const shapeslayer_changes = {};
    			if (dirty & /*board*/ 1) shapeslayer_changes.board = /*board*/ ctx[0];
    			shapeslayer.$set(shapeslayer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boardheader.$$.fragment, local);
    			transition_in(baseboard.$$.fragment, local);
    			transition_in(shapeslayer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boardheader.$$.fragment, local);
    			transition_out(baseboard.$$.fragment, local);
    			transition_out(shapeslayer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(boardheader, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_component(baseboard);
    			destroy_component(shapeslayer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BoardScreen', slots, []);
    	let { board } = $$props;
    	let { clearData } = $$props;
    	let { dateString } = $$props;
    	const writable_props = ['board', 'clearData', 'dateString'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BoardScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('board' in $$props) $$invalidate(0, board = $$props.board);
    		if ('clearData' in $$props) $$invalidate(1, clearData = $$props.clearData);
    		if ('dateString' in $$props) $$invalidate(2, dateString = $$props.dateString);
    	};

    	$$self.$capture_state = () => ({
    		board,
    		clearData,
    		dateString,
    		ShapesLayer,
    		BaseBoard,
    		BoardHeader
    	});

    	$$self.$inject_state = $$props => {
    		if ('board' in $$props) $$invalidate(0, board = $$props.board);
    		if ('clearData' in $$props) $$invalidate(1, clearData = $$props.clearData);
    		if ('dateString' in $$props) $$invalidate(2, dateString = $$props.dateString);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [board, clearData, dateString];
    }

    class BoardScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { board: 0, clearData: 1, dateString: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BoardScreen",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*board*/ ctx[0] === undefined && !('board' in props)) {
    			console.warn("<BoardScreen> was created without expected prop 'board'");
    		}

    		if (/*clearData*/ ctx[1] === undefined && !('clearData' in props)) {
    			console.warn("<BoardScreen> was created without expected prop 'clearData'");
    		}

    		if (/*dateString*/ ctx[2] === undefined && !('dateString' in props)) {
    			console.warn("<BoardScreen> was created without expected prop 'dateString'");
    		}
    	}

    	get board() {
    		throw new Error("<BoardScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set board(value) {
    		throw new Error("<BoardScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get clearData() {
    		throw new Error("<BoardScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clearData(value) {
    		throw new Error("<BoardScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dateString() {
    		throw new Error("<BoardScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dateString(value) {
    		throw new Error("<BoardScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.3 */
    const file = "src/App.svelte";

    // (5:36) 
    function create_if_block_2(ctx) {
    	let homescreen;
    	let updating_weekday;
    	let updating_month;
    	let updating_day;
    	let updating_year;
    	let updating_boards;
    	let t0;
    	let h1;
    	let current;

    	function homescreen_weekday_binding_1(value) {
    		/*homescreen_weekday_binding_1*/ ctx[11](value);
    	}

    	function homescreen_month_binding_1(value) {
    		/*homescreen_month_binding_1*/ ctx[12](value);
    	}

    	function homescreen_day_binding_1(value) {
    		/*homescreen_day_binding_1*/ ctx[13](value);
    	}

    	function homescreen_year_binding_1(value) {
    		/*homescreen_year_binding_1*/ ctx[14](value);
    	}

    	function homescreen_boards_binding_1(value) {
    		/*homescreen_boards_binding_1*/ ctx[15](value);
    	}

    	let homescreen_props = {};

    	if (/*weekday*/ ctx[0] !== void 0) {
    		homescreen_props.weekday = /*weekday*/ ctx[0];
    	}

    	if (/*month*/ ctx[1] !== void 0) {
    		homescreen_props.month = /*month*/ ctx[1];
    	}

    	if (/*day*/ ctx[2] !== void 0) {
    		homescreen_props.day = /*day*/ ctx[2];
    	}

    	if (/*year*/ ctx[3] !== void 0) {
    		homescreen_props.year = /*year*/ ctx[3];
    	}

    	if (/*boards*/ ctx[4] !== void 0) {
    		homescreen_props.boards = /*boards*/ ctx[4];
    	}

    	homescreen = new HomeScreen({ props: homescreen_props, $$inline: true });
    	binding_callbacks.push(() => bind(homescreen, 'weekday', homescreen_weekday_binding_1));
    	binding_callbacks.push(() => bind(homescreen, 'month', homescreen_month_binding_1));
    	binding_callbacks.push(() => bind(homescreen, 'day', homescreen_day_binding_1));
    	binding_callbacks.push(() => bind(homescreen, 'year', homescreen_year_binding_1));
    	binding_callbacks.push(() => bind(homescreen, 'boards', homescreen_boards_binding_1));

    	const block = {
    		c: function create() {
    			create_component(homescreen.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Date does not have a board solution yet. Please pick another :(";
    			add_location(h1, file, 6, 1, 373);
    		},
    		m: function mount(target, anchor) {
    			mount_component(homescreen, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const homescreen_changes = {};

    			if (!updating_weekday && dirty & /*weekday*/ 1) {
    				updating_weekday = true;
    				homescreen_changes.weekday = /*weekday*/ ctx[0];
    				add_flush_callback(() => updating_weekday = false);
    			}

    			if (!updating_month && dirty & /*month*/ 2) {
    				updating_month = true;
    				homescreen_changes.month = /*month*/ ctx[1];
    				add_flush_callback(() => updating_month = false);
    			}

    			if (!updating_day && dirty & /*day*/ 4) {
    				updating_day = true;
    				homescreen_changes.day = /*day*/ ctx[2];
    				add_flush_callback(() => updating_day = false);
    			}

    			if (!updating_year && dirty & /*year*/ 8) {
    				updating_year = true;
    				homescreen_changes.year = /*year*/ ctx[3];
    				add_flush_callback(() => updating_year = false);
    			}

    			if (!updating_boards && dirty & /*boards*/ 16) {
    				updating_boards = true;
    				homescreen_changes.boards = /*boards*/ ctx[4];
    				add_flush_callback(() => updating_boards = false);
    			}

    			homescreen.$set(homescreen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(homescreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(homescreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(homescreen, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(5:36) ",
    		ctx
    	});

    	return block;
    }

    // (3:36) 
    function create_if_block_1(ctx) {
    	let boardscreen;
    	let current;

    	boardscreen = new BoardScreen({
    			props: {
    				board: /*boards*/ ctx[4][/*year*/ ctx[3]][/*month*/ ctx[1]][/*day*/ ctx[2]],
    				clearData: /*clearData*/ ctx[5],
    				dateString: `${/*weekday*/ ctx[0]} ${/*month*/ ctx[1]} ${/*day*/ ctx[2]}`
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(boardscreen.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(boardscreen, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const boardscreen_changes = {};
    			if (dirty & /*boards, year, month, day*/ 30) boardscreen_changes.board = /*boards*/ ctx[4][/*year*/ ctx[3]][/*month*/ ctx[1]][/*day*/ ctx[2]];
    			if (dirty & /*weekday, month, day*/ 7) boardscreen_changes.dateString = `${/*weekday*/ ctx[0]} ${/*month*/ ctx[1]} ${/*day*/ ctx[2]}`;
    			boardscreen.$set(boardscreen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boardscreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boardscreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(boardscreen, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(3:36) ",
    		ctx
    	});

    	return block;
    }

    // (1:0) {#if (!weekday && !month && !day && !year)}
    function create_if_block(ctx) {
    	let homescreen;
    	let updating_weekday;
    	let updating_month;
    	let updating_day;
    	let updating_year;
    	let updating_boards;
    	let current;

    	function homescreen_weekday_binding(value) {
    		/*homescreen_weekday_binding*/ ctx[6](value);
    	}

    	function homescreen_month_binding(value) {
    		/*homescreen_month_binding*/ ctx[7](value);
    	}

    	function homescreen_day_binding(value) {
    		/*homescreen_day_binding*/ ctx[8](value);
    	}

    	function homescreen_year_binding(value) {
    		/*homescreen_year_binding*/ ctx[9](value);
    	}

    	function homescreen_boards_binding(value) {
    		/*homescreen_boards_binding*/ ctx[10](value);
    	}

    	let homescreen_props = {};

    	if (/*weekday*/ ctx[0] !== void 0) {
    		homescreen_props.weekday = /*weekday*/ ctx[0];
    	}

    	if (/*month*/ ctx[1] !== void 0) {
    		homescreen_props.month = /*month*/ ctx[1];
    	}

    	if (/*day*/ ctx[2] !== void 0) {
    		homescreen_props.day = /*day*/ ctx[2];
    	}

    	if (/*year*/ ctx[3] !== void 0) {
    		homescreen_props.year = /*year*/ ctx[3];
    	}

    	if (/*boards*/ ctx[4] !== void 0) {
    		homescreen_props.boards = /*boards*/ ctx[4];
    	}

    	homescreen = new HomeScreen({ props: homescreen_props, $$inline: true });
    	binding_callbacks.push(() => bind(homescreen, 'weekday', homescreen_weekday_binding));
    	binding_callbacks.push(() => bind(homescreen, 'month', homescreen_month_binding));
    	binding_callbacks.push(() => bind(homescreen, 'day', homescreen_day_binding));
    	binding_callbacks.push(() => bind(homescreen, 'year', homescreen_year_binding));
    	binding_callbacks.push(() => bind(homescreen, 'boards', homescreen_boards_binding));

    	const block = {
    		c: function create() {
    			create_component(homescreen.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(homescreen, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const homescreen_changes = {};

    			if (!updating_weekday && dirty & /*weekday*/ 1) {
    				updating_weekday = true;
    				homescreen_changes.weekday = /*weekday*/ ctx[0];
    				add_flush_callback(() => updating_weekday = false);
    			}

    			if (!updating_month && dirty & /*month*/ 2) {
    				updating_month = true;
    				homescreen_changes.month = /*month*/ ctx[1];
    				add_flush_callback(() => updating_month = false);
    			}

    			if (!updating_day && dirty & /*day*/ 4) {
    				updating_day = true;
    				homescreen_changes.day = /*day*/ ctx[2];
    				add_flush_callback(() => updating_day = false);
    			}

    			if (!updating_year && dirty & /*year*/ 8) {
    				updating_year = true;
    				homescreen_changes.year = /*year*/ ctx[3];
    				add_flush_callback(() => updating_year = false);
    			}

    			if (!updating_boards && dirty & /*boards*/ 16) {
    				updating_boards = true;
    				homescreen_changes.boards = /*boards*/ ctx[4];
    				add_flush_callback(() => updating_boards = false);
    			}

    			homescreen.$set(homescreen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(homescreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(homescreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(homescreen, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1:0) {#if (!weekday && !month && !day && !year)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*weekday*/ ctx[0] && !/*month*/ ctx[1] && !/*day*/ ctx[2] && !/*year*/ ctx[3]) return 0;
    		if (/*boards*/ ctx[4][/*year*/ ctx[3]][/*month*/ ctx[1]][/*day*/ ctx[2]]) return 1;
    		if (!/*boards*/ ctx[4][/*year*/ ctx[3]][/*month*/ ctx[1]][/*day*/ ctx[2]]) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let weekday;
    	let month;
    	let day;
    	let year;

    	let clearData = () => {
    		$$invalidate(0, weekday = undefined);
    		$$invalidate(1, month = undefined);
    		$$invalidate(2, day = undefined);
    		$$invalidate(3, year = undefined);
    	};

    	let boards = {
    		"2022": {
    			"January": {
    				"7": {
    					"day": 7,
    					"month": "January",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"S6": { "leftX": 0, "topY": 0, "id": "S6" },
    						"I8": { "leftX": 2, "topY": 0, "id": "I8" },
    						"J5": { "leftX": 5, "topY": 0, "id": "J5" },
    						"Z5": { "leftX": 1, "topY": 1, "id": "Z5" },
    						"L1": { "leftX": 2, "topY": 1, "id": "L1" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "January",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B4": { "leftX": 0, "topY": 0, "id": "B4" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "January",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "January",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"I4": { "leftX": 1, "topY": 0, "id": "I4" },
    						"L2": { "leftX": 2, "topY": 0, "id": "L2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"B6": { "leftX": 0, "topY": 1, "id": "B6" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "January",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"N8": { "leftX": 1, "topY": 0, "id": "N8" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"B6": { "leftX": 1, "topY": 2, "id": "B6" },
    						"Z6": { "leftX": 2, "topY": 2, "id": "Z6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"February": {
    				"3": {
    					"day": 3,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"Z6": { "leftX": 2, "topY": 0, "id": "Z6" },
    						"B8": { "leftX": 4, "topY": 0, "id": "B8" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J8": { "leftX": 2, "topY": 3, "id": "J8" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Tuesday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"U2": { "leftX": 2, "topY": 0, "id": "U2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L1": { "leftX": 2, "topY": 1, "id": "L1" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"U2": { "leftX": 2, "topY": 0, "id": "U2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"J4": { "leftX": 3, "topY": 3, "id": "J4" },
    						"B3": { "leftX": 1, "topY": 4, "id": "B3" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"Z6": { "leftX": 2, "topY": 0, "id": "Z6" },
    						"B8": { "leftX": 4, "topY": 0, "id": "B8" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"J4": { "leftX": 2, "topY": 2, "id": "J4" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"24": {
    					"day": 24,
    					"month": "February",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"Z6": { "leftX": 2, "topY": 0, "id": "Z6" },
    						"B8": { "leftX": 4, "topY": 0, "id": "B8" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"J4": { "leftX": 2, "topY": 2, "id": "J4" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"U3": { "leftX": 1, "topY": 4, "id": "U3" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"March": {
    				"3": {
    					"day": 3,
    					"month": "March",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L1": { "leftX": 2, "topY": 1, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "March",
    					"year": "2022",
    					"weekday": "Monday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"U1": { "leftX": 1, "topY": 0, "id": "U1" },
    						"Z2": { "leftX": 3, "topY": 0, "id": "Z2" },
    						"T1": { "leftX": 4, "topY": 1, "id": "T1" },
    						"J8": { "leftX": 0, "topY": 3, "id": "J8" },
    						"S1": { "leftX": 0, "topY": 4, "id": "S1" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I6": { "leftX": 4, "topY": 4, "id": "I6" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "March",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I7": { "leftX": 1, "topY": 2, "id": "I7" },
    						"S6": { "leftX": 0, "topY": 3, "id": "S6" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "March",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B8": { "leftX": 0, "topY": 0, "id": "B8" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"U3": { "leftX": 2, "topY": 1, "id": "U3" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"Z5": { "leftX": 1, "topY": 2, "id": "Z5" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"24": {
    					"day": 24,
    					"month": "March",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"B6": { "leftX": 5, "topY": 1, "id": "B6" },
    						"U4": { "leftX": 0, "topY": 3, "id": "U4" },
    						"N2": { "leftX": 1, "topY": 3, "id": "N2" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"April": {
    				"1": {
    					"day": 1,
    					"month": "April",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"Z2": { "leftX": 3, "topY": 0, "id": "Z2" },
    						"L3": { "leftX": 1, "topY": 1, "id": "L3" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"J4": { "leftX": 2, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "April",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"Z2": { "leftX": 3, "topY": 0, "id": "Z2" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"U4": { "leftX": 2, "topY": 1, "id": "U4" },
    						"T1": { "leftX": 4, "topY": 1, "id": "T1" },
    						"B7": { "leftX": 0, "topY": 4, "id": "B7" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "April",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"B2": { "leftX": 4, "topY": 0, "id": "B2" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"N3": { "leftX": 3, "topY": 1, "id": "N3" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "April",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"U1": { "leftX": 2, "topY": 0, "id": "U1" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"B5": { "leftX": 0, "topY": 4, "id": "B5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"May": {
    				"5": {
    					"day": 5,
    					"month": "May",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B1": { "leftX": 0, "topY": 0, "id": "B1" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"T3": { "leftX": 1, "topY": 2, "id": "T3" },
    						"Z5": { "leftX": 3, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "May",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"B5": { "leftX": 1, "topY": 0, "id": "B5" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T3": { "leftX": 4, "topY": 2, "id": "T3" },
    						"I8": { "leftX": 0, "topY": 3, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 3, "id": "N4" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "May",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"T2": { "leftX": 0, "topY": 1, "id": "T2" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"June": {
    				"3": {
    					"day": 3,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 1, "topY": 0, "id": "Z5" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"I6": { "leftX": 1, "topY": 2, "id": "I6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Tuesday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"N7": { "leftX": 3, "topY": 0, "id": "N7" },
    						"L2": { "leftX": 0, "topY": 1, "id": "L2" },
    						"T1": { "leftX": 4, "topY": 1, "id": "T1" },
    						"Z6": { "leftX": 0, "topY": 2, "id": "Z6" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U1": { "leftX": 4, "topY": 6, "id": "U1" },
    						"U3": { "leftX": 6, "topY": 6, "id": "U3" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B3": { "leftX": 0, "topY": 0, "id": "B3" },
    						"Z6": { "leftX": 2, "topY": 0, "id": "Z6" },
    						"N1": { "leftX": 4, "topY": 0, "id": "N1" },
    						"U4": { "leftX": 0, "topY": 2, "id": "U4" },
    						"T4": { "leftX": 2, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T1": { "leftX": 2, "topY": 0, "id": "T1" },
    						"S2": { "leftX": 4, "topY": 0, "id": "S2" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Tuesday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 0, "id": "Z1" },
    						"N8": { "leftX": 2, "topY": 0, "id": "N8" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"B2": { "leftX": 0, "topY": 3, "id": "B2" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"N2": { "leftX": 1, "topY": 0, "id": "N2" },
    						"B5": { "leftX": 3, "topY": 1, "id": "B5" },
    						"T2": { "leftX": 0, "topY": 2, "id": "T2" },
    						"Z5": { "leftX": 3, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"B6": { "leftX": 4, "topY": 0, "id": "B6" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"U3": { "leftX": 1, "topY": 2, "id": "U3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"Z5": { "leftX": 0, "topY": 3, "id": "Z5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "June",
    					"year": "2022",
    					"weekday": "Monday",
    					"locations": {
    						"N3": { "leftX": 0, "topY": 0, "id": "N3" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"I6": { "leftX": 1, "topY": 4, "id": "I6" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"July": {
    				"1": {
    					"day": 1,
    					"month": "July",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"I5": { "leftX": 1, "topY": 1, "id": "I5" },
    						"S2": { "leftX": 2, "topY": 1, "id": "S2" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "July",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B6": { "leftX": 5, "topY": 2, "id": "B6" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "July",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"I2": { "leftX": 0, "topY": 0, "id": "I2" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"N5": { "leftX": 0, "topY": 1, "id": "N5" },
    						"Z2": { "leftX": 3, "topY": 1, "id": "Z2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "July",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"B3": { "leftX": 4, "topY": 3, "id": "B3" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "July",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"August": {
    				"4": {
    					"day": 4,
    					"month": "August",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z6": { "leftX": 3, "topY": 1, "id": "Z6" },
    						"B6": { "leftX": 0, "topY": 3, "id": "B6" },
    						"T3": { "leftX": 1, "topY": 3, "id": "T3" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"5": {
    					"day": 5,
    					"month": "August",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"N2": { "leftX": 1, "topY": 1, "id": "N2" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T2": { "leftX": 1, "topY": 2, "id": "T2" },
    						"Z5": { "leftX": 4, "topY": 2, "id": "Z5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "August",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"J8": { "leftX": 0, "topY": 0, "id": "J8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N4": { "leftX": 0, "topY": 1, "id": "N4" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T2": { "leftX": 1, "topY": 2, "id": "T2" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "August",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"T2": { "leftX": 2, "topY": 1, "id": "T2" },
    						"B6": { "leftX": 5, "topY": 1, "id": "B6" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				}
    			},
    			"September": {
    				"8": {
    					"day": 8,
    					"month": "September",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"U2": { "leftX": 0, "topY": 2, "id": "U2" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "September",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"I3": { "leftX": 0, "topY": 0, "id": "I3" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"S2": { "leftX": 1, "topY": 1, "id": "S2" },
    						"L4": { "leftX": 3, "topY": 1, "id": "L4" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "September",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"T1": { "leftX": 0, "topY": 1, "id": "T1" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"N6": { "leftX": 2, "topY": 2, "id": "N6" },
    						"B7": { "leftX": 0, "topY": 4, "id": "B7" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"22": {
    					"day": 22,
    					"month": "September",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"J5": { "leftX": 0, "topY": 0, "id": "J5" },
    						"U3": { "leftX": 1, "topY": 0, "id": "U3" },
    						"B2": { "leftX": 4, "topY": 0, "id": "B2" },
    						"T3": { "leftX": 1, "topY": 2, "id": "T3" },
    						"Z5": { "leftX": 3, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 4, "id": "N6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "September",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"J8": { "leftX": 1, "topY": 0, "id": "J8" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"I3": { "leftX": 0, "topY": 3, "id": "I3" },
    						"N2": { "leftX": 3, "topY": 3, "id": "N2" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"October": {
    				"7": {
    					"day": 7,
    					"month": "October",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"J8": { "leftX": 2, "topY": 0, "id": "J8" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"S6": { "leftX": 3, "topY": 1, "id": "S6" },
    						"T1": { "leftX": 4, "topY": 1, "id": "T1" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "October",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"Z6": { "leftX": 1, "topY": 0, "id": "Z6" },
    						"B1": { "leftX": 3, "topY": 0, "id": "B1" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "October",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"U3": { "leftX": 2, "topY": 0, "id": "U3" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"B3": { "leftX": 2, "topY": 3, "id": "B3" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"November": {
    				"3": {
    					"day": 3,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"T3": { "leftX": 3, "topY": 2, "id": "T3" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"N4": { "leftX": 0, "topY": 3, "id": "N4" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"5": {
    					"day": 5,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"I2": { "leftX": 3, "topY": 0, "id": "I2" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"Z6": { "leftX": 2, "topY": 1, "id": "Z6" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Tuesday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"T3": { "leftX": 1, "topY": 2, "id": "T3" },
    						"I4": { "leftX": 4, "topY": 2, "id": "I4" },
    						"S6": { "leftX": 0, "topY": 3, "id": "S6" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"12": {
    					"day": 12,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Saturday",
    					"locations": {
    						"N8": { "leftX": 0, "topY": 0, "id": "N8" },
    						"I2": { "leftX": 3, "topY": 0, "id": "I2" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T3": { "leftX": 2, "topY": 2, "id": "T3" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"B8": { "leftX": 0, "topY": 2, "id": "B8" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N6": { "leftX": 2, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"I5": { "leftX": 2, "topY": 1, "id": "I5" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "November",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"J1": { "leftX": 2, "topY": 0, "id": "J1" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"I3": { "leftX": 0, "topY": 1, "id": "I3" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"December": {
    				"1": {
    					"day": 1,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 3, "topY": 0, "id": "J5" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"N5": { "leftX": 2, "topY": 0, "id": "N5" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"Z6": { "leftX": 0, "topY": 2, "id": "Z6" },
    						"L4": { "leftX": 3, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"I3": { "leftX": 0, "topY": 0, "id": "I3" },
    						"J8": { "leftX": 2, "topY": 0, "id": "J8" },
    						"S2": { "leftX": 1, "topY": 1, "id": "S2" },
    						"L4": { "leftX": 3, "topY": 1, "id": "L4" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"T4": { "leftX": 1, "topY": 1, "id": "T4" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"J8": { "leftX": 2, "topY": 3, "id": "J8" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"22": {
    					"day": 22,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Thursday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"B1": { "leftX": 0, "topY": 1, "id": "B1" },
    						"Z1": { "leftX": 0, "topY": 2, "id": "Z1" },
    						"L4": { "leftX": 3, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N6": { "leftX": 0, "topY": 4, "id": "N6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "December",
    					"year": "2022",
    					"weekday": "Friday",
    					"locations": {
    						"I3": { "leftX": 0, "topY": 0, "id": "I3" },
    						"N5": { "leftX": 1, "topY": 0, "id": "N5" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"J4": { "leftX": 2, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			}
    		},
    		"2023": {
    			"January": {
    				"5": {
    					"day": 5,
    					"month": "January",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"N5": { "leftX": 0, "topY": 0, "id": "N5" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"B7": { "leftX": 4, "topY": 2, "id": "B7" },
    						"U1": { "leftX": 0, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"12": {
    					"day": 12,
    					"month": "January",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"N5": { "leftX": 0, "topY": 0, "id": "N5" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"B1": { "leftX": 4, "topY": 2, "id": "B1" },
    						"U1": { "leftX": 0, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "January",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J8": { "leftX": 1, "topY": 0, "id": "J8" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"L4": { "leftX": 2, "topY": 1, "id": "L4" },
    						"I2": { "leftX": 4, "topY": 2, "id": "I2" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "January",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"I2": { "leftX": 1, "topY": 0, "id": "I2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"B1": { "leftX": 0, "topY": 1, "id": "B1" },
    						"N3": { "leftX": 4, "topY": 1, "id": "N3" },
    						"T4": { "leftX": 0, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 1, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				}
    			},
    			"February": {
    				"2": {
    					"day": 2,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"U2": { "leftX": 2, "topY": 0, "id": "U2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L1": { "leftX": 2, "topY": 1, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"3": {
    					"day": 3,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"I4": { "leftX": 0, "topY": 0, "id": "I4" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"L4": { "leftX": 3, "topY": 1, "id": "L4" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"S5": { "leftX": 0, "topY": 2, "id": "S5" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J5": { "leftX": 0, "topY": 0, "id": "J5" },
    						"S1": { "leftX": 1, "topY": 0, "id": "S1" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"T2": { "leftX": 1, "topY": 1, "id": "T2" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Tuesday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"N2": { "leftX": 1, "topY": 0, "id": "N2" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"B2": { "leftX": 0, "topY": 3, "id": "B2" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U1": { "leftX": 0, "topY": 0, "id": "U1" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"B2": { "leftX": 0, "topY": 2, "id": "B2" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"I5": { "leftX": 4, "topY": 1, "id": "I5" },
    						"J3": { "leftX": 0, "topY": 2, "id": "J3" },
    						"L3": { "leftX": 1, "topY": 3, "id": "L3" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"N5": { "leftX": 4, "topY": 0, "id": "N5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"I4": { "leftX": 1, "topY": 2, "id": "I4" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "February",
    					"year": "2023",
    					"weekday": "Monday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"S5": { "leftX": 2, "topY": 0, "id": "S5" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"L3": { "leftX": 2, "topY": 2, "id": "L3" },
    						"J8": { "leftX": 3, "topY": 3, "id": "J8" },
    						"I4": { "leftX": 1, "topY": 4, "id": "I4" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"March": {
    				"9": {
    					"day": 9,
    					"month": "March",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"B3": { "leftX": 0, "topY": 0, "id": "B3" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"U4": { "leftX": 0, "topY": 2, "id": "U4" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "March",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"N3": { "leftX": 0, "topY": 0, "id": "N3" },
    						"J4": { "leftX": 1, "topY": 0, "id": "J4" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"T3": { "leftX": 2, "topY": 2, "id": "T3" },
    						"Z5": { "leftX": 4, "topY": 2, "id": "Z5" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "March",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"B8": { "leftX": 0, "topY": 0, "id": "B8" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"U2": { "leftX": 4, "topY": 1, "id": "U2" },
    						"Z1": { "leftX": 0, "topY": 2, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 2, "id": "T3" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "March",
    					"year": "2023",
    					"weekday": "Monday",
    					"locations": {
    						"N3": { "leftX": 0, "topY": 0, "id": "N3" },
    						"S2": { "leftX": 1, "topY": 0, "id": "S2" },
    						"J1": { "leftX": 2, "topY": 0, "id": "J1" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"I6": { "leftX": 1, "topY": 4, "id": "I6" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"April": {
    				"13": {
    					"day": 13,
    					"month": "April",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"B2": { "leftX": 4, "topY": 0, "id": "B2" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"N3": { "leftX": 3, "topY": 1, "id": "N3" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "April",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"S6": { "leftX": 3, "topY": 0, "id": "S6" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"J4": { "leftX": 2, "topY": 2, "id": "J4" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "April",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"B4": { "leftX": 3, "topY": 0, "id": "B4" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"I2": { "leftX": 3, "topY": 3, "id": "I2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "April",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"S1": { "leftX": 3, "topY": 0, "id": "S1" },
    						"J7": { "leftX": 1, "topY": 1, "id": "J7" },
    						"Z5": { "leftX": 3, "topY": 1, "id": "Z5" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I4": { "leftX": 4, "topY": 4, "id": "I4" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B1": { "leftX": 4, "topY": 6, "id": "B1" }
    					}
    				}
    			},
    			"May": {
    				"4": {
    					"day": 4,
    					"month": "May",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"B1": { "leftX": 4, "topY": 2, "id": "B1" },
    						"N6": { "leftX": 3, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "May",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"N3": { "leftX": 0, "topY": 0, "id": "N3" },
    						"B5": { "leftX": 1, "topY": 0, "id": "B5" },
    						"T2": { "leftX": 3, "topY": 0, "id": "T2" },
    						"Z2": { "leftX": 1, "topY": 2, "id": "Z2" },
    						"U1": { "leftX": 4, "topY": 2, "id": "U1" },
    						"L4": { "leftX": 0, "topY": 3, "id": "L4" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "May",
    					"year": "2023",
    					"weekday": "Tuesday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"T3": { "leftX": 3, "topY": 2, "id": "T3" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "May",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"I4": { "leftX": 0, "topY": 0, "id": "I4" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"B6": { "leftX": 0, "topY": 2, "id": "B6" },
    						"Z6": { "leftX": 1, "topY": 2, "id": "Z6" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "May",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"J3": { "leftX": 0, "topY": 1, "id": "J3" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"Z6": { "leftX": 3, "topY": 2, "id": "Z6" },
    						"B8": { "leftX": 5, "topY": 2, "id": "B8" },
    						"N4": { "leftX": 0, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"June": {
    				"1": {
    					"day": 1,
    					"month": "June",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"T1": { "leftX": 0, "topY": 1, "id": "T1" },
    						"B8": { "leftX": 4, "topY": 1, "id": "B8" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N4": { "leftX": 1, "topY": 3, "id": "N4" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "June",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"B3": { "leftX": 0, "topY": 0, "id": "B3" },
    						"Z6": { "leftX": 2, "topY": 0, "id": "Z6" },
    						"N1": { "leftX": 4, "topY": 0, "id": "N1" },
    						"U2": { "leftX": 0, "topY": 2, "id": "U2" },
    						"T4": { "leftX": 2, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "June",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"I5": { "leftX": 0, "topY": 0, "id": "I5" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "June",
    					"year": "2023",
    					"weekday": "Tuesday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 0, "id": "Z1" },
    						"N8": { "leftX": 2, "topY": 0, "id": "N8" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"B2": { "leftX": 0, "topY": 3, "id": "B2" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "June",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"N3": { "leftX": 0, "topY": 0, "id": "N3" },
    						"J8": { "leftX": 1, "topY": 0, "id": "J8" },
    						"L3": { "leftX": 2, "topY": 1, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 1, "id": "Z5" },
    						"I6": { "leftX": 4, "topY": 2, "id": "I6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"July": {
    				"1": {
    					"day": 1,
    					"month": "July",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"I3": { "leftX": 4, "topY": 1, "id": "I3" },
    						"Z5": { "leftX": 0, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 1, "topY": 2, "id": "L1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"6": {
    					"day": 6,
    					"month": "July",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "July",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"Z6": { "leftX": 4, "topY": 1, "id": "Z6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"L2": { "leftX": 2, "topY": 2, "id": "L2" },
    						"I2": { "leftX": 1, "topY": 3, "id": "I2" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "July",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"N7": { "leftX": 1, "topY": 1, "id": "N7" },
    						"Z2": { "leftX": 3, "topY": 1, "id": "Z2" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"B5": { "leftX": 2, "topY": 4, "id": "B5" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "July",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B8": { "leftX": 5, "topY": 2, "id": "B8" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"August": {
    				"3": {
    					"day": 3,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"Z1": { "leftX": 2, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"J6": { "leftX": 0, "topY": 2, "id": "J6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"B5": { "leftX": 0, "topY": 4, "id": "B5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"4": {
    					"day": 4,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"I5": { "leftX": 2, "topY": 1, "id": "I5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"Z1": { "leftX": 2, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"U3": { "leftX": 1, "topY": 2, "id": "U3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"B5": { "leftX": 0, "topY": 4, "id": "B5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"Z1": { "leftX": 2, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"T3": { "leftX": 1, "topY": 2, "id": "T3" },
    						"I6": { "leftX": 4, "topY": 2, "id": "I6" },
    						"S6": { "leftX": 0, "topY": 3, "id": "S6" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"J3": { "leftX": 3, "topY": 0, "id": "J3" },
    						"B4": { "leftX": 4, "topY": 0, "id": "B4" },
    						"L3": { "leftX": 0, "topY": 2, "id": "L3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"Z2": { "leftX": 0, "topY": 3, "id": "Z2" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "August",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"September": {
    				"1": {
    					"day": 1,
    					"month": "September",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S5": { "leftX": 0, "topY": 1, "id": "S5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I6": { "leftX": 1, "topY": 2, "id": "I6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "September",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"N5": { "leftX": 0, "topY": 1, "id": "N5" },
    						"Z2": { "leftX": 3, "topY": 1, "id": "Z2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "September",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"B2": { "leftX": 0, "topY": 0, "id": "B2" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"Z5": { "leftX": 1, "topY": 1, "id": "Z5" },
    						"L1": { "leftX": 2, "topY": 1, "id": "L1" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "September",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"Z1": { "leftX": 1, "topY": 1, "id": "Z1" },
    						"T4": { "leftX": 4, "topY": 1, "id": "T4" },
    						"B1": { "leftX": 0, "topY": 3, "id": "B1" },
    						"N4": { "leftX": 3, "topY": 3, "id": "N4" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"October": {
    				"13": {
    					"day": 13,
    					"month": "October",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"I2": { "leftX": 3, "topY": 0, "id": "I2" },
    						"S5": { "leftX": 1, "topY": 1, "id": "S5" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"J4": { "leftX": 1, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "October",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"B8": { "leftX": 0, "topY": 0, "id": "B8" },
    						"I3": { "leftX": 2, "topY": 0, "id": "I3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N3": { "leftX": 4, "topY": 1, "id": "N3" },
    						"T4": { "leftX": 0, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 1, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "October",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"B4": { "leftX": 0, "topY": 1, "id": "B4" },
    						"N1": { "leftX": 5, "topY": 1, "id": "N1" },
    						"L1": { "leftX": 0, "topY": 2, "id": "L1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"November": {
    				"2": {
    					"day": 2,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"3": {
    					"day": 3,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"J8": { "leftX": 0, "topY": 0, "id": "J8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S1": { "leftX": 0, "topY": 1, "id": "S1" },
    						"L1": { "leftX": 1, "topY": 1, "id": "L1" },
    						"I4": { "leftX": 4, "topY": 2, "id": "I4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"J3": { "leftX": 0, "topY": 2, "id": "J3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N6": { "leftX": 2, "topY": 3, "id": "N6" },
    						"B3": { "leftX": 1, "topY": 4, "id": "B3" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"N8": { "leftX": 0, "topY": 0, "id": "N8" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"I7": { "leftX": 0, "topY": 1, "id": "I7" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T3": { "leftX": 2, "topY": 2, "id": "T3" },
    						"Z5": { "leftX": 4, "topY": 2, "id": "Z5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"B1": { "leftX": 0, "topY": 0, "id": "B1" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"T4": { "leftX": 0, "topY": 1, "id": "T4" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"N6": { "leftX": 1, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 0, "id": "N4" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"L3": { "leftX": 0, "topY": 2, "id": "L3" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"Z2": { "leftX": 0, "topY": 3, "id": "Z2" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"J5": { "leftX": 0, "topY": 0, "id": "J5" },
    						"L3": { "leftX": 1, "topY": 0, "id": "L3" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"B8": { "leftX": 2, "topY": 1, "id": "B8" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"Z5": { "leftX": 0, "topY": 3, "id": "Z5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "November",
    					"year": "2023",
    					"weekday": "Monday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"N4": { "leftX": 1, "topY": 0, "id": "N4" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"S1": { "leftX": 0, "topY": 2, "id": "S1" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"Z5": { "leftX": 0, "topY": 3, "id": "Z5" },
    						"I6": { "leftX": 1, "topY": 4, "id": "I6" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"December": {
    				"2": {
    					"day": 2,
    					"month": "December",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"I3": { "leftX": 4, "topY": 0, "id": "I3" },
    						"T4": { "leftX": 0, "topY": 2, "id": "T4" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"N4": { "leftX": 1, "topY": 3, "id": "N4" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "December",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"U3": { "leftX": 1, "topY": 1, "id": "U3" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B6": { "leftX": 5, "topY": 2, "id": "B6" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "December",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"Z6": { "leftX": 1, "topY": 0, "id": "Z6" },
    						"B5": { "leftX": 3, "topY": 0, "id": "B5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "December",
    					"year": "2023",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"Z6": { "leftX": 2, "topY": 1, "id": "Z6" },
    						"I5": { "leftX": 2, "topY": 2, "id": "I5" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "December",
    					"year": "2023",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"U3": { "leftX": 1, "topY": 1, "id": "U3" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			}
    		},
    		"2024": {
    			"January": {
    				"4": {
    					"day": 4,
    					"month": "January",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"N8": { "leftX": 1, "topY": 0, "id": "N8" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"T1": { "leftX": 0, "topY": 2, "id": "T1" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"5": {
    					"day": 5,
    					"month": "January",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 1, "topY": 0, "id": "I8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"L3": { "leftX": 2, "topY": 1, "id": "L3" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "January",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"N6": { "leftX": 1, "topY": 0, "id": "N6" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T3": { "leftX": 2, "topY": 2, "id": "T3" },
    						"I6": { "leftX": 4, "topY": 2, "id": "I6" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "January",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"N2": { "leftX": 0, "topY": 0, "id": "N2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"I7": { "leftX": 2, "topY": 1, "id": "I7" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"B2": { "leftX": 0, "topY": 2, "id": "B2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "January",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"Z6": { "leftX": 1, "topY": 0, "id": "Z6" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"J3": { "leftX": 0, "topY": 1, "id": "J3" },
    						"B6": { "leftX": 4, "topY": 1, "id": "B6" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N4": { "leftX": 0, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"February": {
    				"1": {
    					"day": 1,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"B4": { "leftX": 4, "topY": 0, "id": "B4" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"J8": { "leftX": 2, "topY": 3, "id": "J8" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"2": {
    					"day": 2,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"N8": { "leftX": 1, "topY": 3, "id": "N8" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"3": {
    					"day": 3,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"I4": { "leftX": 0, "topY": 0, "id": "I4" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"N5": { "leftX": 4, "topY": 0, "id": "N5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 2, "id": "Z1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U1": { "leftX": 0, "topY": 0, "id": "U1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"B7": { "leftX": 2, "topY": 1, "id": "B7" },
    						"Z6": { "leftX": 0, "topY": 2, "id": "Z6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N6": { "leftX": 2, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J3": { "leftX": 0, "topY": 2, "id": "J3" },
    						"S1": { "leftX": 1, "topY": 3, "id": "S1" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Tuesday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"N2": { "leftX": 1, "topY": 0, "id": "N2" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"B2": { "leftX": 0, "topY": 3, "id": "B2" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U1": { "leftX": 0, "topY": 0, "id": "U1" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"B8": { "leftX": 0, "topY": 2, "id": "B8" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"L2": { "leftX": 2, "topY": 0, "id": "L2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z5": { "leftX": 1, "topY": 1, "id": "Z5" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"J8": { "leftX": 2, "topY": 3, "id": "J8" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Tuesday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"N2": { "leftX": 1, "topY": 0, "id": "N2" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"B2": { "leftX": 0, "topY": 3, "id": "B2" },
    						"U3": { "leftX": 4, "topY": 3, "id": "U3" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"22": {
    					"day": 22,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U1": { "leftX": 0, "topY": 0, "id": "U1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"T2": { "leftX": 1, "topY": 1, "id": "T2" },
    						"J1": { "leftX": 3, "topY": 1, "id": "J1" },
    						"Z1": { "leftX": 0, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"N6": { "leftX": 0, "topY": 4, "id": "N6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "February",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J3": { "leftX": 0, "topY": 2, "id": "J3" },
    						"N8": { "leftX": 1, "topY": 3, "id": "N8" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"March": {
    				"14": {
    					"day": 14,
    					"month": "March",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"N6": { "leftX": 0, "topY": 0, "id": "N6" },
    						"B1": { "leftX": 3, "topY": 0, "id": "B1" },
    						"T4": { "leftX": 0, "topY": 1, "id": "T4" },
    						"Z5": { "leftX": 1, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 2, "topY": 2, "id": "L1" },
    						"U4": { "leftX": 5, "topY": 2, "id": "U4" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"April": {
    				"4": {
    					"day": 4,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"U1": { "leftX": 2, "topY": 0, "id": "U1" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"N4": { "leftX": 1, "topY": 3, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"Z5": { "leftX": 2, "topY": 0, "id": "Z5" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"U1": { "leftX": 2, "topY": 3, "id": "U1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Monday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"U1": { "leftX": 2, "topY": 0, "id": "U1" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"S1": { "leftX": 0, "topY": 4, "id": "S1" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I6": { "leftX": 4, "topY": 4, "id": "I6" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"Z5": { "leftX": 2, "topY": 0, "id": "Z5" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"U3": { "leftX": 2, "topY": 3, "id": "U3" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"I3": { "leftX": 4, "topY": 0, "id": "I3" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"Z6": { "leftX": 2, "topY": 1, "id": "Z6" },
    						"B6": { "leftX": 5, "topY": 1, "id": "B6" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "April",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"B2": { "leftX": 4, "topY": 0, "id": "B2" },
    						"J5": { "leftX": 0, "topY": 1, "id": "J5" },
    						"Z2": { "leftX": 1, "topY": 1, "id": "Z2" },
    						"U1": { "leftX": 3, "topY": 2, "id": "U1" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N4": { "leftX": 0, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"May": {
    				"2": {
    					"day": 2,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"T3": { "leftX": 3, "topY": 2, "id": "T3" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"B6": { "leftX": 0, "topY": 0, "id": "B6" },
    						"J7": { "leftX": 1, "topY": 0, "id": "J7" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"I6": { "leftX": 3, "topY": 0, "id": "I6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"L3": { "leftX": 3, "topY": 2, "id": "L3" },
    						"Z5": { "leftX": 4, "topY": 2, "id": "Z5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"B1": { "leftX": 0, "topY": 0, "id": "B1" },
    						"U1": { "leftX": 3, "topY": 0, "id": "U1" },
    						"T4": { "leftX": 0, "topY": 1, "id": "T4" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"N6": { "leftX": 1, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"I5": { "leftX": 4, "topY": 1, "id": "I5" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"I6": { "leftX": 2, "topY": 2, "id": "I6" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"B8": { "leftX": 2, "topY": 0, "id": "B8" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"U3": { "leftX": 0, "topY": 4, "id": "U3" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "May",
    					"year": "2024",
    					"weekday": "Monday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"J3": { "leftX": 0, "topY": 2, "id": "J3" },
    						"S5": { "leftX": 1, "topY": 3, "id": "S5" },
    						"I4": { "leftX": 1, "topY": 4, "id": "I4" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"June": {
    				"6": {
    					"day": 6,
    					"month": "June",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"U4": { "leftX": 4, "topY": 1, "id": "U4" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"B7": { "leftX": 1, "topY": 4, "id": "B7" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "June",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"J1": { "leftX": 3, "topY": 0, "id": "J1" },
    						"I5": { "leftX": 5, "topY": 1, "id": "I5" },
    						"S5": { "leftX": 0, "topY": 2, "id": "S5" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "June",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"B2": { "leftX": 4, "topY": 1, "id": "B2" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "June",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"B6": { "leftX": 4, "topY": 0, "id": "B6" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"U3": { "leftX": 1, "topY": 2, "id": "U3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"Z5": { "leftX": 0, "topY": 3, "id": "Z5" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"July": {
    				"4": {
    					"day": 4,
    					"month": "July",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"N6": { "leftX": 0, "topY": 0, "id": "N6" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"L3": { "leftX": 0, "topY": 2, "id": "L3" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"Z2": { "leftX": 0, "topY": 3, "id": "Z2" },
    						"B5": { "leftX": 2, "topY": 4, "id": "B5" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "July",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"I7": { "leftX": 0, "topY": 0, "id": "I7" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z6": { "leftX": 3, "topY": 1, "id": "Z6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T2": { "leftX": 1, "topY": 2, "id": "T2" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "July",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"Z6": { "leftX": 0, "topY": 0, "id": "Z6" },
    						"B5": { "leftX": 2, "topY": 0, "id": "B5" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"I5": { "leftX": 4, "topY": 1, "id": "I5" },
    						"T4": { "leftX": 0, "topY": 2, "id": "T4" },
    						"L1": { "leftX": 1, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				}
    			},
    			"August": {
    				"1": {
    					"day": 1,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"B1": { "leftX": 3, "topY": 0, "id": "B1" },
    						"Z5": { "leftX": 1, "topY": 1, "id": "Z5" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"J2": { "leftX": 2, "topY": 3, "id": "J2" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"2": {
    					"day": 2,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"S2": { "leftX": 3, "topY": 0, "id": "S2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"I1": { "leftX": 1, "topY": 1, "id": "I1" },
    						"J4": { "leftX": 3, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"B7": { "leftX": 2, "topY": 1, "id": "B7" },
    						"Z6": { "leftX": 0, "topY": 2, "id": "Z6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N6": { "leftX": 2, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"I5": { "leftX": 0, "topY": 0, "id": "I5" },
    						"S5": { "leftX": 1, "topY": 0, "id": "S5" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"Z5": { "leftX": 2, "topY": 1, "id": "Z5" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"B8": { "leftX": 0, "topY": 2, "id": "B8" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"22": {
    					"day": 22,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"J3": { "leftX": 2, "topY": 1, "id": "J3" },
    						"N1": { "leftX": 5, "topY": 1, "id": "N1" },
    						"S6": { "leftX": 0, "topY": 2, "id": "S6" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I4": { "leftX": 4, "topY": 4, "id": "I4" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B1": { "leftX": 4, "topY": 6, "id": "B1" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "August",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"I3": { "leftX": 0, "topY": 0, "id": "I3" },
    						"Z2": { "leftX": 1, "topY": 0, "id": "Z2" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"L1": { "leftX": 1, "topY": 1, "id": "L1" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"September": {
    				"5": {
    					"day": 5,
    					"month": "September",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"U4": { "leftX": 1, "topY": 2, "id": "U4" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"6": {
    					"day": 6,
    					"month": "September",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"S6": { "leftX": 4, "topY": 0, "id": "S6" },
    						"I5": { "leftX": 1, "topY": 1, "id": "I5" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "September",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"B8": { "leftX": 3, "topY": 0, "id": "B8" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				}
    			},
    			"October": {
    				"4": {
    					"day": 4,
    					"month": "October",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"J8": { "leftX": 0, "topY": 0, "id": "J8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S6": { "leftX": 0, "topY": 1, "id": "S6" },
    						"T1": { "leftX": 1, "topY": 1, "id": "T1" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "October",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"J2": { "leftX": 1, "topY": 0, "id": "J2" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"S5": { "leftX": 0, "topY": 2, "id": "S5" },
    						"I6": { "leftX": 4, "topY": 2, "id": "I6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "October",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"J2": { "leftX": 1, "topY": 0, "id": "J2" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"24": {
    					"day": 24,
    					"month": "October",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"J2": { "leftX": 1, "topY": 0, "id": "J2" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"U3": { "leftX": 1, "topY": 4, "id": "U3" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"November": {
    				"1": {
    					"day": 1,
    					"month": "November",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"J3": { "leftX": 3, "topY": 0, "id": "J3" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"N2": { "leftX": 3, "topY": 3, "id": "N2" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "November",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"Z6": { "leftX": 1, "topY": 0, "id": "Z6" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B6": { "leftX": 5, "topY": 2, "id": "B6" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "November",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"T4": { "leftX": 2, "topY": 1, "id": "T4" },
    						"Z6": { "leftX": 0, "topY": 2, "id": "Z6" },
    						"N4": { "leftX": 3, "topY": 2, "id": "N4" },
    						"L4": { "leftX": 0, "topY": 3, "id": "L4" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "November",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"U4": { "leftX": 3, "topY": 0, "id": "U4" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"B1": { "leftX": 3, "topY": 3, "id": "B1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"December": {
    				"2": {
    					"day": 2,
    					"month": "December",
    					"year": "2024",
    					"weekday": "Monday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"Z5": { "leftX": 0, "topY": 2, "id": "Z5" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"S1": { "leftX": 0, "topY": 4, "id": "S1" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I6": { "leftX": 4, "topY": 4, "id": "I6" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				},
    				"6": {
    					"day": 6,
    					"month": "December",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"S6": { "leftX": 2, "topY": 0, "id": "S6" },
    						"Z2": { "leftX": 3, "topY": 0, "id": "Z2" },
    						"I5": { "leftX": 1, "topY": 1, "id": "I5" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "December",
    					"year": "2024",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"I8": { "leftX": 3, "topY": 0, "id": "I8" },
    						"S5": { "leftX": 1, "topY": 1, "id": "S5" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"J4": { "leftX": 1, "topY": 2, "id": "J4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "December",
    					"year": "2024",
    					"weekday": "Saturday",
    					"locations": {
    						"B5": { "leftX": 0, "topY": 0, "id": "B5" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"T2": { "leftX": 2, "topY": 1, "id": "T2" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 2, "id": "Z1" },
    						"I3": { "leftX": 5, "topY": 2, "id": "I3" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "December",
    					"year": "2024",
    					"weekday": "Thursday",
    					"locations": {
    						"B1": { "leftX": 0, "topY": 0, "id": "B1" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"Z6": { "leftX": 1, "topY": 2, "id": "Z6" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			}
    		},
    		"2025": {
    			"January": {
    				"2": {
    					"day": 2,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"U4": { "leftX": 0, "topY": 1, "id": "U4" },
    						"N7": { "leftX": 2, "topY": 1, "id": "N7" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"B3": { "leftX": 0, "topY": 4, "id": "B3" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"B7": { "leftX": 0, "topY": 0, "id": "B7" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"U4": { "leftX": 0, "topY": 2, "id": "U4" },
    						"L1": { "leftX": 0, "topY": 3, "id": "L1" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 1, "topY": 0, "id": "I8" },
    						"Z5": { "leftX": 2, "topY": 0, "id": "Z5" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"N8": { "leftX": 1, "topY": 0, "id": "N8" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"B1": { "leftX": 0, "topY": 1, "id": "B1" },
    						"Z1": { "leftX": 0, "topY": 2, "id": "Z1" },
    						"L4": { "leftX": 3, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I2": { "leftX": 1, "topY": 0, "id": "I2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N8": { "leftX": 0, "topY": 1, "id": "N8" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T4": { "leftX": 1, "topY": 2, "id": "T4" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"I8": { "leftX": 1, "topY": 0, "id": "I8" },
    						"T2": { "leftX": 2, "topY": 0, "id": "T2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"B6": { "leftX": 0, "topY": 1, "id": "B6" },
    						"L1": { "leftX": 0, "topY": 2, "id": "L1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"B2": { "leftX": 1, "topY": 0, "id": "B2" },
    						"Z2": { "leftX": 2, "topY": 0, "id": "Z2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"L4": { "leftX": 0, "topY": 1, "id": "L4" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"U3": { "leftX": 0, "topY": 4, "id": "U3" },
    						"J8": { "leftX": 3, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "January",
    					"year": "2025",
    					"weekday": "Monday",
    					"locations": {
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 4, "topY": 0, "id": "J5" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"S2": { "leftX": 0, "topY": 1, "id": "S2" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"I6": { "leftX": 1, "topY": 4, "id": "I6" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"February": {
    				"6": {
    					"day": 6,
    					"month": "February",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 3, "topY": 1, "id": "Z6" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"B2": { "leftX": 2, "topY": 2, "id": "B2" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "February",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 2, "topY": 0, "id": "L2" },
    						"J5": { "leftX": 5, "topY": 0, "id": "J5" },
    						"I5": { "leftX": 3, "topY": 1, "id": "I5" },
    						"S5": { "leftX": 0, "topY": 2, "id": "S5" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "February",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"B6": { "leftX": 0, "topY": 0, "id": "B6" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "February",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"L4": { "leftX": 3, "topY": 1, "id": "L4" },
    						"I4": { "leftX": 4, "topY": 1, "id": "I4" },
    						"S5": { "leftX": 0, "topY": 2, "id": "S5" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "February",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"S5": { "leftX": 2, "topY": 0, "id": "S5" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"L3": { "leftX": 2, "topY": 2, "id": "L3" },
    						"J2": { "leftX": 3, "topY": 3, "id": "J2" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I4": { "leftX": 4, "topY": 4, "id": "I4" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B1": { "leftX": 4, "topY": 6, "id": "B1" }
    					}
    				}
    			},
    			"March": {
    				"3": {
    					"day": 3,
    					"month": "March",
    					"year": "2025",
    					"weekday": "Monday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J8": { "leftX": 0, "topY": 3, "id": "J8" },
    						"S1": { "leftX": 0, "topY": 4, "id": "S1" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I6": { "leftX": 4, "topY": 4, "id": "I6" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "March",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I5": { "leftX": 0, "topY": 0, "id": "I5" },
    						"S2": { "leftX": 1, "topY": 0, "id": "S2" },
    						"L3": { "leftX": 3, "topY": 0, "id": "L3" },
    						"Z6": { "leftX": 4, "topY": 1, "id": "Z6" },
    						"J6": { "leftX": 1, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "March",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"N6": { "leftX": 0, "topY": 0, "id": "N6" },
    						"B1": { "leftX": 3, "topY": 0, "id": "B1" },
    						"T4": { "leftX": 0, "topY": 1, "id": "T4" },
    						"Z5": { "leftX": 1, "topY": 2, "id": "Z5" },
    						"L1": { "leftX": 2, "topY": 2, "id": "L1" },
    						"U2": { "leftX": 5, "topY": 2, "id": "U2" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"April": {
    				"3": {
    					"day": 3,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"J2": { "leftX": 1, "topY": 1, "id": "J2" },
    						"U1": { "leftX": 1, "topY": 2, "id": "U1" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"B1": { "leftX": 4, "topY": 3, "id": "B1" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"4": {
    					"day": 4,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"Z5": { "leftX": 2, "topY": 0, "id": "Z5" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"L4": { "leftX": 1, "topY": 1, "id": "L4" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"N2": { "leftX": 3, "topY": 3, "id": "N2" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"L2": { "leftX": 2, "topY": 1, "id": "L2" },
    						"U2": { "leftX": 2, "topY": 2, "id": "U2" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"11": {
    					"day": 11,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"J8": { "leftX": 1, "topY": 1, "id": "J8" },
    						"S1": { "leftX": 1, "topY": 2, "id": "S1" },
    						"I4": { "leftX": 4, "topY": 2, "id": "I4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"17": {
    					"day": 17,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"N3": { "leftX": 0, "topY": 1, "id": "N3" },
    						"L3": { "leftX": 2, "topY": 1, "id": "L3" },
    						"U4": { "leftX": 3, "topY": 2, "id": "U4" },
    						"B1": { "leftX": 4, "topY": 3, "id": "B1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "April",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"N5": { "leftX": 3, "topY": 0, "id": "N5" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"May": {
    				"1": {
    					"day": 1,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"B7": { "leftX": 3, "topY": 2, "id": "B7" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"U1": { "leftX": 0, "topY": 3, "id": "U1" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"3": {
    					"day": 3,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"N5": { "leftX": 4, "topY": 0, "id": "N5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 2, "id": "Z1" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"T4": { "leftX": 0, "topY": 0, "id": "T4" },
    						"N8": { "leftX": 1, "topY": 0, "id": "N8" },
    						"L1": { "leftX": 3, "topY": 0, "id": "L1" },
    						"Z2": { "leftX": 0, "topY": 2, "id": "Z2" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"U3": { "leftX": 2, "topY": 3, "id": "U3" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"9": {
    					"day": 9,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"S5": { "leftX": 0, "topY": 0, "id": "S5" },
    						"J7": { "leftX": 2, "topY": 0, "id": "J7" },
    						"I5": { "leftX": 5, "topY": 0, "id": "I5" },
    						"Z1": { "leftX": 0, "topY": 1, "id": "Z1" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"15": {
    					"day": 15,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"B6": { "leftX": 0, "topY": 0, "id": "B6" },
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"L2": { "leftX": 4, "topY": 2, "id": "L2" },
    						"U2": { "leftX": 0, "topY": 3, "id": "U2" },
    						"J8": { "leftX": 2, "topY": 3, "id": "J8" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"23": {
    					"day": 23,
    					"month": "May",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"L3": { "leftX": 0, "topY": 1, "id": "L3" },
    						"T1": { "leftX": 3, "topY": 1, "id": "T1" },
    						"I8": { "leftX": 1, "topY": 2, "id": "I8" },
    						"Z5": { "leftX": 0, "topY": 3, "id": "Z5" },
    						"S1": { "leftX": 2, "topY": 4, "id": "S1" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				}
    			},
    			"June": {
    				"5": {
    					"day": 5,
    					"month": "June",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"J3": { "leftX": 0, "topY": 0, "id": "J3" },
    						"T3": { "leftX": 2, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"U2": { "leftX": 4, "topY": 1, "id": "U2" },
    						"N7": { "leftX": 0, "topY": 2, "id": "N7" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"B7": { "leftX": 1, "topY": 4, "id": "B7" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"12": {
    					"day": 12,
    					"month": "June",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"B1": { "leftX": 2, "topY": 0, "id": "B1" },
    						"Z6": { "leftX": 1, "topY": 1, "id": "Z6" },
    						"T2": { "leftX": 3, "topY": 1, "id": "T2" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "June",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"Z1": { "leftX": 1, "topY": 0, "id": "Z1" },
    						"I2": { "leftX": 2, "topY": 0, "id": "I2" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"J6": { "leftX": 1, "topY": 2, "id": "J6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"19": {
    					"day": 19,
    					"month": "June",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"L2": { "leftX": 2, "topY": 0, "id": "L2" },
    						"T3": { "leftX": 1, "topY": 1, "id": "T3" },
    						"N1": { "leftX": 5, "topY": 1, "id": "N1" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"B3": { "leftX": 0, "topY": 3, "id": "B3" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			},
    			"July": {
    				"3": {
    					"day": 3,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U2": { "leftX": 0, "topY": 0, "id": "U2" },
    						"Z1": { "leftX": 2, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"J6": { "leftX": 0, "topY": 2, "id": "J6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"B5": { "leftX": 0, "topY": 4, "id": "B5" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"4": {
    					"day": 4,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"J2": { "leftX": 0, "topY": 0, "id": "J2" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S6": { "leftX": 0, "topY": 1, "id": "S6" },
    						"T1": { "leftX": 1, "topY": 1, "id": "T1" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I8": { "leftX": 0, "topY": 4, "id": "I8" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"5": {
    					"day": 5,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"I7": { "leftX": 0, "topY": 0, "id": "I7" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T4": { "leftX": 0, "topY": 2, "id": "T4" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"N4": { "leftX": 1, "topY": 3, "id": "N4" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"12": {
    					"day": 12,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"T3": { "leftX": 0, "topY": 0, "id": "T3" },
    						"I2": { "leftX": 3, "topY": 0, "id": "I2" },
    						"Z2": { "leftX": 1, "topY": 1, "id": "Z2" },
    						"N5": { "leftX": 3, "topY": 1, "id": "N5" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I7": { "leftX": 0, "topY": 0, "id": "I7" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"T2": { "leftX": 3, "topY": 0, "id": "T2" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"N4": { "leftX": 1, "topY": 2, "id": "N4" },
    						"Z5": { "leftX": 4, "topY": 2, "id": "Z5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"22": {
    					"day": 22,
    					"month": "July",
    					"year": "2025",
    					"weekday": "Tuesday",
    					"locations": {
    						"L2": { "leftX": 0, "topY": 0, "id": "L2" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"N5": { "leftX": 0, "topY": 1, "id": "N5" },
    						"T4": { "leftX": 4, "topY": 1, "id": "T4" },
    						"Z5": { "leftX": 1, "topY": 2, "id": "Z5" },
    						"B7": { "leftX": 4, "topY": 3, "id": "B7" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				}
    			},
    			"August": {
    				"1": {
    					"day": 1,
    					"month": "August",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"J1": { "leftX": 2, "topY": 0, "id": "J1" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S6": { "leftX": 1, "topY": 1, "id": "S6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "August",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"Z5": { "leftX": 3, "topY": 0, "id": "Z5" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B6": { "leftX": 5, "topY": 2, "id": "B6" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"8": {
    					"day": 8,
    					"month": "August",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"I3": { "leftX": 0, "topY": 0, "id": "I3" },
    						"Z1": { "leftX": 2, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"T3": { "leftX": 1, "topY": 2, "id": "T3" },
    						"J6": { "leftX": 3, "topY": 2, "id": "J6" },
    						"S6": { "leftX": 0, "topY": 3, "id": "S6" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"14": {
    					"day": 14,
    					"month": "August",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U4": { "leftX": 0, "topY": 0, "id": "U4" },
    						"L3": { "leftX": 2, "topY": 0, "id": "L3" },
    						"T1": { "leftX": 4, "topY": 0, "id": "T1" },
    						"Z2": { "leftX": 2, "topY": 1, "id": "Z2" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"B3": { "leftX": 4, "topY": 3, "id": "B3" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"21": {
    					"day": 21,
    					"month": "August",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"J3": { "leftX": 2, "topY": 1, "id": "J3" },
    						"S2": { "leftX": 5, "topY": 1, "id": "S2" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"U1": { "leftX": 1, "topY": 4, "id": "U1" },
    						"I4": { "leftX": 4, "topY": 4, "id": "I4" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B1": { "leftX": 4, "topY": 6, "id": "B1" }
    					}
    				}
    			},
    			"September": {
    				"19": {
    					"day": 19,
    					"month": "September",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"L4": { "leftX": 0, "topY": 0, "id": "L4" },
    						"J8": { "leftX": 1, "topY": 0, "id": "J8" },
    						"N3": { "leftX": 5, "topY": 0, "id": "N3" },
    						"Z6": { "leftX": 3, "topY": 1, "id": "Z6" },
    						"T2": { "leftX": 1, "topY": 2, "id": "T2" },
    						"I5": { "leftX": 0, "topY": 3, "id": "I5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "September",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"B5": { "leftX": 3, "topY": 0, "id": "B5" },
    						"N7": { "leftX": 0, "topY": 1, "id": "N7" },
    						"Z5": { "leftX": 3, "topY": 1, "id": "Z5" },
    						"T1": { "leftX": 1, "topY": 2, "id": "T1" },
    						"I6": { "leftX": 4, "topY": 2, "id": "I6" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				}
    			},
    			"October": {
    				"3": {
    					"day": 3,
    					"month": "October",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"J8": { "leftX": 0, "topY": 0, "id": "J8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S1": { "leftX": 0, "topY": 1, "id": "S1" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"I6": { "leftX": 1, "topY": 2, "id": "I6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"N4": { "leftX": 1, "topY": 4, "id": "N4" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"10": {
    					"day": 10,
    					"month": "October",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"T3": { "leftX": 1, "topY": 0, "id": "T3" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"I5": { "leftX": 3, "topY": 2, "id": "I5" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "October",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"U3": { "leftX": 0, "topY": 0, "id": "U3" },
    						"T3": { "leftX": 3, "topY": 0, "id": "T3" },
    						"B4": { "leftX": 0, "topY": 1, "id": "B4" },
    						"N1": { "leftX": 5, "topY": 1, "id": "N1" },
    						"L4": { "leftX": 2, "topY": 2, "id": "L4" },
    						"Z1": { "leftX": 3, "topY": 2, "id": "Z1" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"18": {
    					"day": 18,
    					"month": "October",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"I2": { "leftX": 3, "topY": 0, "id": "I2" },
    						"Z2": { "leftX": 0, "topY": 1, "id": "Z2" },
    						"T2": { "leftX": 2, "topY": 1, "id": "T2" },
    						"B2": { "leftX": 5, "topY": 2, "id": "B2" },
    						"N4": { "leftX": 0, "topY": 3, "id": "N4" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"27": {
    					"day": 27,
    					"month": "October",
    					"year": "2025",
    					"weekday": "Monday",
    					"locations": {
    						"J8": { "leftX": 0, "topY": 0, "id": "J8" },
    						"Z6": { "leftX": 4, "topY": 0, "id": "Z6" },
    						"S5": { "leftX": 1, "topY": 1, "id": "S5" },
    						"L4": { "leftX": 4, "topY": 1, "id": "L4" },
    						"N6": { "leftX": 0, "topY": 2, "id": "N6" },
    						"T4": { "leftX": 0, "topY": 3, "id": "T4" },
    						"I6": { "leftX": 1, "topY": 4, "id": "I6" },
    						"U3": { "leftX": 4, "topY": 4, "id": "U3" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B7": { "leftX": 4, "topY": 6, "id": "B7" }
    					}
    				}
    			},
    			"November": {
    				"6": {
    					"day": 6,
    					"month": "November",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"N1": { "leftX": 0, "topY": 0, "id": "N1" },
    						"Z6": { "leftX": 1, "topY": 0, "id": "Z6" },
    						"U3": { "leftX": 3, "topY": 0, "id": "U3" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T2": { "leftX": 2, "topY": 2, "id": "T2" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"J6": { "leftX": 0, "topY": 4, "id": "J6" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"7": {
    					"day": 7,
    					"month": "November",
    					"year": "2025",
    					"weekday": "Friday",
    					"locations": {
    						"N8": { "leftX": 0, "topY": 0, "id": "N8" },
    						"L2": { "leftX": 3, "topY": 0, "id": "L2" },
    						"Z6": { "leftX": 0, "topY": 1, "id": "Z6" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"I7": { "leftX": 2, "topY": 2, "id": "I7" },
    						"T4": { "leftX": 4, "topY": 2, "id": "T4" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"B7": { "leftX": 4, "topY": 4, "id": "B7" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"U3": { "leftX": 4, "topY": 6, "id": "U3" }
    					}
    				},
    				"13": {
    					"day": 13,
    					"month": "November",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"B2": { "leftX": 0, "topY": 0, "id": "B2" },
    						"Z2": { "leftX": 1, "topY": 0, "id": "Z2" },
    						"U2": { "leftX": 4, "topY": 0, "id": "U2" },
    						"T1": { "leftX": 2, "topY": 1, "id": "T1" },
    						"L1": { "leftX": 4, "topY": 2, "id": "L1" },
    						"N6": { "leftX": 0, "topY": 3, "id": "N6" },
    						"J4": { "leftX": 0, "topY": 4, "id": "J4" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "November",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"N6": { "leftX": 0, "topY": 0, "id": "N6" },
    						"J2": { "leftX": 2, "topY": 0, "id": "J2" },
    						"Z1": { "leftX": 0, "topY": 1, "id": "Z1" },
    						"L3": { "leftX": 3, "topY": 2, "id": "L3" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"U4": { "leftX": 0, "topY": 3, "id": "U4" },
    						"S5": { "leftX": 1, "topY": 4, "id": "S5" },
    						"I4": { "leftX": 4, "topY": 4, "id": "I4" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"B1": { "leftX": 4, "topY": 6, "id": "B1" }
    					}
    				}
    			},
    			"December": {
    				"11": {
    					"day": 11,
    					"month": "December",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"J5": { "leftX": 0, "topY": 2, "id": "J5" },
    						"B6": { "leftX": 1, "topY": 2, "id": "B6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"N2": { "leftX": 2, "topY": 4, "id": "N2" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				},
    				"16": {
    					"day": 16,
    					"month": "December",
    					"year": "2025",
    					"weekday": "Tuesday",
    					"locations": {
    						"L3": { "leftX": 0, "topY": 0, "id": "L3" },
    						"T2": { "leftX": 1, "topY": 0, "id": "T2" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"N5": { "leftX": 0, "topY": 2, "id": "N5" },
    						"Z1": { "leftX": 2, "topY": 2, "id": "Z1" },
    						"B4": { "leftX": 5, "topY": 2, "id": "B4" },
    						"S1": { "leftX": 1, "topY": 4, "id": "S1" },
    						"J2": { "leftX": 3, "topY": 5, "id": "J2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"I4": { "leftX": 4, "topY": 6, "id": "I4" }
    					}
    				},
    				"20": {
    					"day": 20,
    					"month": "December",
    					"year": "2025",
    					"weekday": "Saturday",
    					"locations": {
    						"I8": { "leftX": 0, "topY": 0, "id": "I8" },
    						"N2": { "leftX": 2, "topY": 0, "id": "N2" },
    						"B6": { "leftX": 1, "topY": 1, "id": "B6" },
    						"Z1": { "leftX": 4, "topY": 1, "id": "Z1" },
    						"L4": { "leftX": 0, "topY": 2, "id": "L4" },
    						"T4": { "leftX": 3, "topY": 2, "id": "T4" },
    						"U1": { "leftX": 4, "topY": 4, "id": "U1" },
    						"J8": { "leftX": 0, "topY": 5, "id": "J8" },
    						"|1": { "leftX": 1, "topY": 6, "id": "|1" },
    						"S1": { "leftX": 4, "topY": 6, "id": "S1" }
    					}
    				},
    				"25": {
    					"day": 25,
    					"month": "December",
    					"year": "2025",
    					"weekday": "Thursday",
    					"locations": {
    						"Z1": { "leftX": 0, "topY": 0, "id": "Z1" },
    						"L2": { "leftX": 1, "topY": 0, "id": "L2" },
    						"U4": { "leftX": 4, "topY": 0, "id": "U4" },
    						"N6": { "leftX": 0, "topY": 2, "id": "N6" },
    						"T2": { "leftX": 4, "topY": 2, "id": "T2" },
    						"B6": { "leftX": 0, "topY": 3, "id": "B6" },
    						"J8": { "leftX": 2, "topY": 4, "id": "J8" },
    						"I2": { "leftX": 4, "topY": 5, "id": "I2" },
    						"|1": { "leftX": 0, "topY": 6, "id": "|1" },
    						"S5": { "leftX": 4, "topY": 6, "id": "S5" }
    					}
    				}
    			}
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function homescreen_weekday_binding(value) {
    		weekday = value;
    		$$invalidate(0, weekday);
    	}

    	function homescreen_month_binding(value) {
    		month = value;
    		$$invalidate(1, month);
    	}

    	function homescreen_day_binding(value) {
    		day = value;
    		$$invalidate(2, day);
    	}

    	function homescreen_year_binding(value) {
    		year = value;
    		$$invalidate(3, year);
    	}

    	function homescreen_boards_binding(value) {
    		boards = value;
    		$$invalidate(4, boards);
    	}

    	function homescreen_weekday_binding_1(value) {
    		weekday = value;
    		$$invalidate(0, weekday);
    	}

    	function homescreen_month_binding_1(value) {
    		month = value;
    		$$invalidate(1, month);
    	}

    	function homescreen_day_binding_1(value) {
    		day = value;
    		$$invalidate(2, day);
    	}

    	function homescreen_year_binding_1(value) {
    		year = value;
    		$$invalidate(3, year);
    	}

    	function homescreen_boards_binding_1(value) {
    		boards = value;
    		$$invalidate(4, boards);
    	}

    	$$self.$capture_state = () => ({
    		HomeScreen,
    		BoardScreen,
    		weekday,
    		month,
    		day,
    		year,
    		clearData,
    		boards
    	});

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(0, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(1, month = $$props.month);
    		if ('day' in $$props) $$invalidate(2, day = $$props.day);
    		if ('year' in $$props) $$invalidate(3, year = $$props.year);
    		if ('clearData' in $$props) $$invalidate(5, clearData = $$props.clearData);
    		if ('boards' in $$props) $$invalidate(4, boards = $$props.boards);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		weekday,
    		month,
    		day,
    		year,
    		boards,
    		clearData,
    		homescreen_weekday_binding,
    		homescreen_month_binding,
    		homescreen_day_binding,
    		homescreen_year_binding,
    		homescreen_boards_binding,
    		homescreen_weekday_binding_1,
    		homescreen_month_binding_1,
    		homescreen_day_binding_1,
    		homescreen_year_binding_1,
    		homescreen_boards_binding_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

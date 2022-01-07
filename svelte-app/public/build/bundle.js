
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

    const file$s = "src/HomeScreen.svelte";

    function create_fragment$u(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Select a Date";
    			t1 = space();
    			input = element("input");
    			add_location(h1, file$s, 14, 2, 248);
    			attr_dev(input, "type", "date");
    			attr_dev(input, "id", "start");
    			attr_dev(input, "name", "date-pick");
    			attr_dev(input, "min", "2022-01-01");
    			attr_dev(input, "max", "2022-12-31");
    			add_location(input, file$s, 15, 2, 273);
    			attr_dev(div, "class", "center svelte-17f3t0z");
    			add_location(div, file$s, 13, 0, 225);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*pickDate*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
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

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('HomeScreen', slots, []);
    	let { weekday } = $$props;
    	let { month } = $$props;
    	let { day } = $$props;

    	let pickDate = e => {
    		const date = new Date(e.target.value);
    		$$invalidate(1, weekday = date.getDay());
    		$$invalidate(2, month = date.getMonth());
    		$$invalidate(3, day = date.getDate());
    	};

    	const writable_props = ['weekday', 'month', 'day'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HomeScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('weekday' in $$props) $$invalidate(1, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(2, month = $$props.month);
    		if ('day' in $$props) $$invalidate(3, day = $$props.day);
    	};

    	$$self.$capture_state = () => ({ weekday, month, day, pickDate });

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(1, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(2, month = $$props.month);
    		if ('day' in $$props) $$invalidate(3, day = $$props.day);
    		if ('pickDate' in $$props) $$invalidate(0, pickDate = $$props.pickDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pickDate, weekday, month, day];
    }

    class HomeScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, { weekday: 1, month: 2, day: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HomeScreen",
    			options,
    			id: create_fragment$u.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*weekday*/ ctx[1] === undefined && !('weekday' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'weekday'");
    		}

    		if (/*month*/ ctx[2] === undefined && !('month' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'month'");
    		}

    		if (/*day*/ ctx[3] === undefined && !('day' in props)) {
    			console.warn("<HomeScreen> was created without expected prop 'day'");
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
    }

    /* src/shapes/B/B1.svelte generated by Svelte v3.44.3 */

    const file$r = "src/shapes/B/B1.svelte";

    function create_fragment$t(ctx) {
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
    			add_location(path0, file$r, 5, 20, 508);
    			attr_dev(g0, "transform", "matrix(6.16264e-17,1.00643,-1,6.12323e-17,1888.82,-208.311)");
    			add_location(g0, file$r, 4, 16, 412);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$r, 8, 20, 876);
    			attr_dev(g1, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1642.54,-21.1068)");
    			add_location(g1, file$r, 7, 16, 773);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$r, 11, 20, 1130);
    			attr_dev(g2, "transform", "matrix(1,0,0,0.787396,1389.68,50.33)");
    			add_location(g2, file$r, 10, 16, 1057);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$r, 14, 20, 1407);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1818.35,32.4863)");
    			add_location(g3, file$r, 13, 16, 1311);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$r, 17, 20, 1686);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1342.91,-96.1897)");
    			add_location(g4, file$r, 16, 16, 1588);
    			add_location(g5, file$r, 3, 12, 392);
    			add_location(g6, file$r, 2, 8, 376);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1513.08,-205.322)");
    			add_location(g7, file$r, 1, 4, 318);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$r, 0, 0, 0);
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
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props) {
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
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B1",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    /* src/shapes/B/B2.svelte generated by Svelte v3.44.3 */

    const file$q = "src/shapes/B/B2.svelte";

    function create_fragment$s(ctx) {
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
    			add_location(path0, file$q, 5, 20, 229);
    			attr_dev(g0, "transform", "matrix(1.00643,0,0,1,1130.68,233.588)");
    			add_location(g0, file$q, 4, 16, 155);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$q, 8, 20, 591);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1373.89,154.866)");
    			add_location(g1, file$q, 7, 16, 494);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$q, 11, 20, 860);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1675.65,328.858)");
    			add_location(g2, file$q, 10, 16, 758);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$q, 14, 20, 1143);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1726.46,279.625)");
    			add_location(g3, file$q, 13, 16, 1041);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$q, 17, 20, 1399);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,1370.68,298.688)");
    			add_location(g4, file$q, 16, 16, 1324);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$q, 20, 20, 1661);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,1318.34,476.319)");
    			add_location(g5, file$q, 19, 16, 1580);
    			add_location(g6, file$q, 3, 12, 135);
    			add_location(g7, file$q, 2, 8, 119);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1544.31,-455.159)");
    			add_location(g8, file$q, 1, 4, 61);
    			attr_dev(svg, "width", "206px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 155");
    			add_location(svg, file$q, 0, 0, 0);
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
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props) {
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
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B2",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* src/shapes/B/B3.svelte generated by Svelte v3.44.3 */

    const file$p = "src/shapes/B/B3.svelte";

    function create_fragment$r(ctx) {
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
    			add_location(path0, file$p, 5, 18, 497);
    			attr_dev(g0, "transform", "matrix(6.16264e-17,-1.00643,1,6.12323e-17,1295.78,1285.69)");
    			add_location(g0, file$p, 4, 14, 404);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$p, 8, 18, 853);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1345.96,465.952)");
    			add_location(g1, file$p, 7, 14, 758);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$p, 11, 18, 1109);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,1929.95,593.966)");
    			add_location(g2, file$p, 10, 14, 1016);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$p, 14, 18, 1365);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1338.65,691.031)");
    			add_location(g3, file$p, 13, 14, 1286);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$p, 17, 18, 1621);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1389.89,739.624)");
    			add_location(g4, file$p, 16, 14, 1542);
    			add_location(g5, file$p, 3, 10, 386);
    			add_location(g6, file$p, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1517.35,-767.893)");
    			add_location(g7, file$p, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$p, 0, 0, 0);
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
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props) {
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
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B3",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* src/shapes/B/B4.svelte generated by Svelte v3.44.3 */

    const file$o = "src/shapes/B/B4.svelte";

    function create_fragment$q(ctx) {
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
    			add_location(path0, file$o, 5, 18, 499);
    			attr_dev(g0, "transform", "matrix(-1.00643,-1.23253e-16,1.22465e-16,-1,2057.81,1431.25)");
    			add_location(g0, file$o, 4, 14, 404);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$o, 8, 18, 855);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1369.61,804.696)");
    			add_location(g1, file$o, 7, 14, 760);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$o, 11, 18, 1112);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1419.7,753.416)");
    			add_location(g2, file$o, 10, 14, 1018);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$o, 14, 18, 1369);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1801.09,932.379)");
    			add_location(g3, file$o, 13, 14, 1275);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$o, 17, 18, 1618);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,1365.62,797.536)");
    			add_location(g4, file$o, 16, 14, 1546);
    			add_location(g5, file$o, 3, 10, 386);
    			add_location(g6, file$o, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1540.01,-1055.51)");
    			add_location(g7, file$o, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$o, 0, 0, 0);
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
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props) {
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
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B4",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* src/shapes/B/B5.svelte generated by Svelte v3.44.3 */

    const file$n = "src/shapes/B/B5.svelte";

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
    			attr_dev(path0, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path0, "fill", "rgb(100,113,255)");
    			set_style(path0, "stroke", "rgb(0,2,88)");
    			set_style(path0, "stroke-width", "4.15px");
    			add_location(path0, file$n, 4, 14, 475);
    			attr_dev(g0, "transform", "matrix(-6.16264e-17,1.00643,1,6.12323e-17,1300.32,973.308)");
    			add_location(g0, file$n, 3, 10, 386);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$n, 7, 14, 823);
    			attr_dev(g1, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1546.6,1160.51)");
    			add_location(g1, file$n, 6, 10, 728);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$n, 10, 14, 1082);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,0.787396,4.82141e-17,1370.79,1214.11)");
    			add_location(g2, file$n, 9, 10, 992);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$n, 13, 14, 1341);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1351.7,1086.52)");
    			add_location(g3, file$n, 12, 10, 1251);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$n, 16, 14, 1571);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1396.18,1307.12)");
    			add_location(g4, file$n, 15, 10, 1496);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$n, 19, 14, 1815);
    			attr_dev(g5, "transform", "matrix(1.01426,0,0,0.393698,1345.07,1357.23)");
    			add_location(g5, file$n, 18, 10, 1740);
    			add_location(g6, file$n, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1521.89,-1386.94)");
    			add_location(g7, file$n, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$n, 0, 0, 0);
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
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B5",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* src/shapes/B/B6.svelte generated by Svelte v3.44.3 */

    const file$m = "src/shapes/B/B6.svelte";

    function create_fragment$o(ctx) {
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
    			add_location(path0, file$m, 4, 14, 455);
    			attr_dev(g0, "transform", "matrix(-1.00643,0,0,1,2058.46,1415.21)");
    			add_location(g0, file$m, 3, 10, 386);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$m, 7, 14, 804);
    			attr_dev(g1, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1513.49,1510.48)");
    			add_location(g1, file$m, 6, 10, 708);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$m, 10, 14, 1069);
    			attr_dev(g2, "transform", "matrix(-6.21054e-17,1.01426,0.393698,2.41071e-17,1462.68,1461.24)");
    			add_location(g2, file$m, 9, 10, 973);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$m, 13, 14, 1307);
    			attr_dev(g3, "transform", "matrix(-1,0,0,1.27952,1904.37,1378.52)");
    			add_location(g3, file$m, 12, 10, 1238);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$m, 16, 14, 1567);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1369.99,1335.34)");
    			add_location(g4, file$m, 15, 10, 1476);
    			add_location(g5, file$m, 2, 6, 372);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-1540.66,-1636.78)");
    			add_location(g6, file$m, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$m, 0, 0, 0);
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
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props) {
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
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B6",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* src/shapes/B/B7.svelte generated by Svelte v3.44.3 */

    const file$l = "src/shapes/B/B7.svelte";

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
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$l, 4, 14, 457);
    			attr_dev(g0, "transform", "matrix(-1,0,0,0.787396,1931.17,1795.72)");
    			add_location(g0, file$l, 3, 10, 387);
    			attr_dev(path1, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path1, "fill", "rgb(100,113,255)");
    			set_style(path1, "stroke", "rgb(0,2,88)");
    			set_style(path1, "stroke-width", "4.15px");
    			add_location(path1, file$l, 7, 14, 717);
    			attr_dev(g1, "transform", "matrix(-6.16264e-17,-1.00643,-1,6.12323e-17,1893.36,2467.31)");
    			add_location(g1, file$l, 6, 10, 626);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$l, 10, 14, 1059);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,1.27952,7.83479e-17,1259.19,1775.58)");
    			add_location(g2, file$l, 9, 10, 970);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$l, 13, 14, 1318);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1398.6,1648.79)");
    			add_location(g3, file$l, 12, 10, 1228);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$l, 16, 14, 1563);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1346.87,1699.1)");
    			add_location(g4, file$l, 15, 10, 1473);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$l, 19, 14, 1787);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1391.15,1792.72)");
    			add_location(g5, file$l, 18, 10, 1718);
    			add_location(g6, file$l, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1517.62,-1949.51)");
    			add_location(g7, file$l, 1, 2, 317);
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
    			add_location(svg, file$l, 0, 0, 0);
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
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B7",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* src/shapes/B/B8.svelte generated by Svelte v3.44.3 */

    const file$k = "src/shapes/B/B8.svelte";

    function create_fragment$m(ctx) {
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
    			add_location(path0, file$k, 4, 14, 456);
    			attr_dev(g0, "transform", "matrix(-1,0,0,0.787396,1908.44,2133.86)");
    			add_location(g0, file$k, 3, 10, 386);
    			attr_dev(path1, "d", "M462.738,223.658L463.058,223.654L413.058,223.654L413.058,373.654L462.738,373.654L462.738,323.658L512.419,323.658L512.419,223.658L462.738,223.658Z");
    			set_style(path1, "fill", "rgb(100,113,255)");
    			set_style(path1, "stroke", "rgb(0,2,88)");
    			set_style(path1, "stroke-width", "4.15px");
    			add_location(path1, file$k, 7, 14, 716);
    			attr_dev(g1, "transform", "matrix(1.00643,-1.23253e-16,-1.22465e-16,-1,1131.33,2612.87)");
    			add_location(g1, file$k, 6, 10, 625);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$k, 10, 14, 1056);
    			attr_dev(g2, "transform", "matrix(-6.12323e-17,1,0.787396,4.82141e-17,1388.04,2114)");
    			add_location(g2, file$k, 9, 10, 969);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$k, 13, 14, 1316);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1372.67,1934.83)");
    			add_location(g3, file$k, 12, 10, 1225);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$k, 16, 14, 1546);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1317.64,2160.66)");
    			add_location(g4, file$k, 15, 10, 1471);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$k, 19, 14, 1784);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,1370.12,2132.48)");
    			add_location(g5, file$k, 18, 10, 1715);
    			add_location(g6, file$k, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-1544.96,-2237.13)");
    			add_location(g7, file$k, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
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
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "B8",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/shapes/i/i1.svelte generated by Svelte v3.44.3 */

    const file$j = "src/shapes/i/i1.svelte";

    function create_fragment$l(ctx) {
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
    			add_location(path0, file$j, 4, 16, 477);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,1,1,6.12323e-17,262.699,1836.27)");
    			add_location(g0, file$j, 3, 12, 392);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$j, 7, 16, 828);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,332.828,1929.07)");
    			add_location(g1, file$j, 6, 12, 735);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$j, 10, 16, 1080);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,282.868,2028.23)");
    			add_location(g2, file$j, 9, 12, 987);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$j, 13, 16, 1331);
    			attr_dev(g3, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,713.899,2106.61)");
    			add_location(g3, file$j, 12, 12, 1239);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$j, 16, 16, 1574);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,279.396,1969.51)");
    			add_location(g4, file$j, 15, 12, 1504);
    			add_location(g5, file$j, 2, 8, 376);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-453.731,-2230.55)");
    			add_location(g6, file$j, 1, 4, 318);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$j, 0, 0, 0);
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
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props) {
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
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I1",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/shapes/i/i5.svelte generated by Svelte v3.44.3 */

    const file$i = "src/shapes/i/i5.svelte";

    function create_fragment$k(ctx) {
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
    			add_location(path0, file$i, 4, 16, 478);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,1,-1,6.12323e-17,736.902,657.481)");
    			add_location(g0, file$i, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$i, 7, 16, 828);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,270.068,750.27)");
    			add_location(g1, file$i, 6, 12, 736);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$i, 10, 16, 1079);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,692.141,928.658)");
    			add_location(g2, file$i, 9, 12, 987);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$i, 13, 16, 1329);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,265.072,1074.86)");
    			add_location(g3, file$i, 12, 12, 1252);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$i, 16, 16, 1573);
    			attr_dev(g4, "transform", "matrix(1,0,0,0.787396,217.863,893.815)");
    			add_location(g4, file$i, 15, 12, 1502);
    			add_location(g5, file$i, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-441.683,-1051.75)");
    			add_location(g6, file$i, 1, 4, 319);
    			attr_dev(svg, "width", "200px");
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
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
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
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "I5",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/shapes/J/J5.svelte generated by Svelte v3.44.3 */

    const file$h = "src/shapes/J/J5.svelte";

    function create_fragment$j(ctx) {
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
    			add_location(path0, file$h, 4, 16, 493);
    			attr_dev(g0, "transform", "matrix(-1.00704,1.23326e-16,-1.22444e-16,-0.999829,539.687,1746.63)");
    			add_location(g0, file$h, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$h, 7, 16, 840);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1.35592,1021.82)");
    			add_location(g1, file$h, 6, 12, 747);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$h, 10, 16, 1090);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,421.16,1249.82)");
    			add_location(g2, file$h, 9, 12, 999);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$h, 13, 16, 1341);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,-6.24885,1396.38)");
    			add_location(g3, file$h, 12, 12, 1263);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$h, 16, 16, 1585);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,-53.2772,1069.88)");
    			add_location(g4, file$h, 15, 12, 1514);
    			add_location(g5, file$h, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-171.905,-1322.38)");
    			add_location(g6, file$h, 1, 4, 319);
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
    			add_location(svg, file$h, 0, 0, 0);
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
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
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
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J5",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/shapes/J/J7.svelte generated by Svelte v3.44.3 */

    const file$g = "src/shapes/J/J7.svelte";

    function create_fragment$i(ctx) {
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
    			add_location(path0, file$g, 4, 16, 213);
    			attr_dev(g0, "transform", "matrix(1.00704,0,0,0.999829,-98.0876,1704.55)");
    			add_location(g0, file$g, 3, 12, 135);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$g, 7, 16, 561);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,-5.73951,1624.31)");
    			add_location(g1, file$g, 6, 12, 467);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$g, 10, 16, 791);
    			attr_dev(g2, "transform", "matrix(1,0,0,1.67322,-7.72729,1590.01)");
    			add_location(g2, file$g, 9, 12, 720);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$g, 13, 16, 1061);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,345.34,1847.21)");
    			add_location(g3, file$g, 12, 12, 964);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$g, 16, 16, 1332);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,294.837,1698.46)");
    			add_location(g4, file$g, 15, 12, 1234);
    			add_location(g5, file$g, 2, 8, 119);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-165.527,-1924.63)");
    			add_location(g6, file$g, 1, 4, 61);
    			attr_dev(svg, "width", "200px");
    			attr_dev(svg, "height", "100%");
    			attr_dev(svg, "viewBox", "0 0 105 205");
    			add_location(svg, file$g, 0, 1, 1);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
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
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "J7",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/shapes/L/L1.svelte generated by Svelte v3.44.3 */

    const file$f = "src/shapes/L/L1.svelte";

    function create_fragment$h(ctx) {
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
    			add_location(path0, file$f, 4, 16, 450);
    			attr_dev(g0, "transform", "matrix(1,0,0,-1,-50,494)");
    			add_location(g0, file$f, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$f, 7, 16, 717);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,2757.8,47.3015)");
    			add_location(g1, file$f, 6, 12, 627);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$f, 10, 16, 984);
    			attr_dev(g2, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2276.01,-132.533)");
    			add_location(g2, file$f, 9, 12, 890);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$f, 13, 16, 1237);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2176.08,-32.4485)");
    			add_location(g3, file$f, 12, 12, 1143);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$f, 16, 16, 1464);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,2225,-90.8738)");
    			add_location(g4, file$f, 15, 12, 1396);
    			add_location(g5, file$f, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2347.92,-169.917)");
    			add_location(g6, file$f, 1, 4, 319);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props) {
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
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L1",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/shapes/L/L2.svelte generated by Svelte v3.44.3 */

    const file$e = "src/shapes/L/L2.svelte";

    function create_fragment$g(ctx) {
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
    			add_location(path0, file$e, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,-1,-1,-6.12323e-17,2666.22,3006.24)");
    			add_location(g0, file$e, 3, 12, 393);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$e, 7, 16, 749);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2592.32,231.096)");
    			add_location(g1, file$e, 6, 12, 657);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$e, 10, 16, 1020);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2572.26,327.695)");
    			add_location(g2, file$e, 9, 12, 922);
    			attr_dev(path3, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$e, 13, 16, 1286);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2170.52,152.986)");
    			add_location(g3, file$e, 12, 12, 1193);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$e, 16, 16, 1515);
    			attr_dev(g4, "transform", "matrix(1,0,0,1.27952,2218.23,193.697)");
    			add_location(g4, file$e, 15, 12, 1445);
    			add_location(g5, file$e, 2, 8, 377);
    			attr_dev(g6, "transform", "matrix(1,0,0,1,-2342.14,-454.157)");
    			add_location(g6, file$e, 1, 4, 319);
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
    			add_location(svg, file$e, 0, 0, 0);
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "L2",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/shapes/line/line1.svelte generated by Svelte v3.44.3 */

    const file$d = "src/shapes/line/line1.svelte";

    function create_fragment$f(ctx) {
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
    			add_location(rect, file$d, 3, 10, 444);
    			attr_dev(g0, "transform", "matrix(0.993071,0,0,0.738068,23.2236,55.5574)");
    			add_location(g0, file$d, 2, 6, 372);
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$d, 7, 14, 685);
    			attr_dev(g1, "transform", "matrix(1.01426,0,0,0.393698,1697.34,132.332)");
    			add_location(g1, file$d, 6, 10, 610);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$d, 10, 14, 944);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-1.77164,1.08482e-16,2334.82,-11.3458)");
    			add_location(g2, file$d, 9, 10, 854);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$d, 13, 14, 1204);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1602.81,-90.773)");
    			add_location(g3, file$d, 12, 10, 1113);
    			add_location(g4, file$d, 5, 6, 596);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-1772.99,-210.023)");
    			add_location(g5, file$d, 1, 2, 316);
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
    			add_location(svg, file$d, 0, 0, 0);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
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
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Line1",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/shapes/line/line2.svelte generated by Svelte v3.44.3 */

    const file$c = "src/shapes/line/line2.svelte";

    function create_fragment$e(ctx) {
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
    			add_location(rect, file$c, 3, 10, 463);
    			attr_dev(g0, "transform", "matrix(6.0808e-17,-0.993071,0.738068,4.51936e-17,1694.49,2385.26)");
    			add_location(g0, file$c, 2, 6, 371);
    			attr_dev(path0, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path0, "fill", "white");
    			add_location(path0, file$c, 7, 14, 725);
    			attr_dev(g1, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1977.72,356.795)");
    			add_location(g1, file$c, 6, 10, 629);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$c, 10, 14, 962);
    			attr_dev(g2, "transform", "matrix(1,0,0,1.77164,1627.17,71.0784)");
    			add_location(g2, file$c, 9, 10, 894);
    			attr_dev(path2, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$c, 13, 14, 1222);
    			attr_dev(g3, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1679.03,128.923)");
    			add_location(g3, file$c, 12, 10, 1131);
    			add_location(g4, file$c, 5, 6, 615);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-1848.95,-431.328)");
    			add_location(g5, file$c, 1, 2, 315);
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
    			add_location(svg, file$c, 0, 0, 0);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Line2",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/shapes/n/n1.svelte generated by Svelte v3.44.3 */

    const file$b = "src/shapes/n/n1.svelte";

    function create_fragment$d(ctx) {
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
    			add_location(path0, file$b, 4, 14, 469);
    			attr_dev(g0, "transform", "matrix(-1.19434e-15,1,1,1.19434e-15,839.61,1274.67)");
    			add_location(g0, file$b, 3, 10, 387);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$b, 7, 14, 800);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,829.677,1921.94)");
    			add_location(g1, file$b, 6, 10, 709);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$b, 10, 14, 1030);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,772.236,2143.34)");
    			add_location(g2, file$b, 9, 10, 955);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$b, 13, 14, 1295);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1129.98,2046.61)");
    			add_location(g3, file$b, 12, 10, 1199);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$b, 16, 14, 1559);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,1180.73,2146.8)");
    			add_location(g4, file$b, 15, 10, 1464);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$b, 19, 14, 1796);
    			attr_dev(g5, "transform", "matrix(1,0,0,1.27952,826.687,2014.69)");
    			add_location(g5, file$b, 18, 10, 1728);
    			add_location(g6, file$b, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-999.038,-2222.59)");
    			add_location(g7, file$b, 1, 2, 317);
    			attr_dev(svg, "width", "200px");
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
    			add_location(svg, file$b, 0, 0, 0);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "N1",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/shapes/s/s1.svelte generated by Svelte v3.44.3 */

    const file$a = "src/shapes/s/s1.svelte";

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
    			attr_dev(path0, "d", "M1300,298L1300,250L1400,250L1400,300L1350,300L1350,350L1250,350L1250,298L1300,298Z");
    			set_style(path0, "fill", "rgb(255,127,0)");
    			set_style(path0, "stroke", "rgb(133,66,0)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$a, 4, 14, 448);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,1.28298,-50.3799)");
    			add_location(g0, file$a, 3, 10, 385);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$a, 7, 14, 735);
    			attr_dev(g1, "transform", "matrix(3.10527e-17,0.507129,-0.393698,2.41071e-17,1477.92,110.165)");
    			add_location(g1, file$a, 6, 10, 638);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$a, 10, 14, 979);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1123.18,121.222)");
    			add_location(g2, file$a, 9, 10, 904);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$a, 13, 14, 1223);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1072.51,173.801)");
    			add_location(g3, file$a, 12, 10, 1148);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$a, 16, 14, 1482);
    			attr_dev(g4, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,1506.05,25.5383)");
    			add_location(g4, file$a, 15, 10, 1392);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$a, 19, 14, 1742);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1128.9,-102.977)");
    			add_location(g5, file$a, 18, 10, 1651);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$a, 22, 14, 1989);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1076.93,-56.8145)");
    			add_location(g6, file$a, 21, 10, 1897);
    			add_location(g7, file$a, 2, 6, 371);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-1249.2,-197.537)");
    			add_location(g8, file$a, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "S1",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/shapes/T/T1.svelte generated by Svelte v3.44.3 */

    const file$9 = "src/shapes/T/T1.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(path0, file$9, 4, 14, 469);
    			attr_dev(g0, "transform", "matrix(6.12323e-17,1,-1,6.12323e-17,2369.9,-1043.21)");
    			add_location(g0, file$9, 3, 10, 386);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$9, 7, 14, 747);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,2475.53,931.523)");
    			add_location(g1, file$9, 6, 10, 658);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$9, 10, 14, 990);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1941.7,1076.83)");
    			add_location(g2, file$9, 9, 10, 916);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$9, 13, 14, 1228);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,1893.96,899.097)");
    			add_location(g3, file$9, 12, 10, 1159);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$9, 16, 14, 1488);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1947.51,753.314)");
    			add_location(g4, file$9, 15, 10, 1397);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$9, 19, 14, 1734);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1896.53,852.518)");
    			add_location(g5, file$9, 18, 10, 1643);
    			add_location(g6, file$9, 2, 6, 372);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2067.82,-1054.71)");
    			add_location(g7, file$9, 1, 2, 316);
    			attr_dev(svg, "width", "100%");
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T1",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/shapes/T/t4.svelte generated by Svelte v3.44.3 */

    const file$8 = "src/shapes/T/t4.svelte";

    function create_fragment$a(ctx) {
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
    			add_location(path0, file$8, 4, 14, 472);
    			attr_dev(g0, "transform", "matrix(-1,1.22465e-16,-1.22465e-16,-1,4329.53,1067.28)");
    			add_location(g0, file$8, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$8, 7, 14, 751);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,2385.51,593.334)");
    			add_location(g1, file$8, 6, 10, 661);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$8, 10, 14, 995);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,1850.52,783.496)");
    			add_location(g2, file$8, 9, 10, 920);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$8, 13, 14, 1238);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,1949.7,738.365)");
    			add_location(g3, file$8, 12, 10, 1164);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$8, 16, 14, 1481);
    			attr_dev(g4, "transform", "matrix(1.01426,0,0,0.393698,1851.3,690.514)");
    			add_location(g4, file$8, 15, 10, 1407);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$8, 19, 14, 1745);
    			attr_dev(g5, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2206.6,638.166)");
    			add_location(g5, file$8, 18, 10, 1650);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$8, 22, 14, 2005);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,1907.11,464.519)");
    			add_location(g6, file$8, 21, 10, 1914);
    			add_location(g7, file$8, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2077.45,-765.201)");
    			add_location(g8, file$8, 1, 2, 317);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "T4",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/shapes/u/u1.svelte generated by Svelte v3.44.3 */

    const file$7 = "src/shapes/u/u1.svelte";

    function create_fragment$9(ctx) {
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
    			add_location(path0, file$7, 4, 14, 449);
    			attr_dev(g0, "transform", "matrix(1,0,0,1,25.3657,-2.3355)");
    			add_location(g0, file$7, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$7, 7, 14, 725);
    			attr_dev(g1, "transform", "matrix(6.12323e-17,1,-1.27952,7.83479e-17,3035.42,23.3447)");
    			add_location(g1, file$7, 6, 10, 636);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$7, 10, 14, 969);
    			attr_dev(g2, "transform", "matrix(1.01426,0,0,0.393698,2396.88,119.622)");
    			add_location(g2, file$7, 9, 10, 894);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$7, 13, 14, 1206);
    			attr_dev(g3, "transform", "matrix(1,0,0,0.787396,2500.56,41.389)");
    			add_location(g3, file$7, 12, 10, 1138);
    			attr_dev(path4, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$7, 16, 14, 1467);
    			attr_dev(g4, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2452.01,-106.786)");
    			add_location(g4, file$7, 15, 10, 1375);
    			attr_dev(path5, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$7, 19, 14, 1714);
    			attr_dev(g5, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2551.36,-107.644)");
    			add_location(g5, file$7, 18, 10, 1622);
    			add_location(g6, file$7, 2, 6, 373);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-2623.28,-195.581)");
    			add_location(g7, file$7, 1, 2, 317);
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
    			add_location(svg, file$7, 0, 0, 0);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U1",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/shapes/u/u3.svelte generated by Svelte v3.44.3 */

    const file$6 = "src/shapes/u/u3.svelte";

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
    			attr_dev(path0, "d", "M2600,300L2750,300L2750,200L2700,200L2700,250L2650,250L2650,200L2600,200L2600,300Z");
    			set_style(path0, "fill", "rgb(35,104,0)");
    			set_style(path0, "stroke", "rgb(0,36,2)");
    			set_style(path0, "stroke-width", "4.17px");
    			add_location(path0, file$6, 4, 14, 469);
    			attr_dev(g0, "transform", "matrix(-1,1.22465e-16,-1.22465e-16,-1,5380,1075.41)");
    			add_location(g0, file$6, 3, 10, 387);
    			attr_dev(path1, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$6, 7, 14, 731);
    			attr_dev(g1, "transform", "matrix(1.01426,0,0,0.393698,2401.94,742.491)");
    			add_location(g1, file$6, 6, 10, 656);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$6, 10, 14, 996);
    			attr_dev(g2, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2757.57,597.546)");
    			add_location(g2, file$6, 9, 10, 900);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$6, 13, 14, 1261);
    			attr_dev(g3, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2804.65,546.414)");
    			add_location(g3, file$6, 12, 10, 1165);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$6, 16, 14, 1525);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,2861.45,596.41)");
    			add_location(g4, file$6, 15, 10, 1430);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$6, 19, 14, 1762);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,2506.27,616.45)");
    			add_location(g5, file$6, 18, 10, 1694);
    			attr_dev(path6, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path6, "fill", "white");
    			add_location(path6, file$6, 22, 14, 2022);
    			attr_dev(g6, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,2456.62,470.999)");
    			add_location(g6, file$6, 21, 10, 1931);
    			add_location(g7, file$6, 2, 6, 373);
    			attr_dev(g8, "transform", "matrix(1,0,0,1,-2627.92,-773.328)");
    			add_location(g8, file$6, 1, 2, 317);
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
    			add_location(svg, file$6, 0, 0, 0);
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
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "U3",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/shapes/Z/Z1.svelte generated by Svelte v3.44.3 */

    const file$5 = "src/shapes/Z/Z1.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(path0, file$5, 4, 16, 480);
    			attr_dev(g0, "transform", "matrix(-6.12323e-17,-1,-1,6.12323e-17,1022.04,1878.02)");
    			add_location(g0, file$5, 3, 12, 393);
    			attr_dev(path1, "d", "M178.725,320.941L178.758,307.295L192.678,307.295C183.589,307.392 178.721,311.577 178.725,320.941Z");
    			set_style(path1, "fill", "white");
    			add_location(path1, file$5, 7, 16, 817);
    			attr_dev(g1, "transform", "matrix(0.99999,0.0044758,-0.0044758,0.99999,528.143,756.214)");
    			add_location(g1, file$5, 6, 12, 724);
    			attr_dev(path2, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path2, "fill", "white");
    			add_location(path2, file$5, 10, 16, 1068);
    			attr_dev(g2, "transform", "matrix(6.12323e-17,1,-0.787396,4.82141e-17,951.403,884.805)");
    			add_location(g2, file$5, 9, 12, 976);
    			attr_dev(path3, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path3, "fill", "white");
    			add_location(path3, file$5, 13, 16, 1316);
    			attr_dev(g3, "transform", "matrix(1.01426,0,0,0.393698,469.5,974.405)");
    			add_location(g3, file$5, 12, 12, 1241);
    			attr_dev(path4, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path4, "fill", "white");
    			add_location(path4, file$5, 16, 16, 1587);
    			attr_dev(g4, "transform", "matrix(6.21054e-17,1.01426,-0.393698,2.41071e-17,931.675,928.083)");
    			add_location(g4, file$5, 15, 12, 1489);
    			attr_dev(path5, "d", "M269.175,211.555C268.101,247.52 268.425,281.148 269.252,313.156C270.816,279.73 270.947,245.907 269.175,211.555Z");
    			set_style(path5, "fill", "white");
    			add_location(path5, file$5, 19, 16, 1831);
    			attr_dev(g5, "transform", "matrix(1,0,0,0.787396,574.045,950.494)");
    			add_location(g5, file$5, 18, 12, 1760);
    			add_location(g6, file$5, 2, 8, 377);
    			attr_dev(g7, "transform", "matrix(1,0,0,1,-697.211,-1056.96)");
    			add_location(g7, file$5, 1, 4, 319);
    			attr_dev(svg, "width", "100%");
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
    			add_location(svg, file$5, 0, 0, 0);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Z1",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/Shape.svelte generated by Svelte v3.44.3 */

    const file$4 = "src/Shape.svelte";

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
    			attr_dev(div_1, "class", "svgDiv svelte-q0bazq");
    			attr_dev(div_1, "style", div_1_style_value = "top: " + coordToPx(/*posY*/ ctx[3]) + "px; left: " + coordToPx(/*posX*/ ctx[2]) + "px; " + /*cssTransformValue*/ ctx[5]);
    			toggle_class(div_1, "onBoard", /*onBoard*/ ctx[1]);
    			add_location(div_1, file$4, 178, 0, 3481);
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
    	let { pieceId } = $$props;
    	let { top } = $$props;
    	let { left } = $$props;

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
    		I5,
    		J5,
    		J7,
    		L1,
    		L2,
    		N1,
    		S1,
    		T1,
    		T4,
    		U1,
    		U3,
    		Z1,
    		"|1": Line1,
    		"|2": Line2
    	};

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
    		onDestroy,
    		pieceId,
    		top,
    		left,
    		B1,
    		B2,
    		B3,
    		B4,
    		B5,
    		B6,
    		B7,
    		B8,
    		I1,
    		I5,
    		J5,
    		J7,
    		L1,
    		L2,
    		Line1,
    		Line2,
    		N1,
    		S1,
    		T1,
    		T4,
    		U1,
    		U3,
    		Z1,
    		ShapeTypes,
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

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (100:0) {#each board.piecesOnBoard as piece, pieceIndex}
    function create_each_block$1(ctx) {
    	let shape;
    	let current;

    	shape = new Shape({
    			props: {
    				pieceId: /*piece*/ ctx[2].id,
    				top: /*piece*/ ctx[2].topY,
    				left: /*piece*/ ctx[2].leftX,
    				offX: /*offBoardSpots*/ ctx[0][/*pieceIndex*/ ctx[4] % /*offBoardSpots*/ ctx[0].length].x,
    				offY: /*offBoardSpots*/ ctx[0][/*pieceIndex*/ ctx[4] % /*offBoardSpots*/ ctx[0].length].y
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
    		p: noop,
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
    		source: "(100:0) {#each board.piecesOnBoard as piece, pieceIndex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*board*/ ctx[1].piecesOnBoard;
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
    			if (dirty & /*board, offBoardSpots*/ 3) {
    				each_value = /*board*/ ctx[1].piecesOnBoard;
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

    	let offBoardSpots = [
    		{ x: -3, y: 0 },
    		{ x: -3, y: 3 },
    		{ x: -3, y: 6 },
    		{ x: 8, y: 0 },
    		{ x: 8, y: 3 },
    		{ x: 8, y: 6 }
    	];

    	let board = {
    		board: [
    			['empty', 'empty', 'empty', 'empty', 'empty', 'empty', undefined],
    			['empty', 'empty', 'empty', 'empty', 'empty', 'empty', '  '],
    			['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
    			['empty', 'empty', 'empty', 'empty', 'J7', 'J7', 'empty'],
    			['empty', 'empty', 'empty', 'B2', 'B2', 'J7', 'empty'],
    			['empty', 'empty', 'empty', 'B2', 'B2', 'J7', 'empty'],
    			['empty', 'empty', 'empty', 'B2', 'empty', 'J7', 'empty'],
    			[undefined, undefined, undefined, undefined, 'empty', 'empty', 'empty']
    		],
    		piecesOnBoard: [
    			{ id: 'Z1', leftX: 1, topY: 0 },
    			{ id: 'L2', leftX: 2, topY: 0 },
    			{ id: 'J5', leftX: 5, topY: 0 },
    			{ id: 'N1', leftX: 0, topY: 1 },
    			{ id: 'T4', leftX: 2, topY: 2 },
    			{ id: 'I5', leftX: 0, topY: 3 },
    			{ id: 'S1', leftX: 2, topY: 4 },
    			{ id: '|1', leftX: 0, topY: 6 },
    			{ id: 'U3', leftX: 4, topY: 6 },
    			{ id: 'B7', leftX: 4, topY: 4 }
    		]
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ShapesLayer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Shape, offBoardSpots, board });

    	$$self.$inject_state = $$props => {
    		if ('offBoardSpots' in $$props) $$invalidate(0, offBoardSpots = $$props.offBoardSpots);
    		if ('board' in $$props) $$invalidate(1, board = $$props.board);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [offBoardSpots, board];
    }

    class ShapesLayer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ShapesLayer",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/BoardBackground.svelte generated by Svelte v3.44.3 */

    const file$3 = "src/BoardBackground.svelte";

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
    			add_location(path0, file$3, 2, 8, 377);
    			attr_dev(path1, "d", "M178.425,321.099C178.336,316.432 178.332,307.826 178.862,307.45C178.93,306.752 188.018,306.962 192.895,307.09C183.806,307.187 178.42,311.735 178.425,321.099Z");
    			set_style(path1, "fill", "rgb(238,230,214)");
    			add_location(path1, file$3, 4, 12, 1115);
    			attr_dev(g0, "transform", "matrix(8.36081,-0.122878,0.0847507,5.76657,-1470.19,-1711.96)");
    			add_location(g0, file$3, 3, 8, 1025);
    			attr_dev(path2, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path2, "fill", "rgb(238,230,214)");
    			add_location(path2, file$3, 7, 12, 1404);
    			attr_dev(g1, "transform", "matrix(0.70355,0,0,1,194.289,-72.0701)");
    			add_location(g1, file$3, 6, 8, 1337);
    			attr_dev(path3, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C596.727,891.083 541.393,890.922 428.136,893.727C396.701,894.505 360.804,895.512 317.926,896.801Z");
    			set_style(path3, "fill", "rgb(238,230,214)");
    			add_location(path3, file$3, 10, 12, 1719);
    			attr_dev(g2, "transform", "matrix(-0.000388906,1.14319,-1,-0.000340193,1667.86,-99.3781)");
    			add_location(g2, file$3, 9, 8, 1629);
    			attr_dev(path4, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path4, "fill", "rgb(238,230,214)");
    			add_location(path4, file$3, 13, 12, 2081);
    			attr_dev(g3, "transform", "matrix(0.000306889,0.373202,-1,0.000822315,1564.36,-81.2722)");
    			add_location(g3, file$3, 12, 8, 1992);
    			attr_dev(path5, "d", "M317.926,896.801C490.371,906.756 796.281,896.589 787.933,896.062C761.153,894.372 735.999,891.797 711.96,891.674C564.743,890.919 515.291,890.866 317.926,896.801Z");
    			set_style(path5, "fill", "rgb(238,230,214)");
    			add_location(path5, file$3, 16, 12, 2375);
    			attr_dev(g4, "transform", "matrix(0.720629,0,0,1,-182.622,-175.869)");
    			add_location(g4, file$3, 15, 8, 2306);
    			attr_dev(g5, "transform", "matrix(1,0,0,1,-29.8712,-18.0998)");
    			add_location(g5, file$3, 1, 4, 319);
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
    			add_location(svg, file$3, 0, 0, 0);
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
    const file$2 = "src/BaseBoard.svelte";

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
    function create_else_block$1(ctx) {
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
    		id: create_else_block$1.name,
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
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "cellDiv svelte-44pp6");
    			toggle_class(div, "nonBoardCell", !/*col*/ ctx[4]);
    			add_location(div, file$2, 42, 5, 1082);
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
    			add_location(div, file$2, 40, 3, 1024);
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
    			add_location(div0, file$2, 37, 1, 900);
    			attr_dev(div1, "class", "flexCol absolute gap svelte-44pp6");
    			add_location(div1, file$2, 38, 1, 949);
    			add_location(div2, file$2, 36, 0, 893);
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
    		['8', '9', '10', '11', '12', '12', '14'],
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

    const file$1 = "src/BoardHeader.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let button0;
    	let t3;
    	let button1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Puzzle of the Day";
    			t1 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Hint";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Solve";
    			add_location(h1, file$1, 1, 2, 35);
    			attr_dev(button0, "class", "blue svelte-1f2ayeq");
    			add_location(button0, file$1, 3, 4, 88);
    			attr_dev(button1, "class", "yellow svelte-1f2ayeq");
    			add_location(button1, file$1, 4, 4, 125);
    			attr_dev(div0, "class", "flexRow svelte-1f2ayeq");
    			add_location(div0, file$1, 2, 2, 64);
    			set_style(div1, "text-align", "center");
    			add_location(div1, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BoardHeader', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BoardHeader> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class BoardHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BoardHeader",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/BoardScreen.svelte generated by Svelte v3.44.3 */
    const file = "src/BoardScreen.svelte";

    function create_fragment$1(ctx) {
    	let boardheader;
    	let t0;
    	let div;
    	let baseboard;
    	let t1;
    	let shapeslayer;
    	let current;
    	boardheader = new BoardHeader({ $$inline: true });
    	baseboard = new BaseBoard({ $$inline: true });
    	shapeslayer = new ShapesLayer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(boardheader.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(baseboard.$$.fragment);
    			t1 = space();
    			create_component(shapeslayer.$$.fragment);
    			attr_dev(div, "class", "center svelte-krb9ts");
    			add_location(div, file, 7, 2, 182);
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
    		p: noop,
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BoardScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ShapesLayer, BaseBoard, BoardHeader });
    	return [];
    }

    class BoardScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BoardScreen",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.3 */

    // (12:0) {:else}
    function create_else_block(ctx) {
    	let boardscreen;
    	let current;
    	boardscreen = new BoardScreen({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(boardscreen.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(boardscreen, target, anchor);
    			current = true;
    		},
    		p: noop,
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(12:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:0) {#if !weekday && !month && !day}
    function create_if_block(ctx) {
    	let homescreen;
    	let updating_weekday;
    	let updating_month;
    	let updating_day;
    	let current;

    	function homescreen_weekday_binding(value) {
    		/*homescreen_weekday_binding*/ ctx[3](value);
    	}

    	function homescreen_month_binding(value) {
    		/*homescreen_month_binding*/ ctx[4](value);
    	}

    	function homescreen_day_binding(value) {
    		/*homescreen_day_binding*/ ctx[5](value);
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

    	homescreen = new HomeScreen({ props: homescreen_props, $$inline: true });
    	binding_callbacks.push(() => bind(homescreen, 'weekday', homescreen_weekday_binding));
    	binding_callbacks.push(() => bind(homescreen, 'month', homescreen_month_binding));
    	binding_callbacks.push(() => bind(homescreen, 'day', homescreen_day_binding));

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
    		source: "(10:0) {#if !weekday && !month && !day}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*weekday*/ ctx[0] && !/*month*/ ctx[1] && !/*day*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
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
    			if_blocks[current_block_type_index].d(detaching);
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
    	let weekday = 3;
    	let month = 2;
    	let day = 1;
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

    	$$self.$capture_state = () => ({
    		HomeScreen,
    		BoardScreen,
    		weekday,
    		month,
    		day
    	});

    	$$self.$inject_state = $$props => {
    		if ('weekday' in $$props) $$invalidate(0, weekday = $$props.weekday);
    		if ('month' in $$props) $$invalidate(1, month = $$props.month);
    		if ('day' in $$props) $$invalidate(2, day = $$props.day);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		weekday,
    		month,
    		day,
    		homescreen_weekday_binding,
    		homescreen_month_binding,
    		homescreen_day_binding
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

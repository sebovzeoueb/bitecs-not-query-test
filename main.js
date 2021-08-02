(() => {
  // node_modules/bitecs/dist/index.es.js
  var TYPES_NAMES = {
    i8: "Int8",
    ui8: "Uint8",
    ui8c: "Uint8Clamped",
    i16: "Int16",
    ui16: "Uint16",
    i32: "Int32",
    ui32: "Uint32",
    f32: "Float32",
    f64: "Float64"
  };
  var TYPES = {
    i8: Int8Array,
    ui8: Uint8Array,
    ui8c: Uint8ClampedArray,
    i16: Int16Array,
    ui16: Uint16Array,
    i32: Int32Array,
    ui32: Uint32Array,
    f32: Float32Array,
    f64: Float64Array
  };
  var UNSIGNED_MAX = {
    uint8: 2 ** 8,
    uint16: 2 ** 16,
    uint32: 2 ** 32
  };
  var $storeRef = Symbol("storeRef");
  var $storeSize = Symbol("storeSize");
  var $storeMaps = Symbol("storeMaps");
  var $storeFlattened = Symbol("storeFlattened");
  var $storeBase = Symbol("storeBase");
  var $storeType = Symbol("storeType");
  var $storeArrayCounts = Symbol("storeArrayCount");
  var $storeSubarrays = Symbol("storeSubarrays");
  var $storeCursor = Symbol("storeCursor");
  var $subarrayCursors = Symbol("subarrayCursors");
  var $subarray = Symbol("subarray");
  var $subarrayFrom = Symbol("subarrayFrom");
  var $subarrayTo = Symbol("subarrayTo");
  var $parentArray = Symbol("subStore");
  var $tagStore = Symbol("tagStore");
  var $queryShadow = Symbol("queryShadow");
  var $serializeShadow = Symbol("serializeShadow");
  var $indexType = Symbol("indexType");
  var $indexBytes = Symbol("indexBytes");
  var stores = {};
  var resize = (ta, size) => {
    const newBuffer = new ArrayBuffer(size * ta.BYTES_PER_ELEMENT);
    const newTa = new ta.constructor(newBuffer);
    newTa.set(ta, 0);
    return newTa;
  };
  var createShadow = (store, key) => {
    if (!ArrayBuffer.isView(store)) {
      const shadow = store[$parentArray].slice(0).fill(0);
      for (const k in store[key]) {
        const from = store[key][k][$subarrayFrom];
        const to = store[key][k][$subarrayTo];
        store[key][k] = shadow.subarray(from, to);
      }
    } else {
      store[key] = store.slice(0).fill(0);
    }
  };
  var resizeSubarray = (metadata, store, size) => {
    const cursors = metadata[$subarrayCursors];
    const type = store[$storeType];
    const length = store[0].length;
    const indexType = length <= UNSIGNED_MAX.uint8 ? "ui8" : length <= UNSIGNED_MAX.uint16 ? "ui16" : "ui32";
    const arrayCount = metadata[$storeArrayCounts][type];
    const summedLength = Array(arrayCount).fill(0).reduce((a, p) => a + length, 0);
    const array = new TYPES[type](summedLength * size);
    array.set(metadata[$storeSubarrays][type]);
    metadata[$storeSubarrays][type] = array;
    createShadow(metadata[$storeSubarrays][type], $queryShadow);
    createShadow(metadata[$storeSubarrays][type], $serializeShadow);
    array[$indexType] = TYPES_NAMES[indexType];
    array[$indexBytes] = TYPES[indexType].BYTES_PER_ELEMENT;
    const start = cursors[type];
    let end = 0;
    for (let eid2 = 0; eid2 < size; eid2++) {
      const from = cursors[type] + eid2 * length;
      const to = from + length;
      store[eid2] = metadata[$storeSubarrays][type].subarray(from, to);
      store[eid2][$subarrayFrom] = from;
      store[eid2][$subarrayTo] = to;
      store[eid2][$queryShadow] = metadata[$storeSubarrays][type][$queryShadow].subarray(from, to);
      store[eid2][$serializeShadow] = metadata[$storeSubarrays][type][$serializeShadow].subarray(from, to);
      store[eid2][$subarray] = true;
      store[eid2][$indexType] = array[$indexType];
      store[eid2][$indexBytes] = array[$indexBytes];
      end = to;
    }
    cursors[type] = end;
    store[$parentArray] = metadata[$storeSubarrays][type].subarray(start, end);
  };
  var resizeRecursive = (metadata, store, size) => {
    Object.keys(store).forEach((key) => {
      const ta = store[key];
      if (Array.isArray(ta)) {
        resizeSubarray(metadata, ta, size);
        store[$storeFlattened].push(ta);
      } else if (ArrayBuffer.isView(ta)) {
        store[key] = resize(ta, size);
        store[$storeFlattened].push(store[key]);
        store[key][$queryShadow] = resize(ta[$queryShadow], size);
        store[key][$serializeShadow] = resize(ta[$serializeShadow], size);
      } else if (typeof ta === "object") {
        resizeRecursive(metadata, store[key], size);
      }
    });
  };
  var resizeStore = (store, size) => {
    if (store[$tagStore])
      return;
    store[$storeSize] = size;
    store[$storeFlattened].length = 0;
    Object.keys(store[$subarrayCursors]).forEach((k) => {
      store[$subarrayCursors][k] = 0;
    });
    resizeRecursive(store, store, size);
  };
  var resetStoreFor = (store, eid2) => {
    if (store[$storeFlattened]) {
      store[$storeFlattened].forEach((ta) => {
        if (ArrayBuffer.isView(ta))
          ta[eid2] = 0;
        else
          ta[eid2].fill(0);
      });
    }
  };
  var createTypeStore = (type, length) => {
    const totalBytes = length * TYPES[type].BYTES_PER_ELEMENT;
    const buffer = new ArrayBuffer(totalBytes);
    return new TYPES[type](buffer);
  };
  var createArrayStore = (metadata, type, length) => {
    const size = metadata[$storeSize];
    const store = Array(size).fill(0);
    store[$storeType] = type;
    const cursors = metadata[$subarrayCursors];
    const indexType = length < UNSIGNED_MAX.uint8 ? "ui8" : length < UNSIGNED_MAX.uint16 ? "ui16" : "ui32";
    if (!length)
      throw new Error("bitECS - Must define component array length");
    if (!TYPES[type])
      throw new Error(`bitECS - Invalid component array property type ${type}`);
    if (!metadata[$storeSubarrays][type]) {
      const arrayCount = metadata[$storeArrayCounts][type];
      const summedLength = Array(arrayCount).fill(0).reduce((a, p) => a + length, 0);
      const array = new TYPES[type](summedLength * size);
      metadata[$storeSubarrays][type] = array;
      createShadow(metadata[$storeSubarrays][type], $queryShadow);
      createShadow(metadata[$storeSubarrays][type], $serializeShadow);
      array[$indexType] = TYPES_NAMES[indexType];
      array[$indexBytes] = TYPES[indexType].BYTES_PER_ELEMENT;
    }
    const start = cursors[type];
    let end = 0;
    for (let eid2 = 0; eid2 < size; eid2++) {
      const from = cursors[type] + eid2 * length;
      const to = from + length;
      store[eid2] = metadata[$storeSubarrays][type].subarray(from, to);
      store[eid2][$subarrayFrom] = from;
      store[eid2][$subarrayTo] = to;
      store[eid2][$queryShadow] = metadata[$storeSubarrays][type][$queryShadow].subarray(from, to);
      store[eid2][$serializeShadow] = metadata[$storeSubarrays][type][$serializeShadow].subarray(from, to);
      store[eid2][$subarray] = true;
      store[eid2][$indexType] = TYPES_NAMES[indexType];
      store[eid2][$indexBytes] = TYPES[indexType].BYTES_PER_ELEMENT;
      end = to;
    }
    cursors[type] = end;
    store[$parentArray] = metadata[$storeSubarrays][type].subarray(start, end);
    return store;
  };
  var isArrayType = (x) => Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "number";
  var createStore = (schema, size) => {
    const $store = Symbol("store");
    if (!schema || !Object.keys(schema).length) {
      stores[$store] = {
        [$storeSize]: size,
        [$tagStore]: true,
        [$storeBase]: () => stores[$store]
      };
      return stores[$store];
    }
    schema = JSON.parse(JSON.stringify(schema));
    const arrayCounts = {};
    const collectArrayCounts = (s) => {
      const keys = Object.keys(s);
      for (const k of keys) {
        if (isArrayType(s[k])) {
          if (!arrayCounts[s[k][0]])
            arrayCounts[s[k][0]] = 0;
          arrayCounts[s[k][0]]++;
        } else if (s[k] instanceof Object) {
          collectArrayCounts(s[k]);
        }
      }
    };
    collectArrayCounts(schema);
    const metadata = {
      [$storeSize]: size,
      [$storeMaps]: {},
      [$storeSubarrays]: {},
      [$storeRef]: $store,
      [$storeCursor]: 0,
      [$subarrayCursors]: Object.keys(TYPES).reduce((a, type) => ({
        ...a,
        [type]: 0
      }), {}),
      [$storeFlattened]: [],
      [$storeArrayCounts]: arrayCounts
    };
    if (schema instanceof Object && Object.keys(schema).length) {
      const recursiveTransform = (a, k) => {
        if (typeof a[k] === "string") {
          a[k] = createTypeStore(a[k], size);
          createShadow(a[k], $queryShadow);
          createShadow(a[k], $serializeShadow);
          a[k][$storeBase] = () => stores[$store];
          metadata[$storeFlattened].push(a[k]);
        } else if (isArrayType(a[k])) {
          const [type, length] = a[k];
          a[k] = createArrayStore(metadata, type, length);
          a[k][$storeBase] = () => stores[$store];
          metadata[$storeFlattened].push(a[k]);
        } else if (a[k] instanceof Object) {
          a[k] = Object.keys(a[k]).reduce(recursiveTransform, a[k]);
        }
        return a;
      };
      stores[$store] = Object.assign(Object.keys(schema).reduce(recursiveTransform, schema), metadata);
      stores[$store][$storeBase] = () => stores[$store];
      return stores[$store];
    }
  };
  var SparseSet = () => {
    const dense = [];
    const sparse = [];
    const has = (val) => dense[sparse[val]] === val;
    const add = (val) => {
      if (has(val))
        return;
      sparse[val] = dense.push(val) - 1;
    };
    const remove = (val) => {
      if (!has(val))
        return;
      const index = sparse[val];
      const swapped = dense.pop();
      if (swapped !== val) {
        dense[index] = swapped;
        sparse[swapped] = index;
      }
    };
    return {
      add,
      remove,
      has,
      sparse,
      dense
    };
  };
  var resized = false;
  var setSerializationResized = (v) => {
    resized = v;
  };
  var newEntities = new Map();
  var $entityMasks = Symbol("entityMasks");
  var $entityComponents = Symbol("entityMasks");
  var $entitySparseSet = Symbol("entitySparseSet");
  var $entityArray = Symbol("entityArray");
  var defaultSize = 1e5;
  var globalEntityCursor = 0;
  var globalSize = defaultSize;
  var resizeThreshold = () => globalSize - globalSize / 5;
  var getGlobalSize = () => globalSize;
  var removed = [];
  var getDefaultSize = () => defaultSize;
  var getEntityCursor = () => globalEntityCursor;
  var eidToWorld = new Map();
  var addEntity = (world2) => {
    const eid2 = removed.length > 0 ? removed.shift() : globalEntityCursor++;
    world2[$entitySparseSet].add(eid2);
    eidToWorld.set(eid2, world2);
    if (globalEntityCursor >= resizeThreshold()) {
      const size = globalSize;
      const amount = Math.ceil(size / 2 / 4) * 4;
      const newSize = size + amount;
      globalSize = newSize;
      resizeWorlds(newSize);
      resizeComponents(newSize);
      setSerializationResized(true);
      console.info(`\u{1F47E} bitECS - resizing all worlds from ${size} to ${size + amount}`);
    }
    world2[$notQueries].forEach((q) => {
      const match = queryCheckEntity(world2, q, eid2);
      if (match)
        queryAddEntity(q, eid2);
    });
    world2[$entityComponents].set(eid2, new Set());
    return eid2;
  };
  var removeEntity = (world2, eid2) => {
    if (!world2[$entitySparseSet].has(eid2))
      return;
    world2[$queries].forEach((q) => {
      queryRemoveEntity(world2, q, eid2);
    });
    removed.push(eid2);
    world2[$entitySparseSet].remove(eid2);
    world2[$entityComponents].delete(eid2);
    for (let i = 0; i < world2[$entityMasks].length; i++)
      world2[$entityMasks][i][eid2] = 0;
  };
  function Not(c) {
    return function QueryNot() {
      return c;
    };
  }
  var $queries = Symbol("queries");
  var $notQueries = Symbol("notQueries");
  var $queryMap = Symbol("queryMap");
  var $dirtyQueries = Symbol("$dirtyQueries");
  var $queryComponents = Symbol("queryComponents");
  var registerQuery = (world2, query) => {
    const components2 = [];
    const notComponents = [];
    const changedComponents = [];
    query[$queryComponents].forEach((c) => {
      if (typeof c === "function") {
        const comp = c();
        if (!world2[$componentMap].has(comp))
          registerComponent(world2, comp);
        if (c.name === "QueryNot") {
          notComponents.push(comp);
        }
        if (c.name === "QueryChanged") {
          changedComponents.push(comp);
          components2.push(comp);
        }
      } else {
        if (!world2[$componentMap].has(c))
          registerComponent(world2, c);
        components2.push(c);
      }
    });
    const mapComponents = (c) => world2[$componentMap].get(c);
    const allComponents = components2.concat(notComponents).map(mapComponents);
    const sparseSet = SparseSet();
    const archetypes = [];
    const changed = [];
    const toRemove = [];
    const entered = [];
    const exited = [];
    const generations = allComponents.map((c) => c.generationId).reduce((a, v) => {
      if (a.includes(v))
        return a;
      a.push(v);
      return a;
    }, []);
    const reduceBitflags = (a, c) => {
      if (!a[c.generationId])
        a[c.generationId] = 0;
      a[c.generationId] |= c.bitflag;
      return a;
    };
    const masks = components2.map(mapComponents).reduce(reduceBitflags, {});
    const notMasks = notComponents.map(mapComponents).reduce((a, c) => {
      if (!a[c.generationId]) {
        a[c.generationId] = 0;
      }
      a[c.generationId] |= c.bitflag;
      return a;
    }, {});
    const hasMasks = allComponents.reduce(reduceBitflags, {});
    const flatProps = components2.filter((c) => !c[$tagStore]).map((c) => Object.getOwnPropertySymbols(c).includes($storeFlattened) ? c[$storeFlattened] : [c]).reduce((a, v) => a.concat(v), []);
    const shadows = flatProps.map((prop) => {
      const $ = Symbol();
      createShadow(prop, $);
      return prop[$];
    }, []);
    const q = Object.assign(sparseSet, {
      archetypes,
      changed,
      components: components2,
      notComponents,
      changedComponents,
      masks,
      notMasks,
      hasMasks,
      generations,
      flatProps,
      toRemove,
      entered,
      exited,
      shadows
    });
    world2[$queryMap].set(query, q);
    world2[$queries].add(q);
    components2.map(mapComponents).forEach((c) => {
      c.queries.add(q);
    });
    notComponents.map(mapComponents).forEach((c) => {
      c.notQueries.add(q);
    });
    if (notComponents.length)
      world2[$notQueries].add(q);
    for (let eid2 = 0; eid2 < getEntityCursor(); eid2++) {
      if (!world2[$entitySparseSet].has(eid2))
        continue;
      if (queryCheckEntity(world2, q, eid2)) {
        queryAddEntity(q, eid2);
      }
    }
  };
  var diff = (q, clearDiff) => {
    if (clearDiff)
      q.changed.length = 0;
    const {
      flatProps,
      shadows
    } = q;
    for (let i = 0; i < q.dense.length; i++) {
      const eid2 = q.dense[i];
      let dirty = false;
      for (let pid = 0; pid < flatProps.length; pid++) {
        const prop = flatProps[pid];
        const shadow = shadows[pid];
        if (ArrayBuffer.isView(prop[eid2])) {
          for (let i2 = 0; i2 < prop[eid2].length; i2++) {
            if (prop[eid2][i2] !== prop[eid2][$queryShadow][i2]) {
              dirty = true;
              prop[eid2][$queryShadow][i2] = prop[eid2][i2];
            }
          }
        } else {
          if (prop[eid2] !== shadow[eid2]) {
            dirty = true;
            shadow[eid2] = prop[eid2];
          }
        }
      }
      if (dirty)
        q.changed.push(eid2);
    }
    return q.changed;
  };
  var defineQuery = (components2) => {
    if (components2 === void 0 || components2[$componentMap] !== void 0) {
      return (world2) => world2 ? world2[$entityArray] : components2[$entityArray];
    }
    const query = function(world2, clearDiff = true) {
      if (!world2[$queryMap].has(query))
        registerQuery(world2, query);
      const q = world2[$queryMap].get(query);
      queryCommitRemovals(q);
      if (q.changedComponents.length)
        return diff(q, clearDiff);
      return q.dense;
    };
    query[$queryComponents] = components2;
    return query;
  };
  var queryCheckEntity = (world2, q, eid2) => {
    const {
      masks,
      notMasks,
      generations
    } = q;
    for (let i = 0; i < generations.length; i++) {
      const generationId = generations[i];
      const qMask = masks[generationId];
      const qNotMask = notMasks[generationId];
      const eMask = world2[$entityMasks][generationId][eid2];
      if (qNotMask && (eMask & qNotMask) !== 0) {
        return false;
      }
      if (qMask && (eMask & qMask) !== qMask) {
        return false;
      }
    }
    return true;
  };
  var queryAddEntity = (q, eid2) => {
    if (q.has(eid2))
      return;
    q.add(eid2);
    q.entered.push(eid2);
  };
  var queryCommitRemovals = (q) => {
    while (q.toRemove.length) {
      q.remove(q.toRemove.pop());
    }
  };
  var commitRemovals = (world2) => {
    world2[$dirtyQueries].forEach(queryCommitRemovals);
    world2[$dirtyQueries].clear();
  };
  var queryRemoveEntity = (world2, q, eid2) => {
    if (!q.has(eid2))
      return;
    q.toRemove.push(eid2);
    world2[$dirtyQueries].add(q);
    q.exited.push(eid2);
  };
  var $componentMap = Symbol("componentMap");
  var components = [];
  var resizeComponents = (size) => {
    components.forEach((component) => resizeStore(component, size));
  };
  var defineComponent = (schema) => {
    const component = createStore(schema, getDefaultSize());
    if (schema && Object.keys(schema).length)
      components.push(component);
    return component;
  };
  var incrementBitflag = (world2) => {
    world2[$bitflag] *= 2;
    if (world2[$bitflag] >= 2 ** 32) {
      world2[$bitflag] = 1;
      world2[$entityMasks].push(new Uint32Array(world2[$size]));
    }
  };
  var registerComponent = (world2, component) => {
    if (!component)
      throw new Error(`bitECS - Cannot register null or undefined component`);
    const queries = new Set();
    const notQueries = new Set();
    world2[$queries].forEach((q) => {
      if (q.components.includes(component)) {
        queries.add(q);
      } else if (q.notComponents.includes(component)) {
        notQueries.add(q);
      }
    });
    world2[$componentMap].set(component, {
      generationId: world2[$entityMasks].length - 1,
      bitflag: world2[$bitflag],
      store: component,
      queries,
      notQueries
    });
    if (component[$storeSize] < world2[$size]) {
      resizeStore(component, world2[$size]);
    }
    incrementBitflag(world2);
  };
  var hasComponent = (world2, component, eid2) => {
    const registeredComponent = world2[$componentMap].get(component);
    if (!registeredComponent)
      return;
    const {
      generationId,
      bitflag
    } = registeredComponent;
    const mask = world2[$entityMasks][generationId][eid2];
    return (mask & bitflag) === bitflag;
  };
  var addComponent = (world2, component, eid2, reset = false) => {
    if (!Number.isInteger(eid2)) {
      component = world2;
      world2 = eidToWorld.get(eid2);
      reset = eid2 || reset;
    }
    if (!world2[$componentMap].has(component))
      registerComponent(world2, component);
    if (hasComponent(world2, component, eid2))
      return;
    const c = world2[$componentMap].get(component);
    const {
      generationId,
      bitflag,
      queries,
      notQueries
    } = c;
    notQueries.forEach((q) => {
      const match = queryCheckEntity(world2, q, eid2);
      if (match)
        queryRemoveEntity(world2, q, eid2);
    });
    world2[$entityMasks][generationId][eid2] |= bitflag;
    queries.forEach((q) => {
      const match = queryCheckEntity(world2, q, eid2);
      if (match)
        queryAddEntity(q, eid2);
    });
    world2[$entityComponents].get(eid2).add(component);
    if (reset)
      resetStoreFor(component, eid2);
  };
  var removeComponent = (world2, component, eid2, reset = true) => {
    if (!Number.isInteger(eid2)) {
      component = world2;
      world2 = eidToWorld.get(eid2);
      reset = eid2 || reset;
    }
    const c = world2[$componentMap].get(component);
    const {
      generationId,
      bitflag,
      queries,
      notQueries
    } = c;
    if (!(world2[$entityMasks][generationId][eid2] & bitflag))
      return;
    queries.forEach((q) => {
      const match = queryCheckEntity(world2, q, eid2);
      if (match)
        queryRemoveEntity(world2, q, eid2);
    });
    world2[$entityMasks][generationId][eid2] &= ~bitflag;
    notQueries.forEach((q) => {
      const match = queryCheckEntity(world2, q, eid2);
      if (match)
        queryAddEntity(q, eid2);
    });
    world2[$entityComponents].get(eid2).delete(component);
    if (reset)
      resetStoreFor(component, eid2);
  };
  var $size = Symbol("size");
  var $resizeThreshold = Symbol("resizeThreshold");
  var $bitflag = Symbol("bitflag");
  var $archetypes = Symbol("archetypes");
  var $localEntities = Symbol("localEntities");
  var worlds = [];
  var resizeWorlds = (size) => {
    worlds.forEach((world2) => {
      world2[$size] = size;
      for (let i = 0; i < world2[$entityMasks].length; i++) {
        const masks = world2[$entityMasks][i];
        world2[$entityMasks][i] = resize(masks, size);
      }
      world2[$resizeThreshold] = world2[$size] - world2[$size] / 5;
    });
  };
  var createWorld = () => {
    const world2 = {};
    resetWorld(world2);
    worlds.push(world2);
    return world2;
  };
  var resetWorld = (world2) => {
    const size = getGlobalSize();
    world2[$size] = size;
    if (world2[$entityArray])
      world2[$entityArray].forEach((eid2) => removeEntity(world2, eid2));
    world2[$entityMasks] = [new Uint32Array(size)];
    world2[$entityComponents] = new Map();
    world2[$archetypes] = [];
    world2[$entitySparseSet] = SparseSet();
    world2[$entityArray] = world2[$entitySparseSet].dense;
    world2[$bitflag] = 1;
    world2[$componentMap] = new Map();
    world2[$queryMap] = new Map();
    world2[$queries] = new Set();
    world2[$notQueries] = new Set();
    world2[$dirtyQueries] = new Set();
    world2[$localEntities] = new Map();
    return world2;
  };
  var defineSystem = (fn1, fn2) => {
    const update = fn2 !== void 0 ? fn2 : fn1;
    const create = fn2 !== void 0 ? fn1 : void 0;
    const init = new Set();
    const system = (world2, ...args) => {
      if (create && !init.has(world2)) {
        create(world2, ...args);
        init.add(world2);
      }
      update(world2, ...args);
      commitRemovals(world2);
      return world2;
    };
    Object.defineProperty(system, "name", {
      value: (update.name || "AnonymousSystem") + "_internal",
      configurable: true
    });
    return system;
  };
  var pipe = (...fns) => (...args) => {
    const input = Array.isArray(args[0]) ? args[0] : args;
    if (!input || input.length === 0)
      return;
    fns = Array.isArray(fns[0]) ? fns[0] : fns;
    let tmp = input;
    for (let i = 0; i < fns.length; i++) {
      const fn = fns[i];
      if (Array.isArray(tmp)) {
        tmp = fn(...tmp);
      } else {
        tmp = fn(tmp);
      }
    }
    return tmp;
  };

  // src/index.js
  console.log("Testing bitECS queries");
  var ComponentA = defineComponent();
  var hasA = defineQuery([ComponentA]);
  var doesntHaveA = defineQuery([Not(ComponentA)]);
  var prevHas;
  var prevDoesnt;
  var systemA = defineSystem((world2) => {
    hasA(world2).forEach((eid2) => {
      removeComponent(world2, ComponentA, eid2);
      console.log("Removed Component A");
    });
    doesntHaveA(world2).forEach((eid2) => {
      addComponent(world2, ComponentA, eid2);
      console.log("Added Component A");
    });
    const has = hasA(world2).length;
    const doesnt = doesntHaveA(world2).length;
    if (prevHas !== has || prevDoesnt !== doesnt) {
      console.log(`${has} entities have A, ${doesnt} entities don't have A`);
    }
    prevHas = has;
    prevDoesnt = doesnt;
  });
  var world = createWorld();
  var pipeline = pipe([systemA]);
  var eid = addEntity(world);
  var lastTime = performance.now();
  world.time = {};
  var tick = () => {
    world.time.time = performance.now();
    world.time.delta = world.time.time - lastTime;
    lastTime = world.time.time;
    pipeline(world);
    requestAnimationFrame(tick);
  };
  tick();
})();
//# sourceMappingURL=main.js.map

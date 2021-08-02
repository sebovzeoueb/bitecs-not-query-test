import { addComponent, addEntity, commitRemovals, createWorld, defineComponent, defineQuery, defineSystem, hasComponent, Not, pipe, removeComponent } from "bitecs"

console.log("Testing bitECS queries")

const ComponentA = defineComponent()
const world = createWorld()
const eid = addEntity(world)

const hasA = defineQuery([ComponentA])
const doesntHaveA = defineQuery([Not(ComponentA)])

let prevHasA
let prevDoesntA

const systemA = defineSystem(world => {
  hasA(world).forEach(eid => {
    removeComponent(world, ComponentA, eid)
    console.log("Removed Component A")
  })
  // commitRemovals(world)
  doesntHaveA(world).forEach(eid => {
    addComponent(world, ComponentA, eid)
    console.log("Added Component A")
  })
  const has = hasA(world).length
  const doesnt = doesntHaveA(world).length
  if (prevHasA !== has || prevDoesntA !== doesnt) {
    console.log(`systemA: ${has} entities have A, ${doesnt} entities don't have A`)
  }
  prevHasA = has
  prevDoesntA = doesnt
})

let prevEntHas
let prevHasB
let prevDoesntB

const systemB = defineSystem(world => {
  const entHas = hasComponent(world, ComponentA, eid)
  if (prevEntHas !== entHas) {
    console.log(`systemB: entity has Component A: ${entHas}`)
  }
  const has = hasA(world).length
  const doesnt = doesntHaveA(world).length
  if (prevHasB !== has || prevDoesntB !== doesnt) {
    console.log(`systemB: ${has} entities have A, ${doesnt} entities don't have A`)
  }
  prevHasB = has
  prevDoesntB = doesnt
  prevEntHas = entHas
})

const pipeline = pipe([systemA, systemB])

let lastTime = performance.now()
world.time = { }
const tick = () => {
  world.time.time = performance.now()
  world.time.delta = world.time.time - lastTime
  lastTime = world.time.time
  pipeline(world)
  requestAnimationFrame(tick)
}
tick()
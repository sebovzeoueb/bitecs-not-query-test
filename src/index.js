import { addComponent, addEntity, createWorld, defineComponent, defineQuery, defineSystem, Not, pipe, removeComponent } from "bitecs"

console.log("Testing bitECS queries")

const ComponentA = defineComponent()

const hasA = defineQuery([ComponentA])
const doesntHaveA = defineQuery([Not(ComponentA)])

let prevHas
let prevDoesnt

const systemA = defineSystem(world => {
  hasA(world).forEach(eid => {
    removeComponent(world, ComponentA, eid)
    console.log("Removed Component A")
  })
  doesntHaveA(world).forEach(eid => {
    addComponent(world, ComponentA, eid)
    console.log("Added Component A")
  })
  const has = hasA(world).length
  const doesnt = doesntHaveA(world).length
  if (prevHas !== has || prevDoesnt !== doesnt) {
    console.log(`${has} entities have A, ${doesnt} entities don't have A`)
  }
  prevHas = has
  prevDoesnt = doesnt
})

const world = createWorld()

const pipeline = pipe([systemA])

const eid = addEntity(world)

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
# bitecs-not-query-test
Demonstration of a potential bug with bitECS query system

## UPDATE

Leaving this up here for future reference if someone is struggling with the same problem. It appears this isn't really a bug, but a consequence of entity removal being updated at the end of a system execution. The solution is to either use 2 systems or call `commitRemovals` in between the queries.

## UPDATE 2

On further reflection I do actually believe this to be a bug or at least something the user needs to be safeguarded against. If you remove and add the same component during the same system call, `hasComponent` correctly registers that the entity has the component, but queries still see it as removed. This behaviour persists outside of the system call as shown by my latest commits.

## How to run

- open index.html
- open dev console

The code creates one entity, then System A will remove Component A from entities which have it, then add it to those which don't. The expected behaviour is for the entity to always have Component A, and thus for the `hasA` query to have a length of 1, however after removing Component A and adding it again both the `hasA` and `doesntHaveA` queries are empty, as you can see from the console logs. 

You can see that this odd behaviour is persisting in System B.

I have already built the code, however if you need to rebuild after making changes, `npm i` to install dependencies, and do `npm run build` to launch the esbuild build script.

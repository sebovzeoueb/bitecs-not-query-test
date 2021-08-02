# bitecs-not-query-test
Demonstration of a potential bug with bitECS query system

- open index.html
- open dev console

The code creates one entity, then System A will remove Component A from entities which have it, then add it to those which don't. The expected behaviour is for the entity to always have Component A, and thus for the `hasA` query to have a length of 1, however after removing Component A and adding it again both the `hasA` and `doesntHaveA` queries are empty, as you can see from the console logs.

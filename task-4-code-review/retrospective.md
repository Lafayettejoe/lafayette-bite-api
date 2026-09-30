# Task 4 Retrospective

## Best comment I received

The question mbatavictoria06 asked on my `updateOrderStatus` PR: "Is CANCELLED from READY intended to reflect the exact business workflow?" It wasn't phrased as a criticism — just a question — but it exposed a real gap in `ALLOWED_TRANSITIONS`: I'd allowed an order to be cancelled even after it was READY (essentially done, food already made), which makes no operational sense. It was the best comment because it didn't tell me I was wrong, it asked me to justify a decision I'd never actually made deliberately — and when I tried to justify it, I couldn't. That's the difference between a good review question and a nitpick: it finds the place where you were coasting on an assumption instead of a decision.

## Best comment I gave

On ahurika's background-jobs PR, the concurrency-cap comment: `tick()` checks `activeJobs >= WORKER_CONCURRENCY` before claiming a job, but `activeJobs++` only happens after the claim's `await` resolves — so multiple `tick()` calls can pass the check during that async gap before any of them increments the counter. I didn't just assert this from reading the code; the author's own evidence file (`test1_50_jobs_concurrency.txt`) showed the worker running 15 concurrent jobs against a configured cap of 5, which is the check-then-act race actually happening, logged by their own test. If that had shipped and been ignored, the whole point of Task 2 — proving the concurrency cap holds — would have been false in production while the evidence file said it passed.

## What I caught in someone else's code that I've also done in mine

Missing tests for the exact logic that most needs them. I flagged it twice on peer PRs — nmesomarose's `test:break-it:all` script didn't actually run the five break-it tests the README claimed it did, and on beekayoye's PR the README described a `'failed'` status that didn't exist anywhere in `handler.ts`. Both were cases of the documentation/tests claiming more coverage than the code actually had. Then I got the identical comment on my own PR: no tests for `ALLOWED_TRANSITIONS`, the single most important piece of logic in that file. I was reviewing other people for a gap I had myself. Writing the tests after the fact (`test-order-status.ts`) also surfaced the READY→CANCELLED bug — which is exactly the pattern I'd pointed out to nmesomarose: untested logic hides broken behavior until someone writes the test.

## What I'd change about how I write PRs

Write the tests for the critical-path logic (state machines, permission checks, anything with a matrix of allowed/forbidden cases) before opening the PR, not after a reviewer asks. Having now reviewed three PRs where the same gap showed up — a script or doc claiming coverage that didn't exist — I'd rather catch it myself than have a reviewer catch it and then scramble to fix it under a deadline. I'd also keep the README and the actual code in sync as I go, since two of the PRs I reviewed had documentation describing behavior the code didn't have.
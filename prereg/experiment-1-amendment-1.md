# Amendment 1 to experiment 1

Written on 27 Nov 2026, before the experiment has any data. `prereg/experiment-1.md` is not edited; this file records a change to
how simulated traffic is handled.

## What changes

The registration says simulated runs go in a separate environment and are reported separately. If real traffic is too thin by the
stopping rule, simulated visitors will instead be added to the **same experiment**, as identities named `sim_<n>` made by
`scripts/simulate-traffic.ts`. The rates at which they like a roast, or come back for a second one, are assumed, and are written in
that script.

## Why

The track allows simulated traffic. Development is the only environment we know has a warehouse connection, so a separate
environment may not be able to show results at all.

## What follows from it

- Results then mix real and simulated visitors, and Flagsmith cannot tell them apart. Everything that shows those results (the
  README, the submission form, the video, `/race`) must say that they include simulated traffic, and how many visitors were simulated.
- The results snapshot is marked `simulated`, and the decision rule never ships a prompt from a result marked that way.
- A result built on assumed rates shows that the pipeline works. It says nothing about which prompt people prefer.
- The hypothesis, the arms, the split, the metrics and the decision rule are unchanged.

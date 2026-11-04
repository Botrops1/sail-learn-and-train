# Security

**Sail: learn and train** is a static website: there is no server of its own, no account, no login and no data sent anywhere. What the app remembers (layout choices, imported boat profiles) stays in the visitor's browser. Settings travel in the page link.

Problems that still matter, for example:

- a link, a setup file or a boat profile that makes the app run someone else's code or show someone else's page;
- a dependency with a known vulnerability that the built site uses;
- anything in the repository or its workflows that could let someone change the live site.

## How to report

Please **do not open a public issue.** Report it privately: open the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/Botrops1/sail-learn-and-train/security/advisories/new)). Describe what you found and how to reproduce it.

This is a one‑person hobby project, so a reply can take a few days. Fixes go to the live site as soon as they are merged.

## Supported version

Only the live site, https://botrops1.github.io/sail-learn-and-train/, which is always the latest `main`.

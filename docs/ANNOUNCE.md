# Announcement drafts

For the owner. The link-preview picture appears by itself when you paste the link. Post only after `v1.0.0` is released. Read each place's rules page before posting, and reply to comments yourself. The site's address in every text: `https://botrops1.github.io/sail-learn-and-train/`

**How to post** (all places):
- Post in one place a day, not everywhere at once; r/learntosail and r/sailing on different days. The three.js forum and Show HN bring developers more than learners: post there after the sailing places.
- Stay for the first 3–4 hours to answer comments: the early replies decide whether a post is seen.
- Being open about the AI assistant heads off "AI slop" comments; answer them with the sourced, tested sailing rules ([`PHYSICS_TRUTHS.md`](PHYSICS_TRUTHS.md)).
- Before posting: label 3–5 small issues `good first issue`, so people who want to help find somewhere to start.

Plain words, no superlatives. Every text says that the app is free, open source (GPL) and made by one person with an AI coding assistant, and asks sailors for corrections.

---

## r/sailing

Rules to read first: https://www.reddit.com/r/sailing/about/rules

Post as a gallery with three or four pictures from [`docs/screenshots/`](screenshots) (the phone exercise first), with this text as the body; or as a 20–30 second screen recording made on a computer. **Check the first sentence: it must be your own story.**

**Title:** I made a free, open-source 3D sailing trainer that runs in the browser. Learn what every rope and sail on a cruising yacht does (sailors wanted to find my mistakes)

**Text:**

I'm learning to sail, and on a cruising yacht I couldn't tell one rope from another or say what it actually did. So I built the thing I wanted: a 3D Hanse 508 in your browser where you set the wind, work the ropes, and watch what the sails and the boat do.

**What you can do**

- **Learn the names:** tap any part or rope to see what it's called, what it does, the typical mistakes, and where the information comes from.
- **Work the ropes:** use simple sliders, or *Realistic* mode with clutches, electric winches and a winch handle, where ropes slip if you don't hold them.
- **Sail:** see heel, weather helm, sails that flap or stall, and telltales. Use the autopilot, tacks and gybes, including an accidental gybe.
- **Harbour and anchor:** engine, bow and stern thrusters, fenders and mooring lines. Go stern-to in a Med marina, pick up a mooring buoy, or anchor with a line ashore. If you hit something you get a damage report.
- **17 guided exercises with a coach**, from the points of sail to a night at anchor while a bura (the Adriatic's strong north-east wind) comes in. *Watch it* lets the app sail it for you, *Show me* plays one step, then it's your turn.
- **The link is the state:** wind, boat, ropes and exercise step are all in the URL. Settings → Share gives a link to exactly what you see. That makes it easy to ask "why does my jib do this?" or to report a bug.

**Tech:** TypeScript and three.js, GPL-3.0. There are no 3D model files. The boat, rig, marina and bay are built in code from a JSON file of numbers, so every part can be read, diffed and corrected. The sailing rules the simulation must follow are written down with sources, and each one has a test.

**Honest limits**

- Clarity over realism. The physics is simplified on purpose. It is a learning aid, not a replacement for a course or the skipper's briefing.
- The surroundings are basic: sea, sky, a marina and a bay. Enough for the exercises, not a pretty game.
- The exercises and the Learn pages work on a phone. For the full experience (Realistic rope work, with the map and panels side by side) you need a computer.
- English only for now. The Russian version is an AI draft waiting for a sailor's review.
- I built it alone with an AI coding assistant, so it needs experienced eyes.

**Where I'd love help**

- **Sailors and instructors:** tell me what's wrong for a real yacht, and suggest exercises.
- **Translators:** a language is a folder of text files, no coding needed.
- **Boat owners:** describe your boat as a profile (a file of numbers).
- **Developers and 3D people:** new boats with different rigs, new sailing areas, features, and performance on your phone (add `?debug=1` to the address).

App: https://botrops1.github.io/sail-learn-and-train/
Code and how to help: https://github.com/Botrops1/sail-learn-and-train (see CONTRIBUTING.md)

---

## r/learntosail

Rules to read first: https://www.reddit.com/r/learntosail/about/rules

**Title:** A free app to see what the ropes and sails of a cruising yacht do before you step aboard

**Text:**

If you are new to sailing, the first day aboard is a lot of ropes. This is a free web app that lets you practise on a 3D model of a Hanse 508 first: set the wind, pull or ease a sheet, and watch the sails, the boat and the heel respond. Seventeen guided exercises with a coach cover the points of sail, tacking, gybing, reducing sail, leaving the berth, anchoring and more. The Learn list explains every part and rope (what it is, what it does, typical mistakes).

It is a learning aid, not a replacement for real instruction. It is free, open source (GPL), runs in a phone's browser (a computer gives the full experience), and is made by one person with an AI coding assistant. Experienced sailors: I would be grateful for corrections and exercise ideas.

https://botrops1.github.io/sail-learn-and-train/

---

## Cruisers Forum

Rules to read first: the forum's rules page, linked from https://www.cruisersforum.com/forums/ (check it before posting). Suggested section: the training or beginners section.

**Title:** Free app for beginners: what every rope and sail on a cruising yacht does

**Text:**

I am a beginner and made a free web app to help people like me understand a cruising yacht before crewing on one. It is a 3D Hanse 508 where you set a test wind, work the ropes and see what the sails and the boat do. Seventeen guided exercises include tacking, gybing, reducing sail, leaving the berth, a mooring buoy, anchoring and the Adriatic's maestral and bura. The exercises work on a phone; the full experience wants a computer.

It is free and open source (GPL), made by one person with an AI coding assistant. The behaviour is simplified, and I know there will be mistakes. Experienced cruisers: please tell me what is wrong or missing. Settings → Share gives a link to exactly what you see.

https://botrops1.github.io/sail-learn-and-train/

---

## three.js forum, Showcase

Rules to read first: the category's pinned guidelines at https://discourse.threejs.org/c/showcase

**Title:** Sail: learn and train, a 3D cruising yacht that teaches how ropes and sails behave

**Text:**

A free, open-source (GPL) browser app built with three.js and TypeScript. It shows a beginner how the ropes, sheets and sails of a Hanse 508 behave: a rig solver turns wind and rope settings into sail forces, and the boat heels, steers and sails on simple waves, with a day-and-night sky, a marina and a bay. It runs on phones, with a phone-first layout and a coach for guided exercises.

It was made by one person with an AI coding assistant. I would welcome feedback on performance on your devices (add `?debug=1` to the address to see the frame rate), and corrections from sailors.

https://botrops1.github.io/sail-learn-and-train/

---

## Hacker News, Show HN

Rules to read first: https://news.ycombinator.com/showhn.html

**Title (at most 80 characters):** Show HN: A 3D sailing yacht that teaches beginners what each rope does

**First comment:**

I am learning to sail and wanted to see what each rope and sail of a cruising yacht does before stepping aboard. This is a free, open-source (GPL) web app with a 3D Hanse 508: you set a wind, work the ropes, and the sails and boat respond. Seventeen guided exercises include tacking, gybing and leaving the berth. The boat, rig and marina are built entirely in code from a JSON file of numbers (no model files), and the whole state is in the URL. It works on a phone, with nothing to install; the full experience wants a computer. It was made by one person with an AI coding assistant, and the physics is simplified for clarity. Sailors, I would like to hear what is wrong.

https://botrops1.github.io/sail-learn-and-train/

---

## Russian (after the sailor's review)

Russian sailing Telegram groups the owner knows. The text is written after the review of `docs/review/ru.md`.

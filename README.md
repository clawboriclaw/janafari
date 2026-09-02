# Our Madden 27 Board

A private, no-account weekly ratings tracker built for an older iPad. It is a static site: no build
step, framework, analytics, ads, or external font/image requests.

Live site: <https://clawboriclaw.github.io/madden-27-family-board/>

## Open it on an iPad

From this folder, start the included static site with:

```bash
python3 -m http.server 8027 --bind 0.0.0.0
```

On an iPad connected to the same Wi-Fi network, visit `http://COMPUTER-IP:8027`. In Safari, use
Share → Add to Home Screen for an app-like shortcut.

Ratings history is stored in that browser's local storage. Use **Backup** in the dashboard to save a
copy before clearing Safari's website data. Separate devices do not automatically share changes.

## Weekly use

1. Open the official EA ratings link at the bottom of the dashboard.
2. Tap **Update week**.
3. Change only the ratings EA changed, give the snapshot a week name, and save.
4. Use the week picker to move through history. The arrows and sparklines compare snapshots.

## Data provenance

The launch snapshot was seeded on 2026-09-02 from the published Madden NFL 27 top-player list and
cross-checked against EA's official Madden NFL 27 ratings database. It tracks a 20-player watchlist;
it does not claim to mirror EA automatically.

Official source: <https://www.ea.com/games/madden-nfl/ratings>

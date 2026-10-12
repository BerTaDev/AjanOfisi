# Ses Efektleri — Kaynaklar ve Lisanslar

All sound effects in `sfx/` come from free libraries and are released under **CC0 1.0 (public domain dedication)**. No attribution is legally required; the credits below are given as a courtesy.

## Genel işlem (common processing)

Every shipped file was made from the original listed below with ffmpeg + a small Python script:

- downmixed to **mono**, resampled to **44.1 kHz**
- gentle 30 Hz high-pass (DC / rumble removal)
- trimmed to the time range given in the table (leading silence removed, short sine fade-in, short fade-out)
- **peak-normalised to about -2 dBFS** (exceptions noted)
- encoded as **OGG Vorbis, quality 4**

Originals are kept unchanged in `sources/sfx/` (local only, git-ignored).

## Kaynak siteler (source sites)

| Source | Author | Licence | Link |
|---|---|---|---|
| BigSoundBank | Joseph Sardin | CC0 1.0 | https://bigsoundbank.com/licenses.html |
| Kenney "Interface Sounds" pack | Kenney (kenney.nl) | CC0 1.0 | https://kenney.nl/assets/interface-sounds |
| "The Essential Retro Video Game Sound Effects Collection [512 sounds]" | Juhani Junkala (SubspaceAudio) | CC0 1.0 | https://opengameart.org/content/512-sound-effects-8-bit-style |
| Freesound (individual sounds below, each page marked CC0; HQ preview MP3 used) | various | CC0 1.0 | https://freesound.org |

## Dosyalar (files)

| File | Source title | Author | Page | Licence | What was done |
|---|---|---|---|---|---|
| `type_1.ogg` | Quick Keyboard | Joseph Sardin | https://bigsoundbank.com/quick-keyboard-s1734.html | CC0 | cut 0.50–1.39 s (fast burst) |
| `type_2.ogg` | Computer Keyboard | Joseph Sardin | https://bigsoundbank.com/computer-keyboard-s0229.html | CC0 | cut 1.92–2.94 s (steady burst) |
| `type_3.ogg` | Slow Keyboard | Joseph Sardin | https://bigsoundbank.com/slow-keyboard-s1733.html | CC0 | cut 3.06–4.03 s (slow, hesitant) |
| `type_4.ogg` | Quick Keyboard | Joseph Sardin | https://bigsoundbank.com/quick-keyboard-s1734.html | CC0 | cut 10.01–10.79 s (short burst) |
| `step_1.ogg` | Man Footsteps on the Wooden Floor | Joseph Sardin | https://bigsoundbank.com/man-footsteps-on-the-wooden-floor-s0165.html | CC0 | single step, cut 1.07–1.37 s |
| `step_2.ogg` | Man Footsteps on the Wooden Floor | Joseph Sardin | https://bigsoundbank.com/man-footsteps-on-the-wooden-floor-s0165.html | CC0 | single step, cut 1.70–2.00 s |
| `step_3.ogg` | Man Footsteps on the Wooden Floor | Joseph Sardin | https://bigsoundbank.com/man-footsteps-on-the-wooden-floor-s0165.html | CC0 | single step, cut 2.92–3.22 s |
| `step_4.ogg` | Man Footsteps on the Wooden Floor | Joseph Sardin | https://bigsoundbank.com/man-footsteps-on-the-wooden-floor-s0165.html | CC0 | single step, cut 7.44–7.74 s |
| `phone_ring.ogg` | Phone Ring #5 (Philips cordless landline, electronic trill) | Joseph Sardin | https://bigsoundbank.com/phone-ring-5-s0375.html | CC0 | one ring cycle, cut 0.075–2.30 s, 0.2 s fade-out |
| `door_open.ogg` | automatic door open | saangosu | https://freesound.org/people/saangosu/sounds/781083/ | CC0 | cut 0.04–1.45 s |
| `door_chime.ogg` | Doorbell #2 (electronic ding-dong) | Joseph Sardin | https://bigsoundbank.com/doorbell-2-s0160.html | CC0 | cut 0–1.55 s, 0.45 s fade-out |
| `pop_1.ogg` | drop_002 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | cut to 0.12 s |
| `pop_2.ogg` | drop_003 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | cut to 0.12 s |
| `pop_3.ogg` | drop_004 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | cut to 0.14 s |
| `done.ogg` | confirmation_004 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | normalised only |
| `error.ogg` | error_006 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | cut to 0.30 s |
| `question.ogg` | question_004 (Interface Sounds) | Kenney | https://kenney.nl/assets/interface-sounds | CC0 | normalised only |
| `alarm.ogg` | Electronic alarm (buzzer) #2 | Joseph Sardin | https://bigsoundbank.com/electronic-alarm-buzzer-2-s0089.html | CC0 | two beeps, cut 0–0.97 s |
| `yawn.ogg` | Yawn #1 | Joseph Sardin | https://bigsoundbank.com/yawn-1-s1406.html | CC0 | cut 0.25–4.45 s |
| `snore_1.ogg` | Man Snoring | Joseph Sardin | https://bigsoundbank.com/man-snoring-s0170.html | CC0 | one snore + breath pause, cut 0.32–2.92 s |
| `snore_2.ogg` | Man Snoring | Joseph Sardin | https://bigsoundbank.com/man-snoring-s0170.html | CC0 | one snore + breath pause, cut 8.40–11.00 s |
| `meow_1.ogg` | Meow Cat #10 | Joseph Sardin | https://bigsoundbank.com/meow-cat-10-s1898.html | CC0 | main meow only, cut 0.61–1.45 s |
| `meow_2.ogg` | Little Meow of a Cat #1 | Joseph Sardin | https://bigsoundbank.com/little-meow-of-a-cat-s0494.html | CC0 | cut 0–0.46 s |
| `purr.ogg` | Cat Purr | Joseph Sardin | https://bigsoundbank.com/cat-purr-s0436.html | CC0 | cut 2.50–6.60 s, soft fades |
| `coffee.ogg` | Nespresso coffee maker #3 | Joseph Sardin | https://bigsoundbank.com/nespresso-coffee-maker-3-s3049.html | CC0 | pump start, cut 4.10–7.30 s, 0.8 s fade-out |
| `printer.ogg` | Inkjet printer | Joseph Sardin | https://bigsoundbank.com/inkjet-printer-s0169.html | CC0 | ~3 line passes, cut 7.37–9.95 s |
| `jingle.ogg` | Level win | Tuudurt | https://freesound.org/people/Tuudurt/sounds/258142/ | CC0 | cut 0–3.40 s, 0.3 s fade-out |
| `ambience.ogg` | Office_Ambience_Interior_quiet | joseegn | https://freesound.org/people/joseegn/sounds/752611/ | CC0 | 32 s taken from 55–87 s, last 2 s equal-power crossfaded into the start → seamless 30 s loop; 25 Hz high-pass; RMS set to -30 dBFS (peak about -17 dBFS) instead of peak-normalising |
| `arcade.ogg` | sfx_sounds_Blip9, sfx_sounds_Blip8, sfx_coin_double1, sfx_sounds_powerup10 | Juhani Junkala (SubspaceAudio) | https://opengameart.org/content/512-sound-effects-8-bit-style | CC0 | short blip-blip-coin-powerup sequence assembled from 4 sounds; peak -3.8 dBFS before encoding (square waves overshoot slightly in Vorbis) |
| `water.ogg` | Glug Glug | Zott820 | https://freesound.org/people/Zott820/sounds/568471/ | CC0 | 6 glugs, cut 1.03–2.62 s |
| `marker.ogg` | Whiteboard marker | Joseph Sardin | https://bigsoundbank.com/whiteboard-marker-s0807.html | CC0 | cut 0.17–1.16 s |
| `chair.ogg` | Office Chair - Sitting Down 2 | MWsfx | https://freesound.org/people/MWsfx/sounds/573719/ | CC0 | sit-down creak, cut 1.37–1.90 s |

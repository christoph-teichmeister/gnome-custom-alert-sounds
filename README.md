# Custom Alert Sounds

A GNOME Shell extension that lets you select custom `.ogg`, `.oga`, or `.wav` files as your system alert sound
directly from Quick Settings — no `sudo` required.

## Features

- Switch between built-in GNOME alert sounds from the Quick Settings panel
- Add custom `.ogg`, `.oga`, or `.wav` files by dropping them in a dedicated folder
- Preview any sound before selecting it
- Changes take effect immediately — no restart needed

## Screenshots

*Alert Sound toggle in Quick Settings*

![Alert Sound toggle in Quick Settings](images/quick-settings.png)

*Sound picker with built-in and custom sounds*

![Sound picker with built-in and custom sounds](images/sound-picker.png)

## Requirements

- GNOME Shell 45–50
- `glib-compile-schemas` (part of `libglib2.0-dev` / `glib2-devel`)
- For sound preview: `paplay` (PulseAudio), `pw-play` (PipeWire), or `aplay` (ALSA) — one is usually pre-installed

## Installation

### From GNOME Extensions

Install via [extensions.gnome.org](https://extensions.gnome.org) (search for *Custom Alert Sounds*).

### From Source

```bash
git clone https://github.com/christoph-teichmeister/gnome-custom-alert-sounds.git
cd gnome-custom-alert-sounds
make install
make enable
```

Log out and back in (or restart the shell with `Alt+F2` → `r`) if the extension doesn't appear immediately.

## Adding Custom Sounds

1. Open Quick Settings and click the **Alert Sound** toggle menu.
2. Click **Open Sounds Folder** — this opens `~/.local/share/custom-alerts/` (created on first run).
3. Drop any `.ogg`, `.oga`, or `.wav` file into that folder. It appears in the menu instantly.

## Development

```bash
# Compile GSettings schema
make schemas

# Install locally
make install && make enable

# Build a zip for upload to extensions.gnome.org
make package

# Remove the extension
make uninstall
```

### Packaging for extensions.gnome.org

`make package` produces `dist/custom-alert-sounds@christoph-teichmeister.github.io.zip`.

The ZIP contains exactly these files — nothing else:

```
metadata.json
extension.js
alertManager.js
prefs.js
schemas/
  org.gnome.shell.extensions.custom-alert-sounds.gschema.xml
locale/
  de/LC_MESSAGES/custom-alert-sounds.mo
  en/LC_MESSAGES/custom-alert-sounds.mo
  es/LC_MESSAGES/custom-alert-sounds.mo
  fr/LC_MESSAGES/custom-alert-sounds.mo
```

> `gschemas.compiled` is **not** included — GNOME 45+ compiles schemas automatically on install.

Do **not** include `.git/`, `po/`, `node_modules/`, `venv/`, `images/`, `Makefile`, or `README.md`.

## License

GPL-2.0 — see [LICENSE](LICENSE).

# Custom Alert Sounds

A GNOME Shell extension that lets you select custom `.ogg`, `.oga`, or `.wav` files as your system alert sound
directly from Quick Settings — no `sudo` required.

## Features

- Switch between built-in GNOME alert sounds from the Quick Settings panel
- Add custom `.ogg`, `.oga`, or `.wav` files by dropping them in a dedicated folder
- Preview any sound before selecting it
- Changes take effect immediately — no restart needed

## Requirements

- GNOME Shell 45–50
- `glib-compile-schemas` (part of `libglib2.0-dev` / `glib2-devel`)

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
2. Click **Open Sounds Folder** — this opens
   `~/.local/share/gnome-shell/extensions/custom-alert-sounds@christoph-teichmeister.github.io/sounds/` (created on
   first run).
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

## License

GPL-2.0 — see [LICENSE](LICENSE).

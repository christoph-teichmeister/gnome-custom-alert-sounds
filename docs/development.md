# Development

## Commands

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

## Packaging for extensions.gnome.org

`make package` produces `dist/custom-alert-sounds@christoph-teichmeister.github.io.zip`.

The ZIP contains exactly these files - nothing else:

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

> `gschemas.compiled` is **not** included - GNOME 45+ compiles schemas automatically on install.

Do **not** include `.git/`, `po/`, `node_modules/`, `venv/`, `images/`, `Makefile`, or `README.md`.

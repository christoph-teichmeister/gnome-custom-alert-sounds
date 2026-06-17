UUID     = custom-alert-sounds@christoph-teichmeister.github.io
INST_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all schemas install uninstall enable disable package clean

all: schemas

schemas:
	glib-compile-schemas schemas/

install: schemas
	mkdir -p "$(INST_DIR)"
	cp -r extension.js alertManager.js prefs.js metadata.json schemas/ "$(INST_DIR)/"
	@echo "Installed. Run: make enable"

uninstall:
	gnome-extensions disable $(UUID) 2>/dev/null || true
	rm -rf "$(INST_DIR)"

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

package: schemas
	mkdir -p dist
	zip -r "dist/$(UUID).zip" \
		extension.js alertManager.js prefs.js metadata.json schemas/ \
		--exclude "schemas/*.compiled"
	@echo "Package: dist/$(UUID).zip"
	@echo "Upload: https://extensions.gnome.org/upload/"

clean:
	rm -f schemas/gschemas.compiled
	rm -rf dist/

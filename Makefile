UUID     = custom-alert-sounds@christoph-teichmeister.github.io
INST_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
DOMAIN   = custom-alert-sounds
MSGFMT   = msgfmt
XGETTEXT = xgettext
MSGMERGE = msgmerge
LANGS    = de en fr es

.PHONY: all schemas translations pot update-po install uninstall enable disable package clean

all: schemas translations

schemas:
	glib-compile-schemas schemas/

translations: $(addprefix locale/,$(addsuffix /LC_MESSAGES/$(DOMAIN).mo,$(LANGS)))

locale/%/LC_MESSAGES/$(DOMAIN).mo: po/%.po
	mkdir -p $(dir $@)
	$(MSGFMT) -o $@ $<

pot:
	$(XGETTEXT) \
		--from-code=UTF-8 \
		--output=po/$(DOMAIN).pot \
		--keyword=_ \
		--add-comments=Translators \
		--package-name="Custom Alert Sounds" \
		extension.js prefs.js alertManager.js

update-po: pot
	set -e; for lang in $(LANGS); do \
		$(MSGMERGE) --update po/$$lang.po po/$(DOMAIN).pot; \
	done

install: schemas translations
	mkdir -p "$(INST_DIR)"
	cp -r extension.js alertManager.js prefs.js metadata.json schemas/ locale/ "$(INST_DIR)/"
	@echo "Installed. Run: make enable"

uninstall:
	gnome-extensions disable $(UUID) 2>/dev/null || true
	rm -rf "$(INST_DIR)"

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

package: schemas translations
	mkdir -p dist
	zip -r "dist/$(UUID).zip" \
		extension.js alertManager.js prefs.js metadata.json schemas/ locale/ \
		--exclude "schemas/*.compiled"
	@echo "Package: dist/$(UUID).zip"
	@echo "Upload: https://extensions.gnome.org/upload/"

clean:
	rm -f schemas/gschemas.compiled
	rm -rf dist/ locale/

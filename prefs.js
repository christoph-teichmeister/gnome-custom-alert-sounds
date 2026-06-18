import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CustomAlertSoundsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const defaultDir = `${GLib.get_home_dir()}/.local/share/custom-alerts`;

        const page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'audio-speakers-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Custom Sounds'),
            description: _('Drop .ogg, .oga, or .wav files into the directory below to add them as alert sounds.'),
        });
        page.add(group);

        const row = new Adw.ActionRow({
            title: _('Sounds Directory'),
            subtitle: settings.get_string('custom-sounds-dir') || defaultDir,
        });

        const openBtn = new Gtk.Button({
            label: _('Open'),
            valign: Gtk.Align.CENTER,
        });
        openBtn.connect('clicked', () => {
            const dir = settings.get_string('custom-sounds-dir') || defaultDir;
            try {
                Gio.File.new_for_path(dir).make_directory_with_parents(null);
            } catch (_) {}
            Gtk.show_uri(window, `file://${dir}`, 0);
        });
        row.add_suffix(openBtn);

        const changeBtn = new Gtk.Button({
            label: _('Change…'),
            valign: Gtk.Align.CENTER,
        });
        changeBtn.connect('clicked', () => {
            const dialog = new Gtk.FileDialog({
                title: _('Select Sounds Directory'),
                modal: true,
                initial_folder: Gio.File.new_for_path(
                    settings.get_string('custom-sounds-dir') || defaultDir
                ),
            });
            dialog.select_folder(window, null, (dlg, result) => {
                try {
                    const folder = dlg.select_folder_finish(result);
                    if (folder) {
                        const path = folder.get_path();
                        settings.set_string('custom-sounds-dir', path);
                        row.subtitle = path;
                    }
                } catch (e) {
                    if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        console.error(`[custom-alert-sounds] select_folder: ${e.message}`);
                }
            });
        });
        row.add_suffix(changeBtn);

        const resetBtn = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
        });
        resetBtn.connect('clicked', () => {
            settings.reset('custom-sounds-dir');
            row.subtitle = defaultDir;
        });
        row.add_suffix(resetBtn);

        const signalId = settings.connect('changed::custom-sounds-dir', () => {
            row.subtitle = settings.get_string('custom-sounds-dir') || defaultDir;
        });
        window.connect('destroy', () => settings.disconnect(signalId));

        group.add(row);
    }
}

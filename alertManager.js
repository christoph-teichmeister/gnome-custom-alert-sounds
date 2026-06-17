import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const BUILTIN_SOUNDS = [
    {id: 'none',    label: 'None',    path: null},
    {id: 'default', label: 'Default', path: null},
    {id: 'click',   label: 'Click',   path: '/usr/share/sounds/gnome/default/alerts/click.ogg'},
    {id: 'string',  label: 'String',  path: '/usr/share/sounds/gnome/default/alerts/string.ogg'},
    {id: 'swing',   label: 'Swing',   path: '/usr/share/sounds/gnome/default/alerts/swing.ogg'},
    {id: 'hum',     label: 'Hum',     path: '/usr/share/sounds/gnome/default/alerts/hum.ogg'},
];

const GNOME_CUSTOM_DIR = `${GLib.get_home_dir()}/.local/share/sounds/__custom`;
const BELL_FILES = ['bell-terminal.ogg', 'bell-window-system.ogg'];
const SOUND_EXTENSIONS = ['.ogg', '.oga', '.wav'];

export class AlertManager {
    constructor(settings) {
        this._settings = settings;
        this._desktopSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.sound'});
        this._monitor = null;
    }

    get customSoundsDir() {
        const dir = this._settings.get_string('custom-sounds-dir');
        return dir || `${GLib.get_home_dir()}/.local/share/custom-alerts`;
    }

    getBuiltinSounds() {
        return [...BUILTIN_SOUNDS];
    }

    getCustomSounds() {
        const dirPath = this.customSoundsDir;
        const dir = Gio.File.new_for_path(dirPath);
        if (!dir.query_exists(null))
            return [];

        const sounds = [];
        try {
            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const name = info.get_name();
                if (SOUND_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext))) {
                    sounds.push({
                        id: `custom:${name}`,
                        label: name.replace(/\.(ogg|oga|wav)$/i, ''),
                        path: `${dirPath}/${name}`,
                    });
                }
            }
            enumerator.close(null);
        } catch (e) {
            console.error(`[custom-alert-sounds] getCustomSounds: ${e.message}`);
        }
        return sounds.sort((a, b) => a.label.localeCompare(b.label));
    }

    getCurrentSound() {
        try {
            if (!this._desktopSettings.get_boolean('event-sounds'))
                return 'none';

            const theme = this._desktopSettings.get_string('theme-name');
            if (theme !== '__custom')
                return 'default';

            const linkPath = `${GNOME_CUSTOM_DIR}/bell-window-system.ogg`;
            const file = Gio.File.new_for_path(linkPath);
            if (!file.query_exists(null))
                return 'default';

            const fileInfo = file.query_info(
                'standard::symlink-target,standard::is-symlink',
                Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
                null
            );
            if (!fileInfo.get_is_symlink())
                return 'default';

            const target = fileInfo.get_symlink_target();

            const builtin = BUILTIN_SOUNDS.find(s => s.path === target);
            if (builtin)
                return builtin.id;

            const custom = this.getCustomSounds().find(s => s.path === target);
            if (custom)
                return custom.id;

            return target;
        } catch (e) {
            console.error(`[custom-alert-sounds] getCurrentSound: ${e.message}`);
            return 'default';
        }
    }

    setSound(sound) {
        try {
            if (sound.id === 'none') {
                this._desktopSettings.set_boolean('event-sounds', false);
                return;
            }

            this._desktopSettings.set_boolean('event-sounds', true);

            if (sound.id === 'default') {
                this._desktopSettings.set_string('theme-name', 'Yaru');
                return;
            }

            this._ensureDir(GNOME_CUSTOM_DIR);

            for (const bellFile of BELL_FILES) {
                const linkFile = Gio.File.new_for_path(`${GNOME_CUSTOM_DIR}/${bellFile}`);
                try { linkFile.delete(null); } catch (_) {}
                linkFile.make_symbolic_link(sound.path, null);
            }

            // Toggle theme to force GNOME Shell sound cache reload
            this._desktopSettings.set_string('theme-name', 'Yaru');
            this._desktopSettings.set_string('theme-name', '__custom');
        } catch (e) {
            console.error(`[custom-alert-sounds] setSound: ${e.message}`);
        }
    }

    previewSound(path) {
        if (!path)
            return;
        try {
            GLib.spawn_command_line_async(`/usr/bin/paplay '${path.replace(/'/g, "'\\''")}'`);
        } catch (e) {
            console.error(`[custom-alert-sounds] previewSound: ${e.message}`);
        }
    }

    watchCustomDir(callback) {
        this._startMonitor(callback);
        this._settings.connect('changed::custom-sounds-dir', () => {
            if (this._monitor) {
                this._monitor.cancel();
                this._monitor = null;
            }
            this._startMonitor(callback);

            const currentId = this.getCurrentSound();
            if (currentId.startsWith('custom:')) {
                const still = this.getCustomSounds().find(s => s.id === currentId);
                if (!still)
                    this.setSound({id: 'default', label: 'Default', path: null});
            }

            callback();
        });
    }

    _startMonitor(callback) {
        this._ensureDir(this.customSoundsDir);
        try {
            const dir = Gio.File.new_for_path(this.customSoundsDir);
            this._monitor = dir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect('changed', () => callback());
        } catch (e) {
            console.error(`[custom-alert-sounds] _startMonitor: ${e.message}`);
        }
    }

    _ensureDir(path) {
        try {
            Gio.File.new_for_path(path).make_directory_with_parents(null);
        } catch (_) {}
    }

    destroy() {
        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }
        this._desktopSettings = null;
        this._settings = null;
    }
}

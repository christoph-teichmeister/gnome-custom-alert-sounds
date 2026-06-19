import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

const GNOME_CUSTOM_DIR = `${GLib.get_home_dir()}/.local/share/sounds/__custom`;
const BELL_FILES = ["bell-terminal.ogg", "bell-window-system.ogg"];
const SOUND_EXTENSIONS = [".ogg", ".oga", ".wav"];

export class AlertManager {
  constructor(settings) {
    this._settings = settings;
    this._desktopSettings = new Gio.Settings({
      schema_id: "org.gnome.desktop.sound",
    });
    this._monitor = null;
    this._monitorHandlerId = 0;
    this._dirSignalId = 0;
    this._currentProc = null;

    const theme = this._desktopSettings.get_string("theme-name");
    this._originalTheme = theme !== "__custom" ? theme : "freedesktop";
  }

  get customSoundsDir() {
    const dir = this._settings.get_string("custom-sounds-dir");
    return dir || `${GLib.get_home_dir()}/.local/share/custom-alerts`;
  }

  getBuiltinSounds() {
    return [
      { id: "none", label: _("None"), path: null },
      { id: "default", label: _("Default"), path: null },
      {
        id: "click",
        label: _("Click"),
        path: "/usr/share/sounds/gnome/default/alerts/click.ogg",
      },
      {
        id: "string",
        label: _("String"),
        path: "/usr/share/sounds/gnome/default/alerts/string.ogg",
      },
      {
        id: "swing",
        label: _("Swing"),
        path: "/usr/share/sounds/gnome/default/alerts/swing.ogg",
      },
      {
        id: "hum",
        label: _("Hum"),
        path: "/usr/share/sounds/gnome/default/alerts/hum.ogg",
      },
    ];
  }

  getCustomSounds() {
    const dirPath = this.customSoundsDir;
    const dir = Gio.File.new_for_path(dirPath);
    if (!dir.query_exists(null)) return [];

    const sounds = [];
    try {
      const enumerator = dir.enumerate_children(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      let info;
      while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        if (SOUND_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))) {
          sounds.push({
            id: `custom:${name}`,
            label: name.replace(/\.(ogg|oga|wav)$/i, ""),
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
      if (!this._desktopSettings.get_boolean("event-sounds")) return "none";

      const theme = this._desktopSettings.get_string("theme-name");
      if (theme !== "__custom") return "default";

      const linkPath = `${GNOME_CUSTOM_DIR}/bell-window-system.ogg`;
      const file = Gio.File.new_for_path(linkPath);
      if (!file.query_exists(null)) return "default";

      const fileInfo = file.query_info(
        "standard::symlink-target,standard::is-symlink",
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        null,
      );
      if (!fileInfo.get_is_symlink()) return "default";

      const target = fileInfo.get_symlink_target();

      const builtin = this.getBuiltinSounds().find((s) => s.path === target);
      if (builtin) return builtin.id;

      const custom = this.getCustomSounds().find((s) => s.path === target);
      if (custom) return custom.id;

      return target;
    } catch (e) {
      console.error(`[custom-alert-sounds] getCurrentSound: ${e.message}`);
      return "default";
    }
  }

  setSound(sound) {
    try {
      if (sound.id === "none") {
        this._desktopSettings.set_boolean("event-sounds", false);
        return;
      }

      this._desktopSettings.set_boolean("event-sounds", true);

      if (sound.id === "default") {
        this._desktopSettings.set_string("theme-name", this._originalTheme);
        return;
      }

      this._ensureDir(GNOME_CUSTOM_DIR);

      for (const bellFile of BELL_FILES) {
        const linkFile = Gio.File.new_for_path(
          `${GNOME_CUSTOM_DIR}/${bellFile}`,
        );
        try {
          linkFile.delete(null);
        } catch (e) {
          if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) throw e;
        }
        linkFile.make_symbolic_link(sound.path, null);
      }

      // Toggle theme to force GNOME Shell sound cache reload
      this._desktopSettings.set_string("theme-name", this._originalTheme);
      this._desktopSettings.set_string("theme-name", "__custom");
    } catch (e) {
      console.error(`[custom-alert-sounds] setSound: ${e.message}`);
    }
  }

  previewSound(path) {
    if (!path) return;

    const candidates = path.toLowerCase().endsWith(".wav")
      ? ["paplay", "pw-play", "aplay"]
      : ["paplay", "pw-play"];

    let player = null;
    for (const p of candidates) {
      player = GLib.find_program_in_path(p);
      if (player) break;
    }

    if (!player) {
      console.error(
        "[custom-alert-sounds] previewSound: no audio player found (paplay/pw-play)",
      );
      return;
    }

    if (this._currentProc) {
      try {
        this._currentProc.force_exit();
      } catch (_) {}
      this._currentProc = null;
    }

    try {
      const proc = new Gio.Subprocess({
        argv: [player, path],
        flags:
          Gio.SubprocessFlags.STDOUT_SILENCE |
          Gio.SubprocessFlags.STDERR_SILENCE,
      });
      proc.init(null);
      this._currentProc = proc;
      proc.wait_async(null, () => {
        if (this._currentProc === proc) this._currentProc = null;
      });
    } catch (e) {
      console.error(`[custom-alert-sounds] previewSound: ${e.message}`);
    }
  }

  _stopMonitor() {
    if (this._monitor) {
      if (this._monitorHandlerId)
        this._monitor.disconnect(this._monitorHandlerId);
      this._monitor.cancel();
      this._monitor = null;
      this._monitorHandlerId = 0;
    }
  }

  watchCustomDir(callback) {
    this._startMonitor(callback);
    this._dirSignalId = this._settings.connect(
      "changed::custom-sounds-dir",
      () => {
        this._stopMonitor();
        this._startMonitor(callback);

        const currentId = this.getCurrentSound();
        if (currentId.startsWith("custom:")) {
          const still = this.getCustomSounds().find((s) => s.id === currentId);
          if (!still) {
            const defaultSound = this.getBuiltinSounds().find(
              (s) => s.id === "default",
            );
            if (defaultSound) this.setSound(defaultSound);
          }
        }

        callback();
      },
    );
  }

  _startMonitor(callback) {
    this._ensureDir(this.customSoundsDir);
    try {
      const dir = Gio.File.new_for_path(this.customSoundsDir);
      this._monitor = dir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
      this._monitorHandlerId = this._monitor.connect("changed", () =>
        callback(),
      );
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
    if (this._currentProc) {
      try {
        this._currentProc.force_exit();
      } catch (_) {}
      this._currentProc = null;
    }
    this._stopMonitor();
    if (this._dirSignalId) {
      this._settings.disconnect(this._dirSignalId);
      this._dirSignalId = 0;
    }
    this._desktopSettings = null;
    this._settings = null;
  }
}

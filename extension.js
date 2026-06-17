import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {AlertManager} from './alertManager.js';

const AlertSoundToggle = GObject.registerClass(
class AlertSoundToggle extends QuickMenuToggle {
    _init(manager) {
        super._init({
            title: _('Alert Sound'),
            iconName: 'audio-speakers-symbolic',
            toggleMode: false,
        });

        this._manager = manager;
        this._items = new Map();

        this._builtinSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._builtinSection);

        this._customSeparator = new PopupMenu.PopupSeparatorMenuItem(_('Custom'));
        this.menu.addMenuItem(this._customSeparator);

        this._customSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._customSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const openFolderItem = new PopupMenu.PopupMenuItem(_('Open Sounds Folder'));
        openFolderItem.connect('activate', () => {
            const uri = Gio.File.new_for_path(manager.customSoundsDir).get_uri();
            Gio.AppInfo.launch_default_for_uri(uri, null);
        });
        this.menu.addMenuItem(openFolderItem);

        this.connect('clicked', () => {
            const currentId = this._manager.getCurrentSound();
            const allSounds = [
                ...this._manager.getBuiltinSounds(),
                ...this._manager.getCustomSounds(),
            ];
            const current = allSounds.find(s => s.id === currentId);
            if (current?.path)
                this._manager.previewSound(current.path);
        });

        this._populateBuiltin();
        this._refreshCustom();
        manager.watchCustomDir(() => this._refreshCustom());
    }

    _populateBuiltin() {
        for (const sound of this._manager.getBuiltinSounds())
            this._addSoundItem(this._builtinSection, sound);
    }

    _refreshCustom() {
        for (const [id] of this._items) {
            if (id.startsWith('custom:'))
                this._items.delete(id);
        }
        this._customSection.removeAll();

        const customSounds = this._manager.getCustomSounds();
        if (customSounds.length === 0) {
            const empty = new PopupMenu.PopupMenuItem(_('No custom sounds yet'));
            empty.setSensitive(false);
            this._customSection.addMenuItem(empty);
        } else {
            for (const sound of customSounds)
                this._addSoundItem(this._customSection, sound);
        }

        this._updateCurrent();
    }

    _addSoundItem(section, sound) {
        const item = new PopupMenu.PopupMenuItem(sound.label);
        item.style = 'padding-top: 4px; padding-bottom: 4px; min-height: 2em;';
        item._soundData = sound;

        if (sound.path) {
            const previewBtn = new St.Button({
                icon_name: 'media-playback-start-symbolic',
                style_class: 'icon-button',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.END,
                x_expand: true,
            });
            previewBtn.connect('clicked', () => {
                this._manager.previewSound(sound.path);
            });
            previewBtn.connect_after('button-release-event', () => Clutter.EVENT_STOP);
            item.add_child(previewBtn);
        }

        item.connect('activate', () => {
            this._manager.setSound(sound);
            this._updateCurrent();
        });

        section.addMenuItem(item);
        this._items.set(sound.id, item);
    }

    _updateCurrent() {
        const currentId = this._manager.getCurrentSound();

        for (const [id, item] of this._items) {
            item.setOrnament(id === currentId
                ? PopupMenu.Ornament.DOT
                : PopupMenu.Ornament.NONE);
        }

        const allSounds = [
            ...this._manager.getBuiltinSounds(),
            ...this._manager.getCustomSounds(),
        ];
        const current = allSounds.find(s => s.id === currentId);
        this.subtitle = current ? current.label : '';
    }
});

const AlertSoundIndicator = GObject.registerClass(
class AlertSoundIndicator extends SystemIndicator {
    _init(manager) {
        super._init();
        this._toggle = new AlertSoundToggle(manager);
        this.quickSettingsItems.push(this._toggle);
    }
});

export default class CustomAlertSoundsExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._manager = new AlertManager(this._settings);
        this._indicator = new AlertSoundIndicator(this._manager);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
        this._indicator = null;
        this._manager.destroy();
        this._manager = null;
        this._settings = null;
    }
}

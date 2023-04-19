const {Gio, GObject, St} = imports.gi;
const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;

// This is the live instance of the Quick Settings menu
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const FeatureToggle = GObject.registerClass(
class FeatureToggle extends QuickSettings.QuickToggle {
    _init() {
        super._init({
            label: 'Charge Full',
            iconName: 'gnome-power-manager-symbolic',
            toggleMode: true,
        });
        
        // This function is unique to this class. It adds a nice header with an
        // icon, title and optional subtitle. It's recommended you do so for
        // consistency with other menus.
        
        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.shell.extensions.fwchargelimit',
        });

        this._settings.bind('show-indicator',
            this, 'checked',
            Gio.SettingsBindFlags.DEFAULT);

        this.connectObject(
            'clicked', () => this._updateChargeLimit(this._settings.get_boolean('show-indicator')),
            this);
    }
    _updateChargeLimit(b) {
        if (b) {
            this._setChargeFull()
        } else {
            this._setChargeHealthy()
        }
    }                
    _setChargeFull() {
        this._setChargeLimit(100)
    }
    _setChargeHealthy() {
        this._setChargeLimit(80)
    }
    _setChargeLimit(percentage) {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('sudo ectool fwchargelimit '+percentage);
        
            if (status !== 0) {
                if (stderr instanceof Uint8Array)
                    stderr = ByteArray.toString(stderr);
        
                throw new Error(stderr);
            }
        
            if (stdout instanceof Uint8Array)
                stdout = ByteArray.toString(stdout);
        
            // Now were done blocking the main loop, phewf!
            log(stdout);
        } catch (e) {
            logError(e);
        }   
    }
})





const FeatureIndicator = GObject.registerClass(
class FeatureIndicator extends QuickSettings.SystemIndicator {
    _init() {
        super._init();

        // Create the icon for the indicator
        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'gnome-power-manager-symbolic';

        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.shell.extensions.fwchargelimit',
        });

        let charge = this._getChargeLimit()
        if (charge == 100) {
            this._settings.set_boolean('show-indicator', true)
        } else {
            this._settings.set_boolean('show-indicator', false)
        }

        this._settings.bind('show-indicator',
            this._indicator, 'visible',
            Gio.SettingsBindFlags.DEFAULT);

        // Create the toggle menu and associate it with the indicator, being
        // sure to destroy it along with the indicator
        this.quickSettingsItems.push(new FeatureToggle());
        
        this.connect('destroy', () => {
            this.quickSettingsItems.forEach(item => item.destroy());
        });
        
        // Add the indicator to the panel and the toggle to the menu
        QuickSettingsMenu._indicators.add_child(this);
        QuickSettingsMenu._addItems(this.quickSettingsItems);
    }
    _getChargeLimit() {
        try {
            let [, stdout, stderr, status] = GLib.spawn_command_line_sync('sudo ectool fwchargelimit');
        
            if (status !== 0) {
                if (stderr instanceof Uint8Array)
                    stderr = ByteArray.toString(stderr);
        
                throw new Error(stderr);
            }
        
            if (stdout instanceof Uint8Array)
                stdout = ByteArray.toString(stdout);
        
            // Now were done blocking the main loop, phewf!
            log(stdout);
            return stdout.trim(); 
        } catch (e) {
            logError(e);
        }   
    }
});

class Extension {
    constructor() {
        this._indicator = null;
    }
    
    enable() {
        this._indicator = new FeatureIndicator();
    }
    
    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init() {
    return new Extension();
}

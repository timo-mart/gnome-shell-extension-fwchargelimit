const {Gio, GObject, St} = imports.gi;
const ByteArray = imports.byteArray;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;

// This is the live instance of the Quick Settings menu
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const FeatureMenuToggle = GObject.registerClass(
class FeatureMenuToggle extends QuickSettings.QuickMenuToggle {
    _init() {
        super._init({
            label: 'Charge Control',
            iconName: 'anatine-indicator',
            toggleMode: true,
        });
        
        // This function is unique to this class. It adds a nice header with an
        // icon, title and optional subtitle. It's recommended you do so for
        // consistency with other menus.
        this.menu.setHeader('anatine-indicator', 'Feature Header',
            'Optional Subtitle');
        
        // You may also add sections of items to the menu
        this._itemsSection = new PopupMenu.PopupMenuSection();
        this._itemsSection.addAction('60%', () => run('sudo ectool fwchargelimit 60'));
        this._itemsSection.addAction('80%', () => run('sudo ectool fwchargelimit 80'));
        this._itemsSection.addAction('100%', () => run('sudo ectool fwchargelimit 100'));
        this.menu.addMenuItem(this._itemsSection);
        
        function run(command) {
            try {
                let [, stdout, stderr, status] = GLib.spawn_command_line_sync(command);
            
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

        // // Add an entry-point for more settings
        // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        // const settingsItem = this.menu.addAction('More Settings',
        //     () => ExtensionUtils.openPrefs());
            
        // // Ensure the settings are unavailable when the screen is locked
        // settingsItem.visible = Main.sessionMode.allowSettings;
        // this.menu._settingsActions[Extension.uuid] = settingsItem;
    }
});





const FeatureIndicator = GObject.registerClass(
class FeatureIndicator extends QuickSettings.SystemIndicator {
    _init() {
        super._init();

        // Create the icon for the indicator
        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'uninterruptible-power-supply-symbolic';

        // Create the toggle menu and associate it with the indicator, being
        // sure to destroy it along with the indicator
        this.quickSettingsItems.push(new FeatureMenuToggle());
        
        this.connect('destroy', () => {
            this.quickSettingsItems.forEach(item => item.destroy());
        });
        
        // Add the indicator to the panel and the toggle to the menu
        QuickSettingsMenu._indicators.add_child(this);
        QuickSettingsMenu._addItems(this.quickSettingsItems);
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

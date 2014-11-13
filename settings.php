<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * ousupsub admin settings
 *
 * @package    editor_ousupsub
 * @copyright  2013 Damyon Wiese
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$ADMIN->add('editorsettings', new admin_category('editorousupsub', $editor->displayname, $editor->is_enabled() === false));

$settings = new admin_settingpage('editorsettingsousupsub', new lang_string('settings', 'editor_ousupsub'));
if ($ADMIN->fulltree) {
    require_once(__DIR__ . '/adminlib.php');
    $settings->add(new editor_ousupsub_subplugins_setting());
    $name = new lang_string('toolbarconfig', 'editor_ousupsub');
    $desc = new lang_string('toolbarconfig_desc', 'editor_ousupsub');
    $default = 'style1 = subscript, superscript';
    $setting = new editor_ousupsub_toolbar_setting('editor_ousupsub/toolbar', $name, $desc, $default);

    $settings->add($setting);
}

$ADMIN->add('editorousupsub', $settings);

foreach (core_plugin_manager::instance()->get_plugins_of_type('ousupsub') as $plugin) {
    /** @var \editor_ousupsub\plugininfo\ousupsub $plugin */
    $plugin->load_settings($ADMIN, 'editorousupsub', $hassiteconfig);
}

// Required or the editor plugininfo will add this section twice.
unset($settings);
$settings = null;


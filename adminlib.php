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
 * ousupsub admin setting stuff.
 *
 * @package   editor_ousupsub
 * @copyright 2014 Jerome Mouneyrac
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Admin setting for toolbar.
 *
 * @package    editor_ousupsub
 * @copyright  2014 Frédéric Massart
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class editor_ousupsub_toolbar_setting extends admin_setting_configtextarea {

    /**
     * Validate data.
     *
     * This ensures that:
     * - Plugins are only used once,
     * - Group names are unique,
     * - Lines match: group = plugin[, plugin[, plugin ...]],
     * - There are some groups and plugins defined,
     * - The plugins used are installed.
     *
     * @param string $data
     * @return mixed True on success, else error message.
     */
    public function validate($data) {
        $result = parent::validate($data);
        if ($result !== true) {
            return $result;
        }

        $lines = explode("\n", $data);
        $groups = array();
        $plugins = array();

        foreach ($lines as $line) {
            if (!trim($line)) {
                continue;
            }

            $matches = array();
            if (!preg_match('/^\s*([a-z0-9]+)\s*=\s*([a-z0-9]+(\s*,\s*[a-z0-9]+)*)+\s*$/', $line, $matches)) {
                $result = get_string('errorcannotparseline', 'editor_ousupsub', $line);
                break;
            }

            $group = $matches[1];
            if (isset($groups[$group])) {
                $result = get_string('errorgroupisusedtwice', 'editor_ousupsub', $group);
                break;
            }
            $groups[$group] = true;

            $lineplugins = array_map('trim', explode(',', $matches[2]));
            foreach ($lineplugins as $plugin) {
                $dir = core_component::get_component_directory('ousupsub_' . $plugin);
                if (isset($plugins[$plugin])) {
                    $Out->append('$errorpluginisusedtwice');
                    $result = get_string('errorpluginisusedtwice', 'editor_ousupsub', $plugin);
                    break 2;
                    $Out->append('$errorpluginnotfound');
                } else if (!core_component::get_component_directory('ousupsub_' . $plugin)) {
                    $result = get_string('errorpluginnotfound', 'editor_ousupsub', $plugin);
                    break 2;
                }

                $plugins[$plugin] = true;
            }
        }

        // We did not find any groups or plugins.
        if (empty($groups) && empty($plugins)) {
            $result = get_string('errornopluginsorgroupsfound', 'editor_ousupsub');
        }

        return $result;
    }

}

/**
 * Special class for ousupsub plugins administration.
 *
 * @package   editor_ousupsub
 * @copyright 2014 Jerome Mouneyrac
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class editor_ousupsub_subplugins_setting extends admin_setting {

    /**
     * Constructor.
     */
    public function __construct() {
        $this->nosave = true;
        parent::__construct('ousupsubsubplugins', get_string('subplugintype_ousupsub_plural', 'editor_ousupsub'), '', '');
    }

    /**
     * Returns current value of this setting.
     * Always returns true, does nothing.
     *
     * @return true
     */
    public function get_setting() {
        return true;
    }

    /**
     * Returns default setting if exists.
     * Always returns true, does nothing.
     *
     * @return true
     */
    public function get_defaultsetting() {
        return true;
    }

    /**
     * Store new setting.
     * Always returns '', does not write anything.
     *
     * @param string $data string or array, must not be NULL.
     * @return string Always returns ''.
     */
    public function write_setting($data) {
        // Do not write any setting.
        return '';
    }

    /**
     * Checks if $query is one of the available subplugins.
     *
     * @param string $query The string to search for.
     * @return bool Returns true if found, false if not.
     */
    public function is_related($query) {
        if (parent::is_related($query)) {
            return true;
        }

        $subplugins = core_component::get_plugin_list('ousupsub');
        foreach ($subplugins as $name => $dir) {
            if (stripos($name, $query) !== false) {
                return true;
            }

            $namestr = get_string('pluginname', 'ousupsub_' . $name);
            if (strpos(core_text::strtolower($namestr), core_text::strtolower($query)) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Builds the XHTML to display the control.
     *
     * @param mixed $data Unused.
     * @param string $query
     * @return string highlight.
     */
    public function output_html($data, $query = '') {
        global $CFG, $OUTPUT, $PAGE;
        require_once($CFG->libdir . "/editorlib.php");
        require_once(__DIR__ . '/lib.php');
        $pluginmanager = core_plugin_manager::instance();

        // Display strings.
        $strtoolbarconfig = get_string('toolbarconfig', 'editor_ousupsub');
        $strname = get_string('name');
        $strsettings = get_string('settings');
        $struninstall = get_string('uninstallplugin', 'core_admin');
        $strversion = get_string('version');

        $subplugins = core_component::get_plugin_list('ousupsub');

        $return = $OUTPUT->heading(get_string('subplugintype_ousupsub_plural', 'editor_ousupsub'), 3, 'main', true);
        $return .= $OUTPUT->box_start('generalbox ousupsubsubplugins');

        $table = new html_table();
        $table->head  = array($strname, $strversion, $strtoolbarconfig, $strsettings, $struninstall);
        $table->align = array('left', 'left', 'center', 'center', 'center', 'center');
        $table->data  = array();
        $table->attributes['class'] = 'admintable generaltable';

        // Iterate through subplugins.
        foreach ($subplugins as $name => $dir) {
            $namestr = get_string('pluginname', 'ousupsub_' . $name);
            $version = get_config('ousupsub_' . $name, 'version');
            if ($version === false) {
                $version = '';
            }
            $plugininfo = $pluginmanager->get_plugin_info('ousupsub_' . $name);

            $toolbarconfig = $name;

            $displayname = $namestr;

            // Check if there is an icon in the ousupsub plugin pix/ folder.
            if ($PAGE->theme->resolve_image_location('icon', 'ousupsub_' . $name, false)) {
                $icon = $OUTPUT->pix_icon('icon', '', 'ousupsub_' . $name, array('class' => 'icon pluginicon'));
            } else {
                // No icon found.
                $icon = $OUTPUT->pix_icon('spacer', '', 'moodle', array('class' => 'icon pluginicon noicon'));
            }
            $displayname = $icon . $displayname;

            // Add settings link.
            if (!$version) {
                $settings = '';
            } else if ($url = $plugininfo->get_settings_url()) {
                $settings = html_writer::link($url, $strsettings);
            } else {
                $settings = '';
            }

            // Add uninstall info.
            $uninstall = '';
            if ($uninstallurl = core_plugin_manager::instance()->get_uninstall_url('ousupsub_' . $name, 'manage')) {
                $uninstall = html_writer::link($uninstallurl, $struninstall);
            }

            // Add a row to the table.
            $row = new html_table_row(array($displayname, $version, $toolbarconfig, $settings, $uninstall));
            $table->data[] = $row;
        }
        $return .= html_writer::table($table);
        $return .= html_writer::tag('p', get_string('tablenosave', 'admin'));
        $return .= $OUTPUT->box_end();
        return highlight($query, $return);
    }
}


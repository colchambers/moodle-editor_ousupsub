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
 * YUI text editor integration.
 *
 * @package    editor_ousupsub
 * @copyright  2013 Damyon Wiese  <damyon@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * This is the texteditor implementation.
 * @copyright  2013 Damyon Wiese  <damyon@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class ousupsub_texteditor extends texteditor {

    /**
     * Is the current browser supported by this editor?
     *
     * Of course!
     * @return bool
     */
    public function supported_by_browser() {
        return true;
    }

    /**
     * Returns array of supported text formats.
     * @return array
     */
    public function get_supported_formats() {
        // FORMAT_MOODLE is not supported here, sorry.
        return array(FORMAT_HTML => FORMAT_HTML);
    }

    /**
     * Returns text format preferred by this editor.
     * @return int
     */
    public function get_preferred_format() {
        return FORMAT_HTML;
    }

    /**
     * Does this editor support picking from repositories?
     * @return bool
     */
    public function supports_repositories() {
        return true;
    }

    /**
     * Use this editor for given element.
     *
     * @param string $elementid
     * @param array $options
     * @param null $fpoptions
     */
    public function use_editor($elementid, array $options=null, $fpoptions=null) {
        global $PAGE;

        $configstr = 'style1 = subscript, superscript';

        $grouplines = explode("\n", $configstr);

        $groups = array();

        foreach ($grouplines as $groupline) {
            $line = explode('=', $groupline);
            if (count($line) > 1) {
                $group = trim(array_shift($line));
                $plugins = array_map('trim', explode(',', array_shift($line)));
                $groups[$group] = $plugins;
            }
        }

        $modules = array('moodle-editor_ousupsub-editor');
        $options['context'] = empty($options['context']) ? context_system::instance() : $options['context'];

        $jsplugins = array();
        foreach ($groups as $group => $plugins) {
            $groupplugins = array();
            foreach ($plugins as $plugin) {
                // Do not die on missing plugin.
                if (!core_component::get_component_directory('ousupsub_' . $plugin))  {
                    continue;
                }

                $jsplugin = array();
                $jsplugin['name'] = $plugin;
                $jsplugin['params'] = array();
                $modules[] = 'moodle-ousupsub_' . $plugin . '-button';

                component_callback('ousupsub_' . $plugin, 'strings_for_js');
                $extra = component_callback('ousupsub_' . $plugin, 'params_for_js', array($elementid, $options, $fpoptions));

                if ($extra) {
                    $jsplugin = array_merge($jsplugin, $extra);
                }
                // We always need the plugin name.
                $PAGE->requires->string_for_js('pluginname', 'ousupsub_' . $plugin);
                $groupplugins[] = $jsplugin;
            }
            $jsplugins[] = array('group'=>$group, 'plugins'=>$groupplugins);
        }

        $PAGE->requires->strings_for_js(array(
                'editor_command_keycode',
                'editor_control_keycode',
                'plugin_title_shortcut'
            ), 'editor_ousupsub');
        $PAGE->requires->strings_for_js(array(
                'warning',
                'info'
            ), 'moodle');
        $PAGE->requires->yui_module($modules,
                                    'YUI.M.editor_ousupsub.createEditor',
                                    array($this->get_init_params($elementid, $options, $fpoptions, $jsplugins)));

    }

    /**
     * Create a params array to init the editor.
     *
     * @param string $elementid
     * @param array $options
     * @param array $fpoptions
     */
    protected function get_init_params($elementid, array $options = null, array $fpoptions = null, $plugins = null) {
        global $PAGE;

        $directionality = get_string('thisdirection', 'langconfig');
        $strtime        = get_string('strftimetime');
        $strdate        = get_string('strftimedaydate');
        $lang           = current_language();
        $contentcss     = $PAGE->theme->editor_css_url()->out(false);

        $params = array(
            'elementid' => $elementid,
            'content_css' => $contentcss,
            'contextid' => $options['context']->id,
            'language' => $lang,
            'directionality' => $directionality,
            'filepickeroptions' => array(),
            'plugins' => $plugins,
            'pageHash' => sha1($PAGE->url)
        );
        if ($fpoptions) {
            $params['filepickeroptions'] = $fpoptions;
        }
        return $params;
    }
}

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
 * ousupsub custom steps definitions.
 *
 * @package    editor_ousupsub
 * @category   test
 * @copyright  2014 Damyon Wiese
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

/**
 * Steps definitions to deal with the ousupsub text editor
 *
 * @package    editor_ousupsub
 * @category   test
 * @copyright  2014 Damyon Wiese
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_editor_ousupsub extends behat_base {

    /**
     * Select the text in an ousupsub field.
     *
     * @Given /^I select the text in the "([^"]*)" ousupsub editor$/
     * @throws ElementNotFoundException Thrown by behat_base::find
     * @param string $field
     * @return void
     */
    public function select_the_text_in_the_ousupsub_editor($fieldlocator) {
        if (!$this->running_javascript()) {
            throw new coding_exception('Selecting text requires javascript.');
        }
        // We delegate to behat_form_field class, it will
        // guess the type properly.
        $field = behat_field_manager::get_form_field_from_label($fieldlocator, $this);

        if (!method_exists($field, 'select_text')) {
            throw new coding_exception('Field does not support the select_text function.');
        }
        $field->select_text();
    }

    /**
     * Check the text in an ousupsub field.
     *
     * @Given /^I should see "([^"]*)" in the "([^"]*)" ousupsub editor$/
     * @throws ElementNotFoundException Thrown by behat_base::find
     * @param string $text
     * @param string $field
     * @return void
     */
    public function should_see_in_the_ousupsub_editor($text, $fieldlocator) {
        if (!$this->running_javascript()) {
            throw new coding_exception('Selecting text requires javascript.');
        }
        // We delegate to behat_form_field class, it will
        // guess the type properly.
        $field = behat_field_manager::get_form_field_from_label($fieldlocator, $this);

        if (!method_exists($field, 'get_value')) {
            throw new coding_exception('Field does not support the get_value function.');
        }

        return $field->matches($text);
    }

    /**
     * Select the given text in an ousupsub field.
     *
     * @Given /^I select text "([^"]*)" in the "([^"]*)" ousupsub editor$/
     * @throws ElementNotFoundException Thrown by behat_base::find
     * @param string $text
     * @param string $field
     * @return void
     */
    public function select_text_in_the_ousupsub_editor($text, $fieldlocator) {
        // NodeElement.keyPress simply doesn't work.
        if (!$this->running_javascript()) {
            throw new coding_exception('Selecting text requires javascript.');
        }
        // We delegate to behat_form_field class, it will
        // guess the type properly.
        $field = behat_field_manager::get_form_field_from_label($fieldlocator, $this);

        if (!method_exists($field, 'get_value')) {
            throw new coding_exception('Field does not support the get_value function.');
        }

        $editorid = $field->get_id();
        $js = ' (function() {
    var e = document.getElementById("'.$editorid.'editable"),
        r = rangy.createRange(),
        s = rangy.getSelection();

    while ((e.firstChild !== null) && (e.firstChild.nodeType != document.TEXT_NODE)) {
        e = e.firstChild;
    }
    e.focus();
    r.selectNodeContents(e);
    s.setSingleRange(r);
}()); ';
        $field->execute_script($js);
    }


}


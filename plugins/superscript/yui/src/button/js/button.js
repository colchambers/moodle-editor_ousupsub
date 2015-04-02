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

/*
 * @package    ousupsub_superscript
 * @copyright  2014 Rosiana Wijaya <rwijaya@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @module     moodle-ousupsub_superscript-button
 */
var COMPONENTNAME = 'ousupsub_superscript',
    LOGNAME = 'ousupsub_superscript',
    DELIMITERS = {
        START: '<sup>',
        END: '</sup>'
    };

/**
 * ousupsub text editor superscript plugin.
 *
 * @namespace M.ousupsub_superscript
 * @class button
 * @extends M.editor_ousupsub.EditorPlugin
 */

Y.namespace('M.ousupsub_superscript').Button = Y.Base.create('button', Y.M.editor_ousupsub.EditorPlugin, [], {

    /**
     * The configuration object for the button.
     *
     * @property _config
     * @type Object
     * @default null
     * @private
     */
    _config: null,

    /**
     * The selection object returned by the browser.
     *
     * @property _currentSelection
     * @type Range
     * @default null
     * @private
     */
    _currentSelection: null,

    initializer: function() {
     // Add the button to the toolbar.
//        this.addButton({
//            icon: 'e/superscript',
//            callback: this._testSelection
//        });
//        this.addBasicButton({
        
        this._config = {
                        exec: 'superscript',

                        // Watch the following tags and add/remove highlighting as appropriate:
                        tags: 'sup',
                     // Key code for the keyboard shortcut which triggers this button:
                        keys: '73, 94, 38',

                        icon: 'e/superscript',
                        callback: this._applyTextCommand
                    }
        this.addButton(this._config);
     // We need custom highlight logic for this button.
//        this.get('host').on('atto:selectionchanged', function() {
//            if (this._applySuperscript()) {
//                this.highlightButtons();
//            } else {
//                this.unHighlightButtons();
//            }
//        }, this);
    },

    
});

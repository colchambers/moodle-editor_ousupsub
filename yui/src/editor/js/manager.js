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
 * The manager for the OUSupSub Editor.
 *
 * @module     moodle-editor_ousupsub-manager
 * @package    editor_ousupsub
 * @copyright  2014 Andrew Nicols <andrew@nicols.co.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @main       moodle-editor_ousupsub-editor
 */

/**
 * @module moodle-editor_ousupsub-manager
 */

/**
 * The manager for the OUSupSub editor.
 *
 * @namespace YUI.M
 * @class editor_ousupsub
 */

var NS = YUI.namespace('M'),
    LOGNAME = 'moodle-editor_ousupsub-manager';

NS.editor_ousupsub = NS.editor_ousupsub || {
    _instances: {},

    /**
     * Add a reference to an editor.
     * Note: This is an internal method which should only be called by the editor itself.
     *
     * @method addEditorReference
     * @param {String} name The name of the editor instance to add
     * @private
     */
    addEditorReference: function(name, reference) {
        Y.log("Registering a new ousupsub editor: " + name, 'debug', LOGNAME);
        if (typeof this._instances[name] === 'undefined') {
            this._instances[name] = reference;
        } else {
            Y.log("An ousupsub editor with the name '" + name + "' already exists. Unable to add.", 'warn', LOGNAME);
        }

        return this;
    },

    /**
     * Create a new editor using the specified configuration.
     *
     * @method createEditor
     * @param {Object} config See the attributes for {{#crossLink
     * "M.editor_ousupsub.Editor"}}{{/crossLink}} for configuration options. The
     * elementid provided will be used as the name of this editor within
     * the editor Manager.
     * @return {M.editor_ousupsub.Editor} The newly created editor instance
     */
    createEditor: function(config) {
        var instance = new Y.M.editor_ousupsub.Editor(config);
        this.fire('editor_ousupsub:created', {
            id: instance.get('elementid'),
            instance: instance
        });
        return instance;
    },

    /**
     * Get the requested Editor instance.
     *
     * @method getEditor
     * @param {String} name The name of the editor instance to retrieve
     * @return {M.editor_ousupsub.Editor} The requested editor instance
     */
    getEditor: function(name) {
        return this._instances[name];
    },

    /**
     * Remove the reference for an editor.
     *
     * @method removeEditorReference
     * @param {String} name The name of the editor instance to remove
     */
    removeEditor: function(name) {
        var instance = this.getEditor(name);
        if (instance) {
            instance.destroy();
            this.fire('editor_ousupsub:removed', {
                id: name
            });
        }
        return this;
    },

    /**
     * Remove the reference for an editor.
     * Note: This is an internal method which should only be called by the editor itself.
     *
     * @method removeEditorReference
     * @param {String} name The name of the editor instance to remove
     * @private
     */
    removeEditorReference: function(name) {
        if (this.getEditor(name)) {
            delete this._instances[name];
        }
    },

    /**
     * @method importMethod
     * @static
     * @param {Object} host The object containing the methods to copy. Typically a Prototype.
     * @param {String|String[]} name The name, or an Array of names of the methods to import onto the manager..
     * @param {String} [altName] An alternative name to use for the function when importing it onto the manager. altName cannot
     * be used if importMethod was provided with a list of methods.
     * Note: If the altName is specified, the method is only imported to the altName, and not the original name.
     */
    importMethod: function(host, name, altName) {
        if (typeof name === 'string') {
            altName = altName || name;
            this.addMethod(altName, host[name]);
        } else {
            Y.Array.each(name, function(n) {
                this.importMethod(host, n);
            }, this);
        }
    },

    /**
     * Add the supplied function to the manager using the specified name.
     *
     * @method addMethod
     * @param {String} name The name to store the method on within the editor manager.
     * @param {Function} fn The function to be added.
     * @param {Object} [context] The context to apply the function with. If not specified, the Editor itself is used.
     */
    addMethod: function(name, fn, context) {
        if (name && fn) {
            if (typeof this[name] !== 'undefined') {
                Y.log('Overwriting existing method: ' + name, 'warn', 'moodle-editor_ousupsub-manager');
            }

            this[name] = function() {
                var ret = [],
                    args = arguments;

                Y.Object.each(this._instances, function(editor) {
                    var ctx,
                        result;

                    ctx = context || editor;
                    result = fn.apply(ctx, args);

                    if (result !== undefined && result !== editor) {
                        ret[ret.length] = result;
                    }
                });

                // If we received a set of results, return them, otherwise make this method chainable.
                return ret.length ? ret : this;
            };
        } else {
            Y.log('Unable to add method: ' + name , 'warn', 'moodle-editor_ousupsub-manager');
        }
    }
};

Y.augment(NS.editor_ousupsub, Y.EventTarget);

// Add methods from the Editor prototype.
NS.editor_ousupsub.importMethod(Y.M.editor_ousupsub.Editor.prototype, [
    'saveSelection',
    'updateFromTextArea',
    'updateOriginal',
    'disableCssStyling',
    'enableCssStyling',
    'cleanEditorHTML',
    'destroy',
    'recoverText',
    'resetAutosave',
    'saveDraft'
]);
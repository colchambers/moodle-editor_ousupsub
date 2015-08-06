YUI.add('moodle-editor_ousupsub-editor', function (Y, NAME) {

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
 * The ousupsub WYSIWG pluggable editor, written for Moodle.
 *
 * @module     moodle-editor_ousupsub-editor
 * @package    editor_ousupsub
 * @copyright  2013 Damyon Wiese  <damyon@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @main       moodle-editor_ousupsub-editor
 */

/**
 * @module moodle-editor_ousupsub-editor
 * @submodule editor-base
 */

var LOGNAME = 'moodle-editor_ousupsub-editor';
var CSS = {
        CONTENT: 'editor_ousupsub_content',
        CONTENTWRAPPER: 'editor_ousupsub_content_wrap',
        EDITORWRAPPER: '.editor_ousupsub_content',
        TOOLBAR: 'editor_ousupsub_toolbar',
        WRAPPER: 'editor_ousupsub',
        HIGHLIGHT: 'highlight'
    };

/**
 * The ousupsub editor for Moodle.
 *
 * @namespace M.editor_ousupsub
 * @class Editor
 * @constructor
 * @uses M.editor_ousupsub.EditorClean
 * @uses M.editor_ousupsub.EditorSelection
 */

function Editor() {
    Editor.superclass.constructor.apply(this, arguments);
}

Y.extend(Editor, Y.Base, {

    /**
     * List of known block level tags.
     * Taken from "https://developer.mozilla.org/en-US/docs/HTML/Block-level_elements".
     *
     * @property BLOCK_TAGS
     * @type {Array}
     */
    BLOCK_TAGS : [
        'address',
        'article',
        'aside',
        'audio',
        'blockquote',
        'canvas',
        'dd',
        'div',
        'dl',
        'fieldset',
        'figcaption',
        'figure',
        'footer',
        'form',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'hgroup',
        'hr',
        'noscript',
        'ol',
        'output',
        'p',
        'pre',
        'section',
        'table',
        'tfoot',
        'ul',
        'video'
    ],

    PLACEHOLDER_CLASS: 'ousupsub-tmp-class',
    ALL_NODES_SELECTOR: '[style],font[face]',
    FONT_FAMILY: 'fontFamily',

    /**
     * The wrapper containing the editor.
     *
     * @property _wrapper
     * @type Node
     * @private
     */
    _wrapper: null,

    /**
     * A reference to the content editable Node.
     *
     * @property editor
     * @type Node
     */
    editor: null,

    /**
     * A reference to the toolbar Node.
     *
     * @property toolbar
     * @type Node
     */
    toolbar: null,

    /**
     * A reference to the original text area.
     *
     * @property textarea
     * @type Node
     */
    textarea: null,

    /**
     * A reference to the label associated with the original text area.
     *
     * @property textareaLabel
     * @type Node
     */
    textareaLabel: null,

    /**
     * A reference to the list of plugins.
     *
     * @property plugins
     * @type object
     */
    plugins: null,

    /**
     * Event Handles to clear on editor destruction.
     *
     * @property _eventHandles
     * @private
     */
    _eventHandles: null,

    /**
     * The current focal point for tabbing.
     *
     * @property _tabFocus
     * @type Node
     * @default null
     * @private
     */
    _tabFocus: null,

    /**
     * The maximum saved number of undo steps.
     *
     * @property _maxUndos
     * @type {Number} The maximum number of saved undos.
     * @default 40
     * @private
     */
    _maxUndos: 40,

    /**
     * History of edits.
     *
     * @property _undoStack
     * @type {Array} The elements of the array are the html strings that make a snapshot
     * @private
     */
    _undoStack: null,

    /**
     * History of edits.
     *
     * @property _redoStack
     * @type {Array} The elements of the array are the html strings that make a snapshot
     * @private
     */
    _redoStack: null,

    initializer: function() {
        // Note - it is not safe to use a CSS selector like '#' + elementid because the id
        // may have colons in it - e.g.  quiz.
        this.textarea = Y.one(document.getElementById(this.get('elementid')));

        if (!this.textarea) {
            // No text area found.
            Y.log('Text area not found - unable to setup editor for ' + this.get('elementid'),
                    'error', LOGNAME);
            return;
        }

        // Add the editor to the manager.
        Y.M.editor_ousupsub.addEditorReference(this.get('elementid'), this);

        this._eventHandles = [];

        this._wrapper = Y.Node.create('<div class="' + CSS.WRAPPER + '"></div>');
        this.editor = Y.Node.create('<div id="' + this.get('elementid') + 'editable" ' +
                'contenteditable="true" ' +
                'autocapitalize="none" ' +
                'autocorrect="off" ' +
                'role="textbox" ' +
                'spellcheck="false" ' +
                'aria-live="off" ' +
                'class="' + CSS.CONTENT + '"></div>');

        // Add a labelled-by attribute to the contenteditable.
        this.textareaLabel = Y.one('[for="' + this.get('elementid') + '"]');
        if (this.textareaLabel) {
            this.textareaLabel.generateID();
            this.editor.setAttribute('aria-labelledby', this.textareaLabel.get("id"));
        }

        // Add everything to the wrapper.
        this.setupToolbar();

        // Editable content wrapper.
        var content = Y.Node.create('<div class="' + CSS.CONTENTWRAPPER + '"></div>');
        content.appendChild(this.editor);
        this._wrapper.appendChild(content);

        // Set the visible width and height.
        var width = (this.textarea.getAttribute('cols') * 6 + 41) + 'px';
        this.editor.setStyle('width', width);
        this.editor.setStyle('minWidth', width);
        this.editor.setStyle('maxWidth', width);

        var rows = this.textarea.getAttribute('rows');
        var height = (rows * 6 + 13) + 'px';
        this.editor.setStyle('height', height);
        this.editor.setStyle('minHeight', height);
        this.editor.setStyle('maxHeight', height);

        // IE needs the editor wrapper height to be set too. It include 4px of padding.
        height = (rows * 6 + 17) + 'px';
        content.setStyle('height', height);
        content.setStyle('minHeight', height);
        content.setStyle('maxHeight', height);

        // Disable odd inline CSS styles.
        this.disableCssStyling();

        // Use paragraphs not divs.
        if (document.queryCommandSupported('DefaultParagraphSeparator')) {
            document.execCommand('DefaultParagraphSeparator', false, 'p');
        }

        // Add the toolbar and editable zone to the page.
        this.textarea.get('parentNode').insert(this._wrapper, this.textarea);

        // Hide the old textarea.
        this.textarea.hide();

        // Copy the text to the contenteditable div.
        this.updateFromTextArea();

        // Add keyboard navigation for the textarea.
        this.setupTextareaNavigation();

        // Prevent carriage return to produce a new line.
        this._preventEnter();

        // Publish the events that are defined by this editor.
        this.publishEvents();

        // Add handling for saving and restoring selections on cursor/focus changes.
        this.setupSelectionWatchers();

        // Add polling to update the textarea periodically when typing long content.
        this.setupAutomaticPolling();

        // Setup plugins.
        this.setupPlugins();
    },

    destructor: function() {
        // Destroy each of the plugins - they may have destruction phases.
        Y.Array.each(this.plugins, function(item, key) {
            item.destroy();
            this.plugins[key] = undefined;
        }, this);

        // Clear any event handles we created.
        new Y.EventHandle(this._eventHandles).detach();

        // Return the editor back to it's original state.
        this.textarea.show();
        this._wrapper.remove(true);

        // Finally remove this reference from the manager.
        Y.M.editor_ousupsub.removeEditorReference(this.get('elementid'), this);
    },

    /**
     * Focus on the editable area for this editor.
     *
     * @method focus
     * @chainable
     */
    focus: function() {
        this.editor.focus();
        return this;
    },

    /**
     * Publish events for this editor instance.
     *
     * @method publishEvents
     * @private
     * @chainable
     */
    publishEvents: function() {
        /**
         * Fired when changes are made within the editor.
         *
         * @event change
         */
        this.publish('change', {
            broadcast: true,
            preventable: true
        });

        /**
         * Fired when all plugins have completed loading.
         *
         * @event pluginsloaded
         */
        this.publish('pluginsloaded', {
            fireOnce: true
        });

        this.publish('ousupsub:selectionchanged', {
            prefix: 'ousupsub'
        });

        return this;
    },

    /**
     * Set up automated polling of the text area to update the textarea.
     *
     * @method setupAutomaticPolling
     * @chainable
     */
    setupAutomaticPolling: function() {
        this._registerEventHandle(this.editor.on(['keyup', 'cut'], this.updateOriginal, this));
        this._registerEventHandle(this.editor.on(['keyup'], this.cleanEditorHTMLSimple, this));
        this._registerEventHandle(this.editor.on('paste', this.pasteCleanup, this));

        // Call this.updateOriginal after dropped content has been processed.
        this._registerEventHandle(this.editor.on('drop', this.updateOriginalDelayed, this));

        return this;
    },

    /**
     * Calls updateOriginal on a short timer to allow native event handlers to run first.
     *
     * @method updateOriginalDelayed
     * @chainable
     */
    updateOriginalDelayed: function() {
        setTimeout(Y.bind(this.updateOriginal, this), 0);

        return this;
    },

    setupPlugins: function() {
        // Clear the list of plugins.
        this.plugins = {};

        var plugins = this.get('plugins');

        var groupIndex,
            group,
            pluginIndex,
            plugin;

        for (groupIndex in plugins) {
            group = plugins[groupIndex];
            if (!group.plugins) {
                // No plugins in this group - skip it.
                continue;
            }
            for (pluginIndex in group.plugins) {
                plugin = group.plugins[pluginIndex];
                if (plugin.name === 'superscript') {
                    this.plugins.superscript = new Y.M.editor_ousupsub.EditorPlugin({
                        name: 'superscript',
                        group: group.group,
                        editor: this.editor,
                        toolbar: this.toolbar,
                        host: this,
                        exec: 'superscript',
                        tags: 'sup',
                        // Key code (up arrow) for the keyboard shortcut which triggers this button:
                        // Up arrow should be 38 but doesn't register and is handled elsewhere.
                        keys: ['94'],
                        icon: 'e/superscript',
                        keyDescription: "Shift + ^ or Up arrow"
                    });
                } else if (plugin.name === 'subscript') {
                    this.plugins.subscript = new Y.M.editor_ousupsub.EditorPlugin({
                        name: 'subscript',
                        group: group.group,
                        editor: this.editor,
                        toolbar: this.toolbar,
                        host: this,
                        exec: 'subscript',
                        tags: 'sub',
                        // Key codes (underscore) for the keyboard shortcut which triggers this button:
                        // Down arrow should be 40 but doesn't register.
                        keys: ['95'],
                        icon: 'e/subscript',
                        keyDescription: "Shift + _ or Down arrow"
                    });
                }
            }
        }

        // Initialise the undo and redo stacks.
        this._undoStack = [];
        this._redoStack = [];

        // Add undo button
        this.plugins.undo = new Y.M.editor_ousupsub.EditorPlugin({
            name: 'undo',
            group: group.group,
            editor: this.editor,
            toolbar: this.toolbar,
            host: this,
            keys: ['90'],
            callback: this._undoHandler,
            icon: 'e/undo'
        });

        // Add redo button
        this.plugins.redo = new Y.M.editor_ousupsub.EditorPlugin({
            name: 'redo',
            group: group.group,
            editor: this.editor,
            toolbar: this.toolbar,
            host: this,
            keys: ['89'],
            callback: this._redoHandler,
            icon: 'e/redo'
        });

        // Enable the undo once everything has loaded.
        this.on('pluginsloaded', function() {
            // Adds the current value to the stack.
            this._addToUndo(this._getHTML());
            this.on('ousupsub:selectionchanged', this._changeListener, this);
        }, this);

        this._updateButtonsStates();
        this.setupUndoHandlers();

        // Some plugins need to perform actions once all plugins have loaded.
        this.fire('pluginsloaded');

        return this;
    },

    /**
     * Set up the watchers for undo/redo.
     *
     * @method setupUndoHandlers
     * @chainable
     */
    setupUndoHandlers: function() {
        // Listen for ctrl+z and ctrl+y keys.
        this._registerEventHandle(this._wrapper.delegate('key',
                this._undoHandler,
                'down:90+ctrl',
                '.' + CSS.CONTENT,
                this));
        this._registerEventHandle(this._wrapper.delegate('key',
                this._redoHandler,
                'down:89+ctrl',
                '.' + CSS.CONTENT,
                this));

        return this;
    },

    pluginEnabled: function(plugin) {
        return this.plugins[plugin] ? true : false;
    },

    enablePlugins: function(plugin) {
        this._setPluginState(true, plugin);
    },

    disablePlugins: function(plugin) {
        this._setPluginState(false, plugin);
    },

    _setPluginState: function(enable, plugin) {
        var target = 'disableButtons';
        if (enable) {
            target = 'enableButtons';
        }

        if (plugin) {
            this.plugins[plugin][target]();
        } else {
            Y.Object.each(this.plugins, function(currentPlugin) {
                currentPlugin[target]();
            }, this);
        }
    },

    /**
     * Register an event handle for disposal in the destructor.
     *
     * @method _registerEventHandle
     * @param {EventHandle} The Event Handle as returned by Y.on, and Y.delegate.
     * @private
     */
    _registerEventHandle: function(handle) {
        this._eventHandles.push(handle);
    },

    /**
     * Setup the toolbar on the editor.
     *
     * @method setupToolbar
     * @chainable
     */
    setupToolbar: function() {
        this.toolbar = Y.Node.create('<div class="' + CSS.TOOLBAR + '" role="toolbar" aria-live="off"></div>');
        this._wrapper.appendChild(this.toolbar);

        if (this.textareaLabel) {
            this.toolbar.setAttribute('aria-labelledby', this.textareaLabel.get("id"));
        }

        // Add keyboard navigation for the toolbar.
        this.setupToolbarNavigation();

        return this;
    },

    /**
     * Set up the watchers for toolbar navigation.
     *
     * @method setupToolbarNavigation
     * @chainable
     */
    setupToolbarNavigation: function() {
        // Listen for Arrow left and Arrow right keys.
        this._wrapper.delegate('key',
                this.toolbarKeyboardNavigation,
                'down:37,39',
                '.' + CSS.TOOLBAR,
                this);
        this._wrapper.delegate('focus',
                function(e) {
                    this._setTabFocus(e.currentTarget);
                }, '.' + CSS.TOOLBAR + ' button', this);

        return this;
    },

    /**
    * Implement arrow key navigation for the buttons in the toolbar.
    *
    * @method toolbarKeyboardNavigation
    * @param {EventFacade} e - the keyboard event.
    */
   toolbarKeyboardNavigation: function(e) {
       // Prevent the default browser behaviour.
       e.preventDefault();

       // On cursor moves we loops through the buttons.
       var buttons = this.toolbar.all('button'),
           direction = 1,
           button,
           current = e.target.ancestor('button', true);

       if (e.keyCode === 37) {
           // Moving left so reverse the direction.
           direction = -1;
       }

       button = this._findFirstFocusable(buttons, current, direction);
       if (button) {
           button.focus();
           this._setTabFocus(button);
       } else {
           Y.log("Unable to find a button to focus on", 'debug', LOGNAME);
       }
   },

   /**
    * Find the first focusable button.
    *
    * @param {NodeList} buttons A list of nodes.
    * @param {Node} startAt The node in the list to start the search from.
    * @param {Number} direction The direction in which to search (1 or -1).
    * @return {Node | Undefined} The Node or undefined.
    * @method _findFirstFocusable
    * @private
    */
   _findFirstFocusable: function(buttons, startAt, direction) {
       var checkCount = 0,
           group,
           candidate,
           button,
           index;

       // Determine which button to start the search from.
       index = buttons.indexOf(startAt);
       if (index < -1) {
           Y.log("Unable to find the button in the list of buttons", 'debug', LOGNAME);
           index = 0;
       }

       // Try to find the next.
       while (checkCount < buttons.size()) {
           index += direction;
           if (index < 0) {
               index = buttons.size() - 1;
           } else if (index >= buttons.size()) {
               // Handle wrapping.
               index = 0;
           }

           candidate = buttons.item(index);

           // Add a counter to ensure we don't get stuck in a loop if there's only one visible menu item.
           checkCount++;

           // Loop while:
           // * we haven't checked every button;
           // * the button is hidden or disabled;
           // * the group is hidden.
           if (candidate.hasAttribute('hidden') || candidate.hasAttribute('disabled')) {
               continue;
           }
           group = candidate.ancestor('.ousupsub_group');
           if (group.hasAttribute('hidden')) {
               continue;
           }

           button = candidate;
           break;
       }

       return button;
    },

    /**
     * Check the tab focus.
     *
     * When we disable or hide a button, we should call this method to ensure that the
     * focus is not currently set on an inaccessible button, otherwise tabbing to the toolbar
     * would be impossible.
     *
     * @method checkTabFocus
     * @chainable
     */
    checkTabFocus: function() {
        if (this._tabFocus) {
            if (this._tabFocus.hasAttribute('disabled') || this._tabFocus.hasAttribute('hidden')
                    || this._tabFocus.ancestor('.ousupsub_group').hasAttribute('hidden')) {
                // Find first available button.
                button = this._findFirstFocusable(this.toolbar.all('button'), this._tabFocus, -1);
                if (button) {
                    if (this._tabFocus.compareTo(document.activeElement)) {
                        // We should also move the focus, because the inaccessible button also has the focus.
                        button.focus();
                    }
                    this._setTabFocus(button);
                }
            }
        }
        return this;
    },

    /**
     * Sets tab focus for the toolbar to the specified Node.
     *
     * @method _setTabFocus
     * @param {Node} button The node that focus should now be set to
     * @chainable
     * @private
     */
    _setTabFocus: function(button) {
        if (this._tabFocus) {
            // Unset the previous entry.
            this._tabFocus.setAttribute('tabindex', '-1');
        }

        // Set up the new entry.
        this._tabFocus = button;
        this._tabFocus.setAttribute('tabindex', 0);

        // And update the activedescendant to point at the currently selected button.
        this.toolbar.setAttribute('aria-activedescendant', this._tabFocus.generateID());

        return this;
    },

    /**
     * Disable CSS styling. Use HTML elements instead.
     *
     * @method disableCssStyling
     */
    disableCssStyling: function() {
        try {
            document.execCommand("styleWithCSS", 0, false);
        } catch (e1) {
            try {
                document.execCommand("useCSS", 0, true);
            } catch (e2) {
                try {
                    document.execCommand('styleWithCSS', false, false);
                } catch (e3) {
                    // We did our best.
                }
            }
        }
    },

    /**
     * Return the appropriate empty content value for the current browser.
     *
     * Different browsers use a different content when they are empty and
     * we must set this reliable across the board.
     *
     * @method _getEmptyContent
     * @return String The content to use representing no user-provided content
     * @private
     */
    _getEmptyContent: function() {
        return '';
    },

    /**
     * Copy and clean the text from the textarea into the contenteditable div.
     *
     * If the text is empty, provide a default paragraph tag to hold the content.
     *
     * @method updateFromTextArea
     * @chainable
     */
    updateFromTextArea: function() {
        // Clear it first.
        this.editor.setHTML('');

        // Copy text to editable div.
        this.editor.append(this.textarea.get('value'));

        // Clean it.
        this.cleanEditorHTML();

        // Insert a paragraph in the empty contenteditable div.
        if (this.editor.getHTML() === '') {
            this.editor.setHTML(this._getEmptyContent());
        }
    },

    /**
     * Copy the text from the contenteditable to the textarea which it replaced.
     *
     * @method updateOriginal
     * @chainable
     */
    updateOriginal : function() {
        // Get the previous and current value to compare them.
        var oldValue = this.textarea.get('value'),
            newValue = this.getCleanHTML();

        if (newValue === "" && this.isActive()) {
            // The content was entirely empty so get the empty content placeholder.
            newValue = this._getEmptyContent();
        }

        // Remove specific unicode characters.
        var values = [];
        for ( var i = 0; i < newValue.length; i++ ) {
            if (newValue.charCodeAt(i) == "65279") {
                continue;
            }
            values.push(newValue.charAt(i));
        }
        newValue = values.join('');
        newValue = newValue.trim();

        // Only call this when there has been an actual change to reduce processing.
        if (oldValue !== newValue) {
            // Insert the cleaned content.
            this.textarea.set('value', newValue);

            // Trigger handlers for this action.
            this.fire('change');
        }

        return this;
    },

    /**
     * Set up the watchers for textarea navigation.
     *
     * @method setupTextareaNavigation
     * @chainable
     */
    setupTextareaNavigation: function() {
        // Listen for Arrow down, underscore, hat (^) and Up Arrow  keys.
        this._registerEventHandle(this._wrapper.delegate('key',
                this.textareaKeyboardNavigation,
                'down:40,95',
                '.' + CSS.CONTENT,
                this));
        this._registerEventHandle(this._wrapper.delegate('key',
                this.textareaKeyboardNavigation,
                'down:38,94',
                '.' + CSS.CONTENT,
                this));

        return this;
    },

    /**
     * Implement arrow key navigation for the buttons in the toolbar.
     *
     * @method textareaKeyboardNavigation
     * @param {EventFacade} e - the keyboard event.
     */
    textareaKeyboardNavigation: function(e) {

        // Prevent the default browser behaviour.
        e.preventDefault();

        // From editor-plugins_buttons::callbackWrapper().
        if (!(YUI.Env.UA.android || this.isActive())) {
            // We must not focus for Android here, even if the editor is not active because the keyboard auto-completion
            // changes the cursor position.
            // If we save that change, then when we restore the change later we get put in the wrong place.
            // Android is fine to save the selection without the editor being in focus.
            this.focus();
        }

        var command = '', mode = 1;
        // Cross browser event object.
        var evt = window.event || e;
        var code = evt.keyCode ? evt.keyCode : evt.charCode;
        // Call superscript.
        if ((code === 38) || (code === 94)) {
            command = 'superscript';
        // Call subscript.
        } else if ((code === 40) || (code === 95)) {
            command = 'subscript';
        }

        if (!command) {
            return;
        }

        this._applyTextCommand(command, mode);
    },

    /**
     * Prevent carriage return to produce a new line.
     */
     _preventEnter: function() {
         var keyEvent = 'keypress';
         if (Y.UA.webkit || Y.UA.ie) {
             keyEvent = 'keydown';
         }
         this.editor.on(keyEvent, function(e) {
             //Cross browser event object.
             var evt = window.event || e;
             if (evt.keyCode === 13) { // Enter.
                 // do nothing.
                 if(!evt.preventDefault) {
                     evt.returnValue = false;
                     return;
                 }
                 evt.preventDefault();
             }
         }, this);
     },

     /**
      * Adds an element to the redo stack.
      *
      * @method _addToRedo
      * @private
      * @param {String} html The HTML content to save.
      */
     _addToRedo: function(html) {
         this._redoStack.push(html);
     },

     /**
      * Adds an element to the undo stack.
      *
      * @method _addToUndo
      * @private
      * @param {String} html The HTML content to save.
      * @param {Boolean} [clearRedo=false] Whether or not we should clear the redo stack.
      */
     _addToUndo: function(html, clearRedo) {
         var last = this._undoStack[this._undoStack.length - 1];

         if (typeof clearRedo === 'undefined') {
             clearRedo = false;
         }

         if (last !== html) {
             this._undoStack.push(html);
             if (clearRedo) {
                 this._redoStack = [];
             }
         }

         while (this._undoStack.length > this._maxUndos) {
             this._undoStack.shift();
         }
     },

     /**
      * Get the editor HTML.
      *
      * @method _getHTML
      * @private
      * @return {String} The HTML.
      */
     _getHTML: function() {
         return this.getCleanHTML();
     },

     /**
      * Get an element on the redo stack.
      *
      * @method _getRedo
      * @private
      * @return {String} The HTML to restore, or undefined.
      */
     _getRedo: function() {
         return this._redoStack.pop();
     },

     /**
      * Get an element on the undo stack.
      *
      * @method _getUndo
      * @private
      * @param {String} current The current HTML.
      * @return {String} The HTML to restore.
      */
     _getUndo: function(current) {
         if (this._undoStack.length === 1) {
             return this._undoStack[0];
         }

         last = this._undoStack.pop();
         if (last === current) {
             // Oops, the latest undo step is the current content, we should unstack once more.
             // There is no need to do that in a loop as the same stack should never contain duplicates.
             last = this._undoStack.pop();
         }

         // We always need to keep the first element of the stack.
         if (this._undoStack.length === 0) {
             this._addToUndo(last);
         }

         return last;
     },

     /**
      * Restore a value from a stack.
      *
      * @method _restoreValue
      * @private
      * @param {String} html The HTML to restore in the editor.
      */
     _restoreValue: function(html) {
         this.editor.setHTML(html);
         // We always add the restored value to the stack, otherwise an event could think that
         // the content has changed and clear the redo stack.
         this._addToUndo(html);
     },

     /**
      * Update the states of the buttons.
      *
      * @method _updateButtonsStates
      * @private
      */
     _updateButtonsStates: function() {
         if (this._undoStack.length > 1) {
             this.enablePlugins('undo');
         } else {
             this.disablePlugins('undo');
         }

         if (this._redoStack.length > 0) {
             this.enablePlugins('redo');
         } else {
             this.disablePlugins('redo');
         }
     },

     /**
      * Handle a click on undo
      *
      * @method _undoHandler
      * @param {Event} The click event
      * @private
      */
     _undoHandler: function(e) {
         e.preventDefault();
         var html = this._getHTML(),
             undo = this._getUndo(html);

         // Edge case, but that could happen. We do nothing when the content equals the undo step.
         if (html === undo) {
             this._updateButtonsStates();
             return;
         }

         // Restore the value.
         this._restoreValue(undo);

         // Add to the redo stack.
         this._addToRedo(html);

         // Update the button states.
         this._updateButtonsStates();
     },

     /**
      * Handle a click on redo
      *
      * @method _redoHandler
      * @param {Event} The click event
      * @private
      */
     _redoHandler: function(e) {
         e.preventDefault();
         var html = this._getHTML(),
             redo = this._getRedo();

         // Edge case, but that could happen. We do nothing when the content equals the redo step.
         if (redo === undefined || html === redo) {
             this._updateButtonsStates();
             return;
         }
         // Restore the value.
         this._restoreValue(redo);

         // Update the button states.
         this._updateButtonsStates();
     },

     /**
      * If we are significantly different from the last saved version, save a new version.
      *
      * @method _changeListener
      * @param {EventFacade} The click event
      * @private
      */
     _changeListener: function(e) {
         if (e.event && e.event.type.indexOf('key') !== -1) {
             // These are the 4 arrow keys.
             if ((e.event.keyCode !== 39) &&
                     (e.event.keyCode !== 37) &&
                     (e.event.keyCode !== 40) &&
                     (e.event.keyCode !== 38)) {
                 // Skip this event type. We only want focus/mouse/arrow events.
                 return;
             }
         }

         this._addToUndo(this._getHTML(), true);
         this._updateButtonsStates();
     }

}, {
    NS: 'editor_ousupsub',
    ATTRS: {
        /**
         * The unique identifier for the form element representing the editor.
         *
         * @attribute elementid
         * @type String
         * @writeOnce
         */
        elementid: {
            value: null,
            writeOnce: true
        },

        /**
         * The contextid of the form.
         *
         * @attribute contextid
         * @type Integer
         * @writeOnce
         */
        contextid: {
            value: null,
            writeOnce: true
        },

        /**
         * Plugins with their configuration.
         *
         * The plugins structure is:
         *
         *     [
         *         {
         *             "group": "groupName",
         *             "plugins": [
         *                 "pluginName": {
         *                     "configKey": "configValue"
         *                 },
         *                 "pluginName": {
         *                     "configKey": "configValue"
         *                 }
         *             ]
         *         },
         *         {
         *             "group": "groupName",
         *             "plugins": [
         *                 "pluginName": {
         *                     "configKey": "configValue"
         *                 }
         *             ]
         *         }
         *     ]
         *
         * @attribute plugins
         * @type Object
         * @writeOnce
         */
        plugins: {
            value: {},
            writeOnce: true
        }
    }
});

// The Editor publishes custom events that can be subscribed to.
Y.augment(Editor, Y.EventTarget);

Y.namespace('M.editor_ousupsub').Editor = Editor;
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
 * @module moodle-editor_ousupsub-editor
 * @submodule clean
 */

/**
 * Functions for the ousupsub editor to clean the generated content.
 *
 * See {{#crossLink "M.editor_ousupsub.Editor"}}{{/crossLink}} for details.
 *
 * @namespace M.editor_ousupsub
 * @class EditorClean
 */

function EditorClean() {}

EditorClean.ATTRS = {
};

EditorClean.prototype = {
    /**
     * Clean the generated HTML content without modifying the editor content.
     *
     * This includes removes all YUI ids from the generated content.
     *
     * @return {string} The cleaned HTML content.
     */
    getCleanHTML: function() {
        // Clone the editor so that we don't actually modify the real content.
        var editorClone = this.editor.cloneNode(true),
            html, startParagraph = '', endParagraph = '';

        // Remove all YUI IDs.
        Y.each(editorClone.all('[id^="yui"]'), function(node) {
            node.removeAttribute('id');
        });

        editorClone.all('.ousupsub_control').remove(true);
        html = editorClone.get('innerHTML');

        // Revert untouched editor contents to an empty string.
        if (html === '' || html === '<br>') {
            return '';
        }

        // Revert untouched editor contents to an empty string.
        if (html.indexOf(startParagraph) === 0) {
            var length = html.length - (startParagraph.length + endParagraph.length);
            html = html.substr(startParagraph.length, length);
        }

        // Remove any and all nasties from source.
       return this._cleanHTML(html);
    },

    /**
     * Clean the HTML content of the editor.
     *
     * @method cleanEditorHTML
     * @chainable
     */
    cleanEditorHTML: function() {
        this.editor.set('innerHTML', this._cleanHTML(this.editor.get('innerHTML')));
        return this;
    },

    /**
     * Clean the HTML content of the editor.
     *
     * @method cleanEditorHTML
     * @chainable
     */
    cleanEditorHTMLSimple: function() {
        // Using saveSelection as it produces a more consistent experience.
        var selection = window.rangy.saveSelection();

        // Update the content.
        this.editor.set('innerHTML', this._cleanHTMLSimple(this.editor.get('innerHTML')));

        // Restore the selection, and collapse to end.
        window.rangy.restoreSelection(selection);
        return this;
    },

    /**
     * Clean the specified HTML content and remove any content which could cause issues.
     *
     * @method _cleanHTML
     * @private
     * @param {String} content The content to clean
     * @return {String} The cleaned HTML
     */
    _cleanHTMLSimple: function(content) {
        // Removing limited things that can break the page or a disallowed, like unclosed comments, style blocks, etc.

        var rules = [
            //Remove empty spans, but not ones from Rangy.
            {regex: /<span(?![^>]*?rangySelectionBoundary[^>]*?)[^>]*>(.+)<\/span>/gi, replace: "$1"}
        ];

        return this._filterContentWithRules(content, rules);
    },

    /**
     * Clean the specified HTML content and remove any content which could cause issues.
     *
     * @method _cleanHTML
     * @private
     * @param {String} content The content to clean
     * @return {String} The cleaned HTML
     */
    _cleanHTML: function(content) {
        // Removing limited things that can break the page or a disallowed, like unclosed comments, style blocks, etc.

        var rules = [
            //Remove empty paragraphs.
            {regex: /<p[^>]*>(&nbsp;|\s)*<\/p>/gi, replace: ""},

            //Remove attributes on sup and sub tags.
            {regex: /<sup[^>]*(&nbsp;|\s)*>/gi, replace: "<sup>"},
            {regex: /<sub[^>]*(&nbsp;|\s)*>/gi, replace: "<sub>"},

            //Replace &nbsp; with space.
            {regex: /&nbsp;/gi, replace: " "},

            //Combine matching tags with spaces in between.
            {regex: /<\/sup>(\s*)+<sup>/gi, replace: "$1"},
            {regex: /<\/sub>(\s*)+<sub>/gi, replace: "$1"},

            //Move spaces after start sup and sub tags to before.
            {regex: /<sup>(\s*)+/gi, replace: "$1<sup>"},
            {regex: /<sub>(\s*)+/gi, replace: "$1<sub>"},

            //Move spaces before end sup and sub tags to after.
            {regex: /(\s*)+<\/sup>/gi, replace: "</sup>$1"},
            {regex: /(\s*)+<\/sub>/gi, replace: "</sub>$1"},

            //Remove empty br tags.
            {regex: /<br>/gi, replace: ""},

            // Remove any style blocks. Some browsers do not work well with them in a contenteditable.
            // Plus style blocks are not allowed in body html, except with "scoped", which most browsers don't support as of 2015.
            // Reference: "http://stackoverflow.com/questions/1068280/javascript-regex-multiline-flag-doesnt-work"
            {regex: /<style[^>]*>[\s\S]*?<\/style>/gi, replace: ""},

            // Remove any open HTML comment opens that are not followed by a close. This can completely break page layout.
            {regex: /<!--(?![\s\S]*?-->)/gi, replace: ""},

            // Remove elements that can not contain visible text.
            {regex: /<script[^>]*>[\s\S]*?<\/script>/gi, replace: ""},

            // Source: "http://www.codinghorror.com/blog/2006/01/cleaning-words-nasty-html.html"
            // Remove forbidden tags for content, title, meta, style, st0-9, head, font, html, body, link.
            {regex: /<\/?(?:br|title|meta|style|std|font|html|body|link|a|ul|li|ol)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:b|i|u|ul|ol|li|img)[^>]*?>/gi, replace: ""},
            // Source:"https://developer.mozilla.org/en/docs/Web/HTML/Element"
            // Remove all elements except sup and sub.
            {regex: /<\/?(?:abbr|address|area|article|aside|audio|base|bdi|bdo|blockquote)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:button|canvas|caption|cite|code|col|colgroup|content|data)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:datalist|dd|decorator|del|details|dialog|dfn|div|dl|dt|element)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:em|embed|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:h6|header|hgroup|hr|iframe|input|ins|kbd|keygen|label|legend)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:main|map|mark|menu|menuitem|meter|nav|noscript|object|optgroup)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:option|output|p|param|pre|progress|q|rp|rt|rtc|ruby|samp)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:section|select|script|shadow|small|source|std|strong|summary)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:svg|table|tbody|td|template|textarea|time|tfoot|th|thead|tr|track)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:var|wbr|video)[^>]*?>/gi, replace: ""},

            // Deprecated elements that might still be used by older sites.
            {regex: /<\/?(?:acronym|applet|basefont|big|blink|center|dir|frame|frameset|isindex)[^>]*?>/gi, replace: ""},
            {regex: /<\/?(?:listing|noembed|plaintext|spacer|strike|tt|xmp)[^>]*?>/gi, replace: ""},

            // Elements from common sites including google.com.
            {regex: /<\/?(?:jsl|nobr)[^>]*?>/gi, replace: ""},

            {regex: /<span(?![^>]*?rangySelectionBoundary[^>]*?)[^>]*>[\s\S]*?([\s\S]*?)<\/span>/gi, replace: "$1"},

            // Remove empty spans, but not ones from Rangy.
            {regex: /<span(?![^>]*?rangySelectionBoundary[^>]*?)[^>]*>(&nbsp;|\s)*<\/span>/gi, replace: ""},
            {regex: /<span(?![^>]*?rangySelectionBoundary[^>]*?)[^>]*>[\s\S]*?([\s\S]*?)<\/span>/gi, replace: "$1"},
            
            // Remove empty sup and sub tags that appear after pasting text.
            {regex: /<sup[^>]*>(&nbsp;|\s)*<\/sup>/gi, replace: ""},
            {regex: /<sub[^>]*>(&nbsp;|\s)*<\/sub>/gi, replace: ""}
        ];

        return this._filterContentWithRules(content, rules);
    },

    /**
     * Take the supplied content and run on the supplied regex rules.
     *
     * @method _filterContentWithRules
     * @private
     * @param {String} content The content to clean
     * @param {Array} rules An array of structures: [ {regex: /something/, replace: "something"}, {...}, ...]
     * @return {String} The cleaned content
     */
    _filterContentWithRules: function(content, rules) {
        var i = 0;
        for (i = 0; i < rules.length; i++) {
            content = content.replace(rules[i].regex, rules[i].replace);
        }

        return content;
    },

    /**
     * Intercept and clean html paste events.
     *
     * @method pasteCleanup
     * @param {Object} sourceEvent The YUI EventFacade  object
     * @return {Boolean} True if the passed event should continue, false if not.
     */
    pasteCleanup: function(sourceEvent) {
        // We only expect paste events, but we will check anyways.
        if (sourceEvent.type === 'paste') {
            // The YUI event wrapper doesn't provide paste event info, so we need the underlying event.
            var event = sourceEvent._event;
            // Check if we have a valid clipboardData object in the event.
            // IE has a clipboard object at window.clipboardData, but as of IE 11, it does not provide HTML content access.
            if (event && event.clipboardData && event.clipboardData.getData) {
                // Check if there is HTML type to be pasted, this is all we care about.
                var types = event.clipboardData.types;
                var isHTML = false;
                // Different browsers use different things to hold the types, so test various functions.
                if (!types) {
                    isHTML = false;
                } else if (typeof types.contains === 'function') {
                    isHTML = types.contains('text/html');
                } else if (typeof types.indexOf === 'function') {
                    isHTML = (types.indexOf('text/html') > -1);
                    if (!isHTML) {
                        if ((types.indexOf('com.apple.webarchive') > -1) || (types.indexOf('com.apple.iWork.TSPNativeData') > -1)) {
                            // This is going to be a specialized Apple paste paste. We cannot capture this, so clean everything.
                            this.fallbackPasteCleanupDelayed();
                            return true;
                        }
                    }
                } else {
                    // We don't know how to handle the clipboard info, so wait for the clipboard event to finish then fallback.
                    this.fallbackPasteCleanupDelayed();
                    return true;
                }

                if (isHTML) {
                    // Get the clipboard content.
                    var content;
                    try {
                        content = event.clipboardData.getData('text/html');
                    } catch (error) {
                        // Something went wrong. Fallback.
                        this.fallbackPasteCleanupDelayed();
                        return true;
                    }

                    // Stop the original paste.
                    sourceEvent.preventDefault();

                    // Scrub the paste content.
                    content = this._cleanPasteHTML(content);

                    // Save the current selection.
                    // Using saveSelection as it produces a more consistent experience.
                    var selection = window.rangy.saveSelection();

                    // Insert the content.
                    this.insertContentAtFocusPoint(content);

                    // Restore the selection, and collapse to end.
                    window.rangy.restoreSelection(selection);
                    window.rangy.getSelection().collapseToEnd();

                    // Update the text area.
                    this.updateOriginal();
                    this._normaliseTextarea();
                    return false;
                } else {
                    // Due to poor cross browser clipboard compatibility, the
                    // failure to find HTML doesn't mean it isn't there.
                    // Wait for the clipboard event to finish then fallback
                    // clean the entire editor.
                    this.fallbackPasteCleanupDelayed();
                    return true;
                }
            } else {
                // If we reached a here, this probably means the browser has limited (or no) clipboard support.
                // Wait for the clipboard event to finish then fallback.
                this.fallbackPasteCleanupDelayed();
                return true;
            }
        }

        // We should never get here - we must have received a non-paste event for some reason.
        // Um, just call updateOriginalDelayed() - it's safe.
        this.updateOriginalDelayed();
        return true;
    },

    /**
     * Cleanup code after a paste event if we couldn't intercept the paste content.
     *
     * @method fallbackPasteCleanup
     * @chainable
     */
    fallbackPasteCleanup: function() {
        Y.log('Using fallbackPasteCleanup for ousupsub cleanup', 'debug', LOGNAME);

        // Save the current selection (cursor position).
        var selection = window.rangy.saveSelection();

        // Get, clean, and replace the content in the editable.
        var content = this.editor.get('innerHTML');
        this.editor.set('innerHTML', this._cleanPasteHTML(content));

        // Update the textarea.
        this.updateOriginal();

        // Restore the selection (cursor position).
        window.rangy.restoreSelection(selection);

        return this;
    },

    /**
     * Calls fallbackPasteCleanup on a short timer to allow the paste event handlers to complete.
     *
     * @method fallbackPasteCleanupDelayed
     * @chainable
     */
    fallbackPasteCleanupDelayed: function() {
        setTimeout(Y.bind(this.fallbackPasteCleanup, this), 0);

        return this;
    },

    /**
     * Cleanup html that comes from WYSIWYG paste events. These are more likely to contain messy code that we should strip.
     *
     * @method _cleanPasteHTML
     * @private
     * @param {String} content The html content to clean
     * @return {String} The cleaned HTML
     */
    _cleanPasteHTML: function(content) {
        // Return an empty string if passed an invalid or empty object.
        if (!content || content.length === 0) {
            return "";
        }

        // Rules that get rid of the real-nasties and don't care about normalize code (correct quotes, white spaces, etc).
        var rules = [
            // Stuff that is specifically from MS Word and similar office packages.
            // Remove all garbage after closing html tag.
            {regex: /<\s*\/html\s*>([\s\S]+)$/gi, replace: ""},
            // Remove if comment blocks.
            {regex: /<!--\[if[\s\S]*?endif\]-->/gi, replace: ""},
            // Remove start and end fragment comment blocks.
            {regex: /<!--(Start|End)Fragment-->/gi, replace: ""},
            // Remove any xml blocks.
            {regex: /<xml[^>]*>[\s\S]*?<\/xml>/gi, replace: ""},
            // Remove any <?xml><\?xml> blocks.
            {regex: /<\?xml[^>]*>[\s\S]*?<\\\?xml>/gi, replace: ""},
            // Remove <o:blah>, <\o:blah>.
            {regex: /<\/?\w+:[^>]*>/gi, replace: ""}
        ];

        // Apply the first set of harsher rules.
        content = this._filterContentWithRules(content, rules);

        // Apply the standard rules, which mainly cleans things like headers, links, and style blocks.
        content = this._cleanHTML(content);

        // Check if the string is empty or only contains whitespace.
        if (content.length === 0 || !content.match(/\S/)) {
            return content;
        }

        // Now we let the browser normalize the code by loading it into the DOM and then get the html back.
        // This gives us well quoted, well formatted code to continue our work on. Word may provide very poorly formatted code.
        var holder = document.createElement('div');
        holder.innerHTML = content;
        content = holder.innerHTML;
        // Free up the DOM memory.
        holder.innerHTML = "";

        // Run some more rules that care about quotes and whitespace.
        rules = [
            // Remove MSO-blah, MSO:blah in style attributes. Only removes one or more that appear in succession.
            {regex: /(<[^>]*?style\s*?=\s*?"[^>"]*?)(?:[\s]*MSO[-:][^>;"]*;?)+/gi, replace: "$1"},
            // Remove MSO classes in class attributes. Only removes one or more that appear in succession.
            {regex: /(<[^>]*?class\s*?=\s*?"[^>"]*?)(?:[\s]*MSO[_a-zA-Z0-9\-]*)+/gi, replace: "$1"},
            // Remove Apple- classes in class attributes. Only removes one or more that appear in succession.
            {regex: /(<[^>]*?class\s*?=\s*?"[^>"]*?)(?:[\s]*Apple-[_a-zA-Z0-9\-]*)+/gi, replace: "$1"},
            // Remove OLE_LINK# anchors that may litter the code.
            {regex: /<a [^>]*?name\s*?=\s*?"OLE_LINK\d*?"[^>]*?>\s*?<\/a>/gi, replace: ""}
        ];

        // Apply the rules.
        content = this._filterContentWithRules(content, rules);

        // Reapply the standard cleaner to the content.
        content = this._cleanHTML(content);

        return content;
    },

    /**
     * Apply the given document.execCommand and tidy up the editor dom afterwards.
     *
     * @method _applyTextCommand
     * @private
     * @param int mode (optional) default is button (0), keyboard is 1
     * @return void
     */
    _applyTextCommand: function(command, mode) {
        var selection, tag;
        // Handle keyboard mode.
        if (mode) {
            tag = this.getCursorTag();
            if (tag === 'superscript' && command === tag ||
                    tag === 'subscript' && command === tag) {
                return; // Do nothing.
            } else if (tag === 'superscript' && command === 'subscript') {
                command = 'superscript';
            } else if (tag === 'subscript' && command === 'superscript') {
                command = 'subscript';
            }

            if (!this.pluginEnabled(command)) {
                return;
            }
        }

        // Apply command.
        document.execCommand(command, false, null);

        // If nothing is selected add a relevant tag.
        selection = rangy.getSelection();
        // If it's a collapsed selection the cursor is in the editor but no selection has been made.
        if (selection.isCollapsed) {
            // Insert tag at cursor focus point.
            tag = command === 'superscript' ? 'sup' : 'sub';
            // ﻿&#65279; is is the Unicode Character 'ZERO WIDTH NO-BREAK SPACE' (U+FEFF). Used
            // by TinyMCE to add empty sup/sub tags when nothing is selected. This causes lint
            // errors but I couldn't find a better solution.
            // http://stackoverflow.com/questions/9691771/why-is-65279-appearing-in-my-html.
            var node = this.insertContentAtFocusPoint('<' + tag + '>﻿&#65279;</' + tag + '>');
            var range = rangy.createRange();
            range.selectNode(node._node.childNodes[0]);
            this.setSelection([range]);
        }
        this._normaliseTextarea();

        // And mark the text area as updated.
        // Save selection after changes to the DOM. If you don't do this here,
        // subsequent calls to restoreSelection() will fail expecting the
        // previous DOM state.
        this.saveSelection();
        this.updateOriginal();
    },

    /**
     * What type of tag surrounds the cursor.
     *
     * @method _getCursorTag
     * @private
     * @return string
     */
    getCursorTag: function() {
        var tag = 'text';
        var selection = rangy.getSelection();
        var nodeName = selection.focusNode.nodeName.toLowerCase();
        var parentNodeName = selection.focusNode.parentNode.nodeName.toLowerCase();

        var childNodeName = '';
        if (selection.focusNode.childNodes && selection.focusNode.childNodes[selection.focusOffset-1]) {
            childNodeName = selection.focusNode.childNodes[selection.focusOffset-1].nodeName.toLowerCase();
        }
        if (nodeName === 'sup' || parentNodeName === 'sup' || childNodeName === 'sup') {
            tag = 'superscript';
        } else if (nodeName === 'sub' || parentNodeName === 'sub' || childNodeName === 'sub') {
            tag = 'subscript';
        }
        return tag;
    },

    /**
     * Get a normalised array of the currently selected nodes. Chrome splits text nodes
     * at the end of each selection and also creates empty text nodes. Fix these changes
     * and provide a standard array of nodes to match the existing selection to.
     *
     * @method _normaliseTextarea
     * @private
     * @return string
     */
    _normaliseTextarea: function() {
        // Save the current selection (cursor position).
        var selection = window.rangy.saveSelection();
        // Remove all the span tags added to the editor textarea by the browser.
        // Get the html directly inside the editor <p> tag and remove span tags from the html inside it.

        var editor_node = this._getEditorNode();
        this._removeSingleNodesByName(editor_node, 'br');

        // Remove specific tags that can be added through keyboard shortcuts.
        var tagsToRemove = ['p', 'b', 'i', 'u', 'ul', 'ol', 'li'];
        for (var i = 0; i < tagsToRemove.length; i++) {
            this._removeNodesByName(editor_node, tagsToRemove[i]);
        }
        this._normaliseTagInTextarea('sup');
        this._normaliseTagInTextarea('sub');
        this._removeNodesByName(editor_node, 'span');

        // Restore the selection (cursor position).
        window.rangy.restoreSelection(selection);

        // Normalise the editor html.
        editor_node.normalize();
    },

    /**
     * Remove all tags nested inside other tags of the same name. No nesting of
     * similar tags e.g. <sup><sup></sup></sup> is not allowed.
     *
     * @method _normaliseTagInTextarea
     * @private
     * @param string name Name of tag to normalise.
     * @return string.
     */
    _normaliseTagInTextarea: function(name) {
        var nodes = [], container = this._getEditorNode(), parentNode, removeParent = false;

        // Remove nested nodes.
        /*
         * Where the node.firstChild == nodes[i+1] since it ignores text elements
         * I know it's the first node. Since the two elements match they should cancel
         * each other out. Currently we remove only the child sup. We should remove
         * both and move their children out.
         */
        // Nodelists change as nodes are added and removed. Use an array of nodes instead.
        nodes = this._copyArray(container.querySelectorAll(name), nodes);

        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            parentNode = node.parentNode;
            removeParent = false;
            if (parentNode === container ) {
                continue;
            }
            if (parentNode.firstChild === node && parentNode.lastChild === node &&
                            parentNode.nodeName.toLowerCase() === name) {
                removeParent = true;
            }
            if (!removeParent && node && parentNode.nodeName.toLowerCase() === name) {
                removeParent = true;
                this._splitParentNode(parentNode, name);
            }
            this._removeNodesByName(node, name);
            if (removeParent) {
                this._removeNodesByName(parentNode, name);
            }
        }

        // Combine Sibling nodes.
        // Get a new node array and fill with the a fresh nodelist.
        nodes = [];
        nodes = this._copyArray(container.querySelectorAll(name), nodes);

        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            if (!node.previousSibling || node.previousSibling.nodeName.toLowerCase() !== name) {
                continue;
            }
            this._mergeNodes(node, node.previousSibling);
        }
    },

    /**
     * Merge the from and to nodes by moving all elements in from node to the to node.
     * Append nodes in order to the to node.
     *
     * Can't use other dom methods like querySelectorAll because they don't return text elements.
     * @method _mergeNodes
     * @private
     * @return void.
     */
    _mergeNodes: function(from, to) {
        var nodes = [];
        var merge_nodes = from.childNodes;

        // Node lists reduce in size as nodes are removed. Use an array of nodes instead.
        for (var i = 0; i < merge_nodes.length; i++) {
            nodes.push(merge_nodes.item(i));
        }

        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            to.appendChild(node);
        }
        this._removeNode(from);
    },

    /**
     * Split the parent node into two with the node with the given name in the middle.
     *
     * Can't use other dom methods like querySelectorAll because they don't return text elements.
     * @method _splitParentNode
     * @private
     * @return void.
     */
    _splitParentNode: function(container_node, name) {
        var nodes = [], node, nodesToAppend = [];
        nodes = this._copyArray(container_node.childNodes, nodes);

        var j;
        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            nodesToAppend = [];
            if (node.nodeName.toLowerCase() === name) {
                nodesToAppend = this._copyArray(node.childNodes, nodesToAppend);
            } else {
                nodesToAppend[0] = document.createElement(name);
                nodesToAppend[0].appendChild(node);
            }
            for (j = 0; j < nodesToAppend.length; j++) {
                container_node.parentNode.insertBefore(nodesToAppend[j], container_node);
            }
        }
    },

    /**
     * Copy array values from a dom node list to the given array.
     *
     * A dom node list reduces as children are removed. Copying to a standard array provides
     * an array that doesn't change.
     * @method _copyArray
     * @private
     * @return array.
     */
    _copyArray: function(from, to) {
        for (var i = 0; i < from.length; i++) {
            to.push(from[i]);
        }

        return to;
    },

    /**
     * Move all elements in container node before the reference node.
     * If recursive mode is equired then where childnodes exist that are not
     * text nodes. Move their children and remove the existing node.
     *
     * Can't use other dom methods like querySelectorAll because they don't return text elements.
     * @method _removeNodesByName
     * @private
     * @return void.
     */
    _removeNodesByName: function(container_node, name) {
        var node, remove_node = container_node.nodeName.toLowerCase() === name;
        var nodes = [];
        var container_nodes = container_node.childNodes;

        // Don't remove the span used by rangy to save and restore the user selection.
        if (container_node.nodeName.toLowerCase() === 'span' &&
                container_node.id.indexOf('selectionBoundary_') > -1) {
            remove_node = false;
        }

        nodes = this._copyArray(container_nodes, nodes);
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            if (node.childNodes && node.childNodes.length) {
                this._removeNodesByName(node, name);

            }
            if (remove_node) {
                var parentNode = container_node.parentNode;
                parentNode.insertBefore(node, container_node);
            }

        }
        if (remove_node) {
            this._removeNode(container_node);
        }
    },

    /**
     * Recursively remove any tag with the given name. Removes child nodes too.
     *
     * Can't use other dom methods like querySelectorAll because they don't return text elements.
     * @method _removeSingleNodesByName
     * @private
     * @return void.
     */
    _removeSingleNodesByName: function(container_node, name) {
        if (!container_node.childNodes) {
            return;
        }
        var node;
        var nodes = [];
        nodes = this._copyArray(container_node.childNodes, nodes);
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            if (node.childNodes && node.childNodes.length) {
                this._removeSingleNodesByName(node, name);
            }

            if (node.nodeName.toLowerCase() === name) {
                this._removeNode(node);
            }
        }
    },

   /**
    * Remove a dom node in a cross browser way.
    *
    * @method _removeNode
    * @private
    * @return bool.
    */
   _removeNode: function(node) {
       if(!node.remove) {
           return node.parentNode.removeChild(node);
       }
       return node.remove();
   },

   /**
    * Get the editor object.
    *
    * @method _getEditor
    * @private
    * @return node.
    */
   _getEditor: function(host) {
       if (!host) {
           host = this.get('host');
       }

       return this;
   },

   /**
    * Get the node containing the editor html to be updated.
    *
    * @method _getEditorNode
    * @private
    * @return node.
    */
   _getEditorNode: function(host) {
       return this._getEditor(host).editor._node;
   }
};

Y.Base.mix(Y.M.editor_ousupsub.Editor, [EditorClean]);
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
 * @module moodle-editor_ousupsub-editor
 * @submodule selection
 */

/**
 * Selection functions for the ousupsub editor.
 *
 * See {{#crossLink "M.editor_ousupsub.Editor"}}{{/crossLink}} for details.
 *
 * @namespace M.editor_ousupsub
 * @class EditorSelection
 */

function EditorSelection() {}

EditorSelection.ATTRS = {
};

EditorSelection.prototype = {

    /**
     * List of saved selections per editor instance.
     *
     * @property _selections
     * @private
     */
    _selections: null,

    /**
     * A unique identifier for the last selection recorded.
     *
     * @property _lastSelection
     * @param lastselection
     * @type string
     * @private
     */
    _lastSelection: null,

    /**
     * Whether focus came from a click event.
     *
     * This is used to determine whether to restore the selection or not.
     *
     * @property _focusFromClick
     * @type Boolean
     * @default false
     * @private
     */
    _focusFromClick: false,

    /**
     * Set up the watchers for selection save and restoration.
     *
     * @method setupSelectionWatchers
     * @chainable
     */
    setupSelectionWatchers: function() {
        // Save the selection when a change was made.
        this._registerEventHandle(this.on('ousupsub:selectionchanged', this.saveSelection, this));

        this._registerEventHandle(this.editor.on('focus', this.restoreSelection, this));

        // Do not restore selection when focus is from a click event.
        this._registerEventHandle(this.editor.on('mousedown', function() {
            this._focusFromClick = true;
        }, this));

        // Copy the current value back to the textarea when focus leaves us and save the current selection.
        this._registerEventHandle(this.editor.on('blur', function() {
            // Clear the _focusFromClick value.
            this._focusFromClick = false;

            // Update the original text area.
            this.updateOriginal();
        }, this));

        this._registerEventHandle(this.editor.on(['keyup', 'focus'], function(e) {
                setTimeout(Y.bind(this._hasSelectionChanged, this, e), 0);
            }, this));

        // To capture both mouseup and touchend events, we need to track the gesturemoveend event in standAlone mode. Without
        // standAlone, it will only fire if we listened to a gesturemovestart too.
        this._registerEventHandle(this.editor.on('gesturemoveend', function(e) {
                setTimeout(Y.bind(this._hasSelectionChanged, this, e), 0);
            }, {
                standAlone: true
            }, this));

        return this;
    },

    /**
     * Work out if the cursor is in the editable area for this editor instance.
     *
     * @method isActive
     * @return {boolean}
     */
    isActive: function() {
        var range = rangy.createRange(),
            selection = rangy.getSelection();

        if (!selection.rangeCount) {
            // If there was no range count, then there is no selection.
            return false;
        }

        // We can't be active if the editor doesn't have focus at the moment.
        if (!document.activeElement ||
                !(this.editor.compareTo(document.activeElement) || this.editor.contains(document.activeElement))) {
            return false;
        }

        // Check whether the range intersects the editor selection.
        range.selectNode(this.editor.getDOMNode());
        return range.intersectsRange(selection.getRangeAt(0));
    },

    /**
     * Create a cross browser selection object that represents a YUI node.
     *
     * @method getSelectionFromNode
     * @param {Node} YUI Node to base the selection upon.
     * @return {[rangy.Range]}
     */
    getSelectionFromNode: function(node) {
        var range = rangy.createRange();
        range.selectNode(node.getDOMNode());
        return [range];
    },

    /**
     * Save the current selection to an internal property.
     *
     * This allows more reliable return focus, helping improve keyboard navigation.
     *
     * Should be used in combination with {{#crossLink "M.editor_ousupsub.EditorSelection/restoreSelection"}}{{/crossLink}}.
     *
     * @method saveSelection
     */
    saveSelection: function() {
        if (this.isActive()) {
            this._selections = this.getSelection();
        }
    },

    /**
     * Restore any stored selection when the editor gets focus again.
     *
     * Should be used in combination with {{#crossLink "M.editor_ousupsub.EditorSelection/saveSelection"}}{{/crossLink}}.
     *
     * @method restoreSelection
     */
    restoreSelection: function() {
        if (!this._focusFromClick) {
            if (this._selections) {
                this.setSelection(this._selections);
            }
        }
        this._focusFromClick = false;
    },

    /**
     * Get the selection object that can be passed back to setSelection.
     *
     * @method getSelection
     * @return {array} An array of rangy ranges.
     */
    getSelection: function() {
        return rangy.getSelection().getAllRanges();
    },

    /**
     * Check that a YUI node it at least partly contained by the current selection.
     *
     * @method selectionContainsNode
     * @param {Node} The node to check.
     * @return {boolean}
     */
    selectionContainsNode: function(node) {
        return rangy.getSelection().containsNode(node.getDOMNode(), true);
    },

    /**
     * Runs a filter on each node in the selection, and report whether the
     * supplied selector(s) were found in the supplied Nodes.
     *
     * By default, all specified nodes must match the selection, but this
     * can be controlled with the requireall property.
     *
     * @method selectionFilterMatches
     * @param {String} selector
     * @param {NodeList} [selectednodes] For performance this should be passed. If not passed, this will be looked up each time.
     * @param {Boolean} [requireall=true] Used to specify that "any" match is good enough.
     * @return {Boolean}
     */
    selectionFilterMatches: function(selector, selectednodes, requireall) {
        if (typeof requireall === 'undefined') {
            requireall = true;
        }
        if (!selectednodes) {
            // Find this because it was not passed as a param.
            selectednodes = this.getSelectedNodes();
        }
        var allmatch = selectednodes.size() > 0,
            anymatch = false;

        var editor = this.editor,
            stopFn = function(node) {
                // The function getSelectedNodes only returns nodes within the editor, so this test is safe.
                return node === editor;
            };

        // If we do not find at least one match in the editor, no point trying to find them in the selection.
        if (!editor.one(selector)) {
            return false;
        }

        selectednodes.each(function(node){
            // Check each node, if it doesn't match the tags AND is not within the specified tags then fail this thing.
            if (requireall) {
                // Check for at least one failure.
                if (!allmatch || !node.ancestor(selector, true, stopFn)) {
                    allmatch = false;
                }
            } else {
                // Check for at least one match.
                if (!anymatch && node.ancestor(selector, true, stopFn)) {
                    anymatch = true;
                }
            }
        }, this);
        if (requireall) {
            return allmatch;
        } else {
            return anymatch;
        }
    },

    /**
     * Get the deepest possible list of nodes in the current selection.
     *
     * @method getSelectedNodes
     * @return {NodeList}
     */
    getSelectedNodes: function() {
        var results = new Y.NodeList(),
            nodes,
            selection,
            range,
            node,
            i;

        selection = rangy.getSelection();

        if (selection.rangeCount) {
            range = selection.getRangeAt(0);
        } else {
            // Empty range.
            range = rangy.createRange();
        }

        if (range.collapsed) {
            // We do not want to select all the nodes in the editor if we managed to
            // have a collapsed selection directly in the editor.
            // It's also possible for the commonAncestorContainer to be the document, which selectNode does not handle
            // so we must filter that out here too.
            if (range.commonAncestorContainer !== this.editor.getDOMNode()
                    && range.commonAncestorContainer !== Y.config.doc) {
                range = range.cloneRange();
                range.selectNode(range.commonAncestorContainer);
            }
        }

        nodes = range.getNodes();

        for (i = 0; i < nodes.length; i++) {
            node = Y.one(nodes[i]);
            if (this.editor.contains(node)) {
                results.push(node);
            }
        }
        return results;
    },

    /**
     * Check whether the current selection has changed since this method was last called.
     *
     * If the selection has changed, the ousupsub:selectionchanged event is also fired.
     *
     * @method _hasSelectionChanged
     * @private
     * @param {EventFacade} e
     * @return {Boolean}
     */
    _hasSelectionChanged: function(e) {
        var selection = rangy.getSelection(),
            range,
            changed = false;

        if (selection.rangeCount) {
            range = selection.getRangeAt(0);
        } else {
            // Empty range.
            range = rangy.createRange();
        }

        if (this._lastSelection) {
            if (!this._lastSelection.equals(range)) {
                changed = true;
                return this._fireSelectionChanged(e);
            }
        }
        this._lastSelection = range;
        return changed;
    },

    /**
     * Fires the ousupsub:selectionchanged event.
     *
     * When the selectionchanged event is fired, the following arguments are provided:
     *   - event : the original event that lead to this event being fired.
     *   - selectednodes :  an array containing nodes that are entirely selected of contain partially selected content.
     *
     * @method _fireSelectionChanged
     * @private
     * @param {EventFacade} e
     */
    _fireSelectionChanged: function(e) {
        this.fire('ousupsub:selectionchanged', {
            event: e,
            selectedNodes: this.getSelectedNodes()
        });
    },

    /**
     * Get the DOM node representing the common anscestor of the selection nodes.
     *
     * @method getSelectionParentNode
     * @return {Element|boolean} The DOM Node for this parent, or false if no seletion was made.
     */
    getSelectionParentNode: function() {
        var selection = rangy.getSelection();
        if (selection.rangeCount) {
            return selection.getRangeAt(0).commonAncestorContainer;
        }
        return false;
    },

    /**
     * Set the current selection. Used to restore a selection.
     *
     * @method selection
     * @param {array} ranges A list of rangy.range objects in the selection.
     */
    setSelection: function(ranges) {
        var selection = rangy.getSelection();
        selection.setRanges(ranges);
    },

    /**
     * Inserts the given HTML into the editable content at the currently focused point.
     *
     * @method insertContentAtFocusPoint
     * @param {String} html
     * @return {Node} The YUI Node object added to the DOM.
     */
    insertContentAtFocusPoint: function(html) {
        var selection = rangy.getSelection(),
            range,
            node = Y.Node.create(html);
        if (selection.rangeCount) {
            range = selection.getRangeAt(0);
        }
        if (range) {
            range.deleteContents();
            range.insertNode(node.getDOMNode());
        }
        return node;
    }

};

Y.Base.mix(Y.M.editor_ousupsub.Editor, [EditorSelection]);
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
 * ousupsub editor plugin.
 *
 * @module moodle-editor_ousupsub-editor
 * @submodule plugin-base
 * @package    editor_ousupsub
 * @copyright  2014 Andrew Nicols
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * A Plugin for the ousupsub Editor used in Moodle.
 *
 * This class should not be directly instantiated, and all Editor plugins
 * should extend this class.
 *
 * @namespace M.editor_ousupsub
 * @class EditorPlugin
 * @main
 * @constructor
 * @uses M.editor_ousupsub.EditorPluginButtons
 */

function EditorPlugin() {
    EditorPlugin.superclass.constructor.apply(this, arguments);
}

var DISABLED = 'disabled',
    HIGHLIGHT = 'highlight',
    GROUPSELECTOR = '.ousupsub_group.',
    GROUP = '_group';

Y.extend(EditorPlugin, Y.Base, {
    /**
     * The name of the current plugin.
     *
     * @property name
     * @type string
     */
    name: null,

    /**
     * The name of the command to execute when the button is clicked.
     *
     * @property exec
     * @type string
     */
    exec: null,

    /**
     * A Node reference to the editor.
     *
     * @property editor
     * @type Node
     */
    editor: null,

    /**
     * A Node reference to the editor toolbar.
     *
     * @property toolbar
     * @type Node
     */
    toolbar: null,

    /**
     * Event Handles to clear on plugin destruction.
     *
     * @property _eventHandles
     * @private
     */
    _eventHandles: null,

    /**
     * All of the buttons that belong to this plugin instance.
     *
     * Buttons are stored by button name.
     *
     * @property buttons
     * @type object
     */
    buttons: null,

    /**
     * A list of each of the button names.
     *
     * @property buttonNames
     * @type array
     */
    buttonNames: null,

    /**
     * A read-only view of the current state for each button. Mappings are stored by name.
     *
     * Possible states are:
     * <ul>
     * <li>{{#crossLink "M.editor_ousupsub.EditorPluginButtons/ENABLED:property"}}{{/crossLink}}; and</li>
     * <li>{{#crossLink "M.editor_ousupsub.EditorPluginButtons/DISABLED:property"}}{{/crossLink}}.</li>
     * </ul>
     *
     * @property buttonStates
     * @type object
     */
    buttonStates: null,

    /**
     * The state for a disabled button.
     *
     * @property DISABLED
     * @type Number
     * @static
     * @value 0
     */
    DISABLED: 0,

    /**
     * The state for an enabled button.
     *
     * @property ENABLED
     * @type Number
     * @static
     * @value 1
     */
    ENABLED: 1,

    /**
     * The list of Event Handlers for buttons.
     *
     * @property _buttonHandlers
     * @protected
     * @type array
     */
    _buttonHandlers: null,

    /**
     * A textual description of the primary keyboard shortcut for this
     * plugin.
     *
     * This will be null if no keyboard shortcut has been registered.
     *
     * @property _primaryKeyboardShortcut
     * @protected
     * @type String
     * @default null
     */
    _primaryKeyboardShortcut: null,

    /**
     * An list of handles returned by setTimeout().
     *
     * The keys will be the buttonName of the button, and the value the handles.
     *
     * @property _highlightQueue
     * @protected
     * @type Object
     * @default null
     */
    _highlightQueue: null,

    initializer: function(config) {
        // Set the references to configuration parameters.
        this.name = config.name;
        this.exec = config.exec;
        this.toolbar = config.toolbar;
        this.editor = config.editor;

        // Set up the prototypal properties.
        // These must be set up here because prototypal arrays and objects are copied across instances.
        this.buttons = {};
        this.buttonNames = [];
        this.buttonStates = {};
        this._primaryKeyboardShortcut = [];
        this._buttonHandlers = [];
        this._menuHideHandlers = [];
        this._highlightQueue = {};
        this._eventHandles = [];
        this.addButton(config);
    },

    destructor: function() {
        // Detach all EventHandles.
        new Y.EventHandle(this._eventHandles).detach();
    },

    /**
     * Mark the content ediable content as having been changed.
     *
     * This is a convenience function and passes through to {{#crossLink "M.editor_ousupsub.EditorTextArea/updateOriginal"}}updateOriginal{{/crossLink}}.
     *
     * @method markUpdated
     */
    markUpdated: function() {
        // Save selection after changes to the DOM. If you don't do this here,
        // subsequent calls to restoreSelection() will fail expecting the
        // previous DOM state.
        this.get('host').saveSelection();

        return this.get('host').updateOriginal();
    },

    /**
     * Register an event handle for disposal in the destructor.
     *
     * @method registerEventHandle
     * @param {EventHandle} The Event Handle as returned by Y.on, and Y.delegate.
     */
    registerEventHandle: function(handle) {
        this._eventHandles.push(handle);
    },

    /**
     * Add a button for this plugin to the toolbar.
     *
     * @method addButton
     * @param {object} config The configuration for this button
     * @param {string} [config.iconurl] The URL for the icon. If not specified, then the icon and component will be used instead.
     * @param {string} [config.icon] The icon identifier.
     * @param {string} [config.iconComponent='core'] The icon component.
     * @param {string} [config.keys] The shortcut key that can call this plugin from the keyboard.
     * @param {string} [config.keyDescription] An optional description for the keyboard shortcuts.
     * If not specified, this is automatically generated based on config.keys.
     * If multiple key bindings are supplied to config.keys, then only the first is used.
     * If set to false, then no description is added to the title.
     * @param {string} [config.tags] The tags that trigger this button to be highlighted.
     * @param {boolean} [config.tagMatchRequiresAll=true] Working in combination with the tags parameter, when true
     * every tag of the selection has to match. When false, only one match is needed. Only set this to false when
     * necessary as it is much less efficient.
     * See {{#crossLink "M.editor_ousupsub.EditorSelection/selectionFilterMatches:method"}}{{/crossLink}} for more information.
     * @param {string} [config.title=this.name] The string identifier in the plugin's language file.
     * @param {string} [config.buttonName=this.name] The name of the button. This is used in the buttons object, and if
     * specified, in the class for the button.
     * @param {function} config.callback A callback function to call when the button is clicked.
     * @param {object} [config.callbackArgs] Any arguments to pass to the callback.
     * @return {Node} The Node representing the newly created button.
     */
    addButton: function(config) {
        var group = this.get('group'),
            pluginname = this.name,
            buttonClass = 'ousupsub_' + pluginname + '_button',
            button,
            host = this.get('host');

        if (config.exec) {
            buttonClass = buttonClass + '_' + config.exec;
        }

        if (!config.buttonName) {
            // Set a default button name - this is used as an identifier in the button object.
            config.buttonName = config.exec || pluginname;
        } else {
            buttonClass = buttonClass + '_' + config.buttonName;
        }
        config.buttonClass = buttonClass;

        // Normalize icon configuration.
        config = this._normalizeIcon(config);

        if (!config.title) {
            config.title = 'pluginname';
        }
        var title = M.util.get_string(pluginname, 'editor_ousupsub');

        // Create the actual button.
        button = Y.Node.create('<button type="button" class="' + buttonClass + '" tabindex="-1">' +
                    '<img class="icon" aria-hidden="true" role="presentation" width="16" height="16" src="' +
                            config.iconurl + '" />' +
                '</button>');
        button.setAttribute('title', title);

        // Append it to the group.
        group.append(button);

        var currentfocus = this.toolbar.getAttribute('aria-activedescendant');
        if (!currentfocus) {
            // Initially set the first button in the toolbar to be the default on keyboard focus.
         // Initially set the first button in the toolbar to be the default on keyboard focus.
            button.setAttribute('tabindex', '0');
            this.toolbar.setAttribute('aria-activedescendant', button.generateID());
            this.get('host')._tabFocus = button;
        }
        // Normalize the callback parameters.
        if (!config.callback) {
            config.callback = this._applyTextCommand;
        }
        config.callback = Y.rbind(this._callbackWrapper, this, config.callback);

        // Add the standard click handler to the button.
        this._buttonHandlers.push(
            this.toolbar.delegate('click', config.callback, '.' + buttonClass, this)
        );

        // Handle button click via shortcut key.
        if (config.keys) {
            
            if (typeof config.keyDescription !== 'undefined') {
                // A keyboard shortcut description was specified - use it.
                this._primaryKeyboardShortcut[buttonClass] = config.keyDescription;
            }
            this._addKeyboardListener(config.callback, config.keys, buttonClass);

            if (this._primaryKeyboardShortcut[buttonClass]) {
                // If we have a valid keyboard shortcut description, then set it with the title.
                button.setAttribute('title', M.util.get_string('plugin_title_shortcut', 'editor_ousupsub', {
                        title: title,
                        shortcut: this._primaryKeyboardShortcut[buttonClass]
                    }));
            }
        }

        // Handle highlighting of the button.
        if (config.tags) {
            var tagMatchRequiresAll = true;
            if (typeof config.tagMatchRequiresAll === 'boolean') {
                tagMatchRequiresAll = config.tagMatchRequiresAll;
            }
            this._buttonHandlers.push(
                host.on(['ousupsub:selectionchanged', 'change'], function(e) {
                    if (typeof this._highlightQueue[config.buttonName] !== 'undefined') {
                        clearTimeout(this._highlightQueue[config.buttonName]);
                    }
                    // Async the highlighting.
                    this._highlightQueue[config.buttonName] = setTimeout(Y.bind(function(e) {
                        if (host.selectionFilterMatches(config.tags, e.selectedNodes, tagMatchRequiresAll)) {
                            this.highlightButtons(config.buttonName);
                        } else {
                            this.unHighlightButtons(config.buttonName);
                        }
                    }, this, e), 0);
                }, this)
            );
        }

        // Add the button reference to the buttons array for later reference.
        this.buttonNames.push(config.buttonName);
        this.buttons[config.buttonName] = button;
        this.buttonStates[config.buttonName] = this.ENABLED;
        return button;
    },

    /**
     * Normalize and sanitize the configuration variables relating to callbacks.
     *
     * @method _normalizeCallback
     * @param {object} config
     * @param {function} config.callback A callback function to call when the button is clicked.
     * @param {object} [config.callbackArgs] Any arguments to pass to the callback.
     * @param {object} [inheritFrom] A parent configuration that this configuration may inherit from.
     * @return {object} The normalized configuration
     * @private
     */
    _normalizeCallback: function(config, inheritFrom) {
        if (config._callbackNormalized) {
            // Return early if the callback has already been normalized.
            return config;
        }

        if (!inheritFrom) {
            // Create an empty inheritFrom to make life easier below.
            inheritFrom = {};
        }

        // We wrap the callback in function to prevent the default action, check whether the editor is
        // active and focus it, and then mark the field as updated.
        config._callback = config.callback || inheritFrom.callback;
        config.callback = Y.rbind(this._callbackWrapper, this, this._applyTextCommand, config.callbackArgs);

        config._callbackNormalized = true;

        return config;
    },

    /**
     * Normalize and sanitize the configuration variables relating to icons.
     *
     * @method _normalizeIcon
     * @param {object} config
     * @param {string} [config.iconurl] The URL for the icon. If not specified, then the icon and component will be used instead.
     * @param {string} [config.icon] The icon identifier.
     * @param {string} [config.iconComponent='core'] The icon component.
     * @return {object} The normalized configuration
     * @private
     */
    _normalizeIcon: function(config) {
        if (!config.iconurl) {
            // The default icon component.
            if (!config.iconComponent) {
                config.iconComponent = 'core';
            }
            config.iconurl = M.util.image_url(config.icon, config.iconComponent);
        }

        return config;
    },

    /**
     * A wrapper in which to run the callbacks.
     *
     * This handles common functionality such as:
     * <ul>
     *  <li>preventing the default action; and</li>
     *  <li>focusing the editor if relevant.</li>
     * </ul>
     *
     * @method _callbackWrapper
     * @param {EventFacade} e
     * @param {Function} callback The function to call which makes the relevant changes.
     * @param {Array} [callbackArgs] The arguments passed to this callback.
     * @return {Mixed} The value returned by the callback.
     * @private
     */
    _callbackWrapper: function(e, callback, callbackArgs) {
        e.preventDefault();

        if (!this.isEnabled()) {
            // Exit early if the plugin is disabled.
            return;
        }

        var creatorButton = e.currentTarget.ancestor('button', true);

        if (creatorButton && creatorButton.hasAttribute(DISABLED)) {
            // Exit early if the clicked button was disabled.
            return;
        }

        if (!(YUI.Env.UA.android || this.get('host').isActive())) {
            // We must not focus for Android here, even if the editor is not active because the keyboard auto-completion
            // changes the cursor position.
            // If we save that change, then when we restore the change later we get put in the wrong place.
            // Android is fine to save the selection without the editor being in focus.
            this.get('host').focus();
        }

        // Save the selection.
        this.get('host').saveSelection();

        // Build the arguments list, but remove the callback we're calling.
        var args = [e, callbackArgs];

        // Restore selection before making changes.
        this.get('host').restoreSelection();

        // Actually call the callback now.
        return callback.apply(this, args);
    },

    /**
     * Add a keyboard listener to call the callback.
     *
     * The keyConfig will take either an array of keyConfigurations, in
     * which case _addKeyboardListener is called multiple times; an object
     * containing an optional eventtype, optional container, and a set of
     * keyCodes, or just a string containing the keyCodes. When keyConfig is
     * not an object, it is wrapped around a function that ensures that
     * only the expected key modifiers were used. For instance, it checks
     * that space+ctrl is not triggered when the user presses ctrl+shift+space.
     * When using an object, the developer should check that manually.
     *
     * @method _addKeyboardListener
     * @param {function} callback
     * @param {array|object|string} keyConfig
     * @param {string} [keyConfig.eventtype=key] The type of event
     * @param {string} [keyConfig.container=.editor_ousupsub_content] The containing element.
     * @param {string} keyConfig.keyCodes The keycodes to user for the event.
     * @private
     *
     */
    _addKeyboardListener: function(callback, keyConfig, buttonName) {
        var eventtype = 'key',
            container = CSS.EDITORWRAPPER,
            keys,
            handler,
            modifier;

        if (Y.Lang.isArray(keyConfig)) {
            // If an Array was specified, call the add function for each element.
            Y.Array.each(keyConfig, function(config) {
                this._addKeyboardListener(callback, config, buttonName);
            }, this);

            return this;

        } else if (typeof keyConfig === "object") {
            if (keyConfig.eventtype) {
                eventtype = keyConfig.eventtype;
            }

            if (keyConfig.container) {
                container = keyConfig.container;
            }

            // Must be specified.
            keys = keyConfig.keyCodes;
            handler = callback;

        } else {
            modifier = '';
            keys = keyConfig;
            if (typeof this._primaryKeyboardShortcut[buttonName] === 'undefined') {
                this._primaryKeyboardShortcut[buttonName] = this._getDefaultMetaKeyDescription(keyConfig);
            }
            // Wrap the callback into a handler to check if it uses the specified modifiers, not more.
            handler = Y.bind(function(modifiers, e) {
                    callback.apply(this, [e]);
            }, this, [modifier]);
        }

        this._buttonHandlers.push(
            this.editor.delegate(
                eventtype,
                handler,
                keys,
                container,
                this
            )
        );

    },

    /**
     * Checks if a key event was strictly defined for the modifiers passed.
     *
     * @method _eventUsesExactKeyModifiers
     * @param  {Array} modifiers List of key modifiers to check for (alt, ctrl, meta or shift).
     * @param  {EventFacade} e The event facade.
     * @return {Boolean} True if the event was stricly using the modifiers specified.
     */
    _eventUsesExactKeyModifiers: function(modifiers, e) {
        var exactMatch = true,
            hasKey;

        if (e.type !== 'key') {
            return false;
        }

        hasKey = Y.Array.indexOf(modifiers, 'alt') > -1;
        exactMatch = exactMatch && ((e.altKey && hasKey) || (!e.altKey && !hasKey));
        hasKey = Y.Array.indexOf(modifiers, 'ctrl') > -1;
        exactMatch = exactMatch && ((e.ctrlKey && hasKey) || (!e.ctrlKey && !hasKey));
        hasKey = Y.Array.indexOf(modifiers, 'meta') > -1;
        exactMatch = exactMatch && ((e.metaKey && hasKey) || (!e.metaKey && !hasKey));
        hasKey = Y.Array.indexOf(modifiers, 'shift') > -1;
        exactMatch = exactMatch && ((e.shiftKey && hasKey) || (!e.shiftKey && !hasKey));

        return exactMatch;
    },

    /**
     * Determine if this plugin is enabled, based upon the state of it's buttons.
     *
     * @method isEnabled
     * @return {boolean}
     */
    isEnabled: function() {
        // The first instance of an undisabled button will make this return true.
        var found = Y.Object.some(this.buttonStates, function(button) {
            return (button === this.ENABLED);
        }, this);

        return found;
    },

    /**
     * Enable one button, or all buttons relating to this Plugin.
     *
     * If no button is specified, all buttons are disabled.
     *
     * @method disableButtons
     * @param {String} [button] The name of a specific plugin to enable.
     * @chainable
     */
    disableButtons: function(button) {
        return this._setButtonState(false, button);
    },

    /**
     * Enable one button, or all buttons relating to this Plugin.
     *
     * If no button is specified, all buttons are enabled.
     *
     * @method enableButtons
     * @param {String} [button] The name of a specific plugin to enable.
     * @chainable
     */
    enableButtons: function(button) {
        return this._setButtonState(true, button);
    },

    /**
     * Set the button state for one button, or all buttons associated with this plugin.
     *
     * @method _setButtonState
     * @param {Boolean} enable Whether to enable this button.
     * @param {String} [button] The name of a specific plugin to set state for.
     * @chainable
     * @private
     */
    _setButtonState: function(enable, button) {
        var attributeChange = 'setAttribute';
        if (enable) {
            attributeChange = 'removeAttribute';
        }
        if (button) {
            if (this.buttons[button]) {
                this.buttons[button][attributeChange](DISABLED, DISABLED);
                this.buttonStates[button] = enable ? this.ENABLED : this.DISABLED;
            }
        } else {
            Y.Array.each(this.buttonNames, function(button) {
                this.buttons[button][attributeChange](DISABLED, DISABLED);
                this.buttonStates[button] = enable ? this.ENABLED : this.DISABLED;
            }, this);
        }

        this.get('host').checkTabFocus();
        return this;
    },

    /**
     * Highlight a button, or buttons in the toolbar.
     *
     * If no button is specified, all buttons are highlighted.
     *
     * @method highlightButtons
     * @param {string} [button] If a plugin has multiple buttons, the specific button to highlight.
     * @chainable
     */
    highlightButtons: function(button) {
        return this._changeButtonHighlight(true, button);
    },

    /**
     * Un-highlight a button, or buttons in the toolbar.
     *
     * If no button is specified, all buttons are un-highlighted.
     *
     * @method unHighlightButtons
     * @param {string} [button] If a plugin has multiple buttons, the specific button to highlight.
     * @chainable
     */
    unHighlightButtons: function(button) {
        return this._changeButtonHighlight(false, button);
    },

    /**
     * Highlight a button, or buttons in the toolbar.
     *
     * @method _changeButtonHighlight
     * @param {boolean} highlight true
     * @param {string} [button] If a plugin has multiple buttons, the specific button to highlight.
     * @protected
     * @chainable
     */
    _changeButtonHighlight: function(highlight, button) {
        var method = 'addClass';

        if (!highlight) {
            method = 'removeClass';
        }
        if (button) {
            if (this.buttons[button]) {
                this.buttons[button][method](HIGHLIGHT);
            }
        } else {
            Y.Object.each(this.buttons, function(button) {
                button[method](HIGHLIGHT);
            }, this);
        }

        return this;
    },

    /**
     * Get the default meta key to use with keyboard events.
     *
     * On a Mac, this will be the 'meta' key for Command; otherwise it will
     * be the Control key.
     *
     * @method _getDefaultMetaKey
     * @return {string}
     * @private
     */
    _getDefaultMetaKey: function() {
        if (Y.UA.os === 'macintosh') {
            return 'meta';
        } else {
            return 'ctrl';
        }
    },

    /**
     * Get the user-visible description of the meta key to use with keyboard events.
     *
     * On a Mac, this will be 'Command' ; otherwise it will be 'Control'.
     *
     * @method _getDefaultMetaKeyDescription
     * @return {string}
     * @private
     */
    _getDefaultMetaKeyDescription: function(keyCode) {
        if (Y.UA.os === 'macintosh') {
            return M.util.get_string('editor_command_keycode', 'editor_ousupsub', String.fromCharCode(keyCode).toLowerCase());
        } else {
            return M.util.get_string('editor_control_keycode', 'editor_ousupsub', String.fromCharCode(keyCode).toLowerCase());
        }
    },

    /**
     * Get the standard key event to use for keyboard events.
     *
     * @method _getKeyEvent
     * @return {string}
     * @private
     */
    _getKeyEvent: function() {
        return 'down:';
    },

     /**
      * Apply the given document.execCommand and tidy up the editor dom afterwards.
      *
      * @method _applyTextCommand
      * @private
      * @return void
      */
     _applyTextCommand: function(e) {
         var mode = 0;

         if(e && e.type === 'key') {
             mode = 1;
         }

         this._getEditor()._applyTextCommand(this.exec, mode);
     },

    /**
     * Get the editor object.
     *
     * @method _getEditor
     * @private
     * @return node.
     */
    _getEditor: function(host) {
        if (!host) {
            host = this.get('host');
        }

        return host;
    },

    /**
     * Get the node containing the editor html to be updated.
     *
     * @method _getEditorNode
     * @private
     * @return node.
     */
    _getEditorNode: function(host) {
        return this._getEditor(host).editor._node;
    }

}, {
    NAME: 'editorPlugin',
    ATTRS: {
        /**
         * The editor instance that this plugin was instantiated by.
         *
         * @attribute host
         * @type M.editor_ousupsub.Editor
         * @writeOnce
         */
        host: {
            writeOnce: true
        },

        /**
         * The toolbar group that this button belongs to.
         *
         * When setting, the name of the group should be specified.
         *
         * When retrieving, the Node for the toolbar group is returned. If
         * the group doesn't exist yet, then it is created first.
         *
         * @attribute group
         * @type Node
         * @writeOnce
         */
        group: {
            writeOnce: true,
            getter: function(groupName) {
                var group = this.toolbar.one(GROUPSELECTOR + groupName + GROUP);
                if (!group) {
                    group = Y.Node.create('<div class="ousupsub_group ' +
                            groupName + GROUP + '"></div>');
                    this.toolbar.append(group);
                }

                return group;
            }
        }
    }
});

Y.namespace('M.editor_ousupsub').EditorPlugin = EditorPlugin;
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
 * @module     moodle-editor_ousupsub-editor
 * @submodule  manager
 * @package    editor_ousupsub
 * @copyright  2014 Andrew Nicols <andrew@nicols.co.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @main       moodle-editor_ousupsub-editor
 */

/**
 * @module moodle-editor_ousupsub-editor
 */

/**
 * The manager for the OUSupSub editor.
 *
 * @class editor_ousupsub
 */

Y.M.editor_ousupsub = Y.M.editor_ousupsub || {};

/**
 * List of editor_ousupsub instances. Intentionally placed on window.M, not
 * something in the namespace, so we can be sure it is really global.
 */
M = M || {};
M.editor_ousupsub = M.editor_ousupsub || {};
M.editor_ousupsub._instances = M.editor_ousupsub._instances || {};

/**
 * Add a reference to an editor.
 * Note: This is an internal method which should only be called by the editor itself.
 *
 * @method addEditorReference
 * @param {String} name The name of the editor instance to add
 * @private
 */
Y.M.editor_ousupsub.addEditorReference = function(name, reference) {
    Y.log("Registering a new ousupsub editor: " + name, 'debug', LOGNAME);
    if (typeof M.editor_ousupsub._instances[name] === 'undefined') {
        M.editor_ousupsub._instances[name] = reference;
    } else {
        Y.log("An ousupsub editor with the name '" + name + "' already exists. Unable to add.", 'warn', LOGNAME);
    }

    return Y.M.editor_ousupsub;
};

/**
 * Create a new editor using simple options.
 *
 * @method createEditor
 * @param {String} id of the textarea to turn into an editor.
 * @param {String} type 'superscript', 'subscript' or 'both'.
 * @return {M.editor_ousupsub.Editor} The newly created editor instance
 */
Y.M.editor_ousupsub.createEditorSimple = function(id, type) {
    var plugins = [];
    if (type === 'both' || type === 'superscript') {
        plugins.push({"name": "superscript", "params": []});
    }
    if (type === 'both' || type === 'subscript') {
        plugins.push({"name": "subscript", "params": []});
    }

    Y.M.editor_ousupsub.createEditor(
            {"elementid" : id, "content_css" : "", "contextid" : 0, "language" : "en",
             "directionality" : "ltr", "plugins" : [{"group" : "style1", "plugins" : plugins}],"pageHash" : ""});
};

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
Y.M.editor_ousupsub.createEditor = function(config) {

    var instance = new Y.M.editor_ousupsub.Editor(config);
    Y.M.editor_ousupsub.fire('editor_ousupsub:created', {
        id: instance.get('elementid'),
        instance: instance
    });
    return instance;
};

/**
 * Get the requested Editor instance.
 *
 * @method getEditor
 * @param {String} name The name of the editor instance to retrieve
 * @return {M.editor_ousupsub.Editor} The requested editor instance
 */
Y.M.editor_ousupsub.getEditor = function(name) {
    return M.editor_ousupsub._instances[name];
};

/**
 * Remove the reference for an editor.
 *
 * @method removeEditorReference
 * @param {String} name The name of the editor instance to remove
 */
Y.M.editor_ousupsub.removeEditor = function(name) {
    var instance = Y.M.editor_ousupsub.getEditor(name);
    if (instance) {
        instance.destroy();
        this.fire('editor_ousupsub:removed', {
            id: name
        });
    }
    return Y.M.editor_ousupsub;
};

/**
 * Remove the reference for an editor.
 * Note: This is an internal method which should only be called by the editor itself.
 *
 * @method removeEditorReference
 * @param {String} name The name of the editor instance to remove
 * @private
 */
Y.M.editor_ousupsub.removeEditorReference = function(name) {
    if (Y.M.editor_ousupsub.getEditor(name)) {
        delete M.editor_ousupsub._instances[name];
    }
};

/**
 * Add the supplied function to the manager using the specified name.
 *
 * @method addMethod
 * @param {String} name The name to store the method on within the editor manager.
 * @param {Function} fn The function to be added.
 * @param {Object} [context] The context to apply the function with. If not specified, the Editor itself is used.
 */
Y.M.editor_ousupsub.addMethod = function(name, fn) {
    if (typeof this[name] !== 'undefined') {
        Y.log('Overwriting existing method: ' + name, 'warn', LOGNAME);
    }

    Y.M.editor_ousupsub[name] = function() {
        var ret = [],
            args = arguments;

        Y.Object.each(M.editor_ousupsub._instances, function(editor) {
            var result = fn.apply(editor, args);

            if (result !== undefined && result !== editor) {
                ret[ret.length] = result;
            }
        });

        // If we received a set of results, return them, otherwise make this method chainable.
        return ret.length ? ret : this;
    };
};

Y.augment(Y.M.editor_ousupsub, Y.EventTarget);

Y.Array.each(['saveSelection', 'updateFromTextArea', 'updateOriginal', 'cleanEditorHTML', 'destroy'], function(name) {
    Y.M.editor_ousupsub.addMethod(name, Y.M.editor_ousupsub.Editor.prototype[name]);
});


}, '@VERSION@', {"requires": ["base", "node", "event", "event-custom", "moodle-editor_ousupsub-rangy"]});

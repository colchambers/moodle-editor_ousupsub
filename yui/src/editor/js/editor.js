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
                        icon: 'e/superscript'
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
                        icon: 'e/subscript'
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

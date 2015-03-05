// Miscellaneous core Javascript functions for Moodle
// Global M object is initilised in inline javascript

/**
 * Various utility functions
 */
M.util = M.util || {};

/**
 * Returns url for images.
 * @param {String} imagename
 * @param {String} component
 * @return {String}
 */
M.util.image_url = function(imagename, component) {

    if (!component || component == '' || component == 'moodle' || component == 'core') {
        component = 'core';
    }

    var url = M.cfg.wwwroot + '/resources/';
    var suffix = '.svg'
	url += component + '_' + imagename;
	if (!M.cfg.svgicons) {
		url += '.png';
	}

	url += suffix;
    return url;
};

/**
 * Returns a string registered in advance for usage in JavaScript
 *
 * If you do not pass the third parameter, the function will just return
 * the corresponding value from the M.str object. If the third parameter is
 * provided, the function performs {$a} placeholder substitution in the
 * same way as PHP get_string() in Moodle does.
 *
 * @param {String} identifier string identifier
 * @param {String} component the component providing the string
 * @param {Object|String} a optional variable to populate placeholder with
 */
M.util.get_string = function(identifier, component, a) {
    var stringvalue;

    if (M.cfg.developerdebug) {
        // creating new instance if YUI is not optimal but it seems to be better way then
        // require the instance via the function API - note that it is used in rare cases
        // for debugging only anyway
        // To ensure we don't kill browser performance if hundreds of get_string requests
        // are made we cache the instance we generate within the M.util namespace.
        // We don't publicly define the variable so that it doesn't get abused.
        if (typeof M.util.get_string_yui_instance === 'undefined') {
            M.util.get_string_yui_instance = new YUI({ debug : true });
        }
        var Y = M.util.get_string_yui_instance;
    }

    if (!M.str.hasOwnProperty(component) || !M.str[component].hasOwnProperty(identifier)) {
        stringvalue = '[[' + identifier + ',' + component + ']]';
        if (M.cfg.developerdebug) {
            console.log('undefined string ' + stringvalue, 'warn', 'M.util.get_string');
        }
        return stringvalue;
    }

    stringvalue = M.str[component][identifier];

    if (typeof a == 'undefined') {
        // no placeholder substitution requested
        return stringvalue;
    }

    if (typeof a == 'number' || typeof a == 'string') {
        // replace all occurrences of {$a} with the placeholder value
        stringvalue = stringvalue.replace(/\{\$a\}/g, a);
        return stringvalue;
    }

    if (typeof a == 'object') {
        // replace {$a->key} placeholders
        for (var key in a) {
            if (typeof a[key] != 'number' && typeof a[key] != 'string') {
                if (M.cfg.developerdebug) {
                    console.log('invalid value type for $a->' + key, 'warn', 'M.util.get_string');
                }
                continue;
            }
            var search = '{$a->' + key + '}';
            search = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            search = new RegExp(search, 'g');
            stringvalue = stringvalue.replace(search, a[key]);
        }
        return stringvalue;
    }

    if (M.cfg.developerdebug) {
        console.log('incorrect placeholder type', 'warn', 'M.util.get_string');
    }
    return stringvalue;
};

/**
 * Test function created to develop behat test.
 *
 * @method selectText
 * @param {String} id
 */
function RangySelectText (id, startquery, startoffset, endquery, endoffset) {
        var e = document.getElementById(id+'editable'),
            r = rangy.createRange();

        e.focus();
        if(startquery || startoffset || endquery || endoffset) {
            // Set defaults for testing.
            startoffset = startoffset?startoffset:0;
            endoffset = endoffset?endoffset:0;

            // Find the text nodes from the Start/end queries or default to the editor node.
            var startnode = startquery?e.querySelector(startquery): e.firstChild;
            var endnode = endquery?e.querySelector(endquery):e.firstChild;
            r.setStart(startnode.firstChild, startoffset);
            r.setEnd(endnode.firstChild, endoffset);
        }
        else {
            r.selectNodeContents(e.firstChild);
        }
        var s = rangy.getSelection();
        s.setSingleRange(r);
        YUI.M.editor_ousupsub.getEditor(id)._selections = [r];
}
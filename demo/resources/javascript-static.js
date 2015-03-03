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

/**
 * Translate YUI methods and constants to standard javascript or jQuery equivalents. 
 * While we discover how to translate YUI to standard JS and jQuery we are minimising the changes
 * to the existing ousupsub codebase. 
 * 
 * To do this we are creating an empty YUI Y object and adding the properties and methods that 
 * OUsupsub requires that need to be translated. This keeps the changes solely to this file simplifying 
 * the process of updating the plugin to the latest Moodle and ATTO standards.
 * 
 * So the code will act as though it is using YUI but in reality it use which every JS implementation
 * is appropriate.
 */
var YUI_ORIGINAL;
if (typeof YUI != 'undefined') {
    YUI_ORIGINAL = YUI;
}
var YUI = YUI || {};

/**
 * Various utility functions
 */
YUI.Env = YUI.Env || {};

/**
 *  YUI.Env.UA is often relied upon.
 */

YUI.Env.UA = YUI.Env.UA || {};

YUI.Env.UA.android = YUI.Env.UA.android || {};

/**
 *  Y.UA.ie is often relied upon.
 */
YUI.Env.UA.ie = jQuery.browser.msie ? parseFloat(jQuery.browser.version):0;

/**
 * Create an OU object to replace YUI and provide the Y object.
 */
    var OU = function() {
        var i = 0,
            Y = this,
            args = arguments,
            l = args.length,
            instanceOf = function(o, type) {
                return (o && o.hasOwnProperty && (o instanceof type));
            },
            gconf = (typeof YUI_config !== 'undefined') && YUI_config;
    
        if (!(instanceOf(Y, YUI))) {
            Y = new YUI();
        } else {
            // set up the core environment
            Y._init();
    
            /**
            Master configuration that might span multiple contexts in a non-
            browser environment. It is applied first to all instances in all
            contexts.
    
            @example
    
                YUI.GlobalConfig = {
                    filter: 'debug'
                };
    
                YUI().use('node', function (Y) {
                    // debug files used here
                });
    
                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });
    
            @property {Object} GlobalConfig
            @global
            @static
            **/
            if (YUI.GlobalConfig) {
                Y.applyConfig(YUI.GlobalConfig);
            }
    
            /**
            Page-level config applied to all YUI instances created on the
            current page. This is applied after `YUI.GlobalConfig` and before
            any instance-level configuration.
    
            @example
    
                // Single global var to include before YUI seed file
                YUI_config = {
                    filter: 'debug'
                };
    
                YUI().use('node', function (Y) {
                    // debug files used here
                });
    
                YUI({
                    filter: 'min'
                }).use('node', function (Y) {
                    // min files used here
                });
    
            @property {Object} YUI_config
            @global
            **/
            if (gconf) {
                Y.applyConfig(gconf);
            }
    
            // bind the specified additional modules for this instance
            if (!l) {
                Y._setup();
            }
        }
    
        if (l) {
            // Each instance can accept one or more configuration objects.
            // These are applied after YUI.GlobalConfig and YUI_Config,
            // overriding values set in those config files if there is a
            // matching property.
            for (; i < l; i++) {
                Y.applyConfig(args[i]);
            }
    
            Y._setup();
        }
    
        Y.instanceOf = instanceOf;
        
        Y.on = function (e) {
            console.log('on: getting element');
            return $(e);
        };
    
        return Y;
    };

//YUI.add = function (){console.log('new add'); //return YUI_ORIGINAL.add(arguments)
//}; //YUI.yuioriginal.add;



/**
 * Placeholder for core YUI object. Use empty object if YUI doesn't exist.
 */
//Y.YUI = YUI ? YUI() : {};

/**
 *  Over ride node create. YUI adds specific data that it relies on later.
 */
/*
Y.Node.create = function (s) {
    
}*/
/**
 *  Override node create Y.use.
 *  @param string m List of modules to use
 *  @param string f supplied function
 */
/*
Y.use = function () {
    var args = Array.prototype.slice.apply(arguments);
    console.log('use arguments = '+args);
    this.YUI.use(args);
}*/






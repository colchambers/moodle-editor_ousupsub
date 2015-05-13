/**
 * Simple javascript unit test script for the OUsupsup editor plugin
 */



var testcases = [
{input: "<sup>1<sup>2</sup>3</sup>", expected: "<sup>1</sup>2<sup>3</sup>"}, // Nested matching sup tag.
                 {input: "<sup id=\"yui12345\">1</sup>", expected: "<sup>1</sup>"},
                 {input: "&nbsp;", expected: " "},
                 {input: "<sup>1 </sup>2", expected: "<sup>1</sup> 2"}, // Space before end sup tag.
                 {input: "<sub>1 </sub>2", expected: "<sub>1</sub> 2"}, // Space before end sub tag.
                 {input: "<span><sup>12</sup></span>", expected: "<sup>12</sup>"},
                 {input: "<sup>12</sup><sup>34</sup>", expected: "<sup>1234</sup>"},
                 {input: "<sup>12</sup> <sup>34</sup>", expected: "<sup>12 34</sup>"}, // Space between matching tags.
                 {input: "<sub>12</sub> <sub>34</sub>", expected: "<sub>12 34</sub>"}, // Space between matching tags.
                 {input: "<sup>1<sup>2</sup>3</sup>", expected: "<sup>1</sup>2<sup>3</sup>"}, // Nested matching sup tag.
                 {input: "<sub>1<sub>2</sub>3</sub>", expected: "<sub>1</sub>2<sub>3</sub>"}, // Nested matching sub tag.
                 {input: "<sup><sup>12</sup></sup>", expected: "12"},
                 {input: "1<sup>2</sup>3<sup>4</sup>5", expected: "1<sup>2</sup>3<sup>4</sup>5"},
                 {input: "<sup><sub>12</sub></sup>", expected: "<sup>12</sup>"},
                 {input: "<p><sup><sub>12</sub></sup></p>", expected: "<sup>12</sup>"},
                 
                 {input: "1<span><sup>2</sup></span>3", expected: "1<sup>2</sup>3"}, // Add sup.
                 {input: "1<sup><sup>2</sup></sup>3", expected: "123"}, // Remove sup.
                 {input: "1<sub><sup>2</sup>3</sub>4<br>", expected: "1<sub>23</sub>4"}, // Keep sub.
                 {input: "1<sup>2</sup><sub><sup>3</sup>4</sub>5<br>", expected: "1<sup>2</sup><sub>34</sub>5"}, // Keep sub.

                 /* Check for disallowed characters */
                 {input: "<sup><p>12</p></sup>", expected: "<sup>12</sup>"},
                 {input: "<sup><b>12</b></sup>", expected: "<sup>12</sup>"},
                 {input: "<sup><i>12</i></sup>", expected: "<sup>12</sup>"},
                 {input: "<sup><u>12</u></sup>", expected: "<sup>12</sup>"},
                 {input: "<ol>1</ol>", expected: "1"},
                 {input: "<li>1</li>", expected: "1"},
                 {input: "<ul>1</ul>", expected: "1"},
                 {input: "1<br>", expected: "1"},
                 {input: "1<br />", expected: "1"}
                 
];

function init_ousupsub(id, params) {
    M.str = {"moodle":{"error":"Error","morehelp":"More help","changesmadereallygoaway":"You have made changes. Are you sure you want to navigate away and lose your changes?"},"ousupsub_subscript":{"pluginname":"Subscript"},"ousupsub_superscript":{"pluginname":"Superscript"},"editor_ousupsub":{"editor_command_keycode":"Cmd + {$a}","editor_control_keycode":"Ctrl + {$a}","plugin_title_shortcut":"{$a->title} [{$a->shortcut}]","plugin_title_shortcut":"{$a->title} [{$a->shortcut}]"},"error":{"serverconnection":"Error connecting to the server"}}
    plugins = [];
    if (params.superscript) {
        plugins[plugins,length] = {"name":"superscript","params":[]};
    }
    if (params.subscript) {
        plugins[plugins.length] = {"name":"subscript","params":[]};
    }
    
    var YUI_config = {base: "resources/yui/3.17.2/"}
    YUI().use("node", "moodle-editor_ousupsub-editor","moodle-ousupsub_subscript-button","moodle-ousupsub_superscript-button", 
            function(Y) {YUI.M.editor_ousupsub.createEditor(
            {"elementid":id,"content_css":"","contextid":0,"language":"en",
                "directionality":"ltr","plugins":[{"group":"style1","plugins":plugins}],"pageHash":""});
    });
};

// Initialise an editor to test with.
init_ousupsub("id_description_editor", {"subscript":true, "superscript":true});

function get_editor(id) {
    return YUI.M.editor_ousupsub.getEditor(id);
}

function escape_html(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
}

function run_tests(Y) {
    var editor = get_editor("id_description_editor");
    for(var i=0; i<testcases.length;i++) {
        run_test(editor, testcases[i]);
    }
}


function run_test(editor, test) {
    editor.editor.set('innerHTML', test.input);
    editor.plugins.subscript._applyTextCommand();
    test.actual = editor.editor.get('innerHTML'); 
    test.matched = test.expected == test.actual;
}

function update_display(Y) {
    // Update table.
    var table = Y.one('#results');
    for(var i=0; i<testcases.length;i++) {
        test = testcases[i];
        var rowText = '<tr>';
        rowText += '<td>'+escape_html(test.input)+'</td>';
        rowText += '<td>'+escape_html(test.expected)+'</td>';
        rowText += '<td>'+escape_html(test.actual)+'</td>';
        rowText += '<td class="'+(test.matched?'matched':'notmatched')+'">'+test.matched+'</td>';
        rowText += '</tr>';
        var row = Y.Node.create(rowText);
        table.appendChild(row);
    }
}

YUI().use("node", "moodle-editor_ousupsub-editor","moodle-ousupsub_subscript-button","moodle-ousupsub_superscript-button",
                function(Y) { 
    run_tests();
    update_display(Y);
});
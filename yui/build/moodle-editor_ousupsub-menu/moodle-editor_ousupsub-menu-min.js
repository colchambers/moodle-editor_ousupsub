YUI.add("moodle-editor_ousupsub-menu",function(e,t){var n='<div class="open {{config.buttonClass}} ousupsub_menu" style="min-width:{{config.innerOverlayWidth}};"><ul class="dropdown-menu">{{#each config.items}}<li role="presentation" class="ousupsub_menuentry"><a href="#" role="menuitem" data-index="{{@index}}" {{#each data}}data-{{@key}}="{{this}}"{{/each}}>{{{text}}}</a></li>{{/each}}</ul></div>';Menu=function(){Menu.superclass.constructor.apply(this,arguments)},e.extend(Menu,M.core.dialogue,{_menuHandlers:null,initializer:function(t){var r,i;this._menuHandlers=[];var s=e.Handlebars.compile(n),o=e.Node.create(s({config:t}));this.set("bodyContent",o),i=this.get("boundingBox"),i.addClass("editor_ousupsub_controlmenu"),i.addClass("editor_ousupsub_menu"),i.one(".moodle-dialogue-wrap").removeClass("moodle-dialogue-wrap").addClass("moodle-dialogue-content"),r=e.Node.create("<h3/>").addClass("accesshide").setHTML(this.get("headerText")),this.get("bodyContent").prepend(r),this.headerNode.hide(),this.footerNode.hide(),this._setupHandlers()},destructor:function(){(new e.EventHandle(this._menuHandlers)).detach()},_setupHandlers:function(){var e=this.get("contentBox");this._menuHandlers.push(e.delegate("key",this._chooseMenuItem,"32, enter",".ousupsub_menuentry",this),e.delegate("key",this._handleKeyboardEvent,"down:38,40",".dropdown-menu",this),e.on("focusoutside",this.hide,this),e.delegate("key",this.hide,"down:37,39,esc",".dropdown-menu",this))},_chooseMenuItem:function(e){e.target.simulate("click"),e.preventDefault()},hide:function(e){if(this.get("preventHideMenu")===!0)return;return e&&e.preventDefault(),Menu.superclass.hide.call(this,arguments)},_handleKeyboardEvent:function(e){e.preventDefault();var t=e.currentTarget.all('a[role="menuitem"]'),n=!1,r=0,i=1,s=0,o=e.target.ancestor('a[role="menuitem"]',!0);while(!n&&r<t.size())t.item(r)===o?n=!0:r++;if(!n)return;e.keyCode===38&&(i=-1);do r+=i,r<0?r=t.size()-1:r>=t.size()&&(r=0),next=t.item(r),s++;while(s<t.size()&&next!==o&&next.hasAttribute("hidden"));next&&next.focus(),e.preventDefault(),e.stopImmediatePropagation()}},{NAME:"menu",ATTRS:{headerText:{value:""}}}),e.Base.modifyAttrs(Menu,{width:{value:"auto"},hideOn:{value:[{eventName:"clickoutside"}]},extraClasses:{value:["editor_ousupsub_menu"]},responsive:{value:!1},visible:{value:!1},center:{value:!1},closeButton:{value:!1}}),e.namespace("M.editor_ousupsub").Menu=Menu},"@VERSION@",{requires:["moodle-core-notification-dialogue","node","event","event-custom"]});

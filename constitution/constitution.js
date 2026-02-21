/* turn.js 4.1.0 | Copyright (c) 2012 Emmanuel Garcia | turnjs.com | turnjs.com/license.txt */

(function(f){function I(a,b,c){if(!c[0]||"object"==typeof c[0])return b.init.apply(a,c);if(b[c[0]])return b[c[0]].apply(a,Array.prototype.slice.call(c,1));throw p(c[0]+" is not a method or property");}function l(a,b,c,d){return{css:{position:"absolute",top:a,left:b,overflow:d||"hidden",zIndex:c||"auto"}}}function R(a,b,c,d,e){var h=1-e,f=h*h*h,g=e*e*e;return j(Math.round(f*a.x+3*e*h*h*b.x+3*e*e*h*c.x+g*d.x),Math.round(f*a.y+3*e*h*h*b.y+3*e*e*h*c.y+g*d.y))}function j(a,b){return{x:a,y:b}}function E(a,
b,c){return y&&c?" translate3d("+a+"px,"+b+"px, 0px) ":" translate("+a+"px, "+b+"px) "}function F(a){return" rotate("+a+"deg) "}function n(a,b){return Object.prototype.hasOwnProperty.call(b,a)}function S(){for(var a=["Moz","Webkit","Khtml","O","ms"],b=a.length,c="";b--;)a[b]+"Transform"in document.body.style&&(c="-"+a[b].toLowerCase()+"-");return c}function O(a,b,c,d,e){var h,f=[];if("-webkit-"==v){for(h=0;h<e;h++)f.push("color-stop("+d[h][0]+", "+d[h][1]+")");a.css({"background-image":"-webkit-gradient(linear, "+
b.x+"% "+b.y+"%,"+c.x+"% "+c.y+"%, "+f.join(",")+" )"})}else{var b={x:b.x/100*a.width(),y:b.y/100*a.height()},c={x:c.x/100*a.width(),y:c.y/100*a.height()},g=c.x-b.x;h=c.y-b.y;var i=Math.atan2(h,g),w=i-Math.PI/2,w=Math.abs(a.width()*Math.sin(w))+Math.abs(a.height()*Math.cos(w)),g=Math.sqrt(h*h+g*g),c=j(c.x<b.x?a.width():0,c.y<b.y?a.height():0),k=Math.tan(i);h=-1/k;k=(h*c.x-c.y-k*b.x+b.y)/(h-k);c=h*k-h*c.x+c.y;b=Math.sqrt(Math.pow(k-b.x,2)+Math.pow(c-b.y,2));for(h=0;h<e;h++)f.push(" "+d[h][1]+" "+100*
(b+g*d[h][0])/w+"%");a.css({"background-image":v+"linear-gradient("+-i+"rad,"+f.join(",")+")"})}}function s(a,b,c){a=f.Event(a);b.trigger(a,c);return a.isDefaultPrevented()?"prevented":a.isPropagationStopped()?"stopped":""}function p(a){function b(a){this.name="TurnJsError";this.message=a}b.prototype=Error();b.prototype.constructor=b;return new b(a)}function C(a){var b={top:0,left:0};do b.left+=a.offsetLeft,b.top+=a.offsetTop;while(a=a.offsetParent);return b}var y,T,v="",J=Math.PI,K=J/2,t="ontouchstart"in
window,q=t?{down:"touchstart",move:"touchmove",up:"touchend",over:"touchstart",out:"touchend"}:{down:"mousedown",move:"mousemove",up:"mouseup",over:"mouseover",out:"mouseout"},o={backward:["bl","tl"],forward:["br","tr"],all:"tl bl tr br l r".split(" ")},U=["single","double"],V=["ltr","rtl"],W={acceleration:!0,display:"double",duration:600,page:1,gradients:!0,turnCorners:"bl,br",when:null},X={cornerSize:100},g={init:function(a){y="WebKitCSSMatrix"in window||"MozPerspective"in document.body.style;var b;
T=(b=/AppleWebkit\/([0-9\.]+)/i.exec(navigator.userAgent))?534.3<parseFloat(b[1]):!0;v=S();var c;b=0;var d=this.data(),e=this.children(),a=f.extend({width:this.width(),height:this.height(),direction:this.attr("dir")||this.css("direction")||"ltr"},W,a);d.opts=a;d.pageObjs={};d.pages={};d.pageWrap={};d.pageZoom={};d.pagePlace={};d.pageMv=[];d.zoom=1;d.totalPages=a.pages||0;d.eventHandlers={touchStart:f.proxy(g._touchStart,this),touchMove:f.proxy(g._touchMove,this),touchEnd:f.proxy(g._touchEnd,this),
start:f.proxy(g._eventStart,this)};if(a.when)for(c in a.when)n(c,a.when)&&this.bind(c,a.when[c]);this.css({position:"relative",width:a.width,height:a.height});this.turn("display",a.display);""!==a.direction&&this.turn("direction",a.direction);y&&(!t&&a.acceleration)&&this.transform(E(0,0,!0));for(c=0;c<e.length;c++)"1"!=f(e[c]).attr("ignore")&&this.turn("addPage",e[c],++b);f(this).bind(q.down,d.eventHandlers.touchStart).bind("end",g._eventEnd).bind("pressed",g._eventPressed).bind("released",g._eventReleased).bind("flip",
g._flip);f(this).parent().bind("start",d.eventHandlers.start);f(document).bind(q.move,d.eventHandlers.touchMove).bind(q.up,d.eventHandlers.touchEnd);this.turn("page",a.page);d.done=!0;return this},addPage:function(a,b){var c,d=!1,e=this.data(),h=e.totalPages+1;if(e.destroying)return!1;if(c=/\bp([0-9]+)\b/.exec(f(a).attr("class")))b=parseInt(c[1],10);if(b)if(b==h)d=!0;else{if(b>h)throw p('Page "'+b+'" cannot be inserted');}else b=h,d=!0;1<=b&&b<=h&&(c="double"==e.display?b%2?" odd":" even":"",e.done&&
this.turn("stop"),b in e.pageObjs&&g._movePages.call(this,b,1),d&&(e.totalPages=h),e.pageObjs[b]=f(a).css({"float":"left"}).addClass("page p"+b+c),-1!=navigator.userAgent.indexOf("MSIE 9.0")&&e.pageObjs[b].hasClass("hard")&&e.pageObjs[b].removeClass("hard"),g._addPage.call(this,b),g._removeFromDOM.call(this));return this},_addPage:function(a){var b=this.data(),c=b.pageObjs[a];if(c)if(g._necessPage.call(this,a)){if(!b.pageWrap[a]){b.pageWrap[a]=f("<div/>",{"class":"page-wrapper",page:a,css:{position:"absolute",
overflow:"hidden"}});this.append(b.pageWrap[a]);b.pagePlace[a]||(b.pagePlace[a]=a,b.pageObjs[a].appendTo(b.pageWrap[a]));var d=g._pageSize.call(this,a,!0);c.css({width:d.width,height:d.height});b.pageWrap[a].css(d)}b.pagePlace[a]==a&&g._makeFlip.call(this,a)}else b.pagePlace[a]=0,b.pageObjs[a]&&b.pageObjs[a].remove()},hasPage:function(a){return n(a,this.data().pageObjs)},center:function(a){var b=this.data(),c=f(this).turn("size"),d=0;b.noCenter||("double"==b.display&&(a=this.turn("view",a||b.tpage||
b.page),"ltr"==b.direction?a[0]?a[1]||(d+=c.width/4):d-=c.width/4:a[0]?a[1]||(d-=c.width/4):d+=c.width/4),f(this).css({marginLeft:d}));return this},destroy:function(){var a=this,b=this.data(),c="end first flip last pressed released start turning turned zooming missing".split(" ");if("prevented"!=s("destroying",this)){b.destroying=!0;f.each(c,function(b,c){a.unbind(c)});this.parent().unbind("start",b.eventHandlers.start);for(f(document).unbind(q.move,b.eventHandlers.touchMove).unbind(q.up,b.eventHandlers.touchEnd);0!==
b.totalPages;)this.turn("removePage",b.totalPages);b.fparent&&b.fparent.remove();b.shadow&&b.shadow.remove();this.removeData();b=null;return this}},is:function(){return"object"==typeof this.data().pages},zoom:function(a){var b=this.data();if("number"==typeof a){if(0.0010>a||100<a)throw p(a+" is not a value for zoom");if("prevented"==s("zooming",this,[a,b.zoom]))return this;var c=this.turn("size"),d=this.turn("view"),e=1/b.zoom,h=Math.round(c.width*e*a),c=Math.round(c.height*e*a);b.zoom=a;f(this).turn("stop").turn("size",
h,c);b.opts.autoCenter&&this.turn("center");g._updateShadow.call(this);for(a=0;a<d.length;a++)d[a]&&b.pageZoom[d[a]]!=b.zoom&&(this.trigger("zoomed",[d[a],d,b.pageZoom[d[a]],b.zoom]),b.pageZoom[d[a]]=b.zoom);return this}return b.zoom},_pageSize:function(a,b){var c=this.data(),d={};if("single"==c.display)d.width=this.width(),d.height=this.height(),b&&(d.top=0,d.left=0,d.right="auto");else{var e=this.width()/2,h=this.height();c.pageObjs[a].hasClass("own-size")?(d.width=c.pageObjs[a].width(),d.height=
c.pageObjs[a].height()):(d.width=e,d.height=h);if(b){var f=a%2;d.top=(h-d.height)/2;"ltr"==c.direction?(d[f?"right":"left"]=e-d.width,d[f?"left":"right"]="auto"):(d[f?"left":"right"]=e-d.width,d[f?"right":"left"]="auto")}}return d},_makeFlip:function(a){var b=this.data();if(!b.pages[a]&&b.pagePlace[a]==a){var c="single"==b.display,d=a%2;b.pages[a]=b.pageObjs[a].css(g._pageSize.call(this,a)).flip({page:a,next:d||c?a+1:a-1,turn:this}).flip("disable",b.disabled);g._setPageLoc.call(this,a);b.pageZoom[a]=
b.zoom}return b.pages[a]},_makeRange:function(){var a,b;if(!(1>this.data().totalPages)){b=this.turn("range");for(a=b[0];a<=b[1];a++)g._addPage.call(this,a)}},range:function(a){var b,c,d,e=this.data(),a=a||e.tpage||e.page||1;d=g._view.call(this,a);if(1>a||a>e.totalPages)throw p('"'+a+'" is not a valid page');d[1]=d[1]||d[0];1<=d[0]&&d[1]<=e.totalPages?(a=Math.floor(2),e.totalPages-d[1]>d[0]?(b=Math.min(d[0]-1,a),c=2*a-b):(c=Math.min(e.totalPages-d[1],a),b=2*a-c)):c=b=5;return[Math.max(1,d[0]-b),Math.min(e.totalPages,
d[1]+c)]},_necessPage:function(a){if(0===a)return!0;var b=this.turn("range");return this.data().pageObjs[a].hasClass("fixed")||a>=b[0]&&a<=b[1]},_removeFromDOM:function(){var a,b=this.data();for(a in b.pageWrap)n(a,b.pageWrap)&&!g._necessPage.call(this,a)&&g._removePageFromDOM.call(this,a)},_removePageFromDOM:function(a){var b=this.data();if(b.pages[a]){var c=b.pages[a].data();i._moveFoldingPage.call(b.pages[a],!1);c.f&&c.f.fwrapper&&c.f.fwrapper.remove();b.pages[a].removeData();b.pages[a].remove();
delete b.pages[a]}b.pageObjs[a]&&b.pageObjs[a].remove();b.pageWrap[a]&&(b.pageWrap[a].remove(),delete b.pageWrap[a]);g._removeMv.call(this,a);delete b.pagePlace[a];delete b.pageZoom[a]},removePage:function(a){var b=this.data();if("*"==a)for(;0!==b.totalPages;)this.turn("removePage",b.totalPages);else{if(1>a||a>b.totalPages)throw p("The page "+a+" doesn't exist");b.pageObjs[a]&&(this.turn("stop"),g._removePageFromDOM.call(this,a),delete b.pageObjs[a]);g._movePages.call(this,a,-1);b.totalPages-=1;b.page>
b.totalPages?(b.page=null,g._fitPage.call(this,b.totalPages)):(g._makeRange.call(this),this.turn("update"))}return this},_movePages:function(a,b){var c,d=this,e=this.data(),h="single"==e.display,f=function(a){var c=a+b,f=c%2,i=f?" odd ":" even ";e.pageObjs[a]&&(e.pageObjs[c]=e.pageObjs[a].removeClass("p"+a+" odd even").addClass("p"+c+i));e.pagePlace[a]&&e.pageWrap[a]&&(e.pagePlace[c]=c,e.pageWrap[c]=e.pageObjs[c].hasClass("fixed")?e.pageWrap[a].attr("page",c):e.pageWrap[a].css(g._pageSize.call(d,
c,!0)).attr("page",c),e.pages[a]&&(e.pages[c]=e.pages[a].flip("options",{page:c,next:h||f?c+1:c-1})),b&&(delete e.pages[a],delete e.pagePlace[a],delete e.pageZoom[a],delete e.pageObjs[a],delete e.pageWrap[a]))};if(0<b)for(c=e.totalPages;c>=a;c--)f(c);else for(c=a;c<=e.totalPages;c++)f(c)},display:function(a){var b=this.data(),c=b.display;if(void 0===a)return c;if(-1==f.inArray(a,U))throw p('"'+a+'" is not a value for display');switch(a){case "single":b.pageObjs[0]||(this.turn("stop").css({overflow:"hidden"}),
b.pageObjs[0]=f("<div />",{"class":"page p-temporal"}).css({width:this.width(),height:this.height()}).appendTo(this));this.addClass("shadow");break;case "double":b.pageObjs[0]&&(this.turn("stop").css({overflow:""}),b.pageObjs[0].remove(),delete b.pageObjs[0]),this.removeClass("shadow")}b.display=a;c&&(a=this.turn("size"),g._movePages.call(this,1,0),this.turn("size",a.width,a.height).turn("update"));return this},direction:function(a){var b=this.data();if(void 0===a)return b.direction;a=a.toLowerCase();
if(-1==f.inArray(a,V))throw p('"'+a+'" is not a value for direction');"rtl"==a&&f(this).attr("dir","ltr").css({direction:"ltr"});b.direction=a;b.done&&this.turn("size",f(this).width(),f(this).height());return this},animating:function(){return 0<this.data().pageMv.length},corner:function(){var a,b,c=this.data();for(b in c.pages)if(n(b,c.pages)&&(a=c.pages[b].flip("corner")))return a;return!1},data:function(){return this.data()},disable:function(a){var b,c=this.data(),d=this.turn("view");c.disabled=
void 0===a||!0===a;for(b in c.pages)n(b,c.pages)&&c.pages[b].flip("disable",c.disabled?!0:-1==f.inArray(parseInt(b,10),d));return this},disabled:function(a){return void 0===a?!0===this.data().disabled:this.turn("disable",a)},size:function(a,b){if(void 0===a||void 0===b)return{width:this.width(),height:this.height()};this.turn("stop");var c,d,e=this.data();d="double"==e.display?a/2:a;this.css({width:a,height:b});e.pageObjs[0]&&e.pageObjs[0].css({width:d,height:b});for(c in e.pageWrap)n(c,e.pageWrap)&&
(d=g._pageSize.call(this,c,!0),e.pageObjs[c].css({width:d.width,height:d.height}),e.pageWrap[c].css(d),e.pages[c]&&e.pages[c].css({width:d.width,height:d.height}));this.turn("resize");return this},resize:function(){var a,b=this.data();b.pages[0]&&(b.pageWrap[0].css({left:-this.width()}),b.pages[0].flip("resize",!0));for(a=1;a<=b.totalPages;a++)b.pages[a]&&b.pages[a].flip("resize",!0);g._updateShadow.call(this);b.opts.autoCenter&&this.turn("center")},_removeMv:function(a){var b,c=this.data();for(b=
0;b<c.pageMv.length;b++)if(c.pageMv[b]==a)return c.pageMv.splice(b,1),!0;return!1},_addMv:function(a){var b=this.data();g._removeMv.call(this,a);b.pageMv.push(a)},_view:function(a){var b=this.data(),a=a||b.page;return"double"==b.display?a%2?[a-1,a]:[a,a+1]:[a]},view:function(a){var b=this.data(),a=g._view.call(this,a);return"double"==b.display?[0<a[0]?a[0]:0,a[1]<=b.totalPages?a[1]:0]:[0<a[0]&&a[0]<=b.totalPages?a[0]:0]},stop:function(a,b){if(this.turn("animating")){var c,d,e,h=this.data();h.tpage&&
(h.page=h.tpage,delete h.tpage);for(c=0;c<h.pageMv.length;c++)h.pageMv[c]&&h.pageMv[c]!==a&&(e=h.pages[h.pageMv[c]],d=e.data().f.opts,e.flip("hideFoldedPage",b),b||i._moveFoldingPage.call(e,!1),d.force&&(d.next=0===d.page%2?d.page-1:d.page+1,delete d.force))}this.turn("update");return this},pages:function(a){var b=this.data();if(a){if(a<b.totalPages)for(var c=b.totalPages;c>a;c--)this.turn("removePage",c);b.totalPages=a;g._fitPage.call(this,b.page);return this}return b.totalPages},_missing:function(a){var b=
this.data();if(!(1>b.totalPages)){for(var c=this.turn("range",a),d=[],a=c[0];a<=c[1];a++)b.pageObjs[a]||d.push(a);0<d.length&&this.trigger("missing",[d])}},_fitPage:function(a){var b=this.data(),c=this.turn("view",a);g._missing.call(this,a);if(b.pageObjs[a]){b.page=a;this.turn("stop");for(var d=0;d<c.length;d++)c[d]&&b.pageZoom[c[d]]!=b.zoom&&(this.trigger("zoomed",[c[d],c,b.pageZoom[c[d]],b.zoom]),b.pageZoom[c[d]]=b.zoom);g._removeFromDOM.call(this);g._makeRange.call(this);g._updateShadow.call(this);
this.trigger("turned",[a,c]);this.turn("update");b.opts.autoCenter&&this.turn("center")}},_turnPage:function(a){var b,c,d=this.data(),e=d.pagePlace[a],h=this.turn("view"),i=this.turn("view",a);if(d.page!=a){var j=d.page;if("prevented"==s("turning",this,[a,i])){j==d.page&&-1!=f.inArray(e,d.pageMv)&&d.pages[e].flip("hideFoldedPage",!0);return}-1!=f.inArray(1,i)&&this.trigger("first");-1!=f.inArray(d.totalPages,i)&&this.trigger("last")}"single"==d.display?(b=h[0],c=i[0]):h[1]&&a>h[1]?(b=h[1],c=i[0]):
h[0]&&a<h[0]&&(b=h[0],c=i[1]);e=d.opts.turnCorners.split(",");h=d.pages[b].data().f;i=h.opts;j=h.point;g._missing.call(this,a);d.pageObjs[a]&&(this.turn("stop"),d.page=a,g._makeRange.call(this),d.tpage=c,i.next!=c&&(i.next=c,i.force=!0),this.turn("update"),h.point=j,"hard"==h.effect?"ltr"==d.direction?d.pages[b].flip("turnPage",a>b?"r":"l"):d.pages[b].flip("turnPage",a>b?"l":"r"):"ltr"==d.direction?d.pages[b].flip("turnPage",e[a>b?1:0]):d.pages[b].flip("turnPage",e[a>b?0:1]))},page:function(a){var b=
this.data();if(void 0===a)return b.page;if(!b.disabled&&!b.destroying){a=parseInt(a,10);if(0<a&&a<=b.totalPages)return a!=b.page&&(!b.done||-1!=f.inArray(a,this.turn("view"))?g._fitPage.call(this,a):g._turnPage.call(this,a)),this;throw p("The page "+a+" does not exist");}},next:function(){return this.turn("page",Math.min(this.data().totalPages,g._view.call(this,this.data().page).pop()+1))},previous:function(){return this.turn("page",Math.max(1,g._view.call(this,this.data().page).shift()-1))},peel:function(a,
b){var c=this.data(),d=this.turn("view"),b=void 0===b?!0:!0===b;!1===a?this.turn("stop",null,b):"single"==c.display?c.pages[c.page].flip("peel",a,b):(d="ltr"==c.direction?-1!=a.indexOf("l")?d[0]:d[1]:-1!=a.indexOf("l")?d[1]:d[0],c.pages[d]&&c.pages[d].flip("peel",a,b));return this},_addMotionPage:function(){var a=f(this).data().f.opts,b=a.turn;b.data();g._addMv.call(b,a.page)},_eventStart:function(a,b,c){var d=b.turn.data(),e=d.pageZoom[b.page];a.isDefaultPrevented()||(e&&e!=d.zoom&&(b.turn.trigger("zoomed",
[b.page,b.turn.turn("view",b.page),e,d.zoom]),d.pageZoom[b.page]=d.zoom),"single"==d.display&&c&&("l"==c.charAt(1)&&"ltr"==d.direction||"r"==c.charAt(1)&&"rtl"==d.direction?(b.next=b.next<b.page?b.next:b.page-1,b.force=!0):b.next=b.next>b.page?b.next:b.page+1),g._addMotionPage.call(a.target));g._updateShadow.call(b.turn)},_eventEnd:function(a,b,c){f(a.target).data();var a=b.turn,d=a.data();if(c){if(c=d.tpage||d.page,c==b.next||c==b.page)delete d.tpage,g._fitPage.call(a,c||b.next,!0)}else g._removeMv.call(a,
b.page),g._updateShadow.call(a),a.turn("update")},_eventPressed:function(a){var a=f(a.target).data().f,b=a.opts.turn;b.data().mouseAction=!0;b.turn("update");return a.time=(new Date).getTime()},_eventReleased:function(a,b){var c;c=f(a.target);var d=c.data().f,e=d.opts.turn,h=e.data();c="single"==h.display?"br"==b.corner||"tr"==b.corner?b.x<c.width()/2:b.x>c.width()/2:0>b.x||b.x>c.width();if(200>(new Date).getTime()-d.time||c)a.preventDefault(),g._turnPage.call(e,d.opts.next);h.mouseAction=!1},_flip:function(a){a.stopPropagation();
a=f(a.target).data().f.opts;a.turn.trigger("turn",[a.next]);a.turn.data().opts.autoCenter&&a.turn.turn("center",a.next)},_touchStart:function(){var a=this.data(),b;for(b in a.pages)if(n(b,a.pages)&&!1===i._eventStart.apply(a.pages[b],arguments))return!1},_touchMove:function(){var a=this.data(),b;for(b in a.pages)n(b,a.pages)&&i._eventMove.apply(a.pages[b],arguments)},_touchEnd:function(){var a=this.data(),b;for(b in a.pages)n(b,a.pages)&&i._eventEnd.apply(a.pages[b],arguments)},calculateZ:function(a){var b,
c,d,e,h=this,f=this.data();b=this.turn("view");var i=b[0]||b[1],g=a.length-1,j={pageZ:{},partZ:{},pageV:{}},k=function(a){a=h.turn("view",a);a[0]&&(j.pageV[a[0]]=!0);a[1]&&(j.pageV[a[1]]=!0)};for(b=0;b<=g;b++)c=a[b],d=f.pages[c].data().f.opts.next,e=f.pagePlace[c],k(c),k(d),c=f.pagePlace[d]==d?d:c,j.pageZ[c]=f.totalPages-Math.abs(i-c),j.partZ[e]=2*f.totalPages-g+b;return j},update:function(){var a,b=this.data();if(this.turn("animating")&&0!==b.pageMv[0]){var c,d=this.turn("calculateZ",b.pageMv),e=
this.turn("corner"),h=this.turn("view"),i=this.turn("view",b.tpage);for(a in b.pageWrap)if(n(a,b.pageWrap)&&(c=b.pageObjs[a].hasClass("fixed"),b.pageWrap[a].css({display:d.pageV[a]||c?"":"none",zIndex:(b.pageObjs[a].hasClass("hard")?d.partZ[a]:d.pageZ[a])||(c?-1:0)}),c=b.pages[a]))c.flip("z",d.partZ[a]||null),d.pageV[a]&&c.flip("resize"),b.tpage?c.flip("hover",!1).flip("disable",-1==f.inArray(parseInt(a,10),b.pageMv)&&a!=i[0]&&a!=i[1]):c.flip("hover",!1===e).flip("disable",a!=h[0]&&a!=h[1])}else for(a in b.pageWrap)n(a,
b.pageWrap)&&(d=g._setPageLoc.call(this,a),b.pages[a]&&b.pages[a].flip("disable",b.disabled||1!=d).flip("hover",!0).flip("z",null));return this},_updateShadow:function(){var a,b,c=this.data(),d=this.width(),e=this.height(),h="single"==c.display?d:d/2;a=this.turn("view");c.shadow||(c.shadow=f("<div />",{"class":"shadow",css:l(0,0,0).css}).appendTo(this));for(var i=0;i<c.pageMv.length&&a[0]&&a[1];i++)a=this.turn("view",c.pages[c.pageMv[i]].data().f.opts.next),b=this.turn("view",c.pageMv[i]),a[0]=a[0]&&
b[0],a[1]=a[1]&&b[1];switch(a[0]?a[1]?3:"ltr"==c.direction?2:1:"ltr"==c.direction?1:2){case 1:c.shadow.css({width:h,height:e,top:0,left:h});break;case 2:c.shadow.css({width:h,height:e,top:0,left:0});break;case 3:c.shadow.css({width:d,height:e,top:0,left:0})}},_setPageLoc:function(a){var b=this.data(),c=this.turn("view"),d=0;if(a==c[0]||a==c[1])d=1;else if("single"==b.display&&a==c[0]+1||"double"==b.display&&a==c[0]-2||a==c[1]+2)d=2;if(!this.turn("animating"))switch(d){case 1:b.pageWrap[a].css({zIndex:b.totalPages,
display:""});break;case 2:b.pageWrap[a].css({zIndex:b.totalPages-1,display:""});break;case 0:b.pageWrap[a].css({zIndex:0,display:b.pageObjs[a].hasClass("fixed")?"":"none"})}return d},options:function(a){if(void 0===a)return this.data().opts;var b=this.data();f.extend(b.opts,a);a.pages&&this.turn("pages",a.pages);a.page&&this.turn("page",a.page);a.display&&this.turn("display",a.display);a.direction&&this.turn("direction",a.direction);a.width&&a.height&&this.turn("size",a.width,a.height);if(a.when)for(var c in a.when)n(c,
a.when)&&this.unbind(c).bind(c,a.when[c]);return this},version:function(){return"4.1.0"}},i={init:function(a){this.data({f:{disabled:!1,hover:!1,effect:this.hasClass("hard")?"hard":"sheet"}});this.flip("options",a);i._addPageWrapper.call(this);return this},setData:function(a){var b=this.data();b.f=f.extend(b.f,a);return this},options:function(a){var b=this.data().f;return a?(i.setData.call(this,{opts:f.extend({},b.opts||X,a)}),this):b.opts},z:function(a){var b=this.data().f;b.opts["z-index"]=a;b.fwrapper&&
b.fwrapper.css({zIndex:a||parseInt(b.parent.css("z-index"),10)||0});return this},_cAllowed:function(){var a=this.data().f,b=a.opts.page,c=a.opts.turn.data(),d=b%2;return"hard"==a.effect?"ltr"==c.direction?[d?"r":"l"]:[d?"l":"r"]:"single"==c.display?1==b?"ltr"==c.direction?o.forward:o.backward:b==c.totalPages?"ltr"==c.direction?o.backward:o.forward:o.all:"ltr"==c.direction?o[d?"forward":"backward"]:o[d?"backward":"forward"]},_cornerActivated:function(a){var b=this.data().f,c=this.width(),d=this.height(),
a={x:a.x,y:a.y,corner:""},e=b.opts.cornerSize;if(0>=a.x||0>=a.y||a.x>=c||a.y>=d)return!1;var h=i._cAllowed.call(this);switch(b.effect){case "hard":if(a.x>c-e)a.corner="r";else if(a.x<e)a.corner="l";else return!1;break;case "sheet":if(a.y<e)a.corner+="t";else if(a.y>=d-e)a.corner+="b";else return!1;if(a.x<=e)a.corner+="l";else if(a.x>=c-e)a.corner+="r";else return!1}return!a.corner||-1==f.inArray(a.corner,h)?!1:a},_isIArea:function(a){var b=this.data().f.parent.offset(),a=t&&a.originalEvent?a.originalEvent.touches[0]:
a;return i._cornerActivated.call(this,{x:a.pageX-b.left,y:a.pageY-b.top})},_c:function(a,b){b=b||0;switch(a){case "tl":return j(b,b);case "tr":return j(this.width()-b,b);case "bl":return j(b,this.height()-b);case "br":return j(this.width()-b,this.height()-b);case "l":return j(b,0);case "r":return j(this.width()-b,0)}},_c2:function(a){switch(a){case "tl":return j(2*this.width(),0);case "tr":return j(-this.width(),0);case "bl":return j(2*this.width(),this.height());case "br":return j(-this.width(),
this.height());case "l":return j(2*this.width(),0);case "r":return j(-this.width(),0)}},_foldingPage:function(){var a=this.data().f;if(a){var b=a.opts;if(b.turn)return a=b.turn.data(),"single"==a.display?1<b.next||1<b.page?a.pageObjs[0]:null:a.pageObjs[b.next]}},_backGradient:function(){var a=this.data().f,b=a.opts.turn.data();if((b=b.opts.gradients&&("single"==b.display||2!=a.opts.page&&a.opts.page!=b.totalPages-1))&&!a.bshadow)a.bshadow=f("<div/>",l(0,0,1)).css({position:"",width:this.width(),height:this.height()}).appendTo(a.parent);
return b},type:function(){return this.data().f.effect},resize:function(a){var b=this.data().f,c=b.opts.turn.data(),d=this.width(),e=this.height();switch(b.effect){case "hard":a&&(b.wrapper.css({width:d,height:e}),b.fpage.css({width:d,height:e}),c.opts.gradients&&(b.ashadow.css({width:d,height:e}),b.bshadow.css({width:d,height:e})));break;case "sheet":a&&(a=Math.round(Math.sqrt(Math.pow(d,2)+Math.pow(e,2))),b.wrapper.css({width:a,height:a}),b.fwrapper.css({width:a,height:a}).children(":first-child").css({width:d,
height:e}),b.fpage.css({width:d,height:e}),c.opts.gradients&&b.ashadow.css({width:d,height:e}),i._backGradient.call(this)&&b.bshadow.css({width:d,height:e})),b.parent.is(":visible")&&(c=C(b.parent[0]),b.fwrapper.css({top:c.top,left:c.left}),c=C(b.opts.turn[0]),b.fparent.css({top:-c.top,left:-c.left})),this.flip("z",b.opts["z-index"])}},_addPageWrapper:function(){var a=this.data().f,b=a.opts.turn.data(),c=this.parent();a.parent=c;if(!a.wrapper)switch(a.effect){case "hard":var d={};d[v+"transform-style"]=
"preserve-3d";d[v+"backface-visibility"]="hidden";a.wrapper=f("<div/>",l(0,0,2)).css(d).appendTo(c).prepend(this);a.fpage=f("<div/>",l(0,0,1)).css(d).appendTo(c);b.opts.gradients&&(a.ashadow=f("<div/>",l(0,0,0)).hide().appendTo(c),a.bshadow=f("<div/>",l(0,0,0)));break;case "sheet":var d=this.width(),e=this.height();Math.round(Math.sqrt(Math.pow(d,2)+Math.pow(e,2)));a.fparent=a.opts.turn.data().fparent;a.fparent||(d=f("<div/>",{css:{"pointer-events":"none"}}).hide(),d.data().flips=0,d.css(l(0,0,"auto",
"visible").css).appendTo(a.opts.turn),a.opts.turn.data().fparent=d,a.fparent=d);this.css({position:"absolute",top:0,left:0,bottom:"auto",right:"auto"});a.wrapper=f("<div/>",l(0,0,this.css("z-index"))).appendTo(c).prepend(this);a.fwrapper=f("<div/>",l(c.offset().top,c.offset().left)).hide().appendTo(a.fparent);a.fpage=f("<div/>",l(0,0,0,"visible")).css({cursor:"default"}).appendTo(a.fwrapper);b.opts.gradients&&(a.ashadow=f("<div/>",l(0,0,1)).appendTo(a.fpage));i.setData.call(this,a)}i.resize.call(this,
!0)},_fold:function(a){var b=this.data().f,c=b.opts.turn.data(),d=i._c.call(this,a.corner),e=this.width(),h=this.height();switch(b.effect){case "hard":a.x="l"==a.corner?Math.min(Math.max(a.x,0),2*e):Math.max(Math.min(a.x,e),-e);var f,g,r,w,k,n=c.totalPages,l=b.opts["z-index"]||n,p={overflow:"visible"},o=d.x?(d.x-a.x)/e:a.x/e,q=90*o,s=90>q;switch(a.corner){case "l":w="0% 50%";k="100% 50%";s?(f=0,g=0<b.opts.next-1,r=1):(f="100%",g=b.opts.page+1<n,r=0);break;case "r":w="100% 50%",k="0% 50%",q=-q,e=-e,
s?(f=0,g=b.opts.next+1<n,r=0):(f="-100%",g=1!=b.opts.page,r=1)}p[v+"perspective-origin"]=k;b.wrapper.transform("rotateY("+q+"deg)translate3d(0px, 0px, "+(this.attr("depth")||0)+"px)",k);b.fpage.transform("translateX("+e+"px) rotateY("+(180+q)+"deg)",w);b.parent.css(p);s?(o=-o+1,b.wrapper.css({zIndex:l+1}),b.fpage.css({zIndex:l})):(o-=1,b.wrapper.css({zIndex:l}),b.fpage.css({zIndex:l+1}));c.opts.gradients&&(g?b.ashadow.css({display:"",left:f,backgroundColor:"rgba(0,0,0,"+0.5*o+")"}).transform("rotateY(0deg)"):
b.ashadow.hide(),b.bshadow.css({opacity:-o+1}),s?b.bshadow.parent()[0]!=b.wrapper[0]&&b.bshadow.appendTo(b.wrapper):b.bshadow.parent()[0]!=b.fpage[0]&&b.bshadow.appendTo(b.fpage),O(b.bshadow,j(100*r,0),j(100*(-r+1),0),[[0,"rgba(0,0,0,0.3)"],[1,"rgba(0,0,0,0)"]],2));break;case "sheet":var t=this,G=0,y,z,A,L,x,M,C,u=j(0,0),P=j(0,0),m=j(0,0),I=i._foldingPage.call(this);Math.tan(0);var N=c.opts.acceleration,Q=b.wrapper.height(),D="t"==a.corner.substr(0,1),B="l"==a.corner.substr(1,1),H=function(){var b=
j(0,0),f=j(0,0);b.x=d.x?d.x-a.x:a.x;b.y=T?d.y?d.y-a.y:a.y:0;f.x=B?e-b.x/2:a.x+b.x/2;f.y=b.y/2;var g=K-Math.atan2(b.y,b.x),k=g-Math.atan2(f.y,f.x),k=Math.max(0,Math.sin(k)*Math.sqrt(Math.pow(f.x,2)+Math.pow(f.y,2)));G=180*(g/J);m=j(k*Math.sin(g),k*Math.cos(g));if(g>K&&(m.x+=Math.abs(m.y*b.y/b.x),m.y=0,Math.round(m.x*Math.tan(J-g))<h))return a.y=Math.sqrt(Math.pow(h,2)+2*f.x*b.x),D&&(a.y=h-a.y),H();if(g>K&&(b=J-g,f=Q-h/Math.sin(b),u=j(Math.round(f*Math.cos(b)),Math.round(f*Math.sin(b))),B&&(u.x=-u.x),
D))u.y=-u.y;y=Math.round(m.y/Math.tan(g)+m.x);b=e-y;f=b*Math.cos(2*g);k=b*Math.sin(2*g);P=j(Math.round(B?b-f:y+f),Math.round(D?k:h-k));if(c.opts.gradients&&(x=b*Math.sin(g),b=i._c2.call(t,a.corner),b=Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2))/e,C=Math.sin(K*(1<b?2-b:b)),M=Math.min(b,1),L=100<x?(x-100)/x:0,z=j(100*(x*Math.sin(g)/e),100*(x*Math.cos(g)/h)),i._backGradient.call(t)&&(A=j(100*(1.2*x*Math.sin(g)/e),100*(1.2*x*Math.cos(g)/h)),B||(A.x=100-A.x),!D)))A.y=100-A.y;m.x=Math.round(m.x);
m.y=Math.round(m.y);return!0};f=function(a,d,f,g){var k=["0","auto"],m=(e-Q)*f[0]/100,l=(h-Q)*f[1]/100,d={left:k[d[0]],top:k[d[1]],right:k[d[2]],bottom:k[d[3]]},k={},n=90!=g&&-90!=g?B?-1:1:0,r=f[0]+"% "+f[1]+"%";t.css(d).transform(F(g)+E(a.x+n,a.y,N),r);b.fpage.css(d).transform(F(g)+E(a.x+P.x-u.x-e*f[0]/100,a.y+P.y-u.y-h*f[1]/100,N)+F((180/g-2)*g),r);b.wrapper.transform(E(-a.x+m-n,-a.y+l,N)+F(-g),r);b.fwrapper.transform(E(-a.x+u.x+m,-a.y+u.y+l,N)+F(-g),r);c.opts.gradients&&(f[0]&&(z.x=100-z.x),f[1]&&
(z.y=100-z.y),k["box-shadow"]="0 0 20px rgba(0,0,0,"+0.5*C+")",I.css(k),O(b.ashadow,j(B?100:0,D?0:100),j(z.x,z.y),[[L,"rgba(0,0,0,0)"],[0.8*(1-L)+L,"rgba(0,0,0,"+0.2*M+")"],[1,"rgba(255,255,255,"+0.2*M+")"]],3,0),i._backGradient.call(t)&&O(b.bshadow,j(B?0:100,D?0:100),j(A.x,A.y),[[0.6,"rgba(0,0,0,0)"],[0.8,"rgba(0,0,0,"+0.3*M+")"],[1,"rgba(0,0,0,0)"]],3))};switch(a.corner){case "tl":a.x=Math.max(a.x,1);H();f(m,[1,0,0,1],[100,0],G);break;case "tr":a.x=Math.min(a.x,e-1);H();f(j(-m.x,m.y),[0,0,0,1],
[0,0],-G);break;case "bl":a.x=Math.max(a.x,1);H();f(j(m.x,-m.y),[1,1,0,0],[100,100],-G);break;case "br":a.x=Math.min(a.x,e-1),H(),f(j(-m.x,-m.y),[0,1,1,0],[0,100],G)}}b.point=a},_moveFoldingPage:function(a){var b=this.data().f;if(b){var c=b.opts.turn,d=c.data(),e=d.pagePlace;a?(d=b.opts.next,e[d]!=b.opts.page&&(b.folding&&i._moveFoldingPage.call(this,!1),i._foldingPage.call(this).appendTo(b.fpage),e[d]=b.opts.page,b.folding=d),c.turn("update")):b.folding&&(d.pages[b.folding]?(c=d.pages[b.folding].data().f,
d.pageObjs[b.folding].appendTo(c.wrapper)):d.pageWrap[b.folding]&&d.pageObjs[b.folding].appendTo(d.pageWrap[b.folding]),b.folding in e&&(e[b.folding]=b.folding),delete b.folding)}},_showFoldedPage:function(a,b){var c=i._foldingPage.call(this),d=this.data(),e=d.f,f=e.visible;if(c){if(!f||!e.point||e.point.corner!=a.corner)if(c="hover"==e.status||"peel"==e.status||e.opts.turn.data().mouseAction?a.corner:null,f=!1,"prevented"==s("start",this,[e.opts,c]))return!1;if(b){var g=this,d=e.point&&e.point.corner==
a.corner?e.point:i._c.call(this,a.corner,1);this.animatef({from:[d.x,d.y],to:[a.x,a.y],duration:500,frame:function(b){a.x=Math.round(b[0]);a.y=Math.round(b[1]);i._fold.call(g,a)}})}else i._fold.call(this,a),d.effect&&!d.effect.turning&&this.animatef(!1);if(!f)switch(e.effect){case "hard":e.visible=!0;i._moveFoldingPage.call(this,!0);e.fpage.show();e.opts.shadows&&e.bshadow.show();break;case "sheet":e.visible=!0,e.fparent.show().data().flips++,i._moveFoldingPage.call(this,!0),e.fwrapper.show(),e.bshadow&&
e.bshadow.show()}return!0}return!1},hide:function(){var a=this.data().f,b=a.opts.turn.data(),c=i._foldingPage.call(this);switch(a.effect){case "hard":b.opts.gradients&&(a.bshadowLoc=0,a.bshadow.remove(),a.ashadow.hide());a.wrapper.transform("");a.fpage.hide();break;case "sheet":0===--a.fparent.data().flips&&a.fparent.hide(),this.css({left:0,top:0,right:"auto",bottom:"auto"}).transform(""),a.wrapper.transform(""),a.fwrapper.hide(),a.bshadow&&a.bshadow.hide(),c.transform("")}a.visible=!1;return this},
hideFoldedPage:function(a){var b=this.data().f;if(b.point){var c=this,d=b.point,e=function(){b.point=null;b.status="";c.flip("hide");c.trigger("end",[b.opts,!1])};if(a){var f=i._c.call(this,d.corner),a="t"==d.corner.substr(0,1)?Math.min(0,d.y-f.y)/2:Math.max(0,d.y-f.y)/2,g=j(d.x,d.y+a),l=j(f.x,f.y-a);this.animatef({from:0,to:1,frame:function(a){a=R(d,g,l,f,a);d.x=a.x;d.y=a.y;i._fold.call(c,d)},complete:e,duration:800,hiding:!0})}else this.animatef(!1),e()}},turnPage:function(a){var b=this,c=this.data().f,
d=c.opts.turn.data(),a={corner:c.corner?c.corner.corner:a||i._cAllowed.call(this)[0]},e=c.point||i._c.call(this,a.corner,c.opts.turn?d.opts.elevation:0),f=i._c2.call(this,a.corner);this.trigger("flip").animatef({from:0,to:1,frame:function(c){c=R(e,e,f,f,c);a.x=c.x;a.y=c.y;i._showFoldedPage.call(b,a)},complete:function(){b.trigger("end",[c.opts,!0])},duration:d.opts.duration,turning:!0});c.corner=null},moving:function(){return"effect"in this.data()},isTurning:function(){return this.flip("moving")&&
this.data().effect.turning},corner:function(){return this.data().f.corner},_eventStart:function(a){var b=this.data().f,c=b.opts.turn;if(!b.corner&&!b.disabled&&!this.flip("isTurning")&&b.opts.page==c.data().pagePlace[b.opts.page]){b.corner=i._isIArea.call(this,a);if(b.corner&&i._foldingPage.call(this))return this.trigger("pressed",[b.point]),i._showFoldedPage.call(this,b.corner),!1;b.corner=null}},_eventMove:function(a){var b=this.data().f;if(!b.disabled)if(a=t?a.originalEvent.touches:[a],b.corner){var c=
b.parent.offset();b.corner.x=a[0].pageX-c.left;b.corner.y=a[0].pageY-c.top;i._showFoldedPage.call(this,b.corner)}else if(b.hover&&!this.data().effect&&this.is(":visible"))if(a=i._isIArea.call(this,a[0])){if("sheet"==b.effect&&2==a.corner.length||"hard"==b.effect)b.status="hover",b=i._c.call(this,a.corner,b.opts.cornerSize/2),a.x=b.x,a.y=b.y,i._showFoldedPage.call(this,a,!0)}else"hover"==b.status&&(b.status="",i.hideFoldedPage.call(this,!0))},_eventEnd:function(){var a=this.data().f,b=a.corner;!a.disabled&&
b&&"prevented"!=s("released",this,[a.point||b])&&i.hideFoldedPage.call(this,!0);a.corner=null},disable:function(a){i.setData.call(this,{disabled:a});return this},hover:function(a){i.setData.call(this,{hover:a});return this},peel:function(a,b){var c=this.data().f;if(a){if(-1==f.inArray(a,o.all))throw p("Corner "+a+" is not permitted");if(-1!=f.inArray(a,i._cAllowed.call(this))){var d=i._c.call(this,a,c.opts.cornerSize/2);c.status="peel";i._showFoldedPage.call(this,{corner:a,x:d.x,y:d.y},b)}}else c.status=
"",i.hideFoldedPage.call(this,b);return this}};window.requestAnim=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)};f.extend(f.fn,{flip:function(){return I(f(this[0]),i,arguments)},turn:function(){return I(f(this[0]),g,arguments)},transform:function(a,b){var c={};b&&(c[v+"transform-origin"]=b);c[v+"transform"]=a;return this.css(c)},animatef:function(a){var b=
this.data();b.effect&&b.effect.stop();if(a){a.to.length||(a.to=[a.to]);a.from.length||(a.from=[a.from]);for(var c=[],d=a.to.length,e=!0,g=this,i=(new Date).getTime(),j=function(){if(b.effect&&e){for(var f=[],k=Math.min(a.duration,(new Date).getTime()-i),l=0;l<d;l++)f.push(b.effect.easing(1,k,a.from[l],c[l],a.duration));a.frame(d==1?f[0]:f);if(k==a.duration){delete b.effect;g.data(b);a.complete&&a.complete()}else window.requestAnim(j)}},l=0;l<d;l++)c.push(a.to[l]-a.from[l]);b.effect=f.extend({stop:function(){e=
false},easing:function(a,b,c,d,e){return d*Math.sqrt(1-(b=b/e-1)*b)+c}},a);this.data(b);j()}else delete b.effect}});f.isTouch=t;f.mouseEvents=q;f.cssPrefix=S;f.cssTransitionEnd=function(){var a,b=document.createElement("fakeelement"),c={transition:"transitionend",OTransition:"oTransitionEnd",MSTransition:"transitionend",MozTransition:"transitionend",WebkitTransition:"webkitTransitionEnd"};for(a in c)if(void 0!==b.style[a])return c[a]};f.findPos=C})(jQuery);

	// إخفاء شاشة التحميل عند اكتمال التحميل
	function hideLoadingScreen() {
		setTimeout(function() {
			$('#loadingScreen').addClass('hidden');
			// السماح بالتمرير بعد إخفاء شاشة التحميل
			$('body').removeClass('loading');
		}, 500);
	}
	
	// تأثير صوتي لتقليب الصفحات
	var pageFlipAudio;
	var soundEnabled = true; // الصوت مفعل افتراضياً
	
	function initAudio() {
		pageFlipAudio = new Audio();
		
		// قائمة بمصادر صوتية متعددة للتقليب (من الأفضل للأسوأ)
		var audioSources = [
			// ملف صوتي محلي (الأولوية الأولى)
			'page-flip.mp3',
			
			// مصادر احتياطية في حال فشل تحميل الملف المحلي
			'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c6c4c8c8e1.mp3',
			'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
			'https://freesound.org/data/previews/512/512142_5121236-lq.mp3'
		];
		
		var currentSourceIndex = 0;
		
		// محاولة تحميل الصوت من المصادر المتاحة
		function tryLoadAudio() {
			if (currentSourceIndex < audioSources.length) {
				pageFlipAudio.src = audioSources[currentSourceIndex];
				pageFlipAudio.volume = 0.4; // مستوى صوت معتدل
				pageFlipAudio.preload = 'auto';
			}
		}
		
		pageFlipAudio.onerror = function() {
			console.log('فشل تحميل الصوت من المصدر ' + (currentSourceIndex + 1));
			currentSourceIndex++;
			tryLoadAudio();
		};
		
		// بدء التحميل
		tryLoadAudio();
	}
	
	function playPageFlipSound() {
		if (!soundEnabled || !pageFlipAudio) return;
		
		try {
			// إعادة تشغيل الصوت من البداية
			pageFlipAudio.currentTime = 0;
			pageFlipAudio.play().catch(function(error) {
				console.log('خطأ في تشغيل الصوت:', error);
			});
		} catch(e) {
			console.log('خطأ في تشغيل الصوت:', e);
		}
	}
	
	function toggleSound() {
		soundEnabled = !soundEnabled;
		var $btn = $('#soundToggleBtn');
		var $icon = $btn.find('i');
		
		if (soundEnabled) {
			$btn.removeClass('muted');
			$icon.removeClass('fa-volume-mute').addClass('fa-volume-up');
			$btn.attr('title', 'إيقاف الصوت');
		} else {
			$btn.addClass('muted');
			$icon.removeClass('fa-volume-up').addClass('fa-volume-mute');
			$btn.attr('title', 'تفعيل الصوت');
		}
	}
	
	// وظيفة ملء الشاشة (مع دعم الجوال)
	function toggleFullscreen() {
		var $btn = $('#fullscreenBtn');
		var $icon = $btn.find('i');
		var isInFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
			document.mozFullScreenElement || document.msFullscreenElement || 
			$('body').hasClass('fullscreen-mode');
		
		if (!isInFullscreen) {
			// الدخول في وضع ملء الشاشة
			var elem = document.documentElement;
			var fullscreenSuccess = false;
			
			// محاولة استخدام Fullscreen API
			if (elem.requestFullscreen) {
				elem.requestFullscreen().then(function() {
					fullscreenSuccess = true;
				}).catch(function() {
					// فشل API، استخدم CSS fallback
					enterFullscreenMode();
				});
			} else if (elem.webkitRequestFullscreen) {
				elem.webkitRequestFullscreen();
				fullscreenSuccess = true;
			} else if (elem.webkitEnterFullscreen) {
				// Safari iOS
				elem.webkitEnterFullscreen();
				fullscreenSuccess = true;
			} else if (elem.mozRequestFullScreen) {
				elem.mozRequestFullScreen();
				fullscreenSuccess = true;
			} else if (elem.msRequestFullscreen) {
				elem.msRequestFullscreen();
				fullscreenSuccess = true;
			} else {
				// المتصفح لا يدعم Fullscreen API (معظم متصفحات الجوال)
				enterFullscreenMode();
				fullscreenSuccess = true;
			}
			
			// إذا لم ينجح API، استخدم CSS
			if (!fullscreenSuccess) {
				enterFullscreenMode();
			}
		} else {
			// الخروج من وضع ملء الشاشة
			if (document.exitFullscreen) {
				document.exitFullscreen().catch(function() {
					exitFullscreenMode();
				});
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			} else if (document.webkitCancelFullScreen) {
				document.webkitCancelFullScreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else {
				exitFullscreenMode();
			}
		}
	}
	
	// دخول وضع ملء الشاشة (CSS fallback للجوال)
	function enterFullscreenMode() {
		$('body').addClass('fullscreen-mode');
		var $btn = $('#fullscreenBtn');
		var $icon = $btn.find('i');
		$btn.addClass('active');
		$icon.removeClass('fa-expand').addClass('fa-compress');
		$btn.attr('title', 'الخروج من ملء الشاشة');
		
		// منع التمرير
		document.body.style.overflow = 'hidden';
		document.body.style.position = 'fixed';
		document.body.style.width = '100%';
		
		// إخفاء شريط العنوان في الجوال
		setTimeout(function() {
			window.scrollTo(0, 1);
		}, 100);
		
		// تحديث حجم الكتيب
		$(window).trigger('resize');
	}
	
	// الخروج من وضع ملء الشاشة (CSS fallback)
	function exitFullscreenMode() {
		$('body').removeClass('fullscreen-mode');
		var $btn = $('#fullscreenBtn');
		var $icon = $btn.find('i');
		$btn.removeClass('active');
		$icon.removeClass('fa-compress').addClass('fa-expand');
		$btn.attr('title', 'ملء الشاشة');
		
		// إعادة التمرير
		document.body.style.overflow = '';
		document.body.style.position = '';
		document.body.style.width = '';
		
		// تحديث حجم الكتيب
		$(window).trigger('resize');
	}
	
	// مراقبة تغيير حالة ملء الشاشة (عند الضغط على ESC)
	function handleFullscreenChange() {
		if (!document.fullscreenElement && !document.webkitFullscreenElement && 
			!document.mozFullScreenElement && !document.msFullscreenElement) {
			// الخروج من ملء الشاشة
			exitFullscreenMode();
		} else {
			// الدخول في ملء الشاشة
			enterFullscreenMode();
		}
	}
	
	// الاستماع لتغييرات ملء الشاشة
	document.addEventListener('fullscreenchange', handleFullscreenChange);
	document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
	document.addEventListener('mozfullscreenchange', handleFullscreenChange);
	document.addEventListener('MSFullscreenChange', handleFullscreenChange);
	
	// دعم تغيير اتجاه الشاشة على الجوال
	window.addEventListener('orientationchange', function() {
		if ($('body').hasClass('fullscreen-mode')) {
			setTimeout(function() {
				$(window).trigger('resize');
			}, 300);
		}
	});
	
	// تهيئة الصوت
	initAudio();
	
	// وظيفة تحميل مباشر للملف (يعمل على جميع الأنظمة بما فيها iOS)
	function handleDownloadClick(e) {
		var $btn = $('.download-pdf-btn');
		var $icon = $btn.find('i');
		var $text = $btn.find('span');
		
		// حفظ النص الأصلي
		var originalText = $text.text();
		var originalIcon = $icon.attr('class');
		
		// تحميل الملف مباشرة
		var pdfUrl = 'دستور أدِيب.pdf';
		var fileName = 'دستور-أديب.pdf';
		
		console.log('📥 بدء تحميل الملف...');
		console.log('📱 الجهاز:', isiOS ? 'iOS 🍎' : 'Other');
		
		// على iOS: السماح بالسلوك الافتراضي (تحميل مباشر)
		if (isiOS) {
			console.log('🍎 iOS: استخدام التحميل الافتراضي');
			// لا نمنع السلوك الافتراضي على iOS
			// فقط نعرض التأثير البصري
			setTimeout(function() {
				$btn.addClass('downloaded');
				$icon.removeClass('fa-download').addClass('fa-check-circle');
				$text.text('تم التحميل ✓');
			}, 300);
			
			setTimeout(function() {
				$btn.removeClass('downloaded');
				$icon.attr('class', originalIcon);
				$text.text(originalText);
			}, 3500);
			
			return; // السماح للرابط بالعمل بشكل طبيعي
		}
		
		// على الأنظمة الأخرى: منع السلوك الافتراضي واستخدام XHR
		e.preventDefault();
		
		// إنشاء XMLHttpRequest لتحميل الملف
		var xhr = new XMLHttpRequest();
		xhr.open('GET', pdfUrl, true);
		xhr.responseType = 'blob';
		
		xhr.onprogress = function(event) {
			if (event.lengthComputable) {
				var percentComplete = (event.loaded / event.total) * 100;
				console.log('📊 التقدم: ' + Math.round(percentComplete) + '%');
			}
		};
		
		xhr.onload = function() {
			if (xhr.status === 200) {
				var blob = xhr.response;
				
				// الطريقة العادية (لن يتم استخدامها على iOS)
				console.log('💻 استخدام الطريقة العادية...');
				
				var link = document.createElement('a');
				var url = window.URL.createObjectURL(blob);
				
				link.href = url;
				link.download = fileName;
				link.style.display = 'none';
				
				document.body.appendChild(link);
				link.click();
				console.log('✅ تم بدء التحميل');
				
				// تنظيف
				setTimeout(function() {
					document.body.removeChild(link);
					window.URL.revokeObjectURL(url);
				}, 100);
				
				// تغيير إلى حالة "تم التحميل"
				setTimeout(function() {
					$btn.addClass('downloaded');
					$icon.removeClass('fa-download').addClass('fa-check-circle');
					$text.text('تم التحميل ✓');
				}, 300);
				
				// إرجاع الزر لحالته الطبيعية بعد 3 ثواني
				setTimeout(function() {
					$btn.removeClass('downloaded');
					$icon.attr('class', originalIcon);
					$text.text(originalText);
				}, 3500);
			} else {
				console.error('❌ خطأ HTTP:', xhr.status);
				alert('عذراً، حدث خطأ أثناء التحميل. يرجى المحاولة مرة أخرى.');
			}
		};
		
		xhr.onerror = function() {
			console.error('❌ فشل تحميل الملف');
			alert('عذراً، حدث خطأ أثناء التحميل. يرجى المحاولة مرة أخرى.');
		};
		
		xhr.send();
	}
	
	// ربط زر التحكم بالصوت وزر ملء الشاشة
	$(document).ready(function() {
		$('#soundToggleBtn').on('click', toggleSound);
		$('#fullscreenBtn').on('click', toggleFullscreen);
		
		// ربط زر التحميل
		$('.download-pdf-btn').on('click', handleDownloadClick);
		
		// تأثير تمرير الهيدر
		var lastScrollTop = 0;
		$(window).scroll(function() {
			var scrollTop = $(this).scrollTop();
			var $header = $('.header-bar');
			
			if (scrollTop > 50) {
				$header.css({
					'padding': '12px 40px',
					'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.5)'
				});
			} else {
				$header.css({
					'padding': '20px 40px',
					'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)'
				});
			}
			
			lastScrollTop = scrollTop;
		});
	});
	
	// فحص إذا كان الجهاز iOS
	function isIOS() {
		return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	}
	
	var isiOS = isIOS();
	console.log('📱 الجهاز:', isiOS ? 'iOS 🍎' : 'Android/Desktop 🤖');
	
	// تحميل الصورة الأولى للحصول على الأبعاد
	var img = new Image();
	var imageLoaded = false;
	
	// Timeout للتأكد من إخفاء شاشة التحميل (iOS fallback)
	var loadTimeout = setTimeout(function() {
		if (!imageLoaded) {
			console.warn('⚠️ Image loading timeout - using default dimensions');
			initFlipbook(1000, 1414); // أبعاد افتراضية
		}
	}, 5000);
	
	// دالة تهيئة الكتيب
	function initFlipbook(pageWidth, pageHeight) {
		imageLoaded = true;
		clearTimeout(loadTimeout);
		
		console.log('📖 Initializing flipbook:', pageWidth, 'x', pageHeight);
		
		// حساب أبعاد الكتيب (صفحتين جنباً إلى جنب)
		var flipbookWidth = pageWidth * 2;
		var flipbookHeight = pageHeight;
		
		// حساب الأبعاد المناسبة للشاشة
		var maxWidth = window.innerWidth * 0.9;
		var maxHeight = window.innerHeight * 0.85;
		
		var scale = Math.min(maxWidth / flipbookWidth, maxHeight / flipbookHeight, 1);
		
		flipbookWidth = flipbookWidth * scale;
		flipbookHeight = flipbookHeight * scale;
		
		// تهيئة turn.js مع معالجة أخطاء iOS
		try {
			$("#flipbook").turn({
				width: flipbookWidth,
				height: flipbookHeight,
				autoCenter: true,
				gradients: !isIOS(), // تعطيل gradients على iOS لتحسين الأداء
				acceleration: !isIOS(), // تعطيل acceleration على iOS
				elevation: 50,
				duration: 1000,
				pages: 27, // عدد الصفحات الفعلي
				direction: 'rtl', // اتجاه من اليمين لليسار (عربي)
				when: {
					turning: function(event, page, view) {
						// تشغيل صوت التقليب
						playPageFlipSound();
						updatePageCounter(page);
						updateNavigationButtons(page);
					},
					turned: function(event, page, view) {
						updatePageCounter(page);
						updateNavigationButtons(page);
					}
				}
			});
			
			console.log('✅ Flipbook initialized successfully');
		} catch (error) {
			console.error('❌ Error initializing flipbook:', error);
			// حتى لو فشل turn.js، أخفِ شاشة التحميل
			hideLoadingScreen();
		}
		
		// تحديث عداد الصفحات مع تأثير
		function updatePageCounter(page) {
			// تحديث العداد في شريط التنقل مع تأثير
			var $navCurrent = $('.nav-page-counter .current');
			$navCurrent.css('transform', 'scale(1.2)');
			setTimeout(function() {
				$navCurrent.text(page);
				setTimeout(function() {
					$navCurrent.css('transform', 'scale(1)');
				}, 150);
			}, 150);
			
			// تحديث الصفحة النشطة في القائمة الجانبية
			$('.page-item').removeClass('active');
			$('.page-item[data-page="' + page + '"]').addClass('active');
		}
		
		// تحديث حالة أزرار التنقل
		function updateNavigationButtons(page) {
			var totalPages = $("#flipbook").turn("pages");
			
			// تعطيل زر السابق في الصفحة الأولى
			if (page === 1) {
				$('#prevBtn').prop('disabled', true);
			} else {
				$('#prevBtn').prop('disabled', false);
			}
			
			// تعطيل زر التالي في الصفحة الأخيرة
			if (page === totalPages) {
				$('#nextBtn').prop('disabled', true);
			} else {
				$('#nextBtn').prop('disabled', false);
			}
		}
		
		// ربط أزرار التنقل
		$('#prevBtn').click(function() {
			$("#flipbook").turn("previous");
		});
		
		$('#nextBtn').click(function() {
			$("#flipbook").turn("next");
		});
		
		// تحديث الأزرار عند التحميل
		updateNavigationButtons(1);
		
		// إنشاء القائمة الجانبية للصفحات
		function createPagesSidebar() {
			var totalPages = $("#flipbook").turn("pages");
			var $pagesGrid = $('#pagesGrid');
			$pagesGrid.empty();
			
			// أسماء الصفحات
			var pageNames = {
				1: 'الغلاف الأمامي',
				2: 'الصفحة الثانية',
				3: 'الصفحة الثالثة',
				4: 'الصفحة الرابعة',
				5: 'الصفحة الخامسة',
				6: 'الصفحة السادسة',
				7: 'الصفحة السابعة',
				8: 'الصفحة الثامنة',
				9: 'الصفحة التاسعة',
				10: 'الصفحة العاشرة',
				11: 'الصفحة الحادية عشرة',
				12: 'الصفحة الثانية عشرة',
				13: 'الصفحة الثالثة عشرة',
				14: 'الصفحة الرابعة عشرة',
				15: 'الصفحة الخامسة عشرة',
				16: 'الصفحة السادسة عشرة',
				17: 'الصفحة السابعة عشرة',
				18: 'الصفحة الثامنة عشرة',
				19: 'الصفحة التاسعة عشرة',
				20: 'الصفحة العشرون',
				21: 'الصفحة الواحد والعشرون',
				22: 'الصفحة الثاتي والعشرون',
				23: 'الصفحة الثالث والعشرون',
				24: 'الصفحة الرابع والعشرون',
				25: 'الصفحة الخامس والعشرون',
				26: 'الصفحة السادس والعشرون',
				27: 'الغلاف الخلفي'
			};
			
			for (var i = 1; i <= totalPages; i++) {
			var pageNum = i;
			var imageSrc = 'p (' + i + ').webp'; // استخدام WebP مباشرة
			var pageName = pageNames[i] || 'صفحة ' + i;
			
			var $pageItem = $('<div>', {
				'class': 'page-item' + (i === 1 ? ' active' : ''),
				'data-page': pageNum
			});
			
			var $thumbnail = $('<div>', {'class': 'page-thumbnail'});
			$thumbnail.append($('<img>', {src: imageSrc, alt: 'صفحة ' + pageNum}));
			
			var $pageInfo = $('<div>', {'class': 'page-info'});
			$pageInfo.append($('<div>', {'class': 'page-number', text: pageNum}));
			$pageInfo.append($('<div>', {'class': 'page-label', text: pageName}));
			
			$pageItem.append($thumbnail).append($pageInfo);
		
		$pageItem.on('click', function() {
			var page = $(this).data('page');
			$("#flipbook").turn("page", page);
			closeSidebar();
			
			// التمرير إلى الكتيب
			$('html, body').animate({
				scrollTop: $('.flipbook-container').offset().top - 100
			}, 600);
		});
		
		$pagesGrid.append($pageItem);
	}
}

// فتح القائمة الجانبية
function openSidebar() {
	$('#pagesSidebar').addClass('active');
	$('#sidebarOverlay').addClass('active');
	$('body').css('overflow', 'hidden');
}

// إغلاق القائمة الجانبية
function closeSidebar() {
	$('#pagesSidebar').removeClass('active');
	$('#sidebarOverlay').removeClass('active');
	$('body').css('overflow', '');
}

// ربط أزرار القائمة الجانبية
$('#pagesMenuBtn').on('click', openSidebar);
$('#closeSidebarBtn').on('click', closeSidebar);
$('#sidebarOverlay').on('click', closeSidebar);

// إنشاء القائمة الجانبية
createPagesSidebar();

// إخفاء شاشة التحميل
hideLoadingScreen();

// إضافة أزرار التنقل بين الصفحات (معكوس للعربية)
$(document).keydown(function(e) {
	if (e.keyCode == 37) {
		// السهم الأيسر - الصفحة التالية (في الاتجاه العربي)
		$("#flipbook").turn("next");
	} else if (e.keyCode == 39) {
		// السهم الأيمن - الصفحة السابقة (في الاتجاه العربي)
		$("#flipbook").turn("previous");
	} else if (e.keyCode == 27) {
		// مفتاح Escape - إغلاق القائمة الجانبية
		closeSidebar();
	} else if (e.keyCode == 122) {
		// مفتاح F11 - ملء الشاشة
		e.preventDefault();
		toggleFullscreen();
	}
});

// إعادة حساب الأبعاد عند تغيير حجم النافذة
$(window).resize(function() {
	var newMaxWidth = window.innerWidth * 0.9;
	var newMaxHeight = window.innerHeight * 0.85;
	var newScale = Math.min(newMaxWidth / (pageWidth * 2), newMaxHeight / pageHeight, 1);
	
	var newWidth = pageWidth * 2 * newScale;
	var newHeight = pageHeight * newScale;
	
	$("#flipbook").turn("size", newWidth, newHeight);
});

// إخفاء شاشة التحميل
hideLoadingScreen();
}

// معالج onload للصورة
img.onload = function() {
	console.log('✅ Image loaded successfully');
	initFlipbook(this.width, this.height);
};

// معالج onerror للصورة (iOS fallback)
img.onerror = function() {
	console.error('❌ Failed to load image, using default dimensions');
	initFlipbook(1000, 1414);
};

// تحميل الصورة الأولى (WebP)
console.log('🔄 Loading initial image: p (1).webp');
img.src = "p (1).webp";

// Fallback إضافي: إذا لم يتم التحميل خلال 8 ثواني، أخفِ شاشة التحميل
setTimeout(function() {
	if ($('#loadingScreen').is(':visible')) {
		console.warn('⚠️ Force hiding loading screen after 8s');
		hideLoadingScreen();
	}
}, 8000);
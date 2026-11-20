/*
 * Page transitions never surface as errors (D14). Inlined in <head> (app/layout.tsx), because React's
 * streaming runtime starts view transitions while the HTML is still arriving, before any client JS.
 *
 * The browser aborts a view transition when the viewport changes size mid-way (phone rotation, the URL
 * bar collapsing, a resized window) or the tab is hidden. React's runtime chains `.finally()` on the
 * transition's promises and only recognises some abort messages, so a harmless skipped animation became
 * an "uncaught InvalidStateError". This wraps `document.startViewTransition` once:
 * - with reduced motion, while the viewport is changing size, or in a hidden tab: the DOM update runs
 *   directly and the "transition" completes instantly (nothing to abort, no animation);
 * - otherwise the real transition runs; its promises are handled, a benign abort is passed on with the
 *   message React already ignores, and `finished` never rejects.
 * Plain ES5 on purpose (it runs before any bundle).
 */
export const VT_GUARD_SCRIPT = `(function(){try{
var d=document;if(d.__lqVtGuard||typeof d.startViewTransition!=="function")return;d.__lqVtGuard=true;
var n=d.startViewTransition.bind(d),mq=window.matchMedia("(prefers-reduced-motion: reduce)"),last=-1e9;
function rs(){last=performance.now()}
window.addEventListener("resize",rs,{passive:true});if(window.visualViewport)window.visualViewport.addEventListener("resize",rs,{passive:true});
function noop(){}
function benign(e){return e&&(e.name==="InvalidStateError"||e.name==="AbortError")}
d.startViewTransition=function(a){
var u=typeof a==="function"?a:(a&&a.update);
if(mq.matches||performance.now()-last<500||d.visibilityState==="hidden"){
var done=Promise.resolve().then(function(){return u&&u()}).then(noop),ok=done.catch(noop);
return{ready:ok,finished:ok,updateCallbackDone:done,skipTransition:noop,types:new Set()}}
var t=n(a);
var r=t.ready.catch(function(e){if(benign(e))throw new DOMException("Skipping view transition because viewport size changed.","InvalidStateError");throw e});
var f=t.finished.catch(noop);t.updateCallbackDone.catch(noop);
return{ready:r,finished:f,updateCallbackDone:t.updateCallbackDone,skipTransition:function(){t.skipTransition()},types:t.types}};
}catch(e){}})()`;

/**
  * Author: Brad Howes <https://github.com/bradhowes>
  * Barely modified then minified by Marzavec <https://github.com/marzavec> to work in browser
  * Plugin for Remarkable Markdown processor which transforms $..$ and $$..$$ sequences into math HTML using the
  * Katex package.
  */

var remarkableKatex=function(e,r){e.inline.ruler.push("katex",function(e,r){var t,n,i,a=e.pos,s=a,l=e.posMax;if(36!==e.src.charCodeAt(a))return!1;for(++a;a<l&&36===e.src.charCodeAt(a);)++a;if((t=e.src.slice(s,a)).length>2)return!1;for(n=i=a;-1!==(n=e.src.indexOf("$",i));){for(i=n+1;i<l&&36===e.src.charCodeAt(i);)++i;if(i-n==t.length){if(!r){var o=e.src.slice(a,n).replace(/[ \n]+/g," ").trim();e.push({type:"katex",content:o,block:t.length>1,level:e.level})}return e.pos=i,!0}}return r||(e.pending+=t),e.pos+=t.length,!0},r),e.block.ruler.push("katex",function(e,r,t){var n,i,a,s,l=!1,o=e.bMarks[r]+e.tShift[r],c=e.eMarks[r];if(o+1>c)return!1;if(36!==(n=e.src.charCodeAt(o)))return!1;if(s=o,2!=(i=(o=e.skipChars(o,n))-s))return!1;for(a=r;!(++a>=t||(o=s=e.bMarks[a]+e.tShift[a])<(c=e.eMarks[a])&&e.tShift[a]<e.blkIndent);)if(36===e.src.charCodeAt(o)&&!(e.tShift[a]-e.blkIndent>=4||(o=e.skipChars(o,n))-s<i||(o=e.skipSpaces(o))<c)){l=!0;break}i=e.tShift[r],e.line=a+(l?1:0);var f=e.getLines(r+1,a,i,!0).replace(/[ \n]+/g," ").trim();return e.tokens.push({type:"katex",params:void 0,content:f,lines:[r,e.line],level:e.level,block:!0}),!0},r),e.renderer.rules.katex=function(e,r){return t=e[r].content,n=e[r].block,katex.renderToString(t,{displayMode:n,throwOnError:!1});var t,n}};

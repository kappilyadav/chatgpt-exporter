/* Chat Exporter — CSS for the in-page UI (injected into a closed-off shadow root). */
(function (CE) {
  'use strict';
  // The ChatGPT Exporter icon, inlined so the page can show it without exposing extension files.
  CE.ui.brandIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAMNElEQVR4nO2de2wUxx3Hv7sY/H5AabEhVWyEaRXaAkoCAUJqp2kaRCqbpE2bNioB9aX+EypqgUIq0dYYaBPZVG3/SFURR5USVVQYHY9CmuA2PJIgwKQpiRLZXJvgR0Fg+w6wwdxUv72bu927Xdtn797uzs1Xsu92b3bnt/f57cxvZmfmFDigupdCiwDUAFjIGCqhoBKMVfLPGUs9JrrP+AGL6DYUvi/14Pj5lMSGaR4mBrCkdDxLRfeBIcu4HaPYG0tjaa/JBaTYqyDIGIIAgmDsHID2NzfO6oDN0pk6OdW9FKqnFwD0Wkb7tIvSQYnvS5KED6MUnW1Ge/sBtEHBvmMbZ7XBbQeobw0R6A2MYS2A+B1OkvCZtR0Tg5+cB5UQrWCs5XhDOTlGZh2gvjW0FcAzjEXvdr0kfGZthz3wo/uiHxD8XccbyomH8w5Q/3K4BoztpjveEqqEnyn4+n1BKFh3oqG8HWlITSdx/cvhZjB2VMKH1+BTGqqCjy7/TW8z7C4B6lvDZVCwF4zVjApVwncLvnFfhFEpsObkpor+STuABh84CjBq2kn4EWMaS3vdg8/fUpOxdiwnUMYB/wLAEs261OuS8L0Hn6ufMVS9tdnaCdRx3PkSPnwJn9JpDO/b0ZPSUhs7CKQ6Xxb7fobPRQz3Ih0HiEX7MuCD7+HzNDVLm7qbxxUDxNr51NST8CPGNJb2ehu+frP27Wdnt49eAkQ7eST8iDGNpb3+gU/n0NhaOkCse1d28kSMaSzt9Rd8SlO5pKnb0GWsJD3YuSD79mFIY2mv/+BzUZOw6p1nZ/cnlwD0VE/CFxs+qQyMbeAbcQeIPdI1N0LCFwU+tzfOWtEN5tibLfArihV8pmQKFs6Zqu3r+OQW+gZvozcUyQb4XGtOPTenLSe2UZcN8FfMnYY1X8jFojui4LnWLsnXXjsu3sJfzw7hWOcwBIdPaYh53AHqRYZfNE1Bw4OFmgOMpkVzpmp/xzpzsfO1EMLDMdvEg8+Zr1NiAzjPigz/+foSzJs5Bemot2sEPzgygFDMCQSDz/ctpiCwRlT4pK2PFKUNn1Q+Nwe/fLQEAsMn1aixodtCwn/486n1fTpafMdUPHJXrqjwaWOhGhu3Lxx8su2HC6LB3WT04y8ViAqf/leqsUkblhn6FT4V+2Wz0hryaKqyWVMw79M8VhYKPr1UqqLO2Fk+RsSfjlbozyUOfPq8Ut8TKAx8x6QIBV+T5gASfnbCJ1EQaGGEhC86fJIqInzaZ5bvRMUEhU/7VBHhOyImHnz6pwoJP+li7RQTCH5SECjhZxt8XRAoIHw7gwCICZ+kigjfzF5bpIgFn7aMQaCEn1XwSYkgUMIfl0SCnwgCJfyshE9ShYVvc2uACQgfhhhAIPiOlAVMPPhkS9QBJPy0JAp8Eg0IGfsCJHwh4euCQPHg6/OyS0ww+HSOHK/CryhWsaxqGhbOnoqi/MTVdl4aQcfHt3Cs66b1hTJmzGOSYpGx4T8wLxeLPzsN1eWJQajhIYYz/xnGPz4cQs/Abc/BJ+V4DT6N4//ekgI8vijPcvLG44vy0d93G1vfDGuzeZIvwIGbH1bwCfq22lKUlZsPPX+gOhcbHirBq6eu4U8nwhi8HvEMfPreVS/BnzczB611ZZbwkwdrtnyjFE/fV+A8fIsvc/2yIvz+yRmW8PX69r2F+Mu3ZmL+rKmegU9SvQKfivxdXy9JeyTv00sLsOmhoozD37KqFN9fWZTWsdPLp+DFJ2agonSKJ+Cnjgl0sc7/2VeKkFc4sd6bVQvysOmrxcgk/NVfnNicg/wiFT9fXeoJ+MYxgS7Cn+wMHu4Emx8uTuRja08gswU+19135mI1TThxGT4dqXqhqbd27th1fjpOQCbYWR2w2MXZAZ/rySWFrsOnfTluw6eonyZi2iVyAlLPYKzZZZO22AifRMFgcZ6KwRsR1+CTctzu5Jk70z74eicYCttXBDy1uBB5RfaPNaueNRWng8Ouwac01hNDDLmnvPXu6N2Y7ASW5wB8g1yCbz0xJMmwpLe+GMDpCzHmKnzziSGG3FPe2g7/2rDDRYGHFYrV/27Bp9MbewINuae8deTO/+h/Ixi6ZmPI7hPdCEfwYd8tV+EbewJdgM8voP2/iQc72aK/dw65Dp8UDQJdhE9qffs6sk0vtg+6Dp82VLfhk3oHbuN3/7yGbNELhwfQE7rtOvxEFeAifH7UnrM3cOh86gKNoilw7jpeORX2BHz6T0vEeGYkDy3OeOjfQxAZ/i8CVz0Dn6R6agwfY9hxREwnCHgQPkn1EnyenWhOEPAofNOeQLfhc+0QpDoIeBg+SfUifD5wcrvPS4KAx+EbegK9Bp9/vv3woC+dIOAD+CTVy/C5mv42iIPv+ccJAj6Br3UEeR0+f7v9yCAO+qAkCPgIfrwE8Dp8ngdVB152goDP4NN/1S/w+b6mQwM4+N4NeE0BH8InqX6Czz+IxgTecYKAT+EngkAfwefadmgQB/7lvhMEfAyfpPoRvrapAE2H3XWCgM/hW6wQ4g/4XG45QUAA+ImOIJ/C57ZsOzSQUScICAI/aYUQf8LnypQTBASCr3UEiQCfq/Ggs04QEAw+5aGKAp8f5pQTBASEP/pawT6Ez/Wr/f3Y/659ThAQFH4iCIwb63/4PE3jAXucICAwfPO1ggWAz9V4sB/7J1EdBASHn7pWsEDwuR1adTABJwhkAXxSjsjwucgJaLm2hpoSbYmWsaZs7XxjAPvfvS48fC372l2Xmcjw9fbSggy0yMOjCwuMq3UB2jy9/eeua3d+KGnCqqjwyV6l9reXWTbA16dJORdj1nYIDD8pCJTwkWXwKU2Om/BpYciifDVt+CnWKWZfuLUtlvZOAL7he0nOYxzXFR5m+KDnpivwSeZrBTsIvzhXwTfvKcRjc/O01T6lgKs9I3jl/Wv488nB+KIRmYCvva1pucQyBX/VgnxsXFns/Jo7PtWNUATbXruKfWfCGYFPpWZOpuCvX1GE9csKTS5Biiu/WEXjY5/C7LIc/OH1fsfhm68Q4tCdL+GPXz95sBR1iwsdh5+6QohDdT4V+1Lp6bmvzUBxgeoofFJihRCHon0K+GSdP7Hq4KllJY7Cp1tfdbqpR9G+1MT0nbuKHIVPx6pOt/NlU2/iml6Rg89VTHMMvmGNICd6+JI7eaTSV0me6hh8kuoU/NF6xaTGLyfhm68VLOF7Tw7BJ6lOwv+oL+kXvaTS1gfdw47BNwaBDtz5oaEIznycfcvA2qV3uobiYxOcgE9SnYLPjTvogQmcflXb6ZCj8PnMoKBT8Ek0jVuWAhO7+9vOhB2FD8aCFAQGnYLP1XhgwNafcMmGp4Jb9lxyGj6dI0hVQNBJ+JSOfjf3R3uu4GqvvT/kJKKudI/gu7t78MmVEafh00uQ+gHOZWIYFw26fOLVy7bO2BFNe0+HseqPF/F+981MwCedU1a+0LcIwFkn4SenqSibgi/Pz8PKedHnBHffGe3uzMZ6nvTG+Wt4/fx1XLw6koliX79vsXbK+5/voxkQZXIAp7cHcCb22QK/v7O5ejrvB2iT8LMKPqlN3w+wz3CghA/B4ZP2GU5//wt9FxhDpYSPbIAf7Gyurkr+wYhWCR/ZAD/KOib9gJAWCgwMJ5PwRYRPjIm10QGON5TTB7viJ5PwRYRP2tXVUh2/0VOe3C//de8FKKg0Nc4qUwkfPoEf7GqJ1v1cqWO2FKwzNc4qUwkfPoFPbwxsTR3gREN5O68jJHyh4Ld07ZpPbA2yHLy1bGfPUQA1lplK+PANfLD2rpb5tSbmmlQBCa0B0GGaqYQPH8HviLE01ajDN5ft7CkDQB1EZaYXoDuLhA8vwqdov6qrZX486k/WqAP3T26q6GcMVYaSQML3C/yOseCTxpy58dbmCjoB1R/tEr5v4FOwVzsW/CRzxtbSpu5mABv4kRI+vBrt/xTjVFoOQFra1F0DBbu1B0dJFkj4cLWTh9r5Zk09Wx2Aa0lT91YAz2gDSSR8uAhf68LvaqkmHmlrwg5AWtLUTfA3MIa1QKxEkPAz9kg39lSvRd+3n1EH0Ovexov1UFAHoN7QbJTwbR3GFRvJs6+zuVob0TNZ2eYAet3TeJEGmtaAsYVUMmjxQvIDJgnfOo/oRjA2aYfmbdDI7fbO5up4c9wu/R+NarupYB9UagAAAABJRU5ErkJggg==';
  CE.ui.css = `
:host{all:initial}
*{box-sizing:border-box}
.ce{--bg:#23252c;--bg2:#2b2e36;--bg3:#323640;--fg:#e9eaee;--muted:#9aa0ac;--border:#3a3e49;--accent:#0a6cd6;--accent-text:#6db4ff;--accent-fg:#fff;--accent-soft:rgba(26,140,255,.18);--danger:#ef4444;--shadow:0 10px 30px rgba(0,0,0,.45);
  font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;color:var(--fg)}
.ce.light{--bg:#ffffff;--bg2:#f4f4f7;--bg3:#e9e9ef;--fg:#1f2330;--muted:#6b7280;--border:#d9dbe3;--accent:#0a6cd6;--accent-text:#0a6cd6;--accent-soft:rgba(10,108,214,.12);--shadow:0 10px 30px rgba(20,20,40,.18)}
button,select,input{font:inherit;color:inherit}
button{cursor:pointer}

/* ---- dock (page-level SELECT / EXPORT buttons) ---- */
.dock{position:fixed;right:14px;bottom:92px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.dock.collapsed .split{display:none}
.dock .toggle{width:40px;height:40px;border-radius:11px;border:0;background:none;padding:0;display:block;cursor:pointer;box-shadow:0 4px 14px rgba(10,108,214,.38);transition:transform .12s ease,box-shadow .12s ease}
.dock .toggle img{display:block;width:40px;height:40px;border-radius:11px;pointer-events:none;-webkit-user-drag:none}
.dock .toggle:hover{transform:scale(1.07);box-shadow:0 6px 18px rgba(10,108,214,.5)}
.dock .toggle:focus-visible{outline:2px solid var(--accent-text);outline-offset:3px}
.split{display:flex;border-radius:8px;overflow:hidden;border:1px solid var(--accent);background:var(--bg);box-shadow:var(--shadow);position:relative}
.split button{border:0;background:transparent;padding:8px 12px;font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.split .main{min-width:78px;color:var(--fg)}
.split .caret{border-inline-start:1px solid var(--accent);padding:8px 9px;color:var(--accent-text);display:grid;place-items:center}
.split.primary .main{background:var(--accent);color:var(--accent-fg)}
.split.sec .main{border-color:var(--border);color:var(--muted)}
.split:not(.primary){border-color:var(--accent)}
.split.sec{border-color:var(--border)}
.split.sec .caret{border-inline-start-color:var(--border);color:var(--muted)}
.split button:hover{filter:brightness(1.12)}
.split button:disabled{opacity:.55;cursor:default}

/* ---- menus ---- */
.menu{position:fixed;z-index:2147483200;min-width:178px;background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow);padding:6px;display:none}
.menu.open{display:block}
.menu button{display:flex;width:100%;gap:8px;align-items:center;text-align:start;border:0;background:transparent;padding:8px 10px;border-radius:6px;font-size:13px}
.menu button:hover{background:var(--bg3)}
.menu .sep{height:1px;background:var(--border);margin:5px 4px}
.menu .check{margin-inline-start:auto;color:var(--accent-text);font-weight:700}
.menu .hdr{padding:6px 10px 4px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}

/* ---- side panel ---- */
.panel{position:fixed;top:0;right:0;bottom:0;width:min(372px,100vw);z-index:2147483100;background:var(--bg);border-left:1px solid var(--border);box-shadow:var(--shadow);display:none;flex-direction:column}
.panel.open{display:flex}
.p-head{display:flex;align-items:center;gap:10px;padding:14px 14px 10px}
.p-head .ico{color:var(--muted);display:grid;place-items:center}
.p-head h2{margin:0;font-size:16px;font-weight:600;flex:1}
.iconbtn{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--muted);display:grid;place-items:center;padding:0}
.ce[dir=rtl] .iconbtn.back svg{transform:scaleX(-1)}
.iconbtn:hover{background:var(--bg3);color:var(--fg)}
.p-tip{padding:0 14px 8px;color:var(--muted);font-size:11.5px;border-bottom:1px solid var(--border)}
.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px 6px}
.presets button{border:1px solid var(--border);background:var(--bg2);border-radius:8px;padding:7px 4px;font-size:12.5px;font-weight:600}
.presets button:hover{border-color:var(--accent)}
.presets button.on{border-color:var(--accent);background:var(--accent-soft)}
.presets .wide{grid-column:1/-1}
.list{flex:1;overflow:auto;padding:6px 10px 8px;display:flex;flex-direction:column;gap:2px;position:relative}
.row{display:flex;gap:9px;align-items:flex-start;padding:8px 8px;border-radius:8px;cursor:pointer;user-select:none;border:1px solid transparent}
.row:hover{background:var(--bg2)}
.row.off{opacity:.55}
.row input{accent-color:var(--accent);margin-top:2px;flex:none;width:15px;height:15px;pointer-events:none}
.row .ri{flex:none;color:var(--muted);margin-top:1px;display:grid;place-items:center}
.row .txt{flex:1;min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.list.expanded .row .txt{white-space:normal;display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical}
.row.user .txt{font-weight:600}
.state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 20px;text-align:center;color:var(--muted);flex:1}
.spin{width:22px;height:22px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--accent);animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.p-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid var(--border);font-size:12.5px}
.p-bar input[type=checkbox]{accent-color:var(--accent);width:15px;height:15px}
.p-bar .count{font-weight:600;min-width:34px}
.p-bar label{display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--muted)}
.p-bar .grow{flex:1}
.p-foot{display:flex;gap:8px;padding:10px 14px 14px}
.btn{border-radius:8px;border:1px solid var(--border);background:var(--bg2);padding:9px 12px;font-weight:700;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
.btn:hover{border-color:var(--accent)}
.btn.cancel{color:var(--danger);border-color:var(--danger);background:transparent;flex:0 0 auto}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg);flex:1}
.btn:disabled{opacity:.55;cursor:default}
.fmt{flex:0 0 132px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);padding:9px 8px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
.settings{flex:1;overflow:auto;padding:4px 14px 16px}
.cf-section{margin:12px 0 4px}
.cf-title{margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cf-row{display:flex;gap:10px;align-items:center;padding:6px 0;font-size:12.5px;border-bottom:1px solid var(--border)}
.cf-row.cf-bool{cursor:pointer}
.cf-row .cf-label{flex:1}
.cf-row input[type=checkbox]{accent-color:var(--accent);width:15px;height:15px}
.cf-row input[type=text],.cf-row input[type=number],.cf-row select{width:50%;min-width:110px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:5px 7px}
.cf-row.cf-text,.cf-row.cf-select,.cf-row.cf-number{flex-wrap:wrap}

/* ---- toasts ---- */
.toasts{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483300;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.toast{background:var(--bg);border:1px solid var(--border);border-inline-start:4px solid var(--accent);border-radius:8px;padding:10px 14px;box-shadow:var(--shadow);font-size:13px;max-width:min(520px,90vw);pointer-events:auto;animation:ti .18s ease-out}
.toast.err{border-inline-start-color:var(--danger)}
.toast-act{margin-inline-start:10px;padding:3px 10px;border-radius:6px;border:1px solid var(--accent);background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
@keyframes ti{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ---- modal (bulk) ---- */
.scrim{position:fixed;inset:0;z-index:2147483250;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center}
.scrim.open{display:flex}
.modal{width:min(560px,94vw);max-height:84vh;display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow)}
.modal .m-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
.modal .m-head h3{margin:0;font-size:15px;flex:1}
.modal .m-tools{display:flex;gap:8px;padding:10px 16px}
.modal .m-tools input[type=search]{flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:7px 10px}
.modal .m-list{flex:1;overflow:auto;padding:0 10px 8px;min-height:160px}
.modal .m-row{display:flex;gap:10px;align-items:center;padding:7px 8px;border-radius:8px;cursor:pointer}
.modal .m-row:hover{background:var(--bg2)}
.modal .m-row input{accent-color:var(--accent)}
.modal .m-row .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.modal .m-row .d{color:var(--muted);font-size:11.5px;flex:none}
.modal .m-foot{display:flex;gap:8px;align-items:center;padding:12px 16px;border-top:1px solid var(--border)}
.modal .m-foot .msg{flex:1;color:var(--muted);font-size:12px}
.progress{height:6px;border-radius:3px;background:var(--bg3);overflow:hidden;margin:0 16px 10px;display:none}
.progress.on{display:block}
.progress i{display:block;height:100%;width:0;background:var(--accent);transition:width .2s}
`;
})(globalThis.CE);

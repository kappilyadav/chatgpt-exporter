/* Chat Exporter — CSS for the in-page UI (injected into a closed-off shadow root). */
(function (CE) {
  'use strict';
  CE.ui.css = `
:host{all:initial}
*{box-sizing:border-box}
.ce{--bg:#23252c;--bg2:#2b2e36;--bg3:#323640;--fg:#e9eaee;--muted:#9aa0ac;--border:#3a3e49;--accent:#8b5cf6;--accent-fg:#fff;--accent-soft:rgba(139,92,246,.18);--danger:#ef4444;--shadow:0 10px 30px rgba(0,0,0,.45);
  font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;color:var(--fg)}
.ce.light{--bg:#ffffff;--bg2:#f4f4f7;--bg3:#e9e9ef;--fg:#1f2330;--muted:#6b7280;--border:#d9dbe3;--accent:#7c3aed;--accent-soft:rgba(124,58,237,.12);--shadow:0 10px 30px rgba(20,20,40,.18)}
button,select,input{font:inherit;color:inherit}
button{cursor:pointer}

/* ---- dock (page-level SELECT / EXPORT buttons) ---- */
.dock{position:fixed;right:14px;bottom:92px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
.dock.collapsed .split{display:none}
.dock .toggle{width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:var(--bg);color:var(--muted);display:grid;place-items:center;padding:0;box-shadow:var(--shadow)}
.split{display:flex;border-radius:8px;overflow:hidden;border:1px solid var(--accent);background:var(--bg);box-shadow:var(--shadow);position:relative}
.split button{border:0;background:transparent;padding:8px 12px;font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.split .main{min-width:78px;color:var(--fg)}
.split .caret{border-left:1px solid var(--accent);padding:8px 9px;color:var(--accent);display:grid;place-items:center}
.split.primary .main{background:var(--accent);color:var(--accent-fg)}
.split.sec .main{border-color:var(--border);color:var(--muted)}
.split:not(.primary){border-color:var(--accent)}
.split.sec{border-color:var(--border)}
.split.sec .caret{border-left-color:var(--border);color:var(--muted)}
.split button:hover{filter:brightness(1.12)}
.split button:disabled{opacity:.55;cursor:default}

/* ---- menus ---- */
.menu{position:fixed;z-index:2147483200;min-width:178px;background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow);padding:6px;display:none}
.menu.open{display:block}
.menu button{display:flex;width:100%;gap:8px;align-items:center;text-align:left;border:0;background:transparent;padding:8px 10px;border-radius:6px;font-size:13px}
.menu button:hover{background:var(--bg3)}
.menu .sep{height:1px;background:var(--border);margin:5px 4px}
.menu .check{margin-left:auto;color:var(--accent);font-weight:700}
.menu .hdr{padding:6px 10px 4px;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}

/* ---- side panel ---- */
.panel{position:fixed;top:0;right:0;bottom:0;width:min(372px,100vw);z-index:2147483100;background:var(--bg);border-left:1px solid var(--border);box-shadow:var(--shadow);display:none;flex-direction:column}
.panel.open{display:flex}
.p-head{display:flex;align-items:center;gap:10px;padding:14px 14px 10px}
.p-head .ico{color:var(--muted);display:grid;place-items:center}
.p-head h2{margin:0;font-size:16px;font-weight:600;flex:1}
.iconbtn{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--muted);display:grid;place-items:center;padding:0}
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
.toast{background:var(--bg);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:8px;padding:10px 14px;box-shadow:var(--shadow);font-size:13px;max-width:min(520px,90vw);pointer-events:auto;animation:ti .18s ease-out}
.toast.err{border-left-color:var(--danger)}
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

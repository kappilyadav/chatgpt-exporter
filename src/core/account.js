/* Chat Exporter — account and quota client. The background worker owns the data; this talks to it. */
(function (CE) {
  'use strict';

  const send = (msg) => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r));
    } catch (e) {
      resolve(null);
    }
  });

  CE.account = {
    /** Plan and usage snapshot, or null when the background worker is unreachable. */
    get: (force) => send({ type: 'account-get', force: !!force }),
    connect: (token) => send({ type: 'account-connect', token }),
    disconnect: () => send({ type: 'account-disconnect' }),
    openSite: (page) => send({ type: 'open-site', page }),

    /**
     * Reserve quota before an export. Fails open: if the worker cannot be reached the export goes ahead,
     * so a Chrome hiccup never blocks someone's work.
     */
    async consume(kind, count) {
      const r = await send({ type: 'quota-consume', kind, count: count || 1 });
      return r || { ok: true, unmetered: true };
    },
    refund: (kind, count) => send({ type: 'quota-refund', kind, count: count || 1 }),

    limitMessage(q) {
      const what = q.kind === 'full' ? 'full-chat exports' : 'partial exports';
      return 'You have used all ' + q.limit + ' free ' + what + ' this month. Upgrade for unlimited exports.';
    }
  };

  /** Error thrown when the Free-plan quota is used up; the UI offers an upgrade instead of a plain failure. */
  CE.LimitError = class LimitError extends Error {
    constructor(q) {
      super(CE.account.limitMessage(q));
      this.name = 'LimitError';
      this.quota = q;
    }
  };
})(globalThis.CE);

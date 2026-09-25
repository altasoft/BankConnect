(function () {
  const TAG_GROUPS = {
    Enrollment: 'Client Onboarding',
    Pain001: 'Payments',
    Messages: 'Messages',
    CommandAndEvents: 'Internal / Diagnostics (not for clients)',
    Info: 'Internal / Diagnostics (not for clients)',
  };
  const GROUP_ORDER = ['Client Onboarding', 'Payments', 'Messages', 'Internal / Diagnostics (not for clients)'];

  const navEl = document.getElementById('explorer-nav-list');
  const mainEl = document.getElementById('explorer-main');
  const searchEl = document.getElementById('explorer-search');

  let spec = null;
  let operations = []; // { id, method, path, tag, group, summary, security, parameters, requestBody, responses }

  fetch('../swagger.json')
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((data) => {
      spec = data;
      operations = buildOperations(spec);
      renderNav(operations);
      const hashId = decodeURIComponent(location.hash.replace('#', ''));
      const initial = operations.find((o) => o.id === hashId) || operations[0];
      if (initial) selectOperation(initial.id);
    })
    .catch((err) => {
      mainEl.innerHTML =
        '<div class="explorer-empty">Could not load <code>swagger.json</code>: ' +
        escapeHtml(err.message) +
        '<br/>Make sure this site is served over HTTP (not opened as a local <code>file://</code> page) so the browser can fetch it.</div>';
    });

  function buildOperations(spec) {
    const ops = [];
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, op] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
        const tag = (op.tags && op.tags[0]) || 'Other';
        ops.push({
          id: method.toUpperCase() + '-' + path,
          method: method.toUpperCase(),
          path,
          tag,
          group: TAG_GROUPS[tag] || tag,
          summary: op.summary || op.description || '',
          security: op.security,
          parameters: op.parameters || [],
          requestBody: op.requestBody,
          responses: op.responses || {},
        });
      }
    }
    return ops;
  }

  function renderNav(ops) {
    const groups = {};
    ops.forEach((op) => {
      (groups[op.group] = groups[op.group] || []).push(op);
    });

    const orderedGroupNames = [
      ...GROUP_ORDER.filter((g) => groups[g]),
      ...Object.keys(groups).filter((g) => !GROUP_ORDER.includes(g)),
    ];

    navEl.innerHTML = orderedGroupNames
      .map((groupName) => {
        const items = groups[groupName]
          .map(
            (op) => `
            <button class="explorer-item" data-id="${escapeAttr(op.id)}">
              <span class="method-tag method-${op.method.toLowerCase()}">${op.method}</span>
              <span class="path-text" title="${escapeAttr(op.path)}">${escapeHtml(op.path)}</span>
            </button>`
          )
          .join('');
        return `<div class="explorer-group"><div class="explorer-group-title">${escapeHtml(groupName)}</div>${items}</div>`;
      })
      .join('');

    navEl.querySelectorAll('.explorer-item').forEach((btn) => {
      btn.addEventListener('click', () => selectOperation(btn.getAttribute('data-id')));
    });

    if (searchEl) {
      searchEl.addEventListener('input', () => {
        const q = searchEl.value.trim().toLowerCase();
        navEl.querySelectorAll('.explorer-item').forEach((btn) => {
          const text = btn.textContent.toLowerCase();
          btn.style.display = !q || text.includes(q) ? '' : 'none';
        });
      });
    }
  }

  function selectOperation(id) {
    const op = operations.find((o) => o.id === id);
    if (!op) return;
    location.hash = encodeURIComponent(id);

    navEl.querySelectorAll('.explorer-item').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-id') === id);
    });

    mainEl.innerHTML = renderOperation(op);
    mainEl.querySelectorAll('.tabs').forEach(wireTabs);
  }

  function renderOperation(op) {
    const authNote = op.security && op.security.length
      ? `<div class="callout"><b>Auth:</b><span>Requires <code>${escapeHtml(Object.keys(op.security[0])[0])}</code> (see the request's <code>Authorization</code> header example below).</span></div>`
      : `<div class="callout"><b>Auth:</b><span>Authenticated via mTLS client certificate on the connection itself &mdash; no bearer token or API key header.</span></div>`;

    let html = `
      <div class="op-header">
        <span class="method-tag method-${op.method.toLowerCase()}">${op.method}</span>
        <span class="op-path">${escapeHtml(op.path)}</span>
      </div>
      <p class="op-summary">${escapeHtml(op.summary) || 'No summary provided in the spec.'}</p>
      ${authNote}
    `;

    if (op.parameters.length) {
      html += `<div class="op-section-title">Parameters</div><table><thead><tr><th>Name</th><th>In</th><th>Required</th><th>Type</th><th>Description</th></tr></thead><tbody>`;
      op.parameters.forEach((p) => {
        html += `<tr><td><code>${escapeHtml(p.name)}</code></td><td>${escapeHtml(p.in)}</td><td>${p.required ? 'Yes' : 'No'}</td><td>${escapeHtml(schemaTypeLabel(p.schema))}</td><td>${escapeHtml(p.description || '')}</td></tr>`;
      });
      html += `</tbody></table>`;
    }

    if (op.requestBody) {
      const content = op.requestBody.content || {};
      const mediaType = Object.keys(content)[0];
      const mediaTypeObj = mediaType && content[mediaType];
      const schema = mediaTypeObj && mediaTypeObj.schema;
      html += `<div class="op-section-title">Request Body${mediaType ? ' &middot; <code>' + escapeHtml(mediaType) + '</code>' : ''}</div>`;
      if (op.requestBody.description) html += `<p>${escapeHtml(op.requestBody.description)}</p>`;
      html += renderExampleTabs('req-' + op.id, schema, mediaType, mediaTypeObj);
    }

    html += `<div class="op-section-title">Responses</div>`;
    Object.entries(op.responses).forEach(([status, resp]) => {
      const content = resp.content || {};
      const mediaType = Object.keys(content)[0];
      const mediaTypeObj = mediaType && content[mediaType];
      const schema = mediaTypeObj && mediaTypeObj.schema;
      html += `<h3><code>${escapeHtml(status)}</code></h3>`;
      if (resp.description) html += `<p class="op-desc">${escapeHtml(resp.description)}</p>`;
      if (resp.headers && Object.keys(resp.headers).length) {
        html += `<table><thead><tr><th>Response Header</th><th>Description</th></tr></thead><tbody>`;
        Object.entries(resp.headers).forEach(([name, header]) => {
          html += `<tr><td><code>${escapeHtml(name)}</code></td><td>${escapeHtml((header && header.description) || '')}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
      if (schema || (mediaTypeObj && (mediaTypeObj.example !== undefined || mediaTypeObj.examples))) {
        html += renderExampleTabs('res-' + op.id + '-' + status, schema, mediaType, mediaTypeObj);
      }
    });

    return html;
  }

  function renderExampleTabs(idPrefix, schema, mediaType, mediaTypeObj) {
    mediaTypeObj = mediaTypeObj || {};
    const isXml = mediaType && mediaType.includes('xml');
    const tabs = [];

    if (mediaTypeObj.examples && Object.keys(mediaTypeObj.examples).length) {
      Object.entries(mediaTypeObj.examples).forEach(([name, ex]) => {
        tabs.push({ key: 'ex-' + name, label: (ex && ex.summary) || name, content: exampleContentToString(ex && ex.value) });
      });
    } else if (mediaTypeObj.example !== undefined) {
      tabs.push({ key: 'example', label: 'Example', content: exampleContentToString(mediaTypeObj.example) });
    } else if (schema) {
      const content = isXml
        ? '<!-- Body is raw XML; see the guide pages for a concrete ISO 20022 example. -->'
        : JSON.stringify(exampleFromSchema(schema, spec, new Set()), null, 2);
      tabs.push({ key: 'example', label: 'Example', content });
    }

    if (schema) {
      tabs.push({ key: 'schema', label: 'Schema', content: JSON.stringify(resolveSchema(schema, spec), null, 2) });
    }

    if (!tabs.length) return '';

    const tabButtons = tabs
      .map((t, i) => `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${escapeAttr(t.key)}">${escapeHtml(t.label)}</button>`)
      .join('');
    const panels = tabs
      .map((t, i) => `<div data-panel="${escapeAttr(idPrefix + '-' + t.key)}"${i === 0 ? '' : ' style="display:none"'}><pre><code>${escapeHtml(t.content)}</code></pre></div>`)
      .join('');

    return `
      <div class="tabs" data-group="${escapeAttr(idPrefix)}">${tabButtons}</div>
      ${panels}
    `;
  }

  function exampleContentToString(value) {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function wireTabs(tabsEl) {
    const group = tabsEl.getAttribute('data-group');
    const prefix = group + '-';
    const panels = Array.from(document.querySelectorAll('[data-panel]')).filter((p) =>
      p.getAttribute('data-panel').indexOf(prefix) === 0
    );
    tabsEl.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        panels.forEach((p) => {
          p.style.display = p.getAttribute('data-panel') === prefix + tab ? '' : 'none';
        });
      });
    });
  }

  function resolveSchema(schema, spec) {
    if (!schema) return schema;
    if (schema.$ref) {
      const name = schema.$ref.split('/').pop();
      return (spec.components && spec.components.schemas && spec.components.schemas[name]) || schema;
    }
    return schema;
  }

  function schemaTypeLabel(schema) {
    if (!schema) return '';
    if (schema.$ref) return schema.$ref.split('/').pop();
    if (schema.type === 'array') return schemaTypeLabel(schema.items) + '[]';
    return schema.type || 'object';
  }

  function exampleFromSchema(schema, spec, seen) {
    if (!schema) return null;

    if (schema.$ref) {
      const name = schema.$ref.split('/').pop();
      if (seen.has(name)) return {};
      const resolved = spec.components && spec.components.schemas && spec.components.schemas[name];
      if (!resolved) return {};
      const nextSeen = new Set(seen);
      nextSeen.add(name);
      return exampleFromSchema(resolved, spec, nextSeen);
    }

    if (schema.example !== undefined) return schema.example;

    if (schema.type === 'array') {
      return [exampleFromSchema(schema.items, spec, seen)];
    }

    if (schema.type === 'object' || schema.properties) {
      const obj = {};
      const props = schema.properties || {};
      for (const [key, propSchema] of Object.entries(props)) {
        obj[key] = exampleFromSchema(propSchema, spec, seen);
      }
      return obj;
    }

    if (schema.enum) return schema.enum[0];

    switch (schema.type) {
      case 'string':
        return schema.format === 'date-time' ? '2026-01-01T00:00:00Z' : schema.format === 'date' ? '2026-01-01' : 'string';
      case 'integer':
        return 0;
      case 'number':
        return 0;
      case 'boolean':
        return true;
      default:
        return null;
    }
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }
})();

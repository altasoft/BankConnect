// Injects the shared top navigation bar. Each page includes this script
// and a <div id="topnav"></div> placeholder, then sets data-active on <body>.
(function () {
  // Resolve from this script so navigation preserves the site's deployment path.
  const siteBase = new URL('../', document.currentScript.src);
  const links = [
    { href: 'index.html', label: 'Overview' },
    { href: 'guide/authentication.html', label: 'Authentication' },
    { href: 'guide/enrollment.html', label: 'Enrollment' },
    { href: 'guide/payments.html', label: 'Sending Payments' },
    { href: 'guide/messages.html', label: 'Getting Messages' },
    { href: 'explorer/index.html', label: 'API Explorer' },
  ];

  const active = document.body.getAttribute('data-active') || '';
  const nav = document.getElementById('topnav');
  if (!nav) return;

  nav.innerHTML =
    '<div class="topnav-brand"><span class="dot"></span> BankConnect Developer Guide</div>' +
    '<div class="topnav-links">' +
    links
      .map(
        (l) =>
          `<a href="${new URL(l.href, siteBase).href}"${l.label === active ? ' class="active"' : ''}>${l.label}</a>`
      )
      .join('') +
    '</div>';
})();

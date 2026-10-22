/**
 * Kleine Einblendungen ("Toasts") am oberen Rand - z. B. wenn beim Öffnen
 * einer Truhe ein Erfolg freigeschaltet wird.
 *
 * Der Toast liegt fest am Bildschirm (nicht in einem Bildschirm-Container),
 * damit er auch dann sichtbar bleibt, wenn direkt danach der Bildschirm
 * wechselt. Nach ein paar Sekunden verschwindet er von selbst.
 */

import { spieleKlang } from '../core/audio.js';

/**
 * Zeigt für jeden freigeschalteten Erfolg nacheinander einen Toast.
 * @param {Array} erfolge - Erfolge aus js/data/erfolge.js (darf leer sein)
 */
export function zeigeErfolgToast(erfolge) {
  if (!Array.isArray(erfolge) || !erfolge.length) return;
  erfolge.forEach((erfolg, i) => {
    setTimeout(() => banner(erfolg), i * 1500);
  });
}

function banner(erfolg) {
  const el = document.createElement('div');
  el.className = 'erfolg-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="erfolg-toast__icon">${erfolg.icon}</span>
    <span class="erfolg-toast__body">
      <span class="erfolg-toast__label">Erfolg freigeschaltet</span>
      <span class="erfolg-toast__name">${erfolg.name}</span>
    </span>
  `;
  document.body.appendChild(el);
  spieleKlang('aufgabe');

  // Einblenden im nächsten Frame, damit der Übergang greift.
  requestAnimationFrame(() => el.classList.add('is-shown'));

  setTimeout(() => {
    el.classList.remove('is-shown');
    setTimeout(() => el.remove(), 400);
  }, 2600);
}

/**
 * Ein einfacher Hinweis im selben Stil - z. B. "Neue Freundschaftsanfrage".
 * Texte werden als Text gesetzt, nie als HTML (Namen kommen von anderen).
 *
 * @param {{icon: string, label: string, text: string}} hinweis
 */
export function zeigeHinweisToast({ icon, label, text }) {
  const el = document.createElement('div');
  el.className = 'erfolg-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="erfolg-toast__icon"></span>
    <span class="erfolg-toast__body">
      <span class="erfolg-toast__label"></span>
      <span class="erfolg-toast__name"></span>
    </span>
  `;
  el.querySelector('.erfolg-toast__icon').textContent = icon;
  el.querySelector('.erfolg-toast__label').textContent = label;
  el.querySelector('.erfolg-toast__name').textContent = text;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('is-shown'));
  setTimeout(() => {
    el.classList.remove('is-shown');
    setTimeout(() => el.remove(), 400);
  }, 3200);
}

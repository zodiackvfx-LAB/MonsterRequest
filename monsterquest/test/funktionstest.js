// MonsterQuest 2.0 – automatischer Funktionstest (Playwright, Chromium)
const { chromium } = require('playwright');
const fs = require('fs');
const FILE = (process.argv[2] || require('path').join(__dirname, '..', 'monsterquest.html'));
const URL = 'file://' + FILE;
const results = [];
const errors = [];
const ok = (name, pass, info) => { results.push({ name, pass: !!pass, info: info || '' }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  — ' + info : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(browser, vp, preSave){
  const ctx = await browser.newContext({ viewport: vp || { width: 400, height: 780 } });
  await ctx.addInitScript(save => {
    const orig = Math.random;
    Math.random = function(){ return typeof window.__fixedRandom === 'number' ? window.__fixedRandom : orig(); };
    if(save !== null && !sessionStorage.getItem('__seeded')){
      sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      if(save) localStorage.setItem('monsterquest.v1', save);
    }
  }, preSave === undefined ? '' : preSave);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if(m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto(URL);
  await sleep(300);
  return p;
}
const activeScreen = p => p.$eval('.screen.active', e => e.id);
const hp = (p, who) => p.$eval(`#${who}-hp-text`, e => e.textContent.split('/').map(Number));
const xp = p => p.$eval('#xp-text', e => Number(e.textContent.split('/')[0]));
const handIds = p => p.$$eval('#hand .card', els => els.map(e => e.dataset.id));
async function waitFight(p, t = 6000){ await p.waitForSelector('#hand:not(.locked)', { timeout: t }); }
async function openFight(p, area){
  await p.click(`.map-node[data-area="${area}"]`); await sleep(380);
  await p.click('#area-sheet [data-act="explore"]'); await sleep(380);
  const name = await p.$eval('#preview-sheet h2', e => e.textContent);
  await p.click('#preview-sheet [data-act="fight"]');
  return name;
}
async function playCard(p, id, waitEnabled = true){
  const sel = `#hand .card[data-id="${id}"]`;
  if(waitEnabled) await p.waitForSelector(sel + ':not(.disabled)', { timeout: 15000 });
  await p.click(sel);
}
async function resultShown(p, t = 8000){ await p.waitForSelector('#battle-overlay.active', { timeout: t }); }

(async () => {
  const browser = await chromium.launch();

  // ---------- 1–3: Start, Menüs, Weltkarte ----------
  let p = await newPage(browser);
  ok('1 Startbildschirm funktioniert', (await activeScreen(p)) === 'screen-start' && await p.$eval('#logo svg', e => !!e) && await p.$eval('#mascot-art svg.mon-flauschi', e => !!e));
  let menusOk = true;
  for(const id of ['screen-monster', 'screen-deck', 'screen-dex', 'screen-settings']){
    await p.click(`[data-screen="${id}"]`); await sleep(400);
    if(await activeScreen(p) !== id) menusOk = false;
    await p.click(`#${id} [data-back]`); await sleep(400);
    if(await activeScreen(p) !== 'screen-start') menusOk = false;
  }
  ok('2 Alle Menüs erreichbar', menusOk);
  await p.click('#btn-play'); await sleep(400);
  const nodes = await p.$$eval('.map-node', els => els.map(e => ({ a: e.dataset.area, locked: e.classList.contains('locked') })));
  ok('3 Weltkarte funktioniert (4 Stationen, nur Grasland offen)', nodes.length === 4 && !nodes[0].locked && nodes.slice(1).every(n => n.locked), JSON.stringify(nodes));

  // ---------- 5, 6, 8, 9, 10, 11, 12, 15, 16 (Sieg) ----------
  await p.evaluate(() => { window.__fixedRandom = 0.999; }); // Grollzahn (Index 3 → letzter), Deck in Grundreihenfolge, Gegner 6 Schaden
  const enemyName = await openFight(p, 'grass');
  await sleep(700);
  ok('5 Kampf startet', (await activeScreen(p)) === 'screen-battle' && await p.$('#hand.locked') !== null);
  await waitFight(p);
  const monId = await p.$eval('#enemy-sprite svg.mon', e => [...e.classList].find(c => c.startsWith('mon-')).slice(4));
  ok('6 Monster wird korrekt angezeigt', enemyName === 'Knuffhorn' && monId === 'knuffhorn' && (await p.$eval('#enemy-name', e => e.textContent)) === 'Knuffhorn', `${enemyName} / ${monId}`);
  const startHand = await handIds(p);
  const deckText = await p.$eval('#deck-counter', e => e.textContent);
  ok('11 Kampfdeck hat 8 Karten (4 Hand + 4 Deck, nur Standardkarten)', startHand.length === 4 && /Deck: 4 /.test(deckText) && JSON.stringify(startHand) === JSON.stringify(['krallenhieb','feuerball','flammenstoss','biss']), startHand.join(',') + ' | ' + deckText);
  // 12: Gegner greift nicht ohne Spieleraktion an
  let ph0 = await hp(p, 'player');
  await sleep(2500);
  let ph1 = await hp(p, 'player');
  ok('12a Ohne Spieleraktion kein Gegnerangriff', ph0[0] === ph1[0], `${ph0[0]} → ${ph1[0]}`);
  // 8, 9: Schaden und Energiekosten
  const xpBefore = await xp(p);
  const eBefore = (await hp(p, 'enemy'))[0];
  await playCard(p, 'krallenhieb');
  const xpAfter = await xp(p);
  await sleep(350);
  const eAfter = (await hp(p, 'enemy'))[0];
  ok('9 Energiekosten korrekt (Krallenhieb −2)', xpBefore - xpAfter === 2 || xpBefore - xpAfter === 1, `${xpBefore} → ${xpAfter}`);
  ok('8 Karte verursacht richtigen Schaden (Krallenhieb 5)', eBefore - eAfter === 5, `${eBefore} → ${eAfter}`);
  await sleep(700);
  const ph2 = await hp(p, 'player');
  ok('12b Gegner greift nach Spielerkarte an (3–6 Schaden)', ph1[0] - ph2[0] >= 3 && ph1[0] - ph2[0] <= 6, `${ph1[0]} → ${ph2[0]}`);
  ok('10 Hand enthält maximal 4 Karten', (await handIds(p)).length === 4);
  // Schnelle Mehrfachtipps: Doppelklick darf nur eine Karte spielen
  await p.waitForSelector('#hand .card:not(.disabled)', { timeout: 15000 });
  const cardsBefore = (await handIds(p)).length + Number((await p.$eval('#deck-counter', e => e.textContent)).match(/\d+/)[0]);
  const firstPlayable = await p.$eval('#hand .card:not(.disabled)', e => e.dataset.id);
  await p.dblclick(`#hand .card[data-id="${firstPlayable}"]`);
  await sleep(60);
  const cardsAfter = (await handIds(p)).length + Number((await p.$eval('#deck-counter', e => e.textContent)).match(/\d+/)[0]);
  ok('Grenzfall: Doppeltipp spielt nur eine Karte', cardsBefore - cardsAfter === 1, `${cardsBefore} → ${cardsAfter}`);
  // weiter bis zum Sieg (Knuffhorn 30 HP)
  for(let i = 0; i < 12; i++){
    if(await p.$('#battle-overlay.active')) break;
    const id = await p.$eval('#hand .card', e => e.dataset.id).catch(() => null);
    if(!id) break;
    const playable = await p.waitForSelector('#hand .card:not(.disabled)', { timeout: 15000 }).catch(() => null);
    if(!playable || await p.$('#battle-overlay.active')) break;
    await playable.click().catch(() => {});
    await sleep(800);
  }
  await resultShown(p).catch(() => {});
  const won = await p.$eval('#battle-overlay', e => e.classList.contains('win'));
  const st = await p.$$eval('.stats-grid .v', els => els.map(e => e.textContent));
  ok('16a Sieg-Bildschirm erscheint', won && (await p.$eval('#overlay-title', e => e.textContent)) === 'Sieg!' && await p.$('#result-monster svg.mon-knuffhorn') !== null, st.join(' | '));
  ok('15 Kampfstatistik zählt korrekt (Schaden = 30 HP, Karten ≥ 3, Dauer gesetzt)', st[0] === 'Sieg' && Number(st[3]) === 30 && Number(st[2]) >= 3 && /^\d+:\d\d$/.test(st[1]), st.join(' | '));
  ok('Freischaltung: Wald nach Sieg im Grasland', !(await p.$eval('#unlock-note', e => e.hidden)) && /Wald/.test(await p.$eval('#unlock-note', e => e.textContent)));
  await p.click('#overlay-btn'); await sleep(700);
  const forestLocked = await p.$eval('.map-node[data-area="forest"]', e => e.classList.contains('locked'));
  ok('4 Freischaltung bleibt erhalten (Wald offen, Hügel gesperrt)', !forestLocked && await p.$eval('.map-node[data-area="hills"]', e => e.classList.contains('locked')));

  // ---------- 7: Gegner erscheinen in den richtigen Gebieten ----------
  await p.evaluate(() => { delete window.__fixedRandom; });
  const AREA_ENEMIES = { grass:['Grollzahn','Pustepuff','Kleehops','Knuffhorn'], forest:['Moosling','Pilzbert','Wurzelwusel','Flatterflaum'] };
  let areaOk = true; const seenNames = {};
  for(const area of ['grass','forest']){
    seenNames[area] = new Set();
    for(let i = 0; i < 10; i++){
      await p.click(`.map-node[data-area="${area}"]`); await sleep(300);
      await p.click('#area-sheet [data-act="explore"]'); await sleep(300);
      const n = await p.$eval('#preview-sheet h2', e => e.textContent);
      seenNames[area].add(n);
      if(AREA_ENEMIES[area].indexOf(n) < 0) areaOk = false;
      await p.click('#preview-sheet [data-act="back"]'); await sleep(300);
    }
  }
  ok('7 Neue Gegner erscheinen in den richtigen Gebieten', areaOk && seenNames.grass.size >= 3 && seenNames.forest.size >= 3, JSON.stringify({ grass:[...seenNames.grass], forest:[...seenNames.forest] }));

  // ---------- 14: Pause, auch während Intro und mit offenem Gegnerangriff ----------
  await openFight(p, 'forest');
  await sleep(500);
  await p.click('#btn-pause'); // während der Intro-Animation
  await sleep(2500);
  const stillLocked = await p.$('#hand.locked') !== null;
  await p.click('#pause-resume');
  await waitFight(p);
  ok('Grenzfall: Pause während Intro hält das Intro an', stillLocked);
  await sleep(300);
  const xpP = await xp(p);
  await playCard(p, (await p.$eval('#hand .card:not(.disabled)', e => e.dataset.id)));
  const php = (await hp(p, 'player'))[0];
  await p.click('#btn-pause');
  const xpPaused = await xp(p);
  await sleep(2500);
  const xpPaused2 = await xp(p);
  const phpPaused = (await hp(p, 'player'))[0];
  const handBeforeTry = await handIds(p);
  await p.$eval('#hand .card', e => e.click()); // Klick hinter dem Pausenmenü
  const handAfterTry = await handIds(p);
  await p.click('#pause-resume');
  await sleep(900);
  const phpAfter = (await hp(p, 'player'))[0];
  await sleep(1200);
  const xpResumed = await xp(p);
  ok('14a Pause stoppt Energie, Gegner und Kartenspiel', xpPaused === xpPaused2 && phpPaused === php && JSON.stringify(handBeforeTry) === JSON.stringify(handAfterTry), `xp ${xpPaused}→${xpPaused2}, hp ${php}→${phpPaused}`);
  ok('14b Fortsetzen läuft exakt weiter (Gegnerangriff folgt, Energie steigt)', phpAfter < phpPaused && xpResumed > xpPaused2, `hp ${phpPaused}→${phpAfter}, xp ${xpPaused2}→${xpResumed}`);
  await p.click('#btn-pause'); await sleep(200);
  await p.click('#pause-exit'); await sleep(700);
  ok('Pause → Zurück zur Weltkarte', (await activeScreen(p)) === 'screen-map');
  await p.close();

  // ---------- 13, 16b, Deck aufbrauchen: Bosskampf ----------
  p = await newPage(browser, null, JSON.stringify({ ver:2, name:'Flauschi', anim:true, enemyDelay:300, wins:3, losses:0, seen:{ flauschi:true }, defeated:{}, cleared:{ grass:true, forest:true, hills:true } }));
  await p.click('#btn-play'); await sleep(400);
  await p.evaluate(() => { window.__fixedRandom = 0; }); // Gegner 3 Schaden, festgelegte Mischung
  await openFight(p, 'boss');
  await sleep(1200);
  const bossIntroRunning = await p.$('#boss-crown') !== null || await p.$('#boss-banner') !== null;
  await waitFight(p, 8000);
  const bossHp = await hp(p, 'enemy');
  ok('13 Bosskampf startet (Intro, Glutdrache 65 HP, BOSS-Schild)', bossIntroRunning && bossHp[1] === 65 && (await p.$eval('#enemy-lv-tag', e => e.textContent)) === 'BOSS' && await p.$('#enemy-sprite svg.mon-glutdrache') !== null);
  const order = ['biss','feuerball','flammenstoss','schutzschild','krallenhieb'];
  for(const id of order){ await playCard(p, id); await sleep(500); }
  const handLeft = await handIds(p);
  const deckLeft = await p.$eval('#deck-counter', e => e.textContent);
  ok('Grenzfall: Deck aufgebraucht → Hand schrumpft, kein Fehler', handLeft.length === 3 && /Deck: 0 /.test(deckLeft), handLeft.join(',') + ' | ' + deckLeft);
  for(const id of ['feuersturm','lavabombe']){ await playCard(p, id); await sleep(500); }
  await resultShown(p);
  const bossWin = await p.$eval('#battle-overlay', e => e.classList.contains('win'));
  const bossStats = await p.$$eval('.stats-grid .v', els => els.map(e => e.textContent));
  ok('13b Boss besiegbar, Statistik: 7 Karten, 65 Schaden', bossWin && bossStats[2] === '7' && bossStats[3] === '65', bossStats.join(' | '));
  await p.click('#overlay-btn'); await sleep(600);
  // Niederlage gegen den Boss: Zufall 0.999 → Grundreihenfolge, Gegner 6 Schaden
  await p.evaluate(() => { window.__fixedRandom = 0.999; });
  await openFight(p, 'boss');
  await waitFight(p, 8000);
  // feste Reihenfolge ohne Heilung: 5 Gegnerangriffe à 6 Schaden = 30
  for(const id of ['krallenhieb','feuerball','flammenstoss','biss','feuersturm']){ await playCard(p, id); await sleep(500); }
  await resultShown(p).catch(() => {});
  const lost = await p.$eval('#battle-overlay', e => e.classList.contains('lose'));
  ok('16b Niederlage-Bildschirm mit Wiederholung', lost && (await p.$eval('#overlay-title', e => e.textContent)) === 'Niederlage' && !(await p.$eval('#overlay-retry', e => e.hidden)));
  // Grenzfall: nach Kampfende laufen keine Timer weiter
  const phEnd = (await hp(p, 'player'))[0];
  await sleep(1500);
  ok('Grenzfall: Kampfende bei laufenden Timern stabil', (await hp(p, 'player'))[0] === phEnd && phEnd === 0);
  await p.click('#overlay-retry'); await waitFight(p, 8000);
  ok('Nochmal versuchen startet denselben Gegner neu', (await hp(p, 'enemy'))[0] === 65 && (await hp(p, 'player'))[0] === 30);
  await p.click('#battle-flee'); await sleep(600);

  // ---------- 17: Lexikon ----------
  await p.click('#map-back'); await sleep(450);
  await p.click('[data-screen="screen-dex"]'); await sleep(450);
  const dex = await p.$eval('#dex-num', e => e.textContent);
  const dragonKnown = await p.$$eval('.dex-entry', els => els.some(e => !e.classList.contains('unknown') && /Glutdrache/.test(e.textContent)));
  const entries = await p.$$eval('.dex-entry', els => els.length);
  ok('17 Lexikon zeigt entdeckte Monster (14 Einträge)', entries === 14 && dragonKnown && /^2 \/ 14/.test(dex), dex);
  await p.click('#screen-dex [data-back]'); await sleep(400);

  // ---------- 19: Speichern nach Neuladen ----------
  await p.click('[data-screen="screen-settings"]'); await sleep(400);
  await p.fill('#set-name', 'Blubbi'); await p.press('#set-name', 'Enter'); await sleep(100);
  await p.reload(); await sleep(400);
  const persisted = await p.evaluate(() => JSON.parse(localStorage.getItem('monsterquest.v1')));
  const backup = await p.evaluate(() => localStorage.getItem('monsterquest.v1.backup'));
  ok('19 Spielstand bleibt nach Neuladen erhalten (Name, Siege, Gebiete, Sicherung)', persisted.name === 'Blubbi' && persisted.wins === 4 && persisted.losses === 1 && persisted.cleared.boss === true && !!backup, `wins ${persisted.wins}, losses ${persisted.losses}`);

  // ---------- 18: Animationen abschalten ----------
  await p.click('[data-screen="screen-settings"]'); await sleep(400);
  await p.click('#set-anim'); await sleep(100);
  const noAnim = await p.$eval('#app', e => e.classList.contains('no-anim'));
  await p.click('#screen-settings [data-back]'); await sleep(50);
  await p.click('#btn-play'); await sleep(50);
  await p.click('.map-node[data-area="hills"]'); await sleep(80);
  await p.click('#area-sheet [data-act="explore"]'); await sleep(80);
  await p.click('#preview-sheet [data-act="fight"]');
  await sleep(250);
  const instantFight = await p.$('#hand:not(.locked)') !== null;
  const idleDur = await p.$eval('#enemy-sprite .idle', e => getComputedStyle(e).animationDuration);
  const wingDur = await p.$eval('#start-bg .start-cloud', e => getComputedStyle(e).animationDuration);
  ok('18 Animationen lassen sich abschalten (auch neue Monster-, Wolken- und Intro-Animationen)', noAnim && instantFight && parseFloat(idleDur) < 0.01 && parseFloat(wingDur) < 0.01, `idle ${idleDur}, wolke ${wingDur}`);
  await p.click('#battle-flee'); await sleep(100);
  await p.close();

  // ---------- Migration alter Spielstände + beschädigte Daten ----------
  p = await newPage(browser, null, JSON.stringify({ name:'Altflausch', anim:false, enemyDelay:900, wins:2, losses:1, seenGrollzahn:true }));
  const mig = await p.evaluate(() => JSON.parse(localStorage.getItem('monsterquest.v1')));
  await p.click('#btn-play'); await sleep(200);
  const forestOpen = !(await p.$eval('.map-node[data-area="forest"]', e => e.classList.contains('locked')));
  ok('Migration v1 → v2 (Name, Einstellungen, Siege bleiben; Grasland zählt als geschafft)', mig.ver === 2 && mig.name === 'Altflausch' && mig.anim === false && mig.enemyDelay === 900 && mig.wins === 2 && mig.losses === 1 && mig.seen.grollzahn && mig.defeated.grollzahn === 2 && forestOpen, JSON.stringify(mig));
  await p.close();
  p = await newPage(browser, null, '{kaputt');
  const afterCorrupt = await p.evaluate(() => ({ main: JSON.parse(localStorage.getItem('monsterquest.v1')), kept: localStorage.getItem('monsterquest.v1.defekt') }));
  ok('Beschädigte Speicherdaten: Spiel startet, Rohdaten werden aufbewahrt', (await activeScreen(p)) === 'screen-start' && afterCorrupt.main.ver === 2 && afterCorrupt.kept === '{kaputt');
  await p.close();
  p = await newPage(browser, null, '{kaputt');
  await p.evaluate(() => { localStorage.setItem('monsterquest.v1.backup', JSON.stringify({ ver:2, name:'Gesichert', wins:7, cleared:{ grass:true } })); localStorage.setItem('monsterquest.v1', '{kaputt'); });
  await p.reload(); await sleep(300);
  const fromBackup = await p.evaluate(() => JSON.parse(localStorage.getItem('monsterquest.v1')));
  ok('Sicherung springt ein, wenn der Hauptspeicher beschädigt ist', fromBackup.name === 'Gesichert' && fromBackup.wins === 7);
  await p.close();

  // ---------- 20: Schmale Displays ----------
  let narrowOk = true; const narrowInfo = [];
  for(const vp of [{ width:320, height:568 }, { width:360, height:640 }, { width:412, height:915 }]){
    p = await newPage(browser, vp, JSON.stringify({ ver:2, cleared:{ grass:true, forest:true, hills:true }, seen:{ flauschi:true, grollzahn:true } }));
    const check = async label => {
      const r = await p.evaluate(() => {
        const out = [];
        const s = document.querySelector('.screen.active');
        if(s.scrollWidth > s.clientWidth + 1) out.push('screen-hscroll ' + s.scrollWidth);
        document.querySelectorAll('.screen.active .menu-scroll, .screen.active .map-scroll').forEach(m => { if(m.scrollWidth > m.clientWidth + 1) out.push('scroll-hscroll'); });
        document.querySelectorAll('.screen.active .card .cname').forEach(c => { if(c.scrollWidth > c.clientWidth + 1) out.push('cname-overflow ' + c.textContent); });
        const btns = [...document.querySelectorAll('.screen.active button, .screen.active .card')].filter(b => b.offsetParent && b.getBoundingClientRect().width > 0 && !b.closest('.start-bg') && !b.closest('.critters') && !b.closest('.overlay:not(.active)') && !b.closest('.sheet:not(.open)'));
        btns.forEach(b => { const r = b.getBoundingClientRect(); if(r.right > window.innerWidth + 1 || r.left < -1) out.push('offscreen ' + (b.id || b.className)); });
        const hand = [...document.querySelectorAll('.screen.active #hand .card')].map(c => c.getBoundingClientRect());
        for(let i = 1; i < hand.length; i++) if(hand[i].left < hand[i - 1].right - 1) out.push('cards-overlap');
        return out;
      });
      if(r.length){ narrowOk = false; narrowInfo.push(vp.width + ' ' + label + ': ' + r.join(', ')); }
    };
    await check('start');
    for(const id of ['screen-deck','screen-dex','screen-settings','screen-monster']){ await p.click(`[data-screen="${id}"]`); await sleep(420); await check(id); await p.click(`#${id} [data-back]`); await sleep(380); }
    await p.click('#btn-play'); await sleep(420); await check('map');
    await openFight(p, 'hills'); await waitFight(p); await check('battle');
    await p.click('#btn-pause'); await sleep(250); await check('pause');
    await p.close();
  }
  ok('20 Schmale Displays bedienbar (kein Querscrollen, nichts abgeschnitten oder überlappend)', narrowOk, narrowInfo.join(' || '));

  // ---------- 22: Keine externen Bild- oder Sounddateien ----------
  const html = fs.readFileSync(FILE, 'utf8');
  const urls = (html.match(/https?:\/\/[^"'\s)]+/g) || []).filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(u) && !/^http:\/\/www\.w3\.org\/2000\/svg/.test(u));
  ok('22 Keine externen Bild- oder Sounddateien', urls.length === 0 && !/<img|<audio|<video|\.mp3|\.wav|\.ogg|\.png|\.jpe?g/i.test(html), urls.join(', '));

  ok('21 Keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} Tests bestanden`);
  fs.writeFileSync(process.argv[3] || 'test-results.json', JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('TEST-ABBRUCH', e); process.exit(2); });

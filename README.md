# Obedové menu v okolí fakulty

WEBTE1 – Zadanie č. 2, ZS 2026/2027 · Matej Schreiber

Stránka načíta týždenné menu troch jedální v Mlynskej doline, spracuje ho priamo v prehliadači
a zobrazí ho na jednom mieste podľa dní v týždni. Celé riešenie beží na strane klienta
(HTML, CSS, JavaScript).

## Spustenie

- Stránka sa otvára cez `index.html`. Menu sa načítava cez Fetch API, preto ju treba otvoriť
  cez webový server (napr. Live Server vo VS Code), nie priamo zo súboru (`file://`).
- Stránky reštaurácií sa načítavajú cez proxy (politika CORS). Adresy proxy sú v poli `webs`
  v `js/script.js`.
- Na ladenie spustí lokálne proxy servery skript `tools/proxy-servers.mjs`
  (`node tools/proxy-servers.mjs`, potrebuje `npm install -g local-cors-proxy`).
- Lokálne kópie stránok reštaurácií sú v priečinku `offline/`. Keď živá stránka nie je
  dostupná, menu sa načíta z lokálnej kópie a pri reštaurácii sa zobrazí štítok „Lokálna kópia“.
- Tlačidlo „Zobraziť len živé menu“ v pätičke skryje menu načítané z lokálnych kópií (takéto
  reštaurácie sa zobrazia ako prázdne); „Zobraziť lokálne kópie“ ich zobrazí znova. Voľba sa
  uloží do `localStorage`.

## Zdroje dát

| Reštaurácia | Živá stránka | Lokálna kópia |
| --- | --- | --- |
| Eat & Meet | <https://eatandmeet.sk/tyzdenne-menu> | `offline/EatAndMeet.html` |
| Jedáleň na Éčku (FEI STU) | <https://www.jedalen.stuba.sk/webkredit/> | `offline/FeiCanteen.html` |
| FiitFood | <http://www.freefood.sk/menu/#fiit-food> | `offline/FiitFood.html` |

Každá reštaurácia má vlastnú funkciu na spracovanie (`parseEat`, `parseFei`, `parseFiit`
v `js/script.js`). Načítaný HTML kód sa spracuje cez `DOMParser` a `querySelector` a všetky
vracajú rovnakú štruktúru: pole dní, v každom pole jedál (názov, alergény, typ, cena).
Spracované dáta sa ukladajú do `localStorage`.

## Štruktúra

| Súbor / priečinok | Obsah |
| --- | --- |
| `index.html` | Menu: výber dňa, celý týždeň, filter reštaurácií, aktualizácia |
| `o-projekte.html` | Podstránka O projekte: zdroje dát, spracovanie, knižnice |
| `css/styles.css` | Všetky štýly (svetlý a tmavý režim, responzívne rozloženie) |
| `js/script.js` | Načítanie, spracovanie a uloženie menu, zobrazenie v tabuľke |
| `js/motion.js` | Animácie (prepínanie dní, filter, načítavanie, pohyb pozadia) |
| `js/navigation.js` | Prechod medzi podstránkami (Swup) |
| `js/clear-data.js` | Vymazanie uložených dát s potvrdzovacím dialógom |
| `js/live-only.js` | Prepínanie medzi zobrazením len živých menu a zobrazením aj lokálnych kópií |
| `js/scrollbar.js`, `js/section-scroll.js` | Vlastný posuvník a posun k sekciám |
| `fonts/` | Lokálne fonty (`.woff2`) |
| `offline/` | Lokálne kópie stránok reštaurácií |
| `docs/` | Výstupy validátorov HTML a CSS |

## Knižnice

| Knižnica | Verzia | Na čo | Licencia |
| --- | --- | --- | --- |
| [Swup](https://swup.js.org/) a [Swup A11y Plugin](https://swup.js.org/plugins/a11y-plugin/) (JS) | 4.10.0 / 5.2.1 | Prechod medzi podstránkami bez opätovného načítania štýlov a skriptov, presun fokusu a oznámenie novej stránky čítačke obrazovky | MIT |
| [Open Props](https://open-props.style/) (CSS) | 1.7.23 | Krivka (easing) pomalého pohybu pozadia a jemná zrnitosť (noise), ktorá skrýva pruhy v prechode farieb | MIT |

Obe sa načítavajú z jsDelivr, s pevnou verziou a kontrolou integrity (`integrity`).

## Fonty

Fonty sú priložené lokálne cez `@font-face` vo formáte `.woff2`:

| Font | Použitie | Súbor | Licencia |
| --- | --- | --- | --- |
| Roboto | Text | `fonts/Roboto.woff2` | [SIL Open Font License 1.1](https://openfontlicense.org) |
| Lexend Zetta | Nadpisy | `fonts/LexendZetta.woff2` | [SIL Open Font License 1.1](https://openfontlicense.org) |

## Validácia

HTML je overené na <https://validator.w3.org/>, CSS na <https://jigsaw.w3.org/css-validator/>.
Výstupy oboch validátorov sú v priečinku `docs/`.

## Použitie AI nástrojov

Pri vypracovaní bol použitý AI nástroj **Claude Code** (Anthropic). Použitý bol na:

- návrh a implementáciu animovaného pozadia s knižnicou Open Props (prechod medzi dvoma tónmi,
  plochy s prehodenými farbami, jemné okraje hlavičiek reštaurácií, pozadie polievok),
- animácie (zatvorenie dialógu, správa po vymazaní dát, nábeh menu po načítaní),
- hľadanie a opravu chýb (výber dňa po aktualizácii, jediné načítanie pri novom dni, preskakovanie
  farieb pri prepínaní dní, posun tabuľky a filtra vo Firefoxe, prekrývanie dní v týždennom
  zobrazení),
- revíziu kódu a kontrolu riešenia voči zadaniu.

Za obsah a funkčnosť odovzdaného riešenia zodpovedá autor.

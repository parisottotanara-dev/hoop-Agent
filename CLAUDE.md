# Hoop Agent — istruzioni per continuare lo sviluppo

Claude Code legge questo file da solo all'inizio di ogni sessione su questo progetto. Tienilo aggiornato quando cambia qualcosa di importante.

## Il progetto in breve
- **Hoop Agent** è un gioco manageriale a turni, in italiano: sei il procuratore di giocatori di basket in una lega americana parodia.
- **Tecnologia:** HTML, CSS e JavaScript semplici, senza framework e senza build. Si installa sul telefono come app (PWA).
- **Proprietario:** l'utente parla italiano e non è un programmatore. Rispondigli in italiano, in modo semplice, senza gergo tecnico. Prima di chiudere un lavoro, provalo: ogni volta che è possibile mostragli screenshot e risultati dei test.
- **Obiettivo finale:** pubblicarlo su App Store e Google Play. La fase attuale è il test con persone vere (vedi "Cose da fare").

## Dove sta e come si pubblica
- **Progetto:** GitHub `parisottotanara-dev/hoop-Agent`, pubblico. Prima si chiamava `Agente-nba`.
- **Sito:** https://parisottotanara-dev.github.io/hoop-Agent/ (GitHub Pages).
- **Ramo:** il sito viene pubblicato dal ramo `claude/nba-agent-game-6bdwpp`, l'unico e quello predefinito. Ogni push su quel ramo va online da solo in circa un minuto. Lavora e fai push su quel ramo.
- **Nomi:** non rinominare il progetto né il ramo senza dirlo all'utente. Cambierebbe l'indirizzo, e chi ha installato l'app la perderebbe.
- **Copia nella chat:** c'è anche una copia privata dentro claude.ai, https://claude.ai/artifact/HK9QifuLeLSMqDC6nJ3BWB, solo per l'utente, con il salvataggio nel suo account Claude.
  - Per aggiornarla: `python3 tools/build_artifact.py /percorso/hoop-agent.html`, poi pubblica con lo strumento Artifact passando quell'URL come `url`.
  - Ai tester si dà sempre il link del sito, non questo.

## File principali
| File | Cosa contiene |
|---|---|
| `index.html` | Pagina, ordine degli script, registrazione del service worker, contatore GoatCounter |
| `style.css` | Tutto lo stile. In fondo c'è il tema "a riquadri" scelto dall'utente: ogni sezione nel suo riquadro, colori neutri, arancione solo su ciò che si tocca, niente scritte da sala giochi |
| `names.js` | Squadre, sponsor, celebrità e star parodia (`STARS`, `CELEBS`, `TEAMS`…), più `RENAMED`, la mappa dei nomi cambiati |
| `nations.js` | Nazionalità: nomi, città, frasi sulle origini (`NATIONS`, `STAR_NAT`, `CLUB_NAT`) |
| `events.js`, `events_extra.js` | Gli oltre 110 imprevisti, compresi quelli rari e quelli dei prospetti |
| `traits.js` | Caratteri dei giocatori, storie, imprevisti legati al carattere |
| `tuning.js` | Frequenze degli imprevisti |
| `records_data.js` | Record reali di partenza e leggende |
| `art.js` | Grafica in SVG: avatar, illustrazione della Home, icone (`ic(nome)`) |
| `game.js` | Tutta la logica e l'interfaccia (oggetto `UI`, tutorial `Tutorial`) |
| `sw.js` | Service worker: prima la rete, poi la copia salvata; l'app si aggiorna da sola |
| `manifest.webmanifest`, `icons/` | Nome e icone dell'app |
| `tools/` | Test e simulazioni (vedi sotto) |

**Ordine degli script** in `index.html` e in `tools/build_artifact.py`: names, nations, events, events_extra, traits, tuning, records_data, art, game. Se aggiungi un file JS, mettilo in tutti e due i posti e anche nella lista `APP` di `sw.js`.

## Regole da rispettare sempre
1. **Ad ogni rilascio** cambia il numero di `CACHE` in `sw.js` (ora `hoop-agent-v41`), così i telefoni scaricano la versione nuova.
2. **I salvataggi vecchi devono continuare a funzionare.**
   - Lo stato è l'oggetto globale `S`, salvato in localStorage con la chiave `SAVE_KEY = 'superAgenteNBA.save.v2'`. Non cambiare la chiave.
   - Ogni campo nuovo va gestito anche quando manca, nella riga `if (S) { ... }` in fondo a `game.js` e/o con valori predefiniti (`|| 0`).
   - Lo verifica `tools/test_phases.js` con il "salvataggio vecchio".
3. **Niente spiegazioni tecniche dentro il gioco.**
   - Il giocatore deve sapere come si gioca, non come funziona il motore. Niente frasi del tipo "+3% di probabilità" o "se ha 4 punti in più ruba minuti". Le cose si raccontano come nella realtà.
   - Eccezioni volute dall'utente: le **probabilità** e gli **effetti** delle scelte negli imprevisti, nell'incontro con un giocatore e nei consigli alle squadre restano in numeri.
4. **Scrivi come una persona, non come un'IA.**
   - Niente elenchi con emoji e grassetti a inizio riga, niente lineette lunghe (—), niente frasi a effetto vuote.
   - Il tono del gioco è ironico e scanzonato, ma i testi di presentazione devono far venire voglia di giocare e parlare del cuore del gioco: scoprire talenti, trattare, creare campioni.
5. **Niente emoji come icone nell'interfaccia.** Usa le icone SVG di `art.js` (`ic('nome')`). La funzione `deEmo()` toglie le emoji rimaste nei testi.
6. **Telefono prima di tutto.**
   - Tutto deve stare nello schermo di un iPhone SE (320 px) e di un iPhone 15. Lo controlla `tools/test_overflow.js`.
   - Lo zoom è disattivato. I campi di testo devono avere almeno 16 px, altrimenti iPhone ingrandisce da solo.
7. **Le cifre** si inseriscono con i pulsanti − e + oppure scrivendole a mano. Usa la funzione `stepper()`.
8. **Nomi parodia** con giochi di parole veri, non "aggiungi una o" (es. Wilt Ciambellano, Kyrie Eleison, Jalen Brunchson). Le celebrità non devono mai comparire negli imprevisti insieme a se stesse.

## Grafica (scelta dall'utente il 24/11/2026)
- **Riquadri** ben separati per ogni sezione (`.box`, `.card`, `.tile`), l'illustrazione del giocatore in Home resta.
- **Poche informazioni per pagina**: il resto va dietro pulsanti che aprono finestre o sottosezioni (`UI.tile`, `.subnav` in Lega e Staff, linguette nella scheda giocatore, "Mostra altri" nel Mercato). Non riallungare le pagine.

## Come provare le modifiche
Servono Node e Playwright (`require('playwright')`). Ogni script si lancia da solo, per esempio `node tools/test_phases.js`.
- `tools/test_phases.js`: apre tutte le schermate per 2 stagioni e carica un salvataggio vecchio. **Da lanciare sempre.**
- `tools/test_tutorial.js`: ogni passo del tutorial deve indicare qualcosa di visibile, senza che il fumetto lo copra.
- `tools/test_overflow.js`: nessuna schermata deve uscire dai bordi.
- `tools/test_save.js`: esporta e reimporta il salvataggio.
- `tools/test_trade.js`: lista delle squadre con i bisogni, proposta di scambio, rose aggiornate e giudizio dopo 8 settimane.
- `tools/test_playoff.js`: tabellone, partita in diretta (il risultato della telecronaca deve tornare con il tabellino), simulazioni e campioni.
- `tools/audit.js 50`: simula 50 stagioni e controlla che la lega resti sana (stipendi, rose, talento, promesse mantenibili). **Da lanciare dopo ogni cambio di bilanciamento.**
- `tools/exploit.js 12 [strategia]`: 11 bot con strategie diverse (camp, accademia, prestiti, bluff, avidità, investimenti, spendaccione…) cercano meccaniche troppo forti. I risultati cambiano molto da una partita all'altra: guarda le tendenze, non il singolo numero.

## Sistemi principali (per orientarsi in `game.js`)
- **Stagione:** free agency (3 settimane), stagione regolare (20), playoff, Draft. Ogni "Avanza" è una settimana con 4 partite.
- **Classifiche:** conference Est e Ovest (`EAST`, `confOf`, `confStandings`, `confRank`) e power ranking (`powerScore`, `powerSnapshot` salva la posizione della settimana prima). `t.last` tiene le ultime 10 partite.
- **Playoff:** sono l'evento finale e si giocano nella loro schermata (`UI.openPlayoffs`). Play-in (7ª-10ª), poi serie al meglio delle 7 con fattore campo. Lo stato sta in `S.po` (serie, teste di serie, statistiche, campioni, MVP delle Finali). Si può guardare una partita in diretta con telecronaca (`UI.poWatch`, `playByPlay`), simulare la giornata, il turno o saltare fino al campione (`UI.poSim`). Gare 7 evidenziate, record dei playoff in `S.records.po` (`poRecGame`). Premi e reputazione a fine playoff in `poFinish`. Nei test e nei bot `UI.autoPo = true` fa simulare i playoff senza schermata.
- **Soldi:** le commissioni sugli stipendi arrivano solo in stagione regolare (`weeklyIncomeIn(phase)`); gli sponsor arrivano tutto l'anno. In Home si mostra quanto entra questa settimana.
- **Trattative con i giocatori:** incontro (`openChance`, `startTalk`, con l'opzione incontro di lusso `luxChance`), commissione dal 2 al 4%, bonus alla firma (quello in eccesso compensa fino a mezzo punto di commissione), promesse da mantenere.
- **Reputazione che apre le porte:** ogni giocatore pretende una reputazione minima (`repNeeded`: cresce con la sua forza, il legame con un prospetto e la sede la abbassano). Fino a 14 punti sotto la probabilità d'incontro cala, oltre non ti risponde (`REP_GAP_MAX`); l'incontro di lusso concede 6 punti. Anche i livelli dello staff chiedono reputazione (`STAFF_REP`, `staffRepReq`). Con queste soglie il bot base arriva ai clienti 85+ dopo 6-9 stagioni.
- **È contento?:** `happiness(p)` per i clienti sotto contratto: minuti (rispetto a quanti se ne aspetta per la sua valutazione, `expMin`), stipendio (rispetto al valore di mercato) e squadra (vittorie o città, secondo `prefOf`), con il punto che per lui conta di più e cosa vuole. Si vede nella scheda (`UI.happyBox`) e con tre pallini nei Clienti; minuti e città spostano davvero il rapporto ogni settimana (`moraleDrift`).
- **Giocatori sempre toccabili:** nei playoff (diretta, risultati, campioni, note), nei risultati della settimana e nella serata del Draft i nomi aprono la scheda, che sta sopra queste schermate (`.modal` z-index 38). Le squadre del tabellone aprono la rosa.
- **Bisogni e scambi:** `teamNeeds(tid)` dice in quali ruoli una squadra ha più bisogno (confronto di titolare e riserva con il resto della lega); si vede quando consigli un giocatore. Per i clienti sotto contratto c'è lo scambio (`UI.tradeModal`, `tradeCands`, `tradeOdds`, `proposeTrade`): scegli squadra e contropartita, devono dire sì tutte e due, con tetto salariale rispettato. Mercato aperto in Free Agency e fino alla settimana 14. Uno scambio riuscito a stagione per giocatore. Dopo 8 settimane `tradeWeek` giudica: la squadra che ci ha guadagnato paga un premio (`tradeFee`, max 60k) e il rapporto sale; quella che ci ha perso abbassa il rapporto.
- **Trattative con le squadre:** forbice di valore, preferenze del giocatore, scadenze, asta e bluff, salary cap e apron.
- **Ruoli e minuti:** gerarchie per ruolo (`depthChart`): titolare, riserva, terzo. Le riserve forti giocano anche nel ruolo vicino, e gli infortuni fanno salire il sostituto dello stesso ruolo.
- **Carriera:** potenziale legato all'età (`potRoom`, `capPot`), crescita e declino (`developPlayer`), infortuni (`injuryHit`, `careFactor`). A fine estate `devNews` dà la notizia di chi è salito (festa, avviso "Sono cresciuti!") e di chi è sceso (avviso "In calo"); `p.dev` mette la freccia ↑/↓ accanto alla valutazione per tutta la stagione. Gli infortuni lunghi avvisano del calo di forma e del ritorno al top.
- **Concorrenza sui prospetti:** `rivalCourtWeek` fa corteggiare dalle agenzie rivali i primi 30 del Draft, sempre più spesso verso fine stagione (al Draft ne restano liberi circa 2-5 dei primi 10). Dopo 2-4 settimane `rivalDeadlines` decide: con legame 60+ il ragazzo dice sempre no, altrimenti firma con il rivale con probabilità 0,85 meno il legame.
- **Soffiate dell'informatore:** `S.intel` con tipo (`rival`, `bond`, `pot`). Scadono da sole (`intelValid`, `pruneIntel`): spariscono quando firmi il ragazzo, quando firma con un rivale, quando passa la scadenza o dopo il Draft. Per i rivali il testo si aggiorna ogni settimana (`intelText`) con tre livelli (`rivalStage`): ancora agli inizi, in contatto ravvicinato, questione di firme.
- **Osservare i prospetti:** `scout(pid)` costa 7k (12k all'estero), ogni livello della rete di scout toglie il 12%, massimo 4 a settimana (`SCOUT_MAX`, `scoutsLeft`).
- **Rosa delle squadre:** nella Lega i nomi delle squadre aprono `UI.teamModal(tid)` con i giocatori ruolo per ruolo, i bisogni e i conti.
- **Draft:** proiezione che si muove ogni settimana (`prospectWeek`, `draftBoard`), notizie sui prospetti, schermata della serata del Draft (`UI.showDraft`), ogni squadra con la sua lista.
- **Modi di spendere:** regali ai clienti (`GIFTS`), camp con leggende (`CAMPS`, rispettano il potenziale), staff e sede, accademia (serve reputazione 45), centro di allenamento, staff personale, campagne d'immagine, prestiti con rata ad ammortamento, quote delle squadre fino al 100%, fondazione.
- **Pareri e statistiche:** `FEEDBACK_URL` (in cima alla sezione "Pareri" di `game.js`), `track(evento)` per GoatCounter, `exportSave` / `copySaveCode` / `readSave` / `applyImport`.

## Cose da fare (al 23/11/2026)
1. **Link del modulo dei pareri:** l'utente deve creare un modulo su tally.so e mandare il link, da mettere in `FEEDBACK_URL` in `game.js`.
   - Campi nascosti già inviati dal gioco: `versione`, `stagione`, `stagioni_giocate`, `clienti`, `dispositivo`.
2. **Account GoatCounter:** l'utente deve crearlo con il codice **hoop-agent**. Lo script è già in `index.html`.
3. **Test con persone vere** (2-4 settimane): leggere i pareri e le statistiche, soprattutto i ritorni del giorno dopo.
4. **Prima degli store:**
   - **Proprietà intellettuale:** Apple e Google rifiutano spesso i giochi che richiamano persone e squadre reali. Vanno resi del tutto inventati star, squadre, celebrità e sponsor, va tolto "NBA" dai testi (la lega va chiamata in un altro modo) e i record reali vanno trasformati in record della lega con leggende inventate. Va discusso con l'utente prima di farlo.
   - **Pacchetti per gli store:** Google Play con TWA/PWABuilder, App Store con Capacitor e build nel cloud (l'utente non ha un Mac).
   - **Materiale richiesto:** pagina della privacy, icona 1024 px, screenshot, descrizione.
   - **Account:** Google Play Console (25 $) e Apple Developer (99 $/anno). Per gli account nuovi Google chiede un test chiuso con almeno 12 tester per 14 giorni.
5. **Idee rimaste aperte:** riscrivere gli imprevisti con un tono più vario e ironico, e magari un tema grafico meno "da IA" del nero e arancione. L'utente non ha ancora deciso.

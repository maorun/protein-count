# 🥗 Protein Counter

Eine einfache, schnelle und offline-fähige PWA zum täglichen Erfassen der Proteinzufuhr.

## Features

- **Tagesprotokoll** – Alle eingetragenen Mahlzeiten werden mit Uhrzeit gespeichert.
- **Tägliches Ziel** – Setze dein persönliches Proteinziel (Standard: 160 g).
- **Fortschrittsanzeige** – Fortschrittsbalken und prozentualer Überblick über das Tagesziel.
- **Quick-Add-Buttons** – Füge mit einem Klick schnell **+5 g** oder **+10 g** Protein hinzu.
- **Individuelle Lebensmittel** – Verwalte eigene Lebensmittel mit Icon, Name und Proteingehalt.
- **Favoriten** – Markiere häufig genutzte Lebensmittel als Favoriten für schnellen Zugriff.
- **Offline-Support (PWA)** – Funktioniert auch ohne Internetverbindung, installierbar auf dem Homescreen.

## Benutzung

1. App im Browser öffnen (oder auf dem Homescreen installieren).
2. Über **Quick Add** einen individuellen Grammwert eingeben und auf **＋ Add** tippen – oder direkt die Schnellzugabe-Buttons **＋5g** / **＋10g** verwenden.
3. Lebensmittel aus der Kachel-Ansicht (**Foods**) antippen, um den Proteingehalt automatisch einzutragen.
4. Über ⚙ **Settings** das tägliche Ziel anpassen.
5. Über 🍽 **Manage** Lebensmittel hinzufügen, bearbeiten oder löschen.
6. Über ↺ **Reset** den Tagesstand zurücksetzen.

## Lokale Entwicklung

Da es sich um eine reine HTML/CSS/JS-App ohne Build-Schritt handelt, genügt ein einfacher lokaler Webserver:

```bash
# mit Python
python3 -m http.server 8080

# oder mit Node.js (npx)
npx serve .
```

Anschließend die App unter `http://localhost:8080` im Browser öffnen.

## Technologie

| Technologie | Einsatz |
|---|---|
| HTML5 | Struktur |
| CSS3 | Styling (Dark-Mode, CSS-Variablen) |
| Vanilla JS | Applikationslogik |
| localStorage | Datenpersistenz |
| Service Worker | Offline-Unterstützung (PWA) |
| Web App Manifest | Homescreen-Installation |

## Lizenz

Siehe [LICENSE](LICENSE).

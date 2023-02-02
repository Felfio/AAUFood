# AAU Food

Eine Webseite zum Crawlen und Darstellen der Mittagsmenüs von Lokalen nahe der Alpen-Adria Universität Klagenfurt. Verfügbar unter [food.felf.io](https://food.felf.io/)

## Aktuell unterstützte Restaurants

-   Mensa Klagenfurt
-   Uniwirt
-   Hotspot
-   Bits&Bytes
-   Uni-Pizzeria

## Info

Die Menüs werden aus dem HTML der Webseiten der Restaurants geparst. Bei Anpassung der Struktur der Webseiten kann es dadurch zu Fehlern beim Parsen und in Folge zu Ausfällen bei der Anzeige von Menüs kommen.

AAU Food bietet eine JSON-API zur Abfrage von Menüs:
`/food/{restaurant}` und `/food/{restaurant}/{dayInWeek}`, wobei 0 <= dayInWeek <= 6

Aktuell:

-   `/food/hotspot`
-   `/food/bitsandbytes`
-   `/food/uniwirt`
-   `/food/mensa`
-   ~~`/food/unipizzeria`~~

## Technologien

-   pnpm als Package Manager
-   ExpressJS + EJS im Backend
-   Vite, Sass, Bootstrap im Frontend
-   ~~Frontend: EmberJS~~ (Wechsel zu Server-Side Rendering aufgrund von Performanceproblemen auf mobilen Geräten)
-   ~~Socket.IO für Live-Updates der Besucherzahlen~~ (entfernt aufgrund lästigen Cookiebanners sowie falschen Zählens bei Infoscreens mit deaktivierten Cookies)
-   ~~Redis~~ (entfernt bei Migration zu Vercel)

## Externe Dienste

-   [placekitten](http://placekitten.com) für zufällige Katzenbilder
-   [CatFacts API](http://catfacts-api.appspot.com/) für zufällige Fakten über Katzen
-   ~~[NumbersAPI](http://numbersapi.com/#42) für zufällige Fakten zu den Besucherzahlen~~

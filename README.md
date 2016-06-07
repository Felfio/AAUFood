# AAU Food
Eine Webseite zum Crawlen und Darstellen der Mittagsmenüs von Lokalen nahe der Alpen-Adria Universität Klagenfurt.

## Aktuell unterstützte Restaurants
* Mensa Klagenfurt
* Uniwirt
* Mittagstisch

## Info
Die Menüs werden aus dem HTML der Webseiten der Restaurants geparst. Bei Anpassung der Struktur der Webseiten kann es dadurch zu Fehlern beim Parsen und in Folge zu Ausfällen bei der Anzeige von Menüs kommen.

AAU Food bietet eine JSON-API zur Abfrage von Menüs:
```/food/{restaurant}``` und ```/food/{restaurant}/{dayInWeek}```, wobei 0 <= dayInWeek <= 6

Aktuell:
* ```/food/mittagstisch```
* ```/food/uniwirt```
* ```/food/mensa```

## Technologien
* ~~Frontend: EmberJS~~ (Wechsel zu Server-Side Rendering aufgrund von Performanceproblemen auf mobilen Geräten)
* NodeJS
* ExpressJS
* EJS
* Bootstrap 4 Alpha
* SASS


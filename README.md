# AAU Food
Eine Webseite zum Crawlen und Darstellen der Mittagsmenüs von Lokalen nahe der Alpen-Adria Universität Klagenfurt. Verfügbar unter [food.felf.io](https://food.felf.io/)

## Aktuell unterstützte Restaurants
* Mensa Klagenfurt
* Uniwirt
* Mittagstisch
* Uni-Pizzeria

## Info
Die Menüs werden aus dem HTML der Webseiten der Restaurants geparst. Bei Anpassung der Struktur der Webseiten kann es dadurch zu Fehlern beim Parsen und in Folge zu Ausfällen bei der Anzeige von Menüs kommen.

AAU Food bietet eine JSON-API zur Abfrage von Menüs:
```/food/{restaurant}``` und ```/food/{restaurant}/{dayInWeek}```, wobei 0 <= dayInWeek <= 6

Aktuell:
* ```/food/mittagstisch```
* ```/food/uniwirt```
* ```/food/mensa```
* ```/food/unipizzeria```

## Technologien
* ~~Frontend: EmberJS~~ (Wechsel zu Server-Side Rendering aufgrund von Performanceproblemen auf mobilen Geräten)
* NodeJS
* ExpressJS
* EJS
* Bootstrap 4 Alpha
* SASS
* Redis für das Cachen der Menüs
* Socket.IO für Live-Updates der Besucherzahlen

## Infos für Entwickler

Für die Weiterentwicklung von AAU Food muss `NodeJS` und `Redis` installiert sein. NodeJS Dependencies werden wie gewohnt mit `$ npm install` installiert, Web-Resources werden mit `$ npm run build` compiliert und der Server mit `$ node .` gestartet.

## Externe Dienste
* [placekitten](http://placekitten.com) für zufällige Katzenbilder
* [CatFacts API](http://catfacts-api.appspot.com/) für zufällige Fakten über Katzen
* [NumbersAPI](http://numbersapi.com/#42) für zufällige Fakten zu den Besucherzahlen

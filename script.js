const persons = [
  { key: "ich", pronoun: "ich", desc: "1. Person Singular" },
  { key: "du", pronoun: "du", desc: "2. Person Singular" },
  { key: "er", pronoun: "er", desc: "3. Person Singular" },
  { key: "sie", pronoun: "sie", desc: "3. Person Singular" },
  { key: "es", pronoun: "es", desc: "3. Person Singular" },
  { key: "wir", pronoun: "wir", desc: "1. Person Plural" },
  { key: "ihr", pronoun: "ihr", desc: "2. Person Plural" },
  { key: "sie_pl", pronoun: "sie", desc: "3. Person Plural" },
  { key: "Sie", pronoun: "Sie", desc: "Höflichkeitsform" }
];

const tenseMap = {
  praesens: "Präsens",
  praeteritum: "Präteritum",
  perfekt: "Perfekt",
  plusquamperfekt: "Plusquamperfekt",
  futur1: "Futur I",
  futur2: "Futur II",
  imperativ: "Imperativ",
  partizip1: "Partizip I",
  partizip2: "Partizip II"
};

let verbList = [];
let currentCategory = "regelmaessige_verben"; // Standardkategorie
let currentVerb = null;
let currentTenseKey = null;
let currentPerson = null;
let answerWasCorrect = false;
let allowedPersons;

async function loadVerbs(category = "regelmaessige_verben") {
  try {
    // Lade die Verben basierend auf der ausgewählten Kategorie
    if (category === "alle") {
      const categories = ["modalverben", "unregelmaessige_verben", "regelmaessige_verben", "hilfsverben", "zwei_partizipien_2"];
      const allVerbs = await Promise.all(
        categories.map(cat =>
          fetch(`data/${cat}.json`).then(res => res.json())
        )
      );
      verbList = allVerbs.flat();
    } else {
      const response = await fetch(`data/${category}.json`);
      verbList = await response.json();
    }
    updateExercise(); // direkt starten nach Laden
  } catch (error) {
    console.error("Fehler beim Laden der Verben:", error);
  }
}

function updateExercise() {
  answerWasCorrect = false; // Reset der Antwortstatus-Variable
  const tenseSelect = document.getElementById("tense-select").value;
  const tenses = Object.keys(tenseMap);
  let tries = 0;
  let hasForm = false;

  // Kopiere die Zeitformen, falls "random" ausgewählt ist
  let remainingTenses = tenseSelect === "random" ? [...tenses] : [tenseSelect];

  do {
    // Wähle eine zufällige Zeitform, wenn "random" aktiv ist
    if (tenseSelect === "random") {
      const randomIndex = Math.floor(Math.random() * remainingTenses.length);
      currentTenseKey = remainingTenses[randomIndex];
      remainingTenses.splice(randomIndex, 1); // Entferne die gewählte Zeitform
    } else {
      currentTenseKey = tenseSelect;
    }

    // Wähle ein zufälliges Verb
    currentVerb = verbList[Math.floor(Math.random() * verbList.length)];

    // Überprüfe, ob die Form existiert
    if (currentTenseKey === "partizip1" || currentTenseKey === "partizip2") {
      hasForm = currentVerb[currentTenseKey] !== undefined;
      currentPerson = null; // Person ist hier irrelevant
    } else if (currentTenseKey === "imperativ") {
      // Bei Imperativ nur "du" und "ihr" zulassen
      allowedPersons = persons.filter(p => p.key === "du" || p.key === "ihr");
      currentPerson = allowedPersons[Math.floor(Math.random() * allowedPersons.length)];
      hasForm = currentVerb.imperativ && currentVerb.imperativ[currentPerson.key] !== undefined;
    } else {
      // Für alle anderen Zeitformen: Überprüfen, ob die Form für die zufällige Person existiert
      currentPerson = persons[Math.floor(Math.random() * persons.length)];
      hasForm = currentVerb[currentTenseKey] && currentVerb[currentTenseKey][currentPerson.key] !== undefined;
    }

    tries++;
  } while (!hasForm && tries < 10 && remainingTenses.length > 0);

  if (!hasForm) {
    // Falls nach mehreren Versuchen keine passende Form gefunden wurde
    document.getElementById("infinitive").textContent = currentVerb.infinitiv;
    document.getElementById("tense").textContent = tenseMap[currentTenseKey] + " nicht vorhanden";
    document.getElementById("tense").style.color = "red"; // Fehlermeldung in Rot
    document.getElementById("person-desc").textContent = "-";
    document.getElementById("pronoun-label").textContent = "-";
  } else {
    // HTML aktualisieren
    document.getElementById("infinitive").textContent = currentVerb.infinitiv;
    document.getElementById("tense").textContent = tenseMap[currentTenseKey];
    document.getElementById("tense").style.color = "black"; // Standardfarbe
    const verbContainer = document.getElementById("verb-container");
    verbContainer.style.display = "block";

    // Person- und Zeitform-Informationen aktualisieren
    if (currentPerson) {
      if (currentTenseKey === "imperativ") {
        document.getElementById("person-desc").textContent = currentPerson.desc;
        document.getElementById("pronoun-label").textContent = `(${currentPerson.pronoun})`;
      } else {
        document.getElementById("person-desc").textContent = currentPerson.desc;
        document.getElementById("pronoun-label").textContent = currentPerson.pronoun;
      }
    } else {
      document.getElementById("person-desc").textContent = "-";
      document.getElementById("pronoun-label").textContent = "-";
    }

    document.getElementById("user-input").value = "";
    document.getElementById("feedback").textContent = "";
  }
}

// Überprüfen der Antwort, abhängig von der Zeitform und Person
function checkAnswer() {
  const input = document.getElementById("user-input").value.trim().toLowerCase();
  const feedback = document.getElementById("feedback");
  let correct;

  if (currentTenseKey === "partizip1" || currentTenseKey === "partizip2") {
    correct = currentVerb[currentTenseKey];
  } else if (currentTenseKey === "imperativ") {
    correct = currentVerb.imperativ[currentPerson.key];
  } else {
    correct = currentVerb[currentTenseKey][currentPerson.key];
  }

  let isCorrect = false;
  if (Array.isArray(correct)) {
    isCorrect = correct.some(a => a.toLowerCase() === input);
  } else if (typeof correct === "string") {
    isCorrect = input === correct.toLowerCase();
  }

  if (isCorrect) {
    feedback.textContent = `✅ Richtig! (${Array.isArray(correct) ? correct.join(" / ") : correct})`;
    feedback.style.color = "green";
    answerWasCorrect = true;
  } else {
    feedback.textContent = `❌ Falsch. Richtig: ${Array.isArray(correct) ? correct.join(" / ") : correct}`;
    feedback.style.color = "red";
  }
}

// Enter-Taste zum Überprüfen der Antwort oder zum Neuladen des Verbs
 document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (answerWasCorrect) {
      updateExercise();
    } else {
      checkAnswer();
    }
  }
});  

// Kategorie- und Zeitform-Selektoren ändern sich -> automatisches Neuladen der Verben
document.getElementById("verbCategory").addEventListener("change", (e) => {
  currentCategory = e.target.value;
  loadVerbs(currentCategory); // neue Verben laden
});
document.getElementById("tense-select").addEventListener("change", () => {
  updateExercise(); // Neue Aufgabe laden
});

//beim Laden der Seite wird die Standardkategorie abgefragt und geladen
window.onload = () => {
  const select = document.getElementById("verbCategory");
  currentCategory = select.value;
  loadVerbs(currentCategory);
};
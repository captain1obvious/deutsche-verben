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
let translations = {};
let currentLang = "de";
let currentCategory = "alle"; // Standardkategorie
let currentVerb = null;
let currentTenseKey = null;
let currentPerson = null;
let answerWasCorrect = false;
let allowedPersons;

async function loadVerbs(category = "alle") {
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

function loadTranslations() {
  fetch('data/translations.json')
    .then(response => response.json())
    .then(data => {
      translations = data;
      applyTranslations();
    });
}

function applyTranslations() {
  const t = translations[currentLang];
  if (!t) return;

  document.getElementById("title").textContent = t.title;
  document.getElementById("subtitle").textContent = t.subtitle;
  document.getElementById("verbCategory-label").textContent = t.verbCategory;
  document.getElementById("allCategories").textContent = t.allCategories;
  document.getElementById("regularVerbs").textContent = t.regularVerbs;
  document.getElementById("irregularVerbs").textContent = t.irregularVerbs;
  document.getElementById("modalVerbs").textContent = t.modalVerbs;
  document.getElementById("auxiliaryVerbs").textContent = t.auxiliaryVerbs;
  document.getElementById("twoParticiples").textContent = t.twoParticiples;
  document.getElementById("tenseSelect-label").textContent = t.tenseSelect;
  document.getElementById("random").textContent = t.random;
  document.getElementById("praesens").textContent = t.praesens;
  document.getElementById("praeteritum").textContent = t.praeteritum;
  document.getElementById("perfekt").textContent = t.perfekt;
  document.getElementById("plusquamperfekt").textContent = t.plusquamperfekt;
  document.getElementById("futur1").textContent = t.futur1;
  document.getElementById("futur2").textContent = t.futur2;
  document.getElementById("imperativ").textContent = t.imperativ;
  document.getElementById("partizip1").textContent = t.partizip1;
  document.getElementById("partizip2").textContent = t.partizip2;
  document.getElementById("infinitive-label").textContent = t.infinitive;
  document.getElementById("tense-label").textContent = t.tense;
  document.getElementById("person-label").textContent = t.person;
  document.getElementById("user-input").placeholder = t.inputPlaceholder;
  document.getElementById("check-btn").textContent = t.check;
  document.getElementById("newVerb-btn").textContent = t.newVerb;

  // Feedback ggf. übersetzen
  translateFeedback();

  // Infinitiv-Übersetzung anzeigen, falls Englisch
  if (currentLang !== "de" && currentVerb && currentVerb["translation_" + currentLang]) {
  document.getElementById("infinitive").textContent = `${currentVerb.infinitiv} (${currentVerb["translation_" + currentLang]})`;
}
}

function translateFeedback() {
  const feedback = document.getElementById("feedback");
  const t = translations[currentLang];
  if (!t) return;

  // Feedback-Text analysieren und übersetzen
  if (feedback.textContent.startsWith("✅ Richtig")) {
    // Richtige Antwort
    let correctForm = feedback.textContent.match(/\((.*)\)/);
    let correctText = correctForm ? correctForm[1] : "";
    feedback.textContent = `✅ ${t.correct}${correctText ? " (" + correctText + ")" : ""}`;
    feedback.style.color = "green";
  } else if (feedback.textContent.startsWith("❌ Falsch")) {
    // Falsche Antwort
    let correctForm = feedback.textContent.match(/Richtig: (.*)/);
    let correctText = correctForm ? correctForm[1] : "";
    feedback.textContent = `❌ ${t.incorrect}${correctText ? " ${t.correctLabel}: " + correctText : ""}`;
    feedback.style.color = "red";
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
    document.getElementById("infinitive").textContent = currentVerb.infinitiv;
    document.getElementById("tense").textContent = tenseMap[currentTenseKey] + " nicht vorhanden";
    document.getElementById("tense").style.color = "red";
    document.getElementById("person-desc").textContent = "-";
    document.getElementById("pronoun-label").textContent = "-";
  } else {
    // Infinitiv ggf. mit Übersetzung
    if (currentLang === "en" && currentVerb.translation) {
      document.getElementById("infinitive").textContent = `${currentVerb.infinitiv} (${currentVerb.translation})`;
    } else {
      document.getElementById("infinitive").textContent = currentVerb.infinitiv;
    }
    document.getElementById("tense").textContent = tenseMap[currentTenseKey];
    document.getElementById("tense").style.color = "black";
    const verbContainer = document.getElementById("verb-container");
    verbContainer.style.display = "block";

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

  const t = translations[currentLang];
  if (isCorrect) {
    feedback.textContent = `✅ ${t && t.correct ? t.correct : "Richtig!"} (${Array.isArray(correct) ? correct.join(" / ") : correct})`;
    feedback.style.color = "green";
    answerWasCorrect = true;
  } else {
    feedback.textContent = `❌ ${t && t.incorrect ? t.incorrect : "Falsch."} ${t && t.correctLabel ? t.correctLabel : "Richtig"}: ${Array.isArray(correct) ? correct.join(" / ") : correct}`;
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

document.getElementById("language-select").addEventListener("change", function() {
  currentLang = this.value;
  applyTranslations();
});

//beim Laden der Seite wird die Standardkategorie abgefragt und geladen
window.onload = () => {
  loadTranslations();
  const select = document.getElementById("verbCategory");
  currentCategory = select.value;
  loadVerbs(currentCategory);
};
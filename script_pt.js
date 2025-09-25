const persons = [
  { key: "eu", pronoun: "eu", desc: "1ª pessoa do singular" },
  { key: "tu", pronoun: "tu", desc: "2ª pessoa do singular" },
  { key: "ele", pronoun: "ele/ela/você/a gente", desc: "3ª pessoa do singular" },
  { key: "nós", pronoun: "nós", desc: "1ª pessoa do plural" },
  { key: "vós", pronoun: "vós", desc: "2ª pessoa do plural" },
  { key: "eles", pronoun: "eles/elas/vocês", desc: "3ª pessoa do plural" }
];

const tenseMap = {
  indicativo_presente: "Indicativo - Presente",
  indicativo_preterito_perfeito: "Indicativo - Pretérito perfeito",
  indicativo_preterito_imperfeito: "Indicativo - Pretérito imperfeito",
  indicativo_futuro_do_preterito: "Indicativo - Futuro do pretérito",
  indicativo_futuro_do_presente: "Indicativo - Futuro do presente",
  subjuntivo_presente: "Subjuntivo - Presente",
  subjuntivo_preterito_imperfeito: "Subjuntivo - Pretérito imperfeito",
  subjuntivo_futuro: "Subjuntivo - Futuro",
  imperativo_afirmativo: "Imperativo - Afirmativo",
  imperativo_negativo: "Imperativo - Negativo",
  participo: "Particípio",
  gerundio: "Gerúndio"
};

let verbList = [];
let translations = {};
let currentLang = "de";
let currentCategory = "todos"; // Standardkategorie
let currentVerb = null;
let currentTenseKey = null;
let currentPerson = null;
let answerWasCorrect = false;
let allowedPersons;
let brazilianMode = false;

async function loadVerbs(category = "todos") {
  try {
    // Lade die Verben basierend auf der ausgewählten Kategorie
    if (category === "todos") {
      const categories = ["verbos_irregulares", "verbos_regulares", "verbos_radical", "verbos_reflexivos"];
      const allVerbs = await Promise.all(
        categories.map(cat =>
          fetch(`data_pt/${cat}.json`).then(res => res.json())
        )
      );
      verbList = allVerbs.flat();
    } else {
      const response = await fetch(`data_pt/${category}.json`);
      verbList = await response.json();
    }
    updateExercise(); // direkt starten nach Laden
  } catch (error) {
    console.error("Fehler beim Laden der Verben:", error);
  }
}

function loadTranslations() {
  fetch('data_pt/translations_pt.json')
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
  document.getElementById("stemChangingVerbs").textContent = t.stemChangingVerbs;
  document.getElementById("reflexiveVerbs").textContent = t.reflexiveVerbs;
  document.getElementById("tenseSelect-label").textContent = t.tenseSelect;
  document.getElementById("random").textContent = t.random;
  document.getElementById("indicativo_presente").textContent = t.presente;
  document.getElementById("indicativo_preterito_perfeito").textContent = t.preterito_perfeito;
  document.getElementById("indicativo_preterito_imperfeito").textContent = t.preterito_imperfeito;
  document.getElementById("indicativo_futuro_do_preterito").textContent = t.futuro_do_preterito;
  document.getElementById("indicativo_futuro_do_presente").textContent = t.futuro_do_presente;
  document.getElementById("subjuntivo_presente").textContent = t.subjuntivo_presente;
  document.getElementById("subjuntivo_preterito_imperfeito").textContent = t.subjuntivo_preterito_imperfeito;
  document.getElementById("subjuntivo_futuro").textContent = t.subjuntivo_futuro;
  document.getElementById("imperativo_afirmativo").textContent = t.imperativo_afirmativo;
  document.getElementById("imperativo_negativo").textContent = t.imperativo_negativo;
  document.getElementById("participo").textContent =t.participo;
  document.getElementById("gerundio").textContent = t.gerundio;
  document.getElementById("infinitive-label").textContent = t.infinitive;
  document.getElementById("tense-label").textContent = t.tense;
  document.getElementById("person-label").textContent = t.person;
  document.getElementById("user-input").placeholder = t.inputPlaceholder;
  document.getElementById("check-btn").textContent = t.check;
  document.getElementById("newVerb-btn").textContent = t.newVerb;

  // Feedback ggf. übersetzen
  translateFeedback();

  if (currentLang !== "pt" && currentVerb && currentVerb["translation_" + currentLang]) {
    document.getElementById("infinitive").textContent = `${currentVerb.infinitivo} (${currentVerb["translation_" + currentLang]})`;
  } else {
    document.getElementById("infinitive").textContent = currentVerb.infinitivo;
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
  
  // Alle Zeitformen holen
  let tenses = Object.keys(tenseMap);

  // 🔎 Filter für Brazilian Mode
  if (brazilianMode) {
    tenses = tenses.filter(t => t !== "imperativo_negativo");
  }

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
    if (currentTenseKey === "participo" || currentTenseKey === "gerundio") {
      hasForm = currentVerb[currentTenseKey] !== undefined;
      currentPerson = null; // Person ist hier irrelevant

    } else if (currentTenseKey === "imperativo_afirmativo" || currentTenseKey === "imperativo_negativo") {
      // Bei Imperativ nur bestimmte Personen zulassen
      let allowedPersons = persons.filter(
        p => p.key === "tu" || p.key === "ele" || p.key === "nós" || p.key === "vós" || p.key === "eles"
      );

      // 🔎 Brazilian Mode filtert "tu", "nós" und "vós"
      if (brazilianMode) {
        allowedPersons = allowedPersons.filter(p => p.key !== "tu" && p.key !== "nós" && p.key !== "vós");
      }

      currentPerson = allowedPersons[Math.floor(Math.random() * allowedPersons.length)];
      // Wenn es eine positive Form ist, wird es auch eine negative geben
      hasForm = currentVerb.imperativo_afirmativo && currentVerb.imperativo_afirmativo[currentPerson.key] !== undefined;

    } else {
      // Für alle anderen Zeitformen
      let availablePersons = [...persons];

      // 🔎 Brazilian Mode filtert "tu", "nós" und "vós"
      if (brazilianMode) {
        availablePersons = availablePersons.filter(p => p.key !== "tu" && p.key !== "nós" && p.key !== "vós");
      }

      currentPerson = availablePersons[Math.floor(Math.random() * availablePersons.length)];
      hasForm = currentVerb[currentTenseKey] && currentVerb[currentTenseKey][currentPerson.key] !== undefined;
    }

    tries++;
  } while (!hasForm && tries < 10 && remainingTenses.length > 0);

  if (!hasForm) {
    document.getElementById("infinitive").textContent = currentVerb.infinitivo;
    document.getElementById("tense").textContent = tenseMap[currentTenseKey] + " nicht vorhanden";
    document.getElementById("tense").style.color = "red";
    document.getElementById("person-desc").textContent = "-";
    document.getElementById("pronoun-label").textContent = "-";
  } else {
    // Infinitiv ggf. mit Übersetzung
    if (currentLang !== "pt" && currentVerb && currentVerb["translation_" + currentLang]) {
      document.getElementById("infinitive").textContent = `${currentVerb.infinitivo} (${currentVerb["translation_" + currentLang]})`;
    } else {
      document.getElementById("infinitive").textContent = currentVerb.infinitivo;
    }

    document.getElementById("tense").textContent = tenseMap[currentTenseKey];
    document.getElementById("tense").style.color = "black";
    const verbContainer = document.getElementById("verb-container");
    verbContainer.style.display = "block";

    if (currentPerson) {
      if (currentTenseKey === "imperativo_afirmativo" || currentTenseKey === "imperativo_negativo") {
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

  if (currentTenseKey === "participo" || currentTenseKey === "gerundio") {
    correct = currentVerb[currentTenseKey];
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

// Einstellung des neuen Hintergrunds und der reduzierten Zeitformen im brasilianischen Modus
function updateBrazilianSettings() {
  document.body.classList.toggle("br-bg", brazilianMode);

  const tenseSelect = document.getElementById("tense-select");
  if (tenseSelect) {
    const negOption = tenseSelect.querySelector('option[value="imperativo_negativo"]');
    if (negOption) {
      negOption.style.display = brazilianMode ? "none" : "block";
    }
  }
}

// Logik für die Buttons zum Einfügen spezieller Zeichen
window.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("user-input");

  document.querySelectorAll(".special-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); // verhindert ungewollten Submit
      insertAtCursor(inputField, btn.innerText);
    });
  });

  function insertAtCursor(field, char) {
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    const text = field.value;

    field.value = text.slice(0, start) + char + text.slice(end);
    field.focus();
    field.setSelectionRange(start + char.length, start + char.length);
  }
});

// Aktualisieren der Einstellungen für den brasilianischen Modus
document.getElementById("brazilianMode").addEventListener("change", (e) => {
  brazilianMode = e.target.checked;
  updateBrazilianSettings();
  updateExercise(); // neue Aufgabe generieren mit reduzierten Formen
});

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

// Sprachwechsel für das Interface
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
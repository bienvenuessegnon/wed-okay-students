const TAGS =
  "Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi · Agence de Développement des Petites et Moyennes Entreprises (ADPME) · Global Entrepreneurship Network · GEW Benin · Olusegun Charles Vidjannagni";

const HASHTAGS =
  "#WED2026 #WomenEntrepreneurshipDay #GEW2026 #OKAYStudents #MEB2026 #GEWBenin #EtupreneursCitoyens";

export function displayName(student) {
  const prenoms = (student.prenoms || "").trim();
  const nom = (student.nom || "").trim();
  if (!prenoms && !nom) return "";
  return [prenoms, nom ? nom.toUpperCase() : ""].filter(Boolean).join(" ");
}

function clean(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function sentence(value) {
  const v = clean(value);
  if (!v) return "";
  const first = v.charAt(0).toUpperCase() + v.slice(1);
  return /[.!?…]$/.test(first) ? first : `${first}.`;
}

/** Official message from OKAY Students, personalised with the form fields. */
export function buildPublicationText(student) {
  const name = displayName(student) || "[Votre nom]";
  const filiere = clean(student.filiere) || "[votre filière / spécialité]";
  const univ = clean(student.universite) || "[nom de votre université ou établissement]";
  const activite = sentence(student.activite);

  const paragraphs = [
    "🌍👩‍🎓 JE ME JOINS À DES MILLIONS D'ÉTUDIANTES À TRAVERS LE MONDE POUR CÉLÉBRER LA JOURNÉE MONDIALE DE L'ENTREPRENEURIAT FÉMININ !",
    `Je suis ${name}, étudiante en ${filiere} à ${univ}, au Bénin. 🇧🇯`,
    activite,
    "En ce 19 novembre, à l'occasion du Women's Entrepreneurship Day (WED) en pleine Semaine mondiale de l'entrepreneuriat dans 200 pays et du Mois de l'Entrepreneuriat au Bénin (MEB), je célèbre toutes ces jeunes étudiantes qui osent entreprendre, innover, créer des opportunités, transformer leurs communautés et contribuer au développement de nos sociétés.",
    "Je suis convaincue que les étudiantes d'aujourd'hui peuvent devenir les grandes entrepreneures, dirigeantes, innovatrices et actrices du changement de demain.",
    "Je souhaite contribuer à promouvoir l'entrepreneuriat féminin à l'université, encourager les étudiantes à croire en leur potentiel et faire rayonner mon établissement ainsi que le Bénin au sein d'un réseau international de femmes engagées.",
    "🌍🇧🇯 Je suis prête à apprendre, à entreprendre, à m'engager et à représenter mon campus au-delà des frontières !",
    "À toutes les étudiantes béninoises qui partagent cette ambition, rejoignons-nous !",
    "Happy Women's Entrepreneurship Day!",
  ];

  return `${paragraphs.filter(Boolean).join("\n\n")}\n\n${TAGS}\n\n${HASHTAGS}`;
}

const THEME =
  "Former, accompagner et libérer le potentiel entrepreneurial des femmes";

export { THEME, TAGS, HASHTAGS };


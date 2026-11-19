const THEME =
  "Former, accompagner et libérer le potentiel entrepreneurial des femmes";

const TAGS =
  "Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi · Agence de Développement des Petites et Moyennes Entreprises (ADPME) · Global Entrepreneurship Network · GEW Benin · Olusegun Charles Vidjannagni";

const HASHTAGS =
  "#WED2026 #WomenEntrepreneurshipDay #GEW2026 #OKAYStudents #MEB2026 #GEWBenin #EtupreneursCitoyens";

export const TEXT_VARIANTS = [
  { id: "formel", label: "Formel" },
  { id: "dynamique", label: "Dynamique" },
  { id: "court", label: "Court" },
];

export function displayName(student) {
  const prenoms = (student.prenoms || "").trim();
  const nom = (student.nom || "").trim();
  if (!prenoms && !nom) return "";
  return [prenoms, nom ? nom.toUpperCase() : ""].filter(Boolean).join(" ");
}

function identityLine(student) {
  const name = displayName(student) || "[Prénoms NOM]";
  const filiere = (student.filiere || "").trim() || "[filière]";
  const annee = (student.annee || "").trim() || "[année d'étude]";
  const univ = (student.universite || "").trim() || "[université]";
  return { name, filiere, annee, univ };
}

function projetLine(student) {
  const projet = (student.projet || "").trim();
  return projet ? `Mon projet : ${projet}` : "";
}

function joinParagraphs(parts) {
  return parts.filter(Boolean).join("\n\n");
}

export function buildPublicationText(student, variant = "formel") {
  const { name, filiere, annee, univ } = identityLine(student);
  const projet = projetLine(student);
  let body;

  if (variant === "dynamique") {
    body = joinParagraphs([
      `Moi, c'est ${name}, en ${filiere} (${annee}) à ${univ}.`,
      projet,
      "Et je suis fière d'appartenir à OKAY Students, sous l'égide du Réseau Mondial de l'Entrepreneuriat (Global Entrepreneurship Network) basé aux États-Unis. Nous sommes parmi les étudiantes et étudiants qui organisent la Semaine mondiale de l'Entrepreneuriat, célébrée dans 200 pays à travers le monde : un événement retenu et intégré au programme national du Mois de l'Entrepreneuriat au Bénin (MEB) par le Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi.",
      `En cette Journée mondiale de l'entrepreneuriat féminin, le 19 novembre 2026, dans le cadre de la Semaine mondiale de l'Entrepreneuriat (16 au 23 novembre 2026), autour du thème « ${THEME} », nous célébrons les Étupreneures Citoyennes — les étudiantes qui conçoivent, fabriquent et commercialisent des articles, produits et/ou services. Notre but : créer un environnement propice pour libérer les idées des étudiantes.`,
      "Rejoignez-nous, ce n'est que le début ! OKAY Students, c'est une panoplie d'événements éducatifs, sportifs, ludiques, artistiques et culturels tout au long de l'année.",
      "Et toi étudiante, as-tu une idée, un projet, un business ? Parle-nous en !",
    ]);
  } else if (variant === "court") {
    body = joinParagraphs([
      `${name} · ${filiere} · ${annee} · ${univ}`,
      projet,
      "Fière membre de OKAY Students, sous l'égide du Réseau Mondial de l'Entrepreneuriat (Global Entrepreneurship Network) basé aux États-Unis. Nous organisons la Semaine mondiale de l'Entrepreneuriat, célébrée dans 200 pays à travers le monde, un événement retenu et intégré au programme national du Mois de l'Entrepreneuriat au Bénin (MEB) par le Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi.",
      `19 novembre 2026 — Journée mondiale de l'entrepreneuriat féminin, dans le cadre de la GEW (16 – 23 novembre 2026) · « ${THEME} ». Nous célébrons les Étupreneures Citoyennes : les étudiantes qui conçoivent, fabriquent et commercialisent des articles, produits et/ou services, et nous créons un environnement propice pour libérer leurs idées.`,
      "Rejoignez-nous, ce n'est que le début. OKAY Students propose toute l'année une panoplie d'événements éducatifs, sportifs, ludiques, artistiques et culturels.",
      "Et toi étudiante, as-tu une idée, un projet, un business ? Parle-nous en !",
    ]);
  } else {
    body = joinParagraphs([
      `${name}, ${filiere}, ${annee}, ${univ}.`,
      projet,
      "Je suis fière d'être membre de OKAY Students, sous l'égide du Réseau Mondial de l'Entrepreneuriat (Global Entrepreneurship Network) basé aux États-Unis. À ce titre, je fais partie des étudiantes et étudiants qui organisent la Semaine mondiale de l'Entrepreneuriat, célébrée dans 200 pays à travers le monde — un événement retenu et intégré au programme national du Mois de l'Entrepreneuriat au Bénin (MEB) par le Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi.",
      `En cette Journée mondiale de l'entrepreneuriat féminin du 19 novembre 2026, dans le cadre de la Semaine mondiale de l'Entrepreneuriat (du 16 au 23 novembre 2026), autour du thème « ${THEME} », nous célébrons les Étupreneures Citoyennes, c'est-à-dire les étudiantes qui conçoivent, fabriquent et commercialisent des articles, produits et/ou services. Nous créons un environnement propice pour libérer les idées des étudiantes.`,
      "Rejoignez-nous, car ce n'est que le début : OKAY Students, c'est une panoplie d'événements éducatifs, sportifs, ludiques, artistiques et culturels tout au long de l'année.",
      "Et toi étudiante, as-tu une idée, un projet, un business ? Parle-nous en !",
    ]);
  }

  return `${body}\n\n${TAGS}\n\n${HASHTAGS}`;
}

export function allVariants(student) {
  return Object.fromEntries(
    TEXT_VARIANTS.map((v) => [v.id, buildPublicationText(student, v.id)])
  );
}

/** Used in tests to verify the five mandatory points. */
export function mandatoryCoverage(text) {
  const checks = {
    identite: /filière|Licence|Master|Université|\[filière\]|\[université\]/i.test(
      text
    ),
    okayGen:
      /OKAY Students/i.test(text) &&
      /Réseau Mondial de l'Entrepreneuriat/i.test(text) &&
      /Global Entrepreneurship Network/i.test(text) &&
      /États-Unis|USA/i.test(text) &&
      /200 pays/i.test(text) &&
      /Mois de l'Entrepreneuriat au Bénin/i.test(text) &&
      /Ministère des Petites et Moyennes Entreprises et de la Promotion de l'Emploi/i.test(
        text
      ),
    themeDates:
      /19 novembre 2026/i.test(text) &&
      /Journée mondiale de l'entrepreneuriat féminin/i.test(text) &&
      /16/.test(text) &&
      /23 novembre 2026/i.test(text) &&
      /Former, accompagner et libérer le potentiel entrepreneurial des femmes/.test(
        text
      ) &&
      /Étupreneur/i.test(text) &&
      /conçoivent, fabriquent et commercialisent/.test(text) &&
      /environnement/.test(text),
    rejoignez:
      /Rejoignez-nous/i.test(text) &&
      /ce n'est que le début/i.test(text) &&
      /éducatifs, sportifs, ludiques, artistiques et culturels/i.test(text),
    appel: /as-tu une idée, un projet, un business \? Parle-nous en !/.test(text),
  };
  return checks;
}

export { THEME, TAGS, HASHTAGS };

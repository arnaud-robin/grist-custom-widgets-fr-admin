export const COLUMN_MAPPING_NAMES = {
  DATE_HEURE_DEPART: {
    name: "date_heure_depart",
    title: "Date et heure de départ",
    type: "DateTime",
    optional: true,
    form_field: {
      date: "date départ étape 3",
      time: "heure départ étape 4",
    },
  },
  DATE_HEURE_ARRIVEE: {
    name: "date_heure_arrivee",
    title: "Date et heure d'arrivée",
    type: "DateTime",
    optional: true,
    form_field: {
      date: "date arrivée étape 3",
      time: "heure arrivée étape 4",
    },
  },
  NUITEES: {
    name: "nuitees",
    title: "Nombre de nuitées",
    type: "Int",
    optional: true,
    form_field: "nuité gratuite",
  },
  REPAS: {
    name: "repas",
    title: "Nombre de repas",
    type: "Int",
    optional: true,
    form_field: "repas gratuit",
  },
  BILLET_MISSIONE: {
    name: "billet_missione",
    title: "Billet pris par le missionné",
    type: "Bool",
    optional: true,
    form_field: "Billet pris par le missionné",
  },
  TRANSPORT_COMMUN: {
    name: "transport_commun",
    title: "Ticket de transport en commun",
    type: "Bool",
    optional: true,
    form_field: "Ticket de transport en commun",
  },
  HOTEL_MISSIONE: {
    name: "hotel_missione",
    title: "Hôtel à la charge du missionné",
    type: "Bool",
    optional: true,
    form_field: "Hôtel à la charge du missionné",
  },
  AUTRES_DEPENSES: {
    name: "autres_depenses",
    title: "Autres dépenses",
    type: "Text",
    optional: true,
    form_field: {
      Autre: "Autres précisez",
      Precision: "précisez à 2",
    },
  },
  SIGNATURE: {
    name: "signature",
    title: "Signature",
    type: "Attachments",
    optional: true,
    form_field: {
      x: 200,
      y: 50,
      maxHeight: 30,
    },
  },
  SIGNATURE_DATE: {
    name: "signature_date",
    title: "Date de signature",
    type: "Date",
    optional: true,
    form_field: "le 2",
  },
  SIGNATURE_LIEU: {
    name: "signature_lieu",
    title: "Lieu de signature",
    type: "Text",
    optional: true,
    form_field: "Fait à 2",
  },
  PDF_INPUT: {
    name: "pdf_input",
    title: "Ordre de mission signé manager (fichier)",
    type: "Attachments",
    optional: false,
    form_field: null,
  },
  PDF_OUTPUT: {
    name: "pdf_output",
    title: "État de frais final (fichier)",
    type: "Attachments",
    optional: false,
    form_field: null,
  },
} as const;

export const TITLE = "Générateur d'état de frais";

export const NO_DATA_MESSAGES = {
  NO_MAPPING: "Veuillez configurer les colonnes dans les paramètres du widget.",
  NO_RECORDS: "Veuillez sélectionner une ligne à traiter.",
};

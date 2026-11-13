export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  ex: string;
}
export interface Fiche {
  id: string;
  title: string;
  /** catégories de la banque liées à la fiche (maîtrise calculée sur tes réponses) */
  categories: string[];
  intro: string;
  points: string[];
  examples: [string, string][];
  traps: string[];
  quiz: QuizItem[];
}

export const FICHES: Fiche[] = [
  {
    id: 'tenses', title: 'Temps verbaux : repères clés', categories: ['verb-tense'],
    intro: "Au TOEIC, le temps se choisit grâce aux indicateurs de temps de la phrase. Repère-les avant de lire les options.",
    points: [
      'Présent simple : habitudes, vérités, horaires (The train leaves at 8).',
      'Présent continu : action en cours ou futur planifié (We are meeting the client tomorrow).',
      'Futur : will + base ; be going to (intention) ; will be + -ing (action en cours dans le futur).',
      'Futur antérieur : will have + participe passé, avec « by the time / by + date future ».',
      'Past perfect : had + participe passé = action antérieure à une autre action passée.',
      'Après when, before, after, as soon as, by the time, until + futur → présent simple (jamais will).',
    ],
    examples: [
      ['By next March, we will have opened three new stores.', "D'ici mars prochain, nous aurons ouvert trois magasins."],
      ['When the client arrives, please call me.', 'Quand le client arrivera, appelle-moi (présent après when).'],
      ['The meeting had already started when I arrived.', 'La réunion avait déjà commencé quand je suis arrivée.'],
    ],
    traps: ['« When he will arrive » est fautif dans une subordonnée de temps.', '« By the time » + futur → will have done dans la principale.'],
    quiz: [
      { q: 'As soon as the shipment ____, we will notify you.', options: ['will arrive', 'arrives', 'arrived', 'is arriving to'], answer: 1, ex: 'Après « as soon as » à valeur future : présent simple → arrives.' },
      { q: 'By the end of the year, the team ____ the new system.', options: ['implements', 'has implemented', 'will have implemented', 'implemented'], answer: 2, ex: '« By the end of the year » (futur) + action achevée → futur antérieur.' },
      { q: 'When I called, she ____ the office already.', options: ['had left', 'has left', 'leaves', 'will leave'], answer: 0, ex: 'Action antérieure à une autre action passée → past perfect.' },
    ],
  },
  {
    id: 'perfect', title: 'Present perfect ou prétérit ?', categories: ['verb-tense'],
    intro: "Le français « j'ai fait » se traduit par deux temps différents. Le choix dépend de la période : terminée ou non.",
    points: [
      'Prétérit (did) : période terminée et datée — yesterday, last week, in 2023, ago, when I was…',
      'Present perfect (have done) : période non terminée ou lien avec le présent — since, for, so far, yet, already, recently, this year, three times.',
      'Present perfect continu (have been doing) : durée d\'une action qui continue.',
      'Since + point de départ (since May) ; for + durée (for three months).',
    ],
    examples: [
      ['Sales have increased since the campaign started.', 'Les ventes augmentent depuis le début de la campagne.'],
      ['Sales increased last quarter.', 'Les ventes ont augmenté le trimestre dernier (période terminée).'],
      ['She has been working here for six years.', 'Elle travaille ici depuis six ans.'],
    ],
    traps: ['« Since » ne s\'emploie jamais avec le présent simple : *I work here since 2020.', '« Ago » impose le prétérit : two years ago → hired.'],
    quiz: [
      { q: 'Ms. Diaz ____ for the company since 2019.', options: ['works', 'worked', 'has worked', 'is working'], answer: 2, ex: '« Since 2019 » → present perfect.' },
      { q: 'The firm ____ its new logo two weeks ago.', options: ['has unveiled', 'unveiled', 'unveils', 'has been unveiling'], answer: 1, ex: '« Ago » → prétérit.' },
      { q: 'So far this year, we ____ 40 new clients.', options: ['signed', 'have signed', 'sign', 'had signed'], answer: 1, ex: '« So far this year » : période non terminée → present perfect.' },
    ],
  },
  {
    id: 'passive', title: 'La voix passive', categories: ['passive'],
    intro: "Question à se poser : le sujet fait-il l'action ou la subit-il ? S'il la subit → be + participe passé.",
    points: [
      'Forme : be (au temps voulu) + participe passé : is done, was done, has been done, will be done, is being done.',
      'Complément d\'agent avec by : The report was written by Ms. Lee.',
      'Indice clé : pas de complément d\'objet après le blanc → souvent passif.',
      'Verbes intransitifs (arrive, happen, occur, rise) n\'ont jamais de passif.',
    ],
    examples: [
      ['The invoices are processed every Friday.', 'Les factures sont traitées chaque vendredi.'],
      ['The road is being repaired this week.', 'La route est en cours de réparation cette semaine.'],
      ['All applications must be submitted online.', 'Toutes les candidatures doivent être soumises en ligne.'],
    ],
    traps: ['« Is being + participe » = action en cours (Part 1 : impossible sans personne visible).', '*The problem was occurred : occur est intransitif.'],
    quiz: [
      { q: 'The new branch ____ next spring.', options: ['will open by', 'will be opened', 'opens to', 'is opening by'], answer: 1, ex: 'La succursale est ouverte (par l\'entreprise) → passif futur.' },
      { q: 'The results ____ to all staff yesterday.', options: ['sent', 'were sent', 'have sent', 'sending'], answer: 1, ex: 'Les résultats subissent l\'action, période terminée → were sent.' },
      { q: 'An error ____ during the update.', options: ['was occurred', 'occurred', 'has been occurred', 'is occurred'], answer: 1, ex: '« Occur » est intransitif : pas de passif.' },
    ],
  },
  {
    id: 'conditionals', title: 'Conditionnels', categories: ['modal-conditional'],
    intro: "Trois structures à reconnaître instantanément, plus l'inversion (Should / Had) très fréquente en Part 5 de haut niveau.",
    points: [
      '1er : If + présent, will + base (réel / futur probable).',
      '2e : If + prétérit, would + base (hypothétique présent). If I were…',
      '3e : If + past perfect, would have + participe (irréel du passé).',
      'Inversions formelles : Should you need help = If you need help ; Had we known = If we had known.',
      'Unless = if… not ; provided (that) / as long as = à condition que.',
    ],
    examples: [
      ['Should you have any questions, please contact us.', 'Si vous avez des questions, contactez-nous.'],
      ['Had we left earlier, we would have caught the train.', 'Si nous étions partis plus tôt, nous aurions eu le train.'],
      ['We will ship today provided that payment is received.', 'Nous expédions aujourd\'hui à condition de recevoir le paiement.'],
    ],
    traps: ['Jamais « will / would » dans la proposition en if.', '« Unless » contient déjà la négation : *unless you don\'t…'],
    quiz: [
      { q: '____ you require further information, please call our office.', options: ['Should', 'Would', 'Unless', 'Had'], answer: 0, ex: 'Inversion de « If you require » → Should you require.' },
      { q: 'If the budget ____ approved, we would have started in May.', options: ['was', 'had been', 'would be', 'has been'], answer: 1, ex: '3e conditionnel → past perfect.' },
      { q: 'The offer is valid ____ stocks last.', options: ['unless', 'as long as', 'even if', 'so that'], answer: 1, ex: '« As long as » = tant que / à condition que.' },
    ],
  },
  {
    id: 'modals', title: 'Modaux', categories: ['modal-conditional'],
    intro: 'Les modaux sont suivis de la base verbale (sans to) et expriment obligation, conseil, possibilité ou déduction.',
    points: [
      'Obligation : must, have to ; absence d\'obligation : don\'t have to / need not.',
      'Interdiction : must not / may not.',
      'Conseil : should, ought to, had better.',
      'Possibilité : may, might, could. Capacité : can, be able to.',
      'Regret / reproche passé : should have + participe ; déduction passée : must have + participe.',
    ],
    examples: [
      ['Visitors must sign in at reception.', 'Les visiteurs doivent s\'enregistrer à l\'accueil.'],
      ['You don\'t have to print the tickets.', 'Tu n\'es pas obligé(e) d\'imprimer les billets.'],
      ['We should have ordered more paper.', 'Nous aurions dû commander plus de papier.'],
    ],
    traps: ['*must to / *can to : jamais de « to » après un modal.', 'must not (interdit) ≠ don\'t have to (pas obligatoire).'],
    quiz: [
      { q: 'Employees ____ wear a badge at all times.', options: ['must', 'must to', 'have', 'ought'], answer: 0, ex: 'Obligation + base verbale → must wear.' },
      { q: 'The file is not here; Tom ____ it home.', options: ['must take', 'must have taken', 'should take', 'can take'], answer: 1, ex: 'Déduction sur le passé → must have + participe.' },
      { q: 'You ____ book in advance; there are plenty of seats.', options: ['must not', 'don\'t have to', 'can\'t', 'had better'], answer: 1, ex: 'Absence d\'obligation → don\'t have to.' },
    ],
  },
  {
    id: 'prepositions', title: 'Prépositions essentielles', categories: ['preposition'],
    intro: 'Les prépositions de temps et les constructions verbe/adjectif + préposition sont très testées en Part 5 et 6.',
    points: [
      'by (au plus tard) ≠ until (jusqu\'à, action continue).',
      'in (mois, année, matin), on (jour, date), at (heure, moment précis).',
      'within (dans un délai de), during (pendant + nom), for (durée), since (depuis + point).',
      'increase by (écart) / to (niveau atteint) ; prior to = before.',
      'Constructions : responsible for, interested in, familiar with, depend on, comply with, refrain from.',
    ],
    examples: [
      ['Please reply by Monday.', 'Merci de répondre au plus tard lundi.'],
      ['The office stays open until 7 P.M.', 'Le bureau reste ouvert jusqu\'à 19 h.'],
      ['Refunds are processed within ten days.', 'Les remboursements sont traités sous dix jours.'],
    ],
    traps: ['Calques du français : *responsible of, *depend of, *married with.', '« during » + nom, jamais + proposition (→ while).'],
    quiz: [
      { q: 'The forms must be returned ____ May 3.', options: ['until', 'by', 'during', 'since'], answer: 1, ex: 'Date limite → by.' },
      { q: 'Profits rose ____ 5 percent, reaching €2 million.', options: ['by', 'at', 'of', 'on'], answer: 0, ex: 'Écart de variation → by.' },
      { q: 'Please refrain ____ talking during the session.', options: ['of', 'to', 'from', 'about'], answer: 2, ex: 'Refrain from + -ing.' },
    ],
  },
  {
    id: 'conjunctions', title: 'Conjonctions et connecteurs', categories: ['conjunction', 'coherence'],
    intro: "Deux réflexes : 1) le blanc est-il suivi d'une proposition (sujet + verbe) ou d'un nom ? 2) quel est le lien logique ?",
    points: [
      'Opposition : although / even though / whereas + proposition ; despite / in spite of + nom ; however (adverbe, entre ; ou en début de phrase).',
      'Cause : because + proposition ; because of / due to / owing to + nom.',
      'But : so that + proposition ; in order to + verbe.',
      'Condition : if, unless, provided that, as long as, in case (au cas où).',
      'Connecteurs Part 6 : moreover (de plus), therefore (donc), alternatively (sinon), meanwhile (pendant ce temps), otherwise (sinon / autrement).',
    ],
    examples: [
      ['Although it rained, the event was a success.', 'Bien qu\'il ait plu, l\'événement a été un succès.'],
      ['Despite the rain, the event was a success.', 'Malgré la pluie, l\'événement a été un succès.'],
      ['The flight was cancelled; therefore, we stayed another night.', 'Le vol a été annulé ; nous sommes donc restés une nuit de plus.'],
    ],
    traps: ['*Despite it rained (despite + nom uniquement).', '« However » ne relie pas deux propositions sans point-virgule.'],
    quiz: [
      { q: '____ the delay, the project was completed on budget.', options: ['Although', 'Despite', 'Because', 'Unless'], answer: 1, ex: 'Suivi d\'un nom (the delay) + opposition → Despite.' },
      { q: 'Bring a jacket ____ it gets cold in the evening.', options: ['in case', 'so that', 'whereas', 'despite'], answer: 0, ex: 'Précaution → in case.' },
      { q: 'Sales rose sharply; ____, the company hired 20 people.', options: ['however', 'otherwise', 'therefore', 'whereas'], answer: 2, ex: 'Conséquence → therefore.' },
    ],
  },
  {
    id: 'relatives', title: 'Pronoms relatifs', categories: ['relative'],
    intro: 'Le choix dépend de l\'antécédent (personne / chose), de la fonction (sujet, complément, possession) et de la présence d\'une virgule.',
    points: [
      'who (personne sujet), whom (personne complément, formel), which (chose), that (personne ou chose, sans virgule).',
      'whose + nom = dont le/la (possession), personne ou chose.',
      'where (lieu), when (moment).',
      'Après une virgule (relative non restrictive) : jamais « that ».',
      'what = ce que / ce qui (pas d\'antécédent).',
    ],
    examples: [
      ['The manager whose team won the award will speak first.', 'Le responsable dont l\'équipe a gagné le prix parlera en premier.'],
      ['Our new office, which opened in May, is downtown.', 'Notre nouveau bureau, qui a ouvert en mai, est en centre-ville.'],
      ['What we need is more time.', 'Ce dont nous avons besoin, c\'est de plus de temps.'],
    ],
    traps: ['*, that : interdit après une virgule.', '« which » + nom n\'exprime pas la possession → whose.'],
    quiz: [
      { q: 'The supplier ____ prices are lowest will win the contract.', options: ['who', 'which', 'whose', 'whom'], answer: 2, ex: 'Relatif + nom (prices) = possession → whose.' },
      { q: 'The report, ____ was published yesterday, is online.', options: ['that', 'which', 'what', 'who'], answer: 1, ex: 'Chose + virgule → which.' },
      { q: 'This is the hotel ____ the conference will take place.', options: ['which', 'where', 'when', 'whose'], answer: 1, ex: 'Lieu + proposition complète → where.' },
    ],
  },
  {
    id: 'comparison', title: 'Comparatifs et superlatifs', categories: ['comparison'],
    intro: 'Comparatif avec than ; superlatif avec the ; renforcement avec much / far ; quantités avec fewer / less.',
    points: [
      'Court : -er / the -est (faster, the fastest) ; long : more / the most.',
      'Irréguliers : good → better → the best ; bad → worse → the worst ; far → further.',
      'Renforcer un comparatif : much, far, considerably, significantly, slightly (jamais very).',
      'as + adjectif + as (égalité) ; the + comparatif…, the + comparatif (plus…, plus…).',
      'fewer + dénombrable ; less + indénombrable. Of the two → the better.',
    ],
    examples: [
      ['This model is far more efficient than the old one.', 'Ce modèle est bien plus efficace que l\'ancien.'],
      ['The sooner we start, the earlier we finish.', 'Plus tôt nous commençons, plus tôt nous finissons.'],
      ['We received fewer complaints this year.', 'Nous avons reçu moins de réclamations cette année.'],
    ],
    traps: ['*very better, *more cheaper.', 'than → comparatif ; the + … of/in → superlatif.'],
    quiz: [
      { q: 'The new printer is ____ faster than the old one.', options: ['very', 'much', 'most', 'more'], answer: 1, ex: 'Renforcer un comparatif → much.' },
      { q: 'This is ____ hotel in the city.', options: ['the most expensive', 'more expensive', 'the more expensive', 'expensiver'], answer: 0, ex: 'Superlatif → the most expensive.' },
      { q: 'There are ____ applicants than last year.', options: ['less', 'fewer', 'least', 'little'], answer: 1, ex: 'Applicants (dénombrable) → fewer.' },
    ],
  },
  {
    id: 'wordforms', title: 'Familles de mots', categories: ['word-form'],
    intro: 'Environ un quart des questions de Part 5 : il faut identifier la nature du mot attendu grâce à sa position.',
    points: [
      'Nom : après un déterminant (the, a, their) ou un adjectif ; suffixes -tion, -ment, -ance, -ity, -ness, -er/-or.',
      'Adjectif : devant un nom ou après be/become/seem/remain ; suffixes -ful, -ive, -able, -ous, -al, -ic.',
      'Adverbe : modifie un verbe, un adjectif ou une phrase ; souvent -ly ; se place entre auxiliaire et participe (has recently opened).',
      'Verbe : après un sujet, un modal, to.',
      'Participes adjectifs : -ing (qui provoque : an interesting offer) / -ed (qui ressent : interested clients).',
    ],
    examples: [
      ['The proposal was carefully reviewed.', 'La proposition a été soigneusement examinée (adverbe).'],
      ['Her presentation was very informative.', 'Sa présentation était très instructive (adjectif).'],
      ['The approval of the budget is expected soon.', 'L\'approbation du budget est attendue bientôt (nom).'],
    ],
    traps: ['Un adverbe ne précède jamais directement un nom.', 'Personne (-er/-or : an applicant) vs chose (-tion : an application).'],
    quiz: [
      { q: 'The software is ____ easy to use.', options: ['surprise', 'surprising', 'surprisingly', 'surprised'], answer: 2, ex: 'Modifie l\'adjectif « easy » → adverbe.' },
      { q: 'We need the ____ of the director.', options: ['approve', 'approval', 'approved', 'approvingly'], answer: 1, ex: 'Après the… of → nom.' },
      { q: 'Customers were ____ with the new service.', options: ['satisfy', 'satisfying', 'satisfied', 'satisfaction'], answer: 2, ex: 'Les clients ressentent → satisfied.' },
    ],
  },
  {
    id: 'gerund', title: 'Gérondif ou infinitif ?', categories: ['gerund-infinitive'],
    intro: 'Certains verbes imposent -ing, d\'autres to + base. Les prépositions sont toujours suivies de -ing.',
    points: [
      '+ -ing : consider, avoid, suggest, recommend, finish, postpone, delay, mind, enjoy, keep, look forward to, be used to.',
      '+ to : decide, plan, agree, hope, offer, refuse, expect, afford, intend, manage, aim.',
      'Verbe + objet + to : ask / encourage / require / allow / remind someone to do.',
      'Préposition + -ing : before leaving, interested in joining, instead of calling.',
      'To de préposition : look forward to meeting, be committed to providing, object to paying.',
    ],
    examples: [
      ['We look forward to working with you.', 'Nous avons hâte de travailler avec vous.'],
      ['Employees are encouraged to submit ideas.', 'Les employés sont invités à soumettre des idées.'],
      ['He suggested postponing the launch.', 'Il a suggéré de reporter le lancement.'],
    ],
    traps: ['*look forward to meet (to est ici une préposition).', '*suggest to do → suggest doing / suggest that…'],
    quiz: [
      { q: 'The manager agreed ____ the deadline.', options: ['extending', 'to extend', 'extend', 'extended'], answer: 1, ex: 'Agree + to.' },
      { q: 'We are committed to ____ excellent service.', options: ['provide', 'providing', 'provided', 'provides'], answer: 1, ex: '« Committed to » : to préposition → -ing.' },
      { q: 'Please avoid ____ the main entrance this week.', options: ['to use', 'use', 'using', 'used'], answer: 2, ex: 'Avoid + -ing.' },
    ],
  },
  {
    id: 'collocations', title: 'Collocations professionnelles', categories: ['collocation', 'vocabulary'],
    intro: 'Les questions de vocabulaire de haut niveau reposent souvent sur des associations fixes de mots. Apprends-les par blocs.',
    points: [
      'meet a deadline / requirements / expectations / demand.',
      'place an order ; make a reservation / a decision ; take place ; hold a meeting.',
      'conduct a survey / an inspection ; carry out a task ; address an issue.',
      'raise prices / funds / awareness ; cut costs ; run a business.',
      'be eligible for, be entitled to, be subject to, in accordance with.',
    ],
    examples: [
      ['The factory cannot meet the growing demand.', 'L\'usine ne peut pas répondre à la demande croissante.'],
      ['An inspection will be conducted next week.', 'Une inspection aura lieu la semaine prochaine.'],
      ['Prices are subject to change without notice.', 'Les prix peuvent changer sans préavis.'],
    ],
    traps: ['*make a meeting, *do an order : vérifie le verbe de la collocation.', 'Des synonymes proches (reach / achieve / meet) ne se combinent pas tous avec le même nom.'],
    quiz: [
      { q: 'We hired temporary staff to ____ the holiday demand.', options: ['meet', 'join', 'reach up', 'make'], answer: 0, ex: 'Meet demand = répondre à la demande.' },
      { q: 'The survey was ____ by an independent firm.', options: ['conducted', 'made up', 'given out', 'taken in'], answer: 0, ex: 'Conduct a survey.' },
      { q: 'Full-time employees are ____ to paid leave.', options: ['eligible', 'entitled', 'subject', 'responsible'], answer: 1, ex: 'Be entitled to = avoir droit à.' },
    ],
  },
  {
    id: 'falsefriends', title: 'Faux amis', categories: ['vocabulary'],
    intro: 'Les faux amis piègent surtout les francophones en Part 5 et dans les questions de synonymes de Part 7.',
    points: [
      'actually = en fait ; currently = actuellement.',
      'eventually = finalement ; possibly = éventuellement.',
      'attend = assister à ; assist = aider.',
      'library = bibliothèque ; bookstore = librairie.',
      'delay = retard ; deadline / period = délai.',
      'resume = reprendre ; summarize = résumer.',
    ],
    examples: [
      ['The model is currently unavailable.', 'Le modèle est actuellement indisponible.'],
      ['More than 300 people attended the conference.', 'Plus de 300 personnes ont assisté à la conférence.'],
      ['Work will resume after the holiday.', 'Le travail reprendra après les congés.'],
    ],
    traps: ['« Actually » en début de phrase signale souvent une correction (en fait…).'],
    quiz: [
      { q: 'Our sales team is ____ working on a new strategy.', options: ['actually', 'currently', 'eventually', 'lately'], answer: 1, ex: 'Actuellement = currently.' },
      { q: 'Over 500 guests ____ the opening ceremony.', options: ['assisted', 'attended', 'helped', 'presented'], answer: 1, ex: 'Assister à = attend.' },
      { q: 'After two hours of negotiation, they ____ reached an agreement.', options: ['eventually', 'possibly', 'actually', 'currently'], answer: 0, ex: 'Finalement = eventually.' },
    ],
  },
];

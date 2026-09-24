'use strict';
// ---------------------------------------------------------------------------
// topics/chemistry.js - Chemistry half of the JEE Main topic taxonomy.
// Same shape as topics/physics.js - see topics/index.js for the classifier.
// ---------------------------------------------------------------------------

module.exports = {
  'Some Basic Concepts of Chemistry': {
    'Mole Concept and Stoichiometry': [
      'mole of', 'moles of', 'molar mass', 'avogadro', 'stoichiometr', 'limiting reagent',
      'empirical formula', 'molecular formula', 'percentage composition', 'equivalent weight',
      'number of molecules', 'mass of', 'molar ratio', 'atomic mass unit', 'gm of',
    ],
    'Concentration Terms': [
      'molarity', 'molality', 'mole fraction', 'normality', 'parts per million', 'ppm',
      'mass percent', 'w/v', 'w/w', 'dilute solution of', 'aqueous solution containing',
      'strength of the solution',
    ],
    '*': ['some basic concepts of chemistry', 'basic concepts', 'significant figures in chemistry'],
  },

  'Atomic Structure': {
    'Quantum Numbers and Orbitals': [
      'quantum number', 'azimuthal', 'orbital', 'degeneracy', 'radial probability',
      'number of nodes', 'heisenberg', 'uncertainty principle', 'photoelectric effect of an electron',
      'energy of the electron in the', 'de broglie wavelength of an electron', 'bohr radius',
      'schrodinger', 'orbital angular momentum',
    ],
    'Bohr Model and Hydrogen Spectrum': [
      'bohr', 'rydberg', 'spectral line', 'hydrogen spectrum', 'balmer', 'lyman', 'paschen',
      'ionisation energy of hydrogen', 'energy required to excite', 'hydrogen atom from n',
      'orbit of the hydrogen',
    ],
    'Electronic Configuration': [
      'electronic configuration', 'aufbau', 'hund', 'unpaired electron', 'maximum number of unpaired',
      'magnetic moment of the ion', 'spin only', 'valence shell configuration', 'noble gas configuration',
    ],
    '*': ['atomic structure', 'atom of an element'],
  },

  'Chemical Bonding and Molecular Structure': {
    'VSEPR and Molecular Shapes': [
      'vsepr', 'bond angle', 'geometry of the molecule', 'hybridisation', 'hybridization',
      'lone pair', 'shape of the molecule', 'sp3', 'sp2', 'sp', 'trigonal', 'tetrahedral',
      'square planar', 'bond pair',
    ],
    'MOT and Bond Order': [
      'bond order', 'molecular orbital', 'bond length', 'bond dissociation energy',
      'paramagnetic', 'diamagnetic nature', 'sigma and pi', 'homo', 'lumo', 'bonding orbital',
      'double bond character',
    ],
    'Polarity, Dipole Moment and Hydrogen Bonding': [
      'dipole moment', 'polarity', 'electronegativity difference', 'hydrogen bonding',
      'fajan', 'ionic character', 'lattice energy', 'resonance structures of',
      'formal charge', 'octet rule', 'vbt', 'valence bond',
    ],
    '*': ['chemical bonding', 'molecular structure', 'intermolecular forces'],
  },

  'States of Matter (Gaseous State)': {
    'Gas Laws and Ideal Gas': [
      'ideal gas', 'boyle', 'charles', 'dalton', 'partial pressure', 'compressibility factor',
      'van der waals', 'critical temperature', 'critical pressure', 'gas is compressed',
      'volume of the gas at', 'kinetic energy of gas molecules', 'real gas', 'liquefaction',
      'rms velocity of gas molecules',
    ],
    '*': ['states of matter', 'gaseous state', 'gas at 27'],
  },

  'Chemical Thermodynamics': {
    'First Law and Enthalpy': [
      'enthalpy', 'delta h', 'internal energy', 'first law of thermodynamics',
      'reversible expansion', 'work of expansion', 'hess', 'isothermal reversible',
      'heat capacity at constant', 'cp and cv', 'bond dissociation enthalpy',
    ],
    'Entropy and Gibbs Energy': [
      'entropy', 'gibbs', 'spontaneity', 'spontaneous', 'free energy change', 'delta g',
      'second law of thermodynamics', 'third law of thermodynamics', 'equilibrium constant from gibbs',
      'standard free energy',
    ],
    Thermochemistry: [
      'heat of combustion', 'enthalpy of formation', 'calorimeter', 'heat released',
      'thermochemical equation', 'enthalpy of neutralisation', 'bond enthalpy',
      'standard enthalpy',
    ],
    '*': ['thermodynamics', 'thermochemistry', 'exothermic'],
  },

  Equilibrium: {
    'Chemical Equilibrium': [
      'equilibrium constant', 'kp', 'kc', 'le chatelier', 'degree of dissociation',
      'reaction quotient', 'extent of the reaction', 'equilibrium concentration',
      'moles of the gas at equilibrium', 'dissociation of pcl5', 'shift in equilibrium',
    ],
    'Ionic Equilibrium and pH': [
      'ph of', 'poh', 'ionisation constant', 'degree of ionisation', 'degree of ionization',
      'weak acid', 'weak base', 'hydrolysis of salt', 'buffer', 'kw of water',
      'hydrogen ion concentration', 'concentration of h+', 'concentration of oh-', 'acidic or basic', 'salt of a weak',
    ],
    'Solubility Product': [
      'solubility product', 'ksp', 'ksp value', 'sparingly soluble', 'common ion',
      'precipitation', 'solubility of the salt', 'molar solubility',
    ],
    '*': ['ionic equilibrium', 'chemical equilibrium', 'equilibrium mixture'],
  },

  'Redox Reactions': {
    'Oxidation Number and Balancing': [
      'oxidation number', 'oxidation state', 'oxidising agent', 'oxidizing agent',
      'reducing agent', 'balanced chemical equation', 'balance the equation', 'redox',
      'equivalent of kmno4', 'dichromate', 'disproportionation', 'n factor',
      'electrochemical equivalent of',
    ],
    '*': ['redox reaction', 'oxidation and reduction'],
  },

  'Solutions and Colligative Properties': {
    "Raoult's Law and Vapour Pressure": [
      'raoult', 'vapour pressure', 'vapor pressure', 'ideal solution', 'azeotrope',
      'mole fraction in the vapour phase', 'relative lowering of vapour pressure',
      'non ideal solution', 'positive deviation', 'negative deviation', 'volatile liquid',
    ],
    'Colligative Properties': [
      'colligative', 'depression in freezing point', 'elevation in boiling point',
      'osmotic pressure', "van't hoff", 'vant hoff', 'molar mass of the solute',
      'molal depression', 'molal elevation', 'freezing point of the solution',
      'boiling point of the solution', 'semipermeable',
    ],
    '*': ['aqueous solution of', 'solution containing', 'dissolved in water'],
  },

  Electrochemistry: {
    'Nernst Equation and Galvanic Cells': [
      'nernst', 'electrode potential', 'galvanic cell', 'daniel cell', 'emf of the cell',
      'standard electrode potential', 'cell reaction', 'salt bridge', 'cell potential',
      'electrochemical series', 'anode and cathode',
    ],
    'Conductance and Kohlrausch': [
      'conductivity', 'molar conductivity', 'conductance', 'kohlrausch', 'specific conductance',
      'limiting molar conductivity', 'degree of dissociation from', 'cell constant',
      'equivalent conductance',
    ],
    'Electrolysis and Faraday Laws': [
      'electrolysis', 'faraday', 'deposited at the cathode', 'electroplating', 'electrolytic cell',
      'current of', 'amount of electricity', 'electrolytic', 'overpotential',
    ],
    '*': ['electrochemistry', 'electrochemical'],
  },

  'Chemical Kinetics': {
    'Rate Law and Order of Reaction': [
      'rate constant', 'order of the reaction', 'half-life', 'half life', 'rate of the reaction',
      'first order', 'zero order', 'second order', 'molecularity', 'rate law', 'rate expression',
      'concentration of the reactant', 'k = 2.303',
    ],
    'Arrhenius and Activation Energy': [
      'arrhenius', 'activation energy', 'temperature coefficient', 'log k',
      'frequency factor', 'energy of activation',
    ],
    'Collision Theory and Catalysis': [
      'collision theory', 'catalyst', 'catalys', 'rate determining step', 'intermediate in the mechanism',
      'temperature dependence of the rate',
    ],
    '*': ['chemical kinetics', 'kinetics of the reaction'],
  },

  'Surface Chemistry': {
    'Adsorption and Colloids': [
      'adsorption', 'adsorbent', 'freundlich', 'langmuir', 'physisorption', 'chemisorption',
      'colloid', 'tyndall', 'emulsi', 'coagulation', 'micelle', 'peptisation', 'sol is',
      'surface area of', 'catalysis on the surface',
    ],
    '*': ['surface chemistry'],
  },

  'Periodic Table and Periodicity': {
    'Periodic Trends': [
      'ionisation enthalpy', 'ionization enthalpy', 'electron gain enthalpy', 'atomic radius',
      'ionic radius', 'electronegativity', 'periodic trend', 'across the period', 'down the group',
      'which of the following has the highest', 'increasing order of',
    ],
    '*': ['periodic table', 'periodicity', 'periodic properties'],
  },

  'p-Block Elements': {
    'Group 13 and 14': [
      'boron', 'diborane', 'borax', 'silicone', 'silicates', 'allotropes of carbon', 'inert pair',
      'aluminium', 'carbon family', 'tin and lead', 'graphite', 'fullerene',
    ],
    'Group 15 and 16': [
      'nitrogen family', 'phosphorus', 'phosphoric', 'phosphine', 'ammonia', 'nitric acid',
      'sulphuric acid', 'sulfuric acid', 'oleum', 'ozone', 'sulphur', 'oxygen family',
      'oxoacid of', 'h2so4', 'hn3', 'nitrogen dioxide', 'h3po2', 'h3po3', 'h3po4', 'phosphorus acid',
    ],
    'Group 17 and 18': [
      'halogen', 'interhalogen', 'noble gas', 'xenon', 'fluorine', 'bleaching powder', 'chlorine',
      'hcl', 'hi', 'pseudohalogen', 'clathrate',
    ],
    '*': ['p-block', 'p block'],
  },

  'd- and f-Block Elements': {
    'Transition Elements': [
      'transition metal', 'transition element', 'd-block', 'd block', 'magnetic moment',
      'oxidation states of manganese', 'oxidation state of chromium', 'lanthanoid', 'actinoid',
      'lanthanide', 'interstitial', 'alloy formation', 'cr3+', 'mno4', 'potassium dichromate',
      'transition series', 'colour of the ion',
    ],
    '*': ['transition and inner transition'],
  },

  'Coordination Compounds': {
    'Nomenclature and Isomerism': [
      'coordination compound', 'coordination number', 'ligand', 'complex ion', 'iupac name',
      'isomerism in coordination', 'linkage isomerism', 'hydrate isomerism', 'werner',
      'denticity', 'chelate', 'primary and secondary valence',
    ],
    'Bonding, CFSE and Magnetism': [
      'crystal field', 'cfse', 'spectrochemical series', 'hybridisation of the complex',
      'magnetic moment of the complex', 'spin only magnetic moment', 'high spin', 'low spin',
      'square planar complex', 'tetrahedral complex', 'stability constant of the complex',
      'ean', 'jahn teller',
    ],
    '*': ['coordination chemistry', 'complex of'],
  },

  Metallurgy: {
    'Extraction and Refining': [
      'metallurgy', 'roasting', 'calcination', 'froth flotation', 'ellingham', 'smelting',
      'zone refining', 'leaching', 'bessemer', 'extraction of', 'ore is', 'concentration of the ore',
      'van arkel', 'magnetic separation', 'slag', 'matte', 'cupellation', 'mond process',
    ],
    '*': ['principal of metallurgy', 'principles of metallurgy'],
  },

  'Hydrogen and s-Block Elements': {
    's-Block Elements': [
      'alkali metal', 'alkaline earth', 'sodium hydroxide', 'lithium', 'diagonal relationship',
      'plaster of paris', 'hydration enthalpy', 'sodium carbonate', 'quick lime', 'group 1',
      'group 2', 'bicarbonate of sodium', 'solvay', 'caustic soda', 'magnesium',
    ],
    'Hydrogen and its Compounds': [
      'hydrogen peroxide', 'heavy water', 'hydride', 'dihydrogen', 'hydride ion',
      'hydrogen bonding in water', 'isotopes of hydrogen',
    ],
    '*': ['s-block', 's block'],
  },

  'Environmental Chemistry': {
    'Environmental Chemistry': [
      'pollutant', 'pollution', 'green chemistry', 'ozone depletion', 'acid rain',
      'biological oxygen demand', 'chemical oxygen demand', 'greenhouse', 'global warming',
      'photochemical smog', 'bhopal', 'eutrophication', 'atmospheric',
    ],
    '*': ['environmental chemistry'],
  },

  'General Organic Chemistry (GOC)': {
    'Reaction Mechanisms and Electronic Effects': [
      'resonance', 'hyperconjugation', 'inductive effect', 'mesomeric', 'carbocation',
      'carbanion', 'reaction intermediate', 'carbene', 'electrophile', 'nucleophile',
      'free radical', 'reaction mechanism', 'transition state', 'stability of the intermediate',
      'electron donating', 'electron withdrawing',
    ],
    'Acidity and Basicity (Organic)': [
      'acidity', 'acidic strength', 'basicity', 'basic strength', 'pk a', 'pka', 'more acidic', 'acid strength', 'order of acid strength', 'relative acid strength',
      'least basic', 'conjugate base', 'resonance stabilised', 'order of acidity',
    ],
    'Isomerism and Stereochemistry': [
      'isomerism', 'isomer', 'stereoisomer', 'chiral', 'optical isomer', 'enantiomer',
      'diastereomer', 'geometrical isomer', 'plane of symmetry', 'meso compound', 'r/s',
      'e/z', 'specific rotation', 'number of optical isomers', 'tautomer',
    ],
    '*': ['organic chemistry', 'goc'],
  },

  Hydrocarbons: {
    'Alkanes and Alkenes': [
      'alkane', 'alkene', 'markovnikov', 'peroxide effect', 'anti markovnikov', 'hydrogenation',
      'ozonolysis', 'wurtz', 'chlorination of methane', 'free radical halogenation',
      'addition of hbr', 'kolbe', 'dehydration of',
    ],
    'Alkynes and Aromatic Compounds': [
      'alkyne', 'terminal alkyne', 'aromatic', 'benzene', 'electrophilic substitution',
      'friedel', 'aromaticity', 'huckel', 'huckel', 'annulene', 'nitration of benzene',
      'sulphonation', 'benzene ring', 'activating group', 'toluene', 'aryl',
    ],
    '*': ['hydrocarbon', 'hydrocarbons'],
  },

  'Haloalkanes and Haloarenes': {
    'Haloalkanes and Haloarenes': [
      'haloalkane', 'haloarene', 'alkyl halide', 'aryl halide', 'sn1', 'sn2', 'e1', 'e2',
      'saytzeff', 'grignard', 'chlorobenzene', 'freon', 'darzens', 'nucleophilic substitution',
      'vicinal dihalide', 'reactivity order of', 'halide is treated with aqueous koh',
    ],
    '*': ['halogen derivatives', 'haloalkanes'],
  },

  'Alcohols, Phenols and Ethers': {
    Alcohols: [
      'alcohol', 'ethanol', 'methanol', 'dehydration of alcohol', 'lucas reagent', 'esterification',
      'primary alcohol', 'secondary alcohol', 'tertiary alcohol', 'oxidation of alcohol',
      'propanol', 'glycol', 'glycerol', 'distinguish between alcohol',
    ],
    Phenols: [
      'phenol', 'reimer', 'kolbe', 'coupling reaction of phenol', 'acidity of phenol',
      'cresol', 'picric acid', 'phenoxide', 'salicylic',
    ],
    Ethers: [
      'ether', 'williamson', 'anisole', 'cleavage of', 'diethyl ether', 'epoxide', 'crown ether',
    ],
    '*': ['alcohols phenols', 'phenols and ethers'],
  },

  'Aldehydes, Ketones and Carboxylic Acids': {
    'Aldehydes and Ketones': [
      'aldehyde', 'ketone', 'aldol', 'cannizzaro', 'clemmensen', 'tollens',
      'iodoform', 'haloform', 'grignard addition', 'nucleophilic addition', 'schiff',
      'tollen', 'silver mirror', 'fehling', 'benedict', '2,4-dnp reagent', 'carbonyl group',
      'wolff kishner', 'hvz', 'stephen', 'cyanohydrin', 'semicarbazone', '2,4-dnp', 'acetone',
      'benzaldehyde', 'formaldehyde', 'acetaldehyde', 'carbinol',
    ],
    'Carboxylic Acids and Derivatives': [
      'carboxylic acid', 'acid anhydride', 'acid chloride', 'ester hydrolysis', 'decarboxylation',
      'acidity of carboxylic', 'benzoic acid', 'acetic acid', 'formic acid', 'esterification of',
      'amide formation', 'hell volhard', 'transesterification',
    ],
    '*': ['carbonyl compounds', 'aldehyde and ketone'],
  },

  'Amines and Diazonium Salts': {
    Amines: [
      'amine', 'basic strength of amine', 'hofmann', 'carbylamine', 'gabriel', 'phthalimide',
      'nitro compound', 'reduction of nitro', 'aniline', 'methylamine', 'secondary amine',
      'quaternary ammonium', 'amine is treated with',
    ],
    'Diazonium Salts': [
      'diazonium', 'sandmeyer', 'coupling with', 'nitrous acid', 'benzenediazonium',
      'azo dye', 'hinsberg',
    ],
    '*': ['amines and diazonium', 'nitrogen containing compounds'],
  },

  Biomolecules: {
    'Carbohydrates, Proteins and Enzymes': [
      'glucose', 'fructose', 'sucrose', 'mutarotation', 'carbohydrate', 'anomers', 'oligosaccharide',
      'starch', 'cellulose', 'amino acid', 'protein', 'peptide', 'zwitter', 'denaturation',
      'enzyme', 'vitamin', 'hormone', 'isoelectric',
    ],
    'Nucleic Acids and Vitamins': [
      'dna', 'rna', 'nucleotide', 'nucleoside', 'base pair', 'double helix', 'adenine',
      'thymine', 'uracil', 'deoxyribose', 'ribose', 'replication',
    ],
    '*': ['biomolecules', 'biomolecule'],
  },

  Polymers: {
    Polymers: [
      'polymer', 'monomer', 'polymerisation', 'polymerization', 'addition polymer',
      'condensation polymer', 'nylon', 'bakelite', 'terylene', 'buna', 'polyurethane',
      'copolymer', 'chain growth', 'step growth', 'vulcanisation', 'homopolymer', 'peptide linkage in',
    ],
    '*': ['polymers', 'high molecular mass'],
  },

  'Chemistry in Everyday Life': {
    'Drugs and Cleansing Agents': [
      'drug', 'antibiotic', 'analgesic', 'antiseptic', 'antacid', 'tranquilizer', 'antihistamine',
      'soap', 'detergent', 'saponification', 'micelle formation', 'artificial sweetener',
      'antipyretic', 'penicillin', 'sulpha drug', 'disinfectant', 'mild analgesic',
    ],
    '*': ['chemistry in everyday life', 'everyday life'],
  },

  'Practical Chemistry (Detection and Purification)': {
    'Detection of Functional Groups': [
      'lucas reagent', 'sodium bicarbonate test', 'nessler', 'functional group is confirmed by',
      'test with', 'barium chloride', 'silver nitrate test', 'flame test', 'borax bead',
      'chromyl chloride', 'group reagent',
    ],
    'Purification and Quantitative Analysis': [
      'distillation', 'chromatography', 'crystallisation', 'crystallization', 'sublimation',
      'kjeldahl', 'dumas', 'qualitative analysis', 'solvent extraction', 'steam distillation',
      'chromatograph',
    ],
    '*': ['practical chemistry', 'laboratory'],
  },
};

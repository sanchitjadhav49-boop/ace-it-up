'use strict';
// ---------------------------------------------------------------------------
// topics/extra_keywords.js - supplemental keywords.
//
// The main taxonomy files (physics.js / chemistry.js / maths.js) hold the
// chapter list; this file holds extra keyword coverage for questions that the
// classifier initially left as 'Unclassified'. topics/index.js merges these
// into the taxonomy at load time, so adding a keyword here is all it takes.
//
// Some seeded mocks are basic one-liners written in very plain language
// ('The chemical symbol of sodium is:'), so the vocabulary below deliberately
// covers school-level phrasing as well as JEE phrasing. Only reasonably
// specific phrases belong here - generic words would drag unrelated questions
// into the wrong chapter.
// ---------------------------------------------------------------------------

module.exports = {
  Physics: {
    Kinematics: {
      'Motion in a Straight Line': [
        'falls freely', 'free fall', 'dropped from a height', 'stone is dropped',
        'a stone is thrown horizontally', 'thrown vertically', 'vertically upward',
        'vertically downward', 'constant velocity', 'uniform velocity', 'accelerates uniformly',
        'time taken to reach the ground', 'acceleration is', 'starts from rest and moves',
        'displacement', 'magnitude of its displacement',
      ],
    },
    "Laws of Motion": {
      "Newton's Laws": [
        'resultant', 'acts on a body of mass', 'constant force', 'acceleration produced',
        'acts at right angles', 'brought to rest',
      ],
      Friction: ['frictionless', 'smooth surface'],
      'Pulley and Connected Bodies': ['weight of the body', 'weight of a body', 'its weight'],
    },
    'Work Energy and Power': {
      'Kinetic and Potential Energy': [
        'machine does', 'power developed', 'climbs', 'of work in',
        'electrical energy consumed', 'ratio of their kinetic energies', 'equal kinetic energies',
        'ratio of their momenta',
      ],
      'Power and Efficiency': ['efficiency of a', 'defined as the ratio of'],
    },
    'Centre of Mass and Collisions': {
      'Collisions and Momentum': [
        'momentum', 'linear momentum', 'conservation of linear momentum', 'moving with a velocity of',
        'two particles of masses',
      ],
    },
    'Thermal Properties of Matter': {
      'Calorimetry and Latent Heat': [
        'temperature scale', 'triple point', 'degree celsius', 'celsius', 'kelvin',
        'is mixed with', 'insulated',
      ],
    },
    'Alternating Current': {
      'AC Circuits and Impedance': ['ac mains', 'mains supply', 'frequency of the ac'],
    },
    'Units and Measurements': {
      'Unit Conversion and Standards': ['in si units', 'unit of the'],
    },
    Nuclei: {
      'Nuclear Physics': ['energy released in the fission', 'u-235', 'fission of a single'],
    },
    'Waves and Sound': {
      'Wave Equation and Speed': ['frequency of a wave', 'time period is', 'frequency (in hz)'],
    },
    'Ray Optics': {
      'Refraction and Lenses': ['angle of refraction', 'refraction (in degrees)', 'angle of incidence'],
    },
  },

  Chemistry: {
    'Some Basic Concepts of Chemistry': {
      'Basic Terms and Classification': [
        'chemical symbol', 'chemical formula', 'chemical name', 'atomic number of',
        'is an element', 'is a compound', 'is a mixture', 'is a physical change',
        'is a chemical change', 'most abundant gas', 'most abundant metal',
        'molecular formula of', 'valency of',
      ],
      'Mole Concept and Stoichiometry': [
        'number of moles in', 'at stp', 'molecules of co2', 'volume at stp', '22.4 l',
      ],
    },
    'Periodic Table and Periodicity': {
      'Periodic Trends': [
        'metalloid', 'most reactive metal', 'is the most reactive', 'reacts vigorously',
        'reacts with cold water', 'reacts with water', 'metal that reacts', 'lightest gas',
        'least reactive', 'basic in nature', 'oxides is basic',
      ],
    },
    'Hydrogen and s-Block Elements': {
      's-Block Elements': [
        'quicklime', 'sodium reacts with water', 'main raw material for the manufacture of cement',
        'gypsum', 'washing soda', 'baking soda', 'cold water to produce',
      ],
    },
    Equilibrium: {
      'Ionic Equilibrium and pH': [
        'strong acid', 'strong base', 'weak electrolyte', 'strong electrolyte',
        'conjugate acid', 'nature of the solution', 'litmus',
      ],
    },
    'Chemical Bonding and Molecular Structure': {
      'Polarity, Dipole Moment and Hydrogen Bonding': [
        'lewis acid', 'lewis base', 'most polar', 'polar bond', 'soluble in water',
        'solubility in water', 'electron deficient',
      ],
    },
    Electrochemistry: {
      'Electrolysis and Faraday Laws': ['electricity', 'charge passing through'],
    },
    'General Organic Chemistry (GOC)': {
      'Isomerism and Stereochemistry': ['unsaturation', 'bromine water', 'baeyer'],
    },
    Hydrocarbons: {
      'Alkanes and Alkenes': ['ethene', 'presence of ni', 'addition of hydrogen'],
    },
    'p-Block Elements': {
      'Group 15 and 16': ['haber process', 'fire extinguisher'],
      'Group 17 and 18': ['gas used in', 'is commonly used in'],
    },
    'Environmental Chemistry': {
      'Environmental Chemistry': ['main constituent of natural gas', 'methane', 'lpg', 'cng'],
    },
    'Chemistry in Everyday Life': {
      'Drugs and Cleansing Agents': [
        'preserve pickles', 'preservative', 'food preservative', 'vinegar',
      ],
    },
    'd- and f-Block Elements': {
      'Transition Elements': ['colour of copper sulphate', 'copper sulphate solution'],
    },
    'States of Matter (Gaseous State)': {
      'Gas Laws and Ideal Gas': ['molar volume of a gas', '22.4 l of'],
    },
  },

  Mathematics: {
    'Sequences and Series': {
      'Geometric Progression and HP': [
        'geometric series', 'sum of the infinite', 'infinite series', 'sum of the geometric',
        'infinite geometric', 'sum of the series 1 +',
      ],
      'Arithmetic Progression': ['sum of first', 'terms of ap', 'ap 2,5,8'],
    },
    Vectors: {
      'Vector Algebra': [
        '3i', '4i', '2i', '5i', '6i', '4j', '3j', '2j', 'i + j', 'i - j', 'magnitude |a|',
        'and b are perpendicular', 'perpendicular to each other',
      ],
      'Applications of Vectors': ['of the triangle with vertices'],
    },
    'Logarithm and Inequalities': {
      Logarithms: ['log base', 'value of log', 'logarithm of'],
      'Indices, Surds and Number Basics': [
        'lcm of', 'hcf of', '^(1/3)', '^(1/2)', 'value of 2^3', 'value of x^2',
      ],
    },
    'Straight Lines and Pair of Lines': {
      'Lines and Slopes': [
        'intersects the y-axis', 'intersects the x-axis', 'equation of the x-axis',
        'slope 2 passing through', 'distance from the point', 'distance between the points',
        'distance between (', 'midpoint of the segment', 'midpoint of',
        'area of the triangle with vertices', 'area (in square units)', 'area of triangle with',
      ],
    },
    'Sets, Relations and Functions': {
      'Relations and Functions': [
        'value of f(', 'value of f^-1', 'f o g', 'defined by f',
        'period of the function', 'period of sin', 'period of tan', 'fundamental period',
      ],
      'Sets and Venn Diagrams': [
        'number of elements in a u b', 'a u b', 'intersection of the sets',
      ],
    },
    'Quadratic Equations': {
      'Roots and Discriminant': [
        'roots of', 'are the roots of', 'sum of roots', 'roots of x', 'product of roots',
        'value of p is', 'quotient',
      ],
    },
    Statistics: {
      'Mean, Median and Mode': [
        'mean of the numbers', 'mean of the first', 'arithmetic mean is', 'mean of ',
        'average of the numbers',
      ],
    },
    'Application of Derivatives': {
      'Monotonicity and Maxima-Minima': [
        'max of f', 'max value of', 'maximum value of f', 'minimum value of f',
        'greatest value of the function', 'maximum value of the expression', 'on [0',
      ],
    },
    'Continuity and Differentiability': {
      'Differentiation and Derivatives': [
        "f'(3)", "f'(2)", "f'(x)", 'differentiate the function',
      ],
    },
    Probability: {
      'Classical Probability': [
        'disjoint events', 'p(a u b)', 'p(a) =', 'complementary events',
      ],
    },
    '3D Geometry': {
      'Shortest Distance and Skew Lines': [
        'distance between planes', 'parallel planes',
      ],
    },
    'Permutations and Combinations': {
      'Combinations and Restrictions': [
        'without repetition and divisible by', '7-digit numbers', 'two-digit numbers',
      ],
    },
    'Matrices and Determinants': {
      Matrices: ['trace(a', 'trace of a'],
    },
    'Trigonometric Ratios and Identities': {
      'Identities and Simplification': [
        'sin(theta)', 'cos(theta)', 'tan(theta)', 'sin x + cos x',
      ],
    },
  },
};

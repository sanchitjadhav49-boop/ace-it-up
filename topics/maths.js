'use strict';
// ---------------------------------------------------------------------------
// topics/maths.js - Mathematics half of the JEE Main topic taxonomy.
// Same shape as topics/physics.js - see topics/index.js for the classifier.
// ---------------------------------------------------------------------------

module.exports = {
  'Sets, Relations and Functions': {
    'Sets and Venn Diagrams': [
      'venn', 'subset', 'power set', 'union of sets', 'complement of', 'cardinal number',
      'number of elements in the set', 'symmetric difference', 'empty set',
      'which of the following is a subset',
    ],
    'Relations and Functions': [
      'relation', 'domain of the function', 'range of the function', 'one-one', 'one one',
      'onto function', 'bijective', 'injective', 'surjective', 'inverse function',
      'composition of functions', 'f(g(x))', 'number of functions', 'equivalence relation',
    ],
    'Types of Functions': [
      'greatest integer function', 'modulus function', 'signum', 'even and odd function',
      'periodic function', 'f(x) = |x|', 'defined by f(x)', 'graph of the function',
    ],
    '*': ['sets relations', 'functions f :'],
  },

  'Logarithm and Inequalities': {
    Logarithms: [
      'logarithm', 'log of', 'log2', 'log10', 'log x', 'log e', 'antilog', 'characteristic and mantissa',
      'log (', 'base 2 of',
    ],
    'Inequalities and AM-GM': [
      'inequality', 'inequalities', 'am-gm', 'am >= gm', 'arithmetic mean is greater',
      'wavy curve', 'satisfying the inequality', 'minimum value of', 'greatest integer x satisfying',
      'for all real x',
    ],
    '*': ['logarithmic equation', 'inequation'],
  },

  'Complex Numbers': {
    'Algebra of Complex Numbers': [
      'complex number', 'imaginary part', 'real part', 'conjugate of', 'modulus of a complex',
      'argand', 'purely imaginary', 'i^2', 'iota', 'cube root of unity', 'omega',
      'argument of the complex', 'amplitude of the complex',
    ],
    'Locus and Geometry': [
      'locus of z', '|z|', 'locus of the point z', 'circle |z', 'straight line in the argand',
      'region in the argand', 'rotational theorem',
    ],
    '*': ['complex plane', 'complex numbers'],
  },

  'Quadratic Equations': {
    'Roots and Discriminant': [
      'quadratic equation', 'roots of the equation', 'discriminant', 'sum of the roots',
      'product of the roots', 'real and distinct', 'equal roots', 'common root', 'root of the equation x',
      'nature of the roots', 'both roots',
    ],
    'Parameters and Number of Roots': [
      'number of real roots', 'number of solutions of the equation', 'parameter', 'for what value of k',
      'values of a for which', 'has exactly one root', 'distinct real roots', 'sign of the roots',
      'positive roots',
    ],
    '*': ['quadratic equations', 'polynomial equation'],
  },

  'Sequences and Series': {
    'Arithmetic Progression': [
      'arithmetic progression', 'common difference', 'sum of the first', 'terms of an ap',
      'a.p.', 'arithmetic mean of', 'nth term of an ap', 'ap is',
    ],
    'Geometric Progression and HP': [
      'geometric progression', 'common ratio', 'sum to infinity', 'infinite gp', 'harmonic progression',
      'geometric mean of', 'g.p.', 'gp is', 'three terms in gp', 'arithmetico geometric',
    ],
    'Special Series and Summation': [
      'sum of the series', 'telescoping', 'sigma', 'n(n+1)', 'sum of the squares of the first',
      'summation', 'series is', 'finite series', 'sum of the cubes',
    ],
    '*': ['sequences and series', 'terms of the sequence'],
  },

  'Binomial Theorem': {
    'Binomial Expansion': [
      'binomial', 'expansion of', 'binomial theorem', 'coefficient of x', 'middle term',
      'general term', 'greatest term', 'term independent of x', 'binomial expansion',
      'multinomial', 'number of terms in the expansion',
    ],
    '*': ['binomial coefficient'],
  },

  'Permutations and Combinations': {
    Permutations: [
      'permutation', 'arrangements', 'arranged', 'number of ways can be arranged',
      'letters of the word', 'words can be formed', 'seating arrangement', 'number of numbers can be formed',
    ],
    'Combinations and Restrictions': [
      'combination', 'selections', 'selected', 'chosen', 'at least one', 'exactly two',
      'committee', 'distribution of identical', 'no two', 'ball is drawn from a bag containing',
      'divided into groups', 'number of ways to select', 'ncr',
    ],
    '*': ['permutations and combinations', 'number of ways'],
  },

  'Matrices and Determinants': {
    Matrices: [
      'matrix', 'order of the matrix', 'symmetric matrix', 'skew-symmetric', 'skew symmetric',
      'transpose', 'idempotent', 'involutory', 'orthogonal matrix', 'matrix multiplication',
      'trace of the matrix', 'singular matrix', 'nilpotent',
    ],
    'Determinants and Linear Systems': [
      'determinant', 'cramer', 'system of equations', 'adjoint', 'inverse of the matrix',
      'rank of the matrix', 'homogeneous system', 'unique solution', 'infinite solutions',
      'value of the determinant', 'cofactor',
    ],
    '*': ['matrices and determinants', 'matrix a'],
  },

  'Mathematical Reasoning': {
    Logic: [
      'statement', 'contrapositive', 'converse', 'tautology', 'negation', 'truth table',
      'contradiction', 'biconditional', 'logically equivalent', 'which is a statement',
      'component statements',
    ],
    '*': ['mathematical reasoning', 'logical statement'],
  },

  Statistics: {
    'Mean, Median and Mode': [
      'variance', 'standard deviation', 'median', 'mode', 'frequency distribution',
      'mean deviation', 'coefficient of variation', 'mean of the observations',
      'average of the observations', 'grouped data', 'observations are',
    ],
    '*': ['statistics', 'data set consists'],
  },

  'Trigonometric Ratios and Identities': {
    'Identities and Simplification': [
      'trigonometric identity', 'prove that sin', 'sin2', 'cos2', 'tan2', 'tan(',
      'sin a cos', 'value of sin', 'value of cos', 'value of tan', 'cot', 'sec', 'cosec',
      'sum of angles', 'trigonometric ratios of',
    ],
    'Properties of Triangles': [
      'triangle abc', 'sine rule', 'cosine rule', 'inradius', 'circumradius', 'r/s',
      'semi perimeter', 'exradius', 'angles of a triangle', 'sides of a triangle',
    ],
    '*': ['trigonometry', 'trigonometric'],
  },

  'Trigonometric Equations': {
    'General Solutions': [
      'general solution', 'number of solutions in', 'principal solution', 'solutions of the equation sin',
      'sin x =', 'cos x =', 'tan x =', 'solve for x', 'interval [0', 'solutions in the interval',
    ],
    '*': ['trigonometric equation'],
  },

  'Inverse Trigonometric Functions': {
    'Inverse Functions': [
      'inverse trigonometric', 'sin^-1', 'cos^-1', 'tan^-1', 'principal value', 'itf', 'arcsin',
      'arccos', 'arctan', 'sin inverse', 'cos inverse', 'tan inverse',
    ],
    '*': ['inverse circular functions'],
  },

  'Straight Lines and Pair of Lines': {
    'Lines and Slopes': [
      'straight line', 'slope of the line', 'equation of the line', 'intercept on', 'x-intercept',
      'y-intercept', 'perpendicular distance from the point', 'angle between the lines',
      'collinear', 'line passes through', 'parallel to the line', 'orthocentre', 'centroid',
      'locus of the point', 'area of the triangle formed',
    ],
    'Pair of Lines and Family': [
      'pair of straight lines', 'family of lines', 'concurrent', 'combined equation',
      'homogeneous equation', 'angle bisector', 'perpendicular straight lines',
    ],
    '*': ['straight lines', 'coordinate geometry basics'],
  },

  Circles: {
    'Equation of Circle': [
      'circle', 'centre', 'center of the circle', 'radius of the circle', 'tangent to the circle',
      'chord of contact', 'orthogonal circles', 'director circle', 'radical axis',
      'circle passing through', 'equation of the circle', 'normal to the circle',
      'length of the tangent', 'point of contact',
    ],
    '*': ['circles'],
  },

  'Conic Sections': {
    Parabola: [
      'parabola', 'directrix', 'latus rectum', 'tangent to the parabola', 'vertex of the parabola',
      'focal chord', 'axis of the parabola',
    ],
    Ellipse: [
      'ellipse', 'major axis', 'minor axis', 'eccentricity of the ellipse', 'foci of the ellipse',
      'latus rectum of the ellipse', 'director circle of the ellipse',
    ],
    Hyperbola: [
      'hyperbola', 'asymptote', 'conjugate hyperbola', 'rectangular hyperbola',
      'transverse axis', 'eccentricity of the hyperbola',
    ],
    '*': ['conics', 'eccentricity'],
  },

  '3D Geometry': {
    'Points, Lines and Planes': [
      'direction cosines', 'direction ratios', 'equation of the plane', 'plane passing through',
      'foot of the perpendicular', 'distance of the point from the plane',
      'angle between the line and the plane', 'three dimensional', 'intercept form of the plane',
      'normal to the plane', 'line of intersection', 'image of the point',
    ],
    'Shortest Distance and Skew Lines': [
      'shortest distance', 'skew lines', 'coplanar', 'distance between the parallel planes',
    ],
    '*': ['3-d geometry', 'three dimensional geometry'],
  },

  Vectors: {
    'Vector Algebra': [
      'vector', 'dot product', 'cross product', 'unit vector', 'collinear vectors',
      'projection of', 'scalar triple product', 'vector triple product', 'position vectors',
      'angle between the vectors', 'magnitude of the vector', 'coplanar vectors',
      'linear combination of vectors', 'perpendicular vectors',
    ],
    'Applications of Vectors': [
      'area of the triangle with vertices', 'volume of the parallelepiped', 'diagonals of',
      'centroid of the triangle with position vectors', 'work done by the force',
    ],
    '*': ['vector algebra', 'vectors a'],
  },

  Limits: {
    'Limits and Indeterminate Forms': [
      'lim', 'limit of', 'limit x tends', 'x tends to', 'indeterminate', 'l hospital',
      "l'hospital", 'sandwich', 'squeeze', 'limit does not exist', 'right hand limit',
      'greatest integer function at',
    ],
    '*': ['limits and continuity'],
  },

  'Continuity and Differentiability': {
    Continuity: [
      'continuous at', 'continuous everywhere', 'discontinuity', 'left hand limit and right hand',
      'piecewise', 'number of points of discontinuity', 'removable discontinuity',
    ],
    'Differentiation and Derivatives': [
      'derivative of', 'differentiable', 'dy/dx', 'differentiate', 'differentiation', 'chain rule',
      'implicit', 'second derivative', 'logarithmic differentiation', 'not differentiable',
      'derivative at x', 'higher order derivative', 'differentiate with respect to',
    ],
    'Rolle and Mean Value Theorems': [
      'rolle', 'mean value theorem', 'lagrange', 'lmvt', 'satisfies the hypothesis',
    ],
    '*': ['continuity and differentiability', 'continuity of the function'],
  },

  'Application of Derivatives': {
    'Tangents and Normals': [
      'tangent', 'normal to the curve', 'slope of the tangent', 'point of contact',
      'orthogonal trajectories', 'tangent to the curve', 'normal at the point',
    ],
    'Monotonicity and Maxima-Minima': [
      'increasing function', 'decreasing function', 'strictly increasing', 'local maximum',
      'local minimum', 'maximum value of the function', 'minimum value of the function',
      'critical point', 'point of inflection', 'stationary point', 'maxima and minima',
      'increasing in the interval', 'greatest value',
    ],
    'Rate of Change and Approximation': [
      'rate of change', 'increasing at the rate', 'decreasing at the rate', 'approximate value',
      'error in the calculation', 'marginal cost', 'related rates',
    ],
    'Optimisation Word Problems': [
      'maximum area', 'minimum length', 'least cost', 'maximum volume', 'minimum distance from',
      'largest possible', 'smallest possible',
    ],
    '*': ['application of derivatives', 'aod'],
  },

  Integrals: {
    'Indefinite Integration': [
      'integrate', 'integral of', 'indefinite integral', 'integration by parts', 'partial fractions',
      'substitution', 'evaluate the integral', 'primitive', 'antiderivative',
      'integral dx', 'integration of',
    ],
    'Definite Integrals': [
      'definite integral', 'integral from 0 to', 'property of definite integral', 'limit of a sum',
      'as the limit of a sum', 'king property', 'evaluate the definite',
      'value of the integral',
    ],
    'Area Under Curves': [
      'area bounded by', 'area enclosed between', 'region bounded by', 'area of the region',
      'area between the curves', 'area under the curve',
    ],
    '*': ['integrals', 'integration'],
  },

  'Differential Equations': {
    'First Order Differential Equations': [
      'differential equation', 'order and degree', 'integrating factor', 'variable separable',
      'homogeneous differential equation', 'linear differential equation', 'dy/dx =',
      'solution of the differential', 'general solution of the differential',
      'particular solution', 'family of curves',
    ],
    'Applications of Differential Equations': [
      'solution curve passes through', 'population grows', 'rate of decay', 'proportional to the amount',
      'cooling of the body',
    ],
    '*': ['differential equations'],
  },

  Probability: {
    'Classical Probability': [
      'probability that', 'probability of getting', 'die is thrown', 'dice', 'coin is tossed',
      'bag contains', 'without replacement', 'at random', 'cards are drawn', 'equally likely',
      'number of outcomes',
    ],
    'Conditional Probability and Bayes': [
      'conditional probability', 'bayes', 'independent events', 'mutually exclusive',
      'given that the', 'p(a|b)', 'total probability',
      'are independent', 'at least one of them',
    ],
    'Binomial Distribution': [
      'binomial distribution', 'probability of getting exactly', 'mean of the binomial',
      'variance of the binomial', 'bernoulli trials', 'successes', 'probability distribution',
      'random variable',
    ],
    '*': ['probability', 'probabilities'],
  },

  'Linear Programming': {
    LPP: [
      'linear programming', 'feasible region', 'objective function', 'maximize z', 'minimize z',
      'subject to the constraints', 'corner points', 'graphical method',
    ],
    '*': ['linear programming problem'],
  },
};

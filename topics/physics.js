'use strict';
// ---------------------------------------------------------------------------
// topics/physics.js - Physics half of the JEE Main topic taxonomy.
//
// Shape (see topics/index.js for the classifier):
//   'Topic (chapter)': {
//     'Subtopic': [keywords...],
//     '*': [topic-wide keywords that identify the chapter but not a subtopic],
//   }
//
// Keywords are matched case-insensitively on word boundaries and match word
// prefixes (so 'collis' also matches 'collision' / 'collisions'). Multi-word
// keywords are worth more than single words, which is why most entries are
// short phrases lifted straight from how the chapter is actually taught.
// ---------------------------------------------------------------------------

module.exports = {
  'Units and Measurements': {
    'Dimensional Analysis': [
      'dimensional', 'dimensions of', 'dimensional formula', 'dimensionally correct',
      'physical quantity', 'which of the following has the same dimensions',
    ],
    'Errors and Significant Figures': [
      'significant figures', 'percentage error', 'least count', 'vernier', 'screw gauge',
      'error in the measurement', 'relative error', 'zero error', 'instrumental error',
    ],
    'Unit Conversion and Standards': [
      'si unit', 'unit of', 'conversion of unit', 'fundamental unit', 'derived unit',
    ],
    '*': ['measurement of', 'units and measurement'],
  },

  Kinematics: {
    'Motion in a Straight Line': [
      'starts from rest', 'uniform acceleration', 'uniformly accelerated', 'velocity-time graph',
      'displacement in', 'average velocity', 'average speed', 'retard', 'decelerat',
      'distance travelled in the nth second', 'body moves in a straight line', 'moves along a straight line',
      'initial velocity', 'final velocity',
    ],
    'Relative Motion': [
      'relative velocity', 'relative motion', 'relative to', 'rain', 'river', 'boat',
      'man walks', 'two trains', 'with respect to the ground',
    ],
    'Projectile Motion': [
      'projectile', 'horizontal range', 'maximum height', 'angle of projection', 'time of flight',
      'launched at an angle', 'thrown at an angle', 'at 45 degrees', 'velocity of projection',
      'horizontal distance from', 'on an inclined plane',
    ],
    'Motion Graphs': [
      'graph shows the', 'from the graph', 'position-time graph', 'the graph between',
    ],
    '*': ['kinematics', 'acceleration of', 'speed of the particle'],
  },

  "Laws of Motion": {
    "Newton's Laws": [
      "newton's second law", "newton's law", 'net force', 'resultant force', 'f = ma',
      'free body diagram', 'normal reaction', 'impulse', 'action and reaction',
    ],
    Friction: [
      'coefficient of friction', 'frictional force', 'rough horizontal surface', 'rough surface',
      'static friction', 'kinetic friction', 'angle of repose', 'block on an inclined plane',
    ],
    'Pulley and Connected Bodies': [
      'pulley', 'connected by a light string', 'inextensible string', 'block of mass',
      'two blocks', 'three blocks', 'lift is moving', 'elevator', 'apparent weight',
      'atwood',
    ],
    'Circular Motion Dynamics': [
      'circular track', 'centripetal', 'banking of', 'banked', 'conical pendulum',
      'maximum safe speed', 'curvature of the road', 'vertically with the help of a string',
    ],
    '*': ['laws of motion', 'tension in the string'],
  },

  'Work Energy and Power': {
    'Work Done': [
      'work done', 'work-energy theorem', 'work done by the force', 'positive work', 'negative work',
    ],
    'Kinetic and Potential Energy': [
      'kinetic energy', 'potential energy', 'elastic potential energy', 'spring constant',
      'compressed spring', 'stretched spring', 'conservation of mechanical energy',
      'energy stored in the spring', 'power delivered', 'watt', 'energy lost',
    ],
    'Power and Efficiency': [
      'power of the', 'efficiency of the', 'power consumption', 'kilowatt',
    ],
    '*': ['work energy power', 'energy of the body'],
  },

  'Centre of Mass and Collisions': {
    'Centre of Mass': [
      'centre of mass', 'center of mass', 'centre of mass of', 'centroid', 'com of the system',
    ],
    'Collisions and Momentum': [
      'collision', 'collides', 'perfectly elastic', 'coefficient of restitution', 'recoil',
      'conservation of momentum', 'elastic head-on', 'ball of mass', 'strikes a', 'momentum of',
    ],
    '*': ['centre of mass and collisions'],
  },

  'Rotational Motion': {
    'Moment of Inertia': [
      'moment of inertia', 'radius of gyration', 'rotational kinetic energy', 'about the axis',
      'about a diameter', 'about one end', 'parallel axis', 'perpendicular axis', 'i = mr',
    ],
    'Torque and Angular Momentum': [
      'torque', 'angular momentum', 'angular acceleration', 'angular velocity', 'angular impulse',
      'conservation of angular momentum',
    ],
    'Rolling Motion': [
      'rolling', 'rolls without slipping', 'without slipping', 'rolling on an inclined plane',
      'sphere rolls', 'cylinder rolls',
    ],
    'Rigid Body Rotation': [
      'rigid body', 'rod is hinged', 'hinged at', 'disc rotates', 'thin rod', 'about an axis passing',
      'moment of force',
    ],
    '*': ['rotational motion', 'rotation about'],
  },

  Gravitation: {
    "Newton's Law of Gravitation": [
      'gravitational force', 'gravitational constant', 'universal gravitation', 'two masses',
      'sphere of mass', 'attraction between',
    ],
    'Gravitational Potential and Energy': [
      'gravitational potential', 'escape velocity', 'orbital velocity', 'satellite',
      'kepler', 'geostationary', 'height above the surface of the earth', 'acceleration due to gravity at',
      'variation of g',
    ],
    '*': ['gravitation', 'gravity'],
  },

  'Mechanical Properties of Solids': {
    Elasticity: [
      "young's modulus", 'bulk modulus', 'modulus of rigidity', 'stress and strain', 'elastic',
      'elongation', 'wire of length', "poisson's ratio", 'strain energy', 'breaking stress',
    ],
    '*': ['mechanical properties of solids', 'stretched wire'],
  },

  'Fluid Mechanics': {
    'Pressure and Buoyancy': [
      'buoyant', 'pressure at a depth', 'floating', 'submerged', 'pascal', 'density of the liquid',
      'hydraulic', 'upthrust', 'apparent weight of the body in water',
    ],
    'Bernoulli and Streamline Flow': [
      'bernoulli', 'venturi', 'streamline', 'laminar', 'efflux', 'torricelli',
      'cross-section of the pipe', 'flow of water through', 'velocity of the liquid',
      'equation of continuity', 'orifice',
    ],
    'Viscosity and Surface Tension': [
      'viscosity', 'viscous', 'terminal velocity', 'reynolds', 'stokes', 'surface tension',
      'capillary', 'soap bubble', 'excess pressure', 'surface energy', 'angle of contact',
      'drop of radius', 'splitted into',
    ],
    '*': ['fluid', 'liquid is filled'],
  },

  'Thermal Properties of Matter': {
    'Thermal Expansion': [
      'coefficient of linear expansion', 'coefficient of volume expansion', 'thermal expansion',
      'expands', 'bimetallic', 'expansion of a solid',
    ],
    'Calorimetry and Latent Heat': [
      'calorimeter', 'specific heat', 'latent heat', 'heat required to', 'ice at', 'steam at',
      'water equivalent', 'mixture of ice', 'melting point of ice', 'heat supplied to',
    ],
    'Heat Transfer and Radiation': [
      'conduction', 'thermal conductivity', 'steady state', 'black body', 'stefan',
      'wien', 'emissivity', "newton's law of cooling", 'radiation emitted',
      'absorbs', 'kirchhoff', 'junction temperature',
    ],
    '*': ['thermal properties', 'heat is supplied', 'temperature of the mixture'],
  },

  'Kinetic Theory of Gases': {
    'Ideal Gas Equation': [
      'ideal gas', 'pv = nrt', 'gas at', 'pressure of the gas', 'volume of the gas',
      'gas is heated', 'isothermal expansion of an ideal gas', 'molar volume',
    ],
    'Kinetic Theory': [
      'kinetic theory', 'rms speed', 'root mean square', 'mean free path', 'degrees of freedom',
      'molar specific heat', 'internal energy of a gas', 'monoatomic', 'diatomic',
      'average kinetic energy of', 'translational',
    ],
    '*': ['kinetic theory of gases', 'gas molecules'],
  },

  Thermodynamics: {
    'First Law of Thermodynamics': [
      'first law of thermodynamics', 'internal energy', 'isothermal', 'adiabatic', 'isobaric',
      'isochoric', 'pv graph', 'pv diagram', 'work done by the gas', 'cyclic process',
      'heat absorbed', 'reversible', 'thermodynamic process',
    ],
    'Heat Engines and Carnot Cycle': [
      'carnot', 'heat engine', 'efficiency of the engine', 'refrigerator', 'coefficient of performance',
      'second law of thermodynamics', 'source and sink',
    ],
    '*': ['thermodynamics'],
  },

  'Oscillations (SHM)': {
    'Simple Harmonic Motion': [
      'simple harmonic', 'shm', 'time period of oscillation', 'amplitude of oscillation',
      'angular frequency', 'displacement from the mean position', 'phase difference',
      'oscillating', 'harmonic oscillator',
    ],
    'Spring and Pendulum': [
      'spring-mass', 'simple pendulum', 'seconds pendulum', 'spring of spring constant',
      'pendulum', 'spring constant k', 'suspended from a spring', 'rod as a pendulum',
    ],
    'Energy in SHM': [
      'kinetic energy and potential energy of a particle executing', 'energy of a particle in shm',
      'damped', 'total energy of the oscillator',
    ],
    '*': ['oscillation', 'periodic motion', 'vibrat'],
  },

  'Waves and Sound': {
    'Wave Equation and Speed': [
      'wavelength', 'frequency of the wave', 'transverse wave', 'wave equation', 'wave speed',
      'propagation of the wave', 'wave travelling', 'sound wave', 'longitudinal wave',
    ],
    'Superposition and Standing Waves': [
      'standing wave', 'stationary wave', 'string fixed', 'nodes and antinodes', 'organ pipe',
      'fundamental frequency', 'harmonics', 'sonometer', 'vibrating string', 'beats',
    ],
    'Sound, Beats and Doppler': [
      'beat frequency', 'doppler', 'speed of sound in air', 'tuning fork', 'resonance tube',
      'intensity level', 'decibel', 'echo', 'observer moving', 'source of sound',
    ],
    '*': ['waves', 'wave motion'],
  },

  Electrostatics: {
    "Coulomb's Law and Electric Field": [
      'electric field', 'coulomb', 'charges are placed', 'point charge', 'electric dipole',
      'field intensity', 'field lines', 'two point charges', 'force between the charges',
    ],
    "Gauss's Law": [
      'gauss', 'electric flux', 'flux through', 'charged sphere', 'uniformly charged',
      'infinite plane sheet', 'gaussian surface', 'charged shell', 'line charge', 'solid sphere carries',
    ],
    'Electric Potential and Energy': [
      'electric potential', 'potential difference', 'equipotential', 'potential energy of the system',
      'work done in moving a charge', 'potential at the centre',
    ],
    '*': ['electrostatics', 'charge q'],
  },

  Capacitance: {
    'Capacitors and Dielectrics': [
      'capacitor', 'capacitance', 'dielectric', 'parallel plate', 'energy stored in the capacitor',
      'charged capacitor', 'separation between the plates', 'plate area', 'capacitor is charged',
    ],
    'Combination of Capacitors': [
      'capacitors are connected', 'equivalent capacitance', 'series combination of capacitors',
      'parallel combination of capacitors', 'network of capacitors', 'charge on each capacitor',
      'bridge capacitor',
    ],
    '*': ['capacitance of', 'farad'],
  },

  'Current Electricity': {
    "Ohm's Law and Resistance": [
      "ohm's law", 'resistivity', 'resistance of the wire', 'specific resistance', 'drift velocity',
      'current density', 'temperature coefficient of resistance', 'relaxation time',
      'resistance is connected', 'wire of resistance', 'ohm',
    ],
    "Kirchhoff's Laws and Networks": [
      'kirchhoff', 'wheatstone', 'balanced bridge', 'potentiometer', 'internal resistance',
      'emf of', 'meters long and has a resistance', 'combination of resistors', 'symmetry',
      'equivalent resistance', 'galvanometer',
    ],
    'Cells and Electrical Power': [
      'cells of emf', 'battery', 'ammeter', 'voltmeter', 'power dissipated', 'heating effect',
      'electric bulb', 'power consumed', 'kilowatt hour', 'fuse',
    ],
    '*': ['current electricity', 'electric current'],
  },

  'Moving Charges and Magnetism': {
    'Magnetic Force and Motion': [
      'magnetic field', 'lorentz', 'charged particle enters', 'magnetic force',
      'radius of the circular path in a magnetic field', 'cyclotron', 'helical path',
      'velocity selector', 'moves perpendicular',
    ],
    "Biot-Savart and Ampere's Law": [
      'biot-savart', 'biot savart', "ampere's law", 'amperian', 'long straight wire',
      'solenoid', 'toroid', 'magnetic field at the centre of a circular', 'current carrying wire',
      'two parallel wires',
      'parallel conductors', 'parallel current carrying',
      'currents in the same direction', 'currents in opposite directions',
    ],
    'Torque on Current Loop': [
      'torque on a current loop', 'current carrying loop', 'magnetic dipole moment',
      'moving coil galvanometer', 'current loop is placed', 'shunt',
    ],
    '*': ['magnetic effect of current', 'magnetic field b'],
  },

  'Magnetism and Matter': {
    'Magnetic Properties of Materials': [
      'ferromagnetic', 'paramagnetic', 'diamagnetic', 'hysteresis', 'curie temperature',
      'magnetic susceptibility', 'permeability of', 'magnetisation', 'bar magnet is', 'magnetic material',
    ],
    "*": ['magnetism and matter', "earth's magnetic field"],
  },

  'Electromagnetic Induction': {
    "Faraday's Law and Induced EMF": [
      'induced emf', 'faraday', 'lenz', 'magnetic flux', 'flux through the coil', 'motional emf',
      'coil is moved', 'changing magnetic field', 'rate of change of flux', 'rod moving',
    ],
    'Self and Mutual Inductance': [
      'self inductance', 'mutual inductance', 'inductor', 'inductance of the coil',
      'energy stored in an inductor', 'solenoid of inductance', 'back emf', 'henry',
    ],
    '*': ['electromagnetic induction', 'induced current'],
  },

  'Alternating Current': {
    'AC Circuits and Impedance': [
      'alternating current', 'rms value', 'impedance', 'reactance', 'phasor',
      'capacitive reactance', 'inductive reactance', 'peak value of the current',
      'instantaneous current', 'average power',
    ],
    'LCR Resonance and Transformers': [
      'resonance', 'resonant frequency', 'quality factor', 'power factor', 'lcr circuit',
      'transformer', 'turns ratio', 'step up', 'eddy current', 'choke coil', 'wattless',
    ],
    '*': ['ac circuit', 'a.c. supply', 'sinusoidal voltage'],
  },

  'Electromagnetic Waves': {
    'EM Waves and Spectrum': [
      'electromagnetic wave', 'em wave', 'displacement current', 'maxwell', 'electric and magnetic fields',
      'electromagnetic spectrum', 'infrared', 'ultraviolet', 'microwave', 'x-ray', 'gamma ray',
      'radio wave', 'speed of light in vacuum', 'poynting',
    ],
    '*': ['electromagnetic waves', 'propagation of electromagnetic'],
  },

  'Ray Optics': {
    'Reflection and Mirrors': [
      'mirror', 'mirror formula', 'concave', 'convex', 'focal length', 'magnification',
      'reflection of light',
      'real image', 'virtual image', 'object distance', 'image distance',
    ],
    'Refraction and Lenses': [
      'refractive index', 'lens', 'critical angle', 'total internal reflection', 'prism',
      'apparent depth', 'lens maker', 'power of the lens', 'thick lens', 'glass slab',
      'refraction through', 'deviation produced', 'dispersive power', 'optical fibre', 'immersed in',
    ],
    'Optical Instruments': [
      'microscope', 'telescope', 'magnifying glass', 'resolving power of the telescope',
      'eyepiece', 'objective lens',
    ],
    '*': ['ray optics', 'geometry of light'],
  },

  'Wave Optics': {
    Interference: [
      'interference', "young's double slit", 'ydse', 'double slit',
      'fringe width', 'fringe pattern', 'coherent', 'thin film', 'path difference',
      'bright fringe', 'dark fringe',
    ],
    'Diffraction and Polarisation': [
      'diffraction', 'single slit', 'grating', 'polarisation', 'polarization', 'brewster',
      'malus', 'polaroid', 'resolving power of the microscope', 'half period zone',
    ],
    '*': ['wave optics', 'wave nature of light'],
  },

  'Dual Nature of Radiation and Matter': {
    'Photoelectric Effect': [
      'photoelectric', 'work function', 'stopping potential', 'threshold frequency',
      'photocurrent', "einstein's photoelectric", 'intensity of incident light',
    ],
    'Matter Waves and Photons': [
      'de broglie', 'matter wave', 'photon', 'momentum of a photon', 'energy of the photon',
      'radiation of wavelength strikes', 'dual nature',
    ],
    '*': ['dual nature'],
  },

  Atoms: {
    'Bohr Model and Hydrogen Spectrum': [
      'bohr', 'hydrogen atom', 'energy level', 'spectral series', 'lyman', 'balmer', 'rydberg',
      'transition from n', 'ionisation energy of hydrogen', 'orbit radius', 'excited state',
      'ground state of the hydrogen',
    ],
    'X-rays and Atomic Spectra': [
      'x-ray', 'characteristic wavelength', 'moseley', 'continuous spectrum', 'bragg', 'cut-off wavelength',
    ],
    '*': ['atomic model', 'atom of hydrogen'],
  },

  Nuclei: {
    'Nuclear Physics': [
      'half-life', 'half life', 'radioactive', 'decay constant', 'binding energy', 'mass defect',
      'alpha particle is emitted', 'beta decay', 'nuclear fission', 'nuclear fusion',
      'atomic mass unit', 'activity of', 'disintegration', 'nucleus of', 'average binding energy',
    ],
    '*': ['nuclei', 'nuclear'],
  },

  'Semiconductor Electronics': {
    'Diodes and Rectifiers': [
      'diode', 'pn junction', 'rectifier', 'zener', 'forward bias', 'reverse bias',
      'knee voltage', 'depletion region', 'barrier potential', 'full wave', 'half wave',
      'ripple', 'silicon diode', 'junction diode',
    ],
    'Transistors and Logic Gates': [
      'transistor', 'amplifier', 'logic gate', 'truth table', 'nand', 'nor gate', 'common emitter',
      'current gain', 'voltage gain', 'input resistance of the amplifier', 'beta', 'collector',
      'base current', 'semiconductor',
    ],
    'Communication Systems': [
      'amplitude modulation', 'modulation index', 'antenna', 'sky wave', 'carrier wave',
      'bandwidth of', 'space wave', 'demodulation', 'sideband',
    ],
    '*': ['electronic device', 'junction'],
  },
};

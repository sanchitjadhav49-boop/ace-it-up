// ============================================================================
// seed_full_test.js - builds a FULL JEE Main mock test:
//   3 sections (Physics, Chemistry, Mathematics) x (20 MCQ + 5 numerical)
//   = 75 questions, all with realistic JEE-style content, then publishes it.
// Every question carries a difficulty tag: 'easy' | 'moderate' | 'difficult'.
//
// Run:  node seed_full_test.js
// Uses DATABASE_URL or defaults to postgres://postgres:postgres@localhost:5432/aceitup
//
// Also exports SECTIONS so the difficulty-mix seed (seed_difficulty_tests.js)
// can reuse this question bank.
// ============================================================================
'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

const TITLE = 'JEE Main 2026 Mock 1 (Full Length)';
// Older sample test title that the full-length test replaces on reseed.
const LEGACY_TITLE = 'JEE Main 2026 Mock 1';

// MCQ entry:   [body, [opt1..opt4], correctIndex, difficulty]
// Numerical:   [body, exactAnswer, difficulty]
const PHYSICS_MCQ = [
  ['A ball thrown vertically upward reaches a maximum height of 45 m. The initial velocity (in m/s) is (take g = 10 m/s^2):', ['15', '30', '45', '60'], 1, 'easy'],
  ['The dimensional formula of angular momentum is:', ['ML^2 T^-1', 'ML^2 T^-2', 'ML T^-1', 'M L^2 T^-2'], 0, 'moderate'],
  ['Two resistors of 3 ohm and 6 ohm are connected in parallel. The equivalent resistance (in ohm) is:', ['9', '4.5', '2', '18'], 2, 'easy'],
  ['The escape velocity from the surface of the Earth is approximately (in km/s):', ['7.9', '11.2', '15.6', '9.8'], 1, 'easy'],
  ['A convex lens of focal length 20 cm forms a real image at 30 cm. The object distance (in cm) is:', ['60', '12', '40', '15'], 0, 'moderate'],
  ['The de Broglie wavelength of a particle of momentum p is:', ['h/p', 'p/h', 'h*p', 'h^2/p'], 0, 'easy'],
  ['A body of mass 2 kg moves with a velocity of 3 m/s. Its kinetic energy (in J) is:', ['6', '9', '18', '3'], 1, 'easy'],
  ['The time period of a simple pendulum of length 1 m on Earth (g = 9.8 m/s^2) is approximately (in s):', ['1.4', '2.0', '3.14', '4.9'], 1, 'moderate'],
  ['A car accelerates uniformly from rest to 20 m/s in 5 s. The distance covered (in m) is:', ['50', '100', '25', '200'], 0, 'easy'],
  ['The unit of electric flux is:', ['V*m', 'V/m', 'C/m^2', 'N/C'], 0, 'easy'],
  ['In Young\'s double slit experiment, the fringe width is directly proportional to:', ['wavelength', 'slit separation', 'distance of screen squared', 'frequency'], 0, 'moderate'],
  ['The power of a lens of focal length 50 cm (in dioptres) is:', ['0.5', '2', '5', '20'], 1, 'easy'],
  ['The nuclear force is:', ['stronger than electrostatic force at short range', 'weaker than gravity', 'long range', 'repulsive only'], 0, 'easy'],
  ['A wire of resistance R is stretched to double its length. The new resistance is:', ['R', '2R', '4R', 'R/2'], 2, 'moderate'],
  ['The SI unit of magnetic flux is:', ['Tesla', 'Weber', 'Gauss', 'Henry'], 1, 'easy'],
  ['The average kinetic energy of a gas molecule at temperature T is:', ['(3/2)kT', '(1/2)kT', 'kT', '2kT'], 0, 'easy'],
  ['A projectile is thrown at 45 degrees with speed 20 m/s. Its horizontal range (g = 10 m/s^2) in m is:', ['20', '40', '10', '80'], 1, 'difficult'],
  ['The stopping potential in photoelectric effect depends on:', ['frequency of incident light', 'intensity of light', 'area of the cathode', 'work function only'], 0, 'easy'],
  ['The acceleration due to gravity at a height equal to the radius of the Earth is (fraction of surface value):', ['1/4', '1/2', '1/8', '2'], 0, 'moderate'],
  ['The speed of sound in air at 0 C is approximately (in m/s):', ['340', '331', '1500', '1224'], 1, 'easy'],
];
const PHYSICS_NUM = [
  ['A body falls freely from rest. Its velocity after 4 s (g = 10 m/s^2), in m/s, is:', 40, 'easy'],
  ['A 5 kg block is pulled by a 20 N force on a frictionless surface. Its acceleration (in m/s^2) is:', 4, 'easy'],
  ['A charge of 2 C moves through a potential difference of 10 V. The work done (in J) is:', 20, 'easy'],
  ['A particle performs SHM with amplitude 5 cm and frequency 2 Hz. Its maximum speed (in cm/s) is:', 62.8319, 'difficult'],
  ['A ray of light enters glass (n = 1.5) from air at 30 degrees incidence. The angle of refraction (in degrees), using sin r = 1/3, is:', 19.4712, 'difficult'],
];
const CHEMISTRY_MCQ = [
  ['The most electronegative element is:', ['Chlorine', 'Fluorine', 'Oxygen', 'Nitrogen'], 1, 'easy'],
  ['The hybridization of carbon in methane is:', ['sp', 'sp2', 'sp3', 'sp3d'], 2, 'easy'],
  ['The pH of a 0.001 M HCl solution is:', ['1', '2', '3', '11'], 2, 'easy'],
  ['Which of the following is a primary amine?', ['CH3NH2', '(CH3)2NH', '(CH3)3N', 'C6H5NHC2H5'], 0, 'easy'],
  ['The number of electrons in the outermost shell of noble gases is:', ['2', '8', '18', '0'], 1, 'easy'],
  ['The bond order of N2 molecule is:', ['1', '2', '3', '2.5'], 2, 'moderate'],
  ['The compound used as an antacid is:', ['NaOH', 'Mg(OH)2', 'HCl', 'H2SO4'], 1, 'easy'],
  ['The oxidation state of Cr in K2Cr2O7 is:', ['+3', '+6', '+7', '+2'], 1, 'moderate'],
  ['Which gas is evolved when sodium reacts with water?', ['Oxygen', 'Hydrogen', 'Chlorine', 'Nitrogen'], 1, 'easy'],
  ['The IUPAC name of CH3-CH2-CH2-OH is:', ['propan-1-ol', 'propan-2-ol', 'ethanol', 'butanol'], 0, 'easy'],
  ['The shape of SF6 molecule is:', ['square planar', 'octahedral', 'trigonal bipyramidal', 'tetrahedral'], 1, 'moderate'],
  ['Which of the following is a strong acid?', ['CH3COOH', 'H2CO3', 'HNO3', 'H3PO4'], 2, 'easy'],
  ['The gas used in the Haber process is:', ['N2', 'NH3', 'CO2', 'SO2'], 0, 'easy'],
  ['The empirical formula of benzene is:', ['C6H6', 'CH', 'CH2', 'C2H2'], 1, 'easy'],
  ['The number of moles in 44 g of CO2 is:', ['1', '2', '0.5', '4'], 0, 'easy'],
  ['The functional group in aldehydes is:', ['-OH', '-CHO', '-COOH', '-CO-'], 1, 'easy'],
  ['The metal that reacts with cold water to produce a hydroxide is:', ['Fe', 'Na', 'Cu', 'Au'], 1, 'easy'],
  ['The rate of a reaction that is first order depends on:', ['concentration of one reactant', 'concentration of all reactants', 'temperature only', 'pressure only'], 0, 'easy'],
  ['The most abundant gas in the Earth\'s atmosphere is:', ['O2', 'N2', 'CO2', 'Ar'], 1, 'easy'],
  ['The product of the reaction of ethene with H2 in presence of Ni is:', ['ethane', 'acetylene', 'methane', 'propane'], 0, 'easy'],
];
const CHEMISTRY_NUM = [
  ['How many grams of NaOH (molar mass 40) are needed to make 500 mL of 0.1 M solution?', 2, 'moderate'],
  ['The number of moles of electrons required to deposit 1 mole of Cu from CuSO4 is:', 2, 'difficult'],
  ['The pH of a 0.01 M NaOH solution at 25 C is:', 12, 'moderate'],
  ['If the half-life of a first order reaction is 10 min, the rate constant (in min^-1) is:', 0.0693, 'difficult'],
  ['The oxidation number of S in H2SO4 is:', 6, 'moderate'],
];
const MATHS_MCQ = [
  ['The derivative of x^3 at x = 2 is:', ['6', '12', '8', '24'], 1, 'easy'],
  ['The number of ways to arrange the letters of the word "CAT" is:', ['3', '6', '9', '27'], 1, 'easy'],
  ['The roots of x^2 - 5x + 6 = 0 are:', ['2, 3', '-2, -3', '1, 6', '-1, -6'], 0, 'easy'],
  ['The value of sin(90 degrees) is:', ['0', '0.5', '1', '-1'], 2, 'easy'],
  ['The sum of the first 10 natural numbers is:', ['45', '50', '55', '60'], 2, 'easy'],
  ['The slope of the line 3x + 4y = 12 is:', ['3/4', '-3/4', '4/3', '-4/3'], 1, 'easy'],
  ['The value of limit x->0 of sin(x)/x is:', ['0', '1', 'infinity', 'undefined'], 1, 'easy'],
  ['The matrix [[1,0],[0,1]] is called:', ['zero matrix', 'identity matrix', 'scalar matrix', 'singular matrix'], 1, 'easy'],
  ['The probability of getting a head in a fair coin toss is:', ['0', '0.25', '0.5', '1'], 2, 'easy'],
  ['The focus of the parabola y^2 = 4ax is at:', ['(a, 0)', '(0, a)', '(-a, 0)', '(0, -a)'], 0, 'moderate'],
  ['The value of integral of 2x dx from 0 to 1 is:', ['0', '1', '2', '0.5'], 1, 'easy'],
  ['If log2(8) = x, then x is:', ['2', '3', '4', '8'], 1, 'easy'],
  ['The common difference of the AP 3, 7, 11, 15 is:', ['3', '4', '7', '5'], 1, 'easy'],
  ['The center of the circle x^2 + y^2 = 25 is:', ['(5, 0)', '(0, 5)', '(0, 0)', '(5, 5)'], 2, 'easy'],
  ['The number of real roots of x^2 + 1 = 0 is:', ['0', '1', '2', 'infinite'], 0, 'easy'],
  ['The range of the function f(x) = sin(x) is:', ['[0, 1]', '[-1, 1]', '[-pi/2, pi/2]', '[0, pi]'], 1, 'easy'],
  ['The value of tan(45 degrees) is:', ['0', '0.5', '1', 'sqrt(3)'], 2, 'easy'],
  ['If A = {1, 2, 3}, the number of subsets of A is:', ['3', '6', '8', '9'], 2, 'easy'],
  ['The coefficient of x in (x + 2)^3 is:', ['6', '12', '24', '8'], 1, 'moderate'],
  ['The vector (3, 4) has magnitude:', ['5', '7', '12', '25'], 0, 'easy'],
];
const MATHS_NUM = [
  ['The value of the definite integral of x from 0 to 4 is:', 8, 'easy'],
  ['If the sum of n terms of an AP is 3n^2 + 5n, the common difference is:', 6, 'difficult'],
  ['The number of distinct permutations of the word "LEVEL" is:', 30, 'difficult'],
  ['The distance between the points (1, 2) and (4, 6) is:', 5, 'easy'],
  ['The maximum value of f(x) = -x^2 + 4x + 5 is:', 9, 'moderate'],
];

// ---------------------------------------------------------------------------
const SECTIONS = [
  { name: 'Physics', mcq: PHYSICS_MCQ, num: PHYSICS_NUM },
  { name: 'Chemistry', mcq: CHEMISTRY_MCQ, num: CHEMISTRY_NUM },
  { name: 'Mathematics', mcq: MATHS_MCQ, num: MATHS_NUM },
];

const DIFFICULTIES = ['easy', 'moderate', 'difficult'];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove any previous full-length test with this title (cascade deletes),
    // plus the older 2-question sample test it replaces.
    await client.query('DELETE FROM tests WHERE title IN ($1, $2)', [TITLE, LEGACY_TITLE]);

    const testRes = await client.query(
      `INSERT INTO tests (title, description, duration_minutes)
       VALUES ($1, $2, 180) RETURNING id`,
      [TITLE, 'Full-length JEE Main mock: 20 MCQ + 5 numerical per subject (25 per subject, 75 total), 3 hours, +4/-1 marking.']
    );
    const testId = testRes.rows[0].id;

    let total = 0;
    for (const section of SECTIONS) {
      const secRes = await client.query(
        `INSERT INTO sections (test_id, name, position) VALUES ($1, $2, $3) RETURNING id`,
        [testId, section.name, SECTIONS.indexOf(section) + 1]
      );
      const sectionId = secRes.rows[0].id;

      let position = 1;
      // 20 MCQs
      for (const [body, options, correctIdx, difficulty] of section.mcq) {
        const qRes = await client.query(
          `INSERT INTO questions (section_id, question_type, body, difficulty, position)
           VALUES ($1, 'mcq', $2, $3, $4) RETURNING id`,
          [sectionId, body, difficulty, position]
        );
        const qId = qRes.rows[0].id;
        let correctOptionId = null;
        for (let i = 0; i < options.length; i++) {
          const oRes = await client.query(
            `INSERT INTO question_options (question_id, body, position)
             VALUES ($1, $2, $3) RETURNING id`,
            [qId, options[i], i + 1]
          );
          if (i === correctIdx) correctOptionId = oRes.rows[0].id;
        }
        await client.query(
          `UPDATE questions SET correct_option_id = $1 WHERE id = $2`,
          [correctOptionId, qId]
        );
        position++;
        total++;
      }
      // 5 numerical
      for (const [body, answer, difficulty] of section.num) {
        await client.query(
          `INSERT INTO questions (section_id, question_type, body, correct_answer, difficulty, position)
           VALUES ($1, 'numerical', $2, $3, $4, $5)`,
          [sectionId, body, answer, difficulty, position]
        );
        position++;
        total++;
      }
    }

    // Validate and publish
    await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
    await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);

    await client.query('COMMIT');
    console.log(`Seeded test #${testId} "${TITLE}" with ${total} questions (published).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { TITLE, LEGACY_TITLE, SECTIONS, DIFFICULTIES };

if (require.main === module) {
  main();
}

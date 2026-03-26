const DISCIPLINES = [
  'Architecture',
  'Civil',
  'Structural',
  'Hydraulics',
  'Landscaping',
  'Certifier',
  'Fire Engineering',
  'Fire Services',
  'Builder/CM',
];

const WEEK_HOURS = 37.5;

const ISSUE_MILESTONES = [
  { number: 1, pct: 60, label: 'Design Development' },
  { number: 2, pct: 70, label: 'Coordination' },
  { number: 3, pct: 80, label: 'BA & Coordination / Structural & Civil Procurement' },
  { number: 4, pct: 90, label: 'Final Coordination / Fitout Procurement / Struc & Civil IFC' },
  { number: 5, pct: 100, label: 'Final IFC (Issued for Construction)' },
];

const CHANGE_TYPES = ['Design Change', 'Design Development', 'Variation'];

const CHANGE_STATUSES = ['Approved', 'Submitted', 'Rejected', 'Yet to be submitted'];

const RISK_LIKELIHOODS = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Very Unlikely'];

const RISK_OUTCOMES = ['Catastrophic', 'Major', 'Moderate', 'Minor', 'Insignificant'];

const RISK_RATINGS = ['Extreme', 'Significant', 'Moderate', 'Low', 'Negligible'];

// 5x5 risk matrix: [likelihood index][outcome index] → rating
// likelihood: 0=Almost Certain … 4=Very Unlikely
// outcome:    0=Catastrophic … 4=Insignificant
const RISK_MATRIX = [
  ['Extreme',      'Extreme',      'Significant', 'Moderate', 'Low'],
  ['Extreme',      'Significant',  'Significant', 'Moderate', 'Low'],
  ['Significant',  'Significant',  'Moderate',    'Low',      'Negligible'],
  ['Significant',  'Moderate',     'Low',         'Low',      'Negligible'],
  ['Moderate',     'Low',          'Low',         'Negligible','Negligible'],
];

function calcRiskRating(likelihood, outcome) {
  const li = RISK_LIKELIHOODS.indexOf(likelihood);
  const oi = RISK_OUTCOMES.indexOf(outcome);
  if (li === -1 || oi === -1) return null;
  return RISK_MATRIX[li][oi];
}

module.exports = {
  DISCIPLINES,
  WEEK_HOURS,
  ISSUE_MILESTONES,
  CHANGE_TYPES,
  CHANGE_STATUSES,
  RISK_LIKELIHOODS,
  RISK_OUTCOMES,
  RISK_RATINGS,
  RISK_MATRIX,
  calcRiskRating,
};

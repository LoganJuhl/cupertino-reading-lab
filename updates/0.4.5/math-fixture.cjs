/* Synthetic, shareable math/table regression. No personal content or assets. */
const file = 'QA Release Long Math.md';
const table = columns => '| ' + ['Year','Price','Deposit','Rate','Term','Payment'].slice(0,columns).join(' | ') + ' |\n| ' + Array(columns).fill('---').join(' | ') + ' |\n' + Array.from({length: 3}, (_, r) => '| ' + [String(2025+r),'$420,000','$84,000','4.25%','30 years','$1,653'].slice(0,columns).join(' | ') + ' |').join('\n');
const equation = '$$\n\\boxed{M = 420000 \\cdot \\frac{(0.0425/12)(1+0.0425/12)^{360}}{(1+0.0425/12)^{360}-1} \\approx 2066.15}\n$$';
const passage = i => `Synthetic passage ${i}: ` + 'A clear reading surface gives the evidence room to develop while keeping the reader in the same column. '.repeat(5);
let text = '# Synthetic long math regression\n\n';
const lines = {};
for (let section = 1; section <= 24; section++) {
  lines[`section${section}`] = text.split('\n').length - 1;
  text += `## Section ${section}\n\n${passage(section + '.a')}\n\n`;
  if (section === 5) {
    lines.table4 = text.split('\n').length - 1;
    text += table(4) + '\n\n' + passage('5.before') + '\n\n';
    lines.equation = text.split('\n').length - 1;
    text += equation + '\n\n' + passage('5.after') + '\n\n';
    lines.table6 = text.split('\n').length - 1;
    text += table(6) + '\n\n';
  }
  text += passage(section + '.b') + '\n\n';
}
module.exports = {file, text, lines};

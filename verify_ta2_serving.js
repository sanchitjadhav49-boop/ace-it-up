// Verify the SERVED (vite-transformed) module really contains the five sections.
const http = require('http');

function get(port, path) {
  return new Promise((resolve) => {
    http.get({ host: 'localhost', port, path }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', (e) => resolve({ status: 0, body: e.message }));
  });
}

(async () => {
  const jsx = await get(5174, '/src/App.jsx');
  const b = jsx.body;
  const labels = ['Overview', 'Time', 'Questions', 'Topics', 'Errors'];
  const foundLabels = labels.filter((l) => b.includes('label: "' + l + '"') || b.includes("label: '" + l + "'"));
  const children = ['TimeAnalysis', 'TimeIntervalAnalysis', 'QuestionJourney', 'QuestionTypeAnalysis', 'TopicAnalysis', 'DifficultyAnalysis', 'ErrorDistribution'];
  const foundChildren = children.filter((n) => b.includes('<' + n));

  console.log('section labels served  : ' + foundLabels.join(', '));
  console.log('nav tab markup         : ' + b.includes('ta2-tab'));
  console.log('sub-nav markup         : ' + b.includes('ta2-subnav__btn'));
  console.log('kpi markup             : ' + b.includes('ta2-kpi'));
  console.log('donut markup           : ' + b.includes('ta2-donut__svg'));
  console.log('insights markup        : ' + b.includes('ta2-insight'));
  console.log('status strip markup    : ' + b.includes('ta2-status__card'));
  console.log('child screens wired    : ' + foundChildren.join(', '));
  console.log('export menu markup     : ' + b.includes('ta2-menu__item'));
})();

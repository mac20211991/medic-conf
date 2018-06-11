const fs = require('./sync-fs');
const jshint = require('jshint').JSHINT;
const minify = require('../lib/minify-js');
const templatedJs = require('../lib/templated-js');
const withLineNumbers = require('./with-line-numbers');

function lint(code) {
  jshint(code, {
    esversion: 5,
    eqeqeq: true,
    funcscope: true,
    latedef: 'nofunc',
    nonbsp: true,
    predef: [ 'contact', 'lineage', 'reports' ],
    undef: true,
    unused: true,
  });

  if(jshint.errors.length) {
    console.log('Generated code:');
    console.log(withLineNumbers(code));
    jshint.errors.map(e => console.log(`line ${e.line}, col ${e.character}, ${e.reason} (${e.code})`));
    throw new Error(`jshint violations found in contact-summary :¬(`);
  }
}

module.exports = projectDir => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  let code;
  if(fs.exists(freeformPath)) {
    code = templatedJs.fromFile(projectDir, freeformPath);
  } else if(fs.exists(structuredPath)) {
    code = templatedJs.fromString(projectDir, `
var context, fields, cards;

__include_inline__('contact-summary-extras.js');
__include_inline__('contact-summary.templated.js');

function isReportValid(report) {
  // valid XForms won't have .errors field
  // valid JSON forms will have empty array errors:[]
  return report && !(report.errors && report.errors.length);
}

var result = {
  cards: [],
  fields: fields.filter(function(f) {
        if(f.appliesToType === contact.type ||
            (f.appliesToType.charAt(0) === '!' && f.appliesToType.slice(1) !== contact.type)) {
          if(!f.appliesIf || f.appliesIf()) {
            delete f.appliesToType;
            delete f.appliesIf;
            return true;
          }
        }
      }),
};


function addCard(card, r) {
  if(!card.appliesIf(r)) return;

  function addValue(src, dst, prop) {
    switch(typeof src[prop]) {
      case 'undefined': return;
      case 'function': dst[prop] = src[prop](r); break;
      default: dst[prop] = src[prop];
    }
  }

  var fields = typeof card.fields === 'function' ?
      card.fields(r) :
      card.fields
        .filter(function(f) {
          switch(typeof f.appliesIf) {
            case 'undefined': return true;
            case 'function':  return f.appliesIf(r);
            default:          return f.appliesIf;
          }
        })
        .map(function(f) {
          var ret = {};
          addValue(f, ret, 'label');
          addValue(f, ret, 'value');
          addValue(f, ret, 'translate');
          addValue(f, ret, 'filter');
          addValue(f, ret, 'width');
          addValue(f, ret, 'icon');
          if(f.context) {
            ret.context = {};
            addValue(f.context, ret.context, 'count');
            addValue(f.context, ret.context, 'total');
          }
          return ret;
        });

  result.cards.push({
    label: card.label,
    fields: fields,
  });

  if(card.modifyContext) card.modifyContext(context, r);
}

cards.forEach(function(card) {
  var idx1, r;
  switch(card.appliesToType) {
    case 'report':
      for(idx1=0; idx1<reports.length; ++idx1) {
        r = reports[idx1];
        if(!isReportValid(r)) continue;
        addCard(card, r);
      }
      break;
    default:
      if(contact.type !== card.appliesToType) return;
      addCard(card);
  }
});

result.context = context;

// return the result for 2.13+ as per #2635
return result;
`);
  } else throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);

  lint(code);

  return minify(code);
};

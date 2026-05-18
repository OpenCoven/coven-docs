import assert from 'node:assert/strict';
import remarkMermaid from '../lib/remark-mermaid.mjs';

const tree = {
  type: 'root',
  children: [
    {
      type: 'code',
      lang: 'mermaid',
      value: 'flowchart LR\n  A["Quoted label"] --> B',
    },
    {
      type: 'code',
      lang: 'ts',
      value: 'const unchanged = true;',
    },
  ],
};

remarkMermaid()(tree);

const [diagram, code] = tree.children;

assert.equal(diagram.type, 'mdxJsxFlowElement');
assert.equal(diagram.name, 'Mermaid');
assert.equal(diagram.attributes[0].name, 'chart');
assert.equal(diagram.attributes[0].value.value, JSON.stringify('flowchart LR\n  A["Quoted label"] --> B'));
assert.equal(
  diagram.attributes[0].value.data.estree.body[0].expression.value,
  'flowchart LR\n  A["Quoted label"] --> B',
);
assert.equal(code.type, 'code');
assert.equal(code.lang, 'ts');


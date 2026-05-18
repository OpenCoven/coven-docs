import { valueToEstree } from 'estree-util-value-to-estree';
import { visit } from 'unist-util-visit';

function chartAttribute(value) {
  return {
    type: 'mdxJsxAttribute',
    name: 'chart',
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: JSON.stringify(value),
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExpressionStatement',
              expression: valueToEstree(value),
            },
          ],
        },
      },
    },
  };
}

export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (
        !parent ||
        typeof index !== 'number' ||
        node.lang !== 'mermaid' ||
        typeof node.value !== 'string'
      ) {
        return;
      }

      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [chartAttribute(node.value)],
        children: [],
      };
    });
  };
}

export default remarkMermaid;


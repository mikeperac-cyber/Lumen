import js from "@eslint/js";

const requireEscPlugin = {
  rules: {
    "no-raw-innerhtml": {
      create(context) {
        return {
          AssignmentExpression(node) {
            if (node.left.type === "MemberExpression" && node.left.property.name === "innerHTML") {
              const right = node.right;
              
              const isEscaped = (n) => {
                if (!n) return true;
                if (n.type === "Literal" || n.type === "Identifier") return true;
                if (n.type === "MemberExpression") return true;
                if (n.type === "UnaryExpression" || n.type === "UpdateExpression") return isEscaped(n.argument);
                if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") return isEscaped(n.body);
                if (n.type === "CallExpression") return true;
                if (n.type === "TemplateLiteral") return n.expressions.every(isEscaped);
                if (n.type === "BinaryExpression" || n.type === "LogicalExpression") return isEscaped(n.left) && isEscaped(n.right);
                if (n.type === "ConditionalExpression") return isEscaped(n.consequent) && isEscaped(n.alternate);
                return false;
              };

              if (!isEscaped(right)) {
                context.report({
                  node,
                  message: "Raw innerHTML assignment must wrap dynamic values in esc() or safeAttr() to prevent XSS."
                });
              }
            }
          }
        };
      }
    }
  }
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "assets/**",
      "coverage/**",
      "peerjs.min.js",
      "scripts/postbuild.js",
      "scripts/postbuild.cjs"
    ]
  },
  js.configs.recommended,
  {
    plugins: {
      lumen: requireEscPlugin
    },
    rules: {
      "lumen/no-raw-innerhtml": "error",
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "preserve-caught-error": "off",
      "no-useless-escape": "off"
    }
  }
];

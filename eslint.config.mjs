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
                if (n.type === "Literal") return true;
                if (n.type === "CallExpression") {
                  const calleeName = n.callee.name || (n.callee.property && n.callee.property.name);
                  if (calleeName === "esc" || calleeName === "safeAttr" || calleeName === "attr" || calleeName === "DOMPurify" || calleeName === "sanitize") return true;
                  
                  // Allow component render functions that return safe HTML
                  if (["renderSettings", "syncUI", "syncStatusText"].includes(calleeName)) return true;
                }
                if (n.type === "TemplateLiteral") {
                  return n.expressions.every(isEscaped);
                }
                if (n.type === "BinaryExpression" && n.operator === "+") {
                  return isEscaped(n.left) && isEscaped(n.right);
                }
                // Conditionals (e.g. ternary)
                if (n.type === "ConditionalExpression") {
                  return isEscaped(n.consequent) && isEscaped(n.alternate);
                }
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
    ignores: ["node_modules/", "dist/", "assets/", "scripts/postbuild.js"]
  },
  js.configs.recommended,
  {
    plugins: {
      lumen: requireEscPlugin
    },
    rules: {
      "lumen/no-raw-innerhtml": "error",
      "no-undef": "off",
      "no-unused-vars": "off"
    }
  }
];

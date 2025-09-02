// This is how your flow inputs are actually extracted (not hardcoded):

// 1. START NODE: Gets the first transition key
const startInput = Object.keys(startNode.transitions || {})[0]; // "123"

// 2. PATH TRAVERSAL: Follows actual edges in your flow
Object.entries(node.transitions).forEach(([input, nextNodeId]) => {
  // input = "123", "1", "2", "*", "200", "400", "500", etc.
  // nextNodeId = the actual target node ID from your flow
  
  const nextNode = allNodes.find(n => n.id === nextNodeId);
  if (nextNode) {
    const nodeWithInput = { ...node, selectedInput: input };
    // This creates a path with the REAL input from your flow
    traverse(nextNode, pathWithInput, newVisited);
  }
});

// 3. INPUT EXTRACTION: Gets the actual transition keys
const extractInputsFromPath = (path) => {
  return path
    .filter(node => node.selectedInput)  // Only nodes with inputs
    .map(node => node.selectedInput);    // Extract the real input values
};

// RESULT: Real inputs from your flow design, not hardcoded values!

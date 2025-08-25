import StartNode from './StartNode';
import MenuNode from './MenuNode';
import InputNode from './InputNode';
import ActionNode from './ActionNode';
import EndNode from './EndNode';

export const nodeTypes = {
  start: StartNode,
  menu: MenuNode,
  input: InputNode,
  action: ActionNode,
  end: EndNode,
};

export {
  StartNode,
  MenuNode,
  InputNode,
  ActionNode,
  EndNode,
};
